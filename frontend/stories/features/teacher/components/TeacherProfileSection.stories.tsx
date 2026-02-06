import type { Meta, StoryObj } from '@storybook/react';
import { TeacherProfileSection } from '@/features/teacher/components';
import { MOCK_TEACHER_DATA } from '@/features/teacher/pages/TeacherDashboardPage/teacherDashboardData';
import React from 'react';

const meta: Meta<typeof TeacherProfileSection> = {
  title: 'Features/Teacher/Teacher Profile Section',
  component: TeacherProfileSection,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Teacher profile section with inline editing for teaching information.',
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
  decorators: [
    Story => (
      <div style={{ width: 800, minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TeacherProfileSection>;

export const ViewMode: Story = {
  name: 'View Mode',
  decorators: [
    () => {
      const [teacherData, setTeacherData] = React.useState(MOCK_TEACHER_DATA);
      return (
        <TeacherProfileSection
          teacher={teacherData}
          onSave={data => {
            console.log('Save profile:', data);
            setTeacherData(prev => ({ ...prev, ...data }));
          }}
        />
      );
    },
  ],
};

export const EditMode: Story = {
  name: 'Edit Mode',
  decorators: [
    () => {
      const [teacherData, setTeacherData] = React.useState(MOCK_TEACHER_DATA);
      return (
        <TeacherProfileSection
          teacher={teacherData}
          onSave={data => {
            console.log('Save profile:', data);
            setTeacherData(prev => ({ ...prev, ...data }));
          }}
        />
      );
    },
  ],
};

export const EmptyBio: Story = {
  name: 'Empty Bio',
  decorators: [
    () => {
      const [teacherData, setTeacherData] = React.useState({
        ...MOCK_TEACHER_DATA,
        bio: '',
      });
      return (
        <TeacherProfileSection
          teacher={teacherData}
          onSave={data => {
            console.log('Save profile:', data);
            setTeacherData(prev => ({ ...prev, ...data }));
          }}
        />
      );
    },
  ],
};

export const MultipleSubjects: Story = {
  name: 'Multiple Subjects',
  decorators: [
    () => {
      const [teacherData, setTeacherData] = React.useState({
        ...MOCK_TEACHER_DATA,
        subjects: ['math', 'physics', 'chemistry'],
      });
      return (
        <TeacherProfileSection
          teacher={teacherData}
          onSave={data => {
            console.log('Save profile:', data);
            setTeacherData(prev => ({ ...prev, ...data }));
          }}
        />
      );
    },
  ],
};
