import getQueryParams from "../../middleware/getQueryParams";
import md5 from "../../utils/md5";
import isUserLoggedIn from '../../middleware/isUserLoggedIn';
import getUserIdFromJwt from '../../middleware/getUserIdFromJwt';

async function getTopicById(request: Request, params: Record<string, string>, env: Env) {
    const queryParams = getQueryParams(request.url);
    const skip = queryParams["skip"] || 0;
    const limit = queryParams["limit"] || 10;

		if (await isUserLoggedIn(request)) {
			// Check if the User has viewed this topic before
			const userId = await getUserIdFromJwt(request);
			const _topicId = params.topicId; // Underscore because I think topicId gets declared elsewhere in this function
			const userHasViewedTopicAlready = await env.DB.prepare(
				`SELECT * FROM TopicViews WHERE TopicID = ? AND UserId = ?`)
				.bind(_topicId, userId).first();

			// User has not viewed this topic before, create a TopicView
			if (userHasViewedTopicAlready == null) {
				try {
					await env.DB.prepare(
						`INSERT INTO TopicViews(TopicId, UserId, CreatedAt) VALUES(?, ?, strftime('%s', 'now'))`
					).bind(_topicId, userId).run();
				} catch (error: any) {
					console.error(error);
					return new Response("An exception occurred while saving your view of the topic!", { status: 500 })
				}
			}
		}

    const { results } = await env.DB.prepare(
        `
        SELECT
            p.Id AS PostId,
            p.Content AS PostContent,
            p.CreatedAt AS PostCreatedAt,
            p.UpdatedAt AS PostUpdatedAt,
            t.Id AS TopicId,
            t.Title AS TopicTitle,
            t.CreatedAt AS TopicCreatedAt,
            t.UpdatedAt AS TopicUpdatedAt,
            u.Id AS UserId,
            u.Username AS UserName,
            u.EmailAddress AS UserEmail,
            json_group_array(pl.UserId) AS PostLikeUserIds,
            COUNT(*) OVER() AS TotalCount,
            COUNT(pl.Id) AS LikesCount,
						(SELECT COUNT(*) FROM TopicViews tv WHERE tv.TopicId = t.Id) AS TopicViewsCount
        FROM
            Posts p
        LEFT JOIN
            Topics t ON p.TopicId = t.Id
        LEFT JOIN
            Users u ON p.UserId = u.Id
        LEFT JOIN
            PostLikes pl ON pl.PostId = p.Id
        WHERE
            p.TopicId = ?
          	AND p.IsWithheldForModeratorReview = 0
        		AND t.IsWithheldForModeratorReview = 0
        GROUP BY
            p.Id
        LIMIT ? OFFSET ?
        `
    )
    .bind(params["topicId"], limit, skip)
    .all();

    const TotalCount = results[0].TotalCount;

    const posts = await Promise.all(results.map(async (row: any) => {
        const hash = await md5(row.UserEmail);

        return {
            Id: row.PostId,
            Content: row.PostContent,
            CreatedAt: row.PostCreatedAt * 1000,
            UpdatedAt: row.PostUpdatedAt ? row.PostUpdatedAt * 1000 : null,
            LikeCount: row.LikesCount,
            Likes:JSON.parse(row.PostLikeUserIds),
            Topic: {
                Id: row.TopicId,
                Title: row.TopicTitle,
                CreatedAt: row.TopicCreatedAt * 1000,
                UpdatedAt: row.TopicUpdatedAt ? row.TopicUpdatedAt * 1000 : null,
								Views: row.TopicViewsCount,
            },
            User: {
                Id: row.UserId,
                Username: row.UserName,
                Email: hash,
                IsAdministrator: false,
                IsModerator: false,
            }
        }
    }));

    return Response.json({
        count: TotalCount,
        posts: posts
    });
}

export default getTopicById;
