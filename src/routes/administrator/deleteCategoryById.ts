import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function deleteCategoryById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }
    
    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Unauthorized!", { status: 401 })
    }
    
    const categoryId = params.categoryId;
    
    // Delete category
    await env.DB.prepare(`DELETE FROM Categories WHERE Id = ?`).bind(categoryId).run();
    
    return new Response("Category deleted!");
}

export default deleteCategoryById;