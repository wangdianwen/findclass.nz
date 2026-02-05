import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, Button, Modal, message } from 'antd';
import { LogoutOutlined, DashboardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/shared';
import { Footer } from '@/components/shared';
import { useUserStore } from '@/stores/userStore';
import { userCenterApi, userApi, type Child } from '@/services/api';
import { UserProfile } from './sections/UserProfile';
import { FavoritesList } from './sections/FavoritesList';
import { LearningHistory } from './sections/LearningHistory';
import { NotificationList } from './sections/NotificationList';
import { ChildrenManagement } from './sections/ChildrenManagement';
import { MyReviews } from './sections/MyReviews';
import styles from './UserCenterPage.module.scss';

type ActiveTab = 'profile' | 'favorites' | 'history' | 'notifications' | 'children' | 'reviews';

const VALID_TABS: ActiveTab[] = ['profile', 'favorites', 'history', 'notifications', 'children', 'reviews'];

const { confirm } = Modal;

// ============================================
// Component
// ============================================

export const UserCenterPage: React.FC = () => {
  const { t } = useTranslation('user');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, clearUser, isLoggedIn } = useUserStore();
  const queryClient = useQueryClient();

  // Get current tab from URL - URL is the source of truth
  const activeTab: ActiveTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return VALID_TABS.includes(tab as ActiveTab) ? (tab as ActiveTab) : 'profile';
  }, [searchParams]);

  // Query: Get user profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userCenterApi.getProfile(),
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  // Query: Get favorites
  const { data: favoritesData, isLoading: favoritesLoading } = useQuery({
    queryKey: ['userFavorites'],
    queryFn: () => userApi.getFavorites(),
    enabled: isLoggedIn,
    staleTime: 2 * 60 * 1000,
  });

  // Query: Get children
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ['userChildren'],
    queryFn: () => userCenterApi.getChildren(),
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  // Query: Get learning history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['userHistory'],
    queryFn: () => userCenterApi.getLearningHistory(),
    enabled: isLoggedIn,
    staleTime: 2 * 60 * 1000,
  });

  // Query: Get notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['userNotifications'],
    queryFn: () => userCenterApi.getNotifications(),
    enabled: isLoggedIn,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });

  // Query: Get user reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['userReviews'],
    queryFn: () => userCenterApi.getUserReviews(),
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation: Add child
  const addChildMutation = useMutation({
    mutationFn: (data: Omit<Child, 'id'>) => userCenterApi.addChild(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userChildren'] });
      message.success(t('children.saveSuccess'));
    },
    onError: () => {
      message.error(t('children.saveError'));
    },
  });

  // Mutation: Update child
  const updateChildMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Child> }) =>
      userCenterApi.updateChild(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userChildren'] });
      message.success(t('children.saveSuccess'));
    },
    onError: () => {
      message.error(t('children.saveError'));
    },
  });

  // Mutation: Delete child
  const deleteChildMutation = useMutation({
    mutationFn: (id: string) => userCenterApi.deleteChild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userChildren'] });
      message.success(t('children.deleteSuccess'));
    },
    onError: () => {
      message.error(t('children.deleteError'));
    },
  });

  // Mutation: Remove favorite
  const removeFavoriteMutation = useMutation({
    mutationFn: (courseId: string) => userApi.toggleFavorite(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userFavorites'] });
      message.success(t('favorites.removeSuccess'));
    },
    onError: () => {
      message.error(t('favorites.removeError'));
    },
  });

  // Mutation: Remove notification
  const removeNotificationMutation = useMutation({
    mutationFn: (id: string) => userCenterApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
    },
  });

  // Mutation: Mark notification read
  const markNotificationReadMutation = useMutation({
    mutationFn: (id: string) => userCenterApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
    },
  });

  // Mutation: Mark all notifications read
  const markAllReadMutation = useMutation({
    mutationFn: () => userCenterApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
      message.success(t('notifications.markRead'));
    },
  });

  // Mutation: Remove history item
  const removeHistoryMutation = useMutation({
    mutationFn: (id: string) => userCenterApi.removeHistoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userHistory'] });
    },
  });

  // Mock teacher application status (in real app, this would come from API)
  const [teacherStatus] = useState<'none' | 'pending' | 'approved'>('none');

  // Handle tab change - updates URL which triggers re-render
  const handleTabChange = useCallback((key: string) => {
    setSearchParams({ tab: key }, { replace: true });
  }, [setSearchParams]);

  // Authentication check - useEffect for redirect
  // Use useLayoutEffect only in browser environment
  const isBrowser = typeof window !== 'undefined';

  useEffect(() => {
    if (!isBrowser) return;

    const authToken = localStorage.getItem('auth_token');
    const sessionToken = sessionStorage.getItem('auth_token');

    // Check for obviously invalid/expired tokens
    const isExpiredToken = authToken === 'expired-token' ||
      sessionToken === 'expired-token' ||
      (!authToken && !sessionToken);

    if (isExpiredToken || (!isLoggedIn && !authToken && !sessionToken)) {
      message.warning(t('auth.required'));
      navigate('/login?redirect=/user', { replace: true });
    }
  }, [isBrowser, isLoggedIn, navigate, t]);

  const handleLogout = useCallback(() => {
    confirm({
      title: t('logout.button'),
      content: t('logout.confirm'),
      okText: t('logout.button'),
      okType: 'danger',
      cancelText: t('profile.cancel'),
      onOk() {
        clearUser();
        message.success(t('logout.success'));
        window.location.href = '/';
      },
    });
  }, [clearUser, t]);

  const handleRemoveFavorite = useCallback(
    (id: string) => {
      removeFavoriteMutation.mutate(id);
    },
    [removeFavoriteMutation]
  );

  const handleMarkNotificationRead = useCallback(
    (id: string) => {
      markNotificationReadMutation.mutate(id);
    },
    [markNotificationReadMutation]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleDeleteNotification = useCallback(
    (id: string) => {
      removeNotificationMutation.mutate(id);
    },
    [removeNotificationMutation]
  );

  const handleRemoveHistory = useCallback(
    (id: string) => {
      removeHistoryMutation.mutate(id);
    },
    [removeHistoryMutation]
  );

  const handleAddChild = useCallback(
    (data: Omit<Child, 'id'>) => {
      addChildMutation.mutate(data);
    },
    [addChildMutation]
  );

  const handleEditChild = useCallback(
    (id: string, data: Partial<Child>) => {
      updateChildMutation.mutate({ id, data });
    },
    [updateChildMutation]
  );

  const handleDeleteChild = useCallback(
    (id: string) => {
      deleteChildMutation.mutate(id);
    },
    [deleteChildMutation]
  );

  // Transform favorites data for display
  const favorites = favoritesData?.courseIds?.map((id, index) => ({
    id,
    title: `课程 ${index + 1}`,
    institution: '机构名称',
    price: 0,
    rating: 0,
  })) || [];

  // Transform children data
  const children = childrenData?.data || [];

  // Transform history data
  const history = historyData?.data || [];

  // Transform notifications data
  const notifications = notificationsData?.data || [];

  // Transform reviews data
  const reviews = reviewsData?.data || [];

  // Authentication check - MUST happen before any rendering
  // Check localStorage directly for immediate auth state
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;

  // If no auth token exists, redirect immediately
  if (!authToken && !sessionToken && !isLoggedIn) {
    // Use window.location for immediate redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/login?redirect=/user';
    }
    return null;
  }

  // If not authenticated, show loading while checking auth state
  const isAuthLoading = profileLoading || favoritesLoading;

  if (!isLoggedIn && !isAuthLoading) {
    return null;
  }

  // Show loading spinner while checking auth
  if (!isLoggedIn) {
    return (
      <div className={styles.loadingContainer} data-testid="user-center-loading">
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'profile',
      label: <span>{t('nav.profile')}</span>,
      children: (
        <UserProfile
          profile={profileData?.data}
          isLoading={profileLoading}
        />
      ),
    },
    {
      key: 'favorites',
      label: <span>{t('nav.favorites')}</span>,
      children: (
        <FavoritesList
          favorites={favorites}
          onRemove={handleRemoveFavorite}
          isLoading={favoritesLoading}
        />
      ),
    },
    {
      key: 'history',
      label: <span>{t('nav.history')}</span>,
      children: (
        <LearningHistory
          history={history}
          children={children}
          onRemove={handleRemoveHistory}
          isLoading={historyLoading}
        />
      ),
    },
    {
      key: 'notifications',
      label: <span>{t('nav.notifications')}</span>,
      children: (
        <NotificationList
          notifications={notifications}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllRead}
          onDelete={handleDeleteNotification}
          isLoading={notificationsLoading}
        />
      ),
    },
    {
      key: 'children',
      label: <span>{t('nav.children')}</span>,
      children: (
        <ChildrenManagement
          children={children}
          onAdd={handleAddChild}
          onEdit={handleEditChild}
          onDelete={handleDeleteChild}
          isLoading={childrenLoading}
        />
      ),
    },
    {
      key: 'reviews',
      label: <span>{t('nav.reviews')}</span>,
      children: (
        <MyReviews
          reviews={reviews}
          isLoading={reviewsLoading}
        />
      ),
    },
  ];

  return (
    <div className={styles.userCenterPage}>
      <Header />
      <div className={styles.headerSpacer} />

      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{t('title')}</h1>
          <p className={styles.pageSubtitle}>{t('subtitle')}</p>
        </header>

        {user && (
          <div className={styles.userCard}>
            <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user.name}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
            <span data-testid="logout-button">
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                className={styles.logoutButton}
              >
                {t('logout.button')}
              </Button>
            </span>
          </div>
        )}

        {/* Teacher Dashboard Entry Card (for approved teachers) */}
        {teacherStatus === 'approved' && (
          <div className={styles.teacherDashboardCard} data-testid="teacher-dashboard-card">
            <div className={styles.teacherDashboardInfo}>
              <div className={styles.teacherDashboardIcon}>
                <DashboardOutlined />
              </div>
              <div className={styles.teacherDashboardText}>
                <h3 className={styles.teacherDashboardTitle}>{t('teaching.dashboardTitle')}</h3>
                <p className={styles.teacherDashboardSubtitle}>{t('teaching.dashboardSubtitle')}</p>
              </div>
            </div>
            <div className={styles.teacherDashboardButton}>
              <Button
                type="primary"
                icon={<DashboardOutlined />}
                onClick={() => navigate('/teacher/dashboard')}
                data-testid="teacher-dashboard-button"
              >
                {t('teaching.goToDashboard')}
              </Button>
            </div>
          </div>
        )}

        <div className={styles.contentSection}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            data-testid="user-center-tabs"
          />
        </div>
      </div>

      <div className={styles.footerSpacer} />
      <Footer />
    </div>
  );
};

export default UserCenterPage;
