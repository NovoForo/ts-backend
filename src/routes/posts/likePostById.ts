import getUserIdFromJwt from "../middleware/getUserIdFromJwt";
import isUserLoggedIn from "../middleware/isUserLoggedIn";

async function likePostById(request: Request, params: Record<string,string>, env: Env): Promise<Response> {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to like this post.", { status: 401 });
    }

    const userId = await getUserIdFromJwt(request);
    const postId = params.postId;

    // Check if user has already liked this post
    const likeExists = await env.DB.prepare(`
        SELECT * FROM PostLikes WHERE PostId = ? AND UserId = ?
        `).bind(postId, userId).first();

    if (likeExists) {
        return new Response("You have already liked this post!", { status: 403 });
    }

    // Insert a like into the database
    const insertResults = await env.DB
        .prepare(`INSERT INTO PostLikes (PostId, UserId, CreatedAt) VALUES (?, ?, strftime('%s', 'now'))`)
        .bind(postId, userId)
        .run()

    // Return a response 
    return new Response("Post successfully liked!", { status: 200 });
}

export default likePostById;