import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent } from '@storybook/test';
import RegisterPage from '@/features/user/pages/RegisterPage';

const meta: Meta<typeof RegisterPage> = {
  title: 'Features/User/Register Page',
  component: RegisterPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Registration page with email verification code and password.',
      },
    },
    reactRouter: {
      routePath: '/register',
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['register'],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // Add arg types for controls if needed
  },
};

export default meta;
type Story = StoryObj<typeof RegisterPage>;

export const Default: Story = {
  name: 'Default Register',
};

export const WithEmailEntered: Story = {
  name: 'With Email Entered',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'newuser@example.com');
  },
};

export const WithPasswordEntered: Story = {
  name: 'With Password Entered',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'newuser@example.com');

    // Toggle password visibility and enter password
    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'password123');
  },
};

export const RegistrationSuccess: Story = {
  name: 'Registration Success Flow',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Enter email
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'newuser@example.com');

    // Enter password
    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'password123');

    // Confirm password
    const confirmPasswordInput = canvas.getByTestId('confirm-password-input');
    await userEvent.type(confirmPasswordInput, 'password123');

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

    // Wait for mock registration API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  },
};

export const PasswordMismatch: Story = {
  name: 'Password Mismatch Validation',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Enter email
    const emailInput = canvas.getByTestId('email-input');
    await userEvent.type(emailInput, 'newuser@example.com');

    // Enter password
    const passwordInput = canvas.getByTestId('password-input');
    await userEvent.type(passwordInput, 'password123');

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
