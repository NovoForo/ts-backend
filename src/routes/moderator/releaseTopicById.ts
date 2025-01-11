import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function releaseTopicById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const topic = await env.DB.prepare(
        `
        SELECT * FROM Topics
        WHERE Id = ?
        `
    ).bind(params["topicId"]).first();

    if (!topic) {
        return new Response("Topic not found", { status: 404 });
    }

    if (!topic.IsWithheldForModeratorReview) {
        return new Response("Topic is not being withheld for moderator review", { status: 400 });
    }

    await env.DB.prepare(
        `
        UPDATE Topics
        SET IsWithheldForModeratorReview = 0
        WHERE Id = ?
        `
    ).bind(params["topicId"]).run();

    return new Response("Topic released", { status: 200 });
}

export default releaseTopicById;