import jwt from "@tsndr/cloudflare-worker-jwt"

const JWT_SECRET = "changemechangemechangeme";

/**
 * getUserIdFromJwt
 * Gets the user ID from the JWT token in the Authorization header
 * @param request 
 * @returns Promise<string | null>
 * @returns 
 */
async function getUserIdFromJwt(request: Request): Promise<string | null> {
	const authorizationHeader = request.headers.get("authorization");
	const token = authorizationHeader?.startsWith("Bearer ") 
    ? authorizationHeader.slice(7).trim() 
    : "";
	const isValidToken = await jwt.verify(token, JWT_SECRET);
	if (isValidToken) {
		const { payload } = isValidToken
		if (payload && payload.sub) {
			return payload.sub;
		} else {
			return null;
		}
	} else {
		return null;
	}
}

export default getUserIdFromJwt