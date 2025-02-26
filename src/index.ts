import signIn from "./routes/account/signIn";
import signUp from "./routes/account/signUp";
import forgotPassword from "./routes/account/forgotPassword";
import verifyCredentials from "./routes/account/verifyCredentials";
import updateAccount from "./routes/account/updateAccount";
import getCategories from "./routes/categories/getCategories";
import getCategoryById from "./routes/categories/getCategoryById";
import getTopicsByForumId from "./routes/categories/getTopicsByForumId";
import replyToTopicById from "./routes/posts/replyToTopicById";
import getTopicById from "./routes/categories/getTopicById";
import createTopicByForumId from "./routes/topics/createTopicByForumId";
import updatePostById from "./routes/posts/updatePostById";
import deletePostById from "./routes/posts/deletePostById";
import createCategory from "./routes/administrator/createCategory";
import createForum from "./routes/administrator/createForum";
import getMmoderationQueue from "./routes/moderator/getMmoderationQueue";
import releaseTopicById from "./routes/moderator/releaseTopicById";
import lockTopicById from "./routes/moderator/lockTopicById";
import closeTopicById from "./routes/moderator/closeTopicById";
import releasePostById from "./routes/moderator/releasePostById";
import withholdPostById from "./routes/moderator/withholdPostById";
import pinTopicById from "./routes/moderator/pinTopicById";
import unpinTopicById from "./routes/moderator/unpinTopicById";
import deleteTopicById from "./routes/moderator/deleteTopicById";
import banUserById from "./routes/moderator/banUserById";
import modEditTopicById from "./routes/moderator/modEditTopicById";
import lockUserById from "./routes/moderator/lockUserById";
import unbanUserById from "./routes/moderator/unbanUserById";
import unlockUserById from "./routes/moderator/unlockUserById";
import modEditPostById from "./routes/moderator/modEditPostById";
import isUserLoggedIn from "./middleware/isUserLoggedIn";
import isUserAnAdministrator from "./middleware/isUserAnAdministrator";
import withholdTopicById from "./routes/moderator/withholdTopicById";
import likePostById from "./routes/posts/likePostById";
import flagPostById from './routes/posts/flagPostById';
import deleteFLagById from "./routes/moderator/deleteFlagById";
import dislikePostById from "./routes/posts/dislikePostById";
import deleteCategoryById from "./routes/administrator/deleteCategoryById";
import deleteForumById from "./routes/administrator/deleteForumById";
import updateCategoryById from "./routes/administrator/updateCategoryById";
import updateForumById from "./routes/administrator/updateForumById";

/**
 * @param {Request} request
 * @param {Record<string, string>} params
 * @param {Env} env
 * @returns {Response}
 */
type RouteHandler = (request: Request, params?: Record<string, string>, env?: Env) => Response | Promise<Response>;
const routes: Record<string, (request: Request, params?: Record<string, string>, env?: Env) => Response | Promise<Response>> = {
    // Sign-in, Sign-up, Forgot-Password, VerifyCredentials, Update Account
    "POST /sign-in": (request, params = {}, env) => env ? signIn(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /sign-up": (request, params = {}, env) => env ? signUp(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /forgot-password": (request, params = {}, env) => env ? forgotPassword(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /s/verify_credentials": (request, params = {}, env) => env ? verifyCredentials(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /s/account": (request, params = {}, env) => env ? updateAccount(request, params, env) : new Response("Environment not defined", { status: 500 }),

	// List Categories, List Forums, Get Topics for Forum, Get Topic By ID
    "GET /categories": (request, params = {}, env) => env ? getCategories(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "GET /categories/:categoryId": (request, params = {}, env) => env ? getCategoryById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "GET /categories/:categoryId/forums/:forumId": (request, params = {}, env) => env ? getTopicsByForumId(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "GET /categories/:categoryId/forums/:forumId/topics/:topicId": (request, params = {}, env) => env ? getTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),

	// ACreate Topics, Create Replies, Update Posts, Delete Posts
    "POST /s/categories/:categoryID/forums/:forumID/topics/:topicId": (request, params = {}, env) => env ? replyToTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /s/categories/:categoryID/forums/:forumID/topics": (request, params = {}, env) => env ? createTopicByForumId(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /s/categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env) => env ? updatePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /s/categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env) => env ? deletePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),

    // Direct Messaging

    // Post Like/Dislike
    "POST /categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId/like": (request, params = {}, env) => env ? likePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId/dislike": (request, params = {}, env) => env ? dislikePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),

    // Post Flags (Notify Site Moderators to review a post)
	"POST /categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId/flag": (request, params = {}, env) => env ? flagPostById(request, params, env) : new Response("Environment not defined", { status: 500 }),

	// User Profiles

	// Admin Actions
    "POST /a/categories": (request, params = {}, env) => env ? createCategory(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /a/categories/:categoryId": (request, params = {}, env) => env ? createForum(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PUT /a/categories/:categoryId": (request, params = {}, env) => env ? updateCategoryById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /a/categories/:categoryId": (request, params = {}, env) => env ? deleteCategoryById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PUT /a/forums/:forumId": (request, params = {}, env) => env ? updateForumById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /a/forums/:forumId": (request, params = {}, env) => env ? deleteForumById(request, params, env) : new Response("Environment not defined", { status: 500 }),

    // Moderator Actions
    "GET /moderator/queue": (request, params = {}, env) => env ? getMmoderationQueue(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/withhold": (request, params = {}, env) => env ? withholdTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/release": (request, params = {}, env) => env ? releaseTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/lock": (request, params = {}, env) => env ? lockTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/close": (request, params = {}, env) => env ? closeTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/posts/:postId/release": (request, params = {}, env) => env ? releasePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/posts/:postId/withhold": (request, params = {}, env) => env ? withholdPostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/pin": (request, params = {}, env) => env ? pinTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/unpin": (request, params = {}, env) => env ? unpinTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/edit": (request, params = {}, env) => env ? modEditTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/posts/:postId/edit": (request, params = {}, env) => env ? modEditTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /moderator/posts/:postId": (request, params = {}, env) => env ? deletePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /moderator/posts/:postId/flag": (request, params = {}, env) => env ? deleteFLagById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /moderator/topics/:topicId": (request, params = {}, env) => env ? deleteTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/users/:userId/ban": (request, params = {}, env) => env ? banUserById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/users/:userId/lock": (request, params = {}, env) => env ? lockUserById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/users/:userId/unban": (request, params = {}, env) => env ? unbanUserById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/users/:userId/unlock": (request, params = {}, env) => env ? unlockUserById(request, params, env) : new Response("Environment not defined", { status: 500 }),
}

/**
 * matchRoute
 * Matches the route path with the actual path.
 * @param routePath
 * @param actualPath
 * @returns
 */
function matchRoute(routePath: string, actualPath: string): { isMatch: boolean; params: Record<string, string> } {
	const routeParts = routePath.split("/");
	const actualParts = actualPath.split("/");

	if (routeParts.length !== actualParts.length) {
		return { isMatch: false, params: {} };
	}

	const params: Record<string, string> = {};
	for (let i = 0; i < routeParts.length; i++) {
		if (routeParts[i].startsWith(":")) {
			const paramName = routeParts[i].slice(1);
			params[paramName] = actualParts[i];
		} else if (routeParts[i] !== actualParts[i]) {
			return { isMatch: false, params: {} };
		}
	}

	return { isMatch: true, params };
}

/**
 * handeRequest
 * @param request
 * @param env
 * @returns Promise<Response>
 */
function handleRequest(request: Request, env: Env): Promise<Response> {
	const { method, url } = request;
	const pathName = new URL(url).pathname;

	for (const routeKey of Object.keys(routes)) {
		const [routeMethod, routePath] = routeKey.split(" ");
		if (method === routeMethod) {
			const { isMatch, params } = matchRoute(routePath, pathName);
			if (isMatch) {
				return Promise.resolve(routes[routeKey](request, params, env));
			}
		}
	}

	return Promise.resolve(new Response("Not Found", { status: 404 }));
}

/**
 * handleRequestWithCors
 * Handles the request and attaches CORS headers to the returned response.
 * @param request
 * @param env
 * @returns Promise<Response>
 */
async function handleRequestWithCors(request: Request, env: Env): Promise<Response> {
	const response = await handleRequest(request, env);
	const headers = new Headers(response.headers);

	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, UPDATE, DELETE, OPTIONS");
	headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (request.method === "OPTIONS") {
        return new Response(response.body, {
            status: 200,
            statusText: "Ok",
            headers,
        });
    } else {
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    }

}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return handleRequestWithCors(request, env);
	},
} satisfies ExportedHandler<Env>;
