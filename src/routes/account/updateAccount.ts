import { z } from "zod";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import { hashSync } from "bcrypt-edge";
import getUserPermissions from "../../middleware/getUserPermissions";

async function updateAccount(request: Request, params: Record<string, string>, env: Env) {
	// Check if user is signed in
	if (!await isUserLoggedIn(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	// Get the user's permissions
	const permissions = await getUserPermissions(request, env);
	if (permissions === null) {
		return new Response("An error occurred while fetching user permissions", { status: 500 });
	}

	// If the user has restrictions applied to their account
	// they are unable to use this API endpoint to update their
	// account (they still can use forgot password to do a password change)
	if (!permissions.CanEditSettings) {
		return new Response("You do not have permission to edit your account settings", { status: 403 });
	}

	// Get the user's ID from their JWT
	const userId = await getUserIdFromJwt(request);

	// Get the user from the database
	const user = await env.DB.prepare(
		`
		SELECT * FROM Users
		WHERE Id = ?
		`
	).bind(userId).first();

	// Something went wrong fetching the user, end the request!
	if (!user) {
		return new Response("User not found", { status: 404 });
	}

	// Define the expected JSON body with Zod
	const inputSchema = z.object({
		displayName: z.string(),
		email: z.string().email(),
		password: z.string().min(16),
	});

	// Ensure the incoming request is JSON
	const contentType = request.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		// Try to parse the request body with Zod
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { displayName, email, password } = parsedInput;

			// Create a new password hash based on the inputp password
			const passwordHash = hashSync(password, 8);

			// Attempt to update the user in the database
			const updateResult = await env.DB.prepare(
				`
				UPDATE Users
				SET Username = ?,
				EmailAddress = ?,
				PasswordHash = ?
				WHERE Id = ?
				`
			)
			.bind(displayName, email, passwordHash, userId)
			.run();

			// Return a response
			return new Response("Account updated", { status: 200 });
		} catch (error) {
			if (error instanceof z.ZodError) {
				return new Response(JSON.stringify(error.errors), { status: 400 });
			}
			return new Response("Invalid JSON payload!", { status: 400 });
		}
	} else {
		return new Response("Invalid content-type!");
	}
}

export default updateAccount;
