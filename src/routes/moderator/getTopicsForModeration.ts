import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function getTopicsForModeration(request: Request, params: Record<string, string>, env: Env) {
    if (await !isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const topics = await env.DB.prepare(
        `
        SELECT * FROM Topics
        WHERE IsWithheldForModeratorReview = 1
        `
    ).all();

    const posts = await env.DB.prepare(
        `
        SELECT * FROM Posts
        WHERE IsWithheldForModeratorReview = 1
        `
    ).all();

    return Response.json({
        topics,
        posts,
    });
}

export default getTopicsForModeration;