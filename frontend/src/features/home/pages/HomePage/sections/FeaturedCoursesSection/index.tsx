import React from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { CourseList } from '@/features/course/pages/CourseSearchPage/components/CourseList';
import type { CourseData } from '@/data/courseData';
import styles from './FeaturedCoursesSection.module.scss';

// ============================================
// Types
// ============================================

interface FeaturedCoursesSectionProps {
  courses?: CourseData[];
  isLoading?: boolean;
  error?: Error | null;
}

// ============================================
// Component
// ============================================

export const FeaturedCoursesSection: React.FC<FeaturedCoursesSectionProps> = ({
  courses = [],
  isLoading = false,
  error = null,
}) => {
  const { t } = useTranslation();

  // Handler for pagination (not needed for featured, but required by CourseList)
  const handlePageChange = (_page: number) => {
    // Featured courses don't need pagination
  };

  // Convert to CourseData array and add defaults for optional fields
  const displayCourses = courses.map(course => ({
    ...course,
    lessonDuration: course.lessonDuration || 60,
    language: course.language || '中文授课',
    schedule: course.schedule || '灵活时间',
  }));

  return (
    <section className={styles.featuredSection}>
      <div className={styles.featuredContent}>
        <CourseList
          courses={displayCourses}
          totalCount={displayCourses.length}
          currentPage={1}
          totalPages={1}
          onPageChange={handlePageChange}
          title={t('courses.featured')}
          viewAllLink={ROUTES.COURSES}
          viewAllText={t('courses.viewAll')}
          showCount={false}
          emptyTitle={isLoading ? t('loading') : t('courses.empty.title')}
          emptyDescription={isLoading ? '' : t('courses.empty.description')}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </section>
  );
};

export default FeaturedCoursesSection;
