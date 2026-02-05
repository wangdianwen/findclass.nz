import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/test';
import { Footer } from '../../src/components/shared/Footer';

const meta = {
  title: 'Features/Layout/Footer',
  component: Footer,
  tags: ['autodocs', 'a11y'],
  parameters: {
    docs: {
      description: {
        component: 'Site footer with navigation links and copyright information.',
      },
    },
    layout: 'fullscreen',
    i18n: {
      locale: 'en',
      loadNamespaces: ['footer'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default',
  play: async ({ canvasElement }) => {
    const footer = canvasElement.querySelector('footer');
    await expect(footer).toBeInTheDocument();
  },
};
