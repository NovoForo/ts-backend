import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function closeTopicById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const topicId = params.topicId;

    const topic = await env.DB.prepare(
        `
        SELECT * FROM Topics
        WHERE Id = ?
        `
    ).bind(topicId).first();

    if (!topic) {
        return new Response("Topic not found", { status: 404 });
    }

    await env.DB.prepare(
        `
        UPDATE Topics
        SET IsClosedByAuthor = 1
        WHERE Id = ?
        `
    ).bind(topicId).run();

    return new Response("Topic closed", { status: 200 });
}

export default closeTopicById;