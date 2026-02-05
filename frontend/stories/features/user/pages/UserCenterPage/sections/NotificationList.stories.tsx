import type { Meta, StoryObj } from '@storybook/react';
import { NotificationList } from '@/features/user/pages/UserCenterPage/sections/NotificationList';

const meta = {
  title: 'Features/User/User Center/Notification List',
  component: NotificationList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Component for displaying user notifications.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['user'],
    },
  },
  args: {
    notifications: [
      {
        id: '1',
        type: 'system',
        title: 'Welcome!',
        content: 'Welcome to FindClass.nz',
        createdAt: '2024-01-15',
        read: false,
      },
      {
        id: '2',
        type: 'course',
        title: 'New Course Available',
        content: 'Check out our new math course',
        createdAt: '2024-01-10',
        read: true,
      },
    ],
    onMarkRead: () => {},
    onMarkAllRead: () => {},
    onDelete: () => {},
  },
} satisfies Meta<typeof NotificationList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    notifications: [],
  },
};

export const AllRead: Story = {
  args: {
    notifications: [
      {
        id: '1',
        type: 'system',
        title: 'Welcome!',
        content: 'Welcome to FindClass.nz',
        createdAt: '2024-01-15',
        read: true,
      },
      {
        id: '2',
        type: 'course',
        title: 'New Course Available',
        content: 'Check out our new math course',
        createdAt: '2024-01-10',
        read: true,
      },
    ],
    onMarkRead: () => {},
    onMarkAllRead: () => {},
    onDelete: () => {},
  },
};
