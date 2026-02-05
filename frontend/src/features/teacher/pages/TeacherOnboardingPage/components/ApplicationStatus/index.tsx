import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ApplicationStatus.module.scss';

interface ApplicationStatusProps {
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  onUpdate?: () => void;
}

// ============================================
// Component
// ============================================

export const ApplicationStatus: React.FC<ApplicationStatusProps> = ({
  status,
  rejectionReason,
  onUpdate,
}) => {
  const { t } = useTranslation('teacher');
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/teacher/dashboard');
  };

  const getSubtitle = () => {
    if (status === 'pending') {
      return t('teacherOnboarding.status.pending.description');
    }
    if (status === 'approved') {
      return t('teacherOnboarding.status.approved.description');
    }
    // For rejected, combine description with reason
    const description = t('teacherOnboarding.status.rejected.description');
    if (rejectionReason) {
      return (
        <div>
          <p style={{ marginBottom: 8 }}>{description}</p>
          <p style={{ color: '#ff4d4f', marginBottom: 0 }}>
            {t('teacherOnboarding.status.rejected.reasonLabel')} {rejectionReason}
          </p>
        </div>
      );
    }
    return description;
  };

  const renderExtra = () => {
    if (status === 'approved') {
      return (
        <Button type="primary" onClick={handleGoToDashboard}>
          {t('teacherOnboarding.status.approved.goToDashboard')}
        </Button>
      );
    }
    if (status === 'rejected' && onUpdate) {
      return (
        <Button type="primary" onClick={onUpdate}>
          {t('teacherOnboarding.status.rejected.resubmit')}
        </Button>
      );
    }
    return null;
  };

  return (
    <div className={styles.statusPage}>
      <Result
        status={status === 'pending' ? 'info' : status === 'approved' ? 'success' : 'error'}
        title={
          status === 'pending'
            ? t('teacherOnboarding.status.pending.title')
            : status === 'approved'
              ? t('teacherOnboarding.status.approved.title')
              : t('teacherOnboarding.status.rejected.title')
        }
        subTitle={getSubtitle()}
        extra={renderExtra()}
      />
    </div>
  );
};

export default ApplicationStatus;
