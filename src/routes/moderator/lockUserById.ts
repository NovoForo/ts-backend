import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function lockUserById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = params.userId;
    const user = await env.DB.prepare(
        `
        SELECT * FROM Users
        WHERE Id = ?
        `
    )
    .bind(userId)
    .first();

    if (!user) {
        return new Response("User not found", { status: 404 });
    }

    // Remove user from all groups
    await env.DB
        .prepare(`DELETE FROM UserGroupMemberships WHERE UserId = ?`)
        .bind(userId)
        .run()
        .finally(async () => {
            // Enroll user in the locked group
            await env.DB
            .prepare(`INSERT INTO UserGroupMemberships (UserId, UserGroupId) VALUES (?, ?)`)
            .bind(userId, 6)
            .run()
        });

    return new Response("User locked", { status: 200 });
}

export default lockUserById;