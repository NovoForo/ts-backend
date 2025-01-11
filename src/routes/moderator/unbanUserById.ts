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

    await env.DB.prepare(
        `
        UPDATE Users
        SET IsBanned = 0
        WHERE Id = ?
        `
    )
    .bind(userId)
    .run();

    return new Response("User unbanned", { status: 200 });
}

export default unbanUserById;