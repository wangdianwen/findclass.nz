import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationList } from '../index';

describe('NotificationList', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'system' as const,
      title: 'Welcome to FindClass!',
      content: 'Thank you for joining us.',
      read: false,
      createdAt: '2026-01-28T09:00:00Z',
    },
    {
      id: '2',
      type: 'course' as const,
      title: 'New Course Available',
      content: 'A new Mathematics course matches your interests.',
      read: true,
      createdAt: '2026-01-27T14:00:00Z',
    },
  ];

  const defaultProps = {
    notifications: mockNotifications,
    onMarkRead: vi.fn(),
    onMarkAllRead: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification list with items', () => {
    render(<NotificationList {...defaultProps} />);
    expect(screen.getByTestId('notification-list')).toBeTruthy();
    expect(screen.getByText('Welcome to FindClass!')).toBeTruthy();
    expect(screen.getByText('New Course Available')).toBeTruthy();
  });

  it('shows unread count when there are unread notifications', () => {
    render(<NotificationList {...defaultProps} />);
    // i18n key is shown in test environment
    expect(screen.getByText('notifications.unreadCount')).toBeTruthy();
  });

  it('does not show unread count when all are read', () => {
    const allReadNotifications = mockNotifications.map(n => ({ ...n, read: true }));
    render(<NotificationList {...defaultProps} notifications={allReadNotifications} />);
    expect(screen.queryByText(/unread/)).toBeNull();
  });

  it('shows mark all read button when there are unread notifications', () => {
    render(<NotificationList {...defaultProps} />);
    expect(screen.getByTestId('mark-all-read-button')).toBeTruthy();
  });

  it('calls onMarkAllRead when button is clicked', () => {
    render(<NotificationList {...defaultProps} />);
    fireEvent.click(screen.getByTestId('mark-all-read-button'));
    expect(defaultProps.onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('highlights unread notifications', () => {
    render(<NotificationList {...defaultProps} />);
    const unreadCard = screen.getByTestId('notification-1');
    expect(unreadCard.className).toContain('unread');
  });

  it('does not highlight read notifications', () => {
    render(<NotificationList {...defaultProps} />);
    const readCard = screen.getByTestId('notification-2');
    expect(readCard.className).not.toContain('unread');
  });

  it('calls onMarkRead when check button is clicked on unread notification', () => {
    render(<NotificationList {...defaultProps} />);
    fireEvent.click(screen.getByTestId('mark-read-1'));
    expect(defaultProps.onMarkRead).toHaveBeenCalledWith('1');
  });

  it('does not show check button on read notifications', () => {
    render(<NotificationList {...defaultProps} />);
    expect(screen.queryByTestId('mark-read-2')).toBeNull();
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<NotificationList {...defaultProps} />);
    fireEvent.click(screen.getByTestId('delete-1'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
  });

  it('renders empty state when no notifications', () => {
    render(<NotificationList {...defaultProps} notifications={[]} />);
    expect(screen.getByTestId('notification-list-empty')).toBeTruthy();
  });

  it('displays notification title and content', () => {
    render(<NotificationList {...defaultProps} />);
    expect(screen.getByText('Welcome to FindClass!')).toBeTruthy();
    expect(screen.getByText('Thank you for joining us.')).toBeTruthy();
  });

  it('uses custom testId', () => {
    render(<NotificationList {...defaultProps} testId="custom-notifications" />);
    expect(screen.getByTestId('custom-notifications')).toBeTruthy();
  });
});
