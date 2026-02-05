import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { Header } from '@/components/shared/Header';
import { useUserStore } from '@/stores/userStore';

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onLanguageChange: { action: 'language changed' },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to clear auth state before story
const clearAuthState = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user-storage');
  }
  useUserStore.setState({ user: null, isLoggedIn: false });
};

// Helper to set logged in user state
const setLoggedInUser = (user: ReturnType<typeof useUserStore.getState>['user']) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('auth_token', 'mock-access-token-' + Date.now());
  }
  useUserStore.setState({ user, isLoggedIn: true });
};

// Helper to set logged in teacher user state
const setLoggedInTeacher = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('auth_token', 'mock-access-token-teacher-' + Date.now());
  }
  useUserStore.setState({
    user: {
      id: 'user-teacher-001',
      email: 'teacher@example.com',
      name: '张老师',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
      role: 'teacher',
      isTeacher: true,
      teacherInfo: {
        id: '660e8400-e29b-41d4-a716-446655440000',
        bio: '经验丰富的新西兰注册教师',
        teachingYears: 5,
        verified: true,
        rating: 4.8,
        reviewCount: 128,
        subjects: ['数学', '物理'],
        teachingModes: ['线上', '线下'],
        studentsCount: 50,
        coursesCount: 6,
      },
      createdAt: '2024-01-01T00:00:00Z',
    },
    isLoggedIn: true,
  });
};

export const Default: Story = {
  name: 'Default (Logged Out)',
  args: {},
  play: async ({ canvasElement }) => {
    // Clear auth state to ensure logged-out state
    clearAuthState();

    const canvas = within(canvasElement);
    const header = canvas.getByTestId('header');
    await expect(header).toBeInTheDocument();

    // Should show login and register buttons when logged out
    await expect(canvas.getByText('Login')).toBeInTheDocument();
    await expect(canvas.getByText('Register')).toBeInTheDocument();
  },
};

export const LoggedIn: Story = {
  name: 'Logged In',
  args: {},
  play: async ({ canvasElement }) => {
    // Set logged in user state
    setLoggedInUser({
      id: 'user-student-001',
      email: 'user@example.com',
      name: '测试用户',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
      role: 'student',
      isTeacher: false,
      teacherInfo: null,
      createdAt: '2024-01-01T00:00:00Z',
    });

    const canvas = within(canvasElement);
    const avatarButton = canvas.getByTestId('user-avatar-button');
    await expect(avatarButton).toBeInTheDocument();
  },
};

export const LanguageSwitch: Story = {
  name: 'Language Switch',
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const languageButton = canvas.getByLabelText('Select language');
    await expect(languageButton).toBeInTheDocument();
  },
};

export const LoggedInAsTeacher: Story = {
  name: 'Logged In As Teacher',
  args: {},
  play: async ({ canvasElement }) => {
    // Set logged in teacher state
    setLoggedInTeacher();

    const canvas = within(canvasElement);
    const avatarButton = canvas.getByTestId('user-avatar-button');
    await expect(avatarButton).toBeInTheDocument();

    // Click the avatar to open dropdown
    await avatarButton.click();

    // Wait for dropdown animation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify dropdown opened
    const dropdown = document.querySelector('.ant-dropdown');
    await expect(dropdown).toBeInTheDocument();

    // Verify teacher dashboard entry exists
    const dropdownText = dropdown?.textContent || '';
    await expect(
      dropdownText.includes('Teacher Dashboard') || dropdownText.includes('教师工作台')
    ).toBe(true);
  },
};

export const LoggedInAsStudent: Story = {
  name: 'Logged In As Student',
  args: {},
  play: async ({ canvasElement }) => {
    // Set logged in user state (student)
    setLoggedInUser({
      id: 'user-student-001',
      email: 'user@example.com',
      name: '李同学',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student',
      role: 'student',
      isTeacher: false,
      teacherInfo: null,
      createdAt: '2024-01-01T00:00:00Z',
    });

    const canvas = within(canvasElement);
    const avatarButton = canvas.getByTestId('user-avatar-button');
    await expect(avatarButton).toBeInTheDocument();

    // Click the avatar to open dropdown
    await avatarButton.click();

    // Wait for dropdown animation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify dropdown opened
    const dropdown = document.querySelector('.ant-dropdown');
    await expect(dropdown).toBeInTheDocument();

    // Verify teacher dashboard entry does NOT exist for students
    const dropdownText = dropdown?.textContent || '';
    await expect(dropdownText.includes('Teacher Dashboard')).toBe(false);
  },
};
