import React from 'react';
import { useTranslation } from 'react-i18next';
import { CourseStats as CourseStatsType } from '../teacherData';
import styles from './CourseStats.module.scss';

// ============================================
// Types
// ============================================

interface CourseStatsProps {
  stats: CourseStatsType;
  maxPublishedCourses?: number;
}

// ============================================
// Component
// ============================================

export const CourseStats: React.FC<CourseStatsProps> = ({ stats, maxPublishedCourses }) => {
  const { t } = useTranslation('courseManagement');

  // Check if published courses at or exceed the limit
  const isPublishedAtLimit = maxPublishedCourses
    ? stats.publishedCourses >= maxPublishedCourses
    : false;

  const statItems = [
    {
      key: 'totalCourses',
      value: stats.totalCourses,
      label: t('stats.totalCourses'),
      highlight: false,
    },
    {
      key: 'publishedCourses',
      value: stats.publishedCourses,
      label: maxPublishedCourses
        ? `${t('stats.publishedCourses')} (${stats.publishedCourses}/${maxPublishedCourses})`
        : t('stats.publishedCourses'),
      highlight: isPublishedAtLimit ? 'error' : 'success',
    },
    {
      key: 'draftCourses',
      value: stats.draftCourses,
      label: t('stats.draftCourses'),
      highlight: false,
    },
    {
      key: 'pausedCourses',
      value: stats.pausedCourses,
      label: t('stats.pausedCourses'),
      highlight: false,
    },
  ];

  return (
    <div className={styles.statsContainer} data-testid="course-stats">
      {statItems.map(item => (
        <div
          key={item.key}
          className={`${styles.statCard} ${item.highlight === 'success' ? styles.statCardSuccess : ''} ${item.highlight === 'error' ? styles.statCardError : ''} ${item.highlight === true ? styles.statCardHighlight : ''}`}
          data-testid={`stat-${item.key}`}
        >
          <div className={styles.statValue}>{item.value}</div>
          <div className={styles.statLabel}>{item.label}</div>
        </div>
      ))}
      {maxPublishedCourses && (
        <div className={styles.limitHint}>
          {t('stats.publishLimitHint', { count: maxPublishedCourses })}
        </div>
      )}
    </div>
  );
};

export default CourseStats;
