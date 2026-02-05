import type { Meta, StoryObj } from '@storybook/react';
import { CourseSearchPage } from '@/features/course/pages/CourseSearchPage';

const meta = {
  title: 'Features/Course/Course Search',
  component: CourseSearchPage,
  tags: ['autodocs', 'a11y'],
  parameters: {
    docs: {
      description: {
        component: 'Course search page with search panel and course list.',
      },
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  args: {},
  decorators: [
    Story => {
      return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof CourseSearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default View',
};

export const WithKeywordFilter: Story = {
  name: 'With Keyword Filter',
};

export const WithRegionFilter: Story = {
  name: 'With Region Filter',
};

export const EmptyResults: Story = {
  name: 'Empty Results',
};

export const PaginationView: Story = {
  name: 'With Pagination',
};
