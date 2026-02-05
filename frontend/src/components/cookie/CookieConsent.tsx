import React, { useState, useCallback, useEffect } from 'react';
import { Button, Checkbox, Drawer, Typography, Space, Divider } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { cookieService, defaultCategories } from '@/services';
import type { CookieCategory, CookieConsentProps } from './types';
import styles from './CookieConsent.module.scss';

const { Text, Paragraph, Link } = Typography;

export const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
  const { t } = useTranslation('cookie');
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>(defaultCategories);
  const [preferencesVisible, setPreferencesVisible] = useState(false);

  useEffect(() => {
    if (cookieService.cookieConsent.hasAccepted()) {
      return;
    }

    if (cookieService.cookieDeclined.isActive()) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  const handleAcceptAll = useCallback(() => {
    const allEnabled = categories.map(cat => ({
      ...cat,
      enabled: true,
    }));
    setCategories(allEnabled);
    onAccept(allEnabled);

    cookieService.cookieConsent.save(allEnabled);
    cookieService.cookieDeclined.clear();

    setVisible(false);
  }, [categories, onAccept]);

  const handleDecline = useCallback(() => {
    cookieService.cookieDeclined.set();
    onDecline();
    setVisible(false);
  }, [onDecline]);

  const handleSavePreferences = useCallback(() => {
    onAccept(categories);

    cookieService.cookieConsent.save(categories);
    cookieService.cookieDeclined.clear();

    setPreferencesVisible(false);
    setVisible(false);
  }, [categories, onAccept]);

  const handleToggleCategory = useCallback((id: string) => {
    setCategories(prev =>
      prev.map(cat => (cat.id === id && !cat.required ? { ...cat, enabled: !cat.enabled } : cat))
    );
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.cookieBanner}>
      <div className={styles.content}>
        <SafetyCertificateOutlined className={styles.icon} />
        <div className={styles.text}>
          <Text strong>{t('title')}</Text>
          <Paragraph className={styles.description}>
            {t('description')}
            <Link href={ROUTES.COOKIE_POLICY} className={styles.link}>
              {t('learnMore')}
            </Link>
          </Paragraph>
        </div>
        <Space className={styles.actions}>
          <Button variant="outlined" onClick={handleDecline} data-testid="decline-button">
            {t('decline')}
          </Button>
          <Button onClick={() => setPreferencesVisible(true)}>{t('customize')}</Button>
          <Button type="primary" onClick={handleAcceptAll} data-testid="accept-all-button">
            {t('acceptAll')}
          </Button>
        </Space>
      </div>

      <Drawer
        title={t('preferencesTitle')}
        open={preferencesVisible}
        onClose={() => setPreferencesVisible(false)}
        size="small"
        footer={
          <div className={styles.drawerFooter}>
            <Button onClick={() => setPreferencesVisible(false)}>{t('cancel')}</Button>
            <Button
              type="primary"
              onClick={handleSavePreferences}
              data-testid="save-preferences-button"
            >
              {t('save')}
            </Button>
          </div>
        }
      >
        <div className={styles.preferences}>
          <Text className={styles.sectionTitle}>{t('selectCategories')}</Text>
          <Divider />
          {categories.map(category => (
            <div key={category.id} className={styles.categoryItem}>
              <div className={styles.categoryHeader}>
                <div className={styles.categoryInfo}>
                  <Text strong>{t(category.name)}</Text>
                  {category.required && <Text className={styles.requiredTag}>{t('required')}</Text>}
                </div>
                <Checkbox
                  checked={category.enabled}
                  disabled={category.required}
                  onChange={() => handleToggleCategory(category.id)}
                />
              </div>
              <Text className={styles.categoryDescription}>{t(category.description)}</Text>
            </div>
          ))}
          <Divider />
          <div className={styles.privacyLink}>
            <a href={ROUTES.COOKIE_POLICY}>{t('cookiePolicy')}</a>
            <a href={ROUTES.PRIVACY}>{t('privacyPolicy')}</a>
            <a href={ROUTES.TERMS}>{t('terms')}</a>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default CookieConsent;
