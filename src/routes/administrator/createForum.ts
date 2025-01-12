import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import { z } from "zod";

async function createForum(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Forbidden. Only administrators can create forums.", { status: 403 });
    }

    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Invalid content-type! Expected application/json.", { status: 400 });
    }

    const categroyId = params["categoryId"];

    let jsonData: any;
    try {
        jsonData = await request.json();
    } catch (error) {
        return new Response("Invalid JSON payload!", { status: 400 });
    }

    const forumSchema = z.object({
        name: z.string().min(1, "Name is required."),
        description: z.string(),
    });

    let parsedData;
    try {
        parsedData = forumSchema.parse(jsonData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Failed to validate forum data!", { status: 400 });
    }

    try {
        const insertForumResult = await env.DB.prepare(
            `
            INSERT INTO Forums
                (Name, Description, SortOrder, CategoryId, CreatedAt)
            VALUES
                (?, ?, ?, ?, ?);
            `
        )
        .bind(parsedData.name, parsedData.description ?? "", 1, categroyId, Math.floor(Date.now() / 1000))
        .run();

        const forumIdResult = await env.DB.prepare(
            `
            SELECT Id FROM Forums
            WHERE Name = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
            `
        )
        .bind(parsedData.name)
        .first();

        if (!forumIdResult || !forumIdResult.Id) {
            return new Response("Failed to retrieve the newly created forum ID.", { status: 500 });
        }

        const newForumId = forumIdResult.Id;

        return Response.json({
            success: true,
            Forum: {
                Id: newForumId,
                Name: parsedData.name,
                Description: parsedData.description ?? "",
                CategoryId: categroyId
            },
            message: "Forum created successfully.",
        }, { status: 201 });
    } catch (error: any) {
        console.error("Database error:", error.message);
        return new Response("An error occurred while creating the forum.", {
            status: 500,
        });
    }
}

export default createForum;
