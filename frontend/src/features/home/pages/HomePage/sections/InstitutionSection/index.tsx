import React from 'react';
import { BuildOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './InstitutionSection.module.scss';

interface InstitutionSectionProps {}

export const InstitutionSection: React.FC<InstitutionSectionProps> = () => {
  const { t } = useTranslation();

  return (
    <section className={styles.institutionSection}>
      <div className={styles.institutionContent}>
        <div className={styles.institutionCard}>
          <div className={styles.comingSoonBadge}>{t('institution.badge')}</div>
          <div className={styles.institutionIconWrapper}>
            <BuildOutlined className={styles.institutionIcon} />
          </div>
          <div className={styles.institutionText}>
            <h3>{t('institution.subtitle')}</h3>
            <h2>{t('institution.title')}</h2>
            <p>{t('institution.description')}</p>
            <div className={styles.institutionFeatures}>
              <div className={styles.institutionFeatureItem}>
                <CheckCircleOutlined className={styles.institutionFeatureIcon} />
                {t('institution.feature.team')}
              </div>
              <div className={styles.institutionFeatureItem}>
                <CheckCircleOutlined className={styles.institutionFeatureIcon} />
                {t('institution.feature.courses')}
              </div>
              <div className={styles.institutionFeatureItem}>
                <CheckCircleOutlined className={styles.institutionFeatureIcon} />
                {t('institution.feature.finance')}
              </div>
              <div className={styles.institutionFeatureItem}>
                <CheckCircleOutlined className={styles.institutionFeatureIcon} />
                {t('institution.feature.analytics')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstitutionSection;
