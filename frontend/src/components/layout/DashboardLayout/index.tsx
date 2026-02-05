import React, { ReactNode } from 'react';
import { Card } from 'antd';
import type { CardProps } from 'antd/es/card';
import styles from './DashboardLayout.module.scss';

interface DashboardLayoutProps {
  /** Page title */
  title: string;
  /** Page subtitle */
  subtitle?: string;
  /** Children content */
  children: ReactNode;
  /** Optional card props for customization */
  cardProps?: CardProps;
  /** Hide card container */
  hideCard?: boolean;
  /** Custom className */
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  children,
  cardProps,
  hideCard = false,
  className,
}) => {
  return (
    <div className={`${styles.dashboardLayout} ${className || ''}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      {hideCard ? (
        <div className={styles.content}>{children}</div>
      ) : (
        <Card className={styles.card} {...cardProps}>
          <div className={styles.content}>{children}</div>
        </Card>
      )}
    </div>
  );
};

export default DashboardLayout;
