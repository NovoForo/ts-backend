import isUserLoggedIn from "../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../middleware/getUserIdFromJwt";
import getUserPermissions from "../middleware/getUserPermissions";
import isUserAnAdministrator from "../middleware/isUserAnAdministrator";
import isUserAModerator from "../middleware/isUserAModerator";

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

	let permissions = null;
	try {
		permissions = await getUserPermissions(request, env);
	} catch (error: any) {
		console.error(error);
		return new Response("An error occurred while fetching user permissions", { status: 500 });
	}

	return Response.json({
		user: {
			Id: user.Id,
			Username: user.Username,
			EmailAddress: user.EmailAddress,
			image: ''
		},
		IsAdministrator: await isUserAnAdministrator(request, env),
		IsModerator: await isUserAModerator(request, env),
		permissions: permissions
	}, { status: 200 });
}

export default verifyCredentials;