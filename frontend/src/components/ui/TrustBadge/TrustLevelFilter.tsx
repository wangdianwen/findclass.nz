import { Radio, Space } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TrustLevel } from './trustBadgeConstants';
import { TRUST_FILTER_OPTIONS } from './trustBadgeConstants';
import { TrustBadge } from './TrustBadge';
import styles from './TrustLevelFilter.module.scss';

// ============================================
// Types
// ============================================

export interface TrustLevelFilterProps {
  /** Selected trust level */
  value?: TrustLevel | 'all';
  /** Change handler */
  onChange?: (value: TrustLevel | 'all') => void;
  /** Filter title */
  title?: string;
  /** Show "All" option */
  showAll?: boolean;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Component test ID */
  testId?: string;
}

// ============================================
// Component
// ============================================

export function TrustLevelFilter({
  value = 'all',
  onChange,
  title,
  showAll = true,
  direction = 'horizontal',
  testId = 'trust-level-filter',
}: TrustLevelFilterProps) {
  const { t } = useTranslation('search');

  const options = showAll
    ? TRUST_FILTER_OPTIONS
    : TRUST_FILTER_OPTIONS.filter(opt => opt.value !== 'all');

  const handleChange = (e: RadioChangeEvent) => {
    onChange?.(e.target.value as TrustLevel | 'all');
  };

  const renderOption = (option: (typeof options)[number]) => {
    if (option.value === 'all') {
      return (
        <span key={option.value} className={styles.optionLabel}>
          {t(option.labelKey)}
        </span>
      );
    }
    return (
      <span key={option.value} className={styles.optionWrapper}>
        <TrustBadge level={option.value as TrustLevel} size="small" showLabel />
      </span>
    );
  };

  return (
    <div className={styles.filterContainer} data-testid={testId}>
      {title && <span className={styles.title}>{title}</span>}
      <Radio.Group value={value} onChange={handleChange} className={styles.radioGroup}>
        <Space direction={direction} size="small">
          {options.map(option => (
            <Radio.Button
              key={option.value}
              value={option.value}
              className={`${styles.radioButton} ${value === option.value ? styles.selected : ''}`}
              data-testid={`${testId}-option-${option.value}`}
            >
              {renderOption(option)}
            </Radio.Button>
          ))}
        </Space>
      </Radio.Group>
    </div>
  );
}
