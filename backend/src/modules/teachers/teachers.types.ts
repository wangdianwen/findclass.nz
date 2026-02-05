/**
 * Teachers Module - Types
 */

import { IsString, IsEnum, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TeachingMode {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BOTH = 'BOTH',
}

export class QualificationDto {
  @IsEnum(['DEGREE', 'CERTIFICATE', 'EXPERIENCE'])
  type!: 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE';

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  year?: number;
}

export class TeacherOnboardingDto {
  @IsString()
  displayName!: string;

  @IsString()
  bio!: string;

  @IsArray()
  @IsString({ each: true })
  teachingSubjects!: string[];

  @IsArray()
  @IsEnum(TeachingMode, { each: true })
  teachingModes!: TeachingMode[];

  @IsArray()
  @IsString({ each: true })
  locations!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualificationDto)
  qualifications?: QualificationDto[];
}

export interface TeacherProfile {
  id: string;
  displayName: string;
  bio: string;
  teachingSubjects: string[];
  teachingModes: string[];
  locations: string[];
  trustLevel: string;
  verificationStatus: string;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  courses: Array<{
    id: string;
    title: string;
    price: number;
    category: string;
  }>;
  joinedAt: string;
}
