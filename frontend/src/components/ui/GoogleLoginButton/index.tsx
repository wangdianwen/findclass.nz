import React, { useCallback } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { CredentialResponse } from '@react-oauth/google';

// Google OAuth Client ID - should be set via environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

// ============================================
// Types
// ============================================

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// ============================================
// Component
// ============================================

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const { t } = useTranslation('registration');
  const navigate = useNavigate();
  const { socialLogin } = useAuth();

  const handleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      try {
        const result = await socialLogin('google', credentialResponse.credential);

        if (result.success) {
          message.success(t('loginSuccess'));
          onSuccess?.();
          navigate('/');
        } else {
          message.error(result.message || t('error.network'));
          onError?.(result.message || 'Login failed');
        }
      } catch {
        message.error(t('error.network'));
        onError?.('Network error');
      }
    },
    [socialLogin, navigate, t, onSuccess, onError]
  );

  const handleFailure = useCallback(() => {
    message.error(t('error.network'));
    onError?.('Google login failed');
  }, [t, onError]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div data-testid="google-login" data-testid-google-login-button="google-login-button" aria-label="Google">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleFailure}
          useOneTap
          theme="outline"
          size="large"
          width="100%"
          text="signin_with"
        />
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleLoginButton;
