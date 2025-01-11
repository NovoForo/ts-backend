import getUserIdFromJwt from "../../middleware/getUserIdFromJwt";
import isUserAModerator from "../../middleware/isUserAModerator";
import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import getTopicById from "../getTopicById";

async function lockTopicById(request: Request, params: Record<string, string>, env: Env) {
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
    ).first();

    if (!topic) {
        return new Response("Topic not found", { status: 404 });
    }

    if (topic.IsLockedByModerator) {
        return new Response("Topic is already locked", { status: 400 });
    }

    await env.DB.prepare(
        `
        UPDATE Topics
        SET IsLockedByModerator = 1
        WHERE Id = ?
        `
    ).bind(params["topicId"]).run();

    return new Response("Topic locked", { status: 200 });
}

export default lockTopicById;