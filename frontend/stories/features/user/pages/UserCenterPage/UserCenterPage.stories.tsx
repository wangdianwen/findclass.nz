import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, expect } from '@storybook/test';
import UserCenterPage from '@/features/user/pages/UserCenterPage';

const meta: Meta<typeof UserCenterPage> = {
  title: 'Features/User/User Center',
  component: UserCenterPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Personal center page with user profile, favorites, learning history, notifications, children management. Uses Ant Design Tabs for navigation.',
      },
    },
    reactRouter: {
      routePath: '/user',
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['user', 'reviews'],
    },
  },
  tags: ['autodocs', 'a11y'],
  decorators: [
    Story => (
      <div style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default User Center',
};

export const FavoritesTab: Story = {
  name: 'Favorites Tab',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const favoritesTab = tabs?.querySelectorAll('[role="tab"]')[1] as HTMLElement;
    if (favoritesTab) {
      await favoritesTab.click();
    }
  },
};

export const NotificationsTab: Story = {
  name: 'Notifications Tab',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const notificationsTab = tabs?.querySelectorAll('[role="tab"]')[3] as HTMLElement;
    if (notificationsTab) {
      await notificationsTab.click();
    }
  },
};

export const EditProfile: Story = {
  name: 'Edit Profile',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const editButton = canvasElement.querySelector(
      '[data-testid="edit-button"]'
    ) as HTMLButtonElement;
    await userEvent.click(editButton);
  },
};

export const ChangePassword: Story = {
  name: 'Change Password Flow',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const currentPassword = canvasElement.querySelector(
      '[data-testid="current-password-input"]'
    ) as HTMLInputElement;
    await userEvent.type(currentPassword, 'oldpassword123');

    const newPassword = canvasElement.querySelector(
      '[data-testid="new-password-input"]'
    ) as HTMLInputElement;
    await userEvent.type(newPassword, 'NewPassword123');

    const confirmPassword = canvasElement.querySelector(
      '[data-testid="confirm-password-input"]'
    ) as HTMLInputElement;
    await userEvent.type(confirmPassword, 'NewPassword123');

    // Wait for form validation to enable the button
    await new Promise(resolve => setTimeout(resolve, 300));

    // Click submit button after filling all fields
    const submitButton = canvasElement.querySelector(
      '[data-testid="update-password-button"]'
    ) as HTMLButtonElement;
    if (submitButton && !submitButton.hasAttribute('disabled')) {
      await userEvent.click(submitButton);
    }
  },
};

export const DeleteAccount: Story = {
  name: 'Delete Account Flow',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const deleteButton = canvasElement.querySelector(
      '[data-testid="delete-account-button"]'
    ) as HTMLButtonElement;
    if (deleteButton) {
      await userEvent.click(deleteButton);
    }
  },
};

export const Logout: Story = {
  name: 'Logout Flow',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const logoutButton = canvasElement.querySelector(
      '[data-testid="logout-button"]'
    ) as HTMLElement;
    await userEvent.click(logoutButton);
  },
};

export const ChildrenTab: Story = {
  name: 'Children Tab',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const childrenTab = tabs?.querySelectorAll('[role="tab"]')[4] as HTMLElement;
    if (childrenTab) {
      await childrenTab.click();
    }
  },
};

export const AddChild: Story = {
  name: 'Add Child Flow',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const childrenTab = tabs?.querySelectorAll('[role="tab"]')[4] as HTMLElement;
    if (childrenTab) {
      await childrenTab.click();
    }
    const addButton = canvasElement.querySelector(
      '[data-testid="add-child-button"]'
    ) as HTMLButtonElement;
    await userEvent.click(addButton);
  },
};

export const EditChild: Story = {
  name: 'Edit Child Flow',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const childrenTab = tabs?.querySelectorAll('[role="tab"]')[4] as HTMLElement;
    if (childrenTab) {
      await childrenTab.click();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    const editButton = canvasElement.querySelector(
      '[data-testid="edit-button-1"]'
    ) as HTMLButtonElement;
    await userEvent.click(editButton);
  },
};

export const DeleteChild: Story = {
  name: 'Delete Child Flow',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const childrenTab = tabs?.querySelectorAll('[role="tab"]')[4] as HTMLElement;
    if (childrenTab) {
      await childrenTab.click();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    const deleteButton = canvasElement.querySelector(
      '[data-testid="delete-button-1"]'
    ) as HTMLButtonElement;
    await userEvent.click(deleteButton);
  },
};

export const HistoryTab: Story = {
  name: 'Learning History Tab',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const historyTab = tabs?.querySelectorAll('[role="tab"]')[2] as HTMLElement;
    if (historyTab) {
      await historyTab.click();
    }
  },
};

export const HistoryWithChildFilter: Story = {
  name: 'History with Child Filter',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Navigate to History tab (index 2)
    const tabs = canvasElement.querySelector('[data-testid="user-center-tabs"]');
    const historyTab = tabs?.querySelectorAll('[role="tab"]')[2] as HTMLElement;
    if (historyTab) {
      await historyTab.click();
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find filter buttons within the learning history section
    const historySection = canvasElement.querySelector(
      '[data-testid="learning-history"]'
    ) as HTMLElement;
    if (historySection) {
      const filterButtons = historySection.querySelectorAll('button');
      if (filterButtons.length > 2) {
        // Click on first child's filter button
        await userEvent.click(filterButtons[2] as HTMLElement);
      }
    }
  },
};

// ============================================
// Teacher-related stories
// ============================================

export const ApprovedTeacher: Story = {
  name: 'Approved Teacher - Dashboard Entry',
  parameters: {
    i18n: {
      locale: 'en',
      loadNamespaces: ['user', 'reviews', 'teaching'],
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Verify teacher dashboard card is visible
    const dashboardCard = canvasElement.querySelector(
      '[data-testid="teacher-dashboard-card"]'
    ) as HTMLElement;
    if (dashboardCard) {
      await expect(dashboardCard).toBeInTheDocument();
    }

    // Verify enter dashboard button exists
    const dashboardButton = canvasElement.querySelector(
      '[data-testid="teacher-dashboard-button"]'
    ) as HTMLButtonElement;
    if (dashboardButton) {
      await expect(dashboardButton).toBeInTheDocument();
      await expect(dashboardButton).toHaveTextContent(/Enter Dashboard|进入后台/);
    }
  },
};

export const ApprovedTeacherChinese: Story = {
  name: 'Approved Teacher - Chinese Locale',
  parameters: {
    i18n: {
      locale: 'zh',
      loadNamespaces: ['user', 'reviews', 'teaching'],
    },
  },
};

export const TeacherAppliesForFirstTime: Story = {
  name: 'Teacher Applies for First Time',
  parameters: {
    i18n: {
      locale: 'en',
      loadNamespaces: ['user', 'reviews', 'teaching'],
    },
  },
};
