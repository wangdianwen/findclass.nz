import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Empty, Spin, Pagination } from 'antd';
import type { Review, ReviewStatistics } from '@/types/review';
import { ReviewCard } from '@/features/review';
import { ReviewStats } from '@/features/review';
import styles from './ReviewsPage.module.scss';

// ============================================
// Types
// ============================================

interface ReviewsPageProps {
  teacherId?: string;
  courseId?: string;
  /** @deprecated Write button is not currently implemented */
  showWriteButton?: boolean;
  reviews?: Review[];
  stats?: ReviewStatistics;
  isLoading?: boolean;
}

// ============================================
// Component
// ============================================

export const ReviewsPage: React.FC<ReviewsPageProps> = ({
  teacherId: _teacherId,
  courseId: _courseId,
  showWriteButton: _showWriteButton = false,
  reviews: reviewsProp,
  stats: statsProp,
  isLoading = false,
}) => {
  const { t } = useTranslation('reviews');
  const [, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [currentPage] = useState(1);
  const pageSize = 10;

  // Use passed props or fall back to defaults
  const reviews: Review[] = reviewsProp || [];
  const reviewsTotal = reviews.length || 0;
  const stats: ReviewStatistics = statsProp || {
    teacherId: '',
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    teachingAvg: 0,
    courseAvg: 0,
    communicationAvg: 0,
    punctualityAvg: 0,
  };

  // Handle helpful button click
  const handleHelpful = (reviewId: string) => {
    setHelpfulReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  // Handle report button click
  const handleReport = (reviewId: string) => {
    // TODO: Implement report functionality
    console.warn('Report review:', reviewId);
  };

  // Handle page change
  const handlePageChange = (_page: number) => {
    // Pagination requires reviewsProp with full data
    // For embedded usage, parent should handle pagination
  };

  // Calculate total pages
  const totalPages = Math.ceil(reviewsTotal / pageSize);

  return (
    <div className={styles.reviewsPage} data-testid="reviews-page">
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Review Statistics */}
          {stats && (
            <div className={styles.statsSection}>
              <ReviewStats stats={stats} />
            </div>
          )}

          {/* Reviews List */}
          <div className={styles.reviewsSection}>
            <div className={styles.reviewsHeader}>
              <h3 className={styles.reviewsTitle}>{t('reviewsCount', { count: reviewsTotal })}</h3>
            </div>

            {reviews.length > 0 ? (
              <>
                <div className={styles.reviewsList}>
                  {reviews.map(review => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onHelpful={handleHelpful}
                      onReport={handleReport}
                      showActions={true}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <Pagination
                      current={currentPage}
                      total={reviewsTotal}
                      pageSize={pageSize}
                      onChange={handlePageChange}
                      size="small"
                      hideOnSinglePage={false}
                    />
                  </div>
                )}
              </>
            ) : (
              <Empty description={t('noReviews')} className={styles.emptyState} />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewsPage;
