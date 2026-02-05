// ==================== 共享的 OpenAPI Schemas ====================
// 用于减少 swagger.ts 中的重复定义

// 基础用户对象
export const userBase = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['PARENT', 'TEACHER', 'ORGANIZATION', 'ADMIN'] },
    phone: { type: 'string' },
    profile: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'uri' },
        wechat: { type: 'string' },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// 用户个人资料响应
export const userProfileResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    phone: { type: 'string' },
    role: { type: 'string' },
    profile: {
      type: 'object',
      properties: {
        avatar: { type: 'string' },
        wechat: { type: 'string' },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// 认证相关 Schema
export const authSchemas = {
  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'name', 'role'],
    properties: {
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      password: {
        type: 'string',
        format: 'password',
        minLength: 12,
        example: 'SecureP@ss123!',
        description: 'Must contain uppercase, lowercase, number, and special character',
      },
      name: { type: 'string', minLength: 1, maxLength: 100, example: 'John Doe' },
      role: {
        type: 'string',
        enum: ['PARENT', 'TEACHER', 'ORGANIZATION', 'ADMIN'],
        example: 'PARENT',
      },
      phone: { type: 'string', example: '+64123456789' },
      language: { type: 'string', enum: ['zh', 'en'], default: 'zh' },
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      password: { type: 'string', format: 'password' },
    },
  },

  AuthResponse: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'JWT access token' },
      refreshToken: { type: 'string', description: 'JWT refresh token' },
      expiresIn: {
        type: 'integer',
        format: 'int32',
        description: 'Token expiration time in seconds',
      },
      user: { type: 'object', properties: userBase.properties },
    },
  },

  RegisterResponse: {
    type: 'object',
    properties: {
      user: { type: 'object', properties: userBase.properties },
      requiresParentalConsent: { type: 'boolean' },
    },
  },

  SendVerificationCodeRequest: {
    type: 'object',
    required: ['email', 'type'],
    properties: {
      email: { type: 'string', format: 'email' },
      type: { type: 'string', enum: ['REGISTER', 'FORGOT_PASSWORD', 'LOGIN'] },
    },
  },

  VerifyCodeRequest: {
    type: 'object',
    required: ['email', 'code', 'type'],
    properties: {
      email: { type: 'string', format: 'email' },
      code: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
      type: { type: 'string', enum: ['REGISTER', 'FORGOT_PASSWORD', 'LOGIN'] },
    },
  },

  VerifyCodeResponse: {
    type: 'object',
    properties: {
      verified: { type: 'boolean', example: true },
    },
  },

  RefreshTokenRequest: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' },
    },
  },

  LogoutResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Logged out successfully' },
    },
  },

  VerificationCodeResponse: {
    type: 'object',
    properties: {
      expiresIn: {
        type: 'integer',
        format: 'int32',
        description: 'Code expiration time in seconds',
      },
    },
  },

  PasswordResetRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },

  PasswordResetDto: {
    type: 'object',
    required: ['email', 'code', 'newPassword'],
    properties: {
      email: { type: 'string', format: 'email' },
      code: { type: 'string', pattern: '^\\d{6}$' },
      newPassword: { type: 'string', format: 'password', minLength: 12 },
    },
  },

  PasswordResetResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
    },
  },

  UpdateProfileRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      phone: { type: 'string' },
      profile: {
        type: 'object',
        properties: {
          avatar: { type: 'string', format: 'uri' },
          wechat: { type: 'string' },
        },
      },
    },
  },
};

// 导出所有 schemas
export const schemas = {
  ...authSchemas,
  UserBase: userBase,
  UserProfileResponse: userProfileResponse,
};
