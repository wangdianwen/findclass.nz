import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, Select, Button, message } from 'antd';
import styles from './ContactForm.module.scss';

interface ContactFormProps {
  subjectOptions: { value: string; label: string }[];
  onSubmit?: () => void;
  userName?: string;
  userEmail?: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  subjectOptions,
  onSubmit,
  userName,
  userEmail,
}) => {
  const { t } = useTranslation('contact');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const hasUserInfo = Boolean(userName && userEmail);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await form.validateFields();
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(t('form.success'));
      form.resetFields();
      onSubmit?.();
    } catch {
      message.error(t('form.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.contactForm}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
        initialValues={hasUserInfo ? { name: userName, email: userEmail } : undefined}
      >
        {!hasUserInfo && (
          <div className={styles.formRow}>
            <Form.Item
              name="name"
              label={t('form.name')}
              rules={[{ required: true, message: t('form.required') }]}
              className={styles.formItemHalf}
            >
              <Input placeholder={t('form.namePlaceholder')} />
            </Form.Item>
            <Form.Item
              name="email"
              label={t('form.email')}
              rules={[
                { required: true, message: t('form.required') },
                { type: 'email', message: t('form.emailInvalid') },
              ]}
              className={styles.formItemHalf}
            >
              <Input placeholder={t('form.emailPlaceholder')} />
            </Form.Item>
          </div>
        )}
        <Form.Item
          name="subject"
          label={t('form.subject')}
          rules={[{ required: true, message: t('form.required') }]}
        >
          <Select placeholder={t('form.subjectPlaceholder')} options={subjectOptions} />
        </Form.Item>
        <Form.Item
          name="message"
          label={t('form.message')}
          rules={[{ required: true, message: t('form.required') }]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t('form.messagePlaceholder')}
            showCount
            maxLength={1000}
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            className={styles.submitButton}
          >
            {t('form.submit')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ContactForm;
