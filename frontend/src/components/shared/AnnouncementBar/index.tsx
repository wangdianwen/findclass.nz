import React, { useState, useEffect } from 'react';
import { CloseOutlined, ToolOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { cookieService } from '@/services';
import styles from './AnnouncementBar.module.scss';

const ANNOUNCEMENT_DISMISSED_KEY = 'announcement_dismissed';
const ANNOUNCEMENT_EXPIRY_DAYS = 7;

const isAnnouncementDismissed = (): boolean => {
  const dismissedAt = cookieService.storage.getItem<number>(ANNOUNCEMENT_DISMISSED_KEY, 'local');
  if (!dismissedAt) return false;
  const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSinceDismissed < ANNOUNCEMENT_EXPIRY_DAYS;
};

export const AnnouncementBar: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(() => !isAnnouncementDismissed());

  useEffect(() => {
    if (!isVisible) {
      cookieService.storage.setItem(ANNOUNCEMENT_DISMISSED_KEY, Date.now(), 'local');
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.announcementBar}>
      <ToolOutlined className={styles.announcementIcon} />
      <div className={styles.announcementContent}>
        <div className={styles.announcementText}>
          <strong>{t('announcement.title')}</strong>
          <span className={styles.announcementMessage}>{t('announcement.message')}</span>
        </div>
      </div>
      <button
        className={styles.announcementClose}
        onClick={() => setIsVisible(false)}
        aria-label={t('announcement.close')}
        data-testid="close-button"
      >
        <CloseOutlined />
      </button>
    </div>
  );
};

export default AnnouncementBar;
