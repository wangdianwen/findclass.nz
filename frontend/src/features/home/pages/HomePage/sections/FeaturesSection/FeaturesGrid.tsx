import React from 'react';
import {
  SearchOutlined,
  DollarOutlined,
  FundOutlined,
  GlobalOutlined,
  LikeOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './FeaturesSection.module.scss';

// ============================================
// Feature Card Data Type
// ============================================

interface FeatureItem {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}

// ============================================
// Feature Card Component
// ============================================

export const FeatureCard: React.FC<{ feature: FeatureItem }> = ({ feature }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIconWrapper}>{feature.icon}</div>
      <h3 className={styles.cardTitle}>{t(feature.titleKey)}</h3>
      <p className={styles.cardDescription}>{t(feature.descKey)}</p>
    </div>
  );
};

// ============================================
// Features Grid Component
// ============================================

export const FeaturesGrid: React.FC = () => {
  const features: FeatureItem[] = [
    {
      icon: <SearchOutlined className={styles.featureIcon} />,
      titleKey: 'features.smartSearch',
      descKey: 'features.smartSearch.desc',
    },
    {
      icon: <DollarOutlined className={styles.featureIcon} />,
      titleKey: 'features.zeroCommission',
      descKey: 'features.zeroCommission.desc',
    },
    {
      icon: <FundOutlined className={styles.featureIcon} />,
      titleKey: 'features.realReviews',
      descKey: 'features.realReviews.desc',
    },
    {
      icon: <GlobalOutlined className={styles.featureIcon} />,
      titleKey: 'features.localService',
      descKey: 'features.localService.desc',
    },
    {
      icon: <LikeOutlined className={styles.featureIcon} />,
      titleKey: 'features.favorites',
      descKey: 'features.favorites.desc',
    },
    {
      icon: <CommentOutlined className={styles.featureIcon} />,
      titleKey: 'features.onlineChat',
      descKey: 'features.onlineChat.desc',
    },
  ];

  return (
    <div className={styles.featuresGrid}>
      {features.map((feature, index) => (
        <FeatureCard key={index} feature={feature} />
      ))}
    </div>
  );
};

export default FeaturesGrid;
