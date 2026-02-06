/**
 * Integration Test Setup
 * Starts Docker containers (DynamoDB + MailHog)
 */

import { resolve } from 'path';

// MUST be the first statement - before ANY imports
process.env.NODE_ENV = 'test';
process.env.NODE_CONFIG_DIR = resolve(process.cwd(), 'src/config/env');

import 'reflect-metadata';
import { config } from 'dotenv';

const configDir = resolve(process.cwd(), 'src/config/env');
config({ path: resolve(configDir, '.env.base') });
config({ path: resolve(configDir, '.env.test') });

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { resetClient as resetMainDynamoDBClients, TABLE_NAME } from '@src/shared/db/dynamodb';
import { getConfig } from '@src/config';
import { beforeAll, afterAll } from 'vitest';
import { createApp } from '@src/app';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

const DYNAMODB_IMAGE = 'amazon/dynamodb-local:2.0.0';
const MAILHOG_IMAGE = 'mailhog/mailhog:latest';

// Global state
let containersStarted = false;
let testContext: {
  dynamodb: {
    container: StartedTestContainer;
    client: DynamoDBClient;
    docClient: DynamoDBDocumentClient;
    tableName: string;
    endpoint: string;
    host: string;
    port: number;
  };
  mailhog: {
    container: StartedTestContainer;
    host: string;
    smtpPort: number;
    apiPort: number;
  };
} | null = null;

let _app: ReturnType<typeof createApp> | null = null;

export const getApp = () => _app;
export const getDynamoDBDocClient = () =>
  containersStarted ? (testContext?.dynamodb.docClient ?? null) : null;

async function startContainers() {
  if (containersStarted) return testContext!;

  const config = getConfig();
  console.log('🚀 Starting test containers...');

  // MailHog
  console.log('📧 Starting MailHog...');
  const mailhog = await new GenericContainer(MAILHOG_IMAGE)
    .withExposedPorts(
      { container: config.smtp.port, host: config.smtp.port },
      { container: config.smtp.apiPort, host: config.smtp.apiPort }
    )
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(60000)
    .start();

  const host = mailhog.getHost();
  console.log(`✅ MailHog: ${host}:${config.smtp.port}`);

  // DynamoDB
  console.log('🗄️  Starting DynamoDB...');
  const dynamodb = await new GenericContainer(DYNAMODB_IMAGE)
    .withExposedPorts({ container: 8000, host: config.dynamodb.port })
    .withCommand(['-jar', 'DynamoDBLocal.jar', '-sharedDb'])
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(20000)
    .start();

  const port = dynamodb.getMappedPort(8000);
  const endpoint = `http://${host}:${port}`;
  console.log(`✅ DynamoDB: ${endpoint}`);

  resetMainDynamoDBClients();

  const client = new DynamoDBClient({
    endpoint,
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
  });

  // Create table
  const { CreateTableCommand, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
  try {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
          },
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      })
    );
    console.log(`✅ Table ${TABLE_NAME} created`);
  } catch (e: any) {
    if (e.name !== 'ResourceInUseException') throw e;
    console.log(`📋 Table ${TABLE_NAME} exists`);
  }
  await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));

  testContext = {
    dynamodb: {
      container: dynamodb,
      client,
      docClient,
      tableName: TABLE_NAME,
      endpoint,
      host,
      port,
    },
    mailhog: { container: mailhog, host, smtpPort: config.smtp.port, apiPort: config.smtp.apiPort },
  };
  containersStarted = true;
  console.log('✅ Containers ready');
  return testContext;
}

async function stopContainers() {
  if (!containersStarted) return;
  console.log('🛑 Stopping containers...');
  try {
    await testContext?.dynamodb.container.stop();
    await testContext?.mailhog.container.stop();
  } catch (e) {
    console.warn('⚠️  Stop error:', e);
  }
  containersStarted = false;
  testContext = null;
}

async function clearTableData(docClient: DynamoDBDocumentClient) {
  let lastKey: Record<string, string> | undefined;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey: lastKey })
    );
    if (Items?.length) {
      const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
      for (const item of Items) {
        if (item.PK && item.SK) {
          await docClient.send(
            new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: item.PK, SK: item.SK } })
          );
        }
      }
    }
    lastKey = LastEvaluatedKey as Record<string, string> | undefined;
  } while (lastKey);
}

// Integration test hooks
beforeAll(async () => {
  await startContainers();
  _app = createApp();
  await clearTableData(testContext!.dynamodb.docClient);
}, 180000);

afterAll(stopContainers);

// Cleanup
const cleanup = async () => {
  await stopContainers();
  process.exit(0);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('beforeExit', stopContainers);
