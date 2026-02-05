import React, { useState, useCallback } from 'react';
import { Form, Input, Button, Switch, Select, Modal, message, Divider } from 'antd';
import { LockOutlined, ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './SettingsPanel.module.scss';

interface SettingsPanelProps {
  testId?: string;
}

// ============================================
// Component
// ============================================

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ testId = 'settings-panel' }) => {
  const { t, i18n } = useTranslation('user');
  const [passwordForm] = Form.useForm();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSectionVisible, setPasswordSectionVisible] = useState(false);

  const handleChangePassword = useCallback(async () => {
    try {
      await passwordForm.validateFields();
      setPasswordLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(t('settings.account.passwordUpdated'));
      passwordForm.resetFields();
      setPasswordSectionVisible(false);
    } catch {
      // Validation failed
    } finally {
      setPasswordLoading(false);
    }
  }, [passwordForm, t]);

  const handleDeleteAccount = useCallback(() => {
    Modal.confirm({
      title: t('settings.danger.deleteAccount'),
      content: t('settings.danger.deleteConfirm'),
      icon: <ExclamationCircleOutlined />,
      okText: t('settings.danger.deleteAccount'),
      okType: 'danger',
      cancelText: t('profile.cancel'),
      onOk() {
        message.success(t('settings.danger.deleteSuccess'));
        // Navigate to home
        window.location.href = '/';
      },
    });
  }, [t]);

  const handleLanguageChange = useCallback(
    (value: string) => {
      i18n.changeLanguage(value);
      message.success('Language changed');
    },
    [i18n]
  );

  return (
    <div className={styles.settingsSection} data-testid={testId}>
      {/* Account Security */}
      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>{t('settings.account.title')}</h3>
        <div className={styles.settingsList}>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.account.changePassword')}</p>
              <p className={styles.itemDesc}>Update your password regularly for security</p>
            </div>
            <div className={styles.itemAction}>
              <Button
                type="primary"
                ghost
                onClick={() => setPasswordSectionVisible(!passwordSectionVisible)}
                data-testid="change-password-button"
              >
                {t('settings.account.changePassword')}
              </Button>
            </div>
          </div>
        </div>

        {passwordSectionVisible && (
          <Form form={passwordForm} layout="vertical" className={styles.passwordForm}>
            <Form.Item
              name="currentPassword"
              label="Current Password"
              rules={[{ required: true }]}
              className={styles.formField}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter current password"
                data-testid="current-password-input"
              />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[{ required: true }]}
              className={styles.formField}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter new password"
                data-testid="new-password-input"
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['newPassword']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
              className={styles.formField}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm new password"
                data-testid="confirm-password-input"
              />
            </Form.Item>
            <div className={styles.formActions}>
              <Button onClick={() => setPasswordSectionVisible(false)}>
                {t('profile.cancel')}
              </Button>
              <Button
                type="primary"
                onClick={handleChangePassword}
                loading={passwordLoading}
                data-testid="update-password-button"
              >
                {t('profile.save')}
              </Button>
            </div>
          </Form>
        )}
      </div>

      <Divider />

      {/* Privacy */}
      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>{t('settings.privacy.title')}</h3>
        <div className={styles.settingsList}>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.privacy.showEmail')}</p>
            </div>
            <div className={styles.itemAction}>
              <Switch data-testid="show-email-switch" />
            </div>
          </div>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.privacy.showPhone')}</p>
            </div>
            <div className={styles.itemAction}>
              <Switch data-testid="show-phone-switch" />
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Appearance */}
      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>{t('settings.appearance.title')}</h3>
        <div className={styles.settingsList}>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.appearance.language')}</p>
            </div>
            <div className={styles.itemAction}>
              <Select
                defaultValue={i18n.language}
                style={{ width: 140 }}
                onChange={handleLanguageChange}
                data-testid="language-select"
                options={[
                  { value: 'en', label: t('settings.appearance.languageEn') },
                  { value: 'zh', label: t('settings.appearance.languageZh') },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Danger Zone */}
      <div className={styles.settingsGroup}>
        <div className={styles.dangerZone}>
          <h4 className={styles.dangerTitle}>{t('settings.danger.title')}</h4>
          <p className={styles.dangerDesc}>{t('settings.danger.deleteConfirm')}</p>
          <Button
            danger
            className={styles.dangerButton}
            icon={<DeleteOutlined />}
            onClick={handleDeleteAccount}
            data-testid="delete-account-button"
          >
            {t('settings.danger.deleteAccount')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
