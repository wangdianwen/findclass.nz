import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Rate, Tag } from 'antd';
import { REVIEW_TAGS } from '@/data/reviews';
import type { ReviewFormValues } from '@/types/review';
import styles from './ReviewForm.module.scss';

// ============================================
// Types
// ============================================

interface ReviewFormProps {
  onSubmit: (values: ReviewFormValues) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  initialValues?: Partial<ReviewFormValues>;
  isEdit?: boolean;
}

// ============================================
// Component
// ============================================

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  initialValues,
  isEdit = false,
}) => {
  const { t } = useTranslation('reviews');
  const [form] = Form.useForm();
  const [selectedTags, setSelectedTags] = useState<string[]>(initialValues?.tags || []);

  // Handle tag selection
  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag].slice(0, 3); // Max 3 tags

    setSelectedTags(newTags);
    form.setFieldValue('tags', newTags);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values as ReviewFormValues);
    } catch {
      // Validation failed
    }
  };

  return (
    <div className={styles.reviewForm} data-testid="review-form">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          overallRating: initialValues?.overallRating,
          teachingRating: initialValues?.teachingRating,
          courseRating: initialValues?.courseRating,
          communicationRating: initialValues?.communicationRating,
          punctualityRating: initialValues?.punctualityRating,
          title: initialValues?.title,
          content: initialValues?.content,
          tags: initialValues?.tags || [],
        }}
        requiredMark="optional"
      >
        {/* Overall Rating */}
        <Form.Item
          name="overallRating"
          label={t('rating.overall')}
          rules={[{ required: true, message: t('errors.ratingRequired') }]}
          className={styles.formItem}
        >
          <Rate count={5} allowHalf className={styles.rate} />
        </Form.Item>

        {/* Detailed Ratings */}
        <div className={styles.ratingGrid}>
          <Form.Item name="teachingRating" label={t('rating.teaching')} className={styles.formItem}>
            <Rate count={5} className={styles.rateSmall} />
          </Form.Item>

          <Form.Item name="courseRating" label={t('rating.course')} className={styles.formItem}>
            <Rate count={5} className={styles.rateSmall} />
          </Form.Item>

          <Form.Item
            name="communicationRating"
            label={t('rating.communication')}
            className={styles.formItem}
          >
            <Rate count={5} className={styles.rateSmall} />
          </Form.Item>

          <Form.Item
            name="punctualityRating"
            label={t('rating.punctuality')}
            className={styles.formItem}
          >
            <Rate count={5} className={styles.rateSmall} />
          </Form.Item>
        </div>

        {/* Title */}
        <Form.Item
          name="title"
          label={t('form.title')}
          rules={[{ max: 200, message: t('errors.titleTooLong') }]}
          className={styles.formItem}
        >
          <Input placeholder={t('form.titlePlaceholder')} maxLength={200} showCount />
        </Form.Item>

        {/* Content */}
        <Form.Item
          name="content"
          label={t('form.content')}
          rules={[
            { required: true, message: t('errors.contentRequired') },
            { min: 10, message: t('errors.contentTooShort') },
            { max: 1000, message: t('errors.contentTooLong') },
          ]}
          className={styles.formItem}
        >
          <Input.TextArea
            placeholder={t('form.contentPlaceholder')}
            rows={4}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        {/* Tags */}
        <Form.Item name="tags" label={t('form.tags')} className={styles.formItem}>
          <div className={styles.tagContainer}>
            {REVIEW_TAGS.map(tag => (
              <Tag
                key={tag}
                className={`${styles.tag} ${selectedTags.includes(tag) ? styles.tagSelected : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {selectedTags.includes(tag) && <span style={{ marginRight: 4 }}>✓</span>}
                {t(`tags.${tag}`)}
              </Tag>
            ))}
          </div>
          <div className={styles.tagHint}>{t('form.tagsHint')}</div>
        </Form.Item>

        {/* Actions */}
        <div className={styles.actions}>
          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              {t('form.cancel')}
            </Button>
          )}
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            {isEdit ? t('form.edit') : t('form.submit')}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ReviewForm;
