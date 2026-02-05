import React, { ReactNode } from 'react';
import { Typography } from 'antd';
import { PageBreadcrumb } from '@/components/ui/PageBreadcrumb';
import type { PageBreadcrumbProps } from '@/components/ui/PageBreadcrumb';
import styles from './ContentPageTemplate.module.scss';

const { Paragraph } = Typography;

interface ContentPageTemplateProps {
  /** Page title (will be auto-translated if i18n key) */
  title: string;
  /** Last updated text */
  lastUpdated?: string;
  /** Children content sections */
  children: ReactNode;
  /** Breadcrumb custom items */
  breadcrumbItems?: PageBreadcrumbProps['items'];
  /** Hide breadcrumb */
  hideBreadcrumb?: boolean;
  /** Test ID for testing */
  testId?: string;
}

export const ContentPageTemplate: React.FC<ContentPageTemplateProps> = ({
  title,
  lastUpdated,
  children,
  breadcrumbItems,
  hideBreadcrumb,
  testId = 'content-page',
}) => {
  return (
    <div className={styles.contentPage} data-testid={testId}>
      {!hideBreadcrumb && <PageBreadcrumb pageTitle={title} items={breadcrumbItems} />}

      <div className={styles.content}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {lastUpdated && <Paragraph className={styles.lastUpdated}>{lastUpdated}</Paragraph>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};

export default ContentPageTemplate;
