import React from 'react';
import { Button, Result } from 'antd';
import { BookOutlined, TeamOutlined, DashboardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styles from './OnboardingSuccess.module.scss';

// ============================================
// Component
// ============================================

export const OnboardingSuccess: React.FC = () => {
  const { t } = useTranslation('teacher');
  const navigate = useNavigate();

  return (
    <div className={styles.successPage}>
      <Result
        status="success"
        title={t('teacherOnboarding.success.title')}
        subTitle={t('teacherOnboarding.success.subtitle')}
      >
        <div className={styles.quickActions}>
          <Button
            type="primary"
            size="large"
            icon={<BookOutlined />}
            onClick={() => navigate('/courses/new')}
            data-testid="create-course"
          >
            {t('teacherOnboarding.success.createCourse')}
          </Button>
          <Button
            size="large"
            icon={<DashboardOutlined />}
            onClick={() => navigate('/teacher/dashboard')}
            data-testid="view-dashboard"
          >
            {t('teacherOnboarding.success.viewDashboard')}
          </Button>
          <Button
            size="large"
            icon={<TeamOutlined />}
            onClick={() => navigate('/teacher/students')}
            data-testid="view-students"
          >
            {t('teacherOnboarding.success.viewStudents')}
          </Button>
        </div>

        <div className={styles.gettingStarted}>
          <h3 className={styles.sectionTitle}>{t('teacherOnboarding.success.gettingStarted')}</h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>{t('teacherOnboarding.success.setupProfile')}</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>{t('teacherOnboarding.success.addCourse')}</span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>{t('teacherOnboarding.success.setSchedule')}</span>
            </div>
          </div>
        </div>

        <div className={styles.help}>
          <p>{t('teacherOnboarding.success.help')}</p>
          <div className={styles.helpLinks}>
            <Button type="link">{t('teacherOnboarding.success.docs')}</Button>
            <Button type="link">{t('teacherOnboarding.success.support')}</Button>
          </div>
        </div>
      </Result>
    </div>
  );
};

export default OnboardingSuccess;
