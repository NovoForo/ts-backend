import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import {z} from "zod";
import getUserPermissions from "../../middleware/getUserPermissions";
import getSentimentScores from "../../utils/getSentimentScores";

async function updatePostById(
    request: Request,
    params: Record<string, string>,
    env: Env
): Promise<Response> {
    const now = Math.floor(Date.now() / 1000);
		// Check that the user is signed in
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to update the post.", { status: 401 });
    }

    // Check if the user has the required permissions to update the post.
    const permissions = await getUserPermissions(request, env);
    if (!permissions || !permissions.CanEditOwnPosts) {
        return new Response("Forbidden. You do not have the required permissions to update the post.", { status: 403 });
    }

		// Get the User ID from their JWT
    const userIdStr = await getUserIdFromJwt(request);
    if (!userIdStr) {
        return new Response("Invalid token. Unable to identify user.", { status: 400 });
    }

		// Parse the User ID
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
        return new Response("Invalid user ID in token.", { status: 400 });
    }

		// Parse the PostID
    const postIdStr = params["postId"];
    if (!postIdStr) {
        return new Response("Missing postId in the URL.", { status: 400 });
    }

		// Parse PostID into an Integer
    const postId = parseInt(postIdStr, 10);
    if (isNaN(postId)) {
        return new Response("Invalid postId.", { status: 400 });
    }

		// Check if the post exists in the database
    try {
        const { results: postResults } = await env.DB.prepare(`
            SELECT p.Id, p.Content, p.UserId, p.TopicId, p.CreatedAt, p.UpdatedAt
            FROM Posts p
            WHERE p.Id = ?
        `)
            .bind(postId)
            .all();

				// Post does not exist, return a response
        if (postResults.length === 0) {
            return new Response("Post not found.", { status: 404 });
        }

        const post = postResults[0];

				// Post does not belong to the user
        if (post.UserId !== userId) {
            return new Response("Forbidden. You can only update your own posts.", { status: 403 });
        }

				// Define the expected JSON Body with Zod
        const inputSchema = z.object({
            content: z.string().min(1, "Content is required."),
        });

				// Check the incoming request is JSON
        const contentType = request.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return new Response("Invalid content-type! Expected application/json.", { status: 400 });
        }

				// ATtempt to retrive the request body and parse it with Zod
        let parsedInput;
        try {
            const json = await request.json();
            parsedInput = inputSchema.parse(json);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return new Response(JSON.stringify(error.errors), { status: 400, headers: { "Content-Type": "application/json" } });
            }
            return new Response("Invalid JSON payload!", { status: 400 });
        }

				// Get content from the parsed input
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

				// Calculate updatedAt time (remember to store as Unix seconds not MS)
        const updatedAt = now;

				// Attempt to update the post
        const updateResult = await env.DB.prepare(`
            UPDATE Posts
            SET Content = ?, UpdatedAt = ?, IsWithheldForModeratorReview = ?
            WHERE Id = ?;
        `)
            .bind(content, updatedAt, ((negativityScore - positivityScore) > 0.8), postId)
            .run();

				// Get the updated post
        const { results: updatedPostResults } = await env.DB.prepare(`
            SELECT
                p.Id AS PostId,
                p.Content AS PostContent,
                p.TopicId,
                p.UserId,
                p.CreatedAt,
                p.UpdatedAt,
                u.Username AS UserName,
                u.EmailAddress AS UserEmail
            FROM
                Posts p
            LEFT JOIN
                Users u ON p.UserId = u.Id
            WHERE
                p.Id = ?
        `)
            .bind(postId)
            .all();

				// This should not happen under normal circumstances, handle the error anyways
        if (updatedPostResults.length === 0) {
            return new Response("Failed to retrieve the updated post.", { status: 500 });
        }

        const updatedPost = updatedPostResults[0];

				// Return a response
        return new Response(JSON.stringify({
            success: true,
            post: {
                Id: updatedPost.PostId,
                Content: updatedPost.PostContent,
                TopicId: updatedPost.TopicId,
                IsWithheldForModeratorReview: ((negativityScore - positivityScore) > 0.8),
                User: {
                    Id: updatedPost.UserId,
                    Username: updatedPost.UserName,
                    Email: updatedPost.UserEmail,
                },
                CreatedAt: now,
                UpdatedAt: now
            },
            message: "Post updated successfully.",
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Database error while updating post:", error);
        return new Response("An error occurred while updating the post.", { status: 500 });
    }
}

export default updatePostById;
