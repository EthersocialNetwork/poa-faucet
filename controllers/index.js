module.exports = function (app) {
	var generateErrorResponse = app.generateErrorResponse;
	var config = app.config;
	var validateCaptcha = app.validateCaptcha;
	const Web3 = require('web3');
	const Tx = require('ethereumjs-tx')
	const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:9545"));
	let cntCheck = 0;

	app.post('/', async function (request, response) {
		var recaptureResponse = request.body["g-recaptcha-response"];
		//console.log("recaptureResponse: ", recaptureResponse)
		if (!recaptureResponse) return generateErrorResponse(response, {
			code: 500,
			title: "Error",
			message: "Invalid captcha"
		});

		var receiver = request.body.receiver;
		var out;
		try {
			out = await validateCaptcha(recaptureResponse);
		} catch (e) {
			return generateErrorResponse(response, e);
		}
		await validateCaptchaResponse(out, receiver, response);
	});

	app.get('/health', function (request, response) {
		var resp = {};
		resp.address = config.Ethereum.live.account;
		var balanceInWei = web3.eth.getBalance(resp.address);
		var balanceInEth = web3.fromWei(balanceInWei, "ether");
		resp.balanceInWei = balanceInWei;
		resp.balanceInEth = Math.round(balanceInEth);
		response.send(resp);
	});

	function validateCaptchaResponse(out, receiver, response) {
		if (!out) return generateErrorResponse(response, {
			code: 500,
			title: "Error",
			message: "Invalid captcha"
		});
		if (!out.success) return generateErrorResponse(response, {
			code: 500,
			title: "Error",
			message: "Invalid captcha"
		});
		sendPOAToRecipient(receiver, response);
	}

	function sendPOAToRecipient(receiver, response) {
		const senderPrivateKey = config.Ethereum[config.environment].privateKey;
		const privateKey = new Buffer(senderPrivateKey, 'hex');
		if (!web3.isAddress(receiver)) return generateErrorResponse(response, {
			code: 500,
			title: "Error",
			message: "invalid address"
		});

		const account = config.Ethereum[config.environment].account;
		const gasPrice = web3.eth.gasPrice;
		const gasPriceHex = web3.toHex(gasPrice);
		const gasLimitHex = web3.toHex(config.Ethereum.gasLimit);
		const nonce = web3.eth.getTransactionCount(account, 'pending');
		const nonceHex = web3.toHex(nonce);
		const ethToSend = web3.toHex(web3.toWei(config.Ethereum.EtherToTransfer, "ether"));
		const chainId = web3.toHex(131102);
		const rawTx = {
			from: account,
			to: receiver,
			value: ethToSend,
			data: '0x',
			gasLimit: gasLimitHex,
			gasPrice: gasPriceHex,
			nonce: nonceHex,
			chainId: chainId
		};
		console.log("rawTx", rawTx);
		const tx = new Tx(rawTx);
		tx.sign(privateKey);
		const serializedTx = tx.serialize();
		web3.eth.sendRawTransaction("0x" + serializedTx.toString('hex'), (err, txHash) => {
			if (err) {
				console.log("sendRawTransaction", err);
				return generateErrorResponse(response, err);
			}
			console.log("txHash: ", txHash);
			// Wait for the transaction to be mined
			waitForTransactionReceipt(txHash, response);

		});
	}

	function waitForTransactionReceipt(txHash, response) {
		cntCheck++;
		console.log('waiting for TX to be mined :', cntCheck, "s.");
		const receipt = web3.eth.getTransactionReceipt(txHash);
		// If no receipt, try again in 1s
		if (receipt == null) {
			if (cntCheck < 50) {
				setTimeout(() => {
					waitForTransactionReceipt(txHash, response);
				}, 1000);
			} else {
				var err = {
					code: 500,
					message: 'waited 50 seconds. but transaction is not mined'
				};
				return generateErrorResponse(response, err);
			}
		} else {
			// The transaction was mined
			if (receipt && receipt.status == '0x1') {
				console.log('receipt: ', receipt);
				return sendRawTransactionResponse(txHash, response);
			} else {
				var err = {
					code: 500,
					message: 'Transaction is mined, but status is false'
				};
				return generateErrorResponse(response, err);
			}
		}
	}

	function sendRawTransactionResponse(txHash, response) {
		var successResponse = {
			code: 200,
			title: "Success",
			message: "Tx is mined",
			txHash: txHash
		};

		response.send({
			success: successResponse
		});
	}
};