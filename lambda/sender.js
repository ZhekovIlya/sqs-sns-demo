const AWS = require('aws-sdk');
const sns = new AWS.SNS();

exports.handler = async (event) => {
	const date = new Date();
	const text = `Hello User! Current Time is:  ${date.toString()}`;
	console.log(text);

	const params = {
		Message: text,
		TopicArn: process.env.TOPIC_ARN,
	};

	const result = await sns.publish(params).promise();
	console.log(result);
};