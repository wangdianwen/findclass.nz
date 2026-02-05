import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, Select, Button, message } from 'antd';

interface SimpleFormProps {
  /** Dropdown options for subject/reason selection */
  subjectOptions: { value: string; label: string }[];
  /** Label for the dropdown field */
  subjectLabel: string;
  /** Placeholder for the dropdown */
  subjectPlaceholder?: string;
  /** Label for the message/details textarea */
  messageLabel: string;
  /** Placeholder for the message textarea */
  messagePlaceholder?: string;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text (if provided, shows cancel button) */
  cancelText?: string;
  /** Custom submit handler, if not using default */
  onSubmit?: (values: { subject: string; message: string }) => Promise<void>;
  /** Callback when form is successfully submitted */
  onSuccess?: () => void;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Custom success message (if not using default report message) */
  successMessage?: string;
  /** Custom required message for subject field */
  subjectRequiredMessage?: string;
  /** Custom required message for message field */
  messageRequiredMessage?: string;
}

export const SimpleForm: React.FC<SimpleFormProps> = ({
  subjectOptions,
  subjectLabel,
  subjectPlaceholder,
  messageLabel,
  messagePlaceholder,
  submitText,
  cancelText,
  onSubmit,
  onSuccess,
  onCancel,
  successMessage,
  subjectRequiredMessage,
  messageRequiredMessage,
}) => {
  const { t } = useTranslation('search');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const defaultSubmitText = submitText || t('course.reportSubmit');
  const defaultSubjectPlaceholder = subjectPlaceholder || t('course.reportReasonPlaceholder');
  const defaultMessagePlaceholder = messagePlaceholder || t('course.reportDetailsPlaceholder');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await form.validateFields();
      if (onSubmit) {
        const values = form.getFieldsValue();
        await onSubmit(values);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        message.success(successMessage || t('course.reportSubmitted'));
      }
      form.resetFields();
      onSuccess?.();
    } catch {
      message.error(t('course.reportError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark="optional">
        <Form.Item
          name="subject"
          label={subjectLabel}
          rules={[
            { required: true, message: subjectRequiredMessage || t('course.reportReasonRequired') },
          ]}
        >
          <Select placeholder={defaultSubjectPlaceholder} options={subjectOptions} />
        </Form.Item>
        <Form.Item
          name="message"
          label={messageLabel}
          rules={[
            {
              required: true,
              message: messageRequiredMessage || t('course.reportDetailsRequired'),
            },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder={defaultMessagePlaceholder}
            showCount
            maxLength={1000}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          {cancelText && (
            <Button onClick={onCancel} style={{ marginRight: 8 }}>
              {cancelText}
            </Button>
          )}
          <Button type="primary" htmlType="submit" loading={submitting}>
            {defaultSubmitText}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SimpleForm;
