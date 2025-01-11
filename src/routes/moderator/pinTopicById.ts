import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function pinTopicById(request: Request, params: Record<string, string>, env: Env) {
    if (!isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!isUserAModerator(request, env)) {
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
        SET IsPinned = 1
        WHERE Id = ?
        `
    ).bind(topicId).run();

    return new Response("Topic pinned", { status: 200 });
}

export default pinTopicById;