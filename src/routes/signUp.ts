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
	const inputSchema = z.object({
		username: z.string(),
		email: z.string().email(),
		password: z.string().min(16),
	});

	const contentType = request.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { username, email, password } = parsedInput;
			const passwordHash = hashSync(password, 8);
            let usersCount = 0;

            try {
                const { results } = await env.DB.prepare(
                    `
                    SELECT COUNT(*) AS UsersCount
                    FROM Users
                    `
                )
                .all();

                usersCount = results[0].UsersCount as number;
            } catch (error: any) {
                return new Response("An error occurred while querying the database.", { status: 500 });
            }

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

				// If this is the first user, make them an admin
				if (usersCount == 0) {
                    await env.DB.prepare(`INSERT INTO UserGroupMemberships (UserId, UserGroupId) VALUES (?, ?)`).bind(1,4)
                };

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