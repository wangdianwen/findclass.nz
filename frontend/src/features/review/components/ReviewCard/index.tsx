import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Tag, Avatar, Button, Tooltip } from 'antd';
import {
  LikeOutlined,
  FlagOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { Review } from '@/types/review';
import styles from './ReviewCard.module.scss';

// ============================================
// Types
// ============================================

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
  showActions?: boolean;
}

// ============================================
// Component
// ============================================

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onHelpful,
  onReport,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const { t } = useTranslation('reviews');

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('card.daysAgo', { days: 1 });
    }
    if (diffDays < 7) {
      return t('card.daysAgo', { days: diffDays });
    }
    return date.toLocaleDateString();
  };

  // Render stars
  const renderStars = (rating: number, maxRating = 5) => {
    return (
      <div className={styles.stars}>
        {Array.from({ length: maxRating }, (_, i) => (
          <span key={i} className={`${styles.star} ${i < rating ? styles.filled : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.reviewCard} data-testid="review-card">
      {/* Header - User Info & Rating */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <Avatar src={review.userAvatar} alt={review.userName} size={48} className={styles.avatar}>
            {review.userName.charAt(0)}
          </Avatar>
          <div className={styles.userMeta}>
            <div className={styles.userName}>{review.userName}</div>
            <div className={styles.rating}>
              {renderStars(review.overallRating)}
              <span className={styles.ratingNumber}>{review.overallRating}</span>
            </div>
          </div>
        </div>
        <div className={styles.date}>{formatDate(review.createdAt)}</div>
      </div>

      {/* Title */}
      {review.title && <div className={styles.title}>{review.title}</div>}

      {/* Content */}
      <div className={styles.content}>{review.content}</div>

      {/* Tags */}
      {review.tags && review.tags.length > 0 && (
        <div className={styles.tags}>
          {review.tags.map(tag => (
            <Tag key={tag} className={styles.tag}>
              {t(`tags.${tag}`)}
            </Tag>
          ))}
        </div>
      )}

      {/* Course Link - Clickable to navigate to course detail */}
      {review.courseId && (
        <div className={styles.courseLink}>
          <Link to={`/course/${review.courseId}`} className={styles.linkItem}>
            <BookOutlined className={styles.linkIcon} />
            <span className={styles.linkText}>{review.courseName || t('card.viewCourse')}</span>
          </Link>
        </div>
      )}

      {/* Rating Details (optional) */}
      {(review.teachingRating ||
        review.courseRating ||
        review.communicationRating ||
        review.punctualityRating) && (
        <div className={styles.ratingDetails}>
          {review.teachingRating && (
            <div className={styles.ratingItem}>
              <span className={styles.ratingLabel}>{t('rating.teaching')}:</span>
              {renderStars(review.teachingRating, 5)}
            </div>
          )}
          {review.courseRating && (
            <div className={styles.ratingItem}>
              <span className={styles.ratingLabel}>{t('rating.course')}:</span>
              {renderStars(review.courseRating, 5)}
            </div>
          )}
          {review.communicationRating && (
            <div className={styles.ratingItem}>
              <span className={styles.ratingLabel}>{t('rating.communication')}:</span>
              {renderStars(review.communicationRating, 5)}
            </div>
          )}
          {review.punctualityRating && (
            <div className={styles.ratingItem}>
              <span className={styles.ratingLabel}>{t('rating.punctuality')}:</span>
              {renderStars(review.punctualityRating, 5)}
            </div>
          )}
        </div>
      )}

      {/* Edited indicator */}
      {review.isEdited && <div className={styles.edited}>{t('card.edited')}</div>}

      {/* Edit Button - Always show when onEdit is provided (for own reviews) */}
      {(onEdit || onDelete) && (
        <div className={styles.editSection}>
          {onEdit && (
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(review.id)}
              data-testid={`edit-${review.id}`}
              className={styles.editButton}
            >
              {t('card.edit')}
            </Button>
          )}
          {onDelete && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(review.id)}
              data-testid={`delete-${review.id}`}
              className={styles.deleteButton}
            >
              {t('card.delete')}
            </Button>
          )}
        </div>
      )}

      {/* Actions - Helpful, Report (controlled by showActions) */}
      {showActions && (
        <div className={styles.actions}>
          <Tooltip title={t('card.helpful')}>
            <Button
              type="text"
              size="small"
              icon={<LikeOutlined />}
              onClick={() => onHelpful?.(review.id)}
              className={styles.actionButton}
            >
              {review.helpfulCount > 0 && (
                <span className={styles.actionCount}>{review.helpfulCount}</span>
              )}
            </Button>
          </Tooltip>

          <Tooltip title={t('card.report')}>
            <Button
              type="text"
              size="small"
              icon={<FlagOutlined />}
              onClick={() => onReport?.(review.id)}
              danger
              className={styles.actionButton}
              data-testid={`report-${review.id}`}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
