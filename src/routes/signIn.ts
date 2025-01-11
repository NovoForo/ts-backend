import { z } from "zod";
import {
	genSaltSync,
	hashSync,
	compareSync,
	getRounds,
	getSaltSync,
  } from 'bcrypt-edge';
import jwt from "@tsndr/cloudflare-worker-jwt"
import md5 from "../utils/md5";

const JWT_SECRET = "changemechangemechangeme";

async function signIn(request: Request, params: Record<string, string>, env: Env) {
    const inputSchema = z.object({
        email: z.string().email(),
        password: z.string(),
    });

    const contentType = request.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            const json = await request.json();
            const parsedInput = inputSchema.parse(json);
            const { email, password } = parsedInput;

            try {
                const { results } = await env.DB.prepare(
                    `
                    SELECT * FROM Users
                    WHERE EmailAddress = ?
                    `
                )
                .bind(email)
                .all();

                if (results.length === 0) {
                    return new Response("User not found.", { status: 404 });
                }

				const user: any = results[0]; // TODO: Fix use of any type

                // Check if user is in admin group
                let isAdministrator = false;
                let isModerator = false;

                try {
                    const { results } = await env.DB.prepare(
                        `
                        SELECT * FROM UserGroupMemberships
                        WHERE UserId = ?
                        `
                    )
                    .bind(user.Id)
                    .all();

                    for (const userGroupMembership of results) {
                        const userGroup = await env.DB.prepare(
                            `
                            SELECT * FROM UserGroups
                            WHERE Id = ?
                            `
                        )
                        .bind(userGroupMembership.UserGroupId)
                        .first();

                        if (userGroup && userGroup.Name === 'Administrators') {
                            isAdministrator = true;
                        }
                    }
                } catch (error: any) {
                    console.error(error);
                    return new Response("An error occurred while querying the database.", { status: 500 });
                }

                // Check if user is in moderator group
                try {
                    const { results } = await env.DB.prepare(
                        `
                        SELECT * FROM UserGroupMemberships
                        WHERE UserId = ?
                        `
                    )
                    .bind(user.Id)
                    .all();

                    for (const userGroupMembership of results) {
                        const userGroup = await env.DB.prepare(
                            `
                            SELECT * FROM UserGroups
                            WHERE Id = ?
                            `
                        )
                        .bind(userGroupMembership.UserGroupId)
                        .first();

                        if (userGroup && userGroup.Name === 'Moderators') {
                            isModerator = true;
                        }
                    }
                } catch (error: any) {
                    console.error(error);
                    return new Response("An error occurred while querying the database.", { status: 500 });
                }

				const passwordMatch = await compareSync(password, user.PasswordHash);
                if (!passwordMatch) {
                    return new Response("Invalid credentials.", { status: 401 });
                } else {
					const token = await jwt.sign({
						sub: user.Id,
						nbf: Math.floor(Date.now() / 1000), 
						exp: Math.floor(Date.now() / 1000) + ((365 * 24 * (60 * 60)))
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