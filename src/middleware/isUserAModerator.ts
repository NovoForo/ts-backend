import getUserFromJwt from "./getUserFromJwt";

/**
 * isUserAModerator
 * @param request 
 * @param env 
 * @returns Promise<Boolean>
 */
async function isUserAModerator(request: Request, env: Env): Promise<Boolean> {
    const user = await getUserFromJwt(request, env);
    const isModerator = user.UserIsModerator;
	
    if (isModerator) {
        return true;
    } else {
        return false;
    }
}

export default isUserAModerator;