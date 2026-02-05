import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import Button from 'antd/es/button';
import Dropdown from 'antd/es/dropdown';
import Avatar from 'antd/es/avatar';
import {
  CheckOutlined,
  UserOutlined,
  HeartOutlined,
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/locales/i18n';
import { cookieService, SUPPORTED_LANGUAGES, type WebsiteLanguage } from '@/services';
import { useUserStore, useIsTeacher } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import styles from './Header.module.scss';

// ============================================
// Types
// ============================================

interface HeaderProps {
  onLanguageChange?: (value: string) => void;
}

// ============================================
// 国旗图标组件
// ============================================

const FlagIcon: React.FC<{ code: string }> = ({ code }) => {
  const flagMap: Record<string, string> = {
    en: '🇳🇿',
    zh: '🇨🇳',
  };
  return <span className={styles.flagIcon}>{flagMap[code] || '🌐'}</span>;
};

export const Header: React.FC<HeaderProps> = ({ onLanguageChange }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    const saved = cookieService.language.get();
    if (saved) {
      i18n.changeLanguage(saved);
      return saved;
    }
    return 'en';
  });

  const user = useUserStore(state => state.user);
  const isTeacher = useIsTeacher();
  const { logout, fetchUser } = useAuth();

  // Sync language from cookie on mount
  useEffect(() => {
    const saved = cookieService.language.get();
    if (saved && saved !== 'en') {
      i18n.changeLanguage(saved);
    }
  }, []);

  // Fetch user on mount if logged in but no user data
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token && !user) {
      fetchUser();
    }
  }, [fetchUser, user]);

  const handleLanguageSelect = (lang: string) => {
    setCurrentLanguage(lang);
    i18n.changeLanguage(lang);
    cookieService.language.set(lang as 'en' | 'zh');
    onLanguageChange?.(lang);
  };

  // Handle user menu click
  const handleUserMenuClick = useCallback(
    ({ key }: { key: string }) => {
      switch (key) {
        case 'profile':
          navigate('/user?tab=profile');
          break;
        case 'favorites':
          navigate('/user?tab=favorites');
          break;
        case 'teacher-dashboard':
          navigate('/teacher/dashboard');
          break;
        case 'settings':
          navigate('/user?tab=settings');
          break;
        case 'logout':
          logout();
          navigate('/');
          break;
      }
    },
    [navigate, logout]
  );

  // Build user menu items
  type MenuItem = {
    key: string;
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
  };

  type DividerItem = {
    type: 'divider';
    key: string;
    label?: undefined;
    icon?: undefined;
    danger?: undefined;
  };

  type MenuItemEntry = MenuItem | DividerItem;

  const userMenuItems: MenuItemEntry[] = [
    {
      key: 'profile',
      label: t('user.myProfile'),
      icon: <UserOutlined />,
    },
    {
      key: 'favorites',
      label: t('user.myFavorites'),
      icon: <HeartOutlined />,
    },
  ];

  // Add teacher dashboard entry for teachers
  if (isTeacher) {
    userMenuItems.push({
      key: 'teacher-dashboard',
      label: t('user.teacherDashboard'),
      icon: <DashboardOutlined />,
    });
  }

  userMenuItems.push(
    {
      key: 'settings',
      label: t('user.settings'),
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
      key: 'divider',
    },
    {
      key: 'logout',
      label: t('user.logout'),
      icon: <LogoutOutlined />,
      danger: true,
    }
  );

  const languageMenuItems = SUPPORTED_LANGUAGES.map((lang: WebsiteLanguage) => ({
    key: lang.code,
    label: (
      <div className={styles.languageMenuItem}>
        <span className={styles.languageMenuFlag}>
          <FlagIcon code={lang.code} />
        </span>
        <span className={styles.languageMenuText}>{lang.name}</span>
        {currentLanguage === lang.code && <CheckOutlined className={styles.checkIcon} />}
      </div>
    ),
  }));

  return (
    <header className={styles.header} data-testid="header">
      <div className={styles.headerContent}>
        <div className={styles.logo}>
          <Link to={ROUTES.HOME} className={styles.logoLink}>
            <img src="/findclass-banner-logo.png" alt="FindClass.nz" className={styles.logoImage} />
          </Link>
        </div>

        <nav className={styles.nav}>
          <Link to={ROUTES.HOME} className={styles.navLink}>
            {t('nav.home')}
          </Link>
          <Link to={ROUTES.COURSES} className={styles.navLink}>
            {t('nav.courses')}
          </Link>
          <Link to={ROUTES.TUTORS} className={styles.navLink}>
            {t('nav.tutors')}
          </Link>
        </nav>

        <div className={styles.headerActions}>
          <Dropdown
            menu={{ items: languageMenuItems, onClick: ({ key }) => handleLanguageSelect(key) }}
            trigger={['click']}
          >
            <button className={styles.languageButton} aria-label="Select language">
              <FlagIcon code={currentLanguage} />
            </button>
          </Dropdown>

          {user ? (
            // Logged in - show user avatar with dropdown
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button className={styles.userAvatarButton} data-testid="user-avatar-button">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className={styles.avatarImage} />
                ) : (
                  <Avatar size="small" icon={<UserOutlined />} className={styles.avatarFallback} />
                )}
                <span className={styles.userName}>{user.name || user.email.split('@')[0]}</span>
              </button>
            </Dropdown>
          ) : (
            // Not logged in - show login/register buttons
            <div className={styles.authButtons}>
              <Link to="/login" className={styles.authLink}>
                <Button type="text" className={styles.loginButton}>
                  {t('auth.login')}
                </Button>
              </Link>
              <Link to="/register" className={styles.authLink}>
                <Button type="primary" className={styles.registerButton}>
                  {t('auth.register')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
