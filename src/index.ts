import signIn from "./routes/signIn";
import signUp from "./routes/signUp";
import forgotPassword from "./routes/forgotPassword";
import verifyCredentials from "./routes/verifyCredentials";
import updateAccount from "./routes/updateAccount";
import getCategories from "./routes/getCategories";
import getCategoryById from "./routes/getCategoryById";
import getTopicsByForumId from "./routes/getTopicsByForumId";
import replyToTopicById from "./routes/replyToTopicById";
import getTopicById from "./routes/getTopicById";
import createTopicByForumId from "./routes/createTopicByForumId";
import updatePostById from "./routes/updatePostById";
import deletePostById from "./routes/deletePostById";
import createCategory from "./routes/createCategory";
import createForum from "./routes/createForum";
import getTopicsForModeration from "./routes/moderator/getTopicsForModeration";
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

function updateCategoryById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function deleteCategoryById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}


async function aiTestResponse(request: Request, params: Record<string, string>, env: Env) {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!await isUserAnAdministrator(request, env)) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!env.AI) {
        return new Response("AI not enabled", { status: 500 });
    }

    const inputs = {
        text: 'Hey Bob you wrote an interesting post on pizza. I love pizza but I hate pineapples. Can you imagine pineapples on pizza?',  
    };

    const response = await env.AI.run(
        '@cf/huggingface/distilbert-sst-2-int8',
        inputs,
    );

    return new Response(JSON.stringify(response), { status: 200 });
}

/**
 * @param {Request} request
 * @param {Record<string, string>} params
 * @param {Env} env
 * @returns {Response}
 */
type RouteHandler = (request: Request, params?: Record<string, string>, env?: Env) => Response | Promise<Response>;
const routes: Record<string, (request: Request, params?: Record<string, string>, env?: Env) => Response | Promise<Response>> = {	
	// AI Testing
    "GET /ai-test": (request, params = {}, env) => env ? aiTestResponse(request, params, env) : new Response("Environment not defined", { status: 500 }),
    // Account Actions
    "POST /sign-in": (request, params = {}, env) => env ? signIn(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /sign-up": (request, params = {}, env) => env ? signUp(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /forgot-password": (request, params = {}, env) => env ? forgotPassword(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /s/verify_credentials": (request, params = {}, env) => env ? verifyCredentials(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /s/account": (request, params = {}, env) => env ? updateAccount(request, params, env) : new Response("Environment not defined", { status: 500 }),

	// Public Actions
    "GET /categories": (request, params = {}, env) => env ? getCategories(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "GET /categories/:categoryId": (request, params = {}, env) => env ? getCategoryById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "GET /categories/:categoryId/forums/:forumId": (request, params = {}, env) => env ? getTopicsByForumId(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "GET /categories/:categoryId/forums/:forumId/topics/:topicId": (request, params = {}, env) => env ? getTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),

	// Authenticated Actions
    "POST /s/categories/:categoryID/forums/:forumID/topics/:topicId": (request, params = {}, env) => env ? replyToTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /s/categories/:categoryID/forums/:forumID/topics": (request, params = {}, env) => env ? createTopicByForumId(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /s/categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env) => env ? updatePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /s/categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env) => env ? deletePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),

	// Admin Actions
    "POST /a/categories": (request, params = {}, env) => env ? createCategory(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "POST /a/categories/:categoryId": (request, params = {}, env) => env ? createForum(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /a/categories/:categoryId": (request, params = {}, env) => env ? updateCategoryById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /a/categories/:categoryId": (request, params = {}, env) => env ? deleteCategoryById(request, params, env) : new Response("Environment not defined", { status: 500 }),

    // Moderator Actions
    "GET /moderator/topics": (request, params = {}, env) => env ? getTopicsForModeration(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/release": (request, params = {}, env) => env ? releaseTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/lock": (request, params = {}, env) => env ? lockTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/close": (request, params = {}, env) => env ? closeTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/posts/:postId/release": (request, params = {}, env) => env ? releasePostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/posts/:postId/withhold": (request, params = {}, env) => env ? withholdPostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/pin": (request, params = {}, env) => env ? pinTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/unpin": (request, params = {}, env) => env ? unpinTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/topics/:topicId/edit": (request, params = {}, env) => env ? modEditTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "PATCH /moderator/posts/:postId/edit": (request, params = {}, env) => env ? modEditTopicById(request, params, env) : new Response("Environment not defined", { status: 500 }),
    "DELETE /moderator/posts/:postId": (request, params = {}, env) => env ? modEditPostById(request, params, env) : new Response("Environment not defined", { status: 500 }),
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