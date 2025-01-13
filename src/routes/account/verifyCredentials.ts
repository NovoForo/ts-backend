import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import getUserPermissions from "../../middleware/getUserPermissions";
import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import isUserAModerator from "../../middleware/isUserAModerator";
import md5 from "../../utils/md5";
async function verifyCredentials(request: Request, params: Record<string, string>, env: Env) {
	// Check that the user is logged in
	if (!await isUserLoggedIn(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	// Get the user ID from the provided JWT
	const userId = await getUserIdFromJwt(request);

	// Get the user from the database
	const user = await env.DB.prepare(
		`
		SELECT * FROM Users
		WHERE Id = ?
		`
	).bind(userId).first();

	// Something went wrong fetching the user from the database
	if (!user) {
		return new Response("User not found", { status: 404 });
	}

	// Try to get the user's permissions
	let permissions = null;
	try {
		permissions = await getUserPermissions(request, env);
	} catch (error: any) {
		console.error(error);
		return new Response("An error occurred while fetching user permissions", { status: 500 });
	}

	// Return a response
	return Response.json({
		user: {
			Id: user.Id,
			Username: user.Username,
			EmailAddress: user.EmailAddress,
			image: 'https://www.gravatar.com/avatar/' + await md5(user.EmailAddress as string),
		},
		IsAdministrator: await isUserAnAdministrator(request, env),
		IsModerator: await isUserAModerator(request, env),
		permissions: permissions
	}, { status: 200 });
}

export default verifyCredentials;
