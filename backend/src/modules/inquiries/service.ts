/**
 * Inquiries Module - Service
 * Business logic for inquiries and reports operations
 */

import { getPool } from '@shared/db/postgres/client';
import { logger } from '@core/logger';
import { AppError, ErrorCode } from '@core/errors';
import { InquiryRepository, ReportRepository } from './inquiry.repository';
import type {
  Inquiry,
  Report,
  CreateInquiryDTO,
  CreateReportDTO,
  InquiryFilters,
  ReportFilters,
  InquiryStatus,
  ReportStatus,
} from './types';

// ==================== Repository Factory ====================

function getInquiryRepository(): InquiryRepository {
  const pool = getPool();
  return new InquiryRepository(pool);
}

function getReportRepository(): ReportRepository {
  const pool = getPool();
  return new ReportRepository(pool);
}

// ==================== Inquiry Operations ====================

/**
 * Create a new inquiry
 */
export async function createInquiry(data: CreateInquiryDTO): Promise<Inquiry> {
  logger.info('Creating inquiry', { targetType: data.targetType, targetId: data.targetId });

  const repository = getInquiryRepository();

  // Validate required fields
  if (!data.message || data.message.trim().length === 0) {
    throw new AppError('Message is required', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'message', message: 'Message is required' },
    ]);
  }

  if (data.message.length > 5000) {
    throw new AppError(
      'Message must be less than 5000 characters',
      ErrorCode.VALIDATION_ERROR,
      400,
      [{ field: 'message', message: 'Message must be less than 5000 characters' }]
    );
  }

  // Validate target type
  const validTargetTypes = ['course', 'teacher', 'general'];
  if (!validTargetTypes.includes(data.targetType)) {
    throw new AppError('Invalid target type', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'targetType', message: 'Target type must be course, teacher, or general' },
    ]);
  }

  // If user is logged in, check for rate limiting
  if (data.userId) {
    const hasPending = await repository.hasPendingInquiryForTarget(
      data.userId,
      data.targetType,
      data.targetId
    );
    if (hasPending) {
      throw new AppError(
        'You already have a pending inquiry for this target. Please wait for a response.',
        ErrorCode.CONFLICT,
        409
      );
    }
  }

  const inquiry = await repository.create(data);

  logger.info('Inquiry created successfully', { inquiryId: inquiry.id });

  return inquiry;
}

/**
 * Get inquiry by ID
 */
export async function getInquiryById(inquiryId: string): Promise<Inquiry | null> {
  logger.info('Getting inquiry by ID', { inquiryId });

  const repository = getInquiryRepository();
  return repository.findById(inquiryId);
}

/**
 * Get inquiries with filters
 */
export async function getInquiries(filters?: InquiryFilters): Promise<{
  inquiries: Inquiry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  logger.info('Getting inquiries', { filters });

  const repository = getInquiryRepository();
  const { inquiries, total } = await repository.findAll(filters);

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const totalPages = Math.ceil(total / limit);

  return {
    inquiries,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Get inquiries by user ID
 */
export async function getUserInquiries(userId: string): Promise<Inquiry[]> {
  logger.info('Getting user inquiries', { userId });

  const repository = getInquiryRepository();
  return repository.findByUserId(userId);
}

/**
 * Reply to an inquiry (admin only)
 */
export async function replyToInquiry(
  inquiryId: string,
  replyContent: string
): Promise<Inquiry | null> {
  logger.info('Replying to inquiry', { inquiryId });

  if (!replyContent || replyContent.trim().length === 0) {
    throw new AppError('Reply content is required', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'replyContent', message: 'Reply content is required' },
    ]);
  }

  const repository = getInquiryRepository();

  const inquiry = await repository.findById(inquiryId);
  if (!inquiry) {
    throw new AppError('Inquiry not found', ErrorCode.NOT_FOUND, 404);
  }

  return repository.updateReply(inquiryId, replyContent.trim());
}

/**
 * Update inquiry status
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus
): Promise<Inquiry | null> {
  logger.info('Updating inquiry status', { inquiryId, status });

  const repository = getInquiryRepository();

  const inquiry = await repository.findById(inquiryId);
  if (!inquiry) {
    throw new AppError('Inquiry not found', ErrorCode.NOT_FOUND, 404);
  }

  return repository.updateStatus(inquiryId, status);
}

// ==================== Report Operations ====================

/**
 * Create a new report
 */
export async function createReport(data: CreateReportDTO): Promise<Report> {
  logger.info('Creating report', { targetType: data.targetType, targetId: data.targetId });

  const repository = getReportRepository();

  // Validate required fields
  if (!data.targetType || !data.targetId || !data.reason || !data.description) {
    throw new AppError(
      'Missing required fields: targetType, targetId, reason, and description are required',
      ErrorCode.VALIDATION_ERROR,
      400,
      [
        { field: 'targetType', message: 'Target type is required' },
        { field: 'targetId', message: 'Target ID is required' },
        { field: 'reason', message: 'Reason is required' },
        { field: 'description', message: 'Description is required' },
      ]
    );
  }

  // Validate reason
  const validReasons = [
    'spam',
    'inappropriate_content',
    'fake_information',
    'harassment',
    'fraud',
    'copyright',
    'other',
  ];
  if (!validReasons.includes(data.reason)) {
    throw new AppError('Invalid reason', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'reason', message: 'Invalid report reason' },
    ]);
  }

  // Validate target type
  const validTargetTypes = ['course', 'teacher', 'review', 'user', 'comment', 'other'];
  if (!validTargetTypes.includes(data.targetType)) {
    throw new AppError('Invalid target type', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'targetType', message: 'Invalid target type' },
    ]);
  }

  // Validate description length
  if (data.description.length < 10) {
    throw new AppError(
      'Description must be at least 10 characters',
      ErrorCode.VALIDATION_ERROR,
      400,
      [{ field: 'description', message: 'Description must be at least 10 characters' }]
    );
  }

  if (data.description.length > 2000) {
    throw new AppError(
      'Description must be less than 2000 characters',
      ErrorCode.VALIDATION_ERROR,
      400,
      [{ field: 'description', message: 'Description must be less than 2000 characters' }]
    );
  }

  // If user is logged in, check for duplicate reports
  if (data.userId) {
    const hasReported = await repository.hasUserReportedTarget(
      data.userId,
      data.targetType,
      data.targetId
    );
    if (hasReported) {
      throw new AppError(
        'You have already reported this content. Our team will review it shortly.',
        ErrorCode.CONFLICT,
        409
      );
    }
  }

  const report = await repository.create(data);

  logger.info('Report created successfully', { reportId: report.id });

  return report;
}

/**
 * Get report by ID
 */
export async function getReportById(reportId: string): Promise<Report | null> {
  logger.info('Getting report by ID', { reportId });

  const repository = getReportRepository();
  return repository.findById(reportId);
}

/**
 * Get reports with filters
 */
export async function getReports(filters?: ReportFilters): Promise<{
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  logger.info('Getting reports', { filters });

  const repository = getReportRepository();
  const { reports, total } = await repository.findAll(filters);

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const totalPages = Math.ceil(total / limit);

  return {
    reports,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Get reports by target ID
 */
export async function getReportsByTargetId(
  targetType: string,
  targetId: string
): Promise<Report[]> {
  logger.info('Getting reports by target', { targetType, targetId });

  const repository = getReportRepository();
  return repository.findByTargetId(targetType, targetId);
}

/**
 * Get reports by user ID
 */
export async function getUserReports(userId: string): Promise<Report[]> {
  logger.info('Getting user reports', { userId });

  const repository = getReportRepository();
  return repository.findByUserId(userId);
}

/**
 * Update report status (admin only)
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string
): Promise<Report | null> {
  logger.info('Updating report status', { reportId, status });

  // Validate status
  const validStatuses = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'status', message: 'Invalid status value' },
    ]);
  }

  const repository = getReportRepository();

  const report = await repository.findById(reportId);
  if (!report) {
    throw new AppError('Report not found', ErrorCode.NOT_FOUND, 404);
  }

  return repository.updateStatus(reportId, status, adminNotes);
}
