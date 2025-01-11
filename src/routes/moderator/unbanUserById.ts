import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function unbanUserById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = params.userId;

    // Remove user from banned group
    await env.DB.prepare(
        `
        DELETE FROM UserGroupMemberships
        WHERE UserId = ?
        `
    ).bind(userId).run().finally(async () => {
        // Enroll user in the default group
        await env.DB.prepare(
            `
            INSERT INTO UserGroupMemberships (UserId, UserGroupId)
            VALUES (?, ?)
            `
        ).bind(userId, 2).run();
    });

    return new Response("User unbanned", { status: 200 });
}

export default unbanUserById;