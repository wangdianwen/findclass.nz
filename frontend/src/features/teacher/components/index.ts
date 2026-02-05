// Teacher Components Index
// Re-export shared components for Teacher features

export { CourseList } from './CourseList';
export { CourseStats } from './CourseStats';
export { CourseForm, type CourseFormValues } from './CourseForm';
export { TeacherProfileSection } from './TeacherProfileSection';
export { TeacherRepliesSection } from './TeacherRepliesSection';

// Re-export types from teacherData
export type {
  TeacherCourse,
  CourseStats as CourseStatsType,
  CourseStatus,
  MAX_ACTIVE_COURSES,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  TEACHING_MODE_OPTIONS,
  LANGUAGE_OPTIONS,
} from './teacherData';
