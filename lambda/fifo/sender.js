const AWS = require('aws-sdk');
const sns = new AWS.SNS();

exports.handler = async (event) => {
	const body = event.body
	const group = event.queryStringParameters.group;

	const params = {
		Message: body,
		TopicArn: process.env.TOPIC_ARN,
		MessageGroupId: group
	};

	const result = await sns.publish(params).promise();
	console.log(result);
};