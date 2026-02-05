import React from 'react';
import { Form, Input, Select, InputNumber } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { UserOutlined, BankOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './TeacherApplicationForm.module.scss';

interface Option {
  value: string;
  label: string;
}

interface TeacherApplicationFormProps {
  form: FormInstance;
  onValuesChange: (changed: unknown, values: unknown) => void;
  subjectOptions: Option[];
  educationOptions: Option[];
}

// ============================================
// Component
// ============================================

export const TeacherApplicationForm: React.FC<TeacherApplicationFormProps> = ({
  form,
  onValuesChange,
  subjectOptions,
  educationOptions,
}) => {
  const { t } = useTranslation('teacher');

  return (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>{t('teacherOnboarding.steps.basicInfo')}</h2>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        autoComplete="off"
        data-testid="application-form"
      >
        <div className={styles.formRow}>
          <Form.Item
            name="name"
            label={t('teacherOnboarding.form.name')}
            rules={[
              { required: true, message: t('teacherOnboarding.form.nameRequired') },
              { min: 2, max: 20, message: 'Name must be 2-20 characters' },
            ]}
            className={styles.formField}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('teacherOnboarding.form.namePlaceholder')}
              data-testid="name-input"
            />
          </Form.Item>

          <Form.Item
            name="subjects"
            label={t('teacherOnboarding.form.subject')}
            rules={[
              { required: true, message: t('teacherOnboarding.form.subjectRequired') },
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error(t('teacherOnboarding.form.subjectRequired')));
                  }
                  if (value.length > 5) {
                    return Promise.reject(new Error(t('teacherOnboarding.form.subjectMax5')));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            className={styles.formField}
          >
            <Select
              mode="multiple"
              placeholder={t('teacherOnboarding.form.subjectPlaceholder')}
              options={subjectOptions}
              maxTagCount={5}
              data-testid="subject-select"
            />
          </Form.Item>
        </div>

        <div className={styles.formRow}>
          <Form.Item
            name="experience"
            label={t('teacherOnboarding.form.experience')}
            rules={[{ required: true, message: t('teacherOnboarding.form.experienceRequired') }]}
            className={styles.formField}
          >
            <InputNumber
              placeholder={t('teacherOnboarding.form.experiencePlaceholder')}
              min={0}
              max={50}
              style={{ width: '100%' }}
              data-testid="experience-input"
            />
          </Form.Item>

          <Form.Item
            name="education"
            label={t('teacherOnboarding.form.education')}
            rules={[{ required: true, message: t('teacherOnboarding.form.educationRequired') }]}
            className={styles.formField}
          >
            <Select
              placeholder={t('teacherOnboarding.form.educationPlaceholder')}
              options={educationOptions}
              data-testid="education-select"
            />
          </Form.Item>
        </div>

        <Form.Item
          name="university"
          label={t('teacherOnboarding.form.university')}
          rules={[{ required: true, message: t('teacherOnboarding.form.universityRequired') }]}
          className={styles.formField}
        >
          <Input
            prefix={<BankOutlined />}
            placeholder={t('teacherOnboarding.form.universityPlaceholder')}
            data-testid="university-input"
          />
        </Form.Item>

        <Form.Item
          name="bio"
          label={t('teacherOnboarding.form.bio')}
          rules={[
            { required: true, message: t('teacherOnboarding.form.bioRequired') },
            { min: 50, message: t('teacherOnboarding.form.bioTooShort') },
            { max: 500, message: t('teacherOnboarding.form.bioTooLong') },
          ]}
          className={styles.formField}
        >
          <Input.TextArea
            placeholder={t('teacherOnboarding.form.bioPlaceholder')}
            rows={4}
            showCount
            maxLength={500}
            data-testid="bio-input"
          />
        </Form.Item>
      </Form>
    </div>
  );
};

export default TeacherApplicationForm;
