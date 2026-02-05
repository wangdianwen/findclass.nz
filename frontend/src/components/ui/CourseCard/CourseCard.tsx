import React from 'react';
import { Link } from 'react-router-dom';
import Tag from 'antd/es/tag';
import { StarOutlined, EnvironmentOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  TEACHING_MODE_LABELS,
  SUBJECT_LABELS,
  GRADE_LABELS,
  type CourseData,
} from '../../../data/courseData';
import { TrustBadge } from '../TrustBadge';
import styles from './CourseCard.module.scss';

// ============================================
// Types
// ============================================

export type CourseCardVariant = 'full' | 'lite';

export interface CourseCardProps {
  /** Course data for full variant */
  course?: CourseData;
  /** Course ID (required for lite variant without full data) */
  id?: string;
  /** Course title */
  title?: string;
  /** Institution name (for lite variant) */
  institution?: string;
  /** Price (for lite variant) */
  price?: number;
  /** Lesson duration in minutes (for lite variant) */
  lessonDuration?: number;
  /** Rating score */
  rating?: number;
  /** Display variant */
  variant?: CourseCardVariant;
  /** Action button click handler (e.g., remove from favorites) */
  onAction?: (id: string) => void;
  /** Action button text */
  actionText?: string;
  /** Component test ID */
  testId?: string;
}

// ============================================
// Component
// ============================================

export const CourseCard: React.FC<CourseCardProps> = React.memo(
  ({
    course,
    id,
    title,
    institution,
    price,
    lessonDuration,
    rating,
    variant = 'full',
    onAction,
    actionText = 'Remove',
    testId = 'course-card',
  }) => {
    const { t } = useTranslation('search');

    // For lite variant without full course data, use direct props
    const isLite = variant === 'lite';

    // Get course data from props or course object
    const courseId = id || course?.id || '';
    const courseTitle = title || course?.title || '';
    const coursePriceNum = price ?? course?.price;
    const coursePrice =
      isLite && coursePriceNum
        ? `$${coursePriceNum}${t('course.perLesson')}`
        : coursePriceNum
          ? `$${coursePriceNum}`
          : '';
    const courseRating = rating ?? course?.rating ?? 0;
    const courseInstitution = institution || course?.teacherName || '';
    const courseLessonDuration = lessonDuration ?? course?.lessonDuration;

    // Build Link target
    const linkTo = isLite && courseId ? `/courses/${courseId}` : '#';

    // Get labels for full variant
    const getSubjectLabel = (subject: string) => {
      const label = SUBJECT_LABELS[subject];
      return label ? t(label) : subject;
    };

    const getGradeLabel = (grade: string) => {
      const label = GRADE_LABELS[grade];
      return label ? t(label) : grade;
    };

    const getTeachingModeLabel = (mode: string) => {
      const config = TEACHING_MODE_LABELS[mode];
      return config?.labelKey ? t(config.labelKey) : '';
    };

    const handleAction = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAction?.(courseId);
    };

    // Render Lite variant
    if (isLite) {
      return (
        <Link to={linkTo} className={`${styles.courseCardLink} course-card-link`}>
          <div
            className={`${styles.courseCard} ${styles.liteCard} course-card`}
            data-testid="course-card"
            data-testid-dynamic={`${testId}-${courseId}`}
          >
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.cardInfo}>
                  <h4 className={styles.cardTitle}>{courseTitle}</h4>
                  <div className={styles.cardMeta}>
                    <span className={styles.institution}>{courseInstitution}</span>
                    {courseRating > 0 && <span className={styles.rating}>★ {courseRating}</span>}
                  </div>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <div className={styles.litePriceRow}>
                  <span className={styles.litePrice}>{coursePrice}</span>
                  {courseLessonDuration && (
                    <span className={styles.litePriceMeta}>
                      {courseLessonDuration}
                      {t('course.minutes')}
                    </span>
                  )}
                </div>
                {onAction && (
                  <span data-testid={`${testId}-action-${courseId}`}>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={handleAction}>
                      {actionText}
                    </Button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      );
    }

    // Render Full variant (original CourseCard)
    if (!course) return null;

    const subjectLabel = getSubjectLabel(course.subject);
    const gradeLabel = getGradeLabel(course.grade);
    const teachingModeLabel = getTeachingModeLabel(course.teachingMode);

    return (
      <Link to={`/courses/${course.id}`} className={`${styles.courseCardLink} course-card-link`}>
        <div className={`${styles.courseCard} course-card`} data-testid="course-card" data-testid-dynamic={`course-card-${course.id}`}>
          <h3 className={styles.courseTitle}>
            <TrustBadge level={course.trustLevel} size="small" />
            <span className={styles.titleText}>{course.title}</span>
          </h3>

          <div className={styles.courseInfo}>
            <div className={styles.priceRow}>
              <span className={styles.price}>
                ${course.price}
                <span className={styles.priceUnit}>{t('course.perLesson')}</span>
              </span>
            </div>
            <div className={styles.priceMeta}>
              <span className={styles.lessonDuration}>
                {course.lessonDuration}
                {t('course.minutes')}
              </span>
              <span className={styles.lessonCount}>
                {t('course.totalLessons', { count: course.lessonCount })}
              </span>
            </div>
            <div className={styles.ratingRow}>
              <span className={styles.rating}>
                <StarOutlined /> {course.rating}
              </span>
              <span className={styles.reviewCount}>
                ({course.reviewCount}
                {t('course.reviews')})
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.region}>
                <EnvironmentOutlined /> {course.region}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.teacher}>
                <UserOutlined /> {course.teacherName}
              </span>
            </div>
            <div className={styles.tags}>
              <Tag>{subjectLabel}</Tag>
              <Tag>{gradeLabel}</Tag>
              <Tag>{teachingModeLabel}</Tag>
            </div>
          </div>
        </div>
      </Link>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo
    if (prevProps.variant !== nextProps.variant) return false;
    if (prevProps.onAction !== nextProps.onAction) return false;
    if (prevProps.actionText !== nextProps.actionText) return false;

    if (prevProps.variant === 'lite') {
      // For lite variant, compare direct props
      return (
        prevProps.id === nextProps.id &&
        prevProps.title === nextProps.title &&
        prevProps.institution === nextProps.institution &&
        prevProps.price === nextProps.price &&
        prevProps.rating === nextProps.rating
      );
    }

    // For full variant, compare course object
    return prevProps.course?.id === nextProps.course?.id;
  }
);

export default CourseCard;
