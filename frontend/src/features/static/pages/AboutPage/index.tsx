import { useTranslation } from 'react-i18next';
import { Typography, Row, Col } from 'antd';
import {
  SafetyCertificateOutlined,
  TeamOutlined,
  GlobalOutlined,
  StarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { ContentPageTemplate } from '@/components/layout/ContentPageTemplate';
import { CopyableEmail } from '@/components/ui/CopyableEmail';
import styles from './AboutPage.module.scss';

const { Paragraph, Text } = Typography;

export const AboutPage = () => {
  const { t } = useTranslation('about');

  return (
    <ContentPageTemplate title={t('title')} testId="aboutPage">
      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>{t('hero.title')}</h1>
        <Paragraph className={styles.heroSubtitle}>{t('hero.subtitle')}</Paragraph>
      </section>

      {/* Our Story Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('story.title')}</h2>
        <Paragraph className={styles.sectionDescription}>{t('story.content1')}</Paragraph>
        <Paragraph className={styles.sectionDescription}>{t('story.content2')}</Paragraph>
      </section>

      {/* Mission Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('mission.title')}</h2>
        <div className={styles.missionCards}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>
                  <TeamOutlined className={styles.missionIconAnticon} />
                </div>
                <h4 className={styles.missionCardTitle}>{t('mission.freeTutors.title')}</h4>
                <Text className={styles.missionCardDescription}>
                  {t('mission.freeTutors.description')}
                </Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>
                  <GlobalOutlined className={styles.missionIconAnticon} />
                </div>
                <h4 className={styles.missionCardTitle}>{t('mission.freeStudents.title')}</h4>
                <Text className={styles.missionCardDescription}>
                  {t('mission.freeStudents.description')}
                </Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>
                  <StarOutlined className={styles.missionIconAnticon} />
                </div>
                <h4 className={styles.missionCardTitle}>{t('mission.transparency.title')}</h4>
                <Text className={styles.missionCardDescription}>
                  {t('mission.transparency.description')}
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('values.title')}</h2>
        <div className={styles.valuesGrid}>
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={6}>
              <div className={styles.valueItem}>
                <CheckCircleOutlined className={styles.valueIcon} />
                <h5 className={styles.valueItemTitle}>{t('values.quality.title')}</h5>
                <Text className={styles.valueItemDescription}>
                  {t('values.quality.description')}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className={styles.valueItem}>
                <CheckCircleOutlined className={styles.valueIcon} />
                <h5 className={styles.valueItemTitle}>{t('values.trust.title')}</h5>
                <Text className={styles.valueItemDescription}>{t('values.trust.description')}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className={styles.valueItem}>
                <CheckCircleOutlined className={styles.valueIcon} />
                <h5 className={styles.valueItemTitle}>{t('values.accessibility.title')}</h5>
                <Text className={styles.valueItemDescription}>
                  {t('values.accessibility.description')}
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className={styles.valueItem}>
                <CheckCircleOutlined className={styles.valueIcon} />
                <h5 className={styles.valueItemTitle}>{t('values.transparency.title')}</h5>
                <Text className={styles.valueItemDescription}>
                  {t('values.transparency.description')}
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Trust Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('trust.title')}</h2>
        <Paragraph className={styles.sectionDescription}>{t('trust.content')}</Paragraph>
        <div className={styles.trustBadges}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <div className={styles.trustBadge}>
                <SafetyCertificateOutlined className={styles.badgeIcon} />
                <Text className={styles.trustBadgeText}>{t('trust.badges.verified')}</Text>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className={styles.trustBadge}>
                <SafetyCertificateOutlined className={styles.badgeIcon} />
                <Text className={styles.trustBadgeText}>{t('trust.badges.secure')}</Text>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className={styles.trustBadge}>
                <SafetyCertificateOutlined className={styles.badgeIcon} />
                <Text className={styles.trustBadgeText}>{t('trust.badges.quality')}</Text>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className={styles.trustBadge}>
                <SafetyCertificateOutlined className={styles.badgeIcon} />
                <Text className={styles.trustBadgeText}>{t('trust.badges.transparent')}</Text>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('contact.title')}</h2>
        <Paragraph className={styles.sectionDescription}>{t('contact.content')}</Paragraph>
        <div className={styles.contactInfo}>
          <CopyableEmail email={t('contact.email')} testId="contact-email" />
        </div>
      </section>
    </ContentPageTemplate>
  );
};
