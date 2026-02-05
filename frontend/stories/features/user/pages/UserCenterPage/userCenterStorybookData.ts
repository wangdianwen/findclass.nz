// Storybook data override support for UserCenterPage
import type { UserProfile, Child, NotificationItem, LearningRecord } from '@/services/api';

let storybookUserProfile: UserProfile | null = null;
let storybookChildren: Child[] | null = null;
let storybookNotifications: NotificationItem[] | null = null;
let storybookHistory: LearningRecord[] | null = null;
let storybookFavorites: { courseIds: string[] } | null = null;
let storybookReviews: Array<{
  id: string;
  teacherId: string;
  teacherName: string;
  courseTitle: string;
  overallRating: number;
  content: string;
  createdAt: string;
}> | null = null;
let storybookIsLoggedIn = false;
let storybookIsTeacher = false;
let storybookTeacherStatus: 'none' | 'pending' | 'approved' = 'none';

export const setStorybookUserData = (data: {
  userProfile?: UserProfile;
  children?: Child[];
  notifications?: NotificationItem[];
  history?: LearningRecord[];
  favorites?: { courseIds: string[] };
  reviews?: Array<{
    id: string;
    teacherId: string;
    teacherName: string;
    courseTitle: string;
    overallRating: number;
    content: string;
    createdAt: string;
  }>;
  isLoggedIn?: boolean;
  isTeacher?: boolean;
  teacherStatus?: 'none' | 'pending' | 'approved';
}) => {
  if (data.userProfile) storybookUserProfile = data.userProfile;
  if (data.children) storybookChildren = data.children;
  if (data.notifications) storybookNotifications = data.notifications;
  if (data.history) storybookHistory = data.history;
  if (data.favorites) storybookFavorites = data.favorites;
  if (data.reviews) storybookReviews = data.reviews;
  if (data.isLoggedIn !== undefined) storybookIsLoggedIn = data.isLoggedIn;
  if (data.isTeacher !== undefined) storybookIsTeacher = data.isTeacher;
  if (data.teacherStatus) storybookTeacherStatus = data.teacherStatus;
};

export const clearStorybookUserData = () => {
  storybookUserProfile = null;
  storybookChildren = null;
  storybookNotifications = null;
  storybookHistory = null;
  storybookFavorites = null;
  storybookReviews = null;
  storybookIsLoggedIn = false;
  storybookIsTeacher = false;
  storybookTeacherStatus = 'none';
};

export const getStorybookUserProfile = (): UserProfile | null => storybookUserProfile;
export const getStorybookChildren = (): Child[] | null => storybookChildren;
export const getStorybookNotifications = (): NotificationItem[] | null => storybookNotifications;
export const getStorybookHistory = (): LearningRecord[] | null => storybookHistory;
export const getStorybookFavorites = (): { courseIds: string[] } | null => storybookFavorites;
export const getStorybookReviews = (): Array<{
  id: string;
  teacherId: string;
  teacherName: string;
  courseTitle: string;
  overallRating: number;
  content: string;
  createdAt: string;
}> | null => storybookReviews;
export const getStorybookIsLoggedIn = (): boolean => storybookIsLoggedIn;
export const getStorybookIsTeacher = (): boolean => storybookIsTeacher;
export const getStorybookTeacherStatus = (): 'none' | 'pending' | 'approved' => storybookTeacherStatus;

// Default mock data for UserCenter stories
export const DEFAULT_MOCK_USER_PROFILE: UserProfile = {
  id: 'user-001',
  email: 'user@example.com',
  name: '测试用户',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
  role: 'student',
  isTeacher: false,
  gender: 'male',
  phone: '021-123-4567',
  wechat: 'user123',
  showEmail: true,
  showPhone: false,
  showWechat: true,
  showRealName: false,
  createdAt: '2024-01-01T00:00:00Z',
};

export const DEFAULT_MOCK_CHILDREN: Child[] = [
  { id: 'child-001', name: '张小明', gender: 'male', grade: 'secondary-7' },
  { id: 'child-002', name: '张小红', gender: 'female', grade: 'primary-3' },
];

export const DEFAULT_MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-001',
    type: 'system',
    title: 'Welcome to FindClass!',
    content: 'Thank you for joining us. Start exploring courses now.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-002',
    type: 'course',
    title: 'New Course Available',
    content: 'A new math course matches your interests.',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const DEFAULT_MOCK_HISTORY: LearningRecord[] = [
  {
    id: 'history-001',
    courseId: '1',
    courseTitle: '高中数学提高班',
    institution: 'Auckland Education Center',
    lastViewedAt: new Date().toISOString(),
    status: 'in_progress',
    learnerId: undefined,
  },
  {
    id: 'history-002',
    courseId: '2',
    courseTitle: '物理基础班',
    institution: 'Wellington Tutoring',
    lastViewedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed',
    learnerId: 'child-001',
  },
];

export const DEFAULT_MOCK_FAVORITES = {
  courseIds: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
};

export const DEFAULT_MOCK_REVIEWS = [
  {
    id: 'review-user-001',
    teacherId: 'teacher-001',
    teacherName: '张老师',
    courseTitle: '高中数学提高班',
    overallRating: 5,
    content: '老师讲解非常清晰！',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];
