/**
 * Search Service Unit Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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

// Import after mocks are set up
import { getPopularSearches, getSearchSuggestions } from '@src/modules/search/service';
import type { SearchSuggestion } from '@src/modules/search/types';

describe('Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== getPopularSearches ====================

  describe('getPopularSearches', () => {
    it('should return array of popular search keywords', () => {
      const result = getPopularSearches();

      expect(result).toEqual([
        '高中数学',
        '雅思英语',
        '钢琴辅导',
        '编程入门',
        '物理补习',
      ]);
    });

    it('should return exactly 5 popular keywords', () => {
      const result = getPopularSearches();

      expect(result).toHaveLength(5);
    });

    it('should return strings', () => {
      const result = getPopularSearches();

      result.forEach(keyword => {
        expect(typeof keyword).toBe('string');
      });
    });

    it('should return consistent results on multiple calls', () => {
      const result1 = getPopularSearches();
      const result2 = getPopularSearches();

      expect(result1).toEqual(result2);
    });
  });

  // ==================== getSearchSuggestions ====================

  describe('getSearchSuggestions', () => {
    const mockCourseRows = [
      {
        id: 'course_1',
        title: '高中数学辅导',
        category: 'MATH',
        teacher_name: '张老师',
      },
      {
        id: 'course_2',
        title: 'Advanced Mathematics',
        category: 'MATH',
        teacher_name: 'John Smith',
      },
      {
        id: 'course_3',
        title: 'Physics 101',
        category: 'PHYSICS',
        teacher_name: 'Dr. Brown',
      },
    ];

    const expectedSuggestions: SearchSuggestion[] = [
      {
        id: 'course_1',
        title: '高中数学辅导',
        type: 'course',
        teacherName: '张老师',
        subject: 'MATH',
      },
      {
        id: 'course_2',
        title: 'Advanced Mathematics',
        type: 'course',
        teacherName: 'John Smith',
        subject: 'MATH',
      },
      {
        id: 'course_3',
        title: 'Physics 101',
        type: 'course',
        teacherName: 'Dr. Brown',
        subject: 'PHYSICS',
      },
    ];

    it('should return suggestions for valid query', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const result = await getSearchSuggestions('math');

      expect(result).toEqual(expectedSuggestions);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title, c.category, t.display_name as teacher_name'),
        expect.arrayContaining([expect.anything(), expect.anything()])
      );
    });

    it('should return empty array for empty query', async () => {
      const result = await getSearchSuggestions('');

      expect(result).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await getSearchSuggestions('   ');

      expect(result).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return empty array for undefined query', async () => {
      const result = await getSearchSuggestions(undefined as unknown as string);

      expect(result).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should use ILIKE for case-insensitive fuzzy matching', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('MATH');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%math%', 5])
      );
    });

    it('should normalize query to lowercase', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('MATH Course');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%math course%', 5]
      );
    });

    it('should trim whitespace from query', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('  math  ');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%math%', 5]
      );
    });

    it('should limit results to MAX_SUGGESTIONS', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([expect.anything(), 5])
      );
    });

    it('should search in course title', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('c.title ILIKE'),
        expect.anything()
      );
    });

    it('should search in course category', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('c.category ILIKE'),
        expect.anything()
      );
    });

    it('should search in course description', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('c.description ILIKE'),
        expect.anything()
      );
    });

    it('should search in teacher display name', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('张老师');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('t.display_name ILIKE'),
        expect.anything()
      );
    });

    it('should filter by ACTIVE course status', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("c.status = 'ACTIVE'"),
        expect.anything()
      );
    });

    it('should order by average rating DESC and total reviews DESC', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY c.average_rating DESC NULLS LAST, c.total_reviews DESC'),
        expect.anything()
      );
    });

    it('should map database rows to SearchSuggestion type', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const result = await getSearchSuggestions('math');

      expect(result[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        type: 'course',
        teacherName: expect.any(String),
        subject: expect.any(String),
      });
    });

    it('should handle null teacher name', async () => {
      const rowsWithNullTeacher = [
        {
          id: 'course_1',
          title: 'Math Course',
          category: 'MATH',
          teacher_name: null,
        },
      ];
      mockPool.query.mockResolvedValue({ rows: rowsWithNullTeacher });

      const result = await getSearchSuggestions('math');

      expect(result[0].teacherName).toBe('Unknown Teacher');
    });

    it('should handle undefined teacher name', async () => {
      const rowsWithUndefinedTeacher = [
        {
          id: 'course_1',
          title: 'Math Course',
          category: 'MATH',
          teacher_name: undefined,
        },
      ];
      mockPool.query.mockResolvedValue({ rows: rowsWithUndefinedTeacher });

      const result = await getSearchSuggestions('math');

      expect(result[0].teacherName).toBe('Unknown Teacher');
    });

    it('should return empty array when no results found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getSearchSuggestions('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle query with special characters', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math & science');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%math & science%', 5]
      );
    });

    it('should handle Chinese characters in query', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockCourseRows[0]] });

      await getSearchSuggestions('高中');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%高中%', 5]
      );
    });

    it('should handle mixed language queries', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math 数学');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%math 数学%', 5]
      );
    });

    it('should join courses and teachers tables', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN teachers t ON c.teacher_id = t.id'),
        expect.anything()
      );
    });

    it('should return suggestions in correct order (highest rated first)', async () => {
      const orderedRows = [
        {
          id: 'course_1',
          title: 'Best Math',
          category: 'MATH',
          teacher_name: 'Teacher A',
        },
        {
          id: 'course_2',
          title: 'Good Math',
          category: 'MATH',
          teacher_name: 'Teacher B',
        },
      ];
      mockPool.query.mockResolvedValue({ rows: orderedRows });

      const result = await getSearchSuggestions('math');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('course_1');
      expect(result[1].id).toBe('course_2');
    });

    it('should handle very long queries', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const longQuery = 'a'.repeat(200);
      await getSearchSuggestions(longQuery);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        [`%${longQuery}%`, 5]
      );
    });

    it('should handle query with only numbers', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('101');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%101%', 5]
      );
    });

    it('should handle query with tabs', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math\t\t');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%math%', 5]
      );
    });

    it('should handle query with newlines', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('math\n\n');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%math%', 5]
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const result = await getSearchSuggestions('math');

      expect(result).toEqual([]);
    });

    it('should preserve original title from database', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const result = await getSearchSuggestions('math');

      expect(result[0].title).toBe('高中数学辅导');
      expect(result[1].title).toBe('Advanced Mathematics');
    });

    it('should preserve original category from database', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const result = await getSearchSuggestions('math');

      expect(result[0].subject).toBe('MATH');
      expect(result[2].subject).toBe('PHYSICS');
    });

    it('should preserve original teacher name from database', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const result = await getSearchSuggestions('math');

      expect(result[0].teacherName).toBe('张老师');
      expect(result[1].teacherName).toBe('John Smith');
    });

    it('should always return type as "course"', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const result = await getSearchSuggestions('math');

      result.forEach(suggestion => {
        expect(suggestion.type).toBe('course');
      });
    });

    it('should handle single character query', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      await getSearchSuggestions('m');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        ['%m%', 5]
      );
    });

    it('should return empty array for query with only spaces', async () => {
      const result = await getSearchSuggestions('     ');

      expect(result).toEqual([]);
    });

    it('should return suggestions preserving case sensitivity from database', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCourseRows });

      const result = await getSearchSuggestions('math');

      expect(result[0].title).toBe('高中数学辅导');
      expect(result[1].title).toBe('Advanced Mathematics');
    });
  });
});
