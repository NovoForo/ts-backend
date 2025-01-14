import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function deletePostById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const postId = params.postId;

    // Get Post
    const post = await env.DB.prepare(`SELECT * FROM Posts WHERE Id = ?`)
        .bind(postId)
        .first();

    // Get Topic
    const topic = await env.DB.prepare(`SELECT * FROM Topics WHERE Id = ?`)
        .bind(post.TopicId)
        .first()

    
    // Count Posts in Topic
    const count = await env.DB.prepare(`
        SELECT COUNT(*) AS postCount
        FROM Posts
        WHERE TopicId = ?
        `).bind(post.TopicId).first();

    if (count && count.postCount && count.postCount as number > 0) {
        // There are multiple posts (only delete this post)
            await env.DB.prepare(
                `
                DELETE FROM Posts
                WHERE Id = ?
                `
            )
            .bind(postId)
            .run();
    } else {
        // There is only one post (also delete the topic)
        await env.DB.prepare(
            `
            DELETE FROM Posts
            WHERE Id = ?
            `
        )
        .bind(postId)
        .run();
        }.then(() => {
            await env.DB.prepare(
            `
            DELETE FROM Topics
            WHERE Id = ?
            `
        )
        .bind(post.TopicId)
        .run().then(() => {
                await env.DB.prepare(
                    `
                    DELETE FROM Topics
                    WHERE Id = ?
                    `
                )
                .bind(post.TopicId)
                .run();
            })
        })
    return new Response("Post deleted", { status: 200 });
}

export default deletePostById;