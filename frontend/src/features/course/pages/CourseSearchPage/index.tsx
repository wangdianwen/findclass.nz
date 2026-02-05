import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/shared';
import { Footer } from '@/components/shared';
import { CourseSearchPanel } from './components';
import { CourseList } from './components';
import { courseApi } from '@/services/api';
import type { CourseData } from '@/data/courseData';
import styles from './CourseSearchPage.module.scss';

// ============================================
// Types
// ============================================

interface FilterState {
  keyword: string;
  region: string[];
  subject: string | null;
  grade: string | null;
  teachingMode: string | null;
  trustLevel: string | null;
  sortBy: string;
}

// Pagination config
const PAGE_SIZE = 6;

// ============================================
// Helper: Read initial filters from sessionStorage
// ============================================

const getInitialFilters = (): Partial<FilterState> => {
  const savedFilters = sessionStorage.getItem('courseFilters');
  if (!savedFilters) return {};

  try {
    const parsed = JSON.parse(savedFilters);
    const initialFilters: Partial<FilterState> = {};

    if (parsed.keyword && typeof parsed.keyword === 'string') {
      initialFilters.keyword = parsed.keyword;
    }
    if (parsed.region && Array.isArray(parsed.region)) {
      initialFilters.region = parsed.region;
    }
    if (parsed.subject && typeof parsed.subject === 'string') {
      initialFilters.subject = parsed.subject;
    }
    if (parsed.grade && typeof parsed.grade === 'string') {
      initialFilters.grade = parsed.grade;
    }
    if (parsed.teachingMode && typeof parsed.teachingMode === 'string') {
      initialFilters.teachingMode = parsed.teachingMode;
    }
    if (parsed.trustLevel && typeof parsed.trustLevel === 'string') {
      initialFilters.trustLevel = parsed.trustLevel;
    }

    // Clear sessionStorage after reading
    sessionStorage.removeItem('courseFilters');
    return initialFilters;
  } catch {
    return {};
  }
};

// ============================================
// Main Component
// ============================================

export const CourseSearchPage: React.FC = () => {
  // Get initial filters from sessionStorage
  const initialFilters = React.useMemo(() => getInitialFilters(), []);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    keyword: initialFilters.keyword || '',
    region: initialFilters.region || [],
    subject: initialFilters.subject || null,
    grade: initialFilters.grade || null,
    teachingMode: initialFilters.teachingMode || null,
    trustLevel: initialFilters.trustLevel || null,
    sortBy: 'best-match',
  });

  // Local keyword state for immediate UI feedback
  const [localKeyword, setLocalKeyword] = useState(initialFilters.keyword || '');

  // Pagination state (cursor-based)
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    const filterKey = `${filters.keyword}|${filters.region.join(',')}|${filters.subject}|${filters.grade}|${filters.teachingMode}|${filters.trustLevel}|${filters.sortBy}`;
    const prevFilterKey = sessionStorage.getItem('prevFilterKey') || '';

    if (prevFilterKey !== filterKey) {
      sessionStorage.setItem('prevFilterKey', filterKey);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const timer = setTimeout(() => setCurrentPage(1), 0);
      return () => clearTimeout(timer);
    }
  }, [
    filters.keyword,
    filters.region,
    filters.subject,
    filters.grade,
    filters.teachingMode,
    filters.trustLevel,
    filters.sortBy,
  ]);

  // ============================================
  // Course Data Fetching via API
  // ============================================

  // Build API params from filters
  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
      limit: PAGE_SIZE,
    };

    // City is passed as first element of region array
    if (filters.region.length > 0) {
      params.city = filters.region[0];
    }

    if (filters.subject) {
      params.subject = filters.subject;
    }

    if (filters.grade) {
      params.grade = filters.grade;
    }

    return params;
  }, [filters.region, filters.subject, filters.grade, currentPage]);

  // Fetch courses from API
  const { data, isLoading, error, refetch } = useQuery<{ data: CourseData[]; total: number }>({
    queryKey: ['courses', apiParams],
    queryFn: () => courseApi.getCourses({
      city: apiParams.city as string | undefined,
      subject: apiParams.subject as string | undefined,
      grade: apiParams.grade as string | undefined,
      page: apiParams.page as number | undefined,
      limit: apiParams.limit as number | undefined,
    }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    refetch();
  }, [filters, refetch]);

  // Extract courses and total from API response
  // Note: data may be undefined initially or on error, ensure courses is always an array
  const courses: CourseData[] = (Array.isArray(data?.data) ? data.data : []);
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Add defaults for optional fields (for display consistency)
  const displayCourses = courses.map(course => ({
    ...course,
    lessonDuration: course.lessonDuration || 60,
    language: course.language || '中文授课',
    schedule: course.schedule || '灵活时间',
  }));

  // ============================================
  // Event Handlers
  // ============================================

  const handleFilterChange = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleKeywordChange = useCallback((keyword: string) => {
    setLocalKeyword(keyword);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className={styles.courseSearchPage} data-testid="course-search-page">
      <Header onLanguageChange={() => {}} />

      <div className={styles.headerSpacer} />

      <div className={styles.mainContent}>
        {/* Search Panel - Contains search and filters */}
        <CourseSearchPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          localKeyword={localKeyword}
          onKeywordChange={handleKeywordChange}
        />

        {/* Course List - Reusable component with pagination */}
        <CourseList
          courses={displayCourses}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          error={error}
        />
      </div>

      <Footer />
    </div>
  );
};

export default CourseSearchPage;
