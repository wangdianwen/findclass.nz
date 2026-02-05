import React, { useState } from 'react';
import { Tooltip, Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TrustLevel } from './trustBadgeConstants';
import { getTrustLevelConfig } from './trustBadgeHelpers';
import styles from './TrustBadgeTooltip.module.scss';

// ============================================
// Types
// ============================================

export interface TrustBadgeTooltipProps {
  /** Trust level */
  level: TrustLevel;
  /** Optional score to display */
  score?: number;
  /** Use tooltip (hover) or popover (click) */
  variant?: 'tooltip' | 'popover';
  /** Children to wrap (defaults to TrustBadge) */
  children?: React.ReactNode;
  /** Show score in tooltip */
  showScore?: boolean;
  /** Badge size */
  size?: 'small' | 'medium' | 'large';
  /** Component test ID */
  testId?: string;
}

// ============================================
// Component
// ============================================

export function TrustBadgeTooltip({
  level,
  score,
  variant = 'tooltip',
  children,
  showScore = true,
  size = 'small',
  testId = 'trust-badge-tooltip',
}: TrustBadgeTooltipProps) {
  const { t } = useTranslation('search');
  const [open, setOpen] = useState(false);

  const config = getTrustLevelConfig(level);
  const displayScore = score ?? config.scoreMin;

  const content = (
    <div className={styles.tooltipContent} data-testid={`${testId}-content`}>
      <div className={styles.header}>
        <span className={styles.icon}>{config.icon}</span>
        <span className={styles.title}>{t(config.nameKey)}</span>
        <span className={styles.score}>{showScore && `${displayScore}/100`}</span>
      </div>
      <div className={styles.description}>{t(config.descriptionKey)}</div>
      <div className={styles.meta}>
        <span className={styles.weight}>{t('trust.weight', { value: config.searchWeight })}</span>
        <span className={styles.range}>
          {t('trust.range', { min: config.scoreMin, max: config.scoreMax })}
        </span>
      </div>
    </div>
  );

  const badge = children || (
    <span className={`${styles.badge} ${styles[size]} ${styles[config.colorClass]}`} data-testid={testId}>
      {config.icon}
      <span>{config.label}级</span>
    </span>
  );

  if (variant === 'popover') {
    return (
      <Popover
        content={content}
        trigger="click"
        placement="top"
        overlayClassName="trust-popover"
        getPopupContainer={trigger => trigger.parentElement || document.body}
        open={open}
        onOpenChange={setOpen}
      >
        <span className={styles.trigger} data-testid={`${testId}-trigger`}>
          {badge}
        </span>
      </Popover>
    );
  }

  return (
    <Tooltip
      title={content}
      placement="top"
      overlayClassName="trust-tooltip"
      getPopupContainer={trigger => trigger.parentElement || document.body}
      data-testid={`${testId}-tooltip`}
    >
      <span className={styles.trigger} data-testid={`${testId}-trigger`}>
        {badge}
      </span>
    </Tooltip>
  );
}
