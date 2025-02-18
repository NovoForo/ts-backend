import getQueryParams from "../../middleware/getQueryParams";
import md5 from "../../utils/md5";
import isUserLoggedIn from '../../middleware/isUserLoggedIn';
import getUserIdFromJwt from '../../middleware/getUserIdFromJwt';
import { number } from "zod";

async function getTopicById(request: Request, params: Record<string, string>, env: Env) {
try {
	// Get query parameters (for skip and limit)
	const queryParams = getQueryParams(request.url);
	const skip = queryParams["skip"] || 0;
	const limit = queryParams["limit"] || 10;

	// If the user is logged in begin recording their view of the topic
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
// Query the database to get information about the topic and it's posts
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
			json_group_array(pd.UserId) AS PostDislikeUserIds,
            COUNT(*) OVER() AS TotalCount,
            COUNT(pl.Id) AS LikesCount,
			COUnT(pd.Id) As DislikesCount,
			(SELECT COUNT(*) FROM TopicViews tv WHERE tv.TopicId = t.Id) AS TopicViewsCount
        FROM
            Posts p
        LEFT JOIN
            Topics t ON p.TopicId = t.Id
        LEFT JOIN
            Users u ON p.UserId = u.Id
        LEFT JOIN
            PostLikes pl ON pl.PostId = p.Id
		LEFT JOIN
			PostDislikes pd ON pd.PostId = p.Id
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

	// Get the count of the number of posts for the topic in the database
	const TotalCount = results[0].TotalCount;

	// Map over the posts to create a customized posts array to include in
	// the response
	const posts = await Promise.all(results.map(async (row: any) => {
		const hash = await md5(row.UserEmail);

		let youHaveLiked = false;
		let youHaveDisliked = false;

		if (await isUserLoggedIn(request)) {
			const userId = await getUserIdFromJwt(request);
			const reaction = JSON.parse(row.PostLikeUserIds).includes(userId)
			? "liked"
			: JSON.parse(row.PostDislikeUserIds).includes(userId)
			  ? "disliked"
			  : "none";
		  
			return {
				Id: row.PostId,
				Content: row.PostContent,
				CreatedAt: row.PostCreatedAt * 1000,
				UpdatedAt: row.PostUpdatedAt ? row.PostUpdatedAt * 1000 : null,
				LikeCount: (row.LikesCount - row.DislikesCount),
				Likes: JSON.parse(row.PostLikeUserIds),
				Dislikes: JSON.parse(row.PostDislikeUserIds),
				LikeStatusText: reaction,
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
		} else {
			return {
				Id: row.PostId,
				Content: row.PostContent,
				CreatedAt: row.PostCreatedAt * 1000,
				UpdatedAt: row.PostUpdatedAt ? row.PostUpdatedAt * 1000 : null,
				LikeCount: (row.LikesCount - row.DislikesCount),
				Likes: JSON.parse(row.PostLikeUserIds),
				Dislikes: JSON.parse(row.PostDislikeUserIds),
				LikeStatusText: "none",
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
		}
	}));

	// Return a response
	return Response.json({
		count: TotalCount,
		posts: posts
	});
} catch (error: any) {
	// Something went wrong, log the error for debugging purposes and
	// return a response to the user.
	console.error(error);
	return new Response("Something went wrong", { status: 500 });
}
}

export default getTopicById;
