import { z } from "zod";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import getUserPermissions from "../../middleware/getUserPermissions";
import getSentimentScores from "../../utils/getSentimentScores";

async function replyToTopicById(request: Request, params: Record<string, string>, env: Env): Promise<Response> {
    // Check that user is logged in
		if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to reply.", { status: 401 });
    }

		// Check user permissions
    const permissions = await getUserPermissions(request, env);
    if (!permissions) {
        return new Response("An error occurred while fetching user permissions.", { status: 500 });
    }

		// User does not have permission to reply
    if (!(permissions).CanReply) {
        return new Response("You do not have permission to reply.", { status: 403 });
    }

		// Get User ID from JWT
    const userIdStr = await getUserIdFromJwt(request);

		// This should never happen but handle the error anyways
    if (!userIdStr) {
        return new Response("Invalid token. Unable to identify user.", { status: 400 });
    }

		// Parse the User ID into an Integer
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
        return new Response("Invalid user ID in token.", { status: 400 });
    }

		// Get URL Path Parameters
    const categoryIdStr = params["categoryID"] || params["categoryId"] || params["categoryid"];
    const forumIdStr = params["forumID"] || params["forumId"] || params["forumid"];
    const topicIdStr = params["topicId"] || params["topicid"];

		// This should never happen because of how the router is setup but catch the error anyways
    if (!categoryIdStr || !forumIdStr || !topicIdStr) {
        return new Response("Missing categoryID, forumID, or topicId in the URL.", { status: 400 });
    }

		// Parse the path params into integers
    const categoryId = parseInt(categoryIdStr, 10);
    const forumId = parseInt(forumIdStr, 10);
    const topicId = parseInt(topicIdStr, 10);

		// If any parameters was not an integer return an error
    if (isNaN(categoryId) || isNaN(forumId) || isNaN(topicId)) {
        return new Response("Invalid categoryID, forumID, or topicId.", { status: 400 });
    }

		// Check if the topic is in the database
    try {
        const { results: topicResults } = await env.DB.prepare(`
            SELECT t.Id
            FROM Topics t
            WHERE t.Id = ? AND t.ForumId = ?
        `)
            .bind(topicId, forumId)
            .all();

        console.log("Topic Results:", topicResults);

        if (topicResults.length === 0) {
            return new Response("Topic not found in the specified forum.", { status: 404 });
        }
    } catch (error: any) {
        console.error("Database error while verifying topic:", error);
        return new Response("An error occurred while verifying the topic.", { status: 500 });
    }

		// Check if the forum is in the database
    try {
        const { results: forumResults } = await env.DB.prepare(`
            SELECT f.Id
            FROM Forums f
            WHERE f.Id = ? AND f.CategoryId = ?
        `)
            .bind(forumId, categoryId)
            .all();

        console.log("Forum Results:", forumResults);

        if (forumResults.length === 0) {
            return new Response("Forum not found in the specified category.", { status: 404 });
        }
    } catch (error: any) {
        console.error("Database error while verifying forum:", error);
        return new Response("An error occurred while verifying the forum.", { status: 500 });
    }

    const inputSchema = z.object({
        content: z.string().min(1, "Content is required."),
    });

		// Check if the incoming requesst is JSON Data
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Invalid content-type! Expected application/json.", { status: 400 });
    }

		// Attempt to retrive the request body
    let parsedInput;
    try {
        const json = await request.json();
        parsedInput = inputSchema.parse(json);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Invalid JSON payload!", { status: 400 });
    }

		// Get content from the parased input
        const { content } = parsedInput;

    	// Use AI to flag the post for manual view if necessary
		const aiResponse = await env.AI.run(
			"@cf/huggingface/distilbert-sst-2-int8",
				{
					text: parsedInput.content,
				}
		);
		
		const negativityScore = getSentimentScores(aiResponse).NEGATIVE;
		const positivityScore = getSentimentScores(aiResponse).POSITIVE; 

		// Attempt to insert the post into the database
    try {
        const insertPostResult = await env.DB.prepare(`
            INSERT INTO Posts
                (Content, TopicId, UserId, CreatedAt, IsWithheldForModeratorReview)
            VALUES
                (?, ?, ?, ?, ?);
        `)
            .bind(content, topicId, userId, Math.floor(Date.now() / 1000), ((negativityScore - positivityScore) > 0.8))
            .run();

        console.log("Insert Post Result:", insertPostResult);

				// Check if the post was inserted into the databaase
        const postIdResult = await env.DB.prepare(`
            SELECT Id FROM Posts
            WHERE TopicId = ? AND UserId = ? AND CreatedAt = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
        `)
            .bind(topicId, userId, Math.floor(Date.now() / 1000))
            .first();

        console.log("Post ID Result:", postIdResult);

        const newPostId = postIdResult?.Id;

        const { results: newPostResults } = await env.DB.prepare(`
            SELECT
                p.Id AS PostId,
                p.Content AS PostContent,
                p.TopicId,
                p.UserId,
                p.CreatedAt,
                u.Username AS UserName,
                u.EmailAddress AS UserEmail
            FROM
                Posts p
            LEFT JOIN
                Users u ON p.UserId = u.Id
            WHERE
                p.Id = ?
        `)
            .bind(newPostId)
            .all();


        if (newPostResults.length === 0) {
            throw new Error("Newly created post not found.");
        }

        const newPost = newPostResults[0];

        return new Response(JSON.stringify({
            success: true,
            post: {
                Id: newPost.PostId,
                Content: newPost.PostContent,
                TopicId: newPost.TopicId,
                User: {
                    Id: newPost.UserId,
                    Username: newPost.UserName,
                    Email: newPost.UserEmail,
                },
                IsWitheldForReview: ((negativityScore - positivityScore) > 0.8),
                CreatedAt: Math.floor(Date.now()),
            },
            message: "Reply posted successfully.",
        }), { status: 201, headers: { "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Database error while creating post:", error.message);
        return new Response("An error occurred while creating the reply.", { status: 500 });
    }
}

export default replyToTopicById;
