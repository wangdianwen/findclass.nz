/**
 * Courses Module - Types
 */

import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { CourseCategory, CourseSourceType } from '../../shared/types';

export enum TeachingMode {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BOTH = 'BOTH',
}

export enum SortBy {
  RELEVANCE = 'relevance',
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
}

export class SearchCoursesDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsEnum(TeachingMode)
  teachingMode?: TeachingMode;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(['S', 'A', 'B', 'C', 'D'])
  trustLevel?: 'S' | 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @IsEnum(CourseSourceType)
  sourceType?: CourseSourceType;

  @IsOptional()
  @IsEnum(['zh', 'en'])
  language?: 'zh' | 'en';

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class TranslateCourseDto {
  @IsString()
  courseId!: string;

  @IsEnum(['zh', 'en'])
  targetLang!: 'zh' | 'en';
}

export interface CourseSearchResult {
  items: CourseSearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  facets?: {
    categories: Array<{ key: string; count: number }>;
    priceRanges: Array<{ key: string; count: number }>;
    trustLevels: Array<{ key: string; count: number }>;
  };
}

export interface CourseSearchResultItem {
  id: string;
  title: string;
  titleEn?: string;
  price: number;
  priceType: string;
  category: string;
  teachingModes: string[];
  location: string;
  trustLevel: string;
  sourceType: string;
  averageRating?: number;
  totalReviews?: number;
  teacher?: {
    id: string;
    displayName: string;
    verificationStatus: string;
  };
  publishedAt: string;
}
