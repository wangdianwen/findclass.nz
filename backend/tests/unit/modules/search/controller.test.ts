/**
 * Search Controller Unit Tests
 */

vi.mock('@src/modules/search/service', () => ({
  getPopularSearches: vi.fn(),
  getSearchSuggestions: vi.fn(),
}));

vi.mock('@src/core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@src/shared/types/api', () => ({
  createSuccessResponse: vi.fn((data, message, language, requestId) => ({
    success: true,
    data,
    message,
    meta: { requestId, language, timestamp: expect.any(String) },
  })),
}));

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getPopularSearchController,
  getSearchSuggestionsController,
} from '@src/modules/search/controller';
import {
  getPopularSearches,
  getSearchSuggestions,
} from '@src/modules/search/service';

describe('SearchController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {
        'x-request-id': 'test-request-id',
      },
      query: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  // ==================== getPopularSearchController ====================

  describe('getPopularSearchController', () => {
    it('should return popular searches successfully', () => {
      const mockKeywords = ['高中数学', '雅思英语', '钢琴辅导', '编程入门', '物理补习'];
      (getPopularSearches as Mock).mockReturnValue(mockKeywords);

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(getPopularSearches).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockKeywords,
          message: 'Popular searches retrieved successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass requestId to response', () => {
      const mockKeywords = ['高中数学', '雅思英语', '钢琴辅导', '编程入门', '物理补习'];
      (getPopularSearches as Mock).mockReturnValue(mockKeywords);

      mockReq.headers = { 'x-request-id': 'custom-request-id' };

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'custom-request-id',
          }),
        })
      );
    });

    it('should call next on error', () => {
      (getPopularSearches as Mock).mockImplementation(() => {
        throw new Error('Service error');
      });

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Service error'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle empty popular searches', () => {
      (getPopularSearches as Mock).mockReturnValue([]);

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          message: 'Popular searches retrieved successfully',
        })
      );
    });

    it('should return success response with correct structure', () => {
      const mockKeywords = ['高中数学', '雅思英语', '钢琴辅导', '编程入门', '物理补习'];
      (getPopularSearches as Mock).mockReturnValue(mockKeywords);

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          message: expect.any(String),
          meta: expect.objectContaining({
            requestId: expect.any(String),
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should handle missing requestId header', () => {
      const mockKeywords = ['高中数学', '雅思英语', '钢琴辅导', '编程入门', '物理补习'];
      (getPopularSearches as Mock).mockReturnValue(mockKeywords);

      mockReq.headers = {};

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return all popular keywords from service', () => {
      const mockKeywords = ['math', 'english', 'piano', 'coding', 'physics'];
      (getPopularSearches as Mock).mockReturnValue(mockKeywords);

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: ['math', 'english', 'piano', 'coding', 'physics'],
        })
      );
    });

    it('should not set status code (default 200)', () => {
      const mockKeywords = ['高中数学', '雅思英语', '钢琴辅导', '编程入门', '物理补习'];
      (getPopularSearches as Mock).mockReturnValue(mockKeywords);

      getPopularSearchController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // ==================== getSearchSuggestionsController ====================

  describe('getSearchSuggestionsController', () => {
    const mockSuggestions = [
      {
        id: 'course_1',
        title: '高中数学辅导',
        type: 'course' as const,
        teacherName: '张老师',
        subject: 'MATH',
      },
      {
        id: 'course_2',
        title: 'Advanced Mathematics',
        type: 'course' as const,
        teacherName: 'John Smith',
        subject: 'MATH',
      },
    ];

    it('should return suggestions for valid query', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).toHaveBeenCalledWith('math');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSuggestions,
          message: 'Search suggestions retrieved successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return empty array for empty query', async () => {
      mockReq.query = { q: '' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          message: 'Search suggestions retrieved successfully',
        })
      );
    });

    it('should return empty array for whitespace-only query', async () => {
      mockReq.query = { q: '   ' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
        })
      );
    });

    it('should return empty array when query parameter is missing', async () => {
      mockReq.query = {};

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
        })
      );
    });

    it('should call next on error', async () => {
      (getSearchSuggestions as Mock).mockRejectedValue(new Error('Database error'));
      mockReq.query = { q: 'math' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(new Error('Database error'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should pass requestId to response', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math' };
      mockReq.headers = { 'x-request-id': 'suggestions-request-id' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'suggestions-request-id',
          }),
        })
      );
    });

    it('should handle empty suggestions array', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue([]);
      mockReq.query = { q: 'nonexistent' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          message: 'Search suggestions retrieved successfully',
        })
      );
    });

    it('should handle Chinese characters in query', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: '数学' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).toHaveBeenCalledWith('数学');
    });

    it('should handle special characters in query', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math & science' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).toHaveBeenCalledWith('math & science');
    });

    it('should handle query with leading/trailing spaces', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: '  math  ' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).toHaveBeenCalledWith('  math  ');
    });

    it('should not set status code (default 200)', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return success response with correct structure', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          message: expect.any(String),
          meta: expect.objectContaining({
            requestId: expect.any(String),
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should handle missing requestId header', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math' };
      mockReq.headers = {};

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass query parameter as string', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'test query' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).toHaveBeenCalledWith('test query');
    });

    it('should handle single character query', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'm' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).toHaveBeenCalledWith('m');
    });

    it('should handle undefined query parameter', async () => {
      mockReq.query = { q: undefined };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
        })
      );
    });

    it('should handle null query parameter', async () => {
      mockReq.query = { q: null as unknown as string };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
        })
      );
    });

    it('should return correct message for suggestions', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Search suggestions retrieved successfully',
        })
      );
    });

    it('should preserve all suggestion fields in response', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
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
          ],
        })
      );
    });

    it('should handle multiple requests in sequence', async () => {
      (getSearchSuggestions as Mock)
        .mockResolvedValueOnce([mockSuggestions[0]])
        .mockResolvedValueOnce([mockSuggestions[1]]);

      mockReq.query = { q: 'math' };
      await getSearchSuggestionsController(mockReq as Request, mockRes as Response, mockNext);

      expect(getSearchSuggestions).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      mockReq.query = { q: 'physics' };
      await getSearchSuggestionsController(mockReq as Request, mockRes as Response, mockNext);

      expect(getSearchSuggestions).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
    });

    it('should trim query before checking if empty', async () => {
      mockReq.query = { q: '\t  \n  ' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
        })
      );
    });

    it('should handle query with newlines and tabs', async () => {
      (getSearchSuggestions as Mock).mockResolvedValue(mockSuggestions);
      mockReq.query = { q: 'math\nscience\tphysics' };

      await getSearchSuggestionsController(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(getSearchSuggestions).toHaveBeenCalledWith('math\nscience\tphysics');
    });
  });
});
