import {z} from 'zod';
import isUserLoggedIn from '../../middleware/isUserLoggedIn';
import isUserAModerator from '../../middleware/isUserAModerator';

async function withholdTopicById(request: Request, params: Record<string,string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response('Unauthorized', {status: 401});
    }

    if (!await isUserAModerator(request, env)) {
        return new Response('Unauthorized', {status: 401});
    }
    
    const topicId = params.topicId;

    const topic = await env.DB.prepare('SELECT * FROM Topics WHERE id = ?').bind(topicId).first();

    if (!topic) {
        return new Response('Topic not found', {status: 404});
    }

    if (topic.IsWithheldForModeratorReview) {
        return new Response('Topic already withheld', {status: 400});
    }

    env.DB.prepare('UPDATE Topics SET IsWithheldForModeratorReview = 1 WHERE id = ?').bind(topicId).run();

    return new Response('Topic withheld', {status: 200});
}

export default withholdTopicById;