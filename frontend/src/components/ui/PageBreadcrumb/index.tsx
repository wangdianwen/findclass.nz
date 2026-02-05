import React from 'react';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import styles from './PageBreadcrumb.module.scss';

interface BreadcrumbItemType {
  /** Breadcrumb title */
  title?: React.ReactNode;
  /** Optional href for link */
  href?: string;
  /** Optional icon */
  icon?: React.ReactNode;
}

export interface PageBreadcrumbProps {
  /** Page title (auto-translated if i18n key provided) */
  pageTitle: string;
  /** Optional additional breadcrumb items (after home) */
  items?: BreadcrumbItemType[];
  /** Custom breadcrumb items (completely overrides default) */
  customItems?: BreadcrumbItemType[];
  /** Test ID for testing */
  testId?: string;
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  pageTitle,
  items,
  customItems,
  testId = 'page-breadcrumb',
}) => {
  const defaultItems: BreadcrumbItemType[] = [
    {
      href: '/',
      title: <HomeOutlined />,
    },
    {
      title: pageTitle,
    },
  ];

  const breadcrumbItems = (customItems ||
    (items ? [defaultItems[0], ...items] : defaultItems)) as unknown as Parameters<
    typeof Breadcrumb
  >[0]['items'];

  return (
    <div className={styles.breadcrumb} data-testid={testId}>
      <Breadcrumb items={breadcrumbItems} />
    </div>
  );
};

export default PageBreadcrumb;
