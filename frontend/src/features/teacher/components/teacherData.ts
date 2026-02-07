// Shared types and mock data for Teacher components
// This data is used across TeacherDashboard and CourseManagement features

export type CourseStatus = 'published' | 'draft' | 'paused';

export interface TeacherCourse {
  id: string;
  title: string;
  subtitle?: string;
  subject: string;
  grade: string;
  teachingMode: 'online' | 'offline' | 'both';
  city?: string;
  region?: string;
  address?: string; // Specific address, shown when showAddress is true
  showAddress?: boolean; // Whether to show address on course details (default: false)
  lessonCount: number;
  price: number;
  description: string;
  languages: string[];
  coverImage?: string;
  coverImages?: string[];
  status: CourseStatus;
  rating: number;
  reviewCount: number;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  pausedCourses: number;
  totalStudents?: number;
  totalLessons?: number;
  avgRating?: number;
}

// Configurable: Maximum number of active (published) courses
export const MAX_ACTIVE_COURSES = 5;

// Subject options
export const SUBJECT_OPTIONS = [
  { value: 'chinese', label: 'subject.chinese' },
  { value: 'math', label: 'subject.math' },
  { value: 'english', label: 'subject.english' },
  { value: 'physics', label: 'subject.physics' },
  { value: 'chemistry', label: 'subject.chemistry' },
  { value: 'biology', label: 'subject.biology' },
  { value: 'science', label: 'subject.science' },
  { value: 'geography', label: 'subject.geography' },
  { value: 'history', label: 'subject.history' },
  { value: 'civics', label: 'subject.civics' },
  { value: 'music', label: 'subject.music' },
  { value: 'art', label: 'subject.art' },
  { value: 'pe', label: 'subject.pe' },
  { value: 'it', label: 'subject.it' },
  { value: 'other', label: 'subject.other' },
];

// Grade options
export const GRADE_OPTIONS = [
  { value: 'preschool', label: 'grade.preschool' },
  { value: 'primaryLow', label: 'grade.primaryLow' },
  { value: 'primaryHigh', label: 'grade.primaryHigh' },
  { value: 'middleSchool', label: 'grade.middleSchool' },
  { value: 'highSchool', label: 'grade.highSchool' },
  { value: 'adult', label: 'grade.adult' },
];

// Teaching mode options
export const TEACHING_MODE_OPTIONS = [
  { value: 'online', label: 'teachingMode.online' },
  { value: 'offline', label: 'teachingMode.offline' },
  { value: 'both', label: 'teachingMode.both' },
];

// Language options - imported from unified config
export { TEACHING_LANGUAGES as LANGUAGE_OPTIONS } from '@/config';

// City options
export const CITY_OPTIONS = [
  { value: 'auckland', label: 'filter.city.auckland' },
  { value: 'wellington', label: 'filter.city.wellington' },
  { value: 'christchurch', label: 'filter.city.christchurch' },
];
