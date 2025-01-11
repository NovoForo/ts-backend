import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import {z} from "zod";

async function modEditTopicById(request: Request, params: Record<string, string>, env: Env) {
    if (!isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const inputSchema = z.object({
        topicTitle: z.string(),
        topicContent: z.string(),
    });

    const jsonBody = await request.json();
    const parsedInput = inputSchema.parse(jsonBody);

    if (parsedInput instanceof z.ZodError) {
        return new Response("Bad input", { status: 400 });
    }
    
    const topicId = params.topicId;
    const topicTitle = parsedInput.topicTitle;
    const topicContent = parsedInput.topicContent;

    await env.DB.prepare(
        `
        UPDATE Topics
        SET Title = ?, Content = ?
        WHERE Id = ?
        `
    )
    .bind(topicTitle, topicContent, topicId)
    .run();

    return new Response("Topic updated", { status: 200 });
}

export default modEditTopicById;