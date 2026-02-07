// Storybook data override support for TeacherDashboardPage
import type {
  TeacherData,
  TeacherCourse,
  TeacherStudent,
  RevenueData,
} from './teacherDashboardData';

let storybookTeacherData: TeacherData | null = null;
let storybookCoursesData: ReadonlyArray<TeacherCourse> | null = null;
let storybookStudentsData: ReadonlyArray<TeacherStudent> | null = null;
let storybookRevenueData: RevenueData | null = null;

export const setStorybookTeacherData = (data: TeacherData) => {
  storybookTeacherData = data;
};

export const setStorybookCoursesData = (data: ReadonlyArray<TeacherCourse>) => {
  storybookCoursesData = data;
};

export const setStorybookStudentsData = (data: ReadonlyArray<TeacherStudent>) => {
  storybookStudentsData = data;
};

export const setStorybookRevenueData = (data: RevenueData) => {
  storybookRevenueData = data;
};

export const setStorybookData = (data: {
  teacher?: TeacherData;
  courses?: ReadonlyArray<TeacherCourse>;
  students?: ReadonlyArray<TeacherStudent>;
  revenue?: RevenueData;
}) => {
  if (data.teacher) storybookTeacherData = data.teacher;
  if (data.courses) storybookCoursesData = data.courses;
  if (data.students) storybookStudentsData = data.students;
  if (data.revenue) storybookRevenueData = data.revenue;
};

export const clearStorybookTeacherData = () => {
  storybookTeacherData = null;
  storybookCoursesData = null;
  storybookStudentsData = null;
  storybookRevenueData = null;
};

export const getStorybookTeacherData = () => storybookTeacherData;
export const getStorybookCoursesData = () => storybookCoursesData;
export const getStorybookStudentsData = () => storybookStudentsData;
export const getStorybookRevenueData = () => storybookRevenueData;
