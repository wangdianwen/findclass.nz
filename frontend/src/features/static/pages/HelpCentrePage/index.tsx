import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumb, Typography, Collapse } from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  TeamOutlined,
  BankOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import styles from './HelpCentrePage.module.scss';

const { Title, Paragraph } = Typography;

interface FAQItem {
  key: string;
  question: string;
  answer: string;
}

export const HelpCentrePage = () => {
  const { t } = useTranslation('help');
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const faqItems: FAQItem[] = [
    {
      key: 'q1',
      question: t('faq.search.q'),
      answer: t('faq.search.a'),
    },
    {
      key: 'q2',
      question: t('faq.contact.q'),
      answer: t('faq.contact.a'),
    },
    {
      key: 'q3',
      question: t('faq.booking.q'),
      answer: t('faq.booking.a'),
    },
    {
      key: 'q4',
      question: t('faq.payment.q'),
      answer: t('faq.payment.a'),
    },
    {
      key: 'q5',
      question: t('faq.refund.q'),
      answer: t('faq.refund.a'),
    },
    {
      key: 'q6',
      question: t('faq.report.q'),
      answer: t('faq.report.a'),
    },
    {
      key: 'q7',
      question: t('faq.becomeTutor.q'),
      answer: t('faq.becomeTutor.a'),
    },
    {
      key: 'q8',
      question: t('faq.privacy.q'),
      answer: t('faq.privacy.a'),
    },
  ];

  const handleFaqChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  const collapseItems = faqItems.map(item => ({
    key: item.key,
    label: (
      <div className={styles.faqQuestion}>
        <span className={styles.questionText}>
          <span className={styles.questionIcon}>Q</span>
          {item.question}
        </span>
      </div>
    ),
    children: (
      <div className={styles.faqAnswer}>
        <Paragraph>{item.answer}</Paragraph>
      </div>
    ),
  }));

  return (
    <div className={styles.helpCentrePage} data-testid="helpCentrePage">
      <div className={styles.breadcrumb} data-testid="breadcrumb">
        <Breadcrumb
          items={[
            {
              href: '/',
              title: <HomeOutlined />,
            },
            {
              title: t('helpCentre'),
            },
          ]}
        />
      </div>

      <div className={styles.content} data-testid="helpContent">
        <Title level={1}>{t('helpCentre')}</Title>
        <Paragraph className={styles.description}>{t('description')}</Paragraph>

        <section className={styles.section}>
          <Title level={2}>{t('faqTitle')}</Title>
          <Collapse
            accordion
            expandIconPlacement="end"
            activeKey={activeKeys}
            onChange={handleFaqChange}
            items={collapseItems}
          />
        </section>

        <section className={styles.section}>
          <Title level={2}>{t('quickLinks')}</Title>
          <div className={styles.quickLinks} data-testid="quickLinks">
            <a href={ROUTES.COURSES} className={styles.quickLinkCard} data-testid="quickLinkCard-1">
              <SearchOutlined className={styles.linkIcon} />
              <div className={styles.linkContent}>
                <div className={styles.linkTitle}>{t('links.searchCourses')}</div>
                <div className={styles.linkDesc}>{t('links.searchCoursesDesc')}</div>
              </div>
            </a>
            <a href={ROUTES.TUTORS} className={styles.quickLinkCard} data-testid="quickLinkCard-2">
              <TeamOutlined className={styles.linkIcon} />
              <div className={styles.linkContent}>
                <div className={styles.linkTitle}>{t('links.findTutors')}</div>
                <div className={styles.linkDesc}>{t('links.findTutorsDesc')}</div>
              </div>
            </a>
            <div className={styles.quickLinkCard} data-testid="quickLinkCard-3">
              <BankOutlined className={styles.linkIcon} />
              <div className={styles.linkContent}>
                <div className={styles.linkTitle}>{t('links.institutions')}</div>
                <div className={styles.linkDesc}>{t('links.institutionsDesc')}</div>
              </div>
            </div>
            <a href={ROUTES.PRIVACY} className={styles.quickLinkCard} data-testid="quickLinkCard-4">
              <LockOutlined className={styles.linkIcon} />
              <div className={styles.linkContent}>
                <div className={styles.linkTitle}>{t('links.privacy')}</div>
                <div className={styles.linkDesc}>{t('links.privacyDesc')}</div>
              </div>
            </a>
          </div>
        </section>

        <section className={styles.section}>
          <Title level={2}>{t('contactTitle')}</Title>
          <Paragraph>{t('contactDesc')}</Paragraph>
          <div className={styles.contactSection}>
            <Link to={ROUTES.CONTACT} className={styles.contactLink}>
              <span className={styles.contactLinkText}>{t('contactLink')}</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
