import React from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import styles from './Footer.module.scss';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <h4>FindClass.nz</h4>
          <p>{t('footer.tagline')}</p>
        </div>
        <div className={styles.footerSection}>
          <h4>{t('footer.quickLinks')}</h4>
          <a href={ROUTES.COURSES}>{t('footer.quickLinks.courses')}</a>
          <a href={ROUTES.TUTORS}>{t('footer.quickLinks.tutors')}</a>
          <a href={ROUTES.ABOUT}>{t('footer.quickLinks.about')}</a>
        </div>
        <div className={styles.footerSection}>
          <h4>{t('footer.support')}</h4>
          <a href={ROUTES.HELP}>{t('footer.support.help')}</a>
          <a href={ROUTES.CONTACT}>{t('footer.support.contact')}</a>
          <a href={ROUTES.FEEDBACK}>{t('footer.support.feedback')}</a>
          <a href={ROUTES.PRIVACY}>{t('footer.support.privacy')}</a>
          <a href={ROUTES.COOKIE_POLICY}>{t('footer.support.cookie')}</a>
        </div>
      </div>
      <div className={styles.copyright}>
        © {currentYear} FindClass.nz. {t('footer.copyright')}
      </div>
    </footer>
  );
};

export default Footer;
