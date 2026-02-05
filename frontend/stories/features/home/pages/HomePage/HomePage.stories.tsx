import type { Meta, StoryObj } from '@storybook/react';
import { HomePage } from '@/features/home';

const meta = {
  title: 'Features/Home/Home Page',
  component: HomePage,
  tags: ['autodocs', 'a11y'],
  parameters: {
    docs: {
      description: {
        component:
          'Home page showcasing platform features, partner institutions, and featured courses.',
      },
    },
    layout: 'fullscreen',
    i18n: {
      locale: 'en',
      loadNamespaces: ['home'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
} satisfies Meta<typeof HomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default View',
};

export const HeroSectionInteraction: Story = {
  name: 'Hero CTA Interaction',
};

export const FeaturesSection: Story = {
  name: 'Features Section',
};

export const FeaturedCoursesSection: Story = {
  name: 'Featured Courses Section',
};
