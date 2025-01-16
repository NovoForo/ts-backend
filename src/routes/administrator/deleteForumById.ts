import {z} from 'zod';
import isUserAnAdministrator from "../../middleware/isUserAnAdministrator";
import isUserLoggedIn from "../../middleware/isUserLoggedIn";

async function deleteForumById(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }
    
    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Unauthorized!", { status: 401 })
    }
    
    const forumId = params.forumId;
    
    // Delete category
    await env.DB.prepare(`DELETE FROM Forums WHERE Id = ?`).bind(forumId).run();
    
    return new Response("Forum deleted!");
}

export default deleteForumById;