// ============================================
// Teacher Dashboard Mock Data
// ============================================

// Import shared types from components
import type {
  TeacherCourse,
  CourseStats,
  CourseStatus,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  TEACHING_MODE_OPTIONS,
  LANGUAGE_OPTIONS,
} from '@/features/teacher/components/teacherData';

// Import constant value separately
import { MAX_ACTIVE_COURSES } from '@/features/teacher/components/teacherData';

// Re-export for convenience
export {
  CourseStats,
  CourseStatus,
  MAX_ACTIVE_COURSES,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  TEACHING_MODE_OPTIONS,
  LANGUAGE_OPTIONS,
};

// Re-export TeacherCourse type
export type { TeacherCourse };

// Teacher profile data
export interface TeacherData {
  id: string;
  name: string;
  email: string;
  phone: string;
  wechat?: string;
  avatar?: string;
  subjects: string[];
  bio: string;
  experience: number;
  rating: number;
  verified: boolean;
}

// Teacher student data
export interface TeacherStudent {
  id: string;
  name: string;
  contact: string; // Desensitized
  courses: string[];
  joinedAt: string;
  lastActive?: string;
}

// Revenue data
export interface RevenueData {
  monthly: number;
  total: number;
  hoursThisMonth: number;
  avgRating: number;
  transactions: Array<{
    id: string;
    student: string;
    course: string;
    amount: number;
    date: string;
  }>;
}

// Mock teacher data
export const MOCK_TEACHER_DATA: TeacherData = {
  id: 't1',
  name: '张老师',
  email: 'teacher@example.com',
  phone: '021-123-4567',
  wechat: 'zhangteacher',
  subjects: ['math', 'physics'],
  bio: '重点高中数学教师，5年教学经验，擅长高考辅导和数学思维训练',
  experience: 5,
  rating: 4.9,
  verified: true,
};

// Mock courses data
export const MOCK_TEACHER_COURSES: TeacherCourse[] = [
  {
    id: 'c1',
    title: '高中数学提高班',
    subtitle: '系统梳理高中数学知识点',
    subject: 'math',
    grade: 'highSchool',
    teachingMode: 'offline',
    city: 'auckland',
    region: 'Auckland CBD',
    showAddress: true,
    lessonCount: 12,
    price: 50,
    description:
      '<p>本课程针对新西兰<strong>NCEA数学考试</strong>进行系统辅导，帮助学生全面掌握高中数学知识点。</p><p>课程特点：</p><ul><li>名师授课，10年教学经验</li><li>小班教学，因材施教</li><li>配套练习，巩固提高</li></ul><p>适合准备参加NCEA Level 1/2/3数学考试的学生。</p>',
    languages: ['chinese'],
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    coverImages: ['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'],
    studentCount: 5,
    rating: 4.9,
    reviewCount: 12,
    status: 'published',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-15',
  },
  {
    id: 'c2',
    title: '高考数学冲刺',
    subtitle: '高考数学满分攻略',
    subject: 'math',
    grade: 'highSchool',
    teachingMode: 'online',
    showAddress: false,
    lessonCount: 10,
    price: 60,
    description: '针对高考数学的冲刺课程',
    languages: ['chinese'],
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    coverImages: ['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'],
    studentCount: 3,
    rating: 5.0,
    reviewCount: 8,
    status: 'published',
    createdAt: '2026-01-05',
    updatedAt: '2026-01-18',
  },
  {
    id: 'c3',
    title: '数学思维训练',
    subtitle: '培养数学逻辑思维',
    subject: 'math',
    grade: 'middleSchool',
    teachingMode: 'offline',
    city: 'auckland',
    region: 'Newmarket',
    showAddress: true,
    lessonCount: 8,
    price: 45,
    description: '培养学生的数学逻辑思维',
    languages: ['chinese'],
    studentCount: 0,
    rating: 0,
    reviewCount: 0,
    status: 'draft',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-10',
  },
];

// Mock students data
export const MOCK_TEACHER_STUDENTS: TeacherStudent[] = [
  {
    id: 's1',
    name: '张三',
    contact: '021-***-4567',
    courses: ['高中数学提高班'],
    joinedAt: '2026-01-15',
    lastActive: '2026-01-28',
  },
  {
    id: 's2',
    name: '李四',
    contact: '微信 ***',
    courses: ['高考数学冲刺'],
    joinedAt: '2026-01-10',
    lastActive: '2026-01-27',
  },
  {
    id: 's3',
    name: '王五',
    contact: '邮箱 ***',
    courses: ['高中数学提高班', '高考数学冲刺'],
    joinedAt: '2026-01-08',
    lastActive: '2026-01-26',
  },
];

// Mock revenue data
export const MOCK_REVENUE_DATA: RevenueData = {
  monthly: 2400,
  total: 12000,
  hoursThisMonth: 48,
  avgRating: 4.9,
  transactions: [
    {
      id: 't1',
      student: '张三',
      course: '高中数学提高班',
      amount: 500,
      date: '2026-01-28',
    },
    {
      id: 't2',
      student: '李四',
      course: '高考数学冲刺',
      amount: 600,
      date: '2026-01-27',
    },
    {
      id: 't3',
      student: '王五',
      course: '高中数学提高班',
      amount: 500,
      date: '2026-01-25',
    },
  ],
};
