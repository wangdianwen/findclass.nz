import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FeaturesSection.module.scss';

// ============================================
// How It Works Card Component
// ============================================

interface HowItWorksItem {
  key: string;
  titleKey: string;
  descKey: string;
}

interface HowItWorksCardProps {
  item: HowItWorksItem;
  index: number;
}

export const HowItWorksCard: React.FC<HowItWorksCardProps> = ({ item, index }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.howItWorksCard}>
      <div className={styles.howItWorksNumber}>{index + 1}</div>
      <h3 className={styles.howItWorksCardTitle}>{t(item.titleKey)}</h3>
      <p className={styles.howItWorksCardDescription}>{t(item.descKey)}</p>
    </div>
  );
};

// ============================================
// How It Works Grid Component
// ============================================

export const HowItWorksGrid: React.FC = () => {
  const items: HowItWorksItem[] = [
    { key: 'search', titleKey: 'howItWorks.search', descKey: 'howItWorks.search.desc' },
    { key: 'compare', titleKey: 'howItWorks.compare', descKey: 'howItWorks.compare.desc' },
    { key: 'contact', titleKey: 'howItWorks.contact', descKey: 'howItWorks.contact.desc' },
    { key: 'book', titleKey: 'howItWorks.book', descKey: 'howItWorks.book.desc' },
    { key: 'learn', titleKey: 'howItWorks.learn', descKey: 'howItWorks.learn.desc' },
    { key: 'grow', titleKey: 'howItWorks.grow', descKey: 'howItWorks.grow.desc' },
  ];

  return (
    <div className={styles.howItWorksGrid}>
      {items.map((item, index) => (
        <HowItWorksCard key={item.key} item={item} index={index} />
      ))}
    </div>
  );
};

export default HowItWorksGrid;
