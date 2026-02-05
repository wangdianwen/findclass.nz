import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { CookieConsent } from '../../src/components/cookie/CookieConsent';

const meta = {
  title: 'Features/Layout/CookieConsent',
  component: CookieConsent,
  tags: ['autodocs', 'a11y'],
  parameters: {
    docs: {
      description: {
        component: 'Cookie consent banner with accept all, decline, and customize options.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['cookie'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  args: {
    onAccept: () => {},
    onDecline: () => {},
  },
} satisfies Meta<typeof CookieConsent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Banner Visible',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const banner = canvasElement.querySelector('[class*="cookieBanner"]');
    await expect(banner).toBeInTheDocument();

    const acceptButton = canvas.getByTestId('accept-all-button');
    await expect(acceptButton).toBeInTheDocument();

    const declineButton = canvas.getByTestId('decline-button');
    await expect(declineButton).toBeInTheDocument();
  },
};

export const WithCustomize: Story = {
  name: 'With Customize Button',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const customizeButton = canvas.getByText(/customize/i);
    await expect(customizeButton).toBeInTheDocument();
  },
};
