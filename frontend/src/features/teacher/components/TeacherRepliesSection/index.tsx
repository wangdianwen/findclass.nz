import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Empty, message, Select } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import type {
  ReviewForReply,
  ReplyTemplate,
} from '../../pages/TeacherDashboardPage/teacherRepliesData';
import {
  MOCK_REVIEWS_FOR_REPLY,
  MOCK_REPLY_TEMPLATES,
  getDaysAgo,
} from '../../pages/TeacherDashboardPage/teacherRepliesData';
import styles from './TeacherRepliesSection.module.scss';

// ============================================
// Types
// ============================================

type FilterType = 'all' | 'pending' | 'replied';
type CategoryType = 'all' | 'review' | 'inquiry';

interface TeacherRepliesSectionProps {
  reviews?: ReadonlyArray<ReviewForReply>;
  templates?: ReadonlyArray<ReplyTemplate>;
}

// ============================================
// Components
// ============================================

// Stars Rating Component
const StarsRating: React.FC<{ rating: number; maxRating?: number }> = ({
  rating,
  maxRating = 5,
}) => {
  return (
    <div className={styles.starRating}>
      {Array.from({ length: maxRating }, (_, i) => (
        <span key={i} className={`${styles.star} ${i < rating ? styles.filled : ''}`}>
          ★
        </span>
      ))}
    </div>
  );
};

// Review Card Component
const ReviewCard: React.FC<{
  review: ReviewForReply;
  onReply: (reviewId: string, content: string) => void;
  templates: ReadonlyArray<ReplyTemplate>;
}> = ({ review, onReply, templates }) => {
  const { t, i18n } = useTranslation('teacher');
  const [replyContent, setReplyContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInquiry = review.category === 'inquiry';

  const handleSubmit = useCallback(async () => {
    const minLength = isInquiry ? 5 : 10;
    if (replyContent.trim().length < minLength) {
      message.warning(t(isInquiry ? 'replies.inquiry.minLength' : 'replies.reply.minLength'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      onReply(review.id, replyContent.trim());
      setReplyContent('');
      setShowForm(false);
      message.success(t('replies.reply.success'));
    } catch {
      message.error(t('replies.reply.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [review.id, replyContent, onReply, t, isInquiry]);

  const handleCancel = useCallback(() => {
    setReplyContent('');
    setShowForm(false);
  }, []);

  const handleUseTemplate = useCallback(
    (template: ReplyTemplate) => {
      const content =
        i18n.language === 'en' && template.contentEn ? template.contentEn : template.content;
      setReplyContent(content);
    },
    [i18n.language]
  );

  // Format date
  const formatDate = useCallback(
    (dateString: string) => {
      const daysAgo = getDaysAgo(dateString);
      if (daysAgo === 0) {
        return t('daysAgo.today', { ns: 'reviews' });
      }
      if (daysAgo === 1) {
        return t('daysAgo.yesterday', { ns: 'reviews' });
      }
      return t('daysAgo.days', { ns: 'reviews', days: daysAgo });
    },
    [t]
  );

  const charCount = replyContent.length;
  const isOverLimit = charCount > 500;
  const minLength = isInquiry ? 5 : 10;
  const isTooShort = charCount > 0 && charCount < minLength;

  return (
    <div className={styles.reviewCard} data-testid={`review-card-${review.id}`}>
      {/* Header */}
      <div className={styles.reviewHeader}>
        <div className={styles.reviewUser}>
          <div className={styles.reviewAvatar}>
            {review.userAvatar ? (
              <img src={review.userAvatar} alt={review.userName} />
            ) : (
              review.userName.charAt(0)
            )}
          </div>
          <div className={styles.reviewMeta}>
            <div className={styles.reviewName}>{review.userName}</div>
            <div className={styles.reviewCourse}>{review.courseName}</div>
          </div>
        </div>
        <div className={styles.reviewHeaderRight}>
          {/* Category Badge */}
          {isInquiry && (
            <span className={styles.categoryBadge} data-testid="category-badge">
              {t('replies.category.inquiry')}
            </span>
          )}
          {/* Rating (only for reviews) */}
          {!isInquiry && review.overallRating && (
            <div className={styles.reviewRating}>
              <StarsRating rating={review.overallRating} />
              <span className={styles.ratingNumber}>{review.overallRating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Title & Content */}
      {review.title && <div className={styles.reviewTitle}>{review.title}</div>}
      <div className={styles.reviewContent}>{review.content}</div>

      {/* Tags */}
      {review.tags && review.tags.length > 0 && (
        <div className={styles.reviewTags}>
          {review.tags.map((tag: string) => (
            <span key={tag} className={styles.tag} data-testid={`tag-${tag}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <div className={styles.reviewDate}>{formatDate(review.createdAt)}</div>

      {/* Existing Reply */}
      {review.reply && (
        <div className={styles.replySection}>
          <div className={styles.replyLabel}>
            <span className={styles.replyIcon}>💬</span>
            {t('replies.status.replied')}
          </div>
          <div className={styles.replyContent}>
            <div className={styles.replyAvatar}>T</div>
            <div className={styles.replyText}>
              <div className={styles.replyAuthor}>{t('replies.title')}</div>
              <div className={styles.replyBody}>{review.reply.content}</div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Form */}
      {!review.reply && (
        <>
          {!showForm ? (
            <Button
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => setShowForm(true)}
              style={{ marginTop: 12 }}
            >
              {t('replies.actions.reply')}
            </Button>
          ) : (
            <div className={styles.replyForm}>
              <textarea
                className={styles.replyTextarea}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder={
                  isInquiry ? t('replies.inquiry.placeholder') : t('replies.reply.placeholder')
                }
                data-testid="reply-textarea"
              />

              {/* Templates (only for reviews) */}
              {!isInquiry && (
                <div className={styles.templatesSection}>
                  <div className={styles.templatesTitle}>{t('replies.templates.title')}</div>
                  <div className={styles.templatesList}>
                    {templates.map(template => (
                      <Button
                        key={template.id}
                        type="link"
                        size="small"
                        onClick={() => handleUseTemplate(template)}
                        data-testid={`template-${template.id}`}
                      >
                        {i18n.language === 'en' && template.nameEn
                          ? template.nameEn
                          : template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={styles.replyActions}>
                <span
                  className={`${styles.charCount} ${
                    isOverLimit ? styles.danger : isTooShort ? styles.warning : ''
                  }`}
                >
                  {isInquiry
                    ? t('replies.inquiry.charCount', { current: charCount })
                    : t('replies.reply.charCount', { current: charCount })}
                </span>
                <div className={styles.actionButtons}>
                  <Button onClick={handleCancel} disabled={isSubmitting}>
                    {t('replies.actions.cancel')}
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={isOverLimit || isTooShort}
                  >
                    {t('replies.actions.post')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const TeacherRepliesSection: React.FC<TeacherRepliesSectionProps> = ({
  reviews = MOCK_REVIEWS_FOR_REPLY,
  templates = MOCK_REPLY_TEMPLATES,
}) => {
  const { t } = useTranslation('teacher');
  const [filter, setFilter] = useState<FilterType>('all');
  const [category, setCategory] = useState<CategoryType>('all');
  const [replyReviews, setReplyReviews] = useState(reviews);

  // Filter reviews based on current filter and category
  const filteredReviews = replyReviews.filter(review => {
    // Category filter
    if (category === 'review' && review.category !== 'review') return false;
    if (category === 'inquiry' && review.category !== 'inquiry') return false;
    // Status filter
    if (filter === 'pending') return !review.reply;
    if (filter === 'replied') return !!review.reply;
    return true;
  });

  // Calculate category stats
  const categoryStats = {
    all: replyReviews.length,
    review: replyReviews.filter(r => r.category === 'review').length,
    inquiry: replyReviews.filter(r => r.category === 'inquiry').length,
  };

  // Handle reply submission
  const handleReply = useCallback((reviewId: string, content: string) => {
    setReplyReviews(prev =>
      prev.map(review =>
        review.id === reviewId
          ? {
              ...review,
              reply: {
                id: `reply-${Date.now()}`,
                reviewId,
                content,
                createdAt: new Date().toISOString(),
              },
            }
          : review
      )
    );
  }, []);

  return (
    <div className={styles.repliesSection}>
      {/* Filter Row */}
      <div className={styles.filterRow}>
        <div className={styles.filterItem}>
          <span className={styles.filterLabel}>{t('replies.category.type')}:</span>
          <Select
            value={category}
            onChange={setCategory}
            style={{ width: '100%' }}
            data-testid="category-select"
          >
            <Select.Option value="all">
              {t('replies.category.all')} ({categoryStats.all})
            </Select.Option>
            <Select.Option value="review">
              {t('replies.category.review')} ({categoryStats.review})
            </Select.Option>
            <Select.Option value="inquiry">
              {t('replies.category.inquiry')} ({categoryStats.inquiry})
            </Select.Option>
          </Select>
        </div>
        <div className={styles.filterItem}>
          <span className={styles.filterLabel}>{t('replies.columns.status')}:</span>
          <Select
            value={filter}
            onChange={setFilter}
            style={{ width: '100%' }}
            data-testid="filter-select"
          >
            <Select.Option value="all">{t('replies.filter.all')}</Select.Option>
            <Select.Option value="pending">{t('replies.filter.pending')}</Select.Option>
            <Select.Option value="replied">{t('replies.filter.replied')}</Select.Option>
          </Select>
        </div>
      </div>

      {/* Review List */}
      {filteredReviews.length > 0 ? (
        <div className={styles.reviewList}>
          {filteredReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onReply={handleReply}
              templates={templates}
            />
          ))}
        </div>
      ) : (
        <Empty
          description={
            <div>
              <div className={styles.emptyTitle}>{t('replies.empty')}</div>
              <div className={styles.emptyDesc}>{t('replies.emptyDesc')}</div>
            </div>
          }
          className={styles.emptyState}
          data-testid="empty-state"
        />
      )}
    </div>
  );
};

export default TeacherRepliesSection;
