import { useTranslation } from 'react-i18next';
import { ContentPageTemplate } from '@/components/layout/ContentPageTemplate';
import { PolicySection } from '@/components/ui/PolicySection';
import { CopyableEmail } from '@/components/ui/CopyableEmail';
import styles from './CookiePolicyPage.module.scss';

export const CookiePolicyPage = () => {
  const { t } = useTranslation('cookie');

  return (
    <ContentPageTemplate
      title={t('cookiePolicy')}
      lastUpdated={t('lastUpdated', 'Last updated: January 2026')}
    >
      <div className={styles.sections}>
        <PolicySection
          title={t('sections.introduction.title')}
          content={t('sections.introduction.content')}
        />

        <PolicySection
          title={t('sections.whatAreCookies.title')}
          content={t('sections.whatAreCookies.content')}
        />

        <PolicySection
          title={t('sections.typesOfCookies.title')}
          content={t('sections.typesOfCookies.content')}
        />

        <PolicySection
          title={t('sections.howWeUse.title')}
          content={t('sections.howWeUse.content')}
          listItems={[
            t('sections.howWeUse.item1'),
            t('sections.howWeUse.item2'),
            t('sections.howWeUse.item3'),
            t('sections.howWeUse.item4'),
          ]}
        />

        <PolicySection
          title={t('sections.cookieManagement.title')}
          content={t('sections.cookieManagement.content')}
          listItems={[
            t('sections.cookieManagement.item1'),
            t('sections.cookieManagement.item2'),
            t('sections.cookieManagement.item3'),
          ]}
        />

        <PolicySection
          title={t('sections.thirdParty.title')}
          content={t('sections.thirdParty.content')}
        />

        <PolicySection
          title={t('sections.updates.title')}
          content={t('sections.updates.content')}
        />

        <PolicySection
          title={t('sections.contact.title')}
          content={t('sections.contact.content')}
          testId="contact-section"
        >
          <CopyableEmail email={t('sections.contact.email')} testId="contact-email" />
        </PolicySection>
      </div>
    </ContentPageTemplate>
  );
};
