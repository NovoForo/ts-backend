import isUserLoggedIn from '../../middleware/isUserLoggedIn';
import getUserIdFromJwt from '../../middleware/getUserIdFromJwt';

async function flagPostById(request: Request, params: Record<string, string>, env: Env): Promise<Response> {{
	// Check if user is logged in
	if (!await isUserLoggedIn(request)) {
		return new Response("Unauthorized!", { status: 401 })
	}

	const postId = params.postId;
	const userId = getUserIdFromJwt(request)
	// Check if user has already flagged the post
	const hasFlaggedPostResult = await env.DB.prepare(`
		SELECT * FROM PostFlags WHERE PostId = ? AND UserId = ?
	`)
		.bind(postId, userId).first();

	// User has already flagged the post, don't allow them to double-flag
	if (!hasFlaggedPostResult) {
		return new Response("You have already flagged this post!", { status: 403 })
	}

	// User has not flagged the post before, insert the flag
	const insertFlagResult = await env.DB.prepare(
		`
			INSERT INTO PostFlags (PostId, UserId, CreatedAt) VALUES (?, ?, strftime('%s', 'now'))
		`
	).bind(postId, userId).first();

	return new Response("Successfully flagged this post!", { status: 200 })

}}

export default flagPostById;
