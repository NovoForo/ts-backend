import getQueryParams from "../middleware/getQueryParams";
import md5 from "../utils/md5";

async function getTopicById(request: Request, params: Record<string, string>, env: Env) {
    const queryParams = getQueryParams(request.url);
    const skip = queryParams["skip"] || 0;
    const limit = queryParams["limit"] || 10;

    const { results } = await env.DB.prepare(
        `
        SELECT 
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
            COUNT(*) OVER() AS TotalCount
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
            Topic: {
                Id: row.TopicId,
                Title: row.TopicTitle,
                CreatedAt: row.TopicCreatedAt * 1000,
                UpdatedAt: row.TopicUpdatedAt ? row.TopicUpdatedAt * 1000 : null,
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