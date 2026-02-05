import type { Meta, StoryObj } from '@storybook/react';
import { Loading } from '@/components/ui/Loading';

const meta = {
  title: 'Features/UI/Loading',
  component: Loading,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Loading spinner component.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['loading'],
    },
  },
  args: {},
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMessage: Story = {
  args: {
    text: 'Loading data...',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    text: 'Loading...',
  },
};
