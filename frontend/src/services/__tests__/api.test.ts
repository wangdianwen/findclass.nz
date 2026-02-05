import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../api', () => ({
  courseApi: {
    getCourses: vi.fn((_params?: Record<string, unknown>) =>
      Promise.resolve({ data: [{ id: '1', title: 'Math Course' }], total: 1 })
    ),
    getCourseById: vi.fn((_id: string) => Promise.resolve({ id: '1', title: 'Math Course' })),
    searchCourses: vi.fn((_keyword: string) =>
      Promise.resolve([{ id: '1', title: 'Math Course' }])
    ),
    getFeaturedCourses: vi.fn((_limit: number = 6) =>
      Promise.resolve([{ id: '1', title: 'Featured' }])
    ),
  },
  tutorApi: {
    getTutors: vi.fn((_params?: Record<string, unknown>) =>
      Promise.resolve([{ id: '1', name: 'John' }])
    ),
    getTutorById: vi.fn((_id: string) => Promise.resolve({ id: '1', name: 'John' })),
  },
  searchApi: {
    getPopularSearches: vi.fn(() => Promise.resolve(['Python', 'Math'])),
    getSuggestions: vi.fn((_keyword: string) => Promise.resolve(['Python Course'])),
  },
}));

import { courseApi, tutorApi, searchApi } from '../api';

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('courseApi', () => {
    it('getCourses should fetch courses with params', async () => {
      const result = await courseApi.getCourses({ city: 'Auckland' });

      expect(courseApi.getCourses).toHaveBeenCalledWith({ city: 'Auckland' });
      expect(result).toEqual({ data: [{ id: '1', title: 'Math Course' }], total: 1 });
    });

    it('getCourseById should fetch single course', async () => {
      const result = await courseApi.getCourseById('1');

      expect(courseApi.getCourseById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1', title: 'Math Course' });
    });

    it('searchCourses should search with keyword', async () => {
      const result = await courseApi.searchCourses('math');

      expect(courseApi.searchCourses).toHaveBeenCalledWith('math');
      expect(result).toEqual([{ id: '1', title: 'Math Course' }]);
    });

    it('getFeaturedCourses should fetch featured courses', async () => {
      const result = await courseApi.getFeaturedCourses(6);

      expect(courseApi.getFeaturedCourses).toHaveBeenCalledWith(6);
      expect(result).toEqual([{ id: '1', title: 'Featured' }]);
    });
  });

  describe('tutorApi', () => {
    it('getTutors should fetch tutors', async () => {
      const result = await tutorApi.getTutors({ city: 'Auckland' });

      expect(tutorApi.getTutors).toHaveBeenCalledWith({ city: 'Auckland' });
      expect(result).toEqual([{ id: '1', name: 'John' }]);
    });

    it('getTutorById should fetch single tutor', async () => {
      const result = await tutorApi.getTutorById('1');

      expect(tutorApi.getTutorById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1', name: 'John' });
    });
  });

  describe('searchApi', () => {
    it('getPopularSearches should fetch popular searches', async () => {
      const result = await searchApi.getPopularSearches();

      expect(searchApi.getPopularSearches).toHaveBeenCalled();
      expect(result).toEqual(['Python', 'Math']);
    });

    it('getSuggestions should fetch suggestions', async () => {
      const result = await searchApi.getSuggestions('pyth');

      expect(searchApi.getSuggestions).toHaveBeenCalledWith('pyth');
      expect(result).toEqual(['Python Course']);
    });
  });
});
