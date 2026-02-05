import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent } from '@storybook/test';
import { HttpResponse, http } from 'msw';
import LoginPage from '@/features/user/pages/LoginPage';

// API Base URL for MSW handlers
const API_BASE = '/api/v1';

const meta: Meta<typeof LoginPage> = {
  title: 'Features/User/Login Page',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Login page with email/password and social login options.',
      },
    },
    reactRouter: {
      routePath: '/login',
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['login'],
    },
    msw: {
      handlers: [
        // Mock social login endpoint
        http.post(`${API_BASE}/auth/social-login`, async () => {
          return HttpResponse.json({
            success: true,
            data: {
              accessToken: `mock-social-token-${Date.now()}`,
              refreshToken: `mock-social-refresh-${Date.now()}`,
              expiresIn: 86400,
              tokenType: 'Bearer',
            },
            message: 'Social login successful',
          });
        }),
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // Add arg types for controls if needed
  },
};

export default meta;
type Story = StoryObj<typeof LoginPage>;

export const Default: Story = {
  name: 'Default Login',
};

export const WithEmailEntered: Story = {
  name: 'With Email Entered',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'test@example.com');
  },
};

export const PasswordLoginSuccess: Story = {
  name: 'Password Login Success',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Enter email
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'test@example.com');

    // Enter password
    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'password123');

    // Click submit button
    const submitButton = canvas.getByTestId('submit-button');
    await userEvent.click(submitButton);

    // Wait for mock login API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  },
};

export const PasswordLoginError: Story = {
  name: 'Password Login Error',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Enter email
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'test@example.com');

    // Enter wrong password
    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'wrong');

    // Click submit button
    const submitButton = canvas.getByTestId('submit-button');
    await userEvent.click(submitButton);

    // Wait for mock login API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  },
};
