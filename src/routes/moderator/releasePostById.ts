import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function releasePostById(request: Request, params: Record<string, string>, env: Env) {
    if (!isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!isUserAModerator(request, env)) {
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
        SET IsWithheldForModeratorReview = 0
        WHERE Id = ?
        `
    ).bind(postId).run();

    return new Response("Post released", { status: 200 });
}

export default releasePostById;