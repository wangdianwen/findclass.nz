import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Steps, Button, message, Form } from 'antd';
import {
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/shared';
import { Footer } from '@/components/shared';
import { useUserStore } from '@/stores/userStore';
import { TeacherApplicationForm } from './components/TeacherApplicationForm';
import { TeachingEvidenceUpload } from './components/QualificationUpload';
import { ApplicationStatus } from './components/ApplicationStatus';
import styles from './TeacherOnboarding.module.scss';

// ============================================
// Types
// ============================================

interface TeacherApplication {
  name: string;
  subjects: string[];
  experience: number;
  education: string;
  university: string;
  bio: string;
}

interface TeachingEvidence {
  id: string;
  type: string;
  name: string;
  value: string;
}

type ApplicationStatusType = 'none' | 'pending' | 'approved' | 'rejected';

interface TeacherOnboardingPageProps {
  initialStep?: number;
  initialApplication?: TeacherApplication;
  initialEvidence?: TeachingEvidence[];
  initialStatus?: ApplicationStatusType;
}

// ============================================
// Component
// ============================================

export const TeacherOnboardingPage: React.FC<TeacherOnboardingPageProps> = ({
  initialStep = 0,
  initialApplication,
  initialEvidence,
  initialStatus = 'none',
}) => {
  const { t, i18n } = useTranslation('teacher');
  const navigate = useNavigate();
  const { isLoggedIn } = useUserStore();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [form] = Form.useForm();
  const [application, setApplication] = useState<TeacherApplication | null>(
    initialApplication || null
  );
  const [evidence, setEvidence] = useState<TeachingEvidence[]>(initialEvidence || []);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatusType>(initialStatus);
  const [loading, setLoading] = useState(false);

  // Set form values if initialApplication is provided
  useEffect(() => {
    if (initialApplication) {
      form.setFieldsValue(initialApplication);
    }
  }, [initialApplication, form]);

  // Get status icon based on application status
  const getStatusIcon = () => {
    switch (applicationStatus) {
      case 'approved':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'rejected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'pending':
      default:
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const steps = [
    { title: t('teacherOnboarding.steps.basicInfo') },
    { title: t('teacherOnboarding.steps.evidence') },
    { title: t('teacherOnboarding.steps.review') },
    {
      title: t('teacherOnboarding.steps.status'),
      icon: currentStep === 3 ? getStatusIcon() : undefined,
    },
  ];

  // Subject options with translations
  const SUBJECT_OPTIONS = [
    { value: 'chinese', label: t('teacherOnboarding.subjectOptions.chinese') },
    { value: 'math', label: t('teacherOnboarding.subjectOptions.math') },
    { value: 'english', label: t('teacherOnboarding.subjectOptions.english') },
    { value: 'physics', label: t('teacherOnboarding.subjectOptions.physics') },
    { value: 'chemistry', label: t('teacherOnboarding.subjectOptions.chemistry') },
    { value: 'biology', label: t('teacherOnboarding.subjectOptions.biology') },
    { value: 'science', label: t('teacherOnboarding.subjectOptions.science') },
    { value: 'geography', label: t('teacherOnboarding.subjectOptions.geography') },
    { value: 'history', label: t('teacherOnboarding.subjectOptions.history') },
    { value: 'civics', label: t('teacherOnboarding.subjectOptions.civics') },
    { value: 'music', label: t('teacherOnboarding.subjectOptions.music') },
    { value: 'art', label: t('teacherOnboarding.subjectOptions.art') },
    { value: 'pe', label: t('teacherOnboarding.subjectOptions.pe') },
    { value: 'it', label: t('teacherOnboarding.subjectOptions.it') },
    { value: 'other', label: t('teacherOnboarding.subjectOptions.other') },
  ];

  // Education options with translations
  const EDUCATION_OPTIONS = [
    { value: 'highSchool', label: t('teacherOnboarding.educationOptions.highSchool') },
    { value: 'associate', label: t('teacherOnboarding.educationOptions.associate') },
    { value: 'bachelor', label: t('teacherOnboarding.educationOptions.bachelor') },
    { value: 'master', label: t('teacherOnboarding.educationOptions.master') },
    { value: 'doctorate', label: t('teacherOnboarding.educationOptions.doctorate') },
    { value: 'other', label: t('teacherOnboarding.educationOptions.other') },
  ];

  // Handle language change
  const handleLanguageChange = useCallback(
    (value: string) => {
      i18n.changeLanguage(value);
    },
    [i18n]
  );

  // Handle form values change
  const handleFormValuesChange = useCallback((_: unknown, values: unknown) => {
    if (values) {
      setApplication(values as TeacherApplication);
    }
  }, []);

  // Handle evidence upload
  const handleEvidenceUpload = useCallback(
    (ev: TeachingEvidence) => {
      setEvidence(prev => [...prev, ev]);
      message.success(t('teacherOnboarding.evidence.uploadSuccess'));
    },
    [t]
  );

  // Handle evidence remove
  const handleEvidenceRemove = useCallback((id: string) => {
    setEvidence(prev => prev.filter(e => e.id !== id));
  }, []);

  // Handle next step
  const handleNext = useCallback(async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields();
      }
      setCurrentStep(prev => prev + 1);
    } catch {
      // Validation failed
    }
  }, [currentStep, form]);

  // Handle previous step
  const handleBack = useCallback(() => {
    if (currentStep === 3) {
      // Go back from status to review
      setCurrentStep(2);
    } else {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setApplicationStatus('pending');
      message.success(t('teacherOnboarding.messages.submitSuccess'));
      // Transition to status step
      setCurrentStep(3);
    } catch {
      message.error(t('teacherOnboarding.messages.submitError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Authentication check
  useEffect(() => {
    if (!isLoggedIn) {
      message.warning(t('auth.loginRequired'));
      navigate('/login?redirect=/teacher/onboarding', { replace: true });
    }
  }, [isLoggedIn, navigate, t]);

  // Early return if not authenticated
  if (!isLoggedIn) {
    return null;
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <TeacherApplicationForm
            form={form}
            onValuesChange={handleFormValuesChange}
            subjectOptions={SUBJECT_OPTIONS}
            educationOptions={EDUCATION_OPTIONS}
          />
        );
      case 1:
        return (
          <TeachingEvidenceUpload
            evidence={evidence}
            onUpload={handleEvidenceUpload}
            onRemove={handleEvidenceRemove}
          />
        );
      case 2:
        return (
          <div className={styles.reviewSection}>
            <h3 className={styles.reviewTitle}>{t('teacherOnboarding.review.title')}</h3>
            <p className={styles.reviewDescription}>{t('teacherOnboarding.review.description')}</p>

            {application && (
              <div className={styles.reviewContent}>
                <div className={styles.reviewHeader}>
                  <h4 className={styles.reviewSubtitle}>
                    {t('teacherOnboarding.review.basicInfo')}
                  </h4>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setCurrentStep(0)}
                    data-testid="edit-basic-info"
                  >
                    {t('teacherOnboarding.review.edit')}
                  </Button>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>{t('teacherOnboarding.form.name')}</span>
                  <span className={styles.reviewValue}>{application.name}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>{t('teacherOnboarding.form.subject')}</span>
                  <span className={styles.reviewValue}>{application.subjects?.join(', ')}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>
                    {t('teacherOnboarding.form.experience')}
                  </span>
                  <span className={styles.reviewValue}>{application.experience}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>
                    {t('teacherOnboarding.form.education')}
                  </span>
                  <span className={styles.reviewValue}>{application.education}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>
                    {t('teacherOnboarding.form.university')}
                  </span>
                  <span className={styles.reviewValue}>{application.university}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>{t('teacherOnboarding.form.bio')}</span>
                  <span className={styles.reviewValue}>{application.bio}</span>
                </div>
              </div>
            )}

            {evidence.length > 0 && (
              <div className={styles.reviewContent}>
                <div className={styles.reviewHeader}>
                  <h4 className={styles.reviewSubtitle}>
                    {t('teacherOnboarding.review.qualificationsInfo')}
                  </h4>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setCurrentStep(1)}
                    data-testid="edit-evidence"
                  >
                    {t('teacherOnboarding.review.edit')}
                  </Button>
                </div>
                <div className={styles.reviewEvidenceList}>
                  {evidence.map(ev => (
                    <div key={ev.id} className={styles.reviewEvidenceItem}>
                      <span className={styles.evidenceIcon}>
                        {ev.value.startsWith('http') ? '🔗' : '📄'}
                      </span>
                      <span className={styles.evidenceName}>{ev.name}</span>
                      <span className={styles.evidenceType}>{ev.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 3:
        // Application Status page (internal)
        // Only render if we have a valid status (not 'none')
        if (applicationStatus === 'none') {
          return null;
        }
        // Mock rejection reason (in real app, this would come from API)
        const rejectionReason =
          applicationStatus === 'rejected'
            ? 'Teaching experience documentation is insufficient.'
            : undefined;
        return (
          <ApplicationStatus
            status={applicationStatus}
            rejectionReason={rejectionReason}
            onUpdate={() => {
              setApplicationStatus('none');
              setCurrentStep(2);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.onboardingPage}>
      <Header onLanguageChange={handleLanguageChange} />

      <div className={styles.header}>
        <h1 className={styles.title}>{t('teacherOnboarding.title')}</h1>
        <p className={styles.subtitle}>{t('teacherOnboarding.subtitle')}</p>
      </div>

      <div className={styles.content}>
        <div className={styles.steps}>
          <Steps current={currentStep} items={steps} size="small" responsive />
        </div>

        <div className={styles.stepContent}>
          {renderStepContent()}

          {/* Only show actions divider and buttons when NOT on status step */}
          {currentStep !== 3 && (
            <div className={styles.actions}>
              {currentStep > 0 ? (
                <Button
                  onClick={handleBack}
                  className={styles.backButton}
                  data-testid="back-button"
                >
                  {t('teacherOnboarding.navigation.back')}
                </Button>
              ) : (
                <div />
              )}

              {currentStep < steps.length - 2 ? (
                <Button
                  type="primary"
                  onClick={handleNext}
                  className={styles.nextButton}
                  data-testid="next-button"
                >
                  {t('teacherOnboarding.navigation.next')}
                </Button>
              ) : currentStep === steps.length - 2 ? (
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={loading}
                  className={styles.nextButton}
                  data-testid="submit-button"
                >
                  {t('teacherOnboarding.review.submit')}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className={styles.footerSpacer} />
      <Footer />
    </div>
  );
};

export default TeacherOnboardingPage;
