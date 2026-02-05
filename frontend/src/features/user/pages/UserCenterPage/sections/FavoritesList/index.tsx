import React from 'react';
import { HeartOutlined } from '@ant-design/icons';
import { Empty, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { CourseCard } from '@/components/ui';
import styles from './FavoritesList.module.scss';

interface FavoriteCourse {
  id: string;
  title: string;
  institution: string;
  price: number;
  rating: number;
}

interface FavoritesListProps {
  favorites: FavoriteCourse[];
  onRemove: (id: string) => void;
  isLoading?: boolean;
  testId?: string;
}

// ============================================
// Component
// ============================================

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  onRemove,
  isLoading = false,
  testId = 'favorites-list',
}) => {
  const { t } = useTranslation('user');

  if (isLoading) {
    return (
      <div className={styles.loadingState} data-testid={`${testId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className={styles.emptyState} data-testid={`${testId}-empty`}>
        <Empty
          image={<HeartOutlined className={styles.emptyIcon} />}
          description={
            <>
              <p className={styles.emptyTitle}>{t('favorites.empty')}</p>
              <p className={styles.emptyDesc}>{t('favorites.emptyDesc')}</p>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.favoritesSection} data-testid={testId}>
      <div className={styles.favoritesGrid}>
        {favorites.map(course => (
          <CourseCard
            key={course.id}
            id={course.id}
            title={course.title}
            institution={course.institution}
            price={course.price}
            rating={course.rating}
            variant="lite"
            onAction={onRemove}
            actionText={t('favorites.remove')}
            testId="favorite"
          />
        ))}
      </div>
    </div>
  );
};

export default FavoritesList;
