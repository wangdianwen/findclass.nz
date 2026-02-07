import dotenv from 'dotenv';
import path from 'path';
import { NodeEnv } from './env-schema';

const env = (process.env.NODE_ENV ?? NodeEnv.Development) as NodeEnv;
const configDir = path.resolve(__dirname, 'env');

// 环境文件加载顺序（后者覆盖前者）
// Priority: .env.base -> .env.{env} -> .env.local (for non-production)
// Note: .env.staging and .env.test should NOT be loaded automatically
const envFiles = [
  { name: 'base', path: path.join(configDir, '.env.base'), override: false },
  { name: env, path: path.join(configDir, `.env.${env}`), override: true },
];

// Load local overrides only for non-production environments
if (env !== 'production') {
  envFiles.push({ name: 'local', path: path.join(configDir, '.env.local'), override: true });
}

// Load test environment only if NODE_ENV=test
if (env === NodeEnv.Test) {
  envFiles.push({ name: 'test', path: path.join(configDir, '.env.test'), override: true });
}

// 加载环境文件
export function loadEnvFiles(): void {
  for (const file of envFiles) {
    try {
      dotenv.config({ path: file.path, override: file.override });
    } catch (error) {
      // 忽略不存在的文件
      if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.warn(`⚠️ Failed to load ${file.name} env file:`, error);
      }
    }
  }
}

// 保持向后兼容的导出
export const loadEnv = loadEnvFiles;
