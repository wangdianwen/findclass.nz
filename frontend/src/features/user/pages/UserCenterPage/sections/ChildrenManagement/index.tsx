import React, { useState, useCallback } from 'react';
import { Button, Modal, Form, Input, Select, Empty, Spin } from 'antd';
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Child } from '@/services/api';
import styles from './ChildrenManagement.module.scss';

interface ChildrenManagementProps {
  children?: Child[];
  onAdd?: (data: Omit<Child, 'id'>) => void;
  onEdit?: (id: string, data: Partial<Child>) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  testId?: string;
}

// ============================================
// Component
// ============================================

export const ChildrenManagement: React.FC<ChildrenManagementProps> = ({
  children = [],
  onAdd,
  onEdit,
  onDelete,
  isLoading = false,
  testId = 'children-management',
}) => {
  const { t } = useTranslation('user');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [form] = Form.useForm();

  // Get translated grade label
  const getGradeLabel = useCallback(
    (grade: string) => {
      const gradeLabels: Record<string, string> = {
        preschool: t('children.gradeOptions.preschool'),
        'primary-1': t('children.gradeOptions.primary.1'),
        'primary-2': t('children.gradeOptions.primary.2'),
        'primary-3': t('children.gradeOptions.primary.3'),
        'primary-4': t('children.gradeOptions.primary.4'),
        'primary-5': t('children.gradeOptions.primary.5'),
        'primary-6': t('children.gradeOptions.primary.6'),
        'secondary-7': t('children.gradeOptions.secondary.7'),
        'secondary-8': t('children.gradeOptions.secondary.8'),
        'secondary-9': t('children.gradeOptions.secondary.9'),
        'high-10': t('children.gradeOptions.high.10'),
        'high-11': t('children.gradeOptions.high.11'),
        'high-12': t('children.gradeOptions.high.12'),
        'high-13': t('children.gradeOptions.high.13'),
      };
      return gradeLabels[grade] || grade;
    },
    [t]
  );

  // Get translated gender label
  const getGenderLabel = useCallback(
    (gender: string) => {
      const genderLabels: Record<string, string> = {
        male: t('children.form.genderMale'),
        female: t('children.form.genderFemale'),
        other: t('children.form.genderOther'),
      };
      return genderLabels[gender] || gender;
    },
    [t]
  );

  // Open modal for adding new child
  const handleAdd = useCallback(() => {
    setEditingChild(null);
    form.resetFields();
    setIsModalOpen(true);
  }, [form]);

  // Open modal for editing existing child
  const handleEdit = useCallback(
    (child: Child) => {
      setEditingChild(child);
      form.setFieldsValue({
        name: child.name,
        gender: child.gender,
        grade: child.grade,
      });
      setIsModalOpen(true);
    },
    [form]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(
    (child: Child) => {
      Modal.confirm({
        title: t('children.deleteConfirm', { name: child.name }),
        okText: t('children.delete'),
        okType: 'danger',
        cancelText: t('children.form.cancel'),
        onOk() {
          onDelete?.(child.id);
        },
      });
    },
    [t, onDelete]
  );

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setIsModalOpen(false);

      if (editingChild) {
        onEdit?.(editingChild.id, values);
      } else {
        onAdd?.(values);
      }
    } catch {
      // Validation failed
    }
  }, [form, editingChild, onAdd, onEdit]);

  // Handle modal cancel
  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    form.resetFields();
  }, [form]);

  if (isLoading) {
    return (
      <div className={styles.loadingState} data-testid={`${testId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.childrenSection} data-testid={testId}>
      {/* Add Button */}
      <div className={styles.header}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          data-testid="add-child-button"
        >
          {t('children.add')}
        </Button>
      </div>

      {/* Children List */}
      {children.length === 0 ? (
        <div className={styles.emptyState} data-testid="empty-state">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <>
                <p className={styles.emptyTitle}>{t('children.empty')}</p>
                <p className={styles.emptyDesc}>{t('children.emptyDesc')}</p>
              </>
            }
          >
            <Button type="primary" onClick={handleAdd}>
              {t('children.add')}
            </Button>
          </Empty>
        </div>
      ) : (
        <div className={styles.childrenList} data-testid="children-list">
          {children.map(child => (
            <div key={child.id} className={styles.childCard} data-testid={`child-${child.id}`}>
              <div className={styles.childInfo}>
                <h3 className={styles.childName}>{child.name}</h3>
                <div className={styles.childDetail}>
                  <span>{t('children.genderLabel', { gender: getGenderLabel(child.gender) })}</span>
                  <span>{t('children.gradeLabel', { grade: getGradeLabel(child.grade) })}</span>
                </div>
              </div>
              <div className={styles.childActions}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(child)}
                  data-testid={`edit-button-${child.id}`}
                >
                  {t('children.edit')}
                </Button>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(child)}
                  data-testid={`delete-button-${child.id}`}
                >
                  {t('children.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingChild ? t('children.form.editChild') : t('children.form.addChild')}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText={t('children.form.save')}
        cancelText={t('children.form.cancel')}
        data-testid="child-modal"
      >
        <Form form={form} layout="vertical" data-testid="child-form">
          <Form.Item
            name="name"
            label={t('children.form.name')}
            rules={[
              { required: true, message: t('children.form.required') },
              { min: 2, max: 20, message: 'Name must be 2-20 characters' },
            ]}
          >
            <Input
              placeholder={t('children.form.namePlaceholder')}
              prefix={<UserOutlined />}
              data-testid="name-input"
            />
          </Form.Item>

          <Form.Item
            name="gender"
            label={t('children.form.gender')}
            rules={[{ required: true, message: t('children.form.required') }]}
          >
            <Select
              placeholder={t('children.form.gender')}
              data-testid="gender-select"
              options={[
                { value: 'male', label: t('children.form.genderMale') },
                { value: 'female', label: t('children.form.genderFemale') },
                { value: 'other', label: t('children.form.genderOther') },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="grade"
            label={t('children.form.grade')}
            rules={[{ required: true, message: t('children.form.required') }]}
          >
            <Select
              placeholder={t('children.form.grade')}
              data-testid="grade-select"
              options={[
                {
                  label: t('children.gradeOptions.preschool'),
                  options: [{ value: 'preschool', label: t('children.gradeOptions.preschool') }],
                },
                {
                  label: t('history.statusNotStarted') + ' ' + t('children.form.grade'),
                  options: [
                    { value: 'primary-1', label: t('children.gradeOptions.primary.1') },
                    { value: 'primary-2', label: t('children.gradeOptions.primary.2') },
                    { value: 'primary-3', label: t('children.gradeOptions.primary.3') },
                    { value: 'primary-4', label: t('children.gradeOptions.primary.4') },
                    { value: 'primary-5', label: t('children.gradeOptions.primary.5') },
                    { value: 'primary-6', label: t('children.gradeOptions.primary.6') },
                  ],
                },
                {
                  label: '初中',
                  options: [
                    { value: 'secondary-7', label: t('children.gradeOptions.secondary.7') },
                    { value: 'secondary-8', label: t('children.gradeOptions.secondary.8') },
                    { value: 'secondary-9', label: t('children.gradeOptions.secondary.9') },
                  ],
                },
                {
                  label: '高中',
                  options: [
                    { value: 'high-10', label: t('children.gradeOptions.high.10') },
                    { value: 'high-11', label: t('children.gradeOptions.high.11') },
                    { value: 'high-12', label: t('children.gradeOptions.high.12') },
                    { value: 'high-13', label: t('children.gradeOptions.high.13') },
                  ],
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChildrenManagement;
