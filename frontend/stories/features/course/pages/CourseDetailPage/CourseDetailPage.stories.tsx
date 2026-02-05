import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useEffect } from 'react';
import CourseDetailPage from '@/features/course/pages/CourseDetailPage';
import {
  setStorybookCourseData,
  setStorybookSimilarCoursesData,
  clearStorybookCourseData,
} from '@/features/course/pages/CourseDetailPage/courseStorybookData';
import {
  MOCK_COURSE_DETAIL,
  MOCK_COURSE_WECHAT_ID_ONLY,
  MOCK_SIMILAR_COURSES,
} from '@/data/courseDetail';
import { useUserStore } from '@/stores/userStore';

const CleanupWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    return () => {
      clearStorybookCourseData();
      // Also clear user store to prevent state leaking between tests
      useUserStore.setState({
        user: null,
        isLoggedIn: false,
      });
    };
  }, []);
  return <>{children}</>;
};

const meta = {
  title: 'Features/Course/Course Detail',
  component: CourseDetailPage,
  tags: ['autodocs', 'a11y'],
  parameters: {
    docs: {
      description: {
        component:
          'Course detail page displaying complete course information including description, teacher info, and similar course recommendations.',
      },
    },
    layout: 'fullscreen',
    reactRouter: {
      routePath: '/courses/:id',
      routeParams: { id: '1' },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['search'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [
          { id: 'color-contrast', enabled: false },
          { id: 'aria-input-field-name', enabled: false },
        ],
      },
    },
  },
  args: {
    // Route params are handled by reactRouter parameter
  },
} satisfies Meta<typeof CourseDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// Decorators for storybook data
// ============================================

const withCourseData = (
  courseData: typeof MOCK_COURSE_DETAIL,
  similarCourses: typeof MOCK_SIMILAR_COURSES = MOCK_SIMILAR_COURSES
) => {
  return (Story: React.ComponentType) => {
    // Clear any previous data and set new data
    clearStorybookCourseData();
    setStorybookCourseData(courseData);
    setStorybookSimilarCoursesData(similarCourses);
    return (
      <CleanupWrapper>
        <Story />
      </CleanupWrapper>
    );
  };
};

// ============================================
// Stories
// ============================================

export const Default: Story = {
  decorators: [withCourseData(MOCK_COURSE_DETAIL)],
};

export const WithDifferentCourse: Story = {
  parameters: {
    reactRouter: {
      routePath: '/courses/:id',
      routeParams: { id: '2' },
    },
  },
};

export const FavoriteInteraction: Story = {
  decorators: [withCourseData(MOCK_COURSE_DETAIL)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find and click the save button using data-testid
    const saveButton = canvas.getByTestId('save-button');
    await userEvent.click(saveButton);
    await expect(canvas.getByTestId('save-button')).toHaveTextContent(/saved/i);
  },
};

// ============================================
// Contact Feature Stories
// ============================================

export const WithWeChat: Story = {
  name: 'With WeChat Contact',
  decorators: [withCourseData(MOCK_COURSE_WECHAT_ID_ONLY)],
  parameters: {
    docs: {
      description: {
        story: 'Course detail page with WeChat contact information displayed.',
      },
    },
  },
};

// ============================================
// Contact Feature Stories
// ============================================

// Mock logged in user
const MockLoggedInUser = () => {
  useEffect(() => {
    // Clear any existing state first, then set logged in user
    useUserStore.setState({
      user: {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
        role: 'student',
        isTeacher: false,
        teacherInfo: null,
        createdAt: '2024-01-01T00:00:00Z',
      },
      isLoggedIn: true,
    });
    return () => {
      // Clear user on cleanup
      useUserStore.setState({
        user: null,
        isLoggedIn: false,
      });
    };
  }, []);
  return null;
};

// Mock logged out user
const MockLoggedOutUser = () => {
  useEffect(() => {
    // Clear any existing state first, then set user as logged out
    useUserStore.setState({
      user: null,
      isLoggedIn: false,
    });
    return () => {
      useUserStore.setState({
        user: null,
        isLoggedIn: false,
      });
    };
  }, []);
  return null;
};

const withLoggedInUser = (Story: React.ComponentType) => {
  return (
    <>
      <MockLoggedInUser />
      <CleanupWrapper>
        <Story />
      </CleanupWrapper>
    </>
  );
};

const withLoggedOutUser = (Story: React.ComponentType) => {
  return (
    <>
      <MockLoggedOutUser />
      <CleanupWrapper>
        <Story />
      </CleanupWrapper>
    </>
  );
};

export const ContactAsLoggedInUser: Story = {
  name: 'Contact - Logged In User',
  decorators: [withCourseData(MOCK_COURSE_DETAIL), withLoggedInUser],
  parameters: {
    docs: {
      description: {
        story:
          'Logged in user clicks "Contact Now" and a contact form modal appears for sending inquiry to the tutor.',
      },
    },
  },
};

export const ContactAsLoggedOutUser: Story = {
  name: 'Contact - Logged Out User',
  decorators: [withCourseData(MOCK_COURSE_DETAIL), withLoggedOutUser],
  parameters: {
    docs: {
      description: {
        story:
          'Logged out user clicks "Contact Now" and a login prompt modal appears, encouraging them to log in first.',
      },
    },
  },
};

// ============================================
// Reviews Tab Story
// ============================================

// Decorator that sets the default tab to 'reviews' for Storybook
const WithReviewsTabDecorator = (Story: React.ComponentType<{ defaultTab?: string }>) => {
  // Set storybook data before rendering
  useEffect(() => {
    clearStorybookCourseData();
    setStorybookCourseData(MOCK_COURSE_DETAIL);
    setStorybookSimilarCoursesData(MOCK_SIMILAR_COURSES);
  }, []);

  return (
    <CleanupWrapper>
      <Story defaultTab="reviews" />
    </CleanupWrapper>
  );
};

export const WithReviewsTab: Story = {
  name: 'With Reviews Tab',
  decorators: [WithReviewsTabDecorator],
  parameters: {
    docs: {
      description: {
        story: 'Course detail page with Reviews tab selected to display reviews section.',
      },
    },
  },
};
