import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function unlikePostById(request: Request, params: Record<string,string>, env: Env): Promise<Response> {
		// Check that user is logged in
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to like this post.", { status: 401 });
    }

		// Get User ID from JWT
    const userId = await getUserIdFromJwt(request);
    const postId = params.postId;

    // Check if user has already liked this post
    const likeExists = await env.DB.prepare(`
        SELECT * FROM PostLikes WHERE PostId = ? AND UserId = ?
        `).bind(postId, userId).first();

		// Has has not liked this post, liking the post instead
    if (!likeExists) {
				const insertLikeResult = await env.DB.prepare(`
				  IJNSERT INTO PostLikes (PostId, UserId, CreatedAt) VALUES (?, ?, strftime('%s', 'now'))
				`)
					.bind(postId, userId)
					.run();
        return new Response("You have not liked this post! Liking the post instead!", { status: 403 });
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
