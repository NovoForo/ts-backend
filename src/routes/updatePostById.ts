import isUserLoggedIn from "../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../middleware/getUserIdFromJwt";
import {z} from "zod";

async function updatePostById(
    request: Request,
    params: Record<string, string>,
    env: Env
): Promise<Response> {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to update the post.", { status: 401 });
    }

    const userIdStr = await getUserIdFromJwt(request);
    if (!userIdStr) {
        return new Response("Invalid token. Unable to identify user.", { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
        return new Response("Invalid user ID in token.", { status: 400 });
    }

    const postIdStr = params["postId"] || params["postid"] || params["postID"];
    if (!postIdStr) {
        return new Response("Missing postId in the URL.", { status: 400 });
    }

    const postId = parseInt(postIdStr, 10);
    if (isNaN(postId)) {
        return new Response("Invalid postId.", { status: 400 });
    }

    try {
        const { results: postResults } = await env.DB.prepare(`
            SELECT p.Id, p.Content, p.UserId, p.TopicId, p.CreatedAt, p.UpdatedAt
            FROM Posts p
            WHERE p.Id = ?
        `)
            .bind(postId)
            .all();

        if (postResults.length === 0) {
            return new Response("Post not found.", { status: 404 });
        }

        const post = postResults[0];

        if (post.UserId !== userId) {
            return new Response("Forbidden. You can only update your own posts.", { status: 403 });
        }

        const inputSchema = z.object({
            content: z.string().min(1, "Content is required."),
        });

        const contentType = request.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return new Response("Invalid content-type! Expected application/json.", { status: 400 });
        }

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

        const { content } = parsedInput;

        const updatedAt = Math.floor(Date.now() / 1000);

        const updateResult = await env.DB.prepare(`
            UPDATE Posts
            SET Content = ?, UpdatedAt = ?
            WHERE Id = ?;
        `)
            .bind(content, updatedAt, postId)
            .run();

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


        if (updatedPostResults.length === 0) {
            return new Response("Failed to retrieve the updated post.", { status: 500 });
        }

        const updatedPost = updatedPostResults[0];

        return new Response(JSON.stringify({
            success: true,
            post: {
                Id: updatedPost.PostId,
                Content: updatedPost.PostContent,
                TopicId: updatedPost.TopicId,
                User: {
                    Id: updatedPost.UserId,
                    Username: updatedPost.UserName,
                    Email: updatedPost.UserEmail,
                },
                CreatedAt: Math.floor(Date.now()),
                UpdatedAt: Math.floor(Date.now()),
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