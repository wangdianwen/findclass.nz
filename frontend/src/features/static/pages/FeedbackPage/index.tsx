import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { ContentPageTemplate } from '@/components/layout/ContentPageTemplate';
import { ContactForm } from '@/components/contact/ContactForm';
import styles from './FeedbackPage.module.scss';

const { Paragraph } = Typography;

export const FeedbackPage = () => {
  const { t } = useTranslation('feedback');

  const subjectOptions = [
    { value: 'expired', label: t('form.subjectExpired') },
    { value: 'incorrect', label: t('form.subjectIncorrect') },
    { value: 'fake', label: t('form.subjectFake') },
    { value: 'invalid_contact', label: t('form.subjectInvalidContact') },
    { value: 'inappropriate', label: t('form.subjectInappropriate') },
    { value: 'other', label: t('form.subjectOther') },
  ];

  return (
    <ContentPageTemplate title={t('feedback')} testId="feedback-page">
      <Paragraph className={styles.description}>{t('description')}</Paragraph>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('formTitle')}</h2>
        <Paragraph className={styles.sectionDescription}>{t('formDesc')}</Paragraph>
        <ContactForm subjectOptions={subjectOptions} />
      </section>
    </ContentPageTemplate>
  );
};
