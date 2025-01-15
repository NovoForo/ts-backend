import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function dislikePostById(request: Request, params: Record<string,string>, env: Env): Promise<Response> {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to like this post.", { status: 401 });
    }

    const userId = await getUserIdFromJwt(request);
    const postId = params.postId;

    // Check if user has already disliked this post
    const dislikeExists = await env.DB.prepare(`
        SELECT * FROM PostDislikes WHERE PostId = ? AND UserId = ?
        `).bind(postId, userId).first();

    if (dislikeExists) {
				const deleteLikeResult = await env.DB.prepare(`
					DELETE FROM PostDislikes WHERE PostId = ? AND UserId = ?
				`).bind(postId, userId).run();
        return new Response("You have already disliked this post! Unliking the post instead!", { status: 403 });
    }

    // Insert a dislike into the database
    const insertResults = await env.DB
        .prepare(`INSERT INTO PostDislikes (PostId, UserId, CreatedAt) VALUES (?, ?, strftime('%s', 'now'))`)
        .bind(postId, userId)
        .run()

    // Delete likes if any exist
    await env.DB.prepare(`
        DELETE FROM PostLikes WHERE PostId = ? AND UserId = ?
    `).bind(postId, userId).run();

    // Return a response
    return new Response("Post successfully disliked!", { status: 200 });
}

export default dislikePostById;
