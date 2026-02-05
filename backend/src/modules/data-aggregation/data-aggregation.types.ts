/**
 * Data Aggregation Module - Types
 */

export enum DataSource {
  GUMTREE = 'GUMTREE',
  FACEBOOK = 'FACEBOOK',
  OTHER = 'OTHER',
}

export enum FeedbackType {
  OUTDATED = 'OUTDATED',
  INACCURATE = 'INACCURATE',
  INCOMPLETE = 'INCOMPLETE',
  OTHER = 'OTHER',
}

export class SubmitFeedbackDto {
  courseId?: string;
  type!: FeedbackType;
  content!: string;
}

export interface DataQualityResult {
  overallScore: number;
  completeness: number;
  accuracy: number;
  freshness: number;
  trustLevel: string;
}

export interface TrustBadgeResult {
  badgeType: string;
  badgeLevel: string;
  score: number;
  criteria: {
    verificationDate?: string;
    expiresAt?: string;
  };
}
