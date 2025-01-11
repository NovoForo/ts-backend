import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function banUserById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
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

    await env.DB.prepare(
        `
        UPDATE Users
        SET IsBanned = 1
        WHERE Id = ?
        `
    )
    .bind(userId)
    .run();

    return new Response("User has been banned", { status: 200 });
}

export default banUserById;