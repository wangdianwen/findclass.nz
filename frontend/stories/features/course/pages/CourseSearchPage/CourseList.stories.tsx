import type { Meta, StoryObj } from '@storybook/react';
import { CourseList } from '@/features/course/pages/CourseSearchPage/components/CourseList';
import { MOCK_COURSES } from '@/data/courseData';

const meta = {
  title: 'Features/Course/Course List',
  component: CourseList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Course list component with grid display and pagination.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['search'],
    },
  },
  args: {
    courses: MOCK_COURSES.slice(0, 6),
    totalCount: 100,
    currentPage: 1,
    totalPages: 17,
    onPageChange: () => {},
  },
} satisfies Meta<typeof CourseList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyState: Story = {
  args: {
    courses: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    emptyTitle: 'No courses found',
    emptyDescription: 'Try adjusting your search filters.',
  },
};

export const SinglePage: Story = {
  args: {
    courses: MOCK_COURSES.slice(0, 6),
    totalCount: 6,
    currentPage: 1,
    totalPages: 1,
  },
};

export const WithCustomTitle: Story = {
  args: {
    courses: MOCK_COURSES.slice(0, 6),
    totalCount: 100,
    currentPage: 1,
    totalPages: 17,
    title: 'Featured Courses',
    showCount: false,
  },
};
