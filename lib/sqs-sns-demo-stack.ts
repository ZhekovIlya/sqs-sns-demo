import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import {
	Function,
	Runtime,
	Code,
	HttpMethod,
	FunctionUrlAuthType,
  EventSourceMapping,
} from 'aws-cdk-lib/aws-lambda';
import path = require('path');

export class SqsSnsDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /* SQS Queue */
    const queue = new sqs.Queue(this, 'SqsSnsDemoQueue', {
      visibilityTimeout: Duration.seconds(300)
    });
    
    /* SNS TOPIC */
    const topic = new sns.Topic(this, 'SqsSnsDemoTopic');

    /* Lambda function that sends messages */
    const sender = new Function(this, 'SenderFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'sender.handler',
      environment: {
              TOPIC_ARN: topic.topicArn,
      },
    });

    const senderFunctionUrl = sender.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
            cors: {
                    allowedOrigins: ['*'],
                    allowedMethods: [HttpMethod.ALL],
                    allowedHeaders: ['*'],
            },
    });
    
    topic.grantPublish(sender);

    topic.addSubscription(new subs.SqsSubscription(queue));

    const consumer = new Function(this, 'ConsumerFunction', {
			code: Code.fromAsset(path.join(__dirname, '../lambda')),
			runtime: Runtime.NODEJS_16_X,
			handler: 'consumer.handler',
		});

		const consumerEventSourceMapping = new EventSourceMapping(this, 'QueueConsumerFunctionMySQSEvent', {
				target: consumer,
				batchSize: 1,
				eventSourceArn: queue.queueArn,
			}
		);

		queue.grantConsumeMessages(consumer);

    new CfnOutput(this, 'FunctionUrl', {
			value: senderFunctionUrl.url,
		});
  }
}
