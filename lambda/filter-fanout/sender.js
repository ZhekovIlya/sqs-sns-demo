const AWS = require('aws-sdk');
const sns = new AWS.SNS();

exports.handler = async (event) => {
	const body = event.body
	const type = event.queryStringParameters.insurance_type;
	
	const params = {
		Message: body,
		TopicArn: process.env.TOPIC_ARN,
		MessageAttributes: {
			insurance_type: {
				DataType: 'String',
				StringValue: type,
			},
		},
	};

	const result = await sns.publish(params).promise();
	console.log(body);
	console.log(type);
	console.log(result);
};