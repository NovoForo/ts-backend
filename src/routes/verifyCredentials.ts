import isUserLoggedIn from "../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../middleware/getUserIdFromJwt";

async function verifyCredentials(request: Request, params: Record<string, string>, env: Env) {
	if (!await isUserLoggedIn(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const userId = await getUserIdFromJwt(request);

	const user = await env.DB.prepare(
		`
		SELECT * FROM Users
		WHERE Id = ?
		`
	).bind(userId).first();

	if (!user) {
		return new Response("User not found", { status: 404 });
	}

	return Response.json({
		user: {
			Username: user.Username,
			EmailAddress: user.EmailAddress,
			image: ''
		},
		isAdministrator: user.IsAdministrator,
		isModerator: user.IsModerator
	}, { status: 200 });
}

export default verifyCredentials;