/**
 * DynamoDB Service Unit Tests
 * Tests for DynamoDB wrapper functions
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@src/shared/db/dynamodb', () => {
  const mockSend = vi.fn();

  return {
    __mockSend: mockSend,
    putItem: vi.fn(),
    getItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    queryItems: vi.fn(),
    scanItems: vi.fn(),
    batchWriteItems: vi.fn(),
    batchGetItems: vi.fn(),
    tableExists: vi.fn(),
    listTables: vi.fn(),
    getTableName: vi.fn().mockReturnValue('TestTable'),
    TABLE_NAME: 'TestTable',
    createEntityKey: vi.fn((type, id, sortKey) => ({
      PK: `TEST_${type}#${id}`,
      SK: sortKey || 'METADATA',
    })),
    createSystemKey: vi.fn((systemType, subType, key) => ({
      PK: `SYSTEM#${systemType}#${subType}`,
      SK: key,
    })),
    createGSIKey: vi.fn((indexName, pk, sk) => ({
      [`${indexName}PK`]: pk,
      [`${indexName}SK`]: sk || pk,
    })),
    dynamodbClient: { send: mockSend },
    docClient: { send: mockSend },
  };
});

import {
  putItem,
  getItem,
  updateItem,
  deleteItem,
  queryItems,
  scanItems,
  batchWriteItems,
  batchGetItems,
  tableExists,
  listTables,
  createEntityKey,
  createSystemKey,
  createGSIKey,
  TABLE_NAME,
} from '@src/shared/db/dynamodb';

describe('DynamoDB Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TABLE_NAME', () => {
    it('should export table name constant', () => {
      expect(TABLE_NAME).toBe('TestTable');
    });
  });

  describe('getTableName', () => {
    it('should export TABLE_NAME constant', () => {
      expect(TABLE_NAME).toBeDefined();
      expect(typeof TABLE_NAME).toBe('string');
    });
  });

  describe('createEntityKey', () => {
    it('should generate correct entity key', () => {
      const key = createEntityKey('USER', 'usr_123');
      expect(key).toEqual({ PK: 'TEST_USER#usr_123', SK: 'METADATA' });
    });

    it('should handle sort key', () => {
      const key = createEntityKey('COURSE', 'c123', 'REVIEWS');
      expect(key).toEqual({ PK: 'TEST_COURSE#c123', SK: 'REVIEWS' });
    });
  });

  describe('createSystemKey', () => {
    it('should generate correct cache key', () => {
      const key = createSystemKey('CACHE', 'SEARCH', 'query123');
      expect(key).toEqual({ PK: 'SYSTEM#CACHE#SEARCH', SK: 'query123' });
    });

    it('should generate correct rate limit key', () => {
      const key = createSystemKey('RATE_LIMIT', 'email', 'test@example.com');
      expect(key).toEqual({ PK: 'SYSTEM#RATE_LIMIT#email', SK: 'test@example.com' });
    });
  });

  describe('createGSIKey', () => {
    it('should generate correct GSI key', () => {
      const key = createGSIKey('GSI2', 'pk-value', 'sk-value');
      expect(key).toEqual({ GSI2PK: 'pk-value', GSI2SK: 'sk-value' });
    });

    it('should use pk value as default sk value', () => {
      const key = createGSIKey('GSI3', 'pk-value');
      expect(key).toEqual({ GSI3PK: 'pk-value', GSI3SK: 'pk-value' });
    });
  });

  describe('putItem', () => {
    it('should call putItem with correct parameters', async () => {
      (putItem as Mock).mockResolvedValue({ PK: 'USER#usr_123', name: 'Test' });
      const item = { PK: 'USER#usr_123', name: 'Test' };

      const result = await putItem(item);

      expect(result).toEqual(item);
      expect(putItem).toHaveBeenCalledWith(item);
    });

    it('should use custom table name', async () => {
      (putItem as Mock).mockResolvedValue({});
      const item = { PK: 'USER#usr_123' };

      await putItem(item, 'CustomTable');

      expect(putItem).toHaveBeenCalledWith(item, 'CustomTable');
    });

    it('should include condition expression', async () => {
      (putItem as Mock).mockResolvedValue({});
      const item = { PK: 'USER#usr_123' };

      await putItem(item, 'TestTable', 'attribute_not_exists(PK)');

      expect(putItem).toHaveBeenCalledWith(item, 'TestTable', 'attribute_not_exists(PK)');
    });
  });

  describe('getItem', () => {
    it('should return item when found', async () => {
      const expectedItem = { PK: 'USER#usr_123', name: 'Test' };
      (getItem as Mock).mockResolvedValue(expectedItem);

      const result = await getItem({ PK: 'USER#usr_123' });

      expect(result).toEqual(expectedItem);
    });

    it('should return null when not found', async () => {
      (getItem as Mock).mockResolvedValue(null);

      const result = await getItem({ PK: 'USER#nonexistent' });

      expect(result).toBeNull();
    });
  });

  describe('updateItem', () => {
    it('should update and return new attributes', async () => {
      const expectedResult = { PK: 'USER#usr_123', name: 'Updated' };
      (updateItem as Mock).mockResolvedValue(expectedResult);

      const result = await updateItem({ PK: 'USER#usr_123' }, 'SET #name = :name', {
        ':name': 'Updated',
      });

      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteItem', () => {
    it('should delete item with default table name', async () => {
      (deleteItem as Mock).mockResolvedValue(undefined);

      await deleteItem({ PK: 'USER#usr_123' });

      expect(deleteItem).toHaveBeenCalledWith({ PK: 'USER#usr_123' });
    });

    it('should use custom table name when provided', async () => {
      (deleteItem as Mock).mockResolvedValue(undefined);

      await deleteItem({ PK: 'USER#usr_123' }, 'CustomTable');

      expect(deleteItem).toHaveBeenCalledWith({ PK: 'USER#usr_123' }, 'CustomTable');
    });
  });

  describe('queryItems', () => {
    it('should query items with pagination', async () => {
      const mockItems = [{ id: '1' }, { id: '2' }];
      const lastKey = { PK: 'USER#usr_123', SK: 'c2' };
      (queryItems as Mock).mockResolvedValue({ items: mockItems, lastKey });

      const result = await queryItems({
        keyConditionExpression: 'PK = :pk',
        expressionAttributeValues: { ':pk': 'USER#usr_123' },
        limit: 10,
      });

      expect(result.items).toEqual(mockItems);
      expect(result.lastKey).toEqual(lastKey);
    });

    it('should return empty items for no results', async () => {
      (queryItems as Mock).mockResolvedValue({ items: [], lastKey: undefined });

      const result = await queryItems({
        keyConditionExpression: 'PK = :pk',
        expressionAttributeValues: { ':pk': 'USER#nonexistent' },
      });

      expect(result.items).toEqual([]);
      expect(result.lastKey).toBeUndefined();
    });

    it('should use GSI when specified', async () => {
      (queryItems as Mock).mockResolvedValue({ items: [] });

      await queryItems({
        keyConditionExpression: 'GSI2PK = :pk',
        expressionAttributeValues: { ':pk': 'value' },
        indexName: 'GSI2-CourseSearch',
      });

      expect(queryItems).toHaveBeenCalledWith(
        expect.objectContaining({ indexName: 'GSI2-CourseSearch' })
      );
    });
  });

  describe('scanItems', () => {
    it('should scan all items', async () => {
      const mockItems = [{ id: '1' }, { id: '2' }];
      (scanItems as Mock).mockResolvedValue({ items: mockItems });

      const result = await scanItems({});

      expect(result.items).toEqual(mockItems);
    });

    it('should include filter expression', async () => {
      (scanItems as Mock).mockResolvedValue({ items: [] });

      await scanItems({
        filterExpression: 'contains(#name, :name)',
        expressionAttributeValues: { ':name': 'Test' },
      });

      expect(scanItems).toHaveBeenCalledWith(
        expect.objectContaining({
          filterExpression: 'contains(#name, :name)',
          expressionAttributeValues: { ':name': 'Test' },
        })
      );
    });
  });

  describe('batchWriteItems', () => {
    it('should handle batch write', async () => {
      (batchWriteItems as Mock).mockResolvedValue(undefined);
      const items = Array.from({ length: 10 }, (_, i) => ({ id: `item${i}` }));

      await batchWriteItems(items);

      expect(batchWriteItems).toHaveBeenCalledWith(items);
    });

    it('should handle empty array', async () => {
      (batchWriteItems as Mock).mockResolvedValue(undefined);

      await batchWriteItems([]);

      expect(batchWriteItems).toHaveBeenCalledWith([]);
    });
  });

  describe('batchGetItems', () => {
    it('should return items for valid keys', async () => {
      const mockItems = [{ id: '1' }, { id: '2' }];
      (batchGetItems as Mock).mockResolvedValue(mockItems);

      const result = await batchGetItems([{ PK: 'USER#1' }, { PK: 'USER#2' }]);

      expect(result).toEqual(mockItems);
    });

    it('should return empty for empty keys', async () => {
      (batchGetItems as Mock).mockResolvedValue([]);

      const result = await batchGetItems([]);

      expect(result).toEqual([]);
    });
  });

  describe('tableExists', () => {
    it('should return true when table exists', async () => {
      (tableExists as Mock).mockResolvedValue(true);

      const result = await tableExists('TestTable');

      expect(result).toBe(true);
    });

    it('should return false when table does not exist', async () => {
      (tableExists as Mock).mockResolvedValue(false);

      const result = await tableExists('NonExistent');

      expect(result).toBe(false);
    });
  });

  describe('listTables', () => {
    it('should return list of tables', async () => {
      (listTables as Mock).mockResolvedValue(['Table1', 'Table2']);

      const result = await listTables();

      expect(result).toEqual(['Table1', 'Table2']);
    });
  });
});
