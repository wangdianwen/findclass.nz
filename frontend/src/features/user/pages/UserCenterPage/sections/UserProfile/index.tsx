import React, { useState, useCallback, useMemo } from 'react';
import {
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  Switch,
  Modal,
  Divider,
  message,
  Select,
  Tabs,
  Spin,
} from 'antd';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import ImgCrop from 'antd-img-crop';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  DeleteOutlined,
  WechatOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/userStore';
import { DefaultAvatarSelector } from '@/components/ui';
import { DEFAULT_AVATAR } from '@/utils/defaultImages';
import type { UserProfile as UserProfileType } from '@/services/api';
import { userCenterApi } from '@/services/api';
import styles from './UserProfile.module.scss';

interface UserProfileProps {
  profile?: UserProfileType;
  isLoading?: boolean;
  testId?: string;
}

// ============================================
// Component
// ============================================

export const UserProfile: React.FC<UserProfileProps> = ({
  profile,
  isLoading = false,
  testId = 'user-profile',
}) => {
  const { t } = useTranslation('user');
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const passwordValues = Form.useWatch(
    ['currentPassword', 'newPassword', 'confirmPassword'],
    passwordForm
  );
  const isPasswordValid = useMemo(() => {
    const { currentPassword, newPassword, confirmPassword } = passwordValues || {};
    return !!(currentPassword && newPassword && confirmPassword);
  }, [passwordValues]);

  const handleAvatarChange = useCallback(
    async (info: UploadChangeParam<UploadFile>) => {
      const file = info.file.originFileObj;
      if (!file) return;

      if (info.file.status === 'uploading') {
        setLoading(true);
        return;
      }

      if (info.file.status === 'done') {
        try {
          const response = await userCenterApi.uploadAvatar(file);
          if (response.success && response.data?.url) {
            setAvatarUrl(response.data.url);
            message.success(t('success'));
          }
        } catch {
          message.error(t('error'));
        } finally {
          setLoading(false);
        }
      }
    },
    [t]
  );

  const handleSave = useCallback(async () => {
    try {
      await form.validateFields();
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(t('success'));
      setEditing(false);
    } catch {
      // Validation failed
    } finally {
      setLoading(false);
    }
  }, [form, t]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    setEditing(false);
  }, [form]);

  const handleChangePassword = useCallback(async () => {
    try {
      await passwordForm.validateFields();
      setPasswordLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(t('settings.account.passwordUpdated'));
      passwordForm.resetFields();
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
        window.location.href = '/';
      },
    });
  }, [t]);

  // Handle default avatar selection - just update state without immediate save
  const handleDefaultAvatarSelect = useCallback((url: string) => {
    setAvatarUrl(url);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingState} data-testid={`${testId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.profileSection} data-testid={testId}>
      {/* Section 1: Personal Info & Avatar */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('profile.title')}</h2>
          {!editing && (
            <Button type="primary" onClick={() => setEditing(true)} data-testid="edit-button">
              {t('profile.edit')}
            </Button>
          )}
        </div>

        <div className={styles.personalInfo}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              {avatarUrl ? (
                <Avatar size={100} src={avatarUrl} alt="Avatar" />
              ) : (
                <Avatar size={100} src={profile?.avatar || DEFAULT_AVATAR}>
                  {user?.name?.charAt(0).toUpperCase() ||
                    profile?.name?.charAt(0).toUpperCase() ||
                    'U'}
                </Avatar>
              )}
            </div>
          </div>

          {editing && (
            <div className={styles.avatarSelector}>
              <h4 className={styles.avatarSelectorTitle}>{t('profile.selectAvatar')}</h4>
              <Tabs
                defaultActiveKey="default"
                size="small"
                items={[
                  {
                    key: 'default',
                    label: t('profile.avatarDefault'),
                    children: (
                      <DefaultAvatarSelector
                        value={avatarUrl || profile?.avatar || DEFAULT_AVATAR}
                        onChange={handleDefaultAvatarSelect}
                      />
                    ),
                  },
                  {
                    key: 'upload',
                    label: t('profile.avatarUpload'),
                    children: (
                      <ImgCrop
                        cropShape="round"
                        aspect={1}
                        quality={1}
                        modalTitle={t('profile.cropAvatar')}
                      >
                        <Upload
                          name="avatar"
                          showUploadList={false}
                          accept="image/*"
                          beforeUpload={() => false}
                          onChange={handleAvatarChange}
                          data-testid="avatar-upload"
                        >
                          <Button icon={<UploadOutlined />}>{t('profile.uploadAvatar')}</Button>
                        </Upload>
                      </ImgCrop>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {editing ? (
            <Form form={form} layout="vertical" className={styles.infoForm}>
              <Form.Item
                name="fullName"
                label={<span className={styles.fieldLabel}>{t('profile.fullName')}</span>}
                className={styles.formField}
                rules={[{ required: true, message: t('profile.placeholder.fullName') }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder={t('profile.placeholder.fullName')}
                  data-testid="fullname-input"
                  defaultValue={profile?.name}
                />
              </Form.Item>

              <Form.Item
                name="gender"
                label={<span className={styles.fieldLabel}>{t('profile.gender')}</span>}
              >
                <Select
                  placeholder={t('profile.gender')}
                  options={[
                    { value: 'male', label: t('profile.genderMale') },
                    { value: 'female', label: t('profile.genderFemale') },
                    { value: 'other', label: t('profile.genderOther') },
                    { value: 'preferNot', label: t('profile.genderPreferNot') },
                  ]}
                  defaultValue={profile?.gender}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span className={styles.fieldLabel}>{t('profile.email')}</span>}
              >
                <Input
                  prefix={<MailOutlined />}
                  disabled
                  data-testid="email-display"
                  defaultValue={profile?.email || user?.email}
                />
              </Form.Item>

              <Form.Item
                name="phone"
                label={<span className={styles.fieldLabel}>{t('profile.phone')}</span>}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder={t('profile.placeholder.phone')}
                  data-testid="phone-input"
                  defaultValue={profile?.phone}
                />
              </Form.Item>

              <Form.Item
                name="wechat"
                label={<span className={styles.fieldLabel}>{t('profile.wechat')}</span>}
              >
                <Input
                  prefix={<WechatOutlined />}
                  placeholder={t('profile.placeholder.wechat')}
                  data-testid="wechat-input"
                  defaultValue={profile?.wechat}
                />
              </Form.Item>

              <div className={styles.formActions}>
                <Button onClick={handleCancel} data-testid="cancel-button">
                  {t('profile.cancel')}
                </Button>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={loading}
                  data-testid="save-button"
                >
                  {t('profile.save')}
                </Button>
              </div>
            </Form>
          ) : (
            <div className={styles.infoDisplay}>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('profile.fullName')}</span>
                  <span className={styles.value}>{profile?.name || '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('profile.email')}</span>
                  <span className={styles.value}>{profile?.email || user?.email || '-'}</span>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('profile.phone')}</span>
                  <span className={styles.value}>{profile?.phone || '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('profile.wechat')}</span>
                  <span className={styles.value}>{profile?.wechat || '-'}</span>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('profile.gender')}</span>
                  <span className={styles.value}>
                    {profile?.gender
                      ? profile.gender === 'male'
                        ? t('profile.genderMale')
                        : profile.gender === 'female'
                          ? t('profile.genderFemale')
                          : t('profile.genderOther')
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Privacy Settings */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.privacy.title')}</h2>
        <div className={styles.settingsList}>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.privacy.showEmail')}</p>
            </div>
            <div className={styles.itemAction}>
              <Switch data-testid="show-email-switch" defaultChecked={profile?.showEmail} />
            </div>
          </div>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.privacy.showPhone')}</p>
            </div>
            <div className={styles.itemAction}>
              <Switch data-testid="show-phone-switch" defaultChecked={profile?.showPhone} />
            </div>
          </div>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.privacy.showWechat')}</p>
            </div>
            <div className={styles.itemAction}>
              <Switch data-testid="show-wechat-switch" defaultChecked={profile?.showWechat} />
            </div>
          </div>
          <div className={styles.settingsItem}>
            <div className={styles.itemInfo}>
              <p className={styles.itemLabel}>{t('settings.privacy.showRealName')}</p>
            </div>
            <div className={styles.itemAction}>
              <Switch data-testid="show-realname-switch" defaultChecked={profile?.showRealName} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Account Security */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('settings.account.title')}</h2>
        <Form form={passwordForm} layout="vertical" className={styles.passwordForm}>
          <Form.Item
            name="currentPassword"
            label={t('settings.account.currentPassword')}
            rules={[{ required: true, message: t('profile.required') }]}
            className={styles.formField}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('settings.account.currentPasswordPlaceholder')}
              data-testid="current-password-input"
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t('settings.account.newPassword')}
            rules={[{ required: true, message: t('profile.required') }]}
            className={styles.formField}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('settings.account.newPasswordPlaceholder')}
              data-testid="new-password-input"
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('settings.account.confirmPassword')}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t('profile.required') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('settings.account.passwordMismatch')));
                },
              }),
            ]}
            className={styles.formField}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('settings.account.confirmPasswordPlaceholder')}
              data-testid="confirm-password-input"
            />
          </Form.Item>
          <div className={styles.formActions}>
            <Button
              type="primary"
              onClick={handleChangePassword}
              loading={passwordLoading}
              data-testid="update-password-button"
              disabled={!isPasswordValid}
            >
              {t('settings.account.changePassword')}
            </Button>
          </div>
        </Form>
      </div>

      {/* Section 4: Danger Zone */}
      <div className={styles.section}>
        <Divider />
        <div className={styles.dangerZone}>
          <h3 className={styles.dangerTitle}>{t('settings.danger.title')}</h3>
          <p className={styles.dangerDesc}>{t('settings.danger.deleteConfirm')}</p>
          <Button
            danger
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

export default UserProfile;
