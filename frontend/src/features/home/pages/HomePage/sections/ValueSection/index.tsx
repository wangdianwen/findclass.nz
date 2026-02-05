import React from 'react';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './ValueSection.module.scss';

interface ValueSectionProps {}

export const ValueSection: React.FC<ValueSectionProps> = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.valueSection}>
      <div className={styles.valueContent}>
        <div className={styles.valueText}>
          <h2 className={styles.valueTitle}>{t('mission.title')}</h2>
          <p className={styles.valueDescription}>{t('mission.description')}</p>
          <div className={styles.valueHighlights}>
            <div className={styles.highlight}>
              <CheckCircleOutlined className={styles.highlightIcon} />
              <span>{t('mission.highlight.tutors')}</span>
            </div>
            <div className={styles.highlight}>
              <CheckCircleOutlined className={styles.highlightIcon} />
              <span>{t('mission.highlight.students')}</span>
            </div>
            <div className={styles.highlight}>
              <CheckCircleOutlined className={styles.highlightIcon} />
              <span>{t('mission.highlight.transparency')}</span>
            </div>
          </div>
        </div>
        <div className={styles.valueStats}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{t('stats.courses.value')}</div>
            <div className={styles.statLabel}>{t('stats.courses')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{t('stats.students.value')}</div>
            <div className={styles.statLabel}>{t('stats.students')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{t('stats.tutors.value')}</div>
            <div className={styles.statLabel}>{t('stats.tutors')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{t('stats.rating.value')}</div>
            <div className={styles.statLabel}>{t('stats.rating')}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueSection;
