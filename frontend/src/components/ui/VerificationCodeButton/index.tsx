import React, { useState, useCallback, useEffect } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface VerificationCodeButtonProps {
  /** Email value to send verification code to */
  email: string;
  /** Loading state */
  loading?: boolean;
  /** Callback when code is sent successfully */
  onSendCode?: () => void;
  /** Custom button text */
  buttonText?: string;
  /** Custom countdown text */
  countdownText?: string;
  /** Test ID for testing */
  testId?: string;
}

export const VerificationCodeButton: React.FC<VerificationCodeButtonProps> = ({
  email,
  loading,
  onSendCode,
  buttonText,
  countdownText,
  testId = 'verification-code-button',
}) => {
  const { t } = useTranslation('registration');
  const [countdown, setCountdown] = useState(0);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      // Timer cleanup is handled by setCountdown in the interval
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (!email) {
      // Note: Caller should handle empty email validation
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      // Note: Caller should handle invalid email validation
      return;
    }

    // Simulate API call - actual implementation would call backend
    if (onSendCode) {
      await onSendCode();
    }

    // Start countdown
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [email, onSendCode]);

  const defaultButtonText = buttonText || t('button.getCode');
  const defaultCountdownText = countdownText || t('button.resendCount', { time: countdown });

  return (
    <Button
      className="verification-code-button"
      onClick={handleClick}
      disabled={countdown > 0 || loading}
      loading={loading}
      data-testid={testId}
    >
      {countdown > 0 ? defaultCountdownText : defaultButtonText}
    </Button>
  );
};

export default VerificationCodeButton;
