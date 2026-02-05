// Default images and avatars for the application
// These are used when users don't upload custom images
// All assets are stored in /public/images/

// ============================================
// Base URL for static assets
// ============================================
const BASE_URL = '/images';

// ============================================
// Default User Avatar Options
// ============================================
export const DEFAULT_AVATAR_OPTIONS = [
  {
    id: 'avatar-1',
    label: 'Blue',
    url: `${BASE_URL}/avatars/avatar-1.svg`,
  },
  {
    id: 'avatar-2',
    label: 'Green',
    url: `${BASE_URL}/avatars/avatar-2.svg`,
  },
  {
    id: 'avatar-3',
    label: 'Orange',
    url: `${BASE_URL}/avatars/avatar-3.svg`,
  },
  {
    id: 'avatar-4',
    label: 'Purple',
    url: `${BASE_URL}/avatars/avatar-4.svg`,
  },
  {
    id: 'avatar-5',
    label: 'Pink',
    url: `${BASE_URL}/avatars/avatar-5.svg`,
  },
  {
    id: 'avatar-6',
    label: 'Teal',
    url: `${BASE_URL}/avatars/avatar-6.svg`,
  },
  {
    id: 'avatar-7',
    label: 'Rose',
    url: `${BASE_URL}/avatars/avatar-7.svg`,
  },
  {
    id: 'avatar-8',
    label: 'Cyan',
    url: `${BASE_URL}/avatars/avatar-8.svg`,
  },
  {
    id: 'avatar-9',
    label: 'Amber',
    url: `${BASE_URL}/avatars/avatar-9.svg`,
  },
];

// Default avatar for quick assignment
export const DEFAULT_AVATAR = DEFAULT_AVATAR_OPTIONS[0].url;

// ============================================
// Default Course Cover Image
// ============================================
export const DEFAULT_COURSE_COVER = `${BASE_URL}/covers/course-default.svg`;

// ============================================
// Helper Functions
// ============================================

/**
 * Get a random default avatar URL
 */
export const getRandomDefaultAvatar = (): string => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATAR_OPTIONS.length);
  return DEFAULT_AVATAR_OPTIONS[randomIndex].url;
};

/**
 * Get avatar URL, returns default if empty or invalid
 */
export const getAvatarUrl = (avatarUrl?: string): string => {
  if (!avatarUrl || avatarUrl.trim() === '') {
    return DEFAULT_AVATAR;
  }
  return avatarUrl;
};

/**
 * Get course cover URL, returns default if empty or invalid
 */
export const getCourseCoverUrl = (coverUrl?: string): string => {
  if (!coverUrl || coverUrl.trim() === '') {
    return DEFAULT_COURSE_COVER;
  }
  return coverUrl;
};
