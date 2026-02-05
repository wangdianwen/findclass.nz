import React, { useCallback, useState } from 'react';
import { Modal, message } from 'antd';
import { WechatOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import styles from './WeChatLoginButton.module.scss';

// ============================================
// Types
// ============================================

interface WeChatLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// 微信登录状态
type WeChatLoginStatus = 'idle' | 'polling' | 'success' | 'error';

// ============================================
// Component
// ============================================

export const WeChatLoginButton: React.FC<WeChatLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const { t } = useTranslation('registration');
  const navigate = useNavigate();
  const { socialLogin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState<WeChatLoginStatus>('idle');
  const [pollingCount, setPollingCount] = useState(0);

  // 处理微信登录点击
  const handleWeChatLogin = useCallback(async () => {
    setIsModalOpen(true);
    setLoginStatus('polling');
    setPollingCount(0);
  }, []);

  // 轮询检查登录状态（mock 实现）
  // 在实际应用中，应该通过后端接口轮询登录状态
  React.useEffect(() => {
    if (loginStatus !== 'polling') return;

    const checkLoginStatus = async () => {
      setPollingCount(prev => prev + 1);

      // 模拟检查登录状态
      // 实际应该调用后端接口检查用户是否扫码完成
      if (pollingCount >= 5) {
        setLoginStatus('error');
        message.warning(t('wechatLogin.timeout'));
        return;
      }
    };

    const timer = setInterval(checkLoginStatus, 2000);
    return () => clearInterval(timer);
  }, [loginStatus, pollingCount, t]);

  // 处理登录成功
  const handleSuccess = useCallback(async () => {
    try {
      const result = await socialLogin('wechat');

      if (result.success) {
        message.success(t('loginSuccess'));
        setIsModalOpen(false);
        onSuccess?.();
        navigate('/');
      } else {
        setLoginStatus('error');
        message.error(result.message || t('error.network'));
        onError?.(result.message || 'Login failed');
      }
    } catch {
      setLoginStatus('error');
      message.error(t('error.network'));
      onError?.('Network error');
    }
  }, [socialLogin, navigate, t, onSuccess, onError]);

  // 模拟扫码成功（用于测试）
  const handleMockScan = useCallback(async () => {
    // 在实际应用中，用户扫码后微信会回调后端，后端设置登录状态
    // 这里用于演示，模拟扫码后登录成功
    await handleSuccess();
  }, [handleSuccess]);

  return (
    <>
      <button
        type="button"
        className={styles.wechatButton}
        onClick={handleWeChatLogin}
        data-testid="wechat-login-button"
      >
        <WechatOutlined style={{ fontSize: 18 }} />
        <span>{t('login.wechat')}</span>
      </button>

      <Modal
        title={t('wechatLogin.title')}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setLoginStatus('idle');
        }}
        footer={null}
        centered
        className={styles.modal}
      >
        <div className={styles.content}>
          {loginStatus === 'polling' && (
            <>
              <div className={styles.qrContainer}>
                {/* 实际应用中这里应该显示微信二维码 */}
                {/* 微信二维码需要后端生成，包含惟一的 scene_id */}
                <div className={styles.mockQR}>
                  <div className={styles.mockQRCode}>
                    <WechatOutlined style={{ fontSize: 80, color: '#07c160' }} />
                    <span>{t('wechatLogin.scanInstruction')}</span>
                  </div>
                </div>
              </div>
              <p className={styles.hint}>
                {t('wechatLogin.hint')}
                <span className={styles.polling}>
                  {pollingCount * 2}s {t('wechatLogin.polling')}
                </span>
              </p>
              <button
                type="button"
                className={styles.mockButton}
                onClick={handleMockScan}
              >
                {t('wechatLogin.mockScan')} (Dev Only)
              </button>
            </>
          )}

          {loginStatus === 'error' && (
            <div className={styles.error}>
              <p>{t('wechatLogin.error')}</p>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => {
                  setLoginStatus('polling');
                  setPollingCount(0);
                }}
              >
                {t('button.retry')}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default WeChatLoginButton;
