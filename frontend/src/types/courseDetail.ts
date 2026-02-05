// Course detail page types
// Based on product design spec: /Users/dianwenwang/Project/findclass.nz/docs-product/course/course-detail.md

// Trust level types
export type TrustLevel = 'S' | 'A' | 'B' | 'C' | 'D';

// Teaching mode types
export type TeachingMode = 'online' | 'offline' | 'bilingual';

// Language types
export type CourseLanguage = 'chinese' | 'english' | 'bilingual';

// Schedule info
export interface CourseSchedule {
  days: string[];
  timeSlots: string[];
  duration: number; // duration in minutes
  location: string; // City + Region
  address?: string; // Specific address, shown when showAddress is true
  showAddress?: boolean; // Whether to show the specific address
}

// Teacher info
export interface CourseTeacher {
  id: string;
  name: string;
  title?: string;
  bio: string;
  avatar?: string;
  verified: boolean;
  teachingYears?: number;
  qualifications?: string[];
}

// Desensitized contact info
export interface CourseContact {
  phone?: string;
  wechat?: string;
  email?: string;
  wechatQrcode?: string;
  // Privacy settings - showWechat: true shows QR code, false shows masked ID
  showPhone?: boolean;
  showWechat?: boolean;
  showEmail?: boolean;
}

// User interaction status
export interface CourseUserInteraction {
  isFavorited: boolean;
  isCompared: boolean;
}

// Course detail data
export interface CourseDetail {
  // Basic info
  id: string;
  title: string;
  description: string;
  price: number; // 每节课价格
  lessonCount: number; // 总课时数
  originalPrice?: number; // 原价（如果有折扣）

  // Rating
  rating: number;
  reviewCount: number;

  // Trust info
  trustLevel: TrustLevel;
  dataSource: 'first_party' | 'gumtree' | 'facebook' | 'other';
  sourceWeight: number;
  publishedAt: string;
  updatedAt: string;

  // Category info
  subject: string;
  grade: string[];
  teachingMode: TeachingMode;
  language: CourseLanguage;

  // Schedule
  schedule: CourseSchedule;

  // Teacher
  teacher: CourseTeacher;

  // Contact (desensitized)
  contact: CourseContact;

  // Tags
  tags: string[];

  // User interaction
  userInteraction?: CourseUserInteraction;

  // Images
  images?: string[];
}

// Tab types for course detail
export type CourseDetailTab = 'about' | 'teacher' | 'reviews';

// Similar course (for recommendations)
export interface SimilarCourse {
  id: string;
  title: string;
  price: number;
  lessonCount: number;
  rating: number;
  reviewCount: number;
  trustLevel: TrustLevel;
  subject: string;
  region: string;
  teachingMode: TeachingMode;
}
