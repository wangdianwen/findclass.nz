import dotenv from 'dotenv';
import path from 'path';
import { NodeEnv } from './env-schema';

const env = (process.env.NODE_ENV as NodeEnv) || NodeEnv.Development;
const configDir = path.resolve(__dirname, 'env');

// 环境文件加载顺序（后者覆盖前者）
const envFiles = [
  { name: 'base', path: path.join(configDir, '.env.base'), override: false },
  { name: env, path: path.join(configDir, `.env.${env}`), override: true },
];

// 加载环境文件
export function loadEnvFiles(): void {
  for (const file of envFiles) {
    try {
      dotenv.config({ path: file.path, override: file.override });
    } catch (error) {
      // 忽略不存在的文件
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`⚠️ Failed to load ${file.name} env file:`, error);
      }
    }
  }
}
