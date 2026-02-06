/**
 * Integration Test Setup
 * Starts Docker containers ONCE before all tests, stops after all tests
 *
 * This file is loaded via setupFiles in vitest.integration.config.ts
 */

import { resolve } from 'path';

// MUST be the first statement - before ANY imports
process.env.NODE_ENV = 'test';
process.env.NODE_CONFIG_DIR = resolve(process.cwd(), 'src/config/env');

import 'reflect-metadata';
import { config } from 'dotenv';

const configDir = resolve(process.cwd(), 'src/config/env');

// Load base configuration
config({ path: resolve(configDir, '.env.base') });
// Load test-specific configuration
config({ path: resolve(configDir, '.env.test') });

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { resetClient as resetMainDynamoDBClients, TABLE_NAME } from '@src/shared/db/dynamodb';
import { getConfig } from '@src/config';
import { beforeAll, afterAll } from 'vitest';
import { createApp } from '@src/app';
import { DynamoDBDocumentClient as DocClientType, ScanCommand } from '@aws-sdk/lib-dynamodb';

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

// Export for tests
export const getApp = () => _app;
export const getDynamoDBDocClient = () =>
  containersStarted ? (testContext?.dynamodb.docClient ?? null) : null;

async function startTestContainers() {
  if (containersStarted) return testContext!;

  const config = getConfig();

  console.log('🚀 Starting integration test containers...');

  // Start MailHog
  const STARTUP_TIMEOUT = 60000;
  console.log('📧 Starting MailHog...');

  const mailhogContainer = await new GenericContainer(MAILHOG_IMAGE)
    .withExposedPorts(
      { container: config.smtp.port, host: config.smtp.port },
      { container: config.smtp.apiPort, host: config.smtp.apiPort }
    )
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(STARTUP_TIMEOUT)
    .start();

  const mailhogHost = mailhogContainer.getHost();
  console.log(`✅ MailHog started: ${mailhogHost}:${config.smtp.port}`);

  // Start DynamoDB
  console.log('🗄️  Starting DynamoDB Local...');

  const dynamodbContainer = await new GenericContainer(DYNAMODB_IMAGE)
    .withExposedPorts({ container: 8000, host: config.dynamodb.port })
    .withCommand(['-jar', 'DynamoDBLocal.jar', '-sharedDb'])
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(20000)
    .start();

  const dynamodbPort = dynamodbContainer.getMappedPort(8000);
  const dynamodbEndpoint = `http://${mailhogHost}:${dynamodbPort}`;
  console.log(`✅ DynamoDB Local started: ${dynamodbEndpoint}`);

  // Reset and create DynamoDB client
  resetMainDynamoDBClients();

  const dynamoDBClient = new DynamoDBClient({
    endpoint: dynamodbEndpoint,
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  const docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
  });

  // Create the test table
  console.log('📋 Creating DynamoDB table...');

  const { CreateTableCommand, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');

  try {
    await dynamoDBClient.send(
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
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      })
    );
    console.log(`✅ Table ${TABLE_NAME} created`);
  } catch (e: any) {
    if (e.name === 'ResourceInUseException') {
      console.log(`📋 Table ${TABLE_NAME} already exists`);
    } else {
      throw e;
    }
  }

  // Wait for table to be active
  await dynamoDBClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));

  testContext = {
    dynamodb: {
      container: dynamodbContainer,
      client: dynamoDBClient,
      docClient,
      tableName: TABLE_NAME,
      endpoint: dynamodbEndpoint,
      host: mailhogHost,
      port: dynamodbPort,
    },
    mailhog: {
      container: mailhogContainer,
      host: mailhogHost,
      smtpPort: config.smtp.port,
      apiPort: config.smtp.apiPort,
    },
  };

  containersStarted = true;
  console.log('✅ All containers started successfully');

  return testContext;
}

async function stopTestContainers() {
  if (!containersStarted) return;

  console.log('🛑 Stopping test containers...');

  try {
    if (testContext?.dynamodb.container) {
      await testContext.dynamodb.container.stop();
      console.log('   DynamoDB stopped');
    }
    if (testContext?.mailhog.container) {
      await testContext.mailhog.container.stop();
      console.log('   MailHog stopped');
    }
  } catch (e) {
    console.warn('⚠️  Error stopping containers:', e);
  }

  containersStarted = false;
  testContext = null;
  console.log('✅ All containers stopped');
}

async function clearTableData(docClient: DynamoDBDocumentClient) {
  let lastEvaluatedKey: Record<string, string> | undefined;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (Items && Items.length > 0) {
      const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');

      for (const item of Items) {
        if (item.PK && item.SK) {
          await docClient.send(
            new DeleteCommand({
              TableName: TABLE_NAME,
              Key: {
                PK: item.PK,
                SK: item.SK,
              },
            })
          );
        }
      }
    }

    lastEvaluatedKey = LastEvaluatedKey as Record<string, string> | undefined;
  } while (lastEvaluatedKey);
}

// Vitest hooks
beforeAll(async () => {
  await startTestContainers();
  _app = createApp();
  await clearTableData(testContext!.dynamodb.docClient);
}, 180000);

afterAll(async () => {
  await stopTestContainers();
});

// Handle process termination
const cleanup = async () => {
  await stopTestContainers();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('beforeExit', async () => {
  await stopTestContainers();
});
