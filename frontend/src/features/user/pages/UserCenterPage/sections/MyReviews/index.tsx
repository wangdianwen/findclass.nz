import React, { useCallback, useState } from 'react';
import { Empty, Modal, Spin, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReviewCard } from '@/features/review';
import { ReviewForm } from '@/features/review';
import type { ReviewFormValues } from '@/types/review';
import type { UserReview } from '@/services/api';
import styles from './MyReviews.module.scss';

interface MyReviewsProps {
  reviews?: UserReview[];
  onEdit?: (id: string, data: Partial<ReviewFormValues>) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  testId?: string;
}

// ============================================
// Component
// ============================================

export const MyReviews: React.FC<MyReviewsProps> = ({
  reviews = [],
  onEdit,
  onDelete,
  isLoading = false,
  testId = 'my-reviews',
}) => {
  const { t } = useTranslation('reviews');
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handle edit click - opens edit modal
  const handleEdit = useCallback((reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
      setEditingReview(review);
      setEditModalOpen(true);
    }
  }, [reviews]);

  // Handle submit edit
  const handleSubmitEdit = useCallback(async (values: ReviewFormValues) => {
    if (!editingReview) return;

    setSubmitting(true);
    try {
      onEdit?.(editingReview.id, values);
      message.success(t('form.editSuccess'));
      setEditModalOpen(false);
      setEditingReview(null);
    } catch {
      message.error(t('form.error'));
    } finally {
      setSubmitting(false);
    }
  }, [editingReview, onEdit, t]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditModalOpen(false);
    setEditingReview(null);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingState} data-testid={`${testId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.myReviews} data-testid={testId}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('title')}</h2>
      </div>

      {reviews.length > 0 ? (
        <div className={styles.reviewsList}>
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={{
                id: review.id,
                userId: '',
                userName: '当前用户',
                userAvatar: '',
                teacherId: review.teacherId,
                teacherName: review.teacherName,
                courseId: '',
                courseName: review.courseTitle,
                overallRating: review.overallRating,
                teachingRating: review.overallRating,
                courseRating: review.overallRating,
                communicationRating: review.overallRating,
                punctualityRating: review.overallRating,
                title: '',
                content: review.content,
                tags: [],
                status: 'approved',
                isPublic: true,
                isEdited: false,
                helpfulCount: 0,
                reportCount: 0,
                createdAt: review.createdAt,
              }}
              onEdit={() => handleEdit(review.id)}
              showActions={true}
              onDelete={onDelete ? () => onDelete(review.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <Empty description={t('noReviews')} className={styles.empty} />
      )}

      {/* Edit Modal */}
      <Modal
        title={t('form.edit')}
        open={editModalOpen}
        onCancel={handleCancelEdit}
        footer={null}
        destroyOnClose
        data-testid="edit-modal"
      >
        <ReviewForm
          onSubmit={handleSubmitEdit}
          onCancel={handleCancelEdit}
          loading={submitting}
          initialValues={editingReview ? {
            overallRating: editingReview.overallRating,
            content: editingReview.content,
          } : undefined}
          isEdit={!!editingReview}
        />
      </Modal>
    </div>
  );
};

export default MyReviews;
