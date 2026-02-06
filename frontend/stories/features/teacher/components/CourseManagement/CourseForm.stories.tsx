import type { Meta, StoryObj } from '@storybook/react';
import { CourseForm } from '@/features/teacher/components/CourseForm';
import type { TeacherCourse } from '@/features/teacher/components/teacherData';

const meta: Meta<typeof CourseForm> = {
  title: 'Features/Teacher/Course Management/CourseForm',
  component: CourseForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Course creation and editing form with address visibility toggle.',
      },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['courseManagement'],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    loading: {
      control: 'boolean',
    },
    course: {
      control: 'object',
    },
  },
  decorators: [
    Story => (
      <div style={{ width: '800px', minHeight: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default course for editing
const defaultCourse: TeacherCourse = {
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
  status: 'published',
  rating: 4.9,
  reviewCount: 12,
  studentCount: 5,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-15',
};

export const CreateNew: Story = {
  name: 'Create New Course',
  args: {
    course: null,
    onSubmit: values => {
      console.log('Submit:', values);
    },
    onCancel: () => {
      console.log('Cancel');
    },
    loading: false,
  },
};

export const EditCourse: Story = {
  name: 'Edit Existing Course',
  args: {
    course: defaultCourse,
    onSubmit: values => {
      console.log('Submit:', values);
    },
    onCancel: () => {
      console.log('Cancel');
    },
    loading: false,
  },
};

export const EditWithAddressHidden: Story = {
  name: 'Edit - Address Hidden',
  args: {
    course: { ...defaultCourse, showAddress: false },
    onSubmit: values => {
      console.log('Submit:', values);
    },
    onCancel: () => {
      console.log('Cancel');
    },
    loading: false,
  },
};

export const WithDraftCourse: Story = {
  name: 'Edit Draft Course',
  args: {
    course: {
      ...defaultCourse,
      id: 'c2',
      title: '数学思维训练',
      subtitle: '培养数学逻辑思维',
      status: 'draft',
      showAddress: false,
    },
    onSubmit: values => {
      console.log('Submit:', values);
    },
    onCancel: () => {
      console.log('Cancel');
    },
    loading: false,
  },
};

export const Loading: Story = {
  name: 'Loading State',
  args: {
    course: null,
    onSubmit: values => {
      console.log('Submit:', values);
    },
    onCancel: () => {
      console.log('Cancel');
    },
    loading: true,
  },
};
