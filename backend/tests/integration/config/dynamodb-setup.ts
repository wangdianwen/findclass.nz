/**
 * DynamoDB Setup for Tests
 * Creates the required table structure for single table design testing
 */

import {
  CreateTableCommand,
  DescribeTableCommand,
  ScanCommand,
  BatchWriteItemCommand,
  UpdateTimeToLiveCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAME } from '@src/shared/db/dynamodb';

export async function createTestTable(docClient: DynamoDBDocumentClient): Promise<void> {
  try {
    await docClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table ${TABLE_NAME} already exists, checking status...`);
    await waitForTableActive(docClient, TABLE_NAME);
    console.log(`Table ${TABLE_NAME} is ready`);
    return;
  } catch (error: any) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
    console.log(`Table ${TABLE_NAME} does not exist, creating...`);
  }

  try {
    await docClient.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'email', AttributeType: 'S' },
          { AttributeName: 'GSI2PK', AttributeType: 'S' },
          { AttributeName: 'GSI2SK', AttributeType: 'S' },
          { AttributeName: 'GSI3PK', AttributeType: 'S' },
          { AttributeName: 'GSI3SK', AttributeType: 'S' },
          { AttributeName: 'GSI4PK', AttributeType: 'S' },
          { AttributeName: 'GSI4SK', AttributeType: 'S' },
          { AttributeName: 'GSI5PK', AttributeType: 'S' },
          { AttributeName: 'GSI5SK', AttributeType: 'S' },
          { AttributeName: 'GSI6PK', AttributeType: 'S' },
          { AttributeName: 'GSI6SK', AttributeType: 'S' },
          { AttributeName: 'GSI7PK', AttributeType: 'S' },
          { AttributeName: 'GSI7SK', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1-EmailIndex',
            KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI2-CourseSearch',
            KeySchema: [
              { AttributeName: 'GSI2PK', KeyType: 'HASH' },
              { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI3-TrustIndex',
            KeySchema: [
              { AttributeName: 'GSI3PK', KeyType: 'HASH' },
              { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI4-TeacherCourses',
            KeySchema: [
              { AttributeName: 'GSI4PK', KeyType: 'HASH' },
              { AttributeName: 'GSI4SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI5-UserBookings',
            KeySchema: [
              { AttributeName: 'GSI5PK', KeyType: 'HASH' },
              { AttributeName: 'GSI5SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI6-TeacherBookings',
            KeySchema: [
              { AttributeName: 'GSI6PK', KeyType: 'HASH' },
              { AttributeName: 'GSI6SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI6-CourseReviews',
            KeySchema: [
              { AttributeName: 'GSI7PK', KeyType: 'HASH' },
              { AttributeName: 'GSI7SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI7-CacheLookup',
            KeySchema: [
              { AttributeName: 'GSI7PK', KeyType: 'HASH' },
              { AttributeName: 'GSI7SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'KEYS_ONLY' },
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      })
    );

    console.log(`Table ${TABLE_NAME} created, waiting for active...`);
    await waitForTableActive(docClient, TABLE_NAME);

    await docClient.send(
      new UpdateTimeToLiveCommand({
        TableName: TABLE_NAME,
        TimeToLiveSpecification: {
          AttributeName: 'expiresAt',
          Enabled: true,
        },
      })
    );
    console.log(`TTL enabled on ${TABLE_NAME}`);

    console.log(`Table ${TABLE_NAME} is ready`);
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log(`Table ${TABLE_NAME} already exists (concurrent creation)`);
      await waitForTableActive(docClient, TABLE_NAME);
    } else {
      throw error;
    }
  }
}

export async function clearTableData(docClient: DynamoDBDocumentClient): Promise<void> {
  console.log(`Clearing table data for ${TABLE_NAME}...`);

  try {
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
          Limit: 25,
        })
      );

      const items = scanResult.Items || [];

      if (items.length > 0) {
        const deleteRequests = items.map((item: Record<string, any>) => ({
          DeleteRequest: {
            Key: {
              PK: item.PK,
              SK: item.SK,
            },
          },
        }));

        await docClient.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [TABLE_NAME]: deleteRequests,
            },
          })
        );
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, any> | undefined;
    } while (lastEvaluatedKey);

    console.log(`Table data cleared for ${TABLE_NAME}`);
  } catch (error: any) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
    console.log(`Table ${TABLE_NAME} does not exist, skipping clear`);
  }
}

async function waitForTableActive(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  maxAttempts = 60
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await docClient.send(new DescribeTableCommand({ TableName: tableName }));
      const status = result.Table?.TableStatus;
      const gsiStatuses = result.Table?.GlobalSecondaryIndexes?.map(gsi => gsi.IndexStatus) || [];

      console.log(`Table status: ${status}, GSI statuses: ${gsiStatuses.join(', ')}`);

      if (status === 'ACTIVE' && gsiStatuses.every(s => s === 'ACTIVE')) {
        console.log(`Table ${tableName} and all GSIs are active`);
        return;
      }
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.warn(`Table ${tableName} did not become active in time`);
}
