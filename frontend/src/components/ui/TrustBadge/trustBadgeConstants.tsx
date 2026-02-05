// Trust badge constants - separated from components for react-refresh compatibility
import React from 'react';
import {
  CrownOutlined,
  StarOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

// ============================================
// Types
// ============================================

export type TrustLevel = 'S' | 'A' | 'B' | 'C' | 'D';

export type TrustBadgeSize = 'small' | 'medium' | 'large';

// Trust score range for each level
export interface TrustLevelConfig {
  /** Level identifier */
  level: TrustLevel;
  /** Display icon */
  icon: React.ReactNode;
  /** Level label (S/A/B/C/D) */
  label: string;
  /** Full level name (e.g., "Platform Certified+High Quality") */
  nameKey: string;
  /** Description key for tooltip */
  descriptionKey: string;
  /** Score range min */
  scoreMin: number;
  /** Score range max */
  scoreMax: number;
  /** Search weight multiplier */
  searchWeight: number;
  /** Color class name for styling */
  colorClass: string;
}

// ============================================
// Constants
// ============================================

export const TRUST_LEVELS: readonly TrustLevelConfig[] = Object.freeze([
  {
    level: 'S',
    icon: <CrownOutlined />,
    label: 'S',
    nameKey: 'trust.level.S.name',
    descriptionKey: 'trust.level.S.description',
    scoreMin: 95,
    scoreMax: 100,
    searchWeight: 1.95,
    colorClass: 'trustBadgeS',
  },
  {
    level: 'A',
    icon: <StarOutlined />,
    label: 'A',
    nameKey: 'trust.level.A.name',
    descriptionKey: 'trust.level.A.description',
    scoreMin: 80,
    scoreMax: 94,
    searchWeight: 1.8,
    colorClass: 'trustBadgeA',
  },
  {
    level: 'B',
    icon: <CheckCircleOutlined />,
    label: 'B',
    nameKey: 'trust.level.B.name',
    descriptionKey: 'trust.level.B.description',
    scoreMin: 75,
    scoreMax: 79,
    searchWeight: 1.1,
    colorClass: 'trustBadgeB',
  },
  {
    level: 'C',
    icon: <MinusCircleOutlined />,
    label: 'C',
    nameKey: 'trust.level.C.name',
    descriptionKey: 'trust.level.C.description',
    scoreMin: 60,
    scoreMax: 74,
    searchWeight: 1.0,
    colorClass: 'trustBadgeC',
  },
  {
    level: 'D',
    icon: <ExclamationCircleOutlined />,
    label: 'D',
    nameKey: 'trust.level.D.name',
    descriptionKey: 'trust.level.D.description',
    scoreMin: 0,
    scoreMax: 59,
    searchWeight: 0.64,
    colorClass: 'trustBadgeD',
  },
]);

// ============================================
// Filter Options (constants only, no functions)
// ============================================

export const TRUST_FILTER_OPTIONS: readonly {
  value: TrustLevel | 'all';
  labelKey: string;
}[] = [
  { value: 'all', labelKey: 'trust.filter.all' },
  { value: 'S', labelKey: 'trust.filter.S' },
  { value: 'A', labelKey: 'trust.filter.A' },
  { value: 'B', labelKey: 'trust.filter.B' },
  { value: 'C', labelKey: 'trust.filter.C' },
  { value: 'D', labelKey: 'trust.filter.D' },
] as const;
