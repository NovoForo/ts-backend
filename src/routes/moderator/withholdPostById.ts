import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function withholdPostById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const postId = params.postId;

    const post = await env.DB.prepare(
        `
        SELECT * FROM Posts
        WHERE Id = ?
        `
    ).bind(postId).first();

    if (!post) {
        return new Response("Post not found", { status: 404 });
    }

    await env.DB.prepare(
        `
        UPDATE Posts
        SET IsWithheldForModeratorReview = 1
        WHERE Id = ?
        `
    ).bind(postId).run();

    return new Response("Post withheld", { status: 200 });
}

export default withholdPostById;