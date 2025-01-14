import { z } from 'zod';
import isUserLoggedIn from '../../middleware/isUserLoggedIn';
import getUserIdFromJwt from '../../middleware/getUserIdFromJwt';
import getUserPermissions from '../../middleware/getUserPermissions';
import getSentimentScores from '../../utils/getSentimentScores';
import getUserFromJwt from '../../middleware/getUserFromJwt';

async function createTopicByForumId(
    request: Request,
    params: Record<string, string>,
    env: Env
): Promise<Response> {
	try {
		// Check that the user is signed in
		if (!(await isUserLoggedIn(request))) {
			return new Response("Unauthorized", { status: 401 });
		}

		// Check if user has permission to create topics
		const permissions = await getUserPermissions(request, env);
		if (!permissions || !permissions.CanCreateTopics) {
			return new Response("You do not have permission to create topics!", { status: 401 });
		}

		// Check that the incoming request is JSON Data
		const contentType = request.headers.get("content-type");
		if (!contentType || !contentType.includes("application/json")) {
			return new Response("Invalid content-type! Expected application/json.", { status: 400 });
		}

		// Attempt to retrive the incoming request body
		let jsonData: any;
		try {
			jsonData = await request.json();
		} catch (error) {
			return new Response("Invalid JSON payload!", { status: 400 });
		}

		// Use Zod to define the expected JSON Scheme
		const topicSchema = z.object({
			title: z.string().min(1, "Title is required."),
			content: z.string().min(1, "Content is required."),
		});

		// Attempt to parse the JSON Request Body with Zod
		let parsedData;
		try {
			parsedData = topicSchema.parse(jsonData);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return new Response(JSON.stringify(error.errors), { status: 400 });
			}
			return new Response("Failed to validate topic data!", { status: 400 });
		}

		// Attempt to get the forumID parameter and validate it
		const forumIdStr = params["forumID"] || params["forumId"] || params["forumid"];
		const forumId = parseInt(forumIdStr, 10);
		if (Number.isNaN(forumId)) {
			return new Response("Invalid forum ID!", { status: 400 });
		}

		// Get the user ID from the JWT
		const userId = await getUserIdFromJwt(request);
		if (!userId) {
			return new Response("Could not determine user ID from token!", { status: 400 });
		}

        // Anti-Spam Service
        const user = await getUserFromJwt(request, env);
        const akismetApiKey = await env.KV.get("akismet");
        const spamCheckResult = await fetch(
            'https://rest.akismet.com/1.1/comment-check',
            {
                method: 'POST',
                headers: {
	             'Content-Type': 'application/x-www-form-urlencoded',
                },
                    body: new URLSearchParams({
                        'api_key': akismetApiKey || "",
                        'blog': "https://novoforo.online/",
                        'user_agent': request.headers.get("User-Agent") || "",
                        'referrer': request.headers.get("referrer") || "",
                        'comment_type': 'forum-post',
                        'comment_content': parsedData.content,
                        'comment_author': user.Username,
                        'comment_author_email': user.EmailAddress,
                    }),
                }
            ).then(async (resp) => {
                if (!resp.ok) {
                    console.error("Akismet API responded with non-OK status:", resp.status);
                    return false; // API down, skip the spam check!
                }
                const responseText = await resp.text(); // Get the raw response text
                const responseLines = responseText.split("\n"); // Split response by lines
                const result = responseLines[1]?.trim(); // Extract the second part of the response
                if (result === "true") {
                    return true;
                } else if (result === "false") {
                    return false;
                } else {
                    console.warn("Akismet returned an unexpected response:", responseText);
                    return false;
                }
            }).catch((error) => {
                console.error("Akismet API error:", error);
                return false;
            });

		// Use AI to flag the post for manual view if necessary
		const aiResponse = await env.AI.run(
			"@cf/huggingface/distilbert-sst-2-int8",
				{
					text: parsedData.title + ' ' + parsedData.content,
				}
		);
		
		const negativityScore = getSentimentScores(aiResponse).NEGATIVE;
		const positivityScore = getSentimentScores(aiResponse).POSITIVE; 

		// Attempt to insert the topic into the database
		try {
			const now = Math.floor(Date.now() / 1000);
			const insertTopicResult = await env.DB.prepare(
				`
							INSERT INTO Topics
									(Title, ForumId, CreatedAt, IsWithheldForModeratorReview)
							VALUES
									(?, ?, ?, ?);
							`
			)
				.bind(parsedData.title, forumId, now, spamCheckResult || ((negativityScore - positivityScore) > 0.8))
				.run();

			// Check fi the topic was successfully inserted into the database
			const topicIdResult = await env.DB.prepare(
				`
							SELECT Id FROM Topics
							WHERE Title = ? AND ForumId = ?
							ORDER BY CreatedAt DESC
							LIMIT 1;
							`
			)
				.bind(parsedData.title, forumId)
				.first();

			// The topic didn't insert correctly, return an error!
			if (!topicIdResult || !topicIdResult.Id) {
				return new Response("Failed to retrieve the newly created topic ID.", { status: 500 });
			}

			// Stor ethe new topic ID
			const newTopicId = topicIdResult.Id;

			// Insert the post into the database
			const insertPostResult = await env.DB.prepare(
				`
							INSERT INTO Posts
									(Content, TopicId, UserId, CreatedAt, IsWithheldForModeratorReview)
							VALUES
									(?, ?, ?, ?, ?);
							`
			)
				.bind(parsedData.content, newTopicId, userId, now, spamCheckResult || ((negativityScore - positivityScore) > 0.8))
				.run();

			// Confirm the post was inserted
			const postIdResult = await env.DB.prepare(
				`
							SELECT Id FROM Posts
							WHERE TopicId = ? AND UserId = ? AND CreatedAt = ?
							ORDER BY CreatedAt DESC
							LIMIT 1;
							`
			)
				.bind(newTopicId, userId, now)
				.first();

			// The post did not insert for some reason
			// delete the new topic from the database
			if (!postIdResult || !postIdResult.Id) {
				await env.DB.prepare(
					`
									DELETE FROM Topics
									WHERE Id = ?;
									`
				)
					.bind(newTopicId)
					.run();

				return new Response("Failed to retrieve the newly created post ID. Topic has been rolled back.", { status: 500 });
			}

			// Store the new post ID
			const newPostId = postIdResult.Id;

			// Return a response
			return Response.json({
				success: true,
				Topic: {
					Id: newTopicId,
					Title: parsedData.title,
					ForumId: forumId,
					CreatedAt: now,
					UserId: userId,
				},
				Post: {
					Id: newPostId,
					Content: parsedData.content,
					TopicId: newTopicId,
					UserId: userId,
					CreatedAt: now,
				},
				message: "Topic and initial post created successfully.",
			}, { status: 201 });
		} catch (error: any) {
			console.error("Database error:", error.message);
			return new Response("An error occurred while creating the topic and post.", {
				status: 500,
			});
		}
	} catch (error: any) {
		// Something went wrong, log the error for debugging and return a
		// response to the user
		console.log(error);
		return new Response("Something went wrong", {status:500})
	}
}

export default createTopicByForumId;
