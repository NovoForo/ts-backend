import {z} from 'zod';
import isUserLoggedIn from '../../middleware/isUserLoggedIn';
import isUserAnAdministrator from '../../middleware/isUserAnAdministrator';

async function updateCategoryById(request: Request, params: Record<string, string>, env: Env) {
	if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Unauthorized!", { status: 401 })
    }

    const categoryId = params.categoryId;

    // Attempt to retrive the request body
    let jsonData: any;
    try {
        jsonData = await request.json();
    } catch (error) {
        return new Response("Invalid JSON payload!", { status: 400 });
    }

    // Use Zod to define the expected JSON request body
    const categorySchema = z.object({
        name: z.string().min(1, "Name is required."),
        description: z.string().min(1, "Description is required."),
    });

    // Attempt to parse the requet body with Zod
    let parsedData;
    try {
        parsedData = categorySchema.parse(jsonData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Failed to validate forum data!", { status: 400 });
    }

    // Update category
    await env.DB.prepare(`UPDATE Categories SET Name = ?, Description = ? WHERE Id = ?`).bind(parsedData.name, parsedData.description, categoryId).run();

    return new Response("Category updated!");
}

export default  updateCategoryById;