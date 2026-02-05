import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, expect } from '@storybook/test';
import { AnnouncementBar } from '../../src/components/shared/AnnouncementBar';

const meta = {
  title: 'Features/Layout/AnnouncementBar',
  component: AnnouncementBar,
  tags: ['autodocs', 'a11y'],
  parameters: {
    docs: {
      description: {
        component: 'Site announcement bar with dismiss functionality.',
      },
    },
    layout: 'fullscreen',
    i18n: {
      locale: 'en',
      loadNamespaces: ['announcement'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
} satisfies Meta<typeof AnnouncementBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Visible',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByTestId('close-button');
    await expect(closeButton).toBeInTheDocument();
  },
};

export const Dismiss: Story = {
  name: 'Dismiss Action',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByTestId('close-button');
    await userEvent.click(closeButton);
    // After clicking close, the bar should be hidden
    await expect(canvas.queryByTestId('close-button')).not.toBeInTheDocument();
  },
};
