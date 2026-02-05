/**
 * Unified Test Setup
 * Vitest configuration that detects test type based on file path
 */

import 'reflect-metadata';

import { config } from 'dotenv';
import { resolve } from 'path';

process.env.NODE_ENV = NodeEnv.Test;

const configDir = resolve(process.cwd(), 'src/config/env');

// Load base configuration first (for all test types)
const baseResult = config({ path: resolve(configDir, '.env.base') });
if (baseResult.error) {
  console.warn(`⚠️  Could not load base config: ${baseResult.error.message}`);
}

import { beforeAll, afterAll, beforeEach } from 'vitest';
import {
  requireTestContainers,
  startTestContainers,
  stopTestContainers,
} from './config/test-containers';
import { createTestTable, clearTableData } from './config/dynamodb-setup';
import { createApp } from '@src/app';
import { NodeEnv } from '@src/config/env-schema';

let _app: ReturnType<typeof createApp>;

export const getApp = () => _app;

beforeAll(async () => {
  const containers = await startTestContainers();
  await createTestTable(containers.dynamodb.docClient);

  _app = createApp();

  await clearTableData(containers.dynamodb.docClient);
}, 180000);

afterAll(async () => {
  await stopTestContainers();
}, 60000);

beforeEach(async () => {
  const containers = await requireTestContainers();
  await clearTableData(containers.dynamodb.docClient);
});
