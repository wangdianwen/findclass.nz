// @ts-nocheck - Storybook stories file
import type { Meta, StoryObj } from '@storybook/react';
import { ReviewStats } from '@/features/review/components/ReviewStats/index.tsx';
import { MOCK_REVIEW_STATS } from '@/data/reviews.js';

const meta = {
  title: 'Features/Review/Review Stats',
  component: ReviewStats,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    i18n: {
      locale: 'en',
      loadNamespaces: ['reviews'],
    },
  },
  argTypes: {
    showDetails: { control: 'boolean' },
  },
} satisfies Meta<typeof ReviewStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stats: MOCK_REVIEW_STATS,
    showDetails: true,
  },
};

export const WithDetails: Story = {
  args: {
    stats: MOCK_REVIEW_STATS,
    showDetails: true,
  },
};

export const WithoutDetails: Story = {
  args: {
    stats: MOCK_REVIEW_STATS,
    showDetails: false,
  },
};

export const LowRatings: Story = {
  args: {
    stats: {
      ...MOCK_REVIEW_STATS,
      totalReviews: 50,
      averageRating: 3.5,
      ratingDistribution: {
        5: 10,
        4: 15,
        3: 15,
        2: 7,
        1: 3,
      },
      teachingAvg: 3.6,
      courseAvg: 3.4,
      communicationAvg: 3.5,
      punctualityAvg: 3.7,
    },
    showDetails: true,
  },
};

export const Empty: Story = {
  args: {
    stats: {
      teacherId: 'teacher-001',
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
    showDetails: false,
  },
};
