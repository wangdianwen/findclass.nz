import type { Meta, StoryObj } from '@storybook/react';
import { FeaturedCoursesSection } from '@/features/home/pages/HomePage/sections/FeaturedCoursesSection';

const meta = {
  title: 'Features/Home/FeaturedCoursesSection',
  component: FeaturedCoursesSection,
  tags: ['autodocs', 'a11y'],
  decorators: [
    Story => (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Featured courses section displaying a grid of featured courses with "view all" link. Receives data via props from HomePage.',
      },
    },
    layout: 'centered',
    i18n: {
      locale: 'en',
      loadNamespaces: ['home'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  args: {
    courses: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '高中数学提高班',
        price: 120,
        lessonCount: 12,
        lessonDuration: 90,
        rating: 4.8,
        reviewCount: 128,
        city: '奥克兰',
        region: '中区',
        subject: '数学',
        grade: '高中',
        teacherName: '张老师',
        trustLevel: 'S' as const,
        teachingMode: 'online' as const,
        language: '中文授课',
        schedule: '周末班',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: '物理基础班',
        price: 100,
        lessonCount: 10,
        lessonDuration: 90,
        rating: 4.6,
        reviewCount: 86,
        city: '奥克兰',
        region: '东区',
        subject: '物理',
        grade: '初中',
        teacherName: '李老师',
        trustLevel: 'A' as const,
        teachingMode: 'offline' as const,
        language: '中文授课',
        schedule: '工作日晚',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: '化学竞赛辅导',
        price: 150,
        lessonCount: 16,
        lessonDuration: 120,
        rating: 4.9,
        reviewCount: 52,
        city: '奥克兰',
        region: '北岸',
        subject: '化学',
        grade: '高中',
        teacherName: '王老师',
        trustLevel: 'S' as const,
        teachingMode: 'online' as const,
        language: '中文授课',
        schedule: '寒假集中',
      },
    ],
  },
} satisfies Meta<typeof FeaturedCoursesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Stories
// ============================================

export const Default: Story = {
  name: 'Default View',
};

export const Loading: Story = {
  name: 'Loading State',
  args: {
    isLoading: true,
    courses: [],
  },
};

export const Empty: Story = {
  name: 'Empty State',
  args: {
    isLoading: false,
    courses: [],
  },
};

export const Error: Story = {
  name: 'Error State',
  args: {
    isLoading: false,
    courses: [],
  },
};

export const SingleCourse: Story = {
  name: 'Single Course',
  args: {
    courses: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '高中数学提高班',
        price: 120,
        lessonCount: 12,
        lessonDuration: 90,
        rating: 4.8,
        reviewCount: 128,
        city: '奥克兰',
        region: '中区',
        subject: '数学',
        grade: '高中',
        teacherName: '张老师',
        trustLevel: 'S' as const,
        teachingMode: 'online' as const,
        language: '中文授课',
        schedule: '周末班',
      },
    ],
  },
};
