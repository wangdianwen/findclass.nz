import type { Meta, StoryObj } from '@storybook/react';
import { FavoritesList } from '@/features/user/pages/UserCenterPage/sections/FavoritesList';

const meta = {
  title: 'Features/User/User Center/Favorites List',
  component: FavoritesList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Component for displaying user favorite courses.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['user'],
    },
  },
  args: {
    onRemove: () => {},
    favorites: [
      { id: '1', title: 'Math 101', institution: 'Sunny School', price: 45, rating: 4.5 },
      {
        id: '2',
        title: 'English Conversation',
        institution: 'City Education',
        price: 35,
        rating: 4.8,
      },
    ],
  },
} satisfies Meta<typeof FavoritesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    favorites: [],
  },
};
