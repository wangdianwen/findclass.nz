import React, { ReactNode } from 'react';
import { Form, Button } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { useTranslation } from 'react-i18next';

interface SubmitButtonProps {
  /** Form instance to watch for validation */
  form: FormInstance;
  /** Loading state */
  loading?: boolean;
  /** Button text (used if children not provided) */
  text?: string;
  /** Button children (overrides text) */
  children?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  form,
  loading,
  text,
  children,
  className,
  testId = 'submit-button',
}) => {
  const { t } = useTranslation('registration');

  return (
    <Form.Item shouldUpdate>
      {() => (
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={loading}
          disabled={
            !form.isFieldsTouched(true) ||
            !!form.getFieldsError().filter(({ errors }) => errors.length).length
          }
          className={className}
          data-testid={testId}
        >
          {children ?? text ?? t('button.submit')}
        </Button>
      )}
    </Form.Item>
  );
};

export default SubmitButton;
