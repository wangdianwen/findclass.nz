import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Button, Table, Modal, message } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  DollarOutlined,
  StarOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/shared';
import { Footer } from '@/components/shared';
import { useUserStore } from '@/stores/userStore';
import {
  MOCK_TEACHER_DATA,
  MOCK_TEACHER_COURSES,
  MOCK_TEACHER_STUDENTS,
  MOCK_REVENUE_DATA,
  TeacherData,
  TeacherCourse,
  TeacherStudent,
  RevenueData,
} from './teacherDashboardData';
import {
  CourseList,
  CourseStats,
  CourseForm,
  CourseFormValues,
  TeacherProfileSection,
  TeacherRepliesSection,
} from '@/features/teacher/components';
import styles from './TeacherDashboard.module.scss';

// ============================================
// Types
// ============================================

type ActiveTab = 'profile' | 'courses' | 'students' | 'revenue' | 'replies';
type ViewMode = 'list' | 'form';

// Storybook data type
type StorybookDataModule = {
  getStorybookTeacherData: () => TeacherData | null;
  getStorybookCoursesData: () => ReadonlyArray<TeacherCourse> | null;
  getStorybookStudentsData: () => ReadonlyArray<TeacherStudent> | null;
  getStorybookRevenueData: () => RevenueData | null;
  clearStorybookTeacherData: () => void;
};

// ============================================
// Components
// ============================================

// Stats Cards Component
const StatsCards: React.FC<{
  courses: TeacherCourse[];
  students: TeacherStudent[];
  revenue: RevenueData;
}> = ({ courses, students, revenue }) => {
  const { t } = useTranslation(['teacher', 'courseManagement']);

  const stats = [
    {
      icon: <BookOutlined />,
      label: t('teacherDashboard.stats.totalCourses'),
      value: courses.length,
      color: '#1890ff',
    },
    {
      icon: <TeamOutlined />,
      label: t('teacherDashboard.stats.totalStudents'),
      value: students.length,
      color: '#52c41a',
    },
    {
      icon: <DollarOutlined />,
      label: t('teacherDashboard.stats.monthlyRevenue'),
      value: `$${revenue.monthly}`,
      color: '#faad14',
    },
    {
      icon: <StarOutlined />,
      label: t('teacherDashboard.stats.avgRating'),
      value: revenue.avgRating,
      color: '#eb2f96',
    },
  ];

  return (
    <div className={styles.statsWrapper}>
      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <div
            key={index}
            className={styles.statCard}
            style={{ '--accent-color': stat.color } as React.CSSProperties}
          >
            <div className={styles.statIcon}>{stat.icon}</div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Students Section
const StudentsSection: React.FC<{ students: TeacherStudent[] }> = ({ students }) => {
  const { t } = useTranslation(['teacher', 'courseManagement']);

  const columns = [
    {
      title: t('teacherDashboard.students.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, _record: TeacherStudent) => (
        <div className={styles.studentCell}>
          <div className={styles.studentAvatar}>{name.charAt(0)}</div>
          <span>{name}</span>
        </div>
      ),
    },
    {
      title: t('teacherDashboard.students.contact'),
      dataIndex: 'contact',
      key: 'contact',
      render: (contact: string) => <span className={styles.desensitized}>{contact}</span>,
    },
    {
      title: t('teacherDashboard.students.courses'),
      dataIndex: 'courses',
      key: 'courses',
      render: (courses: string[]) => courses.join(', '),
    },
    {
      title: t('teacherDashboard.students.joined'),
      dataIndex: 'joinedAt',
      key: 'joinedAt',
    },
    {
      title: t('teacherDashboard.students.actions'),
      key: 'actions',
      render: () => (
        <Button size="small" type="link">
          {t('teacherDashboard.students.contact')}
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h3>{t('teacherDashboard.nav.students')}</h3>
        <Button icon={<ExportOutlined />}>{t('teacherDashboard.exportData')}</Button>
      </div>
      <Table columns={columns} dataSource={students} rowKey="id" pagination={{ pageSize: 10 }} />
    </div>
  );
};

// Revenue Section
const RevenueSection: React.FC<{ revenue: RevenueData }> = ({ revenue }) => {
  const { t } = useTranslation(['teacher', 'courseManagement']);

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h3>{t('teacherDashboard.nav.revenue')}</h3>
        <Button icon={<ExportOutlined />}>{t('teacherDashboard.exportData')}</Button>
      </div>

      <div className={styles.revenueOverview}>
        <div className={styles.revenueCard}>
          <span className={styles.revenueLabel}>{t('teacherDashboard.revenue.monthly')}</span>
          <span className={styles.revenueValue}>${revenue.monthly}</span>
        </div>
        <div className={styles.revenueCard}>
          <span className={styles.revenueLabel}>{t('teacherDashboard.revenue.total')}</span>
          <span className={styles.revenueValue}>${revenue.total}</span>
        </div>
        <div className={styles.revenueCard}>
          <span className={styles.revenueLabel}>{t('teacherDashboard.revenue.hours')}</span>
          <span className={styles.revenueValue}>{revenue.hoursThisMonth}</span>
        </div>
      </div>

      <div className={styles.revenueNotes}>
        <p className={styles.noteTitle}>{t('teacherDashboard.revenue.notes.title')}</p>
        <ul>
          <li>{t('teacherDashboard.revenue.notes.offline')}</li>
          <li>{t('teacherDashboard.revenue.notes.cash')}</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

interface TeacherDashboardPageProps {
  /** Initial view mode - for storybook and direct access */
  initialMode?: ViewMode;
}

export const TeacherDashboardPage: React.FC<TeacherDashboardPageProps> = ({
  initialMode = 'list',
}) => {
  const { t } = useTranslation(['teacher', 'courseManagement']);
  const navigate = useNavigate();
  const { isLoggedIn } = useUserStore();
  const isTeacher = useUserStore(state => state.user?.isTeacher ?? false);

  // Storybook data state - loaded asynchronously to support ESM
  const [storybookData, setStorybookData] = useState<StorybookDataModule | null>(null);

  // Load storybook data on mount
  useEffect(() => {
    // Check if we're in Storybook
    const isStorybook = typeof window !== 'undefined' && '__STORYBOOK__' in window;

    if (isStorybook) {
      import('./teacherStorybookData')
        .then(module => {
          setStorybookData(module);
        })
        .catch(() => {
          // Module not found, use defaults
        });
    }
  }, []);

  // Use storybook data if available, otherwise use mock data
  const [courses, setCourses] = useState<TeacherCourse[]>(() => {
    const data = storybookData?.getStorybookCoursesData();
    return data ? [...data] : [...MOCK_TEACHER_COURSES];
  });
  const [students] = useState<TeacherStudent[]>(() => {
    const data = storybookData?.getStorybookStudentsData();
    return data ? [...data] : [...MOCK_TEACHER_STUDENTS];
  });
  const [revenue] = useState<RevenueData>(
    () => storybookData?.getStorybookRevenueData() || MOCK_REVENUE_DATA
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('courses');
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [editingCourse, setEditingCourse] = useState<TeacherCourse | null>(null);
  const [previewCourse, setPreviewCourse] = useState<TeacherCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData>(
    () => storybookData?.getStorybookTeacherData() || MOCK_TEACHER_DATA
  );

  // Clear storybook data on unmount
  useEffect(() => {
    return () => {
      storybookData?.clearStorybookTeacherData();
    };
  }, [storybookData]);

  // Authentication and authorization check
  useEffect(() => {
    if (!isLoggedIn) {
      message.warning(t('auth.loginRequired'));
      navigate('/login?redirect=/teacher/dashboard', { replace: true });
    } else if (!isTeacher) {
      message.warning(t('auth.teacherRequired'));
      navigate('/user?tab=profile', { replace: true });
    }
  }, [isLoggedIn, isTeacher, navigate, t]);

  // Calculate course stats
  const courseStats = {
    totalCourses: courses.length,
    publishedCourses: courses.filter(c => c.status === 'published').length,
    draftCourses: courses.filter(c => c.status === 'draft').length,
    pausedCourses: courses.filter(c => c.status === 'paused').length,
  };

  // Handle course creation
  const handleCreateCourse = useCallback(() => {
    setEditingCourse(null);
    setViewMode('form');
    setActiveTab('courses');
  }, []);

  // Handle course edit
  const handleEditCourse = useCallback((course: TeacherCourse) => {
    setEditingCourse(course);
    setViewMode('form');
    setActiveTab('courses');
  }, []);

  // Handle course preview
  const handlePreviewCourse = useCallback((course: TeacherCourse) => {
    setPreviewCourse(course);
  }, []);

  // Handle course publish
  const handlePublishCourse = useCallback(
    (courseId: string) => {
      setCourses(prev =>
        prev.map(course =>
          course.id === courseId
            ? { ...course, status: 'published' as const, updatedAt: new Date().toISOString() }
            : course
        )
      );
      message.success(t('messages.publishSuccess'));
    },
    [t]
  );

  // Handle course pause
  const handlePauseCourse = useCallback(
    (courseId: string) => {
      setCourses(prev =>
        prev.map(course =>
          course.id === courseId
            ? { ...course, status: 'paused' as const, updatedAt: new Date().toISOString() }
            : course
        )
      );
      message.success(t('messages.pauseSuccess'));
    },
    [t]
  );

  // Handle course delete
  const handleDeleteCourse = useCallback(
    (courseId: string) => {
      setCourses(prev => prev.filter(course => course.id !== courseId));
      message.success(t('messages.deleteSuccess'));
    },
    [t]
  );

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (values: CourseFormValues) => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (editingCourse) {
          // Update existing course
          setCourses(prev =>
            prev.map(course =>
              course.id === editingCourse.id
                ? {
                    ...course,
                    ...values,
                    coverImage: values.coverImages?.[0] || course.coverImage,
                    status: values.action === 'publish' ? 'published' : course.status,
                    updatedAt: new Date().toISOString(),
                  }
                : course
            )
          );
          message.success(t('messages.updateSuccess'));
        } else {
          // Create new course
          const newCourse: TeacherCourse = {
            id: String(Date.now()),
            ...values,
            status: values.action === 'publish' ? 'published' : 'draft',
            rating: 0,
            reviewCount: 0,
            studentCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as TeacherCourse;
          setCourses(prev => [newCourse, ...prev]);
          message.success(t('messages.createSuccess'));
        }
        setViewMode('list');
        setEditingCourse(null);
      } catch {
        message.error(t('messages.error'));
      } finally {
        setLoading(false);
      }
    },
    [editingCourse, t]
  );

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    setEditingCourse(null);
    setViewMode('list');
  }, []);

  // Handle close preview
  const handleClosePreview = useCallback(() => {
    setPreviewCourse(null);
  }, []);

  // Handle save profile
  const handleSaveProfile = useCallback(
    (data: Partial<TeacherData>) => {
      setTeacherData(prev => ({ ...prev, ...data }));
      message.success(t('profile.success'));
    },
    [t]
  );

  // Early return if not authenticated
  if (!isLoggedIn || !isTeacher) {
    return null;
  }

  // Render courses content based on view mode
  const renderCoursesContent = () => {
    if (viewMode === 'form') {
      return (
        <div className={styles.contentArea}>
          <CourseForm
            course={editingCourse}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={loading}
          />
        </div>
      );
    }

    return (
      <div className={styles.contentArea}>
        <CourseStats stats={courseStats} maxPublishedCourses={5} />
        <CourseList
          courses={courses}
          onCreateCourse={handleCreateCourse}
          onEditCourse={handleEditCourse}
          onPreviewCourse={handlePreviewCourse}
          onPublishCourse={handlePublishCourse}
          onPauseCourse={handlePauseCourse}
          onDeleteCourse={handleDeleteCourse}
        />
      </div>
    );
  };

  // Build tab items
  const tabItems = [
    {
      key: 'profile',
      label: <span>{t('nav.profile')}</span>,
      children: (
        <div className={styles.contentArea}>
          <TeacherProfileSection teacher={teacherData} onSave={handleSaveProfile} />
        </div>
      ),
    },
    {
      key: 'courses',
      label: <span>{t('teacherDashboard.nav.courses')}</span>,
      children: renderCoursesContent(),
    },
    {
      key: 'students',
      label: <span>{t('teacherDashboard.nav.students')}</span>,
      children: <StudentsSection students={students} />,
    },
    {
      key: 'revenue',
      label: <span>{t('teacherDashboard.nav.revenue')}</span>,
      children: <RevenueSection revenue={revenue} />,
    },
    {
      key: 'replies',
      label: <span>{t('replies.nav')}</span>,
      children: (
        <div className={styles.contentArea}>
          <TeacherRepliesSection />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.teacherDashboardPage}>
      <Header onLanguageChange={() => {}} />
      <div className={styles.headerSpacer} />

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('teacherDashboard.title')}</h1>
        <p className={styles.pageSubtitle}>
          {t('teacherDashboard.welcome', { name: teacherData.name })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className={styles.statsSection}>
        <StatsCards courses={courses} students={students} revenue={revenue} />
      </div>

      {/* Tab Navigation */}
      <div className={styles.mainContent}>
        <Tabs
          activeKey={activeTab}
          onChange={key => {
            setActiveTab(key as ActiveTab);
            // Reset to list view when switching away from courses
            if (key !== 'courses') {
              setViewMode('list');
              setEditingCourse(null);
            }
          }}
          items={tabItems}
          className={styles.dashboardTabs}
        />
      </div>

      <div className={styles.footerSpacer} />
      <Footer />

      {/* Preview Modal */}
      <Modal
        title={t('actions.preview', { ns: 'courseManagement' })}
        open={!!previewCourse}
        onCancel={handleClosePreview}
        footer={[
          <Button key="close" onClick={handleClosePreview}>
            {t('actions.cancel', { ns: 'courseManagement' })}
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              if (previewCourse) {
                handleEditCourse(previewCourse);
                handleClosePreview();
              }
            }}
          >
            {t('actions.edit', { ns: 'courseManagement' })}
          </Button>,
        ]}
        width={700}
        className={styles.modalContent}
      >
        {previewCourse && (
          <div>
            {previewCourse.coverImage && (
              <img
                src={previewCourse.coverImage}
                alt={previewCourse.title}
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              />
            )}
            <h2>{previewCourse.title}</h2>
            <p style={{ color: '#666', marginBottom: 16 }}>{previewCourse.subtitle}</p>
            <p>
              <strong>{t('form.subject', { ns: 'courseManagement' })}:</strong>{' '}
              {t(`subject.${previewCourse.subject}`, { ns: 'courseManagement' })}
            </p>
            <p>
              <strong>{t('form.grade', { ns: 'courseManagement' })}:</strong>{' '}
              {t(`grade.${previewCourse.grade}`, { ns: 'courseManagement' })}
            </p>
            <p>
              <strong>{t('form.price', { ns: 'courseManagement' })}:</strong> ${previewCourse.price}
            </p>
            <p>
              <strong>{t('form.description', { ns: 'courseManagement' })}:</strong>
            </p>
            <div
              className={styles.courseDescription}
              dangerouslySetInnerHTML={{ __html: previewCourse.description }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeacherDashboardPage;
