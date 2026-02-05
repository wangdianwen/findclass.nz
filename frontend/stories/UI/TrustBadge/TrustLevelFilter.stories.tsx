import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState } from 'react';
import { TrustLevelFilter } from '../../../src/components/ui/TrustBadge';

const meta = {
  title: 'Features/UI/TrustLevelFilter',
  component: TrustLevelFilter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'select',
      options: ['all', 'S', 'A', 'B', 'C', 'D'],
      description: 'Selected trust level',
    },
    title: {
      control: 'text',
      description: 'Filter title',
    },
    showAll: {
      control: 'boolean',
      description: 'Show "All" option',
    },
    direction: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Layout direction',
    },
  },
  args: {
    onChange: fn(),
  },
} satisfies Meta<typeof TrustLevelFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Wrapper Component for Interactive Stories
// ============================================

function InteractiveFilterStory() {
  const [value, setValue] = useState<'S' | 'A' | 'B' | 'C' | 'D' | 'all'>('all');
  return (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <TrustLevelFilter
        value={value}
        onChange={setValue}
        title="信任等级筛选"
        showAll
        direction="horizontal"
      />
      <p style={{ marginTop: '16px' }}>当前选择: {value === 'all' ? '全部' : `${value}级`}</p>
    </div>
  );
}

function SearchFiltersStory() {
  const [trustLevel, setTrustLevel] = useState<'S' | 'A' | 'B' | 'C' | 'D' | 'all'>('all');
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '700px',
        padding: '20px',
        border: '1px solid #eee',
        borderRadius: '12px',
      }}
    >
      <h3 style={{ marginBottom: '16px' }}>课程筛选</h3>
      <div style={{ marginBottom: '20px' }}>
        <TrustLevelFilter
          value={trustLevel}
          onChange={setTrustLevel}
          title="信任等级"
          showAll
          direction="horizontal"
        />
      </div>
      <p style={{ color: '#666', fontSize: '14px' }}>
        当前筛选: {trustLevel === 'all' ? '全部信任等级' : `${trustLevel}级`}
      </p>
    </div>
  );
}

// ============================================
// Default Story
// ============================================

export const Default: Story = {
  args: {
    value: 'all',
    title: '信任等级',
    showAll: true,
    direction: 'horizontal',
  },
};

// ============================================
// Interactive Stories
// ============================================

export const Interactive: Story = {
  render: () => <InteractiveFilterStory />,
};

// ============================================
// Without Title
// ============================================

export const WithoutTitle: Story = {
  args: {
    value: 'all',
    title: undefined,
    showAll: true,
    direction: 'horizontal',
  },
};

// ============================================
// Without All Option
// ============================================

export const WithoutAllOption: Story = {
  args: {
    value: 'S',
    title: '仅显示高信任',
    showAll: false,
    direction: 'horizontal',
  },
};

// ============================================
// Vertical Direction
// ============================================

export const VerticalDirection: Story = {
  args: {
    value: 'all',
    title: '信任等级',
    showAll: true,
    direction: 'vertical',
  },
};

// ============================================
// Selected States
// ============================================

export const SelectedS: Story = {
  args: {
    value: 'S',
    title: '信任等级',
    showAll: true,
    direction: 'horizontal',
  },
};

export const SelectedA: Story = {
  args: {
    value: 'A',
    title: '信任等级',
    showAll: true,
    direction: 'horizontal',
  },
};

export const SelectedB: Story = {
  args: {
    value: 'B',
    title: '信任等级',
    showAll: true,
    direction: 'horizontal',
  },
};

export const SelectedC: Story = {
  args: {
    value: 'C',
    title: '信任等级',
    showAll: true,
    direction: 'horizontal',
  },
};

export const SelectedD: Story = {
  args: {
    value: 'D',
    title: '信任等级',
    showAll: true,
    direction: 'horizontal',
  },
};

// ============================================
// In Search Filters Context
// ============================================

export const InSearchFilters: Story = {
  render: () => <SearchFiltersStory />,
};
