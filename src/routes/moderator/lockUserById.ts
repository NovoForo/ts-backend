import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function lockUserById(request: Request, params: Record<string, string>, env: Env) {
    if (!isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!isUserAnAdministrator(request, env)) {
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
        SET IsLocked = 1
        WHERE Id = ?
        `
    )
    .bind(userId)
    .run();

    return new Response("User locked", { status: 200 });
}

export default lockUserById;