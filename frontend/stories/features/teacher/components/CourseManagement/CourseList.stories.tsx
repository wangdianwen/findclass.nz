import type { Meta, StoryObj } from '@storybook/react';
import { CourseList } from '@/features/teacher/components/CourseList';
import type { TeacherCourse } from '@/features/teacher/components/teacherData';

const meta: Meta<typeof CourseList> = {
  title: 'Features/Teacher/Course Management/CourseList',
  component: CourseList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Course list with search, filter, and status management capabilities.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['courseManagement'],
    },
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ minHeight: '600px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock courses data
const mockCourses: TeacherCourse[] = [
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
    title: '物理基础班',
    subtitle: '打好物理基础',
    subject: 'physics',
    grade: 'highSchool',
    teachingMode: 'offline',
    city: 'auckland',
    region: 'Newmarket',
    showAddress: true,
    lessonCount: 8,
    price: 45,
    description: '打好物理基础，为高考做准备',
    languages: ['chinese'],
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
    showAddress: false,
    lessonCount: 10,
    price: 55,
    description: '突破化学难点，提高成绩',
    languages: ['chinese'],
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
    coverImages: ['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'],
    studentCount: 4,
    rating: 4.7,
    reviewCount: 6,
    status: 'paused',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-22',
  },
  {
    id: 'c5',
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

export const Default: Story = {
  name: 'Default',
  args: {
    courses: mockCourses,
    onCreateCourse: () => {
      console.log('Create course');
    },
    onEditCourse: course => {
      console.log('Edit:', course);
    },
    onPreviewCourse: course => {
      console.log('Preview:', course);
    },
    onPublishCourse: courseId => {
      console.log('Publish:', courseId);
    },
    onPauseCourse: courseId => {
      console.log('Pause:', courseId);
    },
    onDeleteCourse: courseId => {
      console.log('Delete:', courseId);
    },
  },
};

export const Empty: Story = {
  name: 'Empty State',
  args: {
    courses: [],
    onCreateCourse: () => {
      console.log('Create course');
    },
    onEditCourse: course => {
      console.log('Edit:', course);
    },
    onPreviewCourse: course => {
      console.log('Preview:', course);
    },
    onPublishCourse: courseId => {
      console.log('Publish:', courseId);
    },
    onPauseCourse: courseId => {
      console.log('Pause:', courseId);
    },
    onDeleteCourse: courseId => {
      console.log('Delete:', courseId);
    },
  },
};

export const OnlyPublished: Story = {
  name: 'Published Only (Filtered)',
  args: {
    courses: mockCourses.filter(c => c.status === 'published'),
    onCreateCourse: () => {
      console.log('Create course');
    },
    onEditCourse: course => {
      console.log('Edit:', course);
    },
    onPreviewCourse: course => {
      console.log('Preview:', course);
    },
    onPublishCourse: courseId => {
      console.log('Publish:', courseId);
    },
    onPauseCourse: courseId => {
      console.log('Pause:', courseId);
    },
    onDeleteCourse: courseId => {
      console.log('Delete:', courseId);
    },
  },
};

export const OnlyDrafts: Story = {
  name: 'Drafts Only (Filtered)',
  args: {
    courses: mockCourses.filter(c => c.status === 'draft'),
    onCreateCourse: () => {
      console.log('Create course');
    },
    onEditCourse: course => {
      console.log('Edit:', course);
    },
    onPreviewCourse: course => {
      console.log('Preview:', course);
    },
    onPublishCourse: courseId => {
      console.log('Publish:', courseId);
    },
    onPauseCourse: courseId => {
      console.log('Pause:', courseId);
    },
    onDeleteCourse: courseId => {
      console.log('Delete:', courseId);
    },
  },
};

export const OnlyPaused: Story = {
  name: 'Paused Only (Filtered)',
  args: {
    courses: mockCourses.filter(c => c.status === 'paused'),
    onCreateCourse: () => {
      console.log('Create course');
    },
    onEditCourse: course => {
      console.log('Edit:', course);
    },
    onPreviewCourse: course => {
      console.log('Preview:', course);
    },
    onPublishCourse: courseId => {
      console.log('Publish:', courseId);
    },
    onPauseCourse: courseId => {
      console.log('Pause:', courseId);
    },
    onDeleteCourse: courseId => {
      console.log('Delete:', courseId);
    },
  },
};
