import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import {z} from "zod";

async function modEditPostById(request: Request, params: Record<string, string>, env: Env) {
    if (!isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const inputSchema = z.object({
        postTitle: z.string(),
        postContent: z.string(),
    });

    const jsonBody = await request.json();

    const parsedInput = inputSchema.parse(jsonBody);

    const postId = params.postId;
    const postTitle = parsedInput.postTitle;
    const postContent = parsedInput.postContent;

    await env.DB.prepare(
        `
        UPDATE Posts
        SET Title = ?, Content = ?
        WHERE Id = ?
        `
    )
    .bind(postTitle, postContent, postId)
    .run();

    return new Response("Post updated", { status: 200 });
}

export default modEditPostById;