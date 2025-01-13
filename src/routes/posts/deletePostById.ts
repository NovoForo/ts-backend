import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import getUserPermissions from "../../middleware/getUserPermissions";

async function deletePostById(request: Request, params: Record<string, string>, env: Env) {
try {
	// Check user is logged in
	if (!await isUserLoggedIn(request)) {
		return Response.json({ success: false, message: "User not logged in." }, { status: 401 });
	}

	// Check that user has permission to delete their own posts
	const permissions = await getUserPermissions(request, env);
	if (!permissions || !permissions.CanDeleteOwnPosts) {
		return Response.json({ success: false, message: "You do not have permission to delete posts." }, { status: 403 });
	}

	const userId = await getUserIdFromJwt(request);

	const postCheck = await env.DB.prepare(
		`
        SELECT TopicId
        FROM Posts
        WHERE Id = ? AND UserId = ?
        `
	).bind(params["postId"], userId).first();

	if (!postCheck) {
		return Response.json({ success: false, message: "You are not authorized to delete this post or it doesn't exist." }, { status: 403 });
	}

	const topicId = postCheck.TopicId;

	await env.DB.prepare(
		`
        DELETE FROM Posts
        WHERE Id = ?
        `
	).bind(params["postId"]).run();

	const otherPostsExist = await env.DB.prepare(
		`
        SELECT 1
        FROM Posts
        WHERE TopicId = ?
        LIMIT 1
        `
	).bind(topicId).first();

	if (!otherPostsExist) {
		await env.DB.prepare(
			`
            DELETE FROM Topics
            WHERE Id = ?
            `
		).bind(topicId).run();
	}

	return Response.json({ success: true, message: "Post (and topic, if applicable) deleted successfully." });
} catch (error: any) {
	// Log the error for debugging purposes
	// and return a response to the user
	console.error(error);
	return new Response("Something went wrong!", { status: 500 })
}
}

export default deletePostById
