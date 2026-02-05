import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Typography, message } from 'antd';
import { LockOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { FormProps } from 'antd';
import { AuthPageLayout } from '@/components/layout';
import { EmailInput } from '@/components/ui';
import { VerificationCodeButton } from '@/components/ui';
import { SubmitButton } from '@/components/ui';
import { authApi } from '@/services/api';
import styles from './ForgotPasswordPage.module.scss';

const { Text } = Typography;

// ============================================
// Types
// ============================================

interface ResetPasswordFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
}

// ============================================
// Component
// ============================================

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation('registration');
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const emailValue = Form.useWatch('email', form);

  const validatePassword = useCallback(
    (_rule: unknown, value: string) => {
      if (!value) {
        return Promise.reject(new Error(t('validation.passwordRequired')));
      }
      if (value.length < 8) {
        return Promise.reject(new Error(t('validation.passwordMinLength')));
      }
      if (!/[a-z]/.test(value)) {
        return Promise.reject(new Error(t('validation.passwordLowercase')));
      }
      if (!/[A-Z]/.test(value)) {
        return Promise.reject(new Error(t('validation.passwordUppercase')));
      }
      if (!/[0-9]/.test(value)) {
        return Promise.reject(new Error(t('validation.passwordNumber')));
      }
      return Promise.resolve();
    },
    [t]
  );

  const validateConfirmPassword = useCallback(
    (_rule: unknown, value: string) => {
      if (!value) {
        return Promise.reject(new Error(t('validation.confirmPasswordRequired')));
      }
      const password = form.getFieldValue('password');
      if (password && value !== password) {
        return Promise.reject(new Error(t('validation.passwordsDoNotMatch')));
      }
      return Promise.resolve();
    },
    [form, t]
  );

  const onFinish: FormProps<ResetPasswordFormValues>['onFinish'] = useCallback(
    async (values: ResetPasswordFormValues) => {
      setLoading(true);
      try {
        const result = await authApi.resetPassword({
          email: values.email,
          password: values.password,
          code: values.code,
        });
        if (result.success) {
          message.success(t('resetSuccess'));
          navigate('/login');
        } else {
          message.error(result.message);
        }
      } catch {
        message.error(t('error.network'));
      } finally {
        setLoading(false);
      }
    },
    [navigate, t]
  );

  return (
    <AuthPageLayout
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
      bottomLinks={
        <div className={styles.linksRow}>
          <Text className={styles.dividerText}>{t('resetPassword.rememberPassword')}</Text>
          <Link to="/login" className={styles.loginLink}>
            {t('link.login')}
          </Link>
        </div>
      }
      testId="forgot-password-page"
    >
      <Form
        form={form}
        name="forgot-password"
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        size="large"
        className={styles.form}
      >
        <EmailInput testId="email-input" />

        <Form.Item
          name="password"
          rules={[{ validator: validatePassword }]}
          className={styles.formItem}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('placeholder.newPassword')}
            iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            data-testid="password-input"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          rules={[{ validator: validateConfirmPassword }]}
          className={styles.formItem}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={t('placeholder.confirmPassword')}
            iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            data-testid="confirm-password-input"
          />
        </Form.Item>

        <Form.Item
          name="code"
          rules={[{ required: true, message: t('validation.codeRequired') }]}
          className={styles.formItem}
        >
          <div className={styles.verificationRow}>
            <Input
              className={styles.verificationInput}
              prefix={<LockOutlined />}
              placeholder={t('placeholder.code')}
              maxLength={6}
              data-testid="code-input"
            />
            <VerificationCodeButton email={emailValue || ''} testId="send-code-button" />
          </div>
        </Form.Item>

        <SubmitButton form={form} loading={loading} testId="submit-button">
          {t('button.resetPassword')}
        </SubmitButton>
      </Form>
    </AuthPageLayout>
  );
};

export default ForgotPasswordPage;
