import getUserIdFromJwt from "./getUserIdFromJwt";
import isUserLoggedIn from "./isUserLoggedIn";

/**
 * getUserFromJwt
 * @param request
 * @param env 
 * @returns Promise<any>
 */
async function getUserFromJwt(request: Request, env: Env): Promise<any> {
	const userId = await getUserIdFromJwt(request);
	if (userId && (await isUserLoggedIn(request))) {
		const { results } = await env.DB.prepare(
			`
			SELECT
				u.Id AS UserId,
				u.Username AS UserName,
				u.EmailAddress AS UserEmail,
                u.IsModerator AS UserIsModerator,
                u.IsAdministrator AS UserIsAdministrator,
				u.CreatedAt AS CreatedAt,
				u.UpdatedAt AS UpdatedAt,
			FROM 
				Users u
			WHERE
				u.Id = ?
			`
		)
		.bind(userId)
		.all();

		const row = await results[0];
		return row;
	}
}

export default getUserFromJwt;