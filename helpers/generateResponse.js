module.exports = function (app) {
	app.generateErrorResponse = generateErrorResponse;

	function generateErrorResponse(response, err) {
		var out = {
			error: {
				code: err.code,
				title: err.title,
				message: err.message
			}
		};
		console.log(err);
		if (response) {
			response.send(out);
		}
	}
}