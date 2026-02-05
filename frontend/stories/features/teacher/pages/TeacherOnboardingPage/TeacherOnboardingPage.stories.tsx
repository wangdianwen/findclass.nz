import type { Meta, StoryObj } from '@storybook/react';
import TeacherOnboardingPage from '@/features/teacher/pages/TeacherOnboardingPage';

const meta: Meta<typeof TeacherOnboardingPage> = {
  title: 'Features/Teacher/Teacher Onboarding',
  component: TeacherOnboardingPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Teacher onboarding page with stepper UI for submitting teacher application.',
      },
    },
    reactRouter: {
      routePath: '/teacher/onboarding',
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['teacher'],
    },
  },
  tags: ['autodocs', 'a11y'],
  decorators: [
    Story => (
      <div style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicInfoStep: Story = {
  name: 'Step 1 - Basic Info',
  args: {
    initialStep: 0,
    initialApplication: {
      name: '李老师',
      subjects: ['chinese', 'math'],
      experience: 5,
      education: 'bachelor',
      university: '北京师范大学',
      bio: '我是一名有丰富教学经验的数学和语文老师，擅长帮助学生建立学习兴趣和自信心。',
    },
  },
};

export const TeachingEvidenceStep: Story = {
  name: 'Step 2 - Teaching Evidence',
  args: {
    initialStep: 1,
    initialApplication: {
      name: '李老师',
      subjects: ['chinese', 'math'],
      experience: 5,
      education: 'bachelor',
      university: '北京师范大学',
      bio: '我是一名有丰富教学经验的数学和语文老师，擅长帮助学生建立学习兴趣和自信心。',
    },
    initialEvidence: [
      { id: '1', type: 'teachingPhotos', name: 'classroom-photo.jpg', value: 'blob:photo1' },
      { id: '2', type: 'introLetter', name: 'introduction.pdf', value: 'blob:letter' },
    ],
  },
};

export const ReviewStep: Story = {
  name: 'Step 3 - Review',
  args: {
    initialStep: 2,
    initialApplication: {
      name: '李老师',
      subjects: ['chinese', 'math'],
      experience: 5,
      education: 'bachelor',
      university: '北京师范大学',
      bio: '我是一名有丰富教学经验的数学和语文老师，擅长帮助学生建立学习兴趣和自信心。',
    },
    initialEvidence: [
      { id: '1', type: 'teachingPhotos', name: 'classroom-photo.jpg', value: 'blob:photo1' },
      { id: '2', type: 'introLetter', name: 'introduction.pdf', value: 'blob:letter' },
    ],
  },
};

export const ApplicationStatusPending: Story = {
  name: 'Step 4 - Application Status (Pending)',
  args: {
    initialStep: 3,
    initialStatus: 'pending',
    initialApplication: {
      name: '李老师',
      subjects: ['chinese', 'math'],
      experience: 5,
      education: 'bachelor',
      university: '北京师范大学',
      bio: '我是一名有丰富教学经验的数学和语文老师，擅长帮助学生建立学习兴趣和自信心。',
    },
    initialEvidence: [
      { id: '1', type: 'teachingPhotos', name: 'classroom-photo.jpg', value: 'blob:photo1' },
      { id: '2', type: 'introLetter', name: 'introduction.pdf', value: 'blob:letter' },
    ],
  },
};

export const ApplicationStatusApproved: Story = {
  name: 'Step 4 - Application Status (Approved)',
  args: {
    initialStep: 3,
    initialStatus: 'approved',
    initialApplication: {
      name: '李老师',
      subjects: ['chinese', 'math'],
      experience: 5,
      education: 'bachelor',
      university: '北京师范大学',
      bio: '我是一名有丰富教学经验的数学和语文老师，擅长帮助学生建立学习兴趣和自信心。',
    },
    initialEvidence: [
      { id: '1', type: 'teachingPhotos', name: 'classroom-photo.jpg', value: 'blob:photo1' },
      { id: '2', type: 'introLetter', name: 'introduction.pdf', value: 'blob:letter' },
    ],
  },
};

export const ApplicationStatusRejected: Story = {
  name: 'Step 4 - Application Status (Rejected)',
  args: {
    initialStep: 3,
    initialStatus: 'rejected',
    initialApplication: {
      name: '李老师',
      subjects: ['chinese', 'math'],
      experience: 5,
      education: 'bachelor',
      university: '北京师范大学',
      bio: '我是一名有丰富教学经验的数学和语文老师，擅长帮助学生建立学习兴趣和自信心。',
    },
    initialEvidence: [
      { id: '1', type: 'teachingPhotos', name: 'classroom-photo.jpg', value: 'blob:photo1' },
      { id: '2', type: 'introLetter', name: 'introduction.pdf', value: 'blob:letter' },
    ],
  },
};
