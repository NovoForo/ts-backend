import { z } from "zod";
import isUserLoggedIn from "../middleware/isUserLoggedIn";
import getUserIdFromJwt from "../middleware/getUserIdFromJwt";
import { hashSync } from "bcrypt-edge";
import getUserPermissions from "../middleware/getUserPermissions";

async function updateAccount(request: Request, params: Record<string, string>, env: Env) {
	if (!await isUserLoggedIn(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const permissions = await getUserPermissions(request, env);
	if (permissions === null) {
		return new Response("An error occurred while fetching user permissions", { status: 500 });
	}
	if (!permissions.CanEditSettings) {
		return new Response("You do not have permission to edit your account settings", { status: 403 });
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

	const inputSchema = z.object({
		displayName: z.string(),
		email: z.string().email(),
		password: z.string().min(16),
	});

	const contentType = request.headers.get("content-type");

	if (contentType && contentType.includes("application/json")) {
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { displayName, email, password } = parsedInput;
			const passwordHash = hashSync(password, 8);

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