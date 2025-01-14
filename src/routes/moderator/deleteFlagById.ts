import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function deleteFLagById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const postId = params.postId;
    await env.DB.prepare(
        `
        DELETE FROM PostFlags
        WHERE PostId = ?
        `
    )
    .bind(postId)
    .run();

    return new Response("Post deleted", { status: 200 });
}

export default deleteFLagById;