import getQueryParams from "../../middleware/getQueryParams";

async function getTopicsByForumId(request: Request, params: Record<string, string>, env: Env) {
	  // Get the forum ID
		const forumId = params["forumId"];

		// Get the query parameters
    const queryParams = getQueryParams(request.url);
    // Parse skip and limit as integers with default values
    const skip = parseInt(queryParams["skip"], 10) || 0;
    const limit = parseInt(queryParams["limit"], 10) || 10;

		// Attempt to query the database for information about the topics
		// belonging to the specified forum ID
    try {
        const { results } = await env.DB.prepare(
            `
            SELECT
                t.Id AS TopicId,
                t.Title AS TopicTitle,
                t.CreatedAt AS TopicCreatedAt,
                p.CreatedAt AS PostCreatedAt,
                MAX(p.CreatedAt) AS LatestPostDate,
                COUNT(t.Id) OVER() AS TotalCount,
								(SELECT COUNT(*) FROM TopicViews tv WHERE tv.TopicId = t.Id) AS TopicViewsCount,
                COALESCE(
                    json_group_array(
                        json_object(
                            'Id', p.Id,
                            'Content', p.Content,
                            'CreatedAt', p.CreatedAt,
                            'User', json_object(
                                'Id', u.Id,
                                'Username', u.Username
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
								AND p.IsWithheldForModeratorReview = 0
								AND t.IsWithheldForModeratorReview = 0
            GROUP BY
                t.Id
            ORDER BY
                LatestPostDate DESC NULLS LAST
            LIMIT ? OFFSET ?
            `
        )
        .bind(forumId, limit, skip)
        .all();

        // If no results, return empty topics and count as 0
        if (!results || results.length === 0) {
            return Response.json({
                count: 0,
                topics: []
            });
        }
				// Map over the results to parse the posts JSON from the database
				// into the object in place
        const topics = results.map(topic => {
            try {
                const posts = JSON.parse(topic.Posts as string);
                const firstPostAuthor = posts.length > 0 ? posts[0].User.Username : null;

                posts.map((post: any) => {
                    post.CreatedAt = post.CreatedAt * 1000;
                });

                return {
                    Id: topic.TopicId,
                    Title: topic.TopicTitle,
                    CreatedAt: topic.TopicCreatedAt as number * 1000,
                    User: firstPostAuthor ? { Username: firstPostAuthor } : null,
                    Posts: posts,
										Views: topic.TopicViewsCount,
                };
            } catch (error) {
                console.error('Error processing topic:', error, 'Topic:', topic);
                return {};
            }
        });

        const TotalCount = results[0].TotalCount || 0;

				// Return a response to the user
        return Response.json({
            count: TotalCount,
            topics: topics
        });

    } catch (error) {
        console.error('Database query failed:', error);
        return Response.json({
            count: 0,
            topics: [],
            error: 'Failed to retrieve topics.'
        }, { status: 500 });
    }
}

export default getTopicsByForumId;
