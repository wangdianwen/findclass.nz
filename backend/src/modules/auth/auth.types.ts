/**
 * Auth Module - Types
 */

import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Matches,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { UserRole } from '@shared/types';

export enum AuthType {
  REGISTER = 'REGISTER',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  LOGIN = 'LOGIN',
}

/**
 * RBAC Types
 */

// Role application status enum
export enum RoleApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Role application entity (DynamoDB)
export interface RoleApplication {
  PK: string;
  SK: string;
  entityType: 'ROLE_APPLICATION';
  dataCategory: 'USER';
  id: string;
  userId: string;
  role: UserRole;
  status: RoleApplicationStatus;
  reason?: string;
  comment?: string;
  processedBy?: string;
  appliedAt: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// User role info returned to client
export interface UserRoleInfo {
  role: UserRole;
  status: RoleApplicationStatus;
  appliedAt: string;
  processedAt?: string;
  comment?: string;
}

// Role application response
export interface RoleApplicationResponse {
  applicationId: string;
  role: UserRole;
  status: RoleApplicationStatus;
  appliedAt: string;
}

// Response for getting user's roles
export interface UserRolesResponse {
  currentRole: UserRole;
  roles: UserRoleInfo[];
  pendingApplication?: RoleApplicationResponse;
}

/**
 * Role Application History
 */
export interface RoleApplicationHistory {
  id: string;
  applicationId: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  performedBy: string;
  performedByName?: string;
  note?: string;
  createdAt: string;
}

export interface RoleApplicationDetailResponse {
  applicationId: string;
  userId: string;
  role: UserRole;
  status: RoleApplicationStatus;
  reason?: string;
  appliedAt: string;
  processedAt?: string;
  processedBy?: string;
  processedByName?: string;
  comment?: string;
  history: RoleApplicationHistory[];
}

export interface RoleApplicationListResponse {
  applications: RoleApplicationDetailResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTOs
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  language?: 'zh' | 'en';
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class SendVerificationCodeDto {
  @IsEmail()
  email!: string;

  @IsEnum(AuthType)
  type!: AuthType;
}

export class VerifyCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string;

  @IsEnum(AuthType)
  type!: AuthType;
}

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString()
  @Matches(/\S+/, { message: 'Refresh token cannot be whitespace only' })
  refreshToken!: string;
}

// Response types
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserResponse;
}

export interface RegisterResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface VerificationCodeResponse {
  expiresIn: number;
}

export interface LogoutResponse {
  message: string;
}

export class PasswordResetRequestDto {
  @IsEmail()
  email!: string;
}

export class PasswordResetDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Verification code must be 6 digits' })
  code!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  profile?: Record<string, unknown>;
}

/**
 * RBAC DTOs
 */

// Apply for a new role
export class ApplyRoleDto {
  @IsEnum(UserRole, {
    message: 'Role must be one of: PARENT, STUDENT, TEACHER, ADMIN',
  })
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters' })
  reason?: string;
}

// Approve or reject a role application
export class ApproveRoleDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  comment?: string;
}

// Get pending applications query params
export class GetPendingApplicationsDto {
  @IsOptional()
  @IsEnum(RoleApplicationStatus)
  status?: RoleApplicationStatus;

  @IsOptional()
  @IsNumber()
  @MinLength(1)
  limit?: number;

  @IsOptional()
  @IsString()
  lastEvaluatedKey?: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  profile?: {
    avatar?: string;
    wechat?: string;
  };
  settings?: {
    language: string;
    notifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Social login DTO
export class SocialLoginDto {
  @IsEnum(['google', 'wechat'])
  provider!: 'google' | 'wechat';

  @IsString()
  @IsNotEmpty({ message: 'Social token is required' })
  socialToken!: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

// Social login response (matches frontend MSW)
export interface SocialLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
