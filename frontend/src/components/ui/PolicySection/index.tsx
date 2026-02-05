import React, { ReactNode } from 'react';
import { Typography } from 'antd';

const { Paragraph, Title } = Typography;

interface ListItem {
  /** List item text (i18n key) */
  key: string;
  /** Optional text (if not using i18n key) */
  text?: string;
}

interface PolicySectionProps {
  /** Section title (i18n key) */
  title: string;
  /** Section content (i18n key or plain text) */
  content: string;
  /** Optional list items (i18n keys or plain text) */
  listItems?: (string | ListItem)[];
  /** Title level for semantic heading */
  titleLevel?: 2 | 3 | 4 | 5;
  /** Additional children to render after content */
  children?: ReactNode;
  /** Test ID for testing */
  testId?: string;
}

export const PolicySection: React.FC<PolicySectionProps> = ({
  title,
  content,
  listItems,
  titleLevel = 2,
  children,
  testId = 'policy-section',
}) => {
  const renderListItems = () => {
    if (!listItems || listItems.length === 0) return null;

    return (
      <ul className="policy-list">
        {listItems.map((item, index) => {
          const itemText = typeof item === 'string' ? item : item.text || item.key;
          return <li key={index}>{itemText}</li>;
        })}
      </ul>
    );
  };

  return (
    <section className="policy-section" data-testid={testId}>
      <Title level={titleLevel} className="policy-section-title">
        {title}
      </Title>
      <Paragraph className="policy-section-content">{content}</Paragraph>
      {renderListItems()}
      {children}
    </section>
  );
};

export default PolicySection;
