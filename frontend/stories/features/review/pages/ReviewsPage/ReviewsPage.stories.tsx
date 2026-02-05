import type { Meta, StoryObj } from '@storybook/react';
import { ReviewsPage } from '@/features/review';
import { MOCK_REVIEW_STATS, MOCK_REVIEWS } from '@/data/reviews';

const meta = {
  title: 'Features/Review/ReviewsPage',
  component: ReviewsPage,
  tags: ['autodocs', 'a11y'],
  parameters: {
    docs: {
      description: {
        component:
          'Reviews page component displaying review statistics and a list of reviews with user info, ratings, and pagination.',
      },
    },
    layout: 'fullscreen',
    i18n: {
      locale: 'en',
      loadNamespaces: ['reviews'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  args: {
    teacherId: 'teacher-001',
    showWriteButton: false,
  },
} satisfies Meta<typeof ReviewsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Stories
// ============================================

export const Default: Story = {
  args: {
    reviews: MOCK_REVIEWS,
    stats: MOCK_REVIEW_STATS,
  },
};

export const NoReviews: Story = {
  name: 'No Reviews',
  args: {
    reviews: [],
    stats: {
      ...MOCK_REVIEW_STATS,
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      teachingAvg: 0,
      courseAvg: 0,
      communicationAvg: 0,
      punctualityAvg: 0,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays empty state when there are no reviews.',
      },
    },
  },
};

export const WithPagination: Story = {
  name: 'With Pagination',
  args: {
    reviews: MOCK_REVIEWS,
    stats: {
      ...MOCK_REVIEW_STATS,
      totalReviews: MOCK_REVIEWS.length,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Reviews with pagination (10 reviews per page). Shows pagination controls when there are more than 10 reviews.',
      },
    },
  },
};
