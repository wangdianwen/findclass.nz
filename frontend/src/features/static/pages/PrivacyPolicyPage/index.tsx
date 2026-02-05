import { useTranslation } from 'react-i18next';
import { ContentPageTemplate } from '@/components/layout/ContentPageTemplate';
import { PolicySection } from '@/components/ui/PolicySection';
import { CopyableEmail } from '@/components/ui/CopyableEmail';
import styles from './PrivacyPolicyPage.module.scss';

export const PrivacyPolicyPage = () => {
  const { t } = useTranslation('privacy');

  return (
    <ContentPageTemplate
      title={t('title')}
      lastUpdated={t('lastUpdated', 'Last updated: January 2026')}
      testId="privacyPolicyPage"
    >
      <div className={styles.sections}>
        <PolicySection
          title={t('sections.introduction.title')}
          content={t('sections.introduction.content')}
        />

        <PolicySection
          title={t('sections.dataCollection.title')}
          content={t('sections.dataCollection.content')}
          listItems={[
            t('sections.dataCollection.item1'),
            t('sections.dataCollection.item2'),
            t('sections.dataCollection.item3'),
            t('sections.dataCollection.item4'),
          ]}
        />

        <PolicySection
          title={t('sections.dataUsage.title')}
          content={t('sections.dataUsage.content')}
          listItems={[
            t('sections.dataUsage.item1'),
            t('sections.dataUsage.item2'),
            t('sections.dataUsage.item3'),
            t('sections.dataUsage.item4'),
          ]}
        />

        <PolicySection
          title={t('sections.dataSharing.title')}
          content={t('sections.dataSharing.content')}
          listItems={[
            t('sections.dataSharing.item1'),
            t('sections.dataSharing.item2'),
            t('sections.dataSharing.item3'),
          ]}
        />

        <PolicySection
          title={t('sections.dataSecurity.title')}
          content={t('sections.dataSecurity.content')}
        />

        <PolicySection
          title={t('sections.userRights.title')}
          content={t('sections.userRights.content')}
          listItems={[
            t('sections.userRights.item1'),
            t('sections.userRights.item2'),
            t('sections.userRights.item3'),
            t('sections.userRights.item4'),
          ]}
        />

        <PolicySection
          title={t('sections.cookies.title')}
          content={t('sections.cookies.content')}
        />

        <PolicySection
          title={t('sections.children.title')}
          content={t('sections.children.content')}
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
