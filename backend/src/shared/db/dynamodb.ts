/**
 * DynamoDB Single Table Client
 * Uses single table design with PK prefix to distinguish data types
 * All data stored in FindClass-MainTable with PK formats:
 * - USER#<userId>, TEACHER#<teacherId>, COURSE#<courseId>
 * - SYSTEM#CACHE#<type>#<key>, SYSTEM#RATE_LIMIT#<type>#<key>
 */

import {
  DynamoDBClient,
  DescribeTableCommand,
  ListTablesCommand,
  CreateTableCommand,
  UpdateTimeToLiveCommand,
  type KeySchemaElement,
  type AttributeDefinition,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  BatchGetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { logger } from '../../core/logger';

let cachedClient: DynamoDBClient | null = null;
let cachedDocClient: DynamoDBDocumentClient | null = null;
let cachedEndpoint: string = '';

function getClient(): DynamoDBClient {
  const currentEndpoint = process.env.DYNAMODB_ENDPOINT || '';

  if (!cachedClient || cachedEndpoint !== currentEndpoint) {
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

    const credentials =
      accessKeyId && secretAccessKey && accessKeyId !== 'local'
        ? { accessKeyId, secretAccessKey }
        : undefined;

    cachedClient = new DynamoDBClient({
      region,
      endpoint: currentEndpoint || undefined,
      maxAttempts: 3,
      retryMode: 'adaptive',
      credentials,
    });
    cachedEndpoint = currentEndpoint;
    cachedDocClient = null;
  }

  return cachedClient;
}

function getDocumentClient(): DynamoDBDocumentClient {
  const currentEndpoint = process.env.DYNAMODB_ENDPOINT || '';

  if (!cachedDocClient || cachedEndpoint !== currentEndpoint) {
    cachedDocClient = DynamoDBDocumentClient.from(getClient(), {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });
  }

  return cachedDocClient;
}

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'FindClass-MainTable';

export function getTableName(): string {
  return TABLE_NAME;
}

export function resetClient(): void {
  cachedClient = null;
  cachedDocClient = null;
  cachedEndpoint = '';
}

export function getDynamoDBClient(): DynamoDBClient {
  return getClient();
}

export function getDynamoDBDocClient(): DynamoDBDocumentClient {
  return getDocumentClient();
}

export const ENTITY_TYPES = {
  USER: 'USER',
  TEACHER: 'TEACHER',
  COURSE: 'COURSE',
  BOOKING: 'BOOKING',
  REVIEW: 'REVIEW',
  CHILD: 'CHILD',
  NOTIFICATION: 'NOTIFICATION',
  SESSION: 'SESSION',
  DATA: 'DATA',
  AGGREGATED_DATA: 'AGGREGATED_DATA',
  SYSTEM_CACHE: 'SYSTEM_CACHE',
  SYSTEM_RATE_LIMIT: 'SYSTEM_RATE_LIMIT',
} as const;

export const DATA_CATEGORIES = {
  USER: 'USER',
  TEACHER: 'TEACHER',
  COURSE: 'COURSE',
  BOOKING: 'BOOKING',
  REVIEW: 'REVIEW',
  DATA: 'DATA',
  SYSTEM: 'SYSTEM',
  ANALYTICS: 'ANALYTICS',
} as const;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];
export type DataCategory = (typeof DATA_CATEGORIES)[keyof typeof DATA_CATEGORIES];

export interface DynamoDBItem {
  PK: string;
  SK: string;
  entityType: EntityType;
  dataCategory: DataCategory;
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export function createEntityKey(
  entityType: string,
  id: string,
  sortKey?: string
): { PK: string; SK: string } {
  return {
    PK: `${entityType}#${id}`,
    SK: sortKey || 'METADATA',
  };
}

export function createSystemKey(
  systemType: 'CACHE' | 'RATE_LIMIT',
  subType: string,
  key: string
): { PK: string; SK: string } {
  return {
    PK: `SYSTEM#${systemType}#${subType}`,
    SK: key,
  };
}

export function createGSIKey(
  indexName: string,
  pkValue: string,
  skValue?: string
): Record<string, string> {
  return {
    [`${indexName}PK`]: pkValue,
    [`${indexName}SK`]: skValue || pkValue,
  };
}

export async function putItem<T extends Record<string, unknown>>(
  item: T,
  tableName = TABLE_NAME,
  conditionExpression?: string
): Promise<T> {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
    ConditionExpression: conditionExpression,
  });

  await getDocumentClient().send(command);
  logger.debug('PutItem', { tableName, itemKey: item.PK });
  return item;
}

export async function getItem<T>(
  key: Record<string, string>,
  tableName = TABLE_NAME
): Promise<T | null> {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });

  const result = await getDocumentClient().send(command);
  logger.debug('GetItem', { tableName, key, found: !!result.Item });
  return (result.Item as T) || null;
}

export async function updateItem(
  key: Record<string, string>,
  updateExpression: string,
  expressionAttributeValues: Record<string, unknown>,
  tableName = TABLE_NAME,
  expressionAttributeNames?: Record<string, string>
): Promise<Record<string, unknown>> {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: 'ALL_NEW',
  });

  const result = await getDocumentClient().send(command);
  logger.debug('UpdateItem', { tableName, key });
  return result.Attributes as Record<string, unknown>;
}

export async function deleteItem(
  key: Record<string, string>,
  tableName = TABLE_NAME
): Promise<void> {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
  });

  await getDocumentClient().send(command);
  logger.debug('DeleteItem', { tableName, key });
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function queryItems<T>(params: {
  tableName?: string;
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
  filterExpression?: string;
  limit?: number;
  scanIndexForward?: boolean;
  exclusiveStartKey?: Record<string, string>;
  projectionExpression?: string;
}): Promise<{ items: T[]; lastKey?: Record<string, string> }> {
  const tableName = params.tableName || TABLE_NAME;

  const command = new QueryCommand({
    TableName: tableName,
    IndexName: params.indexName,
    KeyConditionExpression: params.keyConditionExpression,
    FilterExpression: params.filterExpression,
    ExpressionAttributeNames: params.expressionAttributeNames,
    ExpressionAttributeValues: params.expressionAttributeValues,
    Limit: params.limit,
    ScanIndexForward: params.scanIndexForward,
    ExclusiveStartKey: params.exclusiveStartKey,
    ProjectionExpression: params.projectionExpression,
  });

  const result = await getDocumentClient().send(command);

  logger.debug('QueryItems', {
    tableName,
    indexName: params.indexName,
    count: result.Count,
  });

  return {
    items: (result.Items as T[]) || [],
    lastKey: result.LastEvaluatedKey as Record<string, string>,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function scanItems<T>(params: {
  tableName?: string;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  limit?: number;
  exclusiveStartKey?: Record<string, string>;
}): Promise<{ items: T[]; lastKey?: Record<string, string> }> {
  const command = new ScanCommand({
    TableName: params.tableName || TABLE_NAME,
    FilterExpression: params.filterExpression,
    ExpressionAttributeNames: params.expressionAttributeNames,
    ExpressionAttributeValues: params.expressionAttributeValues,
    Limit: params.limit,
    ExclusiveStartKey: params.exclusiveStartKey,
  });

  const result = await getDocumentClient().send(command);
  logger.debug('ScanItems', { tableName: params.tableName, count: result.Count });

  return {
    items: (result.Items as T[]) || [],
    lastKey: result.LastEvaluatedKey as Record<string, string>,
  };
}

export async function batchWriteItems(
  items: Record<string, unknown>[],
  tableName = TABLE_NAME
): Promise<void> {
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: chunk.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    });

    await getDocumentClient().send(command);
    logger.debug('BatchWriteItems', { count: chunk.length });
  }
}

export async function batchGetItems<T>(
  keys: Record<string, string>[],
  tableName = TABLE_NAME
): Promise<T[]> {
  if (keys.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < keys.length; i += 100) {
    chunks.push(keys.slice(i, i + 100));
  }

  const allItems: T[] = [];

  for (const chunk of chunks) {
    const command = new BatchGetCommand({
      RequestItems: {
        [tableName]: { Keys: chunk },
      },
    });

    const result = await getDocumentClient().send(command);
    if (result.Responses) {
      allItems.push(...(result.Responses[tableName] as T[]));
    }
    logger.debug('BatchGetItems', { count: chunk.length });
  }

  return allItems;
}

export async function tableExists(tableName = TABLE_NAME): Promise<boolean> {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    await getClient().send(command);
    return true;
  } catch {
    return false;
  }
}

export async function createTableIfNotExists(
  tableName = TABLE_NAME,
  keySchema?: KeySchemaElement[],
  attributeDefinitions?: AttributeDefinition[]
): Promise<void> {
  if (await tableExists(tableName)) {
    logger.info('Table already exists', { tableName });
    return;
  }

  const defaultKeySchema: KeySchemaElement[] = [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' },
  ];

  const defaultAttributeDefinitions: AttributeDefinition[] = [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
  ];

  await getClient().send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: keySchema || defaultKeySchema,
      AttributeDefinitions: attributeDefinitions || defaultAttributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST',
    })
  );

  logger.info('Table created', { tableName });
}

export async function enableTTL(ttlAttributeName: string, tableName = TABLE_NAME): Promise<void> {
  await getClient().send(
    new UpdateTimeToLiveCommand({
      TableName: tableName,
      TimeToLiveSpecification: {
        AttributeName: ttlAttributeName,
        Enabled: true,
      },
    })
  );

  logger.info('TTL enabled', { tableName, ttlAttributeName });
}

export async function listTables(): Promise<string[]> {
  const command = new ListTablesCommand({});
  const result = await getClient().send(command);
  return result.TableNames || [];
}

export interface TransactWriteItem {
  tableName?: string;
  condition?: {
    tableName?: string;
    key: Record<string, string>;
    conditionExpression: string;
  };
  put?: {
    tableName?: string;
    item: Record<string, unknown>;
    conditionExpression?: string;
  };
}

export async function transactWrite(
  items: TransactWriteItem[],
  tableName = TABLE_NAME
): Promise<void> {
  const transactItems = items.map(item => {
    if (item.condition) {
      return {
        ConditionCheck: {
          TableName: item.condition.tableName || tableName,
          Key: item.condition.key,
          ConditionExpression: item.condition.conditionExpression,
        },
      };
    }
    if (item.put) {
      return {
        Put: {
          TableName: item.put.tableName || tableName,
          Item: item.put.item,
          ConditionExpression: item.put.conditionExpression,
        },
      };
    }
    return {};
  });

  const command = new TransactWriteCommand({
    TransactItems: transactItems as any,
  });

  await getDocumentClient().send(command);
  logger.debug('TransactWrite', { itemCount: items.length });
}

export function getCurrentEndpoint(): string {
  return cachedEndpoint;
}

export { getClient as dynamodbClient };
export { getDocumentClient as docClient };
