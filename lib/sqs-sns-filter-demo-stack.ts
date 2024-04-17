import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
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

export class SqsSnsFilterDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /* SQS Queues */
    const allQueue = new sqs.Queue(this, 'All', {
      visibilityTimeout: Duration.seconds(45)
    });
    const vehicleQueue = new sqs.Queue(this, 'Vehicle', {
      visibilityTimeout: Duration.seconds(45)
    });
    const healthQueue = new sqs.Queue(this, 'Health', {
      visibilityTimeout: Duration.seconds(45)
    });
    const newVolvoQueue = new sqs.Queue(this, 'NewVolvo', {
      visibilityTimeout: Duration.seconds(45)
    });

    /* SNS TOPIC */
    const topic = new sns.Topic(this, 'SqsSnsFilterDemoTopic');

    /* Lambda function that sends messages */
    const sender = new Function(this, 'SenderFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/filter-fanout')),
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

    topic.addSubscription(new subs.SqsSubscription(allQueue));

    /* Filter Policy Based on message attribute 
       Accept only vehicle type insurances */
    topic.addSubscription(new subs.SqsSubscription(vehicleQueue, {
      filterPolicy: {
        insurance_type: sns.SubscriptionFilter.stringFilter({
          allowlist: ['car', 'boat']
        }),
      },
    }));

    /* Filter Policy Based on message attribute 
       Accept only health type attributes */
    topic.addSubscription(new subs.SqsSubscription(healthQueue, {
      filterPolicy: {
        insurance_type: sns.SubscriptionFilter.stringFilter({
          allowlist: ['health']
        }),
      },
    }));

    /* Filter policy based on message payload
       Accept only Volvo cars at max 4 years old or from 2008 to 2010 */
    topic.addSubscription(new subs.SqsSubscription(newVolvoQueue, {
      filterPolicyWithMessageBody: {
        car: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
          allowlist: ['volvo'],
        })),
        year: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.numericFilter({
          between: { start: 2008, stop: 2010 },
          greaterThanOrEqualTo: 2020
        }))
      }
    }));

    /* All Event Consumer Lambda */
    const allConsumer = new Function(this, 'AllConsumerFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/filter-fanout')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'consumer.handler',
    });

    allConsumer.addEventSource(new eventsources.SqsEventSource(allQueue));
    allQueue.grantConsumeMessages(allConsumer);

    /* Vehicle Event Consumer Lambda */
    const vehicleConsumer = new Function(this, 'VehicleConsumerFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/filter-fanout')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'vehicleConsumer.handler',
    });

    vehicleConsumer.addEventSource(new eventsources.SqsEventSource(vehicleQueue));
    vehicleQueue.grantConsumeMessages(vehicleConsumer);

    /* Health Event Consumer Lambda */
    const healthConsumer = new Function(this, 'HealthConsumerFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/filter-fanout')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'healthConsumer.handler',
    });
    healthConsumer.addEventSource(new eventsources.SqsEventSource(healthQueue));
    healthQueue.grantConsumeMessages(healthConsumer);


    /* Volvo Event consumer Lambda */
    const newVolvoConsumer = new Function(this, 'NewVolvoConsumerFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/filter-fanout')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'newVolvoConsumer.handler',
    });
    newVolvoConsumer.addEventSource(new eventsources.SqsEventSource(newVolvoQueue));
    newVolvoQueue.grantConsumeMessages(newVolvoConsumer);

    new CfnOutput(this, 'FunctionUrl', {
      value: senderFunctionUrl.url,
    });
  }
}
