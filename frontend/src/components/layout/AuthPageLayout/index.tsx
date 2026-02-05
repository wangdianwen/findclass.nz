import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthPageLayout.module.scss';

interface AuthPageLayoutProps {
  /** Page title (e.g., 'Login', 'Register', 'Forgot Password') */
  title: string;
  /** Subtitle text */
  subtitle?: string;
  /** Form content */
  children: ReactNode;
  /** Additional links at bottom (e.g., register link, back link) */
  bottomLinks?: ReactNode;
  /** Test ID for testing */
  testId?: string;
}

export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  title,
  subtitle,
  children,
  bottomLinks,
  testId = 'auth-page',
}) => {
  return (
    <div className={styles.page} data-testid={testId}>
      <div className={styles.container}>
        <div className={styles.card}>
          {/* Logo */}
          <div className={styles.logo}>
            <Link to="/" className={styles.logoLink}>
              <img
                src="/findclass-banner-logo.png"
                alt="FindClass.nz"
                className={styles.logoImage}
              />
            </Link>
          </div>

          {/* Page Title */}
          <h1 className={styles.pageTitle}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

          {/* Form Content */}
          {children}

          {/* Bottom Links */}
          {bottomLinks && <div className={styles.bottomLinks}>{bottomLinks}</div>}
        </div>
      </div>

      {/* Footer spacer */}
      <div className={styles.footerSpacer} />
    </div>
  );
};

export default AuthPageLayout;
