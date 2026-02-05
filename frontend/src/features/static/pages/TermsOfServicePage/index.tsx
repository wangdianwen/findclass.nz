import { useTranslation } from 'react-i18next';
import { ContentPageTemplate } from '@/components/layout/ContentPageTemplate';
import { PolicySection } from '@/components/ui/PolicySection';
import { CopyableEmail } from '@/components/ui/CopyableEmail';
import styles from './TermsOfServicePage.module.scss';

export const TermsOfServicePage = () => {
  const { t } = useTranslation('terms');

  return (
    <ContentPageTemplate
      title={t('title')}
      lastUpdated={t('lastUpdated', 'Last updated: January 2026')}
      testId="termsOfServicePage"
    >
      <div className={styles.sections}>
        <PolicySection
          title={t('sections.introduction.title')}
          content={t('sections.introduction.content')}
        />

        <PolicySection
          title={t('sections.acceptance.title')}
          content={t('sections.acceptance.content')}
        />

        <PolicySection
          title={t('sections.services.title')}
          content={t('sections.services.content')}
          listItems={[
            t('sections.services.item1'),
            t('sections.services.item2'),
            t('sections.services.item3'),
          ]}
        />

        <PolicySection
          title={t('sections.userResponsibilities.title')}
          content={t('sections.userResponsibilities.content')}
          listItems={[
            t('sections.userResponsibilities.item1'),
            t('sections.userResponsibilities.item2'),
            t('sections.userResponsibilities.item3'),
          ]}
        />

        <PolicySection
          title={t('sections.tutorTerms.title')}
          content={t('sections.tutorTerms.content')}
          listItems={[
            t('sections.tutorTerms.item1'),
            t('sections.tutorTerms.item2'),
            t('sections.tutorTerms.item3'),
          ]}
        />

        <PolicySection
          title={t('sections.platformRights.title')}
          content={t('sections.platformRights.content')}
          listItems={[
            t('sections.platformRights.item1'),
            t('sections.platformRights.item2'),
            t('sections.platformRights.item3'),
            t('sections.platformRights.item4'),
            t('sections.platformRights.item5'),
          ]}
        />

        <PolicySection
          title={t('sections.liability.title')}
          content={t('sections.liability.content')}
        />

        <PolicySection
          title={t('sections.termination.title')}
          content={t('sections.termination.content')}
        />

        <PolicySection
          title={t('sections.changes.title')}
          content={t('sections.changes.content')}
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
