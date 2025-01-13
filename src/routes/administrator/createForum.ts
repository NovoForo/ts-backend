import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import { z } from "zod";

async function createForum(request: Request, params: Record<string, string>, env: Env): Promise<Response> {
    // Check that the user is logged in
		if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

		// Check that the user is an administrator
    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Forbidden. Only administrators can create forums.", { status: 403 });
    }

		// Check that the incoming request is JSON
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Invalid content-type! Expected application/json.", { status: 400 });
    }

		// Get the category ID
    const categroyId = params["categoryId"];

		// Attempt to retrive the request body
    let jsonData: any;
    try {
        jsonData = await request.json();
    } catch (error) {
        return new Response("Invalid JSON payload!", { status: 400 });
    }

		// Use Zod to define the expected JSON request body
    const forumSchema = z.object({
        name: z.string().min(1, "Name is required."),
        description: z.string(),
    });

		// Attempt to parse the requet body with Zod
    let parsedData;
    try {
        parsedData = forumSchema.parse(jsonData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Failed to validate forum data!", { status: 400 });
    }

		// Attempt to insert the forum into the database
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

				// Query the database to confirm  the data was inserted successfully
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

				// Data failed to insert, return an error to the user
        if (!forumIdResult || !forumIdResult.Id) {
            return new Response("Failed to retrieve the newly created forum ID.", { status: 500 });
        }

				// Store the new forum ID
        const newForumId = forumIdResult.Id;

				// Return a response
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
