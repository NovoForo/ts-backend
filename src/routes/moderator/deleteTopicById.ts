import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function deleteTopicById(request: Request, params: Record<string, string>, env: Env) {
    if (!isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const topicId = params.topicId;

    await env.DB.prepare(
        `
        DELETE FROM Topics
        WHERE TopicId = ?
        `
    )
    .bind(topicId)
    .run();

    await env.DB.prepare(
        `
        DELETE FROM Posts
        WHERE TopicId = ?
        `
    )
    .bind(topicId)
    .run();

    return new Response("Topic deleted", { status: 200 });
}

export default deleteTopicById;