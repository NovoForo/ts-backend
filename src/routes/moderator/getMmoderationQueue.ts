import isUserAModerator from "../../middleware/isUserAModerator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function getModerationQueue(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAModerator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const topics = await env.DB.prepare(
        `
        SELECT * FROM Topics
        WHERE IsWithheldForModeratorReview = 1
        `
    ).all();

    const posts = await env.DB.prepare(
        `
        SELECT * FROM Posts
        WHERE IsWithheldForModeratorReview = 1
        `
    ).all();

    const flags = await env.DB.prepare(
        `
        SELECT * FROM PostFlags;
        `
    ).all();

    const flagsWithPosts = await Promise.all(
        flags.results.map(async (flag: any) => {
            const post = await env.DB.prepare(`SELECT * FROM Posts WHERE Id = ?`)
                .bind(flag.PostId)
                .first();
            return { ...flag, Post: post };
        })
    );

    return Response.json({
        topics: topics.results,
        posts: posts.results,
        flags: flagsWithPosts,
    });
}

export default getModerationQueue;
