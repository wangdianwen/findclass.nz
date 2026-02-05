import React from 'react';
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { Empty, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './NotificationList.module.scss';

interface NotificationItem {
  id: string;
  type: 'system' | 'course' | 'promotion' | 'reminder';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface NotificationListProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  testId?: string;
}

// ============================================
// Component
// ============================================

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  isLoading = false,
  testId = 'notification-list',
}) => {
  const { t } = useTranslation('user');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingState} data-testid={`${testId}-loading`}>
        <Spin size="large" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={styles.emptyState} data-testid={`${testId}-empty`}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <>
              <p className={styles.emptyTitle}>{t('notifications.empty')}</p>
              <p className={styles.emptyDesc}>{t('notifications.emptyDesc')}</p>
            </>
          }
        />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={styles.notificationSection} data-testid={testId}>
      {unreadCount > 0 && (
        <div className={styles.notificationHeader}>
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            {t('notifications.unreadCount', { count: unreadCount })}
          </span>
          <div className={styles.notificationActions}>
            <Button
              type="link"
              size="small"
              onClick={onMarkAllRead}
              data-testid="mark-all-read-button"
            >
              {t('notifications.markAllRead')}
            </Button>
          </div>
        </div>
      )}

      <div className={styles.notificationList}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`${styles.notificationCard} ${!notification.read ? styles.unread : ''}`}
            data-testid={`notification-${notification.id}`}
          >
            <div className={styles.notificationContent}>
              <h4 className={styles.notificationTitle}>{notification.title}</h4>
              <p className={styles.notificationText}>{notification.content}</p>
              <div className={styles.notificationMeta}>
                <span>{formatDate(notification.createdAt)}</span>
              </div>
            </div>
            <div className={styles.notificationActions}>
              {!notification.read && (
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  className={styles.actionButton}
                  onClick={() => onMarkRead(notification.id)}
                  data-testid={`mark-read-${notification.id}`}
                />
              )}
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className={styles.actionButton}
                onClick={() => onDelete(notification.id)}
                data-testid={`delete-${notification.id}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationList;
