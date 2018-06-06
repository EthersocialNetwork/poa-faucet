$(function () {
	var loader = $(".loading-container");
	$("#faucetForm").submit(function (e) {
		//$( "#requestTokens" ).click(function( e ) {
		e.preventDefault();
		$this = $(this);
		loader.removeClass("hidden");
		var receiver = $("#receiver").val();
		$.ajax({
			url: "/",
			type: "POST",
			data: $this.serialize()
			/*{,
					  		receiver: receiver
					  	}*/
		}).done(function (data) {
			grecaptcha.reset();
			if (!data.success) {
				loader.addClass("hidden");
				console.log(data);
				console.log(data.error);
				swal("Error", data.error.message, "error");
				return;
			}

			$("#receiver").val('');
			loader.addClass("hidden");
			swal("Success",
				`5 ESN is successfully transfered to <BR/>
				${receiver}
				<BR/>
				txid: <a href="https://test.ethersocial.net/tx/${data.success.txHash}" target="blank">${data.success.txHash}</a>`,
				"success"
			);
		}).fail(function (err) {
			grecaptcha.reset();
			console.log(err);
			loader.addClass("hidden");
		});
	});
});