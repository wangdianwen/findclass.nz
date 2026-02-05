import type { Meta, StoryObj } from '@storybook/react';
import TeacherDashboardPage from '@/features/teacher/pages/TeacherDashboardPage';
import {
  MOCK_TEACHER_DATA,
  MOCK_TEACHER_COURSES,
  MOCK_TEACHER_STUDENTS,
  MOCK_REVENUE_DATA,
} from '@/features/teacher/pages/TeacherDashboardPage/teacherDashboardData';
import {
  setStorybookData,
  clearStorybookTeacherData,
} from '@/features/teacher/pages/TeacherDashboardPage/teacherStorybookData';
import type { TeacherCourse } from '@/features/teacher/components/teacherData';

interface StorybookArgs {
  initialMode?: 'list' | 'form';
}

// Create 5 published courses to reach the limit
const COURSES_AT_LIMIT: TeacherCourse[] = [
  {
    id: 'c1',
    title: '高中数学提高班',
    subtitle: '系统梳理高中数学知识点',
    subject: 'math',
    grade: 'highSchool',
    teachingMode: 'offline',
    city: 'auckland',
    region: 'Auckland CBD',
    lessonCount: 12,
    price: 50,
    description: '针对新西兰NCEA数学考试的系统辅导',
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
    title: '物理基础班',
    subtitle: '打好物理基础',
    subject: 'physics',
    grade: 'highSchool',
    teachingMode: 'offline',
    city: 'auckland',
    region: 'Newmarket',
    lessonCount: 8,
    price: 45,
    description: '打好物理基础，为高考做准备',
    languages: ['chinese'],
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    coverImages: ['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'],
    studentCount: 2,
    rating: 4.8,
    reviewCount: 5,
    status: 'published',
    createdAt: '2026-01-08',
    updatedAt: '2026-01-20',
  },
  {
    id: 'c4',
    title: '化学提高班',
    subtitle: '化学难点突破',
    subject: 'chemistry',
    grade: 'highSchool',
    teachingMode: 'online',
    lessonCount: 10,
    price: 55,
    description: '突破化学难点，提高成绩',
    languages: ['chinese'],
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    coverImages: ['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'],
    studentCount: 4,
    rating: 4.7,
    reviewCount: 6,
    status: 'published',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-22',
  },
  {
    id: 'c5',
    title: '数学竞赛班',
    subtitle: '数学竞赛技巧',
    subject: 'math',
    grade: 'highSchool',
    teachingMode: 'online',
    lessonCount: 15,
    price: 80,
    description: '数学竞赛技巧和训练',
    languages: ['chinese'],
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    coverImages: ['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'],
    studentCount: 1,
    rating: 5.0,
    reviewCount: 2,
    status: 'published',
    createdAt: '2026-01-12',
    updatedAt: '2026-01-25',
  },
];

const meta: Meta<typeof TeacherDashboardPage> = {
  title: 'Features/Teacher/Teacher Dashboard',
  component: TeacherDashboardPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Teacher dashboard page for personal teachers to manage courses and students.',
      },
    },
    reactRouter: {
      routePath: '/teacher/dashboard',
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['teacher', 'courseManagement'],
    },
  },
  tags: ['autodocs', 'a11y'],
  argTypes: {
    initialMode: {
      control: 'select',
      options: ['list', 'form'],
    },
  },
  decorators: [
    Story => (
      <div style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<StorybookArgs>;

export const Default: Story = {
  name: 'Overview',
  decorators: [
    () => {
      clearStorybookTeacherData();
      setStorybookData({
        teacher: MOCK_TEACHER_DATA,
        courses: MOCK_TEACHER_COURSES,
        students: MOCK_TEACHER_STUDENTS,
        revenue: MOCK_REVENUE_DATA,
      });
      return <TeacherDashboardPage />;
    },
  ],
};

export const NoCourses: Story = {
  name: 'No Courses',
  decorators: [
    () => {
      clearStorybookTeacherData();
      setStorybookData({
        teacher: MOCK_TEACHER_DATA,
        courses: [],
        students: MOCK_TEACHER_STUDENTS,
        revenue: MOCK_REVENUE_DATA,
      });
      return <TeacherDashboardPage />;
    },
  ],
};

export const PublishedCoursesLimit: Story = {
  name: 'Published Courses Limit (5/5)',
  decorators: [
    () => {
      clearStorybookTeacherData();
      setStorybookData({
        teacher: MOCK_TEACHER_DATA,
        courses: COURSES_AT_LIMIT,
        students: MOCK_TEACHER_STUDENTS,
        revenue: MOCK_REVENUE_DATA,
      });
      return <TeacherDashboardPage />;
    },
  ],
};
