import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent } from '@storybook/test';
import ForgotPasswordPage from '@/features/user/pages/ForgotPasswordPage';

const meta: Meta<typeof ForgotPasswordPage> = {
  title: 'Features/User/Forgot Password Page',
  component: ForgotPasswordPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Password reset page with email, new password, and verification code.',
      },
    },
    reactRouter: {
      routePath: '/forgot-password',
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['forgotPassword'],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ForgotPasswordPage>;

export const Default: Story = {
  name: 'Default Forgot Password',
};

export const WithEmailEntered: Story = {
  name: 'With Email Entered',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'user@example.com');
  },
};

export const WithPasswordEntered: Story = {
  name: 'With Password Entered',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'user@example.com');

    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'newpassword123');
  },
};

export const ResetSuccess: Story = {
  name: 'Reset Password Success Flow',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Enter email
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'user@example.com');

    // Enter new password
    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'newpassword123');

    // Confirm password
    const confirmPasswordInput = canvas.getByTestId('confirm-password-input');
    await userEvent.type(confirmPasswordInput, 'newpassword123');

    // Click send code button
    const sendCodeButton = canvas.getByTestId('send-code-button');
    await userEvent.click(sendCodeButton);

    // Wait for mock API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Enter verification code (use 123456 for success)
    const codeInput = canvas.getByTestId('code-input');
    await userEvent.type(codeInput, '123456');

    // Click submit button
    const submitButton = canvas.getByTestId('submit-button');
    await userEvent.click(submitButton);

    // Wait for mock reset password API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  },
};

export const PasswordMismatch: Story = {
  name: 'Password Mismatch Validation',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Enter email
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'user@example.com');

    // Enter new password
    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'newpassword123');

    // Enter different confirm password
    const confirmPasswordInput = canvas.getByTestId('confirm-password-input');
    await userEvent.type(confirmPasswordInput, 'differentpassword');

    // Click submit button to trigger validation
    const submitButton = canvas.getByTestId('submit-button');
    await userEvent.click(submitButton);

    // Wait for validation
    await new Promise(resolve => setTimeout(resolve, 500));
  },
};
