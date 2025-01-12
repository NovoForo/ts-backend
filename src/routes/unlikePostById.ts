import getUserIdFromJwt from "../middleware/getUserIdFromJwt";
import isUserLoggedIn from "../middleware/isUserLoggedIn";

async function unlikePostById(request: Request, params: Record<string,string>, env: Env): Promise<Response> {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to like this post.", { status: 401 });
    }

    const userId = await getUserIdFromJwt(request);
    const postId = params.postId;

    // Check if user has already liked this post
    const likeExists = await env.DB.prepare(`
        SELECT * FROM PostLikes WHERE PostId = ? AND UserId = ?
        `).bind(postId, userId).first();

    if (!likeExists) {
        return new Response("You have not liked this post!", { status: 403 });
    }

    // Insert a like into the database
    const deleteResults = await env.DB
        .prepare(`DELETE FROM PostLikes WHERE PostId = ? AND UserId = ?`)
        .bind(postId, userId)
        .run()

    // Return a response 
    return new Response("Post successfully unliked!", { status: 200 });
}

export default unlikePostById;