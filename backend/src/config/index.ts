// 加载环境变量
import { loadEnvFiles } from './env-loader';
import { validateEnv, type RawEnv, type AppConfig } from './env-schema';

loadEnvFiles();

const raw = validateEnv();

// 构建应用配置
const config: AppConfig = {
  env: raw.NODE_ENV,
  port: raw.PORT,
  apiVersion: raw.API_VERSION,
  frontendUrl: raw.FRONTEND_URL,
  auth: {
    bcryptRounds: raw.BCRYPT_ROUNDS,
    verificationCodeExpires: raw.VERIFICATION_CODE_EXPIRES,
    passwordResetExpires: raw.PASSWORD_RESET_EXPIRES,
  },
  aws: {
    region: raw.AWS_REGION,
    accessKeyId: raw.AWS_ACCESS_KEY_ID,
    secretAccessKey: raw.AWS_SECRET_ACCESS_KEY,
  },
  database: {
    url: raw.DATABASE_URL,
  },
  dynamodb: null, // Deprecated: DynamoDB removed, using PostgreSQL only
  smtp: {
    host: raw.SMTP_HOST,
    port: raw.SMTP_PORT,
    apiPort: raw.SMTP_API_PORT,
    secure: raw.SMTP_SECURE,
    user: raw.SMTP_USER,
    pass: raw.SMTP_PASS,
    fromEmail: raw.FROM_EMAIL,
    fromName: raw.FROM_NAME,
  },
  jwt: {
    secret: raw.JWT_SECRET,
    expiresIn: raw.JWT_EXPIRES_IN,
    refreshExpiresIn: raw.JWT_REFRESH_EXPIRES_IN,
    algorithm: raw.JWT_ALGORITHM,
    issuer: raw.JWT_ISSUER,
  },
  cors: {
    origin: raw.CORS_ORIGIN,
    methods: raw.CORS_METHODS,
    credentials: raw.CORS_CREDENTIALS,
  },
  rateLimit: {
    windowMs: raw.RATE_LIMIT_WINDOW_MS,
    maxRequests: raw.RATE_LIMIT_MAX_REQUESTS,
    maxRequestsAuthenticated: raw.RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED,
    emailWindowSeconds: raw.RATE_LIMIT_EMAIL_WINDOW,
    emailMaxRequests: raw.RATE_LIMIT_EMAIL_MAX,
    ipWindowSeconds: raw.RATE_LIMIT_IP_WINDOW,
    ipMaxRequests: raw.RATE_LIMIT_IP_MAX,
    lockoutSeconds: raw.RATE_LIMIT_LOCKOUT_SECONDS,
    maxAttemptsBeforeLockout: raw.RATE_LIMIT_MAX_ATTEMPTS,
  },
  logging: {
    level: raw.LOG_LEVEL,
    format: raw.LOG_FORMAT,
    filePath: raw.LOG_FILE_PATH,
  },
  seedSampleData: raw.SEED_SAMPLE_DATA,
};

// 生产环境安全验证
function validateProductionConfig(cfg: AppConfig): void {
  const issues: string[] = [];

  if (cfg.jwt.secret.length < 64)
    issues.push('JWT_SECRET must be at least 64 characters in production');
  if (cfg.jwt.secret.includes('development') || cfg.jwt.secret.includes('test-secret')) {
    issues.push('JWT_SECRET must be a secure random value');
  }
  if (cfg.aws.accessKeyId === 'local' || !cfg.aws.accessKeyId) {
    issues.push('AWS credentials must be configured');
  }
  if (cfg.cors.origin === '*') {
    issues.push('CORS origin should not be "*" in production');
  }

  if (issues.length > 0) {
    throw new Error(
      `🚫 Production configuration issues:\n${issues.map(i => `  - ${i}`).join('\n')}`
    );
  }
}

// 导出配置
export function getConfig(): AppConfig {
  return config;
}

export function getRawEnv(): Readonly<RawEnv> {
  return Object.freeze(raw);
}

// 导出验证函数（兼容旧 API）
export function validateConfig(): void {
  if (config.env === 'production') {
    validateProductionConfig(config);
  }
}

export { config as default };

// 注意：生产环境验证现在需要手动调用 validateConfig()
// 或者在应用启动时调用
