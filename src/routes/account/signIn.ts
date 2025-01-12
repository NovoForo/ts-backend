import { z } from "zod";
import {
	genSaltSync,
	hashSync,
	compareSync,
	getRounds,
	getSaltSync,
  } from 'bcrypt-edge';
import jwt from "@tsndr/cloudflare-worker-jwt"
import md5 from "../../utils/md5";

const JWT_SECRET = "changemechangemechangeme";

async function signIn(request: Request, params: Record<string, string>, env: Env) {
  // Define required input schema
	const inputSchema = z.object({
        email: z.string().email(),
        password: z.string(),
    });

		// Verify request is properly formatted as a JSON POST Request
    const contentType = request.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {

			// Try to parse the request
        try {
            const json = await request.json();
            const parsedInput = inputSchema.parse(json);
            const { email, password } = parsedInput;

						// Try to query the database for the user account
            try {
                const { results } = await env.DB.prepare(
                    `
                    SELECT * FROM Users
                    WHERE EmailAddress = ?
                    `
                )
                .bind(email)
                .all();

								// NReturn an error if the email address was not found in
								// in the database.
                if (results.length === 0) {
                    return new Response("User not found.", { status: 404 });
                }

								// Create a user reference
								const user: any = results[0]; // TODO: Fix use of any type

                // Check if user is in admin group
                let isAdministrator = false;
                let isModerator = false;

								// Try to get the user's User Group Memberships
                try {
                    const { results } = await env.DB.prepare(
                        `
                        SELECT * FROM UserGroupMemberships
                        WHERE UserId = ?
                        `
                    )
                    .bind(user.Id)
                    .all();

										// Loop over the user's memberships
                    for (const userGroupMembership of results) {
                        const userGroup = await env.DB.prepare(
                            `
                            SELECT * FROM UserGroups
                            WHERE Id = ?
                            `
                        )
                        .bind(userGroupMembership.UserGroupId)
                        .first();

												// If the user is in the Administrators group
												// mark them as an administrator in the API response
                        if (userGroup && userGroup.Name === 'Administrators') {
                            isAdministrator = true;
                        }
                    }
                } catch (error: any) {
                    console.error(error);
                    return new Response("An error occurred while querying the database.", { status: 500 });
                }

                // Try to check if user is in moderator group
                try {
                    const { results } = await env.DB.prepare(
                        `
                        SELECT * FROM UserGroupMemberships
                        WHERE UserId = ?
                        `
                    )
                    .bind(user.Id)
                    .all();

										// Loop over the user's group memeberships
                    for (const userGroupMembership of results) {
                        const userGroup = await env.DB.prepare(
                            `
                            SELECT * FROM UserGroups
                            WHERE Id = ?
                            `
                        )
                        .bind(userGroupMembership.UserGroupId)
                        .first();

												// If the user is in the moderator's group
												// mark them as a moderator in the API response
                        if (userGroup && userGroup.Name === 'Moderators') {
                            isModerator = true;
                        }
                    }
                } catch (error: any) {
                    console.error(error);
                    return new Response("An error occurred while querying the database.", { status: 500 });
                }

					// Check that the password input matches the database with bcrypt
				const passwordMatch = await compareSync(password, user.PasswordHash);
                // IF the credentials are invalid return a response to the user
								if (!passwordMatch) {
                    return new Response("Invalid credentials.", { status: 401 });
                } else {
					// The credentials are valid, create and sign a JWT
					const token = await jwt.sign({
						sub: user.Id,
						nbf: Math.floor(Date.now() / 1000),
						exp: Math.floor(Date.now() / 1000) + ((365 * 24 * (60 * 60))) // TODO: Tokens are valid for one year, fix issues with the frontend to check for expired tokens then lower this to a more reasonable amount
					}, JWT_SECRET)
                    return await Response.json({
						name: user.Username,
						email: user.EmailAddress,
						image: "https://www.gravatar.com/avatar/" + await md5(user.EmailAddress),
						token: token,
						isAdministrator: isAdministrator,
						isModerator: isModerator
					}, { status: 200 });
				}
            } catch (error: any) {
				console.log(error);
                return new Response("An error occurred while querying the database.", { status: 500 });
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                return new Response(JSON.stringify(error.errors), { status: 400 });
            }
            return new Response("Invalid JSON payload!", { status: 400 });
        }
    } else {
        return new Response("Invalid content-type!", { status: 400 });
    }
}

export default signIn;
