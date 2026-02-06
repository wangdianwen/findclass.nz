/**
 * Teachers Service Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Pool } from 'pg';

// ============================================
// Mock PostgreSQL pool
// ============================================

const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('@shared/db/postgres/client', () => ({
  getPool: vi.fn(() => mockPool),
}));

// ============================================
// Mock logger
// ============================================

vi.mock('@core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================
// Test Data Factories
// ============================================

function createMockTeacher(overrides: Partial<{
  id: string;
  user_id: string;
  display_name: string;
  bio: string | undefined;
  teaching_subjects: string[];
  teaching_modes: string[];
  locations: string[];
  trust_level: string;
  verification_status: string;
  average_rating: number;
  total_reviews: number;
  total_students: number;
  created_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: 'tchr_123',
    user_id: 'usr_123',
    display_name: 'John Doe',
    bio: 'Experienced math teacher',
    teaching_subjects: ['Mathematics', 'Calculus'],
    teaching_modes: ['ONLINE', 'OFFLINE'],
    locations: ['Auckland', 'Wellington'],
    trust_level: 'B',
    verification_status: 'APPROVED',
    average_rating: 4.5,
    total_reviews: 25,
    total_students: 150,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createMockQualification(overrides: Partial<{
  id: string;
  teacher_id: string;
  type: string;
  name: string;
  institution: string | undefined;
  year: number | undefined;
  file_url: string | undefined;
  status: string;
  created_at: Date;
}> = {}) {
  return {
    id: 'qual_123',
    teacher_id: 'tchr_123',
    type: 'DEGREE',
    name: 'Master of Education',
    institution: 'University of Auckland',
    year: 2015,
    file_url: 'https://example.com/degree.pdf',
    status: 'APPROVED',
    created_at: new Date(),
    ...overrides,
  };
}

function createMockCourse(overrides: Partial<{
  id: string;
  teacher_id: string;
  course_id: string;
  course_title: string | undefined;
  course_category: string | undefined;
  course_price: number | undefined;
  created_at: Date;
}> = {}) {
  return {
    id: 'tc_123',
    teacher_id: 'tchr_123',
    course_id: 'course_123',
    course_title: 'High School Calculus',
    course_category: 'Mathematics',
    course_price: 99.99,
    created_at: new Date(),
    ...overrides,
  };
}

// ============================================
// Import after mocks are set up
// ============================================

import type { TrustLevel, VerificationStatus, TeachingMode as SharedTeachingMode } from '@shared/types';
import type {
  TeacherProfile,
  CreateTeacherDTO,
  UpdateTeacherDTO,
  AddQualificationDTO,
} from '@modules/teachers/teachers.service';
import {
  getTeacherById,
  getTeacherProfile,
  getTeacherByUserId,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  listTeachers,
  updateVerificationStatus,
  getVerifiedTeachers,
  getQualifications,
  addQualification,
  deleteQualification,
  getTeacherCourses,
  updateTeacherRating,
  addCourseToTeacher,
  removeCourseFromTeacher,
  updateQualificationStatus,
  incrementStudentCount,
  countTeachers,
  submitTeacherOnboarding,
  uploadQualification,
} from '@modules/teachers/teachers.service';

// ============================================
// Tests
// ============================================

describe('Teachers Service (PostgreSQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock query to return undefined by default
    mockPool.query.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTeacherById', () => {
    it('should return teacher when teacher exists', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockResolvedValue({ rows: [mockTeacher] });

      const result = await getTeacherById('tchr_123');

      expect(result).toEqual(mockTeacher);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM teachers WHERE id = $1'),
        ['tchr_123']
      );
    });

    it('should return null when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getTeacherById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTeacherProfile', () => {
    it('should return teacher profile with qualifications and courses', async () => {
      const mockTeacher = createMockTeacher();
      const mockQualifications = [createMockQualification()];
      const mockCourses = [createMockCourse()];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        if (query.includes('SELECT * FROM teacher_qualifications')) {
          return Promise.resolve({ rows: mockQualifications });
        }
        if (query.includes('SELECT tc.*')) {
          return Promise.resolve({ rows: mockCourses });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await getTeacherProfile('tchr_123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('tchr_123');
      expect(result?.displayName).toBe('John Doe');
      expect(result?.qualifications).toHaveLength(1);
      expect(result?.qualifications?.[0]?.name).toBe('Master of Education');
      expect(result?.courses).toHaveLength(1);
      expect(result?.courses?.[0]?.course_title).toBe('High School Calculus');
    });

    it('should return null when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getTeacherProfile('nonexistent');

      expect(result).toBeNull();
    });

    it('should return empty arrays when no qualifications or courses', async () => {
      const mockTeacher = createMockTeacher();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await getTeacherProfile('tchr_123');

      expect(result).toBeDefined();
      expect(result?.qualifications).toEqual([]);
      expect(result?.courses).toEqual([]);
    });
  });

  describe('getTeacherByUserId', () => {
    it('should return teacher when user has teacher profile', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockResolvedValue({ rows: [mockTeacher] });

      const result = await getTeacherByUserId('usr_123');

      expect(result).toEqual(mockTeacher);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM teachers WHERE user_id = $1'),
        ['usr_123']
      );
    });

    it('should return null when user has no teacher profile', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getTeacherByUserId('usr_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createTeacher', () => {
    it('should create teacher profile successfully', async () => {
      const newTeacher = createMockTeacher();
      delete newTeacher.id;
      newTeacher.user_id = 'usr_new';

      // First query to check existing teacher
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Second query to create teacher
      mockPool.query.mockResolvedValueOnce({ rows: [newTeacher] });

      const createDto: CreateTeacherDTO = {
        userId: 'usr_new',
        displayName: 'New Teacher',
        bio: 'Bio',
        teachingSubjects: ['Physics'],
        teachingModes: ['ONLINE' as SharedTeachingMode],
        locations: ['Auckland'],
      };

      const result = await createTeacher(createDto);

      expect(result).toBeDefined();
      expect(result.user_id).toBe('usr_new');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error when teacher already exists for user', async () => {
      const existingTeacher = createMockTeacher();
      mockPool.query.mockResolvedValue({ rows: [existingTeacher] });

      const createDto: CreateTeacherDTO = {
        userId: 'usr_123',
        displayName: 'Another Teacher',
        teachingSubjects: ['Math'],
        teachingModes: ['ONLINE' as SharedTeachingMode],
        locations: ['Auckland'],
      };

      await expect(createTeacher(createDto)).rejects.toThrow('Teacher profile already exists for this user');
    });

    it('should create teacher with qualifications', async () => {
      const newTeacher = createMockTeacher();
      delete newTeacher.id;
      newTeacher.user_id = 'usr_new';

      // Check for existing teacher
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Create teacher
      mockPool.query.mockResolvedValueOnce({ rows: [newTeacher] });
      // Insert qualification
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'qual_new',
          teacher_id: newTeacher.user_id,
          type: 'DEGREE',
          name: 'PhD in Chemistry',
          institution: 'University of Otago',
          year: 2020,
          status: 'PENDING',
          created_at: new Date(),
        }],
      });

      const createDto: CreateTeacherDTO = {
        userId: 'usr_new',
        displayName: 'Qualified Teacher',
        teachingSubjects: ['Chemistry'],
        teachingModes: ['BOTH' as SharedTeachingMode],
        locations: ['Christchurch'],
        qualifications: [
          {
            type: 'DEGREE',
            name: 'PhD in Chemistry',
            institution: 'University of Otago',
            year: 2020,
          },
        ],
      };

      const result = await createTeacher(createDto);

      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateTeacher', () => {
    it('should update teacher profile successfully', async () => {
      const existingTeacher = createMockTeacher();
      const updatedTeacher = {
        ...existingTeacher,
        display_name: 'Updated Name',
        bio: 'Updated bio',
      };

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [existingTeacher] });
        }
        if (query.includes('UPDATE teachers')) {
          return Promise.resolve({ rows: [updatedTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const updateDto: UpdateTeacherDTO = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };

      const result = await updateTeacher('tchr_123', updateDto);

      expect(result).toBeDefined();
      expect(result.display_name).toBe('Updated Name');
    });

    it('should throw error when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const updateDto: UpdateTeacherDTO = {
        displayName: 'Updated Name',
      };

      await expect(updateTeacher('nonexistent', updateDto)).rejects.toThrow('Teacher not found');
    });

    it('should throw error when update fails', async () => {
      const existingTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [existingTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const updateDto: UpdateTeacherDTO = {
        displayName: 'Updated Name',
      };

      await expect(updateTeacher('tchr_123', updateDto)).rejects.toThrow('Failed to update teacher');
    });

    it('should update teaching subjects', async () => {
      const existingTeacher = createMockTeacher();
      const updatedTeacher = {
        ...existingTeacher,
        teaching_subjects: ['Physics', 'Chemistry'],
      };

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [existingTeacher] });
        }
        return Promise.resolve({ rows: [updatedTeacher] });
      });

      const updateDto: UpdateTeacherDTO = {
        teachingSubjects: ['Physics', 'Chemistry'],
      };

      const result = await updateTeacher('tchr_123', updateDto);

      expect(result).toBeDefined();
      expect(result.teaching_subjects).toContain('Physics');
      expect(result.teaching_subjects).toContain('Chemistry');
    });
  });

  describe('deleteTeacher', () => {
    it('should delete teacher successfully', async () => {
      const existingTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [existingTeacher] });
        }
        return Promise.resolve({ rowCount: 1 });
      });

      const result = await deleteTeacher('tchr_123');

      expect(result).toBe(true);
    });

    it('should throw error when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(deleteTeacher('nonexistent')).rejects.toThrow('Teacher not found');
    });

    it('should throw error when delete fails', async () => {
      const existingTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [existingTeacher] });
        }
        return Promise.resolve({ rowCount: 0 });
      });

      await expect(deleteTeacher('tchr_123')).rejects.toThrow('Failed to delete teacher');
    });
  });

  describe('listTeachers', () => {
    it('should return list of teachers', async () => {
      const mockTeachers = [
        createMockTeacher({ id: 'tchr_1' }),
        createMockTeacher({ id: 'tchr_2' }),
      ];

      mockPool.query.mockResolvedValue({ rows: mockTeachers });

      const result = await listTeachers();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tchr_1');
      expect(result[1].id).toBe('tchr_2');
    });

    it('should filter teachers by verification status', async () => {
      const approvedTeachers = [
        createMockTeacher({ id: 'tchr_1', verification_status: 'APPROVED' }),
      ];

      mockPool.query.mockResolvedValue({ rows: approvedTeachers });

      const result = await listTeachers({ verificationStatus: 'APPROVED' as VerificationStatus });

      expect(result).toHaveLength(1);
      expect(result[0].verification_status).toBe('APPROVED');
    });

    it('should filter teachers by teaching subject', async () => {
      const mathTeachers = [
        createMockTeacher({ id: 'tchr_1', teaching_subjects: ['Mathematics'] }),
      ];

      mockPool.query.mockResolvedValue({ rows: mathTeachers });

      const result = await listTeachers({ teachingSubject: 'Mathematics' });

      expect(result).toHaveLength(1);
      expect(result[0].teaching_subjects).toContain('Mathematics');
    });

    it('should filter teachers by location', async () => {
      const aucklandTeachers = [
        createMockTeacher({ id: 'tchr_1', locations: ['Auckland'] }),
      ];

      mockPool.query.mockResolvedValue({ rows: aucklandTeachers });

      const result = await listTeachers({ location: 'Auckland' });

      expect(result).toHaveLength(1);
      expect(result[0].locations).toContain('Auckland');
    });

    it('should filter teachers by minimum rating', async () => {
      const highRatedTeachers = [
        createMockTeacher({ id: 'tchr_1', average_rating: 4.8 }),
      ];

      mockPool.query.mockResolvedValue({ rows: highRatedTeachers });

      const result = await listTeachers({ minRating: 4.5 });

      expect(result).toHaveLength(1);
      expect(result[0].average_rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should apply pagination', async () => {
      const teachers = [
        createMockTeacher({ id: 'tchr_1' }),
        createMockTeacher({ id: 'tchr_2' }),
      ];

      mockPool.query.mockResolvedValue({ rows: teachers });

      const result = await listTeachers({ limit: 10, offset: 0 });

      expect(result).toHaveLength(2);
    });
  });

  describe('updateVerificationStatus', () => {
    it('should update verification status successfully', async () => {
      const existingTeacher = createMockTeacher({ verification_status: 'PENDING' });
      const updatedTeacher = {
        ...existingTeacher,
        verification_status: 'APPROVED',
        trust_level: 'A',
      };

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [existingTeacher] });
        }
        return Promise.resolve({ rows: [updatedTeacher] });
      });

      const result = await updateVerificationStatus('tchr_123', 'APPROVED' as VerificationStatus, 'A' as TrustLevel);

      expect(result).toBeDefined();
      expect(result.verification_status).toBe('APPROVED');
      expect(result.trust_level).toBe('A');
    });

    it('should throw error when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(updateVerificationStatus('nonexistent', 'APPROVED')).rejects.toThrow('Teacher not found');
    });

    it('should throw error when update fails', async () => {
      const existingTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [existingTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(updateVerificationStatus('tchr_123', 'APPROVED')).rejects.toThrow('Failed to update verification status');
    });
  });

  describe('getVerifiedTeachers', () => {
    it('should return list of verified teachers', async () => {
      const verifiedTeachers = [
        createMockTeacher({ id: 'tchr_1', verification_status: 'APPROVED' }),
        createMockTeacher({ id: 'tchr_2', verification_status: 'APPROVED' }),
      ];

      mockPool.query.mockResolvedValue({ rows: verifiedTeachers });

      const result = await getVerifiedTeachers();

      expect(result).toHaveLength(2);
      expect(result.every(t => t.verification_status === 'APPROVED')).toBe(true);
    });
  });

  describe('getTeacherQualifications', () => {
    it('should return qualifications for teacher', async () => {
      const mockTeacher = createMockTeacher();
      const mockQualifications = [
        createMockQualification({ id: 'qual_1' }),
        createMockQualification({ id: 'qual_2' }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: mockQualifications });
      });

      const result = await getQualifications('tchr_123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('qual_1');
      expect(result[1].id).toBe('qual_2');
    });

    it('should throw error when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(getQualifications('nonexistent')).rejects.toThrow('Teacher not found');
    });
  });

  describe('addQualification', () => {
    it('should add qualification successfully', async () => {
      const mockTeacher = createMockTeacher();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({
          rows: [{
            id: 'qual_new',
            teacher_id: mockTeacher.id,
            type: 'DEGREE',
            name: 'PhD in Education',
            institution: 'University of Auckland',
            year: 2022,
            file_url: null,
            status: 'PENDING',
            created_at: new Date(),
          }],
        });
      });

      const addQualDto: AddQualificationDTO = {
        type: 'DEGREE',
        name: 'PhD in Education',
        institution: 'University of Auckland',
        year: 2022,
      };

      const result = await addQualification('tchr_123', addQualDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('PhD in Education');
      expect(result.status).toBe('PENDING');
    });

    it('should throw error when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const addQualDto: AddQualificationDTO = {
        type: 'CERTIFICATE',
        name: 'Teaching Certificate',
      };

      await expect(addQualification('nonexistent', addQualDto)).rejects.toThrow('Teacher not found');
    });

    it('should add experience qualification', async () => {
      const mockTeacher = createMockTeacher();
      const experienceQual = createMockQualification({
        type: 'EXPERIENCE',
        name: '10 Years Teaching',
      });

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({
          rows: [{
            id: experienceQual.id,
            teacher_id: experienceQual.teacher_id,
            type: experienceQual.type,
            name: experienceQual.name,
            status: 'PENDING',
            created_at: experienceQual.created_at,
          }],
        });
      });

      const addQualDto: AddQualificationDTO = {
        type: 'EXPERIENCE',
        name: '10 Years Teaching',
      };

      const result = await addQualification('tchr_123', addQualDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('EXPERIENCE');
    });
  });

  describe('deleteQualification', () => {
    it('should delete qualification successfully', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await deleteQualification('qual_123');

      expect(result).toBe(true);
    });

    it('should throw error when qualification not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      await expect(deleteQualification('nonexistent')).rejects.toThrow('Qualification not found');
    });
  });

  describe('getTeacherCourses', () => {
    it('should return courses for teacher', async () => {
      const mockTeacher = createMockTeacher();
      const mockCourses = [
        createMockCourse({ id: 'tc_1', course_title: 'Calculus I' }),
        createMockCourse({ id: 'tc_2', course_title: 'Calculus II' }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: mockCourses });
      });

      const result = await getTeacherCourses('tchr_123');

      expect(result).toHaveLength(2);
      expect(result[0].course_title).toBe('Calculus I');
      expect(result[1].course_title).toBe('Calculus II');
    });

    it('should throw error when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(getTeacherCourses('nonexistent')).rejects.toThrow('Teacher not found');
    });

    it('should return empty array when no courses', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await getTeacherCourses('tchr_123');

      expect(result).toEqual([]);
    });
  });

  describe('updateTeacherRating', () => {
    it('should update teacher rating successfully', async () => {
      const updatedTeacher = createMockTeacher({ average_rating: 4.8, total_reviews: 30 });

      mockPool.query.mockResolvedValue({ rows: [updatedTeacher] });

      const result = await updateTeacherRating('tchr_123', 4.8, 30);

      expect(result).toBeDefined();
      expect(result?.average_rating).toBe(4.8);
      expect(result?.total_reviews).toBe(30);
    });

    it('should return null when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await updateTeacherRating('nonexistent', 4.5, 10);

      expect(result).toBeNull();
    });

    it('should handle new rating with no reviews', async () => {
      const updatedTeacher = createMockTeacher({ average_rating: 5.0, total_reviews: 1 });

      mockPool.query.mockResolvedValue({ rows: [updatedTeacher] });

      const result = await updateTeacherRating('tchr_123', 5.0, 1);

      expect(result).toBeDefined();
      expect(result?.average_rating).toBe(5.0);
    });
  });

  describe('Error Cases', () => {
    it('should handle repository error for getTeacherById', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(getTeacherById('tchr_123')).rejects.toThrow('Database error');
    });

    it('should handle repository error for getTeacherProfile', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.reject(new Error('Database error'));
      });

      await expect(getTeacherProfile('tchr_123')).rejects.toThrow('Database error');
    });

    it('should handle repository error for createTeacher', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const createDto: CreateTeacherDTO = {
        userId: 'usr_new',
        displayName: 'New Teacher',
        teachingSubjects: ['Math'],
        teachingModes: ['ONLINE' as SharedTeachingMode],
        locations: ['Auckland'],
      };

      await expect(createTeacher(createDto)).rejects.toThrow('Database error');
    });

    it('should handle repository error for updateTeacher', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.reject(new Error('Database error'));
      });

      const updateDto: UpdateTeacherDTO = {
        displayName: 'Updated Name',
      };

      await expect(updateTeacher('tchr_123', updateDto)).rejects.toThrow('Database error');
    });

    it('should handle repository error for deleteTeacher', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.reject(new Error('Database error'));
      });

      await expect(deleteTeacher('tchr_123')).rejects.toThrow('Database error');
    });

    it('should handle repository error for listTeachers', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(listTeachers()).rejects.toThrow('Database error');
    });

    it('should handle repository error for addQualification', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.reject(new Error('Database error'));
      });

      const addQualDto: AddQualificationDTO = {
        type: 'CERTIFICATE',
        name: 'Certificate',
      };

      await expect(addQualification('tchr_123', addQualDto)).rejects.toThrow('Database error');
    });

    it('should handle repository error for deleteQualification', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(deleteQualification('qual_123')).rejects.toThrow('Database error');
    });

    it('should handle repository error for getTeacherCourses', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM teachers')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.reject(new Error('Database error'));
      });

      await expect(getTeacherCourses('tchr_123')).rejects.toThrow('Database error');
    });

    it('should handle repository error for updateVerificationStatus', async () => {
      const mockTeacher = createMockTeacher();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.reject(new Error('Database error'));
      });

      await expect(updateVerificationStatus('tchr_123', 'APPROVED')).rejects.toThrow('Database error');
    });

    it('should handle repository error for updateTeacherRating', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(updateTeacherRating('tchr_123', 4.5, 10)).rejects.toThrow('Database error');
    });
  });

  describe('addCourseToTeacher', () => {
    it('should add course to teacher successfully', async () => {
      const now = new Date();
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 'tc_new',
          teacher_id: 'tchr_123',
          course_id: 'course_123',
          course_title: 'Calculus I',
          course_category: 'Mathematics',
          course_price: 99.99,
          created_at: now,
        }],
      });

      const result = await addCourseToTeacher('tchr_123', 'course_123', 99.99);

      expect(result).toBeDefined();
      expect(result.course_id).toBe('course_123');
    });

    it('should handle repository error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(addCourseToTeacher('tchr_123', 'course_123', 99.99)).rejects.toThrow('Database error');
    });
  });

  describe('removeCourseFromTeacher', () => {
    it('should handle repository error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(removeCourseFromTeacher('tchr_123', 'course_123')).rejects.toThrow('Database error');
    });
  });

  describe('updateQualificationStatus', () => {
    it('should update qualification status successfully', async () => {
      const now = new Date();
      const mockQualification = createMockQualification({ status: 'PENDING' });
      const updatedQualification = { ...mockQualification, status: 'APPROVED' };

      mockPool.query.mockResolvedValue({ rows: [updatedQualification] });

      const result = await updateQualificationStatus('qual_123', 'APPROVED' as VerificationStatus);

      expect(result).toBeDefined();
      expect(result.status).toBe('APPROVED');
    });

    it('should handle repository error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(updateQualificationStatus('qual_123', 'APPROVED')).rejects.toThrow('Database error');
    });
  });

  describe('incrementStudentCount', () => {
    it('should increment student count successfully', async () => {
      const mockTeacher = createMockTeacher({ total_students: 150 });
      const updatedTeacher = { ...mockTeacher, total_students: 151 };

      mockPool.query.mockResolvedValue({ rows: [updatedTeacher] });

      const result = await incrementStudentCount('tchr_123');

      expect(result).toBeDefined();
      expect(result?.total_students).toBe(151);
    });

    it('should return null when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await incrementStudentCount('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle repository error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(incrementStudentCount('tchr_123')).rejects.toThrow('Database error');
    });
  });

  describe('countTeachers', () => {
    it('should return count of teachers', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await countTeachers();

      expect(result).toBe(42);
    });

    it('should return count with filters', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '10' }] });

      const result = await countTeachers({ verificationStatus: 'APPROVED' as VerificationStatus });

      expect(result).toBe(10);
    });

    it('should handle repository error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(countTeachers()).rejects.toThrow('Database error');
    });
  });

  describe('submitTeacherOnboarding', () => {
    it('should handle repository error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(submitTeacherOnboarding('usr_123', {
        displayName: 'John Doe',
        bio: 'Experienced teacher',
        teachingSubjects: ['Mathematics'],
        teachingModes: ['ONLINE' as SharedTeachingMode],
        locations: ['Auckland'],
      })).rejects.toThrow('Database error');
    });
  });

  describe('uploadQualification', () => {
    it('should upload qualification successfully', async () => {
      const now = new Date();
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 'qual_new',
          teacher_id: 'tchr_123',
          type: 'DEGREE',
          name: 'PhD',
          institution: null,
          year: null,
          file_url: null,
          status: 'PENDING',
          created_at: now,
        }],
      });

      const result = await uploadQualification('tchr_123', {
        type: 'DEGREE',
        name: 'PhD',
      });

      expect(result).toBeDefined();
      expect(result.qualificationId).toBe('qual_new');
      expect(result.status).toBe('PENDING');
    });

    it('should handle repository error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(uploadQualification('tchr_123', {
        type: 'DEGREE',
        name: 'PhD',
      })).rejects.toThrow('Database error');
    });
  });
});
