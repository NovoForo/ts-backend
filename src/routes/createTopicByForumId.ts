import { z } from 'zod';
import isUserLoggedIn from '../middleware/isUserLoggedIn';
import getUserIdFromJwt from '../middleware/getUserIdFromJwt';
import getUserPermissions from '../middleware/getUserPermissions';

async function createTopicByForumId(
    request: Request,
    params: Record<string, string>,
    env: Env
): Promise<Response> {
    if (!(await isUserLoggedIn(request))) {
        return new Response("Unauthorized", { status: 401 });
    }

    // Check if user has permission to create topics
    const permissions = await getUserPermissions(request, env);
    if (!permissions || !permissions.CanCreateTopics) {
        return new Response("Unauthorized", { status: 401 });
    }

    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Invalid content-type! Expected application/json.", { status: 400 });
    }

    let jsonData: any;
    try {
        jsonData = await request.json();
    } catch (error) {
        return new Response("Invalid JSON payload!", { status: 400 });
    }

    const topicSchema = z.object({
        title: z.string().min(1, "Title is required."),
        content: z.string().min(1, "Content is required."),
    });

    let parsedData;
    try {
        parsedData = topicSchema.parse(jsonData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Failed to validate topic data!", { status: 400 });
    }

    const forumIdStr = params["forumID"] || params["forumId"] || params["forumid"];
    const forumId = parseInt(forumIdStr, 10);
    if (Number.isNaN(forumId)) {
        return new Response("Invalid forum ID!", { status: 400 });
    }

    const userId = await getUserIdFromJwt(request);
    if (!userId) {
        return new Response("Could not determine user ID from token!", { status: 400 });
    }

    try {
        const insertTopicResult = await env.DB.prepare(
            `
            INSERT INTO Topics
                (Title, ForumId, CreatedAt)
            VALUES 
                (?, ?, ?);
            `
        )
        .bind(parsedData.title, forumId, Math.floor(Date.now() / 1000))
        .run();

        const topicIdResult = await env.DB.prepare(
            `
            SELECT Id FROM Topics
            WHERE Title = ? AND ForumId = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
            `
        )
        .bind(parsedData.title, forumId)
        .first();

        if (!topicIdResult || !topicIdResult.Id) {
            return new Response("Failed to retrieve the newly created topic ID.", { status: 500 });
        }

        const newTopicId = topicIdResult.Id;

        const insertPostResult = await env.DB.prepare(
            `
            INSERT INTO Posts
                (Content, TopicId, UserId, CreatedAt)
            VALUES 
                (?, ?, ?, ?);
            `
        )
        .bind(parsedData.content, newTopicId, userId, Math.floor(Date.now() / 1000))
        .run();

        const postIdResult = await env.DB.prepare(
            `
            SELECT Id FROM Posts
            WHERE TopicId = ? AND UserId = ? AND CreatedAt = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
            `
        )
        .bind(newTopicId, userId, Math.floor(Date.now() / 1000))
        .first();

        if (!postIdResult || !postIdResult.Id) {
            await env.DB.prepare(
                `
                DELETE FROM Topics
                WHERE Id = ?;
                `
            )
            .bind(newTopicId)
            .run();

            return new Response("Failed to retrieve the newly created post ID. Topic has been rolled back.", { status: 500 });
        }

        const newPostId = postIdResult.Id;

        return Response.json({
            success: true,
            Topic: {
                Id: newTopicId,
                Title: parsedData.title,
                ForumId: forumId,
                CreatedAt: Math.floor(Date.now()),
                UserId: userId,
            },
            Post: {
                Id: newPostId,
                Content: parsedData.content,
                TopicId: newTopicId,
                UserId: userId,
                CreatedAt: Math.floor(Date.now()),
            },
            message: "Topic and initial post created successfully.",
        }, { status: 201 });
    } catch (error: any) {
        console.error("Database error:", error.message);
        return new Response("An error occurred while creating the topic and post.", {
            status: 500,
        });
    }
}

export default createTopicByForumId;