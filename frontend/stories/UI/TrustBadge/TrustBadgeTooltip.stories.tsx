import type { Meta, StoryObj } from '@storybook/react';
import { TrustBadgeTooltip } from '../../../src/components/ui/TrustBadge';

const meta = {
  title: 'Features/UI/TrustBadgeTooltip',
  component: TrustBadgeTooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    level: {
      control: 'select',
      options: ['S', 'A', 'B', 'C', 'D'],
      description: 'Trust level (S/A/B/C/D)',
    },
    variant: {
      control: 'select',
      options: ['tooltip', 'popover'],
      description: 'Display variant (tooltip on hover, popover on click)',
    },
    score: {
      control: 'number',
      min: 0,
      max: 100,
      description: 'Optional trust score to display',
    },
    showScore: {
      control: 'boolean',
      description: 'Show score in tooltip',
    },
  },
} satisfies Meta<typeof TrustBadgeTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Default Stories
// ============================================

export const Default: Story = {
  args: {
    level: 'S',
    variant: 'tooltip',
    showScore: true,
  },
};

export const AllLevels: Story = {
  args: {
    level: 'S',
    variant: 'tooltip',
    showScore: true,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <TrustBadgeTooltip level="S" />
      <TrustBadgeTooltip level="A" />
      <TrustBadgeTooltip level="B" />
      <TrustBadgeTooltip level="C" />
      <TrustBadgeTooltip level="D" />
    </div>
  ),
};

// ============================================
// Variants
// ============================================

export const TooltipVariant: Story = {
  args: {
    level: 'S',
    variant: 'tooltip',
    showScore: true,
  },
};

export const PopoverVariant: Story = {
  args: {
    level: 'S',
    variant: 'popover',
    showScore: true,
  },
};

// ============================================
// With Custom Score
// ============================================

export const WithScore: Story = {
  args: {
    level: 'S',
    score: 97,
    showScore: true,
  },
};

export const WithScoreAllLevels: Story = {
  args: {
    level: 'S',
    variant: 'tooltip',
    showScore: true,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <TrustBadgeTooltip level="S" score={95} />
      <TrustBadgeTooltip level="A" score={85} />
      <TrustBadgeTooltip level="B" score={80} />
      <TrustBadgeTooltip level="C" score={65} />
      <TrustBadgeTooltip level="D" score={45} />
    </div>
  ),
};

// ============================================
// Without Score
// ============================================

export const WithoutScore: Story = {
  args: {
    level: 'S',
    showScore: false,
  },
};

// ============================================
// Clickable Popover
// ============================================

export const ClickablePopover: Story = {
  args: {
    level: 'S',
    variant: 'popover',
    showScore: true,
  },
};

// ============================================
// In Course Detail Context
// ============================================

export const InCourseDetail: Story = {
  args: {
    level: 'S',
    variant: 'tooltip',
    showScore: true,
  },
  render: () => (
    <div
      style={{ width: '400px', padding: '20px', border: '1px solid #eee', borderRadius: '12px' }}
    >
      <h3 style={{ marginBottom: '16px' }}>信任信息</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrustBadgeTooltip level="S" />
          <span>平台认证+高质量</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrustBadgeTooltip level="A" />
          <span>平台认证</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrustBadgeTooltip level="B" />
          <span>来源验证+高质量</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrustBadgeTooltip level="C" />
          <span>来源验证</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrustBadgeTooltip level="D" />
          <span>社群来源</span>
        </div>
      </div>
    </div>
  ),
};
