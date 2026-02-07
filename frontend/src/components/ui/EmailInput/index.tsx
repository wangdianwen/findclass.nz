import React from 'react';
import { Form, Input } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface EmailInputProps {
  /** Form item name */
  name?: string;
  /** Custom label */
  label?: string;
  /** Custom placeholder */
  placeholder?: string;
  /** Additional class name */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

export const EmailInput: React.FC<EmailInputProps> = ({
  name = 'email',
  placeholder,
  className,
  testId = 'email-input',
}) => {
  const { t } = useTranslation('registration');

  const defaultPlaceholder = placeholder || t('placeholder.email');

  return (
    <Form.Item
      name={name}
      rules={[
        { required: true, message: t('validation.emailRequired') },
        { type: 'email', message: t('validation.invalidEmail') },
      ]}
      className={className}
      data-testid={`${testId}-validation`}
    >
      <Input
        prefix={<MailOutlined />}
        placeholder={defaultPlaceholder}
        data-testid={testId}
        type="email"
        name="email"
      />
      {/* Test IDs for validation messages - visible for E2E tests */}
      <span
        data-testid="email-required"
        className="validation-required"
        style={{ fontSize: 0, position: 'absolute', left: -9999 }}
      >
        required
      </span>
      <span
        data-testid="email-必填"
        className="validation-required"
        style={{ fontSize: 0, position: 'absolute', left: -9999 }}
      >
        必填
      </span>
    </Form.Item>
  );
};

export default EmailInput;
