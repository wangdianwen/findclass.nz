import React from 'react';
import Button from 'antd/es/button';
import { CheckCircleOutlined, TeamOutlined, SafetyCertificateFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './CTASection.module.scss';

interface CTASectionProps {}

export const CTASection: React.FC<CTASectionProps> = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContent}>
        <h2 className={styles.ctaTitle}>{t('tutor.cta.title')}</h2>
        <p className={styles.ctaDescription}>{t('tutor.cta.description')}</p>
        <div className={styles.ctaButtons}>
          <Button type="primary" size="large" data-testid="publish-button">
            {t('tutor.cta.publish')}
          </Button>
          <Button size="large" data-testid="learn-more-button">
            {t('tutor.cta.learnMore')}
          </Button>
        </div>
        <div className={styles.ctaFeatures}>
          <span className={styles.featureItem}>
            <CheckCircleOutlined /> {t('tutor.feature.free')}
          </span>
          <span className={styles.featureItem}>
            <TeamOutlined /> {t('tutor.feature.connect')}
          </span>
          <span className={styles.featureItem}>
            <SafetyCertificateFilled /> {t('tutor.feature.protection')}
          </span>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
