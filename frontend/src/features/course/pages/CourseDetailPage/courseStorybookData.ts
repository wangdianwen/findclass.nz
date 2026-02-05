// Storybook data override support for CourseDetailPage
// This file contains functions for Storybook to set mock data
import type { CourseDetail } from '@/types/courseDetail';
import type { SimilarCourse } from '@/types/courseDetail';

let storybookCourseData: CourseDetail | null = null;
let storybookSimilarCoursesData: SimilarCourse[] | null = null;

export const setStorybookCourseData = (data: CourseDetail) => {
  storybookCourseData = data;
};

export const setStorybookSimilarCoursesData = (data: SimilarCourse[]) => {
  storybookSimilarCoursesData = data;
};

export const clearStorybookCourseData = () => {
  storybookCourseData = null;
  storybookSimilarCoursesData = null;
};

export const getStorybookCourseData = () => storybookCourseData;
export const getStorybookSimilarCoursesData = () => storybookSimilarCoursesData;
