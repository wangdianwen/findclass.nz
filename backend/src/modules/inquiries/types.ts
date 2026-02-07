/**
 * Inquiries Module - Types
 * Type definitions for inquiries and reports functionality
 */

// Inquiry types
export type InquiryStatus = 'PENDING' | 'READ' | 'REPLIED' | 'CLOSED';

export interface Inquiry {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  targetType: 'course' | 'teacher' | 'general';
  targetId?: string;
  subject?: string;
  message: string;
  status: InquiryStatus;
  replyContent?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateInquiryDTO {
  userId?: string;
  targetType: 'course' | 'teacher' | 'general';
  targetId?: string;
  subject?: string;
  message: string;
}

// Report types
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export type ReportTargetType = 'course' | 'teacher' | 'review' | 'user' | 'comment' | 'other';

export type ReportReason =
  | 'spam'
  | 'inappropriate_content'
  | 'fake_information'
  | 'harassment'
  | 'fraud'
  | 'copyright'
  | 'other';

export interface Report {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  adminNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateReportDTO {
  userId?: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
}

// Inquiry filters
export interface InquiryFilters {
  status?: InquiryStatus;
  targetType?: 'course' | 'teacher' | 'general';
  targetId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

// Report filters
export interface ReportFilters {
  status?: ReportStatus;
  targetType?: ReportTargetType;
  targetId?: string;
  reason?: ReportReason;
  userId?: string;
  page?: number;
  limit?: number;
}
