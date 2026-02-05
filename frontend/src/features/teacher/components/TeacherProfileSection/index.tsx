import React, { useState, useCallback } from 'react';
import { Form, InputNumber, Select, Tag, Button, message } from 'antd';
import ReactQuill from 'react-quill-new';
import 'quill/dist/quill.snow.css';
import {
  MailOutlined,
  PhoneOutlined,
  WechatOutlined,
  EditOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TeacherData } from '@/features/teacher/pages/TeacherDashboardPage/teacherDashboardData';
import { SUBJECT_OPTIONS } from '@/features/teacher/components/teacherData';
import styles from './TeacherProfileSection.module.scss';

// Maximum number of subjects
const MAX_SUBJECTS = 3;

// Quill editor configuration
const quillModules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet'];

interface TeacherProfileSectionProps {
  teacher: TeacherData;
  onSave: (data: Partial<TeacherData>) => void;
  testId?: string;
}

// ============================================
// Component
// ============================================

export const TeacherProfileSection: React.FC<TeacherProfileSectionProps> = ({
  teacher,
  onSave,
  testId = 'teacher-profile-section',
}) => {
  const { t } = useTranslation(['teacher', 'courseManagement']);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  // Initialize form values when editing starts
  const handleEdit = useCallback(() => {
    form.setFieldsValue({
      subjects: teacher.subjects,
      experience: teacher.experience,
      bio: teacher.bio,
    });
    setEditing(true);
  }, [form, teacher]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await form.validateFields();
      setLoading(true);
      const values = form.getFieldsValue();
      await onSave(values);
      message.success(t('profile.success'));
      setEditing(false);
    } catch {
      // Validation failed
    } finally {
      setLoading(false);
    }
  }, [form, onSave, t]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    form.resetFields();
    setEditing(false);
  }, [form]);

  // Get translated subject labels
  const getSubjectLabels = useCallback(
    (subjects: string[]) => {
      return subjects.map(subject => {
        const option = SUBJECT_OPTIONS.find(opt => opt.value === subject);
        return option ? t(option.label, { ns: 'courseManagement' }) : subject;
      });
    },
    [t]
  );

  return (
    <div className={styles.profileSection} data-testid={testId}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{t('teacherOnboarding.form.teachingInfo')}</h2>
        {!editing && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
            data-testid="edit-button"
          >
            {t('profile.edit')}
          </Button>
        )}
      </div>

      {/* Teacher Info Card */}
      <div className={styles.infoCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {teacher.avatar ? (
              <img src={teacher.avatar} alt={teacher.name} />
            ) : (
              <span>{teacher.name?.charAt(0) || 'T'}</span>
            )}
          </div>
          <div className={styles.teacherMeta}>
            <h3 className={styles.teacherName}>{teacher.name}</h3>
            <div className={styles.teacherRating}>
              <StarOutlined />
              <span>{teacher.rating.toFixed(1)}</span>
            </div>
            {teacher.verified && (
              <Tag color="gold" className={styles.verifiedTag}>
                {t('teacherDashboard.verified')}
              </Tag>
            )}
          </div>
        </div>

        {/* Contact Info - Always visible */}
        <div className={styles.contactSection}>
          <div className={styles.contactItem}>
            <MailOutlined />
            <span>{teacher.email}</span>
          </div>
          <div className={styles.contactItem}>
            <PhoneOutlined />
            <span>{teacher.phone || '-'}</span>
          </div>
          {teacher.wechat && (
            <div className={styles.contactItem}>
              <WechatOutlined />
              <span>{teacher.wechat}</span>
            </div>
          )}
        </div>
      </div>

      {/* Teaching Info Section */}
      <div className={styles.teachingSection}>
        {editing ? (
          <Form form={form} layout="vertical" className={styles.teachingForm}>
            {/* Subjects */}
            <Form.Item
              name="subjects"
              label={t('teacherOnboarding.form.subject')}
              rules={[
                { required: true, message: t('profile.required') },
                {
                  validator: (_, value: string[]) => {
                    if (!value || value.length === 0) {
                      return Promise.reject(
                        new Error(t('teacherOnboarding.validation.subjectRequired'))
                      );
                    }
                    if (value.length > MAX_SUBJECTS) {
                      return Promise.reject(
                        new Error(
                          t('teacherOnboarding.validation.maxSubjects', { count: MAX_SUBJECTS })
                        )
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              extra={t('teacherOnboarding.form.subjectHint', { count: MAX_SUBJECTS })}
            >
              <Select
                mode="multiple"
                placeholder={t('teacherOnboarding.form.subjectPlaceholder')}
                options={SUBJECT_OPTIONS.map(opt => ({
                  value: opt.value,
                  label: t(opt.label, { ns: 'courseManagement' }),
                }))}
                maxTagCount={2}
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                tagRender={props => {
                  const { label, closable, onClose } = props;
                  const onPreventMouseDown = (e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  };
                  return (
                    <Tag
                      color="blue"
                      onMouseDown={onPreventMouseDown}
                      closable={closable}
                      onClose={onClose}
                      style={{ marginRight: 3 }}
                    >
                      {label}
                    </Tag>
                  );
                }}
              />
            </Form.Item>

            {/* Experience */}
            <Form.Item
              name="experience"
              label={t('teacherOnboarding.form.experience')}
              rules={[{ required: true, message: t('profile.required') }]}
            >
              <InputNumber
                min={0}
                max={50}
                placeholder={t('teacherOnboarding.form.experiencePlaceholder')}
                style={{ width: '100%' }}
                addonAfter={t('teacherOnboarding.form.years')}
              />
            </Form.Item>

            {/* Bio */}
            <Form.Item
              name="bio"
              label={t('teacherOnboarding.form.bio')}
              rules={[
                { required: true, message: t('profile.required') },
                {
                  validator: (_, value: string, callback) => {
                    const textContent = value?.replace(/<[^>]*>/g, '').trim() || '';
                    if (!textContent) {
                      callback(t('profile.required'));
                      return;
                    }
                    if (textContent.length < 20) {
                      callback(t('teacherOnboarding.validation.bioMinLength'));
                      return;
                    }
                    if (textContent.length > 1000) {
                      callback(t('teacherOnboarding.validation.bioMaxLength'));
                      return;
                    }
                    callback();
                  },
                },
              ]}
            >
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                placeholder={t('teacherOnboarding.form.bioPlaceholder')}
                style={{ height: 300 }}
              />
            </Form.Item>

            {/* Form Actions */}
            <div className={styles.formActions}>
              <Button onClick={handleCancel} data-testid="cancel-button">
                {t('profile.cancel')}
              </Button>
              <Button
                type="primary"
                onClick={handleSave}
                loading={loading}
                data-testid="save-button"
              >
                {t('profile.save')}
              </Button>
            </div>
          </Form>
        ) : (
          <div className={styles.teachingDisplay}>
            {/* Subjects */}
            <div className={styles.displayItem}>
              <div className={styles.displayLabel}>
                <span>{t('teacherOnboarding.form.subject')}</span>
              </div>
              <div className={styles.displayValue}>
                {teacher.subjects && teacher.subjects.length > 0 ? (
                  <div className={styles.subjectTags}>
                    {getSubjectLabels(teacher.subjects).map((label, index) => (
                      <Tag key={index} color="blue">
                        {label}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <span className={styles.emptyValue}>-</span>
                )}
              </div>
            </div>

            {/* Experience */}
            <div className={styles.displayItem}>
              <div className={styles.displayLabel}>
                <span>{t('teacherOnboarding.form.experience')}</span>
              </div>
              <div className={styles.displayValue}>
                {teacher.experience !== undefined ? (
                  <span>
                    {teacher.experience} {t('teacherOnboarding.form.years')}
                  </span>
                ) : (
                  <span className={styles.emptyValue}>-</span>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className={styles.displayItemFull}>
              <div className={styles.displayLabel}>
                <span>{t('teacherOnboarding.form.bio')}</span>
              </div>
              <div className={styles.displayValue}>
                {teacher.bio ? (
                  <div
                    className={styles.bioContent}
                    dangerouslySetInnerHTML={{ __html: teacher.bio }}
                  />
                ) : (
                  <span className={styles.emptyValue}>-</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherProfileSection;
