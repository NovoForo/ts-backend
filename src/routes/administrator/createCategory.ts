import isUserLoggedIn from "../../middleware/isUserLoggedIn";
import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import {z} from "zod";

async function createCategory(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Forbidden. Only administrators can create categories.", { status: 403 });
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

    const categorySchema = z.object({
        name: z.string().min(1, "Name is required."),
        description: z.string(),
    });

    let parsedData;
    try {
        parsedData = categorySchema.parse(jsonData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Failed to validate category data!", { status: 400 });
    }

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

        if (!categoryIdResult || !categoryIdResult.Id) {
            return new Response("Failed to retrieve the newly created category ID.", { status: 500 });
        }

        const newCategoryId = categoryIdResult.Id;

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
