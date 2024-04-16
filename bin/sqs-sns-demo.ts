#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SqsSnsDemoStack } from '../lib/sqs-sns-demo-stack';
import { SqsSnsFilterDemoStack } from '../lib/sqs-sns-filter-demo-stack';
import { SnsFifoDemoStack } from '../lib/sns-fifo-demo-stack';

const app = new cdk.App();
new SqsSnsDemoStack(app, 'SqsSnsDemoStack');
new SqsSnsFilterDemoStack(app, 'SqsSnsFilterDemoStack');
new SnsFifoDemoStack(app, 'SnsFifoDemoStack');
