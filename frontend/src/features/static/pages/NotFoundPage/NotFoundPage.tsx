import React from 'react';
import { Button } from 'antd';
import { ROUTES } from '@/constants/routes';
import styles from './NotFoundPage.module.scss';

export const NotFoundPage: React.FC = () => {
  return (
    <div className={styles.container} data-testid="not-found-page">
      <h1 className={styles.title} data-testid="404-title">
        404
      </h1>
      <p className={styles.subtitle} data-testid="page-not-found">
        Page Not Found
      </p>
      <p className={styles.chineseSubtitle} data-testid="页面不存在">
        页面不存在
      </p>
      <Button
        type="primary"
        className={styles.button}
        href={ROUTES.HOME}
        data-testid="go-home-button"
      >
        Go Home
      </Button>
    </div>
  );
};
