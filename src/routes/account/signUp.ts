import { z } from "zod";
import jwt from "@tsndr/cloudflare-worker-jwt"
import {
	genSaltSync,
	hashSync,
	compareSync,
	getRounds,
	getSaltSync,
  } from 'bcrypt-edge';

async function signUp(request: Request, params: Record<string, string>, env: Env) {
	// Define the expected JSON body with zod
	const inputSchema = z.object({
		username: z.string(),
		email: z.string().email(),
		password: z.string().min(16),
	});

	// Ensure the request is JSON
	const contentType = request.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		// Try to aprse the request
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { username, email, password } = parsedInput;

			// Create a password hash
			const passwordHash = hashSync(password, 8);
          // Initial a users counter
					let usersCount = 0;
						// Try to count the number of users in the database
            try {
                const { results } = await env.DB.prepare(
                    `
                    SELECT COUNT(*) AS UsersCount
                    FROM Users
                    `
                )
                .all();
								// Update the users count with the result
                usersCount = results[0].UsersCount as number;
            } catch (error: any) {
                return new Response("An error occurred while querying the database.", { status: 500 });
            }

						// Insert the user in the database
			try {
				const { results } = await env.DB.prepare(

					`
					INSERT INTO Users
						(Username,
						PasswordHash,
						EmailAddress,
						CreatedAt)
					VALUES (?, ?, ?, ?);
					`
				)
				.bind(username, passwordHash, email, Math.floor(Date.now() / 1000))
				.all();

				// If this is the first user, make them an admin and moderator
				if (usersCount == 0) {
					await env.DB.prepare(`INSERT INTO UserGroupMemberships (UserId, UserGroupId, CreatedAt) VALUES (?, ?, strftime('%s', 'now'))`).bind(1, 3).run()
                    await env.DB.prepare(`INSERT INTO UserGroupMemberships (UserId, UserGroupId, CreatedAt) VALUES (?, ?, strftime('%s', 'now'))`).bind(1, 4).run()
				};
				await env.DB.prepare(`INSERT INTO UserGroupMemberships (UserId, UserGroupId, CreatedAt) VALUES (?, ?, strftime('%s', 'now'))`).bind(results[0].Id, 2).run()

				return new Response(JSON.stringify(results));
			} catch (error: any) {
				if (error.message.includes("UNIQUE constraint failed")) {
					if (error.message.includes("Users.Username")) {
						return new Response("Username already exists!", { status: 400 });
					} else if (error.message.includes("Users.EmailAddress")) {
						return new Response("Email address already exists!", { status: 400 });
					}
				}
                console.log(error)
				return new Response("Database error occurred.", { status: 500 });
			}
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

export default signUp;
