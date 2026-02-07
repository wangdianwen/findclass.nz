/**
 * Inquiries Repository Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';

// Mock logger
vi.mock('@core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import { InquiryRepository, ReportRepository, type InquiryRow, type ReportRow } from '@modules/inquiries/inquiry.repository';
import type { Inquiry, Report, CreateInquiryDTO, CreateReportDTO } from '@modules/inquiries/types';

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

describe('InquiryRepository (PostgreSQL)', () => {
  let mockPool: any;
  let repository: InquiryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {
      query: vi.fn(),
    };
    repository = new InquiryRepository(mockPool as unknown as Pool);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Mock Data ====================

  function createMockInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
    return {
      id: 'inq_test123',
      userId: 'usr_test123',
      userName: 'Test User',
      userEmail: 'test@example.com',
      userPhone: '+64-21-123-4567',
      targetType: 'course' as const,
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

  function createMockInquiryRow(overrides: Partial<InquiryRow> = {}): InquiryRow {
    return {
      id: 'inq_test123',
      user_id: 'usr_test123',
      user_name: 'Test User',
      user_email: 'test@example.com',
      user_phone: '+64-21-123-4567',
      target_type: 'course',
      target_id: 'crs_test123',
      subject: 'Question about course',
      message: 'Is this course suitable for beginners?',
      status: InquiryStatus.PENDING,
      reply_content: null,
      replied_at: null,
      created_at: new Date('2024-01-01T10:00:00Z'),
      updated_at: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  // ==================== findById ====================

  describe('findById', () => {
    it('should return inquiry when found', async () => {
      const mockRow = createMockInquiryRow();
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('inq_test123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('inq_test123');
      expect(result?.userId).toBe('usr_test123');
      expect(result?.targetType).toBe('course');
      expect(result?.message).toBe('Is this course suitable for beginners?');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM inquiries WHERE id = $1',
        ['inq_test123']
      );
    });

    it('should return null when inquiry not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM inquiries WHERE id = $1',
        ['nonexistent']
      );
    });

    it('should map all fields correctly from database row', async () => {
      const mockRow = createMockInquiryRow();
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('inq_test123');

      expect(result).toEqual({
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
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
      });
    });

    it('should handle inquiry with null optional fields', async () => {
      const mockRow = createMockInquiryRow({
        user_id: null,
        user_name: null,
        user_email: null,
        user_phone: null,
        target_id: null,
        subject: null,
        reply_content: null,
        replied_at: null,
        updated_at: null,
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('inq_test123');

      expect(result?.userId).toBeUndefined();
      expect(result?.userName).toBeUndefined();
      expect(result?.userEmail).toBeUndefined();
      expect(result?.userPhone).toBeUndefined();
      expect(result?.targetId).toBeUndefined();
      expect(result?.subject).toBeUndefined();
      expect(result?.replyContent).toBeUndefined();
      expect(result?.repliedAt).toBeUndefined();
      expect(result?.updatedAt).toBeUndefined();
    });

    it('should handle inquiry with reply', async () => {
      const mockRow = createMockInquiryRow({
        status: InquiryStatus.REPLIED,
        reply_content: 'Yes, this course is perfect for beginners!',
        replied_at: new Date('2024-01-02T10:00:00Z'),
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('inq_test123');

      expect(result?.status).toBe(InquiryStatus.REPLIED);
      expect(result?.replyContent).toBe('Yes, this course is perfect for beginners!');
      expect(result?.repliedAt).toEqual(new Date('2024-01-02T10:00:00Z'));
    });
  });

  // ==================== findAll ====================

  describe('findAll', () => {
    it('should return all inquiries with pagination when no filters provided', async () => {
      const mockRows = [
        createMockInquiryRow({ id: 'inq_1' }),
        createMockInquiryRow({ id: 'inq_2' }),
        createMockInquiryRow({ id: 'inq_3' }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '3' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.inquiries).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.inquiries[0].id).toBe('inq_1');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by status', async () => {
      const mockRows = [createMockInquiryRow({ id: 'inq_1', status: InquiryStatus.PENDING })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ status: InquiryStatus.PENDING });

      expect(result.inquiries).toHaveLength(1);
      expect(result.inquiries[0].status).toBe(InquiryStatus.PENDING);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = $1"),
        expect.arrayContaining([InquiryStatus.PENDING])
      );
    });

    it('should filter by targetType', async () => {
      const mockRows = [createMockInquiryRow({ id: 'inq_1', target_type: 'teacher' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ targetType: 'teacher' });

      expect(result.inquiries).toHaveLength(1);
      expect(result.inquiries[0].targetType).toBe('teacher');
    });

    it('should filter by targetId', async () => {
      const mockRows = [createMockInquiryRow({ id: 'inq_1', target_id: 'crs_target123' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ targetId: 'crs_target123' });

      expect(result.inquiries).toHaveLength(1);
      expect(result.inquiries[0].targetId).toBe('crs_target123');
    });

    it('should filter by userId', async () => {
      const mockRows = [createMockInquiryRow({ id: 'inq_1', user_id: 'usr_filter123' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ userId: 'usr_filter123' });

      expect(result.inquiries).toHaveLength(1);
      expect(result.inquiries[0].userId).toBe('usr_filter123');
    });

    it('should apply multiple filters together', async () => {
      const mockRows = [
        createMockInquiryRow({
          id: 'inq_1',
          user_id: 'usr_test123',
          target_type: 'course',
          status: InquiryStatus.PENDING,
        }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({
        userId: 'usr_test123',
        targetType: 'course',
        status: InquiryStatus.PENDING,
      });

      expect(result.inquiries).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $'),
        expect.any(Array)
      );
    });

    it('should calculate offset correctly for pagination', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '25' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.findAll({ page: 2, limit: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([10, 10]) // limit 10, offset 10
      );
    });

    it('should order by created_at DESC', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should return empty array when no inquiries match', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ status: InquiryStatus.CLOSED });

      expect(result.inquiries).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==================== findByUserId ====================

  describe('findByUserId', () => {
    it('should return user inquiries ordered by created_at DESC', async () => {
      const mockRows = [
        createMockInquiryRow({ id: 'inq_2', created_at: new Date('2024-01-02T10:00:00Z') }),
        createMockInquiryRow({ id: 'inq_1', created_at: new Date('2024-01-01T10:00:00Z') }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await repository.findByUserId('usr_test123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('inq_2');
      expect(result[1].id).toBe('inq_1');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM inquiries WHERE user_id = $1 ORDER BY created_at DESC',
        ['usr_test123']
      );
    });

    it('should return empty array when user has no inquiries', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByUserId('usr_no_inquiries');

      expect(result).toEqual([]);
    });

    it('should return all inquiries for user regardless of status', async () => {
      const mockRows = [
        createMockInquiryRow({ id: 'inq_1', status: InquiryStatus.PENDING }),
        createMockInquiryRow({ id: 'inq_2', status: InquiryStatus.REPLIED }),
        createMockInquiryRow({ id: 'inq_3', status: InquiryStatus.CLOSED }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await repository.findByUserId('usr_test123');

      expect(result).toHaveLength(3);
    });
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create inquiry successfully', async () => {
      const mockRow = createMockInquiryRow();
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const createDto: CreateInquiryDTO = {
        userId: 'usr_test123',
        targetType: 'course',
        targetId: 'crs_test123',
        subject: 'Question about course',
        message: 'Is this course suitable for beginners?',
      };

      const result = await repository.create(createDto);

      expect(result).toBeDefined();
      expect(result.message).toBe('Is this course suitable for beginners?');
      expect(result.status).toBe(InquiryStatus.PENDING);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inquiries'),
        expect.arrayContaining([
          expect.any(String), // id (UUID)
          'usr_test123',
          'course',
          'crs_test123',
          'Question about course',
          'Is this course suitable for beginners?',
          'PENDING',
          expect.any(Date), // created_at
          expect.any(Date), // updated_at
        ])
      );
    });

    it('should create inquiry with optional fields as null', async () => {
      const mockRow = createMockInquiryRow({
        user_id: null,
        target_id: null,
        subject: null,
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const createDto: CreateInquiryDTO = {
        targetType: 'general',
        message: 'General inquiry without user',
      };

      const result = await repository.create(createDto);

      expect(result).toBeDefined();
      expect(result.userId).toBeUndefined();
      expect(result.targetId).toBeUndefined();
      expect(result.subject).toBeUndefined();
    });

    it('should generate UUID for new inquiry', async () => {
      const mockRow = createMockInquiryRow({ id: 'inq_new_uuid' });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      await repository.create({
        targetType: 'general',
        message: 'Test message',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inquiries'),
        expect.arrayContaining([expect.any(String)])
      );
    });

    it('should set initial status to PENDING', async () => {
      const mockRow = createMockInquiryRow({ status: InquiryStatus.PENDING });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.create({
        targetType: 'teacher',
        message: 'Test message',
      });

      expect(result.status).toBe(InquiryStatus.PENDING);
    });

    it('should set created_at and updated_at timestamps', async () => {
      const mockRow = createMockInquiryRow();
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      await repository.create({
        targetType: 'general',
        message: 'Test',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at, updated_at'),
        expect.any(Array)
      );
    });
  });

  // ==================== updateReply ====================

  describe('updateReply', () => {
    it('should update inquiry with reply and change status to REPLIED', async () => {
      const mockRow = createMockInquiryRow({
        status: InquiryStatus.REPLIED,
        reply_content: 'Thank you for your inquiry. Here is the answer.',
        replied_at: new Date('2024-01-02T11:00:00Z'),
        updated_at: new Date('2024-01-02T11:00:00Z'),
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.updateReply('inq_test123', 'Thank you for your inquiry. Here is the answer.');

      expect(result).toBeDefined();
      expect(result?.status).toBe(InquiryStatus.REPLIED);
      expect(result?.replyContent).toBe('Thank you for your inquiry. Here is the answer.');
      expect(result?.repliedAt).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inquiries'),
        ['inq_test123', 'Thank you for your inquiry. Here is the answer.']
      );
    });

    it('should set replied_at timestamp when reply is added', async () => {
      const mockRow = createMockInquiryRow({
        replied_at: new Date('2024-01-02T11:00:00Z'),
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      await repository.updateReply('inq_test123', 'Reply content');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('replied_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should update updated_at timestamp when reply is added', async () => {
      mockPool.query.mockResolvedValue({ rows: [createMockInquiryRow()] });

      await repository.updateReply('inq_test123', 'Reply content');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should return null when inquiry not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.updateReply('nonexistent', 'Reply content');

      expect(result).toBeNull();
    });

    it('should trim reply content', async () => {
      const mockRow = createMockInquiryRow({ reply_content: 'Trimmed reply' });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.updateReply('inq_test123', 'Trimmed reply');

      // Repository doesn't trim - that's done in the service layer
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inquiries'),
        ['inq_test123', 'Trimmed reply']
      );
      expect(result?.replyContent).toBe('Trimmed reply');
    });
  });

  // ==================== updateStatus ====================

  describe('updateStatus', () => {
    it('should update inquiry status', async () => {
      const mockRow = createMockInquiryRow({
        status: InquiryStatus.READ,
        updated_at: new Date('2024-01-02T10:00:00Z'),
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.updateStatus('inq_test123', InquiryStatus.READ);

      expect(result).toBeDefined();
      expect(result?.status).toBe(InquiryStatus.READ);
      expect(mockPool.query).toHaveBeenCalledWith(
        `UPDATE inquiries
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
        ['inq_test123', InquiryStatus.READ]
      );
    });

    it('should update status to CLOSED', async () => {
      const mockRow = createMockInquiryRow({ status: InquiryStatus.CLOSED });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.updateStatus('inq_test123', InquiryStatus.CLOSED);

      expect(result?.status).toBe(InquiryStatus.CLOSED);
    });

    it('should update updated_at timestamp when status changes', async () => {
      mockPool.query.mockResolvedValue({ rows: [createMockInquiryRow()] });

      await repository.updateStatus('inq_test123', InquiryStatus.READ);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should return null when inquiry not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.updateStatus('nonexistent', InquiryStatus.READ);

      expect(result).toBeNull();
    });

    it('should handle all valid status values', async () => {
      const statuses: InquiryStatus[] = [
        InquiryStatus.PENDING,
        InquiryStatus.READ,
        InquiryStatus.REPLIED,
        InquiryStatus.CLOSED,
      ];

      for (const status of statuses) {
        const mockRow = createMockInquiryRow({ status });
        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateStatus('inq_test123', status);

        expect(result?.status).toBe(status);
      }
    });
  });

  // ==================== hasPendingInquiryForTarget ====================

  describe('hasPendingInquiryForTarget', () => {
    it('should return true when pending inquiry exists for target', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await repository.hasPendingInquiryForTarget('usr_test123', 'course', 'crs_test123');

      expect(result).toBe(true);
    });

    it('should return false when no pending inquiry exists', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.hasPendingInquiryForTarget('usr_test123', 'course', 'crs_test123');

      expect(result).toBe(false);
    });

    it('should check within 24 hour window', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasPendingInquiryForTarget('usr_test123', 'teacher', 'tch_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("created_at > NOW() - INTERVAL '24 hours'"),
        expect.any(Array)
      );
    });

    it('should work without targetId for general inquiries', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasPendingInquiryForTarget('usr_test123', 'general');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('target_id ='),
        expect.any(Array)
      );
    });

    it('should include targetId when provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasPendingInquiryForTarget('usr_test123', 'course', 'crs_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('target_id ='),
        expect.any(Array)
      );
    });

    it('should filter by PENDING status', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasPendingInquiryForTarget('usr_test123', 'course', 'crs_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'PENDING'"),
        expect.any(Array)
      );
    });
  });
});

describe('ReportRepository (PostgreSQL)', () => {
  let mockPool: any;
  let repository: ReportRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {
      query: vi.fn(),
    };
    repository = new ReportRepository(mockPool as unknown as Pool);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Mock Data ====================

  function createMockReport(overrides: Partial<Report> = {}): Report {
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

  function createMockReportRow(overrides: Partial<ReportRow> = {}): ReportRow {
    return {
      id: 'rpt_test123',
      user_id: 'usr_test123',
      user_name: 'Test User',
      user_email: 'test@example.com',
      target_type: 'course',
      target_id: 'crs_test123',
      reason: ReportReason.SPAM,
      description: 'This is spam content',
      status: ReportStatus.PENDING,
      admin_notes: null,
      resolved_at: null,
      created_at: new Date('2024-01-01T10:00:00Z'),
      updated_at: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  // ==================== findById ====================

  describe('findById', () => {
    it('should return report when found', async () => {
      const mockRow = createMockReportRow();
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('rpt_test123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('rpt_test123');
      expect(result?.targetType).toBe(ReportTargetType.COURSE);
      expect(result?.reason).toBe(ReportReason.SPAM);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM reports WHERE id = $1',
        ['rpt_test123']
      );
    });

    it('should return null when report not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle report with null optional fields', async () => {
      const mockRow = createMockReportRow({
        user_id: null,
        user_name: null,
        user_email: null,
        admin_notes: null,
        resolved_at: null,
        updated_at: null,
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById('rpt_test123');

      expect(result?.userId).toBeUndefined();
      expect(result?.userName).toBeUndefined();
      expect(result?.userEmail).toBeUndefined();
      expect(result?.adminNotes).toBeUndefined();
      expect(result?.resolvedAt).toBeUndefined();
      expect(result?.updatedAt).toBeUndefined();
    });
  });

  // ==================== findAll ====================

  describe('findAll', () => {
    it('should return all reports with pagination when no filters provided', async () => {
      const mockRows = [
        createMockReportRow({ id: 'rpt_1' }),
        createMockReportRow({ id: 'rpt_2' }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      const mockRows = [createMockReportRow({ status: ReportStatus.REVIEWING })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ status: ReportStatus.REVIEWING });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].status).toBe(ReportStatus.REVIEWING);
    });

    it('should filter by targetType', async () => {
      const mockRows = [createMockReportRow({ target_type: 'teacher' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ targetType: 'teacher' });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].targetType).toBe('teacher');
    });

    it('should filter by targetId', async () => {
      const mockRows = [createMockReportRow({ target_id: 'crs_target' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ targetId: 'crs_target' });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].targetId).toBe('crs_target');
    });

    it('should filter by reason', async () => {
      const mockRows = [createMockReportRow({ reason: ReportReason.FRAUD })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ reason: ReportReason.FRAUD });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].reason).toBe(ReportReason.FRAUD);
    });

    it('should filter by userId', async () => {
      const mockRows = [createMockReportRow({ user_id: 'usr_filter' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({ userId: 'usr_filter' });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].userId).toBe('usr_filter');
    });

    it('should apply multiple filters together', async () => {
      const mockRows = [
        createMockReportRow({
          user_id: 'usr_test123',
          target_type: 'course',
          reason: ReportReason.SPAM,
          status: ReportStatus.PENDING,
        }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: mockRows });
      });

      const result = await repository.findAll({
        userId: 'usr_test123',
        targetType: 'course',
        reason: ReportReason.SPAM,
        status: ReportStatus.PENDING,
      });

      expect(result.reports).toHaveLength(1);
    });

    it('should order by created_at DESC', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.findAll();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should return empty array when no reports match', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ status: ReportStatus.RESOLVED });

      expect(result.reports).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==================== findByTargetId ====================

  describe('findByTargetId', () => {
    it('should return reports for target ordered by created_at DESC', async () => {
      const mockRows = [
        createMockReportRow({ id: 'rpt_2', created_at: new Date('2024-01-02T10:00:00Z') }),
        createMockReportRow({ id: 'rpt_1', created_at: new Date('2024-01-01T10:00:00Z') }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await repository.findByTargetId('course', 'crs_test123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rpt_2');
      expect(result[1].id).toBe('rpt_1');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM reports WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC',
        ['course', 'crs_test123']
      );
    });

    it('should return empty array when no reports for target', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByTargetId('course', 'crs_no_reports');

      expect(result).toEqual([]);
    });
  });

  // ==================== findByUserId ====================

  describe('findByUserId', () => {
    it('should return user reports ordered by created_at DESC', async () => {
      const mockRows = [
        createMockReportRow({ id: 'rpt_2', created_at: new Date('2024-01-02T10:00:00Z') }),
        createMockReportRow({ id: 'rpt_1', created_at: new Date('2024-01-01T10:00:00Z') }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await repository.findByUserId('usr_test123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rpt_2');
      expect(result[1].id).toBe('rpt_1');
    });

    it('should return empty array when user has no reports', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByUserId('usr_no_reports');

      expect(result).toEqual([]);
    });
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create report successfully', async () => {
      const mockRow = createMockReportRow();
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const createDto: CreateReportDTO = {
        userId: 'usr_test123',
        targetType: ReportTargetType.COURSE,
        targetId: 'crs_test123',
        reason: ReportReason.SPAM,
        description: 'This is spam content',
      };

      const result = await repository.create(createDto);

      expect(result).toBeDefined();
      expect(result.reason).toBe(ReportReason.SPAM);
      expect(result.status).toBe(ReportStatus.PENDING);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reports'),
        expect.arrayContaining([
          expect.any(String),
          'usr_test123',
          'course',
          'crs_test123',
          'spam',
          'This is spam content',
          'PENDING',
          expect.any(Date),
          expect.any(Date),
        ])
      );
    });

    it('should create report without userId', async () => {
      const mockRow = createMockReportRow({ user_id: null });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const createDto: CreateReportDTO = {
        targetType: ReportTargetType.TEACHER,
        targetId: 'tch_test123',
        reason: ReportReason.INAPPROPRIATE_CONTENT,
        description: 'Inappropriate content found',
      };

      const result = await repository.create(createDto);

      expect(result).toBeDefined();
      expect(result.userId).toBeUndefined();
    });

    it('should set initial status to PENDING', async () => {
      const mockRow = createMockReportRow({ status: ReportStatus.PENDING });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.create({
        targetType: ReportTargetType.REVIEW,
        targetId: 'rev_test123',
        reason: ReportReason.OTHER,
        description: 'Other issue',
      });

      expect(result.status).toBe(ReportStatus.PENDING);
    });

    it('should generate UUID for new report', async () => {
      const mockRow = createMockReportRow({ id: 'rpt_new_uuid' });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      await repository.create({
        targetType: ReportTargetType.USER,
        targetId: 'usr_target',
        reason: ReportReason.HARASSMENT,
        description: 'Harassment report',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reports'),
        expect.arrayContaining([expect.any(String)])
      );
    });
  });

  // ==================== updateStatus ====================

  describe('updateStatus', () => {
    it('should update report status', async () => {
      const mockRow = createMockReportRow({
        status: ReportStatus.REVIEWING,
        updated_at: new Date('2024-01-02T10:00:00Z'),
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.updateStatus('rpt_test123', ReportStatus.REVIEWING);

      expect(result).toBeDefined();
      expect(result?.status).toBe(ReportStatus.REVIEWING);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reports SET status ='),
        ['rpt_test123', ReportStatus.REVIEWING]
      );
    });

    it('should update status with admin notes', async () => {
      const mockRow = createMockReportRow({
        status: ReportStatus.RESOLVED,
        admin_notes: 'Reviewed and confirmed',
        updated_at: new Date('2024-01-02T10:00:00Z'),
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.updateStatus(
        'rpt_test123',
        ReportStatus.RESOLVED,
        'Reviewed and confirmed'
      );

      expect(result?.adminNotes).toBe('Reviewed and confirmed');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('admin_notes ='),
        ['rpt_test123', ReportStatus.RESOLVED, 'Reviewed and confirmed']
      );
    });

    it('should set resolved_at when status is RESOLVED', async () => {
      const mockRow = createMockReportRow({
        status: ReportStatus.RESOLVED,
        resolved_at: new Date('2024-01-02T10:00:00Z'),
      });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      await repository.updateStatus('rpt_test123', ReportStatus.RESOLVED);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('resolved_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should update updated_at timestamp', async () => {
      mockPool.query.mockResolvedValue({ rows: [createMockReportRow()] });

      await repository.updateStatus('rpt_test123', ReportStatus.REVIEWING);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should return null when report not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.updateStatus('nonexistent', ReportStatus.REVIEWING);

      expect(result).toBeNull();
    });

    it('should handle all valid status values', async () => {
      const statuses: ReportStatus[] = [
        ReportStatus.PENDING,
        ReportStatus.REVIEWING,
        ReportStatus.RESOLVED,
        ReportStatus.DISMISSED,
      ];

      for (const status of statuses) {
        const mockRow = createMockReportRow({ status });
        mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

        const result = await repository.updateStatus('rpt_test123', status);

        expect(result?.status).toBe(status);
      }
    });

    it('should handle DISMISSED status', async () => {
      const mockRow = createMockReportRow({ status: ReportStatus.DISMISSED });
      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.updateStatus('rpt_test123', ReportStatus.DISMISSED);

      expect(result?.status).toBe(ReportStatus.DISMISSED);
    });
  });

  // ==================== hasUserReportedTarget ====================

  describe('hasUserReportedTarget', () => {
    it('should return true when user has reported target', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await repository.hasUserReportedTarget('usr_test123', 'course', 'crs_test123');

      expect(result).toBe(true);
    });

    it('should return false when user has not reported target', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.hasUserReportedTarget('usr_test123', 'course', 'crs_test123');

      expect(result).toBe(false);
    });

    it('should only check PENDING and REVIEWING status', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasUserReportedTarget('usr_test123', 'teacher', 'tch_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('PENDING', 'REVIEWING')"),
        expect.any(Array)
      );
    });

    it('should check by user_id, target_type, and target_id', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasUserReportedTarget('usr_test123', 'review', 'rev_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1 AND target_type = $2 AND target_id = $3'),
        ['usr_test123', 'review', 'rev_test123']
      );
    });

    it('should limit results to 1', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasUserReportedTarget('usr_test123', 'course', 'crs_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.any(Array)
      );
    });
  });
});
