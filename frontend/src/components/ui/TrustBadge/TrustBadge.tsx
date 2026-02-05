import React from 'react';
import clsx from 'clsx';
import { type TrustLevel, type TrustBadgeSize } from './trustBadgeConstants';
import { getTrustLevelConfig } from './trustBadgeHelpers';
import styles from './TrustBadge.module.scss';

// ============================================
// Props
// ============================================

export interface TrustBadgeProps {
  /** Trust level (S/A/B/C/D) */
  level: TrustLevel;
  /** Show level label (e.g., "S级"), default true */
  showLabel?: boolean;
  /** Badge size */
  size?: TrustBadgeSize;
  /** Custom class name */
  className?: string;
  /** Clickable - shows tooltip on hover */
  clickable?: boolean;
  /** Click handler */
  onClick?: () => void;
}

// ============================================
// Component
// ============================================

export function TrustBadge({
  level,
  showLabel = true,
  size = 'medium',
  className,
  clickable = false,
  onClick,
}: TrustBadgeProps) {
  const config = getTrustLevelConfig(level);

  const handleClick = (e: React.MouseEvent) => {
    if (clickable && onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <span
      className={clsx(
        styles.trustBadge,
        styles[config.colorClass],
        styles[size],
        clickable && styles.clickable,
        className
      )}
      title={clickable ? undefined : `${config.label}级`}
      onClick={handleClick}
      data-testid="trust-badge"
    >
      <span className={styles.icon}>{config.icon}</span>
      {showLabel && <span className={styles.label}>{config.label}级</span>}
    </span>
  );
}
