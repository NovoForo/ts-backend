import { z } from "zod";
import jwt from "@tsndr/cloudflare-worker-jwt"
import {
	genSaltSync,
	hashSync,
	compareSync,
	getRounds,
	getSaltSync,
  } from 'bcrypt-edge';

// Functions
function signIn(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

async function signUp(request: Request, params: Record<string, string>, env: Env) {
	const inputSchema = z.object({
		Username: z.string(),
		EmailAddress: z.string().email(),
		Password: z.string().min(16),
	})

	const contentType = request.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { Username, EmailAddress, Password } = parsedInput;
			const passwordHash = hashSync(Password, 8);

			//compareSync('password', hash);

			try {
				const { results } = await env.DB.prepare(
					
					`
					INSERT INTO Users
						(Username,
						PasswordHash,
						EmailAddress,
						CreatedAt)
					VALUES (?, ?, ?, ?);
					`
				)
				.bind(Username, passwordHash, EmailAddress, Date.now())
				.all();

				return new Response(JSON.stringify(results));
			} catch (error: any) {
				if (error.message.includes("UNIQUE constraint failed")) {
					if (error.message.includes("Users.Username")) {
						return new Response("Username already exists!", { status: 400 });
					} else if (error.message.includes("Users.EmailAddress")) {
						return new Response("Email address already exists!", { status: 400 });
					}
				}
				return new Response("Database error occurred.", { status: 500 });
			}
		} catch (error) {
			if (error instanceof z.ZodError) {
				return new Response(JSON.stringify(error.errors), { status: 400 });
			}
			return new Response("Invalid JSON payload!", { status: 400 });
		}
	} else {
		return new Response("Invalid content-type!");
	}
}

function forgotPassword(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function verifyCredentials(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function updateAccount(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

async function getCategories(request: Request, params: Record<string, string>, env: Env) {
	const { results } = await env.DB.prepare(
		`
		SELECT 
			c.Id AS Id,
			c.Name,
			c.Description,
			c.SortOrder,
			c.CreatedAt,
			c.UpdatedAt,
			c.DeletedAt,
			COALESCE(
				json_group_array(
					json_object(
						'Id', f.Id,
						'Name', f.Name,
						'Description', f.Description,
						'SortOrder', f.SortOrder,
						'CreatedAt', f.CreatedAt,
						'UpdatedAt', f.UpdatedAt,
						'DeletedAt', f.DeletedAt
					)
				), 
				'[]'
			) AS forums
		FROM 
			Categories c
		LEFT JOIN 
			Forums f
		ON 
			c.Id = f.CategoryId
		GROUP BY 
			c.Id;

		`
	)
	.all();
		
	return Response.json(results);
}

async function getCategoryById(request: Request, params: Record<string, string>, env: Env) {
	const { results } = await env.DB.prepare(
		`
		SELECT 
			c.Id,
			c.Name,
			c.Description,
			c.SortOrder,
			c.CreatedAt,
			c.UpdatedAt,
			c.DeletedAt,
			COALESCE(
				json_group_array(
					json_object(
						'Id', f.Id,
						'Name', f.Name,
						'Description', f.Description,
						'SortOrder', f.SortOrder,
						'CreatedAt', f.CreatedAt,
						'UpdatedAt', f.UpdatedAt,
						'DeletedAt', f.DeletedAt
					)
				), 
				'[]'
			) AS forums
		FROM 
			Categories c
		LEFT JOIN 
			Forums f
		ON 
			c.Id = f.CategoryId
		WHERE
			c.Id = ?
		GROUP BY 
			c.Id;

		`
	)
	.bind(params["categoryId"])
	.all();
		
	return Response.json(results);
}

async function getTopicsByForumId(request: Request, params: Record<string, string>, env: Env) {
	const { results } = await env.DB.prepare(
		`
		SELECT 
			t.Id,
			COALESCE(
				json_group_array(
					json_object(
						'Id', p.Id
					)
				), 
				'[]'
			) AS posts
		FROM 
			Topics t
		LEFT JOIN 
			Posts p
		ON 
			t.Id = p.TopicId
		WHERE
			t.ForumId = ?
		GROUP BY 
			t.Id
		LIMIT
			1000;
		`
	)
	.bind(params["forumId"])
	.all();
		
	return Response.json(results);
}

function getTopicById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function replyToTopicById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function createTopicByForumId(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function updatePostById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function deletePostById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function createCategory(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function createForum(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function updateCategoryById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

function deleteCategoryById(request: Request, params: Record<string, string>, env: Env) {
	return new Response("Not implemented!", { status: 501 });
}

// Types
interface Category {
	Id: Number,
	Name: String,
	Description: String,
	SortOrder: Number,
	Forums: Forum[],
	CreatedAt: Date,
	UpdatedAt: Date | null,
	DeletedAt: Date | null,
}

interface Forum {
	Id: Number,
	Name: String,
	Description: String,
	SortOrder: Number
	CategoryId: Number,
	Topics: Topic[],
	CreatedAt: Date,
	UpdatedAt: Date | null,
	DeletedAt: Date | null,
}

interface Topic {
	Id: Number,
	Title: String,
	Description: String
	ForumId: Number,
	Posts: Post[],
	CreatedAt: Date,
	UpdatedAt: Date | null,
	DeletedAt: Date | null,
}

interface Post {
	Id: Number,
	Title: String,
	Content: String,
	TopicId: Number,
	UserId: Number,
	CreatedAt: Date,
	UpdatedAt: Date | null,
	DeletedAt: Date | null,
}

interface User {
	Id: Number,
	Username: String,
	PasswordHash: String,
	EmailAddress: String,
	CreatedAt: Date,
	UpdatedAt: Date | null,
	DeletedAt: Date | null,
	DisabledAt: Date | null,
}

// Middleware Functions
function isUserLoggedIn(request: Request): Boolean {
	return true;
}

function isUserAModerator(request: Request): Boolean {
	return true;
}

function isUserAnAdministrator(request: Request): Boolean {
	return true;
}

// Router
type RouteHandler = (request: Request, params?: Record<string, string>, env?: Env) => Response | Promise<Response>;
const routes: Record<string, RouteHandler> = {	
	// Account Actions
	"POST /sign-in": (request, params = {}, env = {}) => signIn(request, params, env),
	"POST /sign-up": (request, params = {}, env = {}) => signUp(request, params, env),
	"POST /forgot-password": (request, params = {}, env = {}) => forgotPassword(request, params, env),
	"POST /verify_credentials": (request, params = {}, env = {}) => verifyCredentials(request, params, env),
	"PATCH /account": (request, params = {}, env = {}) => updateAccount(request, params, env),

	// Public Actions
	"GET /categories": (request, params = {}, env = {}) => getCategories(request, params, env),
	"GET /categories/:categoryId": (request, params = {}, env = {}) => getCategoryById(request, params, env),
	"GET /categories/:categoryId/forums/:forumId": (request, params = {}, env = {}) => getTopicsByForumId(request, params, env),
	"GET /categories/:categoryId/forums/:forumId/topics/:topicId": (request, params = {}, env = {}) => getTopicById(request, params, env),

	// Authenticated Actions
	"POST /categories/:categoryID/forums/:forumID/topics/:topicId": (request, params = {}, env = {}) => replyToTopicById(request, params, env),
	"GET /categories/:categoryID/forums/:forumID/topics": (request, params = {}, env = {}) => createTopicByForumId(request, params, env),
	"PATCH /categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env = {}) => updatePostById(request, params, env),
	"DELETE /categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env = {}) => deletePostById(request, params, env),

	// Admin Actions
	"POST /a/categories": (request, params = {}, env = {}) => createCategory(request, params, env),
	"POST /a/categories/:categoryId": (request, params = {}, env = {}) => createForum(request, params, env),
	"PATCH /a/categories/:categoryId": (request, params = {}, env = {}) => updateCategoryById(request, params, env),
	"DELETE /a/categories/:categoryId": (request, params = {}, env = {}) => deleteCategoryById(request, params, env),

}

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

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return handleRequest(request, env);
	},
} satisfies ExportedHandler<Env>;