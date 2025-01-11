import jwt from "@tsndr/cloudflare-worker-jwt"

const JWT_SECRET = "changemechangemechangeme";

/**
 * isUserLoggedIn
 * @param request 
 * @returns Promise<Boolean>
 */
async function isUserLoggedIn(request: Request): Promise<Boolean> {
	const authorizationHeader = request.headers.get("authorization");
	
	if (authorizationHeader) {
		const token = authorizationHeader?.startsWith("Bearer ") 
		? authorizationHeader.slice(7).trim() 
		: "";
		try {
			const isValidToken = await jwt.verify(token, JWT_SECRET);
			if (isValidToken) {
				return true;
			} else {
				return false;
			}
		} catch (error: any) {
			return false;
		}
	} else {
		return false;
	}
}

export default isUserLoggedIn;