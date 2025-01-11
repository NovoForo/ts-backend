import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function unpinTopicById(request: Request, params: Record<string, string>, env: Env) {
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
        WHERE TopicId = ?
        `
    ).first(topicId);

    if (!topic) {
        return new Response("Topic not found", { status: 404 });
    }

    await env.DB.prepare(
        `
        UPDATE Topics
        SET IsPinned = 0
        WHERE TopicId = ?
        `
    )
    .bind(topicId)
    .run();

    return new Response("Topic unpinned", { status: 200 });
}

export default unpinTopicById