import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  Code,
  Function,
  FunctionUrlAuthType,
  HttpMethod,
  Runtime
} from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import path = require('path');

export class SnsFifoDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /* SQS Queues */
    const mainQueue = new sqs.Queue(this, 'MainQueue', {
      visibilityTimeout: Duration.seconds(45)
    });

    const replayQueue = new sqs.Queue(this, 'ReplayQueue', {
      visibilityTimeout: Duration.seconds(45)
    });

    const replayFifoQueue = new sqs.Queue(this, 'ReplayFifoQueue', {
      visibilityTimeout: Duration.seconds(45),
      fifo: true,
      contentBasedDeduplication: true
    });

    /* SNS TOPIC */
    const topic = new sns.Topic(this, 'SnsFifoDemoTopic', {
      fifo: true,
      messageRetentionPeriodInDays: 1,
      contentBasedDeduplication: true
    });

    /* Lambda function that sends messages */
    const sender = new Function(this, 'SenderFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/fifo')),
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

    /* Lambda to consume events */
    const consumer = new Function(this, 'Consumer', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/fifo')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'consumer.handler',
    });

    consumer.addEventSource(new eventsources.SqsEventSource(mainQueue));

    topic.addSubscription(new subs.SqsSubscription(mainQueue));

    /* Filter Policy that will pass only non-sale price update */
    const replayQueueSubPolicy = new subs.SqsSubscription(replayQueue, {
      filterPolicyWithMessageBody: {
        priceUpdateType: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
          denylist: ['sale'],
        }))
      }
    });

    const replayFifoQueueSubPolicy = new subs.SqsSubscription(replayFifoQueue, {
      filterPolicyWithMessageBody: {
        priceUpdateType: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
          denylist: ['sale'],
        }))
      }
    });

    /* skip adding queue to a topic - comment on first run  */
    // topic.addSubscription(replayQueueSubPolicy);
    // topic.addSubscription(replayFifoQueueSubPolicy);

    /* Replayed Messages Event Consumer Lambda */
    const replayConsumer = new Function(this, 'StandardConsumerFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/fifo')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'standardReplayConsumer.handler',
    });

    replayConsumer.addEventSource(new eventsources.SqsEventSource(replayQueue));
    replayQueue.grantConsumeMessages(replayConsumer);

    const replayFifoConsumer = new Function(this, 'FifoConsumerFunction', {
      code: Code.fromAsset(path.join(__dirname, '../lambda/fifo')),
      runtime: Runtime.NODEJS_16_X,
      handler: 'fifoReplayConsumer.handler',
    });

    replayFifoConsumer.addEventSource(new eventsources.SqsEventSource(replayFifoQueue));
    replayFifoQueue.grantConsumeMessages(replayFifoConsumer);

    new CfnOutput(this, 'SenderFunctionUrl', {
      value: senderFunctionUrl.url,
    });

    new CfnOutput(this, 'ReplayQueueUrl', {
      value: replayQueue.queueUrl
    });

    new CfnOutput(this, 'FifoReplayQueueUrl', {
      value: replayFifoQueue.queueUrl
    });
  }
}
