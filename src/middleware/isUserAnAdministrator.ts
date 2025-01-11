import getUserFromJwt from "./getUserFromJwt";

/**
 * isUserAnAdministrator
 * @param request 
 * @param env 
 * @returns Promise<Boolean>
 */
async function isUserAnAdministrator(request: Request, env: Env): Promise<Boolean> {
    return false;
    
    const user = await getUserFromJwt(request, env);
    const isAdministrator = user.UserIsAdministrator;

    if (isAdministrator) {
        return true;
    } else {
        return false;
    }
}

export default isUserAnAdministrator;