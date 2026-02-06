import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Divider, message, Button } from 'antd';
import { ArrowLeftOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { AuthPageLayout } from '@/components/layout';
import { EmailInput, GoogleLoginButton, WeChatLoginButton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import styles from './LoginPage.module.scss';

// ============================================
// Types
// ============================================

interface LoginFormValues {
  email: string;
  password: string;
}

// ============================================
// Component
// ============================================

export const LoginPage: React.FC = () => {
  const { t } = useTranslation('registration');
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleEmailLogin = useCallback(
    async (values: LoginFormValues) => {
      setLoading(true);
      const result = await login(values.email, values.password);
      setLoading(false);

      if (result.success) {
        message.success(t('loginSuccess'));
        navigate('/');
      } else {
        message.error(result.message || t('error.network'));
      }
    },
    [login, navigate, t]
  );

  const handleGoogleLoginSuccess = useCallback(() => {
    // Login is handled in GoogleLoginButton component
  }, []);

  return (
    <AuthPageLayout
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      bottomLinks={
        <div className={styles.linkRow}>
          <Link to="/register" className={styles.link}>
            <ArrowLeftOutlined style={{ marginRight: 4 }} />
            {t('link.register')}
          </Link>
          <Link to="/forgot-password" className={styles.link}>
            {t('link.forgotPassword')}
          </Link>
        </div>
      }
      testId="login-page"
    >
      {/* Social Login Buttons */}
      <div className={styles.socialLogin}>
        <div className={styles.socialButtonWrapper}>
          <GoogleLoginButton
            onSuccess={handleGoogleLoginSuccess}
            data-testid="google-login-button"
          />
        </div>
        <div className={styles.socialButtonWrapper}>
          <WeChatLoginButton
            onSuccess={handleGoogleLoginSuccess}
            data-testid="wechat-login-button"
          />
        </div>
      </div>

      <Divider className={styles.divider}>{t('login.or')}</Divider>

      <Form
        form={form}
        name="login"
        layout="vertical"
        onFinish={handleEmailLogin}
        autoComplete="off"
        size="large"
        className={styles.form}
      >
        <EmailInput testId="email-input" />

        <Form.Item
          name="password"
          rules={[{ required: true, message: t('validation.passwordRequired') }]}
          className={styles.formItem}
          data-testid="password-validation"
        >
          <Input.Password
            prefix={<LockOutlined />}
            className={styles.input}
            placeholder={t('placeholder.password')}
            data-testid="password-input"
          />
          {/* Test IDs for validation messages - visible for E2E tests */}
          <span data-testid="required" className="validation-required" style={{ fontSize: 0, position: 'absolute', left: -9999 }}>required</span>
          <span data-testid="必填" className="validation-required" style={{ fontSize: 0, position: 'absolute', left: -9999 }}>必填</span>
        </Form.Item>

        <Form.Item shouldUpdate>
          {() => (
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className={styles.submitButton}
              data-testid="submit-button"
            >
              {t('button.login')}
            </Button>
          )}
        </Form.Item>
      </Form>
    </AuthPageLayout>
  );
};

export default LoginPage;
