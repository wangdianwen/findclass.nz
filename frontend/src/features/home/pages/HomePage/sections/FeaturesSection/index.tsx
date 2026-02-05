import React from 'react';
import Tabs from 'antd/es/tabs';
import Steps from 'antd/es/steps';
import {
  RobotOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyCertificateFilled,
  EyeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './FeaturesSection.module.scss';
import { FeaturesGrid } from './FeaturesGrid';
import { StudentRoleGrid, TutorRoleGrid } from './RoleGrid';
import { HowItWorksGrid } from './HowItWorksGrid';

// ============================================
// Component
// ============================================

interface FeaturesSectionProps {}

export const FeaturesSection: React.FC<FeaturesSectionProps> = () => {
  const { t } = useTranslation();

  const featureTabs = [
    {
      key: 'features',
      icon: <RobotOutlined />,
      label: t('features.tab.features'),
      children: (
        <div className={styles.tabContent}>
          <FeaturesGrid />
        </div>
      ),
    },
    {
      key: 'students',
      icon: <UserOutlined />,
      label: t('features.tab.students'),
      children: (
        <div className={styles.tabContent}>
          <StudentRoleGrid />
        </div>
      ),
    },
    {
      key: 'tutors',
      icon: <TeamOutlined />,
      label: t('features.tab.tutors'),
      children: (
        <div className={styles.tabContent}>
          <TutorRoleGrid />
        </div>
      ),
    },
    {
      key: 'registration',
      icon: <SafetyCertificateFilled />,
      label: t('features.tab.registration'),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.stepsContainer}>
            <div className={styles.stepsLeft}>
              <h3>{t('registration.student')}</h3>
              <Steps
                direction="vertical"
                current={3}
                items={[
                  {
                    title: t('registration.student.step1'),
                    description: t('registration.student.step1.desc'),
                  },
                  {
                    title: t('registration.student.step2.alt'),
                    description: t('registration.student.step2.alt.desc'),
                  },
                  {
                    title: t('registration.student.step3.alt'),
                    description: t('registration.student.step3.alt.desc'),
                  },
                  {
                    title: t('registration.student.step4.alt'),
                    description: t('registration.student.step4.alt.desc'),
                  },
                ]}
              />
            </div>
            <div className={styles.stepsRight}>
              <h3>{t('registration.tutor')}</h3>
              <Steps
                direction="vertical"
                current={4}
                items={[
                  {
                    title: t('registration.tutor.step1'),
                    description: t('registration.tutor.step1.desc'),
                  },
                  {
                    title: t('registration.tutor.step2'),
                    description: t('registration.tutor.step2.desc'),
                  },
                  {
                    title: t('registration.tutor.step3'),
                    description: t('registration.tutor.step3.desc'),
                  },
                  {
                    title: t('registration.tutor.step4'),
                    description: t('registration.tutor.step4.desc'),
                  },
                  {
                    title: t('registration.tutor.step5'),
                    description: t('registration.tutor.step5.desc'),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'howitworks',
      icon: <EyeOutlined />,
      label: t('features.tab.howItWorks'),
      children: (
        <div className={styles.tabContent}>
          <HowItWorksGrid />
        </div>
      ),
    },
  ];

  return (
    <section className={styles.featuresSection}>
      <div className={styles.featuresContent}>
        <h2 className={styles.featuresTitle}>{t('features.whyChooseUs')}</h2>
        <Tabs
          className={styles.featureTabs}
          tabPlacement="top"
          size="large"
          animated={{ inkBar: true, tabPane: true }}
          items={featureTabs}
        />
      </div>
    </section>
  );
};

export default FeaturesSection;
