#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SqsSnsDemoStack } from '../lib/sqs-sns-demo-stack';

const app = new cdk.App();
new SqsSnsDemoStack(app, 'SqsSnsDemoStack');
