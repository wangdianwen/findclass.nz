import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TrustBadge } from '../../../src/components/ui/TrustBadge';

const meta = {
  title: 'Features/UI/TrustBadge',
  component: TrustBadge,
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
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Badge size',
    },
    showLabel: {
      control: 'boolean',
      description: 'Show level label (e.g., "S级")',
    },
    clickable: {
      control: 'boolean',
      description: 'Enable click handler',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof TrustBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Default Stories
// ============================================

export const Default: Story = {
  args: {
    level: 'S',
    size: 'medium',
    showLabel: true,
  },
};

export const AllLevels: Story = {
  args: {
    level: 'S',
    size: 'medium',
    showLabel: true,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <TrustBadge level="S" />
      <TrustBadge level="A" />
      <TrustBadge level="B" />
      <TrustBadge level="C" />
      <TrustBadge level="D" />
    </div>
  ),
};

// ============================================
// Size Variants
// ============================================

export const Small: Story = {
  args: {
    level: 'S',
    size: 'small',
    showLabel: true,
  },
};

export const Medium: Story = {
  args: {
    level: 'A',
    size: 'medium',
    showLabel: true,
  },
};

export const Large: Story = {
  args: {
    level: 'S',
    size: 'large',
    showLabel: true,
  },
};

// ============================================
// Label Variants
// ============================================

export const WithLabel: Story = {
  args: {
    level: 'S',
    size: 'medium',
    showLabel: true,
  },
};

export const WithoutLabel: Story = {
  args: {
    level: 'S',
    size: 'medium',
    showLabel: false,
  },
};

// ============================================
// Interactive Stories
// ============================================

export const Clickable: Story = {
  args: {
    level: 'S',
    size: 'medium',
    clickable: true,
    onClick: fn(),
  },
};

// ============================================
// In Context (Course Card)
// ============================================

export const InCourseCard: Story = {
  args: {
    level: 'S',
    size: 'small',
    showLabel: true,
  },
  render: () => (
    <div style={{ width: '400px', padding: '16px', border: '1px solid #eee', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <TrustBadge level="S" size="small" />
        <span style={{ fontSize: '16px', fontWeight: 600 }}>高中数学提高班</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <TrustBadge level="A" size="small" />
        <span style={{ fontSize: '16px', fontWeight: 600 }}>GCSE数学冲刺</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <TrustBadge level="B" size="small" />
        <span style={{ fontSize: '16px', fontWeight: 600 }}>物理化学补习</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <TrustBadge level="C" size="small" />
        <span style={{ fontSize: '16px', fontWeight: 600 }}>绘画艺术启蒙</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrustBadge level="D" size="small" />
        <span style={{ fontSize: '16px', fontWeight: 600 }}>社区课程推荐</span>
      </div>
    </div>
  ),
};
