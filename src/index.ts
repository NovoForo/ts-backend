import { z } from "zod";
import jwt from "@tsndr/cloudflare-worker-jwt"
import {
	genSaltSync,
	hashSync,
	compareSync,
	getRounds,
	getSaltSync,
  } from 'bcrypt-edge';
const JWT_SECRET = "changemechangemechangeme";

// Functions
async function signIn(request: Request, params: Record<string, string>, env: Env) {
    const inputSchema = z.object({
        EmailAddress: z.string().email(),
        Password: z.string(),
    });

    const contentType = request.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            const json = await request.json();
            const parsedInput = inputSchema.parse(json);
            const { EmailAddress, Password } = parsedInput;

            try {
                // Query the database for the user
                const { results } = await env.DB.prepare(
                    `
                    SELECT * FROM Users
                    WHERE EmailAddress = ?
                    `
                )
                .bind(EmailAddress)
                .all();

                if (results.length === 0) {
                    return new Response("User not found.", { status: 404 });
                }

				const user: any = results[0]; // TODO: Fix use of any type

				const passwordMatch = await compareSync(Password, user.PasswordHash);
                if (!passwordMatch) {
                    return new Response("Invalid credentials.", { status: 401 });
                } else {
					const token = await jwt.sign({
						sub: user.Id,
						nbf: Math.floor(Date.now() / 1000), 
						exp: Math.floor(Date.now() / 1000) + (2 * (60 * 60))
					}, JWT_SECRET)
					return new Response(token, { status: 200 });
				}
            } catch (error: any) {
                console.error("Database error:", error.message);
                return new Response("An error occurred while querying the database.", { status: 500 });
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                return new Response(JSON.stringify(error.errors), { status: 400 });
            }
            return new Response("Invalid JSON payload!", { status: 400 });
        }
    } else {
        return new Response("Invalid content-type!", { status: 400 });
    }
}

async function signUp(request: Request, params: Record<string, string>, env: Env) {
	const inputSchema = z.object({
		Username: z.string(),
		EmailAddress: z.string().email(),
		Password: z.string().min(16),
	});

	const contentType = request.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { Username, EmailAddress, Password } = parsedInput;
			const passwordHash = hashSync(Password, 8);

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
			) AS Forums
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

    const categories = results.map((row: any) => ({
        ...row,
        Forums: JSON.parse(row.Forums),
    }));

	return Response.json({
		Categories: categories,
	});
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
			) AS Forums
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

    const categories = results.map((row: any) => ({
        ...row,
        Forums: JSON.parse(row.Forums),
    }));
		
	return Response.json({
		Categories: categories,
	});
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

async function getTopicById(request: Request, params: Record<string, string>, env: Env) {
	const { results } = await env.DB.prepare(
		`
		SELECT 
			p.Id AS PostId,
			p.Title AS PostTitle,
			p.Content AS PostContent,
			t.Id AS TopicId,
			t.Title AS TopicTitle,
			t.Description AS TopicDescription,
			u.Id AS UserId,
			u.Username AS UserName,
			u.EmailAddress AS UserEmail
		FROM 
			Posts p
		LEFT JOIN 
			Topics t ON p.TopicId = t.Id
		LEFT JOIN
			Users u ON p.UserId = u.Id
		WHERE
			p.Id = ?
		GROUP BY 
			p.Id
		`
	)
	.bind(params["topicId"])
	.all();

	const posts = results.map((row: any) => ({
		Id: row.PostId,
		Title: row.PostTitle,
		Content: row.PostContent,
		Topic: {
			Id: row.TopicId,
			Title: row.TopicTitle,
			Description: row.TopicDescription,
		},
		User: {
			Id: row.UserId,
			Username: row.UserName,
			Email: row.UserEmail,
			IsAdministrator: false,
			IsModerator: false,
		},
	}));

	return Response.json({
		posts: posts
	});
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

function isUserAModerator(request: Request): Boolean {
	return true;
}

function isUserAnAdministrator(request: Request): Boolean {
	return true;
}

async function getUserIdFromJwt(request: Request): Promise<String | null> {
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