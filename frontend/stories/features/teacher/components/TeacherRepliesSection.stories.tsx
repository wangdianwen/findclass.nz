import type { Meta, StoryObj } from '@storybook/react';
import { TeacherRepliesSection } from '@/features/teacher/components/TeacherRepliesSection';
import {
  MOCK_REVIEWS_FOR_REPLY,
  MOCK_REPLY_TEMPLATES,
} from '@/features/teacher/pages/TeacherDashboardPage/teacherRepliesData';

const meta = {
  title: 'Features/Teacher/TeacherRepliesSection',
  component: TeacherRepliesSection,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'TeacherRepliesSection allows teachers to respond to student reviews, manage reply templates, and track reply statistics.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['teacher'],
    },
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TeacherRepliesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story with mock data
export const Default: Story = {
  name: 'Default View',
  args: {
    reviews: MOCK_REVIEWS_FOR_REPLY,
    templates: MOCK_REPLY_TEMPLATES,
  },
};

// With pending replies only
export const WithPendingReplies: Story = {
  name: 'Pending Replies',
  args: {
    reviews: MOCK_REVIEWS_FOR_REPLY.filter(r => !r.reply),
    templates: MOCK_REPLY_TEMPLATES,
  },
};

// With all replied
export const WithAllReplied: Story = {
  name: 'All Replied',
  args: {
    reviews: MOCK_REVIEWS_FOR_REPLY.filter(r => r.reply),
    templates: MOCK_REPLY_TEMPLATES,
  },
};

// Empty state
export const Empty: Story = {
  name: 'Empty State',
  args: {
    reviews: [],
    templates: MOCK_REPLY_TEMPLATES,
  },
};

// With single review
export const SingleReview: Story = {
  name: 'Single Review',
  args: {
    reviews: [MOCK_REVIEWS_FOR_REPLY[0]],
    templates: MOCK_REPLY_TEMPLATES,
  },
};

// With high rating reviews
export const HighRatingReviews: Story = {
  name: 'High Rating Reviews',
  args: {
    reviews: MOCK_REVIEWS_FOR_REPLY.filter(r => (r.overallRating || 0) >= 4),
    templates: MOCK_REPLY_TEMPLATES,
  },
};

// Mobile view
export const MobileView: Story = {
  name: 'Mobile View',
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  args: {
    reviews: MOCK_REVIEWS_FOR_REPLY,
    templates: MOCK_REPLY_TEMPLATES,
  },
};
