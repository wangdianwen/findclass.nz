import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { ContentPageTemplate } from '@/components/layout/ContentPageTemplate';
import { ContactForm } from '@/components/contact/ContactForm';
import { CopyableEmail } from '@/components/ui/CopyableEmail';
import { useUserStore } from '@/stores/userStore';
import styles from './ContactPage.module.scss';

const { Title, Paragraph } = Typography;

export const ContactPage = () => {
  const { t } = useTranslation('contact');
  const { user } = useUserStore();

  const subjectOptions = [
    { value: 'general', label: t('form.subjectGeneral') },
    { value: 'technical', label: t('form.subjectTechnical') },
    { value: 'course', label: t('form.subjectCourse') },
    { value: 'tutor', label: t('form.subjectTutor') },
    { value: 'institution', label: t('form.subjectInstitution') },
    { value: 'other', label: t('form.subjectOther') },
  ];

  return (
    <ContentPageTemplate title={t('contactUs')} testId="contact-page">
      <Paragraph className={styles.description}>{t('description')}</Paragraph>

      <section className={styles.section}>
        <Title level={2}>{t('contactInfo')}</Title>
        <div className={styles.contactSection}>
          <div className={styles.contactGrid}>
            <div className={styles.contactCard}>
              <div className={styles.iconWrapper}>
                <MailOutlined />
              </div>
              <div className={styles.contactTitle}>{t('email')}</div>
              <div className={styles.contactValue}>
                <CopyableEmail email={t('emailAddress')} testId="email-address" />
              </div>
              <div className={styles.responseTime}>{t('responseTime')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <Title level={2}>{t('formTitle')}</Title>
        <Paragraph className={styles.sectionDescription}>{t('formDesc')}</Paragraph>
        <ContactForm
          subjectOptions={subjectOptions}
          userName={user?.name}
          userEmail={user?.email}
        />
      </section>
    </ContentPageTemplate>
  );
};
