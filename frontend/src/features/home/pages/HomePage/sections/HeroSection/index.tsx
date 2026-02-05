import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnvironmentOutlined, BookOutlined, StarOutlined, DollarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import styles from './HeroSection.module.scss';

// Filter definitions for Quick Filters
const QUICK_FILTERS = [
  {
    key: 'auckland',
    icon: <EnvironmentOutlined className={styles.tagIcon} />,
    label: 'filterCity.auckland',
    filter: { region: ['Auckland'] },
  },
  {
    key: 'math',
    icon: <BookOutlined className={styles.tagIcon} />,
    label: 'filterCity.math',
    filter: { subject: 'Mathematics' },
  },
  {
    key: 'highschool',
    icon: <StarOutlined className={styles.tagIcon} />,
    label: 'filterCity.highSchool',
    filter: { grade: 'High School' },
  },
  {
    key: 'price',
    icon: <DollarOutlined className={styles.tagIcon} />,
    label: 'price',
    filter: { priceRange: '40-60' },
  },
  {
    key: 'rating',
    icon: <StarOutlined className={styles.tagIcon} />,
    label: 'rating',
    filter: { minRating: '4.5' },
  },
];

// Search term definitions for Popular Searches
const POPULAR_SEARCHES = [
  { key: 'math', term: 'popular.math', filter: { keyword: 'math' } },
  { key: 'piano', term: 'popular.piano', filter: { keyword: 'piano' } },
  { key: 'swim', term: 'popular.swim', filter: { keyword: 'swimming' } },
  { key: 'english', term: 'popular.english', filter: { keyword: 'english' } },
  { key: 'programming', term: 'popular.programming', filter: { keyword: 'programming' } },
];

interface FilterTagProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}

const FilterTag: React.FC<FilterTagProps> = ({ icon, children, className, onClick, href }) => {
  const content = (
    <>
      {icon}
      <span className={styles.tagText}>{children}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={`${styles.filterTag} ${className || ''}`}>
        {content}
      </a>
    );
  }

  return (
    <button className={`${styles.filterTag} ${className || ''}`} onClick={onClick}>
      {content}
    </button>
  );
};

export const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Handle filter click - store filter and navigate to courses page
  const handleFilterClick = (filter: Record<string, unknown>) => {
    sessionStorage.setItem('courseFilters', JSON.stringify(filter));
    navigate(ROUTES.COURSES);
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{t('hero.title')}</h1>
        <p className={styles.heroSubtitle}>{t('hero.subtitle')}</p>

        <div className={styles.searchContainer}>
          <div className={styles.quickFilters}>
            <span className={styles.filterLabel}>{t('quickFilters')}:</span>
            <div className={styles.tagList}>
              {QUICK_FILTERS.map(item => (
                <FilterTag
                  key={item.key}
                  icon={item.icon}
                  onClick={() => handleFilterClick(item.filter)}
                >
                  {t(item.label)}
                </FilterTag>
              ))}
            </div>
          </div>

          <div className={styles.popularSearches}>
            <span className={styles.popularLabel}>{t('popularSearches')}</span>
            <div className={styles.tagList}>
              {POPULAR_SEARCHES.map(item => (
                <FilterTag key={item.key} onClick={() => handleFilterClick(item.filter)}>
                  {t(item.term)}
                </FilterTag>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
