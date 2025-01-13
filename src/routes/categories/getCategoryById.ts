async function getCategoryById(request: Request, params: Record<string, string>, env: Env) {
	// Try to query the database for the category
	try {
		const { results } = await env.DB.prepare(
			`
		SELECT
			c.Id,
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
		WHERE
			c.Id = ?
		GROUP BY
			c.Id;

		`
		)
			.bind(params["categoryId"])
			.all();

		// Map over the categories to parse the forum data into the object
		// in place before retrning a response
		const categories = results.map((row: any) => ({
			...row,
			Forums: JSON.parse(row.Forums),
		}));

		// Return a response
		return Response.json({
			Categories: categories,
		});
	} catch (error: any) {
		// An error occured while querying the database, log the error
		// for debugging purposes and return an error!
		console.error(error);
		return new Response("Something went wrong!", { status: 500 });
	}
}

export default getCategoryById;
