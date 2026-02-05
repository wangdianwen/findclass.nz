import { z } from 'zod';

// ==================== 环境类型定义 ====================

export const NodeEnv = {
  Development: 'development',
  Production: 'production',
  Test: 'test',
} as const;

export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];

// ==================== 环境变量验证 ====================

export const envSchema = z.object({
  NODE_ENV: z
    .enum([NodeEnv.Development, NodeEnv.Production, NodeEnv.Test])
    .default(NodeEnv.Development),
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().default('v1'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // AWS 配置
  AWS_REGION: z.string().default('ap-southeast-2'),
  AWS_ACCESS_KEY_ID: z.string().default('local'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).default('local'),

  // DynamoDB 配置
  DYNAMODB_ENDPOINT: z.string().default('http://localhost:4566'),
  DYNAMODB_TABLE_NAME: z.string().default('FindClass-MainTable'),
  DYNAMODB_PORT: z.coerce.number().default(8000),

  // S3 配置
  S3_ENDPOINT: z.string().default('http://localhost:4566'),
  S3_BUCKET_UPLOADS: z.string().default('findclass-uploads'),
  S3_BUCKET_STATIC: z.string().default('findclass-static'),

  // SQS 配置
  SQS_ENDPOINT: z.string().default('http://localhost:4566'),
  SQS_QUEUE_NOTIFICATIONS: z.string().default('findclass-notifications'),
  SQS_QUEUE_ANALYTICS: z.string().default('findclass-analytics'),

  // JWT 配置
  JWT_SECRET: z.string().min(32).default('test-secret-key-for-testing-only-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  JWT_ISSUER: z.string().default('findclass.nz-api'),

  // 认证配置
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(10),
  VERIFICATION_CODE_EXPIRES: z.coerce.number().positive().default(600),
  PASSWORD_RESET_EXPIRES: z.coerce.number().positive().default(3600),

  // Rate Limit 配置
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(100),
  RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED: z.coerce.number().positive().default(1000),
  RATE_LIMIT_EMAIL_WINDOW: z.coerce.number().positive().default(60),
  RATE_LIMIT_EMAIL_MAX: z.coerce.number().positive().default(1),
  RATE_LIMIT_IP_WINDOW: z.coerce.number().positive().default(3600),
  RATE_LIMIT_IP_MAX: z.coerce.number().positive().default(100),
  RATE_LIMIT_LOCKOUT_SECONDS: z.coerce.number().positive().default(900),
  RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().positive().default(5),

  // 日志配置
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  LOG_FILE_PATH: z.string().default('./logs'),

  // CORS 配置
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_METHODS: z.string().default('GET,POST,PUT,DELETE,PATCH,OPTIONS'),
  CORS_CREDENTIALS: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform(val => (typeof val === 'string' ? val === 'true' : val))
    .default(true),

  // 上传配置
  MAX_FILE_SIZE: z.coerce.number().positive().default(5242880),
  UPLOAD_DIR: z.string().default('./uploads'),

  // LocalStack (本地开发)
  LOCALSTACK_ENDPOINT: z.string().url().default('http://localhost:4566'),
  SEED_SAMPLE_DATA: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform(val => (typeof val === 'string' ? val === 'true' : val))
    .default(false),

  // SMTP 配置
  SMTP_HOST: z.string().default('smtp.sendpulse.com'),
  SMTP_PORT: z.coerce.number().positive().default(587),
  SMTP_API_PORT: z.coerce.number().positive().default(8205),
  SMTP_SECURE: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform(val => (typeof val === 'string' ? val === 'true' : val))
    .default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  FROM_EMAIL: z.string().email().default('no-reply@findclass.nz'),
  FROM_NAME: z.string().default('FindClass NZ'),
});

// ==================== 类型导出 ====================

export type RawEnv = z.infer<typeof envSchema>;

// 应用配置类型（按功能分组）
export interface AppConfig {
  env: string;
  port: number;
  apiVersion: string;
  frontendUrl: string;
  auth: AuthConfig;
  aws: AWSConfig;
  dynamodb: DynamoDBConfig;
  smtp: SMTPConfig;
  jwt: JWTConfig;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;
}

export interface AuthConfig {
  bcryptRounds: number;
  verificationCodeExpires: number;
  passwordResetExpires: number;
}

export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface DynamoDBConfig {
  endpoint: string;
  tableName: string;
  port: number;
}

export interface SMTPConfig {
  host: string;
  port: number;
  apiPort: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  algorithm: 'HS256' | 'HS384' | 'HS512';
  issuer: string;
}

export interface CorsConfig {
  origin: string;
  methods: string;
  credentials: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxRequestsAuthenticated: number;
  emailWindowSeconds: number;
  emailMaxRequests: number;
  ipWindowSeconds: number;
  ipMaxRequests: number;
  lockoutSeconds: number;
  maxAttemptsBeforeLockout: number;
}

export interface LoggingConfig {
  level: string;
  format: string;
  filePath: string;
}

// ==================== 验证函数 ====================

export function validateEnv(): RawEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    process.exit(1);
  }
  return result.data;
}
