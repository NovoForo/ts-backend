import getUserFromJwt from "./getUserFromJwt";
import getUserIdFromJwt from "./getUserIdFromJwt";

/**
 * isUserAModerator
 * @param request 
 * @param env 
 * @returns Promise<Boolean>
 */
async function isUserAModerator(request: Request, env: Env): Promise<Boolean> {
    const userId = await getUserIdFromJwt(request);
    if (userId === null) {
        throw new Error('User ID not found');
    }

    const userGroupMemberships = await env.DB.prepare('SELECT * FROM UserGroupMemberships WHERE UserId = ?').bind(userId).all();

    for (const userGroupMembership of userGroupMemberships.results) {
        const userGroup = await env.DB.prepare('SELECT * FROM UserGroups WHERE Id = ?').bind(userGroupMembership.UserGroupId).first();
        if (userGroup && userGroup.Name === 'Moderator') {
            return true;
        }
    }

    return false;
}

export default isUserAModerator;