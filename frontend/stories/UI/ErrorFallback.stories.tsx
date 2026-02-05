import type { Meta, StoryObj } from '@storybook/react';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

const meta = {
  title: 'Features/UI/ErrorFallback',
  component: ErrorFallback,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Error fallback component displayed when an error occurs.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['error'],
    },
  },
  args: {},
} satisfies Meta<typeof ErrorFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: new Error('Something went wrong'),
    resetErrorBoundary: () => {},
  },
};

export const NetworkError: Story = {
  args: {
    error: new Error('Failed to fetch data'),
    resetErrorBoundary: () => {},
  },
};

export const Forbidden: Story = {
  name: '403 - Forbidden',
  args: {
    error: new Error('403: Access denied'),
    resetErrorBoundary: () => {},
  },
};

export const NotFound: Story = {
  name: '404 - Not Found',
  args: {
    error: new Error('404: Page not found'),
    resetErrorBoundary: () => {},
  },
};

export const ServerError: Story = {
  name: '500 - Server Error',
  args: {
    error: new Error('500: Internal server error'),
    resetErrorBoundary: () => {},
  },
};
