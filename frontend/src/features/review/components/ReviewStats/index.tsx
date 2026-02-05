import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ReviewStatistics } from '@/types/review';
import styles from './ReviewStats.module.scss';

// ============================================
// Types
// ============================================

interface ReviewStatsProps {
  stats: ReviewStatistics;
  showDetails?: boolean;
}

// ============================================
// Component
// ============================================

export const ReviewStats: React.FC<ReviewStatsProps> = ({ stats, showDetails = true }) => {
  const { t } = useTranslation('reviews');

  // Calculate percentages for rating bars
  const getPercentage = (count: number) => {
    if (stats.totalReviews === 0) return 0;
    return (count / stats.totalReviews) * 100;
  };

  return (
    <div className={styles.reviewStats} data-testid="review-stats">
      {/* Overall Rating */}
      <div className={styles.overallSection}>
        <div className={styles.averageRating}>
          <span className={styles.bigNumber}>{stats.averageRating.toFixed(1)}</span>
          <div className={styles.ratingInfo}>
            <div className={styles.stars}>
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`${styles.star} ${i < Math.round(stats.averageRating) ? styles.filled : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
            <div className={styles.totalCount}>
              {t('stats.totalReviews', { count: stats.totalReviews })}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className={styles.distributionSection}>
        {[5, 4, 3, 2, 1].map(rating => {
          const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
          const percentage = getPercentage(count);

          return (
            <div key={rating} className={styles.distributionRow}>
              <div className={styles.ratingLabel}>
                {rating}{' '}
                {t(
                  `stats.${rating}Star`
                    .replace('1Star', 'oneStar')
                    .replace('2Star', 'twoStar')
                    .replace('3Star', 'threeStar')
                    .replace('4Star', 'fourStar')
                    .replace('5Star', 'fiveStar')
                )}
              </div>
              <div className={styles.barContainer}>
                <div className={styles.bar} style={{ width: `${percentage}%` }} />
              </div>
              <div className={styles.count}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Detailed Ratings */}
      {showDetails &&
        (stats.teachingAvg ||
          stats.courseAvg ||
          stats.communicationAvg ||
          stats.punctualityAvg) && (
          <div className={styles.detailsSection}>
            {stats.teachingAvg && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>{t('rating.teaching')}</span>
                <span className={styles.detailValue}>{stats.teachingAvg.toFixed(1)}</span>
              </div>
            )}
            {stats.courseAvg && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>{t('rating.course')}</span>
                <span className={styles.detailValue}>{stats.courseAvg.toFixed(1)}</span>
              </div>
            )}
            {stats.communicationAvg && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>{t('rating.communication')}</span>
                <span className={styles.detailValue}>{stats.communicationAvg.toFixed(1)}</span>
              </div>
            )}
            {stats.punctualityAvg && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>{t('rating.punctuality')}</span>
                <span className={styles.detailValue}>{stats.punctualityAvg.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default ReviewStats;
