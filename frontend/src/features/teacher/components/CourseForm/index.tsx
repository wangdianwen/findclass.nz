import React, { useState, useCallback } from 'react';
import { Form, Input, Select, InputNumber, Button, Upload, Switch } from 'antd';
import type { UploadFile } from 'antd';
import ImgCrop from 'antd-img-crop';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import {
  TeacherCourse,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  TEACHING_MODE_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../teacherData';
import type { TeachingLanguage } from '@/config/languages';
import { MAIN_CITIES } from '@/data/courseData';
import styles from './CourseForm.module.scss';

// Maximum number of cover images
const MAX_COVER_IMAGES = 3;

// Quill toolbar modules
const quillModules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

// Quill formats
const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet'];

// ============================================
// Types
// ============================================

interface CourseFormProps {
  course?: TeacherCourse | null;
  onSubmit: (values: CourseFormValues) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface CourseFormValues {
  title: string;
  subject: string;
  grade: string;
  teachingMode: 'online' | 'offline' | 'both';
  city?: string;
  region?: string;
  address?: string; // Specific address field
  showAddress?: boolean;
  lessonCount: number;
  price: number;
  description: string;
  languages: string[];
  coverImages: string[];
  action: 'save' | 'publish';
}

// ============================================
// Component
// ============================================

export const CourseForm: React.FC<CourseFormProps> = ({
  course,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation('courseManagement');
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>(
    course?.coverImage
      ? [
          {
            uid: '-1',
            name: 'cover',
            status: 'done',
            url: course.coverImage,
          },
        ]
      : []
  );

  // Set initial values when course is provided
  React.useEffect(() => {
    if (course) {
      form.setFieldsValue({
        ...course,
        coverImages: course.coverImage ? [course.coverImage] : [],
        action: 'save',
      });
    }
  }, [course, form]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (action: 'save' | 'publish') => {
      try {
        const values = await form.validateFields();
        onSubmit({ ...values, action } as CourseFormValues);
      } catch {
        // Validation failed
      }
    },
    [form, onSubmit]
  );

  // Handle file list change
  const onChange = useCallback(
    ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
      setFileList(newFileList);
      // Extract URLs for form submission
      const urls = newFileList
        .filter(file => file.status === 'done' && file.url)
        .map(file => file.url!);
      form.setFieldValue('coverImages', urls);
    },
    [form]
  );

  // Handle file preview
  const onPreview = useCallback(async (file: UploadFile) => {
    let src = file.url as string;
    if (!src && file.preview) {
      src = file.preview;
    }
    if (!src) {
      return;
    }
    // Open in new tab for preview
    window.open(src, '_blank');
  }, []);

  return (
    <Form
      form={form}
      layout="vertical"
      size="large"
      initialValues={{
        title: '',
        subject: undefined,
        grade: undefined,
        teachingMode: 'offline',
        city: undefined,
        region: undefined,
        address: undefined,
        showAddress: false,
        lessonCount: 1,
        price: 0,
        description: '',
        languages: [],
        coverImages: [],
        action: 'save',
      }}
      requiredMark="optional"
      className={styles.formBody}
      data-testid="course-form"
    >
      {/* Basic Information */}
      <div className={styles.formGroup}>
        <h3 className={styles.groupTitle}>{t('form.basicInfo')}</h3>

        {/* Row 1: 课程标题 (full width) */}
        <Form.Item
          name="title"
          label={t('form.title')}
          rules={[
            { required: true, message: t('form.titleRequired') },
            {
              validator: (_rule: unknown, value: string, callback) => {
                if (!value || value.trim().length < 5) {
                  callback(t('form.titleTooShort'));
                  return;
                }
                if (value.length > 100) {
                  callback(t('form.titleTooLong'));
                  return;
                }
                callback();
              },
            },
          ]}
        >
          <Input placeholder={t('form.titlePlaceholder')} autoComplete="off" maxLength={100} />
        </Form.Item>

        {/* Row 2: 总课时数 + 课程价格 */}
        <div className={styles.formRow}>
          <Form.Item
            name="lessonCount"
            label={t('form.lessonCount')}
            rules={[{ required: true, message: t('form.lessonCountRequired') }]}
            className={styles.formCol}
          >
            <InputNumber
              min={1}
              max={200}
              placeholder={t('form.lessonCountPlaceholder')}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="price"
            label={t('form.price')}
            rules={[
              { required: true, message: t('form.priceRequired') },
              {
                type: 'number',
                min: 0,
                max: 10000,
                message: 'Price must be between 0 and 10,000',
              },
            ]}
            className={styles.formCol}
          >
            <InputNumber
              prefix="$"
              style={{ width: '100%' }}
              min={0}
              max={10000}
              placeholder={t('form.pricePlaceholder')}
              addonAfter="NZD"
            />
          </Form.Item>
        </div>

        {/* Row 3: 教学科目 + 适合年级 */}
        <div className={styles.formRow}>
          <Form.Item
            name="subject"
            label={t('form.subject')}
            rules={[{ required: true, message: t('form.subjectRequired') }]}
            className={styles.formCol}
          >
            <Select
              placeholder={t('form.subjectPlaceholder')}
              options={SUBJECT_OPTIONS.map(opt => ({
                value: opt.value,
                label: t(opt.label),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="grade"
            label={t('form.grade')}
            rules={[{ required: true, message: t('form.gradeRequired') }]}
            className={styles.formCol}
          >
            <Select
              placeholder={t('form.gradePlaceholder')}
              options={GRADE_OPTIONS.map(opt => ({
                value: opt.value,
                label: t(opt.label),
              }))}
            />
          </Form.Item>
        </div>

        {/* Row 4: 授课语言 + 授课方式 */}
        <div className={styles.formRow}>
          <Form.Item
            name="languages"
            label={t('form.language')}
            rules={[{ required: true, message: t('form.languageRequired') }]}
            className={styles.formCol}
          >
            <Select
              mode="multiple"
              placeholder={t('form.languagePlaceholder')}
              options={LANGUAGE_OPTIONS.map((opt: TeachingLanguage) => ({
                value: opt.code,
                label: t(opt.nameKey),
              }))}
              maxTagCount={2}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="teachingMode"
            label={t('form.teachingMode')}
            rules={[{ required: true, message: t('form.teachingModeRequired') }]}
            className={styles.formCol}
          >
            <Select
              placeholder={t('form.teachingModePlaceholder')}
              options={TEACHING_MODE_OPTIONS.map(opt => ({
                value: opt.value,
                label: t(opt.label),
              }))}
            />
          </Form.Item>
        </div>

        {/* Row 5: 授课城市 + 授课区域 */}
        <div className={styles.formRow}>
          <Form.Item
            name="city"
            label={t('form.city')}
            rules={[{ required: true, message: t('form.cityRequired') }]}
            className={styles.formCol}
          >
            <Select
              placeholder={t('form.cityPlaceholder')}
              options={MAIN_CITIES.map(city => ({
                value: city.value,
                label: city.label,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="region"
            label={t('form.region')}
            rules={[{ required: true, message: t('form.regionRequired') }]}
            className={styles.formCol}
          >
            <Select
              placeholder={t('form.regionPlaceholder')}
              options={[] as { value: string; label: string }[]}
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              dropdownStyle={{ minWidth: 200 }}
            />
          </Form.Item>
        </div>

        {/* 具体地址 - 仅在 showAddress 开启时显示 */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.showAddress !== currentValues.showAddress
          }
        >
          {({ getFieldValue }) => {
            const showAddress = getFieldValue('showAddress');
            return showAddress ? (
              <Form.Item
                name="address"
                label={t('form.address')}
                rules={[{ required: true, message: t('form.addressRequired') }]}
              >
                <Input placeholder={t('form.addressPlaceholder')} />
              </Form.Item>
            ) : null;
          }}
        </Form.Item>

        {/* 地址显示开关 */}
        <Form.Item
          name="showAddress"
          label={t('form.showAddress')}
          tooltip={t('form.showAddressTooltip')}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="description"
          label={t('form.description')}
          rules={[
            { required: true, message: t('form.descriptionRequired') },
            {
              validator: (_rule: unknown, value: string, callback) => {
                // Strip HTML tags to count actual text length
                const textContent = value.replace(/<[^>]*>/g, '').trim();
                if (textContent.length < 20) {
                  callback(t('form.descriptionTooShort'));
                  return;
                }
                if (textContent.length > 5000) {
                  callback(t('form.descriptionTooLong'));
                  return;
                }
                callback();
              },
            },
          ]}
        >
          <div className={styles.quillEditor}>
            <ReactQuill
              theme="snow"
              placeholder={t('form.descriptionPlaceholder')}
              modules={quillModules}
              formats={quillFormats}
              style={{ height: 300 }}
            />
          </div>
        </Form.Item>
      </div>

      {/* Cover Images */}
      <div className={`${styles.formGroup} ${styles.formGroupMedia}`}>
        <h3 className={styles.groupTitle}>{t('form.media')}</h3>

        <Form.Item
          name="coverImages"
          rules={[
            { required: true, message: t('form.coverImageRequired') },
            {
              validator: (_rule: unknown, value: string[], callback: (error?: string) => void) => {
                if (!value || value.length === 0) {
                  callback(t('form.coverImageRequired'));
                  return;
                }
                callback();
              },
            },
          ]}
          initialValue={[]}
          extra={t('form.coverImageMaxHint', { count: MAX_COVER_IMAGES })}
        >
          <ImgCrop rotationSlider aspect={16 / 9}>
            <Upload
              className={styles.pictureCardUpload}
              listType="picture-card"
              fileList={fileList}
              onChange={onChange}
              onPreview={onPreview}
              accept=".jpg,.jpeg,.png"
              maxCount={MAX_COVER_IMAGES}
            >
              {fileList.length < MAX_COVER_IMAGES && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>{t('form.coverImageUpload')}</div>
                </div>
              )}
            </Upload>
          </ImgCrop>
        </Form.Item>
      </div>

      {/* Actions */}
      <div className={styles.formActions}>
        <Button onClick={onCancel} disabled={loading}>
          {t('form.cancel')}
        </Button>
        <Button onClick={() => handleSubmit('save')} loading={loading}>
          {t('form.saveDraft')}
        </Button>
        <Button type="primary" onClick={() => handleSubmit('publish')} loading={loading}>
          {t('form.publish')}
        </Button>
      </div>
    </Form>
  );
};

export default CourseForm;
