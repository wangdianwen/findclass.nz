import type { Meta, StoryObj } from '@storybook/react';
import { LearningHistory } from '@/features/user/pages/UserCenterPage/sections/LearningHistory';

const meta = {
  title: 'Features/User/User Center/Learning History',
  component: LearningHistory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Component for displaying user learning history.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['user'],
    },
  },
  args: {
    history: [
      {
        id: '1',
        courseId: 'c1',
        courseTitle: 'Math 101',
        institution: 'Sunny School',
        lastViewedAt: '2024-01-15',
        status: 'in_progress',
      },
      {
        id: '2',
        courseId: 'c2',
        courseTitle: 'English Conversation',
        institution: 'City Education',
        lastViewedAt: '2024-01-10',
        status: 'completed',
      },
    ],
  },
} satisfies Meta<typeof LearningHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    history: [],
  },
};
