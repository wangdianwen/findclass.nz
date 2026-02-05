/**
 * TestContainers Configuration
 * Manages DynamoDB and MailHog containers for integration tests
 * MailHog captures all SMTP emails for testing
 *
 * Environment variables are loaded from .env.integration file
 * All services use TestContainers for isolation
 */

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { resetClient as resetMainDynamoDBClients, TABLE_NAME } from '@src/shared/db/dynamodb';
import { getConfig } from '@src/config';

export interface TestContainers {
  dynamodb: {
    container: StartedTestContainer;
    client: DynamoDBClient;
    docClient: DynamoDBDocumentClient;
    tableName: string;
    host: string;
    port: number;
  };
  mailhog: {
    container: StartedTestContainer;
    host: string;
    smtpPort: number;
    apiPort: number;
  };
}

const DYNAMODB_IMAGE = 'amazon/dynamodb-local:2.0.0';
const MAILHOG_IMAGE = 'mailhog/mailhog:latest';

let containers: TestContainers | null = null;
let containersPromise: Promise<TestContainers> | null = null;

export async function startTestContainers(): Promise<TestContainers> {
  if (containers) {
    return containers;
  }

  if (containersPromise) {
    return containersPromise;
  }

  containersPromise = (async () => {
    const config = getConfig();

    console.log('🚀 Starting integration test containers...');
    console.log(`   Environment: ${config.env}`);

    console.log('📧 Starting MailHog container...');
    const STARTUP_TIMEOUT = 60000;

    const mailhogContainer = await new GenericContainer(MAILHOG_IMAGE)
      .withExposedPorts(
        {
          container: config.smtp.port,
          host: config.smtp.port,
        },
        {
          container: config.smtp.apiPort,
          host: config.smtp.apiPort,
        }
      )
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(STARTUP_TIMEOUT)
      .start();

    const host = mailhogContainer.getHost();

    console.log(
      `✅ MailHog started on ${host}:${config.smtp.port} (SMTP), ${config.smtp.apiPort} (API)`
    );

    console.log('🗄️  Starting DynamoDB Local container...');

    const dynamodbContainer = await new GenericContainer(DYNAMODB_IMAGE)
      .withExposedPorts({
        container: 8000,
        host: config.dynamodb.port,
      })
      .withCommand(['-jar', 'DynamoDBLocal.jar', '-sharedDb'])
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(20000)
      .start();

    const dynamodbPort = dynamodbContainer.getMappedPort(8000);
    const dynamodbEndpoint = `http://${host}:${dynamodbPort}`;

    console.log(`✅ DynamoDB Local started on ${dynamodbEndpoint}`);
    console.log('📋 Environment variables updated:');
    console.log(`   DYNAMODB_ENDPOINT: ${dynamodbEndpoint}`);
    console.log(`   SMTP_HOST: ${host}:${config.smtp.port}`);
    console.log(`   FROM_EMAIL: ${config.smtp.fromEmail}`);

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

    containers = {
      dynamodb: {
        container: dynamodbContainer,
        client: dynamoDBClient,
        docClient: docClient,
        tableName: TABLE_NAME,
        host,
        port: dynamodbPort,
      },
      mailhog: {
        container: mailhogContainer,
        host,
        smtpPort: config.smtp.port,
        apiPort: config.smtp.apiPort,
      },
    };

    console.log('✅ All test containers started successfully');
    return containers;
  })();

  return containersPromise;
}

export async function stopTestContainers(): Promise<void> {
  if (containers) {
    console.log('🛑 Stopping test containers...');

    try {
      if (containers.dynamodb.container) {
        await containers.dynamodb.container.stop();
        console.log('   DynamoDB stopped');
      }
      if (containers.mailhog.container) {
        await containers.mailhog.container.stop();
        console.log('   MailHog stopped');
      }
    } catch (e) {
      console.warn('⚠️  Error stopping containers:', e);
    }

    containers = null;
    containersPromise = null;
    console.log('✅ All containers stopped');
  }
}

if (typeof process !== 'undefined') {
  const cleanup = async () => {
    await stopTestContainers();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('beforeExit', async () => {
    await stopTestContainers();
  });

  process.on('uncaughtException', async err => {
    console.error('Uncaught exception:', err);
    await stopTestContainers();
    process.exit(1);
  });

  process.on('unhandledRejection', async reason => {
    console.error('Unhandled rejection:', reason);
    await stopTestContainers();
    process.exit(1);
  });
}

export function getTestContainers(): TestContainers | null {
  return containers;
}

export async function requireTestContainers(): Promise<TestContainers> {
  return startTestContainers();
}

export async function getMailHogEmails(
  mailhogHost: string,
  mailhogApiPort: number
): Promise<any[]> {
  try {
    const response = await fetch(`http://${mailhogHost}:${mailhogApiPort}/api/v2/messages`);
    if (!response.ok) {
      throw new Error(`MailHog API error: ${response.status}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch emails from MailHog:', error);
    return [];
  }
}

export async function verifyEmailSent(
  mailhogHost: string,
  mailhogApiPort: number,
  expectedRecipient: string,
  expectedSubject?: string
): Promise<{ found: boolean; email: any }> {
  const emails = await getMailHogEmails(mailhogHost, mailhogApiPort);

  for (const email of emails) {
    const recipients = email.To?.mail || '';
    if (recipients.toLowerCase().includes(expectedRecipient.toLowerCase())) {
      if (!expectedSubject || email.Subject?.includes(expectedSubject)) {
        return { found: true, email };
      }
    }
  }

  return { found: false, email: null };
}

export async function clearMailHogEmails(
  mailhogHost: string,
  mailhogApiPort: number
): Promise<void> {
  try {
    const response = await fetch(`http://${mailhogHost}:${mailhogApiPort}/api/v1/messages`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to clear emails: ${response.status}`);
    }
  } catch (error) {
    console.warn('⚠️  Failed to clear MailHog emails:', error);
  }
}

export function getSMTPConnectionString(mailhogHost: string, smtpPort: number): string {
  return `smtp://${mailhogHost}:${smtpPort}`;
}

export function getMailHogAPIUrl(mailhogHost: string, apiPort: number): string {
  return `http://${mailhogHost}:${apiPort}`;
}
