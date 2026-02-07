/**
 * Inquiries Service Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock PostgreSQL pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('@shared/db/postgres/client', () => ({
  getPool: vi.fn(() => mockPool),
}));

// Mock logger
vi.mock('@core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock repositories
const mockInquiryRepository = {
  findById: vi.fn(),
  findAll: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  updateReply: vi.fn(),
  updateStatus: vi.fn(),
  hasPendingInquiryForTarget: vi.fn(),
};

const mockReportRepository = {
  findById: vi.fn(),
  findAll: vi.fn(),
  findByTargetId: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  hasUserReportedTarget: vi.fn(),
};

// Mock repository constructors
vi.mock('@modules/inquiries/inquiry.repository', () => ({
  InquiryRepository: class {
    findById = mockInquiryRepository.findById;
    findAll = mockInquiryRepository.findAll;
    findByUserId = mockInquiryRepository.findByUserId;
    create = mockInquiryRepository.create;
    updateReply = mockInquiryRepository.updateReply;
    updateStatus = mockInquiryRepository.updateStatus;
    hasPendingInquiryForTarget = mockInquiryRepository.hasPendingInquiryForTarget;
  },
  ReportRepository: class {
    findById = mockReportRepository.findById;
    findAll = mockReportRepository.findAll;
    findByTargetId = mockReportRepository.findByTargetId;
    findByUserId = mockReportRepository.findByUserId;
    create = mockReportRepository.create;
    updateStatus = mockReportRepository.updateStatus;
    hasUserReportedTarget = mockReportRepository.hasUserReportedTarget;
  },
}));

// Import after mocks are set up
import {
  createInquiry,
  getInquiryById,
  getInquiries,
  getUserInquiries,
  replyToInquiry,
  updateInquiryStatus,
  createReport,
  getReportById,
  getReports,
  getReportsByTargetId,
  getUserReports,
  updateReportStatus,
} from '@modules/inquiries/service';
import { AppError } from '@core/errors';

// Use string literals for enum values to avoid import issues
type InquiryStatus = 'PENDING' | 'READ' | 'REPLIED' | 'CLOSED';
type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
type ReportTargetType = 'course' | 'teacher' | 'review' | 'user' | 'comment' | 'other';
type ReportReason = 'spam' | 'inappropriate_content' | 'fake_information' | 'harassment' | 'fraud' | 'copyright' | 'other';

const InquiryStatus = {
  PENDING: 'PENDING' as const,
  READ: 'READ' as const,
  REPLIED: 'REPLIED' as const,
  CLOSED: 'CLOSED' as const,
};

const ReportStatus = {
  PENDING: 'PENDING' as const,
  REVIEWING: 'REVIEWING' as const,
  RESOLVED: 'RESOLVED' as const,
  DISMISSED: 'DISMISSED' as const,
};

const ReportTargetType = {
  COURSE: 'course' as const,
  TEACHER: 'teacher' as const,
  REVIEW: 'review' as const,
  USER: 'user' as const,
  COMMENT: 'comment' as const,
  OTHER: 'other' as const,
};

const ReportReason = {
  SPAM: 'spam' as const,
  INAPPROPRIATE_CONTENT: 'inappropriate_content' as const,
  FAKE_INFORMATION: 'fake_information' as const,
  HARASSMENT: 'harassment' as const,
  FRAUD: 'fraud' as const,
  COPYRIGHT: 'copyright' as const,
  OTHER: 'other' as const,
};

describe('Inquiries Service (PostgreSQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Mock Data ====================

  function createMockInquiry(overrides: any = {}) {
    return {
      id: 'inq_test123',
      userId: 'usr_test123',
      userName: 'Test User',
      userEmail: 'test@example.com',
      userPhone: '+64-21-123-4567',
      targetType: 'course',
      targetId: 'crs_test123',
      subject: 'Question about course',
      message: 'Is this course suitable for beginners?',
      status: InquiryStatus.PENDING,
      replyContent: undefined,
      repliedAt: undefined,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  function createMockReport(overrides: any = {}) {
    return {
      id: 'rpt_test123',
      userId: 'usr_test123',
      userName: 'Test User',
      userEmail: 'test@example.com',
      targetType: ReportTargetType.COURSE,
      targetId: 'crs_test123',
      reason: ReportReason.SPAM,
      description: 'This is spam content',
      status: ReportStatus.PENDING,
      adminNotes: undefined,
      resolvedAt: undefined,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  // ==================== createInquiry ====================

  describe('createInquiry', () => {
    it('should create inquiry successfully', async () => {
      const mockInquiry = createMockInquiry();
      mockInquiryRepository.hasPendingInquiryForTarget.mockResolvedValue(false);
      mockInquiryRepository.create.mockResolvedValue(mockInquiry);

      const result = await createInquiry({
        userId: 'usr_test123',
        targetType: 'course',
        targetId: 'crs_test123',
        subject: 'Question about course',
        message: 'Is this course suitable for beginners?',
      });

      expect(result).toBeDefined();
      expect(result.message).toBe('Is this course suitable for beginners?');
      expect(result.status).toBe(InquiryStatus.PENDING);
      expect(mockInquiryRepository.hasPendingInquiryForTarget).toHaveBeenCalledWith(
        'usr_test123',
        'course',
        'crs_test123'
      );
      expect(mockInquiryRepository.create).toHaveBeenCalled();
    });

    it('should throw error when message is empty', async () => {
      await expect(
        createInquiry({
          targetType: 'course',
          message: '   ',
        })
      ).rejects.toThrow('Message is required');
    });

    it('should throw error when message is missing', async () => {
      await expect(
        createInquiry({
          targetType: 'course',
          message: '',
        })
      ).rejects.toThrow('Message is required');
    });

    it('should throw error when message exceeds 5000 characters', async () => {
      const longMessage = 'a'.repeat(5001);

      await expect(
        createInquiry({
          targetType: 'course',
          message: longMessage,
        })
      ).rejects.toThrow('Message must be less than 5000 characters');
    });

    it('should accept message with exactly 5000 characters', async () => {
      const validMessage = 'a'.repeat(5000);
      mockInquiryRepository.hasPendingInquiryForTarget.mockResolvedValue(false);
      mockInquiryRepository.create.mockResolvedValue(createMockInquiry({ message: validMessage }));

      await expect(
        createInquiry({
          targetType: 'course',
          message: validMessage,
        })
      ).resolves.toBeDefined();
    });

    it('should throw error for invalid target type', async () => {
      await expect(
        createInquiry({
          targetType: 'invalid' as any,
          message: 'Test message',
        })
      ).rejects.toThrow('Invalid target type');
    });

    it('should throw error when user has pending inquiry for target', async () => {
      mockInquiryRepository.hasPendingInquiryForTarget.mockResolvedValue(true);

      await expect(
        createInquiry({
          userId: 'usr_test123',
          targetType: 'course',
          targetId: 'crs_test123',
          message: 'Test message',
        })
      ).rejects.toThrow('You already have a pending inquiry for this target');
    });

    it('should not check pending inquiry for anonymous user', async () => {
      mockInquiryRepository.hasPendingInquiryForTarget.mockResolvedValue(false);
      mockInquiryRepository.create.mockResolvedValue(createMockInquiry());

      await createInquiry({
        targetType: 'general',
        message: 'Anonymous inquiry',
      });

      expect(mockInquiryRepository.hasPendingInquiryForTarget).not.toHaveBeenCalled();
    });

    it('should accept valid target types', async () => {
      const validTypes = ['course', 'teacher', 'general'];

      for (const type of validTypes) {
        mockInquiryRepository.hasPendingInquiryForTarget.mockResolvedValue(false);
        mockInquiryRepository.create.mockResolvedValue(createMockInquiry({ targetType: type }));

        await expect(
          createInquiry({
            targetType: type as any,
            message: 'Test message',
          })
        ).resolves.toBeDefined();
      }
    });

    it('should create inquiry without userId', async () => {
      mockInquiryRepository.hasPendingInquiryForTarget.mockResolvedValue(false);
      mockInquiryRepository.create.mockResolvedValue(createMockInquiry({ userId: undefined }));

      const result = await createInquiry({
        targetType: 'general',
        message: 'Anonymous question',
      });

      expect(result.userId).toBeUndefined();
    });

    it('should create inquiry without targetId for general type', async () => {
      mockInquiryRepository.hasPendingInquiryForTarget.mockResolvedValue(false);
      mockInquiryRepository.create.mockResolvedValue(createMockInquiry({ targetId: undefined }));

      const result = await createInquiry({
        targetType: 'general',
        message: 'General question',
      });

      expect(result.targetId).toBeUndefined();
    });
  });

  // ==================== getInquiryById ====================

  describe('getInquiryById', () => {
    it('should return inquiry when found', async () => {
      const mockInquiry = createMockInquiry();
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);

      const result = await getInquiryById('inq_test123');

      expect(result).toEqual(mockInquiry);
      expect(mockInquiryRepository.findById).toHaveBeenCalledWith('inq_test123');
    });

    it('should return null when inquiry not found', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      const result = await getInquiryById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==================== getInquiries ====================

  describe('getInquiries', () => {
    it('should return inquiries with pagination', async () => {
      const mockInquiries = [
        createMockInquiry({ id: 'inq_1' }),
        createMockInquiry({ id: 'inq_2' }),
      ];

      mockInquiryRepository.findAll.mockResolvedValue({
        inquiries: mockInquiries,
        total: 2,
      });

      const result = await getInquiries({ page: 1, limit: 10 });

      expect(result.inquiries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      const mockInquiries = Array.from({ length: 10 }, (_, i) =>
        createMockInquiry({ id: `inq_${i}` })
      );

      mockInquiryRepository.findAll.mockResolvedValue({
        inquiries: mockInquiries,
        total: 25,
      });

      const result = await getInquiries({ page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });

    it('should use default pagination when not provided', async () => {
      mockInquiryRepository.findAll.mockResolvedValue({
        inquiries: [],
        total: 0,
      });

      const result = await getInquiries();

      expect(mockInquiryRepository.findAll).toHaveBeenCalledWith(undefined);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should pass filters to repository', async () => {
      mockInquiryRepository.findAll.mockResolvedValue({
        inquiries: [],
        total: 0,
      });

      await getInquiries({
        status: InquiryStatus.PENDING,
        targetType: 'course',
        userId: 'usr_test123',
      });

      expect(mockInquiryRepository.findAll).toHaveBeenCalledWith({
        status: InquiryStatus.PENDING,
        targetType: 'course',
        userId: 'usr_test123',
      });
    });

    it('should return empty array when no inquiries', async () => {
      mockInquiryRepository.findAll.mockResolvedValue({
        inquiries: [],
        total: 0,
      });

      const result = await getInquiries();

      expect(result.inquiries).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ==================== getUserInquiries ====================

  describe('getUserInquiries', () => {
    it('should return user inquiries', async () => {
      const mockInquiries = [
        createMockInquiry({ id: 'inq_1' }),
        createMockInquiry({ id: 'inq_2' }),
      ];

      mockInquiryRepository.findByUserId.mockResolvedValue(mockInquiries);

      const result = await getUserInquiries('usr_test123');

      expect(result).toHaveLength(2);
      expect(mockInquiryRepository.findByUserId).toHaveBeenCalledWith('usr_test123');
    });

    it('should return empty array when user has no inquiries', async () => {
      mockInquiryRepository.findByUserId.mockResolvedValue([]);

      const result = await getUserInquiries('usr_no_inquiries');

      expect(result).toEqual([]);
    });
  });

  // ==================== replyToInquiry ====================

  describe('replyToInquiry', () => {
    it('should reply to inquiry successfully', async () => {
      const mockInquiry = createMockInquiry();
      const repliedInquiry = createMockInquiry({
        status: InquiryStatus.REPLIED,
        replyContent: 'Thank you for your inquiry. Here is the answer.',
        repliedAt: new Date('2024-01-02T11:00:00Z'),
      });

      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.updateReply.mockResolvedValue(repliedInquiry);

      const result = await replyToInquiry('inq_test123', 'Thank you for your inquiry. Here is the answer.');

      expect(result).toBeDefined();
      expect(result?.status).toBe(InquiryStatus.REPLIED);
      expect(result?.replyContent).toBe('Thank you for your inquiry. Here is the answer.');
      expect(mockInquiryRepository.findById).toHaveBeenCalledWith('inq_test123');
      expect(mockInquiryRepository.updateReply).toHaveBeenCalledWith(
        'inq_test123',
        'Thank you for your inquiry. Here is the answer.'
      );
    });

    it('should throw error when reply content is empty', async () => {
      await expect(replyToInquiry('inq_test123', '   ')).rejects.toThrow('Reply content is required');
    });

    it('should throw error when inquiry not found', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      await expect(replyToInquiry('nonexistent', 'Reply content')).rejects.toThrow('Inquiry not found');
    });

    it('should trim reply content', async () => {
      const mockInquiry = createMockInquiry();
      const repliedInquiry = createMockInquiry({
        replyContent: 'Trimmed reply',
      });

      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.updateReply.mockResolvedValue(repliedInquiry);

      await replyToInquiry('inq_test123', '  Trimmed reply  ');

      expect(mockInquiryRepository.updateReply).toHaveBeenCalledWith('inq_test123', 'Trimmed reply');
    });

    it('should return null when update fails', async () => {
      const mockInquiry = createMockInquiry();
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.updateReply.mockResolvedValue(null);

      const result = await replyToInquiry('inq_test123', 'Reply content');

      expect(result).toBeNull();
    });
  });

  // ==================== updateInquiryStatus ====================

  describe('updateInquiryStatus', () => {
    it('should update inquiry status successfully', async () => {
      const mockInquiry = createMockInquiry();
      const updatedInquiry = createMockInquiry({
        status: InquiryStatus.READ,
      });

      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.updateStatus.mockResolvedValue(updatedInquiry);

      const result = await updateInquiryStatus('inq_test123', InquiryStatus.READ);

      expect(result).toBeDefined();
      expect(result?.status).toBe(InquiryStatus.READ);
      expect(mockInquiryRepository.findById).toHaveBeenCalledWith('inq_test123');
      expect(mockInquiryRepository.updateStatus).toHaveBeenCalledWith('inq_test123', InquiryStatus.READ);
    });

    it('should throw error when inquiry not found', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      await expect(updateInquiryStatus('nonexistent', InquiryStatus.READ)).rejects.toThrow(
        'Inquiry not found'
      );
    });

    it('should handle all valid statuses', async () => {
      const statuses: InquiryStatus[] = [
        InquiryStatus.PENDING,
        InquiryStatus.READ,
        InquiryStatus.REPLIED,
        InquiryStatus.CLOSED,
      ];

      for (const status of statuses) {
        const mockInquiry = createMockInquiry();
        const updatedInquiry = createMockInquiry({ status });

        mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
        mockInquiryRepository.updateStatus.mockResolvedValue(updatedInquiry);

        const result = await updateInquiryStatus('inq_test123', status);

        expect(result?.status).toBe(status);
      }
    });

    it('should return null when update fails', async () => {
      const mockInquiry = createMockInquiry();
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.updateStatus.mockResolvedValue(null);

      const result = await updateInquiryStatus('inq_test123', InquiryStatus.READ);

      expect(result).toBeNull();
    });
  });

  // ==================== Report Operations ====================

  // ==================== createReport ====================

  describe('createReport', () => {
    it('should create report successfully', async () => {
      const mockReport = createMockReport();
      mockReportRepository.hasUserReportedTarget.mockResolvedValue(false);
      mockReportRepository.create.mockResolvedValue(mockReport);

      const result = await createReport({
        userId: 'usr_test123',
        targetType: ReportTargetType.COURSE,
        targetId: 'crs_test123',
        reason: ReportReason.SPAM,
        description: 'This is spam content',
      });

      expect(result).toBeDefined();
      expect(result.reason).toBe(ReportReason.SPAM);
      expect(result.status).toBe(ReportStatus.PENDING);
      expect(mockReportRepository.hasUserReportedTarget).toHaveBeenCalledWith(
        'usr_test123',
        'course',
        'crs_test123'
      );
      expect(mockReportRepository.create).toHaveBeenCalled();
    });

    it('should throw error when missing required fields', async () => {
      await expect(
        createReport({
          targetType: ReportTargetType.COURSE,
          targetId: 'crs_test123',
          reason: ReportReason.SPAM,
          description: '',
        } as any)
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error for invalid reason', async () => {
      await expect(
        createReport({
          targetType: ReportTargetType.COURSE,
          targetId: 'crs_test123',
          reason: 'invalid_reason' as ReportReason,
          description: 'Test description',
        })
      ).rejects.toThrow('Invalid reason');
    });

    it('should throw error for invalid target type', async () => {
      await expect(
        createReport({
          targetType: 'invalid_type' as ReportTargetType,
          targetId: 'crs_test123',
          reason: ReportReason.SPAM,
          description: 'Test description',
        })
      ).rejects.toThrow('Invalid target type');
    });

    it('should throw error when description is too short', async () => {
      await expect(
        createReport({
          targetType: ReportTargetType.COURSE,
          targetId: 'crs_test123',
          reason: ReportReason.SPAM,
          description: 'short',
        })
      ).rejects.toThrow('Description must be at least 10 characters');
    });

    it('should throw error when description is too long', async () => {
      const longDescription = 'a'.repeat(2001);

      await expect(
        createReport({
          targetType: ReportTargetType.COURSE,
          targetId: 'crs_test123',
          reason: ReportReason.SPAM,
          description: longDescription,
        })
      ).rejects.toThrow('Description must be less than 2000 characters');
    });

    it('should accept description with exactly 10 characters', async () => {
      const validDescription = 'a'.repeat(10);
      mockReportRepository.hasUserReportedTarget.mockResolvedValue(false);
      mockReportRepository.create.mockResolvedValue(createMockReport());

      await expect(
        createReport({
          targetType: ReportTargetType.COURSE,
          targetId: 'crs_test123',
          reason: ReportReason.SPAM,
          description: validDescription,
        })
      ).resolves.toBeDefined();
    });

    it('should accept description with exactly 2000 characters', async () => {
      const validDescription = 'a'.repeat(2000);
      mockReportRepository.hasUserReportedTarget.mockResolvedValue(false);
      mockReportRepository.create.mockResolvedValue(createMockReport());

      await expect(
        createReport({
          targetType: ReportTargetType.COURSE,
          targetId: 'crs_test123',
          reason: ReportReason.SPAM,
          description: validDescription,
        })
      ).resolves.toBeDefined();
    });

    it('should throw error when user has already reported target', async () => {
      mockReportRepository.hasUserReportedTarget.mockResolvedValue(true);

      await expect(
        createReport({
          userId: 'usr_test123',
          targetType: ReportTargetType.COURSE,
          targetId: 'crs_test123',
          reason: ReportReason.SPAM,
          description: 'This is spam content with enough detail',
        })
      ).rejects.toThrow('You have already reported this content');
    });

    it('should not check duplicate for anonymous user', async () => {
      mockReportRepository.hasUserReportedTarget.mockResolvedValue(false);
      mockReportRepository.create.mockResolvedValue(createMockReport());

      await createReport({
        targetType: ReportTargetType.COURSE,
        targetId: 'crs_test123',
        reason: ReportReason.SPAM,
        description: 'Anonymous report with enough details',
      });

      expect(mockReportRepository.hasUserReportedTarget).not.toHaveBeenCalled();
    });

    it('should accept all valid reasons', async () => {
      const validReasons: ReportReason[] = [
        ReportReason.SPAM,
        ReportReason.INAPPROPRIATE_CONTENT,
        ReportReason.FAKE_INFORMATION,
        ReportReason.HARASSMENT,
        ReportReason.FRAUD,
        ReportReason.COPYRIGHT,
        ReportReason.OTHER,
      ];

      for (const reason of validReasons) {
        mockReportRepository.hasUserReportedTarget.mockResolvedValue(false);
        mockReportRepository.create.mockResolvedValue(createMockReport({ reason }));

        await expect(
          createReport({
            targetType: ReportTargetType.COURSE,
            targetId: 'crs_test123',
            reason,
            description: 'Test description with enough characters',
          })
        ).resolves.toBeDefined();
      }
    });

    it('should accept all valid target types', async () => {
      const validTypes: ReportTargetType[] = [
        ReportTargetType.COURSE,
        ReportTargetType.TEACHER,
        ReportTargetType.REVIEW,
        ReportTargetType.USER,
        ReportTargetType.COMMENT,
        ReportTargetType.OTHER,
      ];

      for (const type of validTypes) {
        mockReportRepository.hasUserReportedTarget.mockResolvedValue(false);
        mockReportRepository.create.mockResolvedValue(createMockReport({ targetType: type }));

        await expect(
          createReport({
            targetType: type,
            targetId: 'target123',
            reason: ReportReason.SPAM,
            description: 'Test description with enough characters',
          })
        ).resolves.toBeDefined();
      }
    });

    it('should create report without userId', async () => {
      mockReportRepository.hasUserReportedTarget.mockResolvedValue(false);
      mockReportRepository.create.mockResolvedValue(createMockReport({ userId: undefined }));

      const result = await createReport({
        targetType: ReportTargetType.COURSE,
        targetId: 'crs_test123',
        reason: ReportReason.SPAM,
        description: 'Anonymous report with enough details',
      });

      expect(result.userId).toBeUndefined();
    });
  });

  // ==================== getReportById ====================

  describe('getReportById', () => {
    it('should return report when found', async () => {
      const mockReport = createMockReport();
      mockReportRepository.findById.mockResolvedValue(mockReport);

      const result = await getReportById('rpt_test123');

      expect(result).toEqual(mockReport);
      expect(mockReportRepository.findById).toHaveBeenCalledWith('rpt_test123');
    });

    it('should return null when report not found', async () => {
      mockReportRepository.findById.mockResolvedValue(null);

      const result = await getReportById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==================== getReports ====================

  describe('getReports', () => {
    it('should return reports with pagination', async () => {
      const mockReports = [
        createMockReport({ id: 'rpt_1' }),
        createMockReport({ id: 'rpt_2' }),
      ];

      mockReportRepository.findAll.mockResolvedValue({
        reports: mockReports,
        total: 2,
      });

      const result = await getReports({ page: 1, limit: 10 });

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      const mockReports = Array.from({ length: 10 }, (_, i) =>
        createMockReport({ id: `rpt_${i}` })
      );

      mockReportRepository.findAll.mockResolvedValue({
        reports: mockReports,
        total: 30,
      });

      const result = await getReports({ page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });

    it('should use default pagination when not provided', async () => {
      mockReportRepository.findAll.mockResolvedValue({
        reports: [],
        total: 0,
      });

      const result = await getReports();

      expect(mockReportRepository.findAll).toHaveBeenCalledWith(undefined);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should pass filters to repository', async () => {
      mockReportRepository.findAll.mockResolvedValue({
        reports: [],
        total: 0,
      });

      await getReports({
        status: ReportStatus.PENDING,
        targetType: ReportTargetType.COURSE,
        reason: ReportReason.SPAM,
        userId: 'usr_test123',
      });

      expect(mockReportRepository.findAll).toHaveBeenCalledWith({
        status: ReportStatus.PENDING,
        targetType: 'course',
        reason: ReportReason.SPAM,
        userId: 'usr_test123',
      });
    });

    it('should return empty array when no reports', async () => {
      mockReportRepository.findAll.mockResolvedValue({
        reports: [],
        total: 0,
      });

      const result = await getReports();

      expect(result.reports).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ==================== getReportsByTargetId ====================

  describe('getReportsByTargetId', () => {
    it('should return reports for target', async () => {
      const mockReports = [
        createMockReport({ id: 'rpt_1' }),
        createMockReport({ id: 'rpt_2' }),
      ];

      mockReportRepository.findByTargetId.mockResolvedValue(mockReports);

      const result = await getReportsByTargetId('course', 'crs_test123');

      expect(result).toHaveLength(2);
      expect(mockReportRepository.findByTargetId).toHaveBeenCalledWith('course', 'crs_test123');
    });

    it('should return empty array when no reports for target', async () => {
      mockReportRepository.findByTargetId.mockResolvedValue([]);

      const result = await getReportsByTargetId('course', 'crs_no_reports');

      expect(result).toEqual([]);
    });
  });

  // ==================== getUserReports ====================

  describe('getUserReports', () => {
    it('should return user reports', async () => {
      const mockReports = [
        createMockReport({ id: 'rpt_1' }),
        createMockReport({ id: 'rpt_2' }),
      ];

      mockReportRepository.findByUserId.mockResolvedValue(mockReports);

      const result = await getUserReports('usr_test123');

      expect(result).toHaveLength(2);
      expect(mockReportRepository.findByUserId).toHaveBeenCalledWith('usr_test123');
    });

    it('should return empty array when user has no reports', async () => {
      mockReportRepository.findByUserId.mockResolvedValue([]);

      const result = await getUserReports('usr_no_reports');

      expect(result).toEqual([]);
    });
  });

  // ==================== updateReportStatus ====================

  describe('updateReportStatus', () => {
    it('should update report status successfully', async () => {
      const mockReport = createMockReport();
      const updatedReport = createMockReport({
        status: ReportStatus.REVIEWING,
      });

      mockReportRepository.findById.mockResolvedValue(mockReport);
      mockReportRepository.updateStatus.mockResolvedValue(updatedReport);

      const result = await updateReportStatus('rpt_test123', ReportStatus.REVIEWING);

      expect(result).toBeDefined();
      expect(result?.status).toBe(ReportStatus.REVIEWING);
      expect(mockReportRepository.findById).toHaveBeenCalledWith('rpt_test123');
      expect(mockReportRepository.updateStatus).toHaveBeenCalledWith('rpt_test123', ReportStatus.REVIEWING, undefined);
    });

    it('should update report status with admin notes', async () => {
      const mockReport = createMockReport();
      const updatedReport = createMockReport({
        status: ReportStatus.RESOLVED,
        adminNotes: 'Reviewed and confirmed',
      });

      mockReportRepository.findById.mockResolvedValue(mockReport);
      mockReportRepository.updateStatus.mockResolvedValue(updatedReport);

      const result = await updateReportStatus(
        'rpt_test123',
        ReportStatus.RESOLVED,
        'Reviewed and confirmed'
      );

      expect(result?.adminNotes).toBe('Reviewed and confirmed');
      expect(mockReportRepository.updateStatus).toHaveBeenCalledWith(
        'rpt_test123',
        ReportStatus.RESOLVED,
        'Reviewed and confirmed'
      );
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findById.mockResolvedValue(null);

      await expect(updateReportStatus('nonexistent', ReportStatus.REVIEWING)).rejects.toThrow(
        'Report not found'
      );
    });

    it('should throw error for invalid status', async () => {
      await expect(
        updateReportStatus('rpt_test123', 'INVALID_STATUS' as ReportStatus)
      ).rejects.toThrow('Invalid status');
    });

    it('should handle all valid statuses', async () => {
      const statuses: ReportStatus[] = [
        ReportStatus.PENDING,
        ReportStatus.REVIEWING,
        ReportStatus.RESOLVED,
        ReportStatus.DISMISSED,
      ];

      for (const status of statuses) {
        const mockReport = createMockReport();
        const updatedReport = createMockReport({ status });

        mockReportRepository.findById.mockResolvedValue(mockReport);
        mockReportRepository.updateStatus.mockResolvedValue(updatedReport);

        const result = await updateReportStatus('rpt_test123', status);

        expect(result?.status).toBe(status);
      }
    });

    it('should return null when update fails', async () => {
      const mockReport = createMockReport();
      mockReportRepository.findById.mockResolvedValue(mockReport);
      mockReportRepository.updateStatus.mockResolvedValue(null);

      const result = await updateReportStatus('rpt_test123', ReportStatus.REVIEWING);

      expect(result).toBeNull();
    });

    it('should handle update without admin notes', async () => {
      const mockReport = createMockReport();
      const updatedReport = createMockReport({
        status: ReportStatus.REVIEWING,
      });

      mockReportRepository.findById.mockResolvedValue(mockReport);
      mockReportRepository.updateStatus.mockResolvedValue(updatedReport);

      await updateReportStatus('rpt_test123', ReportStatus.REVIEWING);

      expect(mockReportRepository.updateStatus).toHaveBeenCalledWith(
        'rpt_test123',
        ReportStatus.REVIEWING,
        undefined
      );
    });
  });

  // ==================== Error Handling ====================

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockInquiryRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(getInquiryById('inq_test123')).rejects.toThrow('Database error');
    });

    it('should propagate AppError from validation', async () => {
      try {
        await createInquiry({
          targetType: 'invalid' as any,
          message: 'Test',
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
      }
    });

    it('should handle null repository responses', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      const result = await getInquiryById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
