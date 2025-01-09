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
        email: z.string().email(),
        password: z.string(),
    });

    const contentType = request.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            const json = await request.json();
            const parsedInput = inputSchema.parse(json);
            const { email, password } = parsedInput;

            try {
                const { results } = await env.DB.prepare(
                    `
                    SELECT * FROM Users
                    WHERE EmailAddress = ?
                    `
                )
                .bind(email)
                .all();

                if (results.length === 0) {
                    return new Response("User not found.", { status: 404 });
                }

				const user: any = results[0]; // TODO: Fix use of any type

				const passwordMatch = await compareSync(password, user.PasswordHash);
                if (!passwordMatch) {
                    return new Response("Invalid credentials.", { status: 401 });
                } else {
					const token = await jwt.sign({
						sub: user.Id,
						nbf: Math.floor(Date.now() / 1000), 
						exp: Math.floor(Date.now() / 1000) + (2 * (60 * 60))
					}, JWT_SECRET)
					return Response.json({
						user: {
							name: user.username,
							email: user.email,
							image: ''
						},
						token: token,
						isAdministrator: user.IsAdministrator,
						isModerator: user.IsModerator
					}, { status: 200 });
				}
            } catch (error: any) {
				console.log(error);
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
		username: z.string(),
		email: z.string().email(),
		password: z.string().min(16),
	});

	const contentType = request.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { username, email, password } = parsedInput;
			const passwordHash = hashSync(password, 8);

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
				.bind(username, passwordHash, email, Date.now())
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

async function verifyCredentials(request: Request, params: Record<string, string>, env: Env) {
	if (!await isUserLoggedIn(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const userId = await getUserIdFromJwt(request);

	const user = await env.DB.prepare(
		`
		SELECT * FROM Users
		WHERE Id = ?
		`
	).bind(userId).first();

	if (!user) {
		return new Response("User not found", { status: 404 });
	}

	return Response.json({
		user: {
			Username: user.Username,
			EmailAddress: user.EmailAddress,
			image: ''
		},
		isAdministrator: user.IsAdministrator,
		isModerator: user.IsModerator
	}, { status: 200 });
}

async function updateAccount(request: Request, params: Record<string, string>, env: Env) {
	if (!await isUserLoggedIn(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const userId = await getUserIdFromJwt(request);

	const user = await env.DB.prepare(
		`
		SELECT * FROM Users
		WHERE Id = ?
		`
	).bind(userId).first();

	if (!user) {
		return new Response("User not found", { status: 404 });
	}

	const inputSchema = z.object({
		displayName: z.string(),
		email: z.string().email(),
		password: z.string().min(16),
	});

	const contentType = request.headers.get("content-type");

	if (contentType && contentType.includes("application/json")) {
		try {
			const json = await request.json();
			const parsedInput = inputSchema.parse(json);
			const { displayName, email, password } = parsedInput;
			const passwordHash = hashSync(password, 8);

			const updateResult = await env.DB.prepare(
				`
				UPDATE Users
				SET Username = ?,
				EmailAddress = ?,
				PasswordHash = ?
				WHERE Id = ?
				`
			)
			.bind(displayName, email, passwordHash, userId)
			.run();

			return new Response("Account updated", { status: 200 });
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
    const forumId = params["forumId"];
    
    const { results } = await env.DB.prepare(
        `
        SELECT 
            t.Id AS TopicId,
            t.Title AS TopicTitle,
            t.CreatedAt AS TopicCreatedAt,
            COALESCE(
                json_group_array(
                    json_object(
                        'Id', p.Id,
                        'Content', p.Content,
                        'CreatedAt', p.CreatedAt,
                        'User', json_object(
                            'Id', u.Id,
                            'Username', u.Username,
                            'Email', u.EmailAddress
                        )
                    )
                ), 
                '[]'
            ) AS Posts
        FROM 
            Topics t
        LEFT JOIN 
            Posts p ON t.Id = p.TopicId
        LEFT JOIN
            Users u ON p.UserId = u.Id
        WHERE
            t.ForumId = ?
        GROUP BY 
            t.Id
        LIMIT
            1000;
        `
    )
    .bind(forumId)
    .all();

    const topics = results.map(topic => {
        try {
            const posts = JSON.parse(topic.Posts);
            const firstPostAuthor = posts.length > 0 ? posts[0].User.Username : null;
            
            return {
                Id: topic.TopicId,
                Title: topic.TopicTitle,
                CreatedAt: topic.TopicCreatedAt,
                User: firstPostAuthor ? { Username: firstPostAuthor } : null,
                Posts: posts,
            };
        } catch (error) {
            console.error('Error processing topic:', error, 'Topic:', topic);
            return {};
        }
    });

    return Response.json({
        topics: topics
    });
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
			u.EmailAddress AS UserEmail,
			u.IsAdministrator AS UserIsAdministrator,
			u.IsModerator AS UserIsModerator
		FROM 
			Posts p
		LEFT JOIN 
			Topics t ON p.TopicId = t.Id
		LEFT JOIN
			Users u ON p.UserId = u.Id
		WHERE
			p.TopicId = ?
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
			IsAdministrator: row.UserIsAdministrator,
			IsModerator: row.UserIsModerator,
		},
	}));

	return Response.json({
		posts: posts
	});
}

async function replyToTopicById(request: Request, params: Record<string, string>, env: Env): Promise<Response> {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to reply.", { status: 401 });
    }

    const userIdStr = await getUserIdFromJwt(request);
    if (!userIdStr) {
        return new Response("Invalid token. Unable to identify user.", { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
        return new Response("Invalid user ID in token.", { status: 400 });
    }

    const categoryIdStr = params["categoryID"] || params["categoryId"] || params["categoryid"];
    const forumIdStr = params["forumID"] || params["forumId"] || params["forumid"];
    const topicIdStr = params["topicId"] || params["topicid"];

    if (!categoryIdStr || !forumIdStr || !topicIdStr) {
        return new Response("Missing categoryID, forumID, or topicId in the URL.", { status: 400 });
    }

    const categoryId = parseInt(categoryIdStr, 10);
    const forumId = parseInt(forumIdStr, 10);
    const topicId = parseInt(topicIdStr, 10);

    if (isNaN(categoryId) || isNaN(forumId) || isNaN(topicId)) {
        return new Response("Invalid categoryID, forumID, or topicId.", { status: 400 });
    }

    try {
        const { results: topicResults } = await env.DB.prepare(`
            SELECT t.Id
            FROM Topics t
            WHERE t.Id = ? AND t.ForumId = ?
        `)
            .bind(topicId, forumId)
            .all();

        console.log("Topic Results:", topicResults);

        if (topicResults.length === 0) {
            return new Response("Topic not found in the specified forum.", { status: 404 });
        }
    } catch (error: any) {
        console.error("Database error while verifying topic:", error);
        return new Response("An error occurred while verifying the topic.", { status: 500 });
    }

    try {
        const { results: forumResults } = await env.DB.prepare(`
            SELECT f.Id
            FROM Forums f
            WHERE f.Id = ? AND f.CategoryId = ?
        `)
            .bind(forumId, categoryId)
            .all();

        console.log("Forum Results:", forumResults);

        if (forumResults.length === 0) {
            return new Response("Forum not found in the specified category.", { status: 404 });
        }
    } catch (error: any) {
        console.error("Database error while verifying forum:", error);
        return new Response("An error occurred while verifying the forum.", { status: 500 });
    }

    const inputSchema = z.object({
        content: z.string().min(1, "Content is required."),
    });

    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Invalid content-type! Expected application/json.", { status: 400 });
    }

    let parsedInput;
    try {
        const json = await request.json();
        parsedInput = inputSchema.parse(json);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Invalid JSON payload!", { status: 400 });
    }

    const { content } = parsedInput;

    const title = content.length > 20 ? content.substring(0, 20) + '...' : content;

    try {
        const now = Math.floor(Date.now() / 1000);

        const insertPostResult = await env.DB.prepare(`
            INSERT INTO Posts
                (Title, Content, TopicId, UserId, CreatedAt)
            VALUES
                (?, ?, ?, ?, ?);
        `)
            .bind(title, content, topicId, userId, now)
            .run();

        console.log("Insert Post Result:", insertPostResult);

        const postIdResult = await env.DB.prepare(`
            SELECT Id FROM Posts
            WHERE TopicId = ? AND UserId = ? AND CreatedAt = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
        `)
            .bind(topicId, userId, now)
            .first();

        console.log("Post ID Result:", postIdResult);

        if (!postIdResult || !postIdResult.Id) {
            await env.DB.prepare(`
                DELETE FROM Topics
                WHERE Id = ?;
            `)
                .bind(topicId)
                .run();

            return new Response("Failed to retrieve the newly created post ID. Topic has been rolled back.", { status: 500 });
        }

        const newPostId = postIdResult.Id;
        console.log("New Post ID:", newPostId);

        const { results: newPostResults } = await env.DB.prepare(`
            SELECT 
                p.Id AS PostId,
                p.Content AS PostContent,
                p.TopicId,
                p.UserId,
                p.CreatedAt,
                u.Username AS UserName,
                u.EmailAddress AS UserEmail
            FROM 
                Posts p
            LEFT JOIN 
                Users u ON p.UserId = u.Id
            WHERE 
                p.Id = ?
        `)
            .bind(newPostId)
            .all();

        console.log("New Post Results:", newPostResults);

        if (newPostResults.length === 0) {
            throw new Error("Newly created post not found.");
        }

        const newPost = newPostResults[0];

        return new Response(JSON.stringify({
            success: true,
            post: {
                Id: newPost.PostId,
                Content: newPost.PostContent,
                TopicId: newPost.TopicId,
                User: {
                    Id: newPost.UserId,
                    Username: newPost.UserName,
                    Email: newPost.UserEmail,
                },
                CreatedAt: new Date(newPost.CreatedAt * 1000).toISOString(),
            },
            message: "Reply posted successfully.",
        }), { status: 201, headers: { "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Database error while creating post:", error.message);
        return new Response("An error occurred while creating the reply.", { status: 500 });
    }
}

async function createTopicByForumId(
    request: Request,
    params: Record<string, string>,
    env: Env
): Promise<Response> {
    if (!(await isUserLoggedIn(request))) {
        return new Response("Unauthorized", { status: 401 });
    }

    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        return new Response("Invalid content-type! Expected application/json.", { status: 400 });
    }

    let jsonData: any;
    try {
        jsonData = await request.json();
    } catch (error) {
        return new Response("Invalid JSON payload!", { status: 400 });
    }

    const topicSchema = z.object({
        title: z.string().min(1, "Title is required."),
        description: z.string().optional(),
        content: z.string().min(1, "Content is required."),
    });

    let parsedData;
    try {
        parsedData = topicSchema.parse(jsonData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify(error.errors), { status: 400 });
        }
        return new Response("Failed to validate topic data!", { status: 400 });
    }

    const forumIdStr = params["forumID"] || params["forumId"] || params["forumid"];
    const forumId = parseInt(forumIdStr, 10);
    if (Number.isNaN(forumId)) {
        return new Response("Invalid forum ID!", { status: 400 });
    }

    const userId = await getUserIdFromJwt(request);
    if (!userId) {
        return new Response("Could not determine user ID from token!", { status: 400 });
    }

    try {
        const now = Date.now();

        const insertTopicResult = await env.DB.prepare(
            `
            INSERT INTO Topics
                (Title, Description, ForumId, CreatedAt)
            VALUES 
                (?, ?, ?, ?);
            `
        )
        .bind(parsedData.title, parsedData.description ?? null, forumId, now)
        .run();

        const topicIdResult = await env.DB.prepare(
            `
            SELECT Id FROM Topics
            WHERE Title = ? AND ForumId = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
            `
        )
        .bind(parsedData.title, forumId)
        .first();

        if (!topicIdResult || !topicIdResult.Id) {
            return new Response("Failed to retrieve the newly created topic ID.", { status: 500 });
        }

        const newTopicId = topicIdResult.Id;

        const postTitle = `Reply to: ${parsedData.title}`;

        const insertPostResult = await env.DB.prepare(
            `
            INSERT INTO Posts
                (Title, Content, TopicId, UserId, CreatedAt)
            VALUES 
                (?, ?, ?, ?, ?);
            `
        )
        .bind(postTitle, parsedData.content, newTopicId, userId, now)
        .run();

        const postIdResult = await env.DB.prepare(
            `
            SELECT Id FROM Posts
            WHERE TopicId = ? AND UserId = ? AND CreatedAt = ?
            ORDER BY CreatedAt DESC
            LIMIT 1;
            `
        )
        .bind(newTopicId, userId, now)
        .first();

        if (!postIdResult || !postIdResult.Id) {
            await env.DB.prepare(
                `
                DELETE FROM Topics
                WHERE Id = ?;
                `
            )
            .bind(newTopicId)
            .run();

            return new Response("Failed to retrieve the newly created post ID. Topic has been rolled back.", { status: 500 });
        }

        const newPostId = postIdResult.Id;

        return Response.json({
            success: true,
            Topic: {
                Id: newTopicId,
                Title: parsedData.title,
                Description: parsedData.description ?? "",
                ForumId: forumId,
                CreatedAt: new Date(now).toISOString(),
                UserId: userId,
            },
            Post: {
                Id: newPostId,
                Title: postTitle,
                Content: parsedData.content,
                TopicId: newTopicId,
                UserId: userId,
                CreatedAt: new Date(now).toISOString(),
            },
            message: "Topic and initial post created successfully.",
        }, { status: 201 });
    } catch (error: any) {
        console.error("Database error:", error.message);
        return new Response("An error occurred while creating the topic and post.", {
            status: 500,
        });
    }
}

async function updatePostById(
    request: Request,
    params: Record<string, string>,
    env: Env
): Promise<Response> {
    if (!await isUserLoggedIn(request)) {
        return new Response("Unauthorized. Please log in to update the post.", { status: 401 });
    }

    const userIdStr = await getUserIdFromJwt(request);
    if (!userIdStr) {
        return new Response("Invalid token. Unable to identify user.", { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
        return new Response("Invalid user ID in token.", { status: 400 });
    }

    const postIdStr = params["postId"] || params["postid"] || params["postID"];
    if (!postIdStr) {
        return new Response("Missing postId in the URL.", { status: 400 });
    }

    const postId = parseInt(postIdStr, 10);
    if (isNaN(postId)) {
        return new Response("Invalid postId.", { status: 400 });
    }

    try {
        const { results: postResults } = await env.DB.prepare(`
            SELECT p.Id, p.Content, p.UserId, p.TopicId, p.CreatedAt, p.UpdatedAt
            FROM Posts p
            WHERE p.Id = ?
        `)
            .bind(postId)
            .all();

        console.log("Post Results:", postResults);

        if (postResults.length === 0) {
            return new Response("Post not found.", { status: 404 });
        }

        const post = postResults[0];

        if (post.UserId !== userId) {
            return new Response("Forbidden. You can only update your own posts.", { status: 403 });
        }

        // 5. Validate the input JSON payload
        const inputSchema = z.object({
            content: z.string().min(1, "Content is required."),
        });

        const contentType = request.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return new Response("Invalid content-type! Expected application/json.", { status: 400 });
        }

        let parsedInput;
        try {
            const json = await request.json();
            parsedInput = inputSchema.parse(json);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return new Response(JSON.stringify(error.errors), { status: 400, headers: { "Content-Type": "application/json" } });
            }
            return new Response("Invalid JSON payload!", { status: 400 });
        }

        const { content } = parsedInput;

        const title = content.length > 20 ? content.substring(0, 20) + '...' : content;

        const updatedAt = Math.floor(Date.now() / 1000);

        const updateResult = await env.DB.prepare(`
            UPDATE Posts
            SET Content = ?, Title = ?, UpdatedAt = ?
            WHERE Id = ?;
        `)
            .bind(content, title, updatedAt, postId)
            .run();

        console.log("Update Result:", updateResult);

        const { results: updatedPostResults } = await env.DB.prepare(`
            SELECT 
                p.Id AS PostId,
                p.Content AS PostContent,
                p.TopicId,
                p.UserId,
                p.CreatedAt,
                p.UpdatedAt,
                u.Username AS UserName,
                u.EmailAddress AS UserEmail
            FROM 
                Posts p
            LEFT JOIN 
                Users u ON p.UserId = u.Id
            WHERE 
                p.Id = ?
        `)
            .bind(postId)
            .all();

        console.log("Updated Post Results:", updatedPostResults);

        if (updatedPostResults.length === 0) {
            return new Response("Failed to retrieve the updated post.", { status: 500 });
        }

        const updatedPost = updatedPostResults[0];

        return new Response(JSON.stringify({
            success: true,
            post: {
                Id: updatedPost.PostId,
                Content: updatedPost.PostContent,
                TopicId: updatedPost.TopicId,
                User: {
                    Id: updatedPost.UserId,
                    Username: updatedPost.UserName,
                    Email: updatedPost.UserEmail,
                },
                CreatedAt: new Date(updatedPost.CreatedAt * 1000).toISOString(),
                UpdatedAt: new Date(updatedPost.UpdatedAt * 1000).toISOString(),
            },
            message: "Post updated successfully.",
        }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (error: any) {
        console.error("Database error while updating post:", error);
        return new Response("An error occurred while updating the post.", { status: 500 });
    }
}

async function deletePostById(request: Request, params: Record<string, string>, env: Env) {
	if (await isUserLoggedIn(request)) {
		const userId = await getUserIdFromJwt(request);

		const postCheck = await env.DB.prepare(
			`
			SELECT TopicId
			FROM Posts
			WHERE Id = ? AND UserId = ?
			`
		)
		.bind(params["postId"], userId)
		.first();

		if (!postCheck) {
			return Response.json({ success: false, message: "You are not authorized to delete this post or it doesn't exist." }, { status: 403 });
		}

		const topicId = postCheck.TopicId;

		await env.DB.prepare(
			`
			DELETE FROM Posts
			WHERE Id = ?
			`
		)
		.bind(params["postId"])
		.run();

		const otherPosts = await env.DB.prepare(
			`
			SELECT 1
			FROM Posts
			WHERE TopicId = ?
			LIMIT 1
			`
		)
		.bind(topicId)
		.first();

		if (!otherPosts) {
			await env.DB.prepare(
				`
				DELETE FROM Topics
				WHERE Id = ?
				`
			)
			.bind(topicId)
			.run();
		}

		return Response.json({ success: true, message: "Post (and topic, if applicable) deleted successfully." });
	} else {
		return Response.json({ success: false, message: "User not logged in." }, { status: 401 });
	}
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
	IsModerator: Boolean,
	IsAdministrator: Boolean,
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

async function getUserFromJwt(request: Request, env: Env): Promise<any> {
	const userId = await getUserIdFromJwt(request);
	if (userId && (await isUserLoggedIn(request))) {
		const { results } = await env.DB.prepare(
			`
			SELECT
				u.Id AS UserId,
				u.Username AS UserName,
				u.EmailAddress AS UserEmail,
				u.CreatedAt AS CreatedAt,
				u.UpdatedAt AS UpdatedAt,
				u.DeletedAt AS DeletedAt,
				u.DisabledAt AS DisabledAt,
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
	"POST /s/verify_credentials": (request, params = {}, env = {}) => verifyCredentials(request, params, env),
	"PATCH /s/account": (request, params = {}, env = {}) => updateAccount(request, params, env),

	// Public Actions
	"GET /categories": (request, params = {}, env = {}) => getCategories(request, params, env),
	"GET /categories/:categoryId": (request, params = {}, env = {}) => getCategoryById(request, params, env),
	"GET /categories/:categoryId/forums/:forumId": (request, params = {}, env = {}) => getTopicsByForumId(request, params, env),
	"GET /categories/:categoryId/forums/:forumId/topics/:topicId": (request, params = {}, env = {}) => getTopicById(request, params, env),

	// Authenticated Actions
	"POST /s/categories/:categoryID/forums/:forumID/topics/:topicId": (request, params = {}, env = {}) => replyToTopicById(request, params, env),
	"POST /s/categories/:categoryID/forums/:forumID/topics": (request, params = {}, env = {}) => createTopicByForumId(request, params, env),
	"PATCH /s/categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env = {}) => updatePostById(request, params, env),
	"DELETE /s/categories/:categoryID/forums/:forumID/topics/:topicId/posts/:postId": (request, params = {}, env = {}) => deletePostById(request, params, env),

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