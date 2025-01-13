async function getCategories(request: Request, params: Record<string, string>, env: Env) {
	try {
		// Query the database
		const { results } = await env.DB.prepare(
			`
		SELECT
			c.Id AS Id,
			c.Name,
			c.Description,
			c.SortOrder,
			c.CreatedAt,
			c.UpdatedAt,
			COALESCE(
				json_group_array(
					json_object(
						'Id', f.Id,
						'Name', f.Name,
						'Description', f.Description,
						'SortOrder', f.SortOrder,
						'CreatedAt', f.CreatedAt,
						'UpdatedAt', f.UpdatedAt
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

		// Map over the categories to parse the forum data
		// into the object before it is returned
		const categories = results.map((row: any) => ({
			...row,
			Forums: JSON.parse(row.Forums),
		}));

		// Return a response
		return Response.json({
			Categories: categories,
		});
	} catch (error: any) {
		// An error occured querying the database, log the error output
		// for debugging purposes
		console.error(error);
		return new Response("Something went wrong", { status: 500 });
	}
}

export default getCategories;
