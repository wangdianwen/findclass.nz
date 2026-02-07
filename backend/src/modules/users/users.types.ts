/**
 * Users Module - Types
 */

import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['zh', 'en'])
  language?: 'zh' | 'en';

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class AddChildDto {
  @IsString()
  name!: string;

  @IsString()
  dateOfBirth!: string;

  @IsEnum(['MALE', 'FEMALE'])
  gender!: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsEnum([
    'YEAR_1',
    'YEAR_2',
    'YEAR_3',
    'YEAR_4',
    'YEAR_5',
    'YEAR_6',
    'YEAR_7',
    'YEAR_8',
    'YEAR_9',
    'YEAR_10',
    'YEAR_11',
    'YEAR_12',
    'YEAR_13',
  ])
  grade?: string;

  @IsOptional()
  subjects?: string[];

  @IsOptional()
  learningGoals?: string[];
}

export class UpdateChildDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsEnum([
    'YEAR_1',
    'YEAR_2',
    'YEAR_3',
    'YEAR_4',
    'YEAR_5',
    'YEAR_6',
    'YEAR_7',
    'YEAR_8',
    'YEAR_9',
    'YEAR_10',
    'YEAR_11',
    'YEAR_12',
    'YEAR_13',
  ])
  grade?: string;

  @IsOptional()
  subjects?: string[];

  @IsOptional()
  learningGoals?: string[];
}

export class ParentalConsentDto {
  @IsString()
  childId!: string;

  @IsEnum([true])
  consent!: true;

  @IsEnum(['PARENT'])
  relationship!: 'PARENT';
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  newPassword!: string;
}
