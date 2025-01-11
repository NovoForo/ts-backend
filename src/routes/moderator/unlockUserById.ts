import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function unlockUserById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = params.userId;

    await env.DB.prepare(
        `
        UPDATE Users
        SET IsLocked = 0
        WHERE Id = ?
        `
    )
    .bind(userId)
    .run();

    return new Response("User unlocked", { status: 200 });
}

export default unlockUserById;