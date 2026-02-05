import type { Meta, StoryObj } from '@storybook/react';
import { CourseCard } from '@/components/ui/CourseCard';
import { MOCK_COURSES } from '@/data/courseData';

const meta = {
  title: 'Features/UI/CourseCard',
  component: CourseCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Course card component for displaying course information in grid layouts.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['search'],
    },
  },
  args: {
    course: MOCK_COURSES[0],
  },
} satisfies Meta<typeof CourseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighRating: Story = {
  args: {
    course: {
      ...MOCK_COURSES[0],
      rating: 4.8,
      reviewCount: 128,
    },
  },
};

export const NoReviews: Story = {
  args: {
    course: {
      ...MOCK_COURSES[0],
      rating: 0,
      reviewCount: 0,
    },
  },
};

export const OnlineCourse: Story = {
  args: {
    course: {
      ...MOCK_COURSES[0],
      teachingMode: 'online',
      price: 45,
    },
  },
};
