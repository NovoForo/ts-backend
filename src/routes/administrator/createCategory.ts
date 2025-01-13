import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import {z} from "zod";

async function createCategory(request: Request, params: Record<string, string>, env: Env) {
    // Check if user is logged in
		if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

		// Check if user is an administrator
    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Forbidden. Only administrators can create categories.", { status: 403 });
    }

		// Check that the incoming request is JSON
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Invalid content-type! Expected application/json.", { status: 400 });
    }

		// Attempt to accept the request
    let jsonData: any;
    try {
        jsonData = await request.json();
    } catch (error) {
        return new Response("Invalid JSON payload!", { status: 400 });
    }

		// Use Zod to define the expected JSON body schema
    const categorySchema = z.object({
        name: z.string().min(1, "Name is required."),
        description: z.string(),
    });

		// Attempt to parse the JSON Request Body with Zod
    let parsedData;
    try {
        parsedData = categorySchema.parse(jsonData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Failed to validate category data!", { status: 400 });
    }

		// Attempt to insert the category into the database
    try {
        const insertCategoryResult = await env.DB.prepare(
            `
            INSERT INTO Categories
                (Name, Description, SortOrder, CreatedAt)
            VALUES
                (?, ?, ?, ?);
            `
        )
        .bind(parsedData.name, parsedData.description ?? "", 1, Math.floor(Date.now() / 1000))
        .run();

				// Attempt to get the new category's ID
        const categoryIdResult = await env.DB.prepare(
            `
            SELECT Id FROM Categories
            WHERE Name = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
            `
        )
        .bind(parsedData.name)
        .first();

				// Something went wrong inserting the category into the database
        if (!categoryIdResult || !categoryIdResult.Id) {
            return new Response("Failed to retrieve the newly created category ID.", { status: 500 });
        }

				// Save the new category ID
        const newCategoryId = categoryIdResult.Id;

				// Return a response
        return Response.json({
            success: true,
            Category: {
                Id: newCategoryId,
                Name: parsedData.name,
                Description: parsedData.description ?? "",
                CreatedAt: Math.floor(Date.now()),
            },
            message: "Category created successfully.",
        }, { status: 201 });
    } catch (error: any) {
        console.error("Database error:", error.message);
        return new Response("An error occurred while creating the category.", {
            status: 500,
        });
    }
}

export default createCategory;
