import React from 'react';
import { Link } from 'react-router-dom';
import Tag from 'antd/es/tag';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './CourseCardHistory.module.scss';

export interface CourseCardHistoryProps {
  /** Course ID */
  id: string;
  /** Course title */
  title: string;
  /** Institution name */
  institution: string;
  /** Last viewed date */
  lastViewedAt: string;
  /** Learning status */
  status?: 'completed' | 'in_progress' | 'not_started';
  /** Remove handler */
  onRemove?: () => void;
  /** Component test ID */
  testId?: string;
}

// ============================================
// Component
// ============================================

export const CourseCardHistory: React.FC<CourseCardHistoryProps> = ({
  id,
  title,
  institution,
  lastViewedAt,
  status = 'not_started',
  onRemove,
  testId = 'course-card-history',
}) => {
  const { t } = useTranslation('user');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('history.today');
    } else if (diffDays === 1) {
      return t('history.yesterday');
    } else if (diffDays < 7) {
      return t('history.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'green', label: t('history.statusCompleted') };
      case 'in_progress':
        return { color: 'blue', label: t('history.statusInProgress') };
      case 'not_started':
      default:
        return { color: 'default', label: t('history.statusNotStarted') };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div className={styles.historyCardWrapper} data-testid={`${testId}-${id}`}>
      <Link to={`/courses/${id}`} className={styles.historyCardLink}>
        <div className={styles.historyCard}>
          <div className={styles.cardContent}>
            <div className={styles.titleRow}>
              <h4 className={styles.cardTitle}>{title}</h4>
              <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
            </div>
            <div className={styles.cardMeta}>
              <span className={styles.institution}>{institution}</span>
              <span className={styles.lastViewed}>
                {t('history.lastViewed')}: {formatDate(lastViewedAt)}
              </span>
            </div>
          </div>
        </div>
      </Link>
      {onRemove && (
        <Button
          type="text"
          danger
          icon={<CloseOutlined />}
          onClick={e => {
            e.preventDefault();
            onRemove();
          }}
          className={styles.removeButton}
          data-testid="remove-button"
        />
      )}
    </div>
  );
};

export default CourseCardHistory;
