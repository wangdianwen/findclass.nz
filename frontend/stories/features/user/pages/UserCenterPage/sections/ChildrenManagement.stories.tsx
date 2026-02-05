import type { Meta, StoryObj } from '@storybook/react';
import { ChildrenManagement } from '@/features/user/pages/UserCenterPage/sections/ChildrenManagement';

const meta = {
  title: 'Features/User/User Center/Children Management',
  component: ChildrenManagement,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Component for managing children profiles.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['user'],
    },
  },
  args: {},
} satisfies Meta<typeof ChildrenManagement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    children: [],
  },
};

export const MultipleChildren: Story = {
  args: {
    children: [
      { id: '1', name: '张小明', gender: 'male', grade: 'secondary-7' },
      { id: '2', name: '张小红', gender: 'female', grade: 'primary-3' },
      { id: '3', name: '张小刚', gender: 'male', grade: 'high-10' },
    ],
  },
};
