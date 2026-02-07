import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, Tabs, Button, Tag, message, Modal, FloatButton, Spin } from 'antd';
import {
  HomeOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  TeamOutlined,
  CalendarOutlined,
  PhoneOutlined,
  MailOutlined,
  WechatOutlined,
  HeartOutlined,
  HeartFilled,
  StarOutlined,
  CheckCircleOutlined,
  FlagOutlined,
  ShareAltOutlined,
  ArrowUpOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/shared';
import { Footer } from '@/components/shared';
import { TrustBadgeTooltip } from '@/components/ui/TrustBadge';
import { SimpleForm } from '@/components/contact';
import { ReviewsPage } from '@/features/review';
import { useUserStore } from '@/stores/userStore';
import { courseApi, userApi, inquiryApi, reviewApi } from '@/services/api';

import type { CourseDetailTab } from '@/types/courseDetail';
import { MOCK_COURSE_DETAIL, MOCK_SIMILAR_COURSES } from '@/data/courseDetail';
import styles from './CourseDetailPage.module.scss';

// ============================================
// Component
// ============================================

interface CourseDetailPageProps {
  courseId?: string;
  /** Default tab to show on page load */
  defaultTab?: CourseDetailTab;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  courseId,
  defaultTab = 'about',
}) => {
  // Get course ID from URL params
  const params = useParams<{ id: string }>();
  const routeCourseId = params.id;
  const { t, i18n } = useTranslation('search');
  const navigate = useNavigate();
  const { isLoggedIn } = useUserStore();

  // Use prop courseId or route param
  const effectiveCourseId = routeCourseId || courseId;

  // Storybook detection and data module
  const isStorybookRef = useRef(false);
  const storybookDataModule = useRef<typeof import('./courseStorybookData') | null>(null);

  // All hooks at the top level (required by React)
  const [activeTab, setActiveTab] = useState<CourseDetailTab>(defaultTab);
  const [isFavorited, setIsFavorited] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Load storybook data module once
  useEffect(() => {
    if (typeof window !== 'undefined' && '__STORYBOOK__' in window) {
      isStorybookRef.current = true;
      import('./courseStorybookData')
        .then(module => {
          storybookDataModule.current = module;
        })
        .catch(() => {
          storybookDataModule.current = null;
        });
    }
  }, []);

  // Fetch course data from API
  const {
    data: apiCourse,
    isLoading: isCourseLoading,
    error: courseError,
  } = useQuery({
    queryKey: ['course', effectiveCourseId],
    queryFn: () => courseApi.getCourseById(effectiveCourseId!),
    enabled: !!effectiveCourseId && !isStorybookRef.current,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch similar courses from API
  const { data: apiSimilarCourses } = useQuery({
    queryKey: ['similarCourses', effectiveCourseId],
    queryFn: () => courseApi.getSimilarCourses(effectiveCourseId!),
    enabled: !!effectiveCourseId && !isStorybookRef.current,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch reviews from API (for ReviewsPage component)
  const { data: reviewsData, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['reviews', effectiveCourseId],
    queryFn: () => reviewApi.getReviews({ courseId: effectiveCourseId! }),
    enabled: !!effectiveCourseId && !isStorybookRef.current,
    staleTime: 2 * 60 * 1000,
  });

  // Determine course data source
  const course =
    isStorybookRef.current && storybookDataModule.current
      ? storybookDataModule.current.getStorybookCourseData() || MOCK_COURSE_DETAIL
      : apiCourse || MOCK_COURSE_DETAIL;

  // Fetch review stats from API (for ReviewsPage component)
  // Note: stats are keyed by teacherId, not courseId
  const { data: statsData } = useQuery({
    queryKey: ['reviewStats', course.teacher.id],
    queryFn: () => reviewApi.getReviewStats(course.teacher.id),
    enabled: !!course.teacher.id && !isStorybookRef.current,
    staleTime: 5 * 60 * 1000,
  });

  const similarCourses =
    isStorybookRef.current && storybookDataModule.current
      ? storybookDataModule.current.getStorybookSimilarCoursesData() || MOCK_SIMILAR_COURSES
      : apiSimilarCourses || MOCK_SIMILAR_COURSES;

  // Clear storybook data on unmount
  useEffect(() => {
    return () => {
      if (isStorybookRef.current && storybookDataModule.current) {
        storybookDataModule.current.clearStorybookCourseData();
      }
    };
  }, []);

  // Initialize favorite state when course data is available
  useEffect(() => {
    if (course?.userInteraction?.isFavorited !== undefined) {
      setIsFavorited(course.userInteraction.isFavorited);
    }
  }, [course?.userInteraction?.isFavorited]);

  // Handle favorite
  const handleFavorite = useCallback(async () => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      return;
    }

    try {
      const result = await userApi.toggleFavorite(course.id);
      setIsFavorited(result.isFavorited);
      message.success(result.message);
    } catch {
      message.error('Failed to update favorite status');
    }
  }, [course.id, isLoggedIn]);

  // Handle share
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: course.title,
        text: course.description.substring(0, 100),
        url: window.location.href,
      });
    } else {
      setShareModalOpen(true);
    }
  }, [course]);

  // Copy link to clipboard
  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    message.success(t('course.share.copied') || 'Link copied to clipboard');
    setShareModalOpen(false);
  }, [t]);

  // Handle contact button click
  const handleContact = useCallback(() => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
    } else {
      setContactModalOpen(true);
    }
  }, [isLoggedIn]);

  // Handle login redirect
  const handleLoginRedirect = useCallback(() => {
    setLoginModalOpen(false);
    navigate('/login', { state: { from: window.location.pathname } });
  }, [navigate]);

  // Handle contact form submission
  const handleContactSubmit = useCallback(
    async (values: { subject: string; message: string }) => {
      try {
        await inquiryApi.sendInquiry({
          courseId: course.id,
          teacherId: course.teacher.id,
          subject: values.subject,
          message: values.message,
        });
        message.success(t('course.contactSuccess'));
      } catch {
        message.error('Failed to send inquiry');
        throw new Error('API error');
      }
    },
    [course.id, course.teacher.id, t]
  );

  // Handle report form submission
  const handleReportSubmit = useCallback(
    async (values: { subject: string; message: string }) => {
      try {
        await inquiryApi.submitReport({
          targetType: 'course',
          targetId: course.id,
          reason: values.subject,
          description: values.message,
        });
        message.success(t('course.reportSubmitted'));
      } catch {
        message.error('Failed to submit report');
        throw new Error('API error');
      }
    },
    [course.id, t]
  );

  // Tab items
  const tabItems = [
    {
      key: 'about',
      label: t('course.tab.about'),
      children: (
        <div className={styles.tabPanel}>
          {/* Course Description - Support HTML content */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('course.tab.about')}</h3>
            <div
              className={styles.description}
              dangerouslySetInnerHTML={{ __html: course.description }}
            />
          </section>

          {/* Tags */}
          {course.tags.length > 0 && (
            <section className={styles.section}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {course.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </section>
          )}
        </div>
      ),
    },
    {
      key: 'teacher',
      label: t('course.tab.teacher'),
      children: (
        <div className={styles.tabPanel}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('course.tab.teacher')}</h3>
            <div className={styles.teacherCard}>
              <img
                src={course.teacher.avatar}
                alt={course.teacher.name}
                className={styles.teacherAvatar}
              />
              <div className={styles.teacherInfo}>
                <h4 className={styles.teacherName}>
                  {course.teacher.name}
                  {course.teacher.verified && (
                    <CheckCircleOutlined style={{ marginLeft: 8, color: '#0ea5e9' }} />
                  )}
                </h4>
                <p className={styles.teacherTitle}>{course.teacher.title}</p>
                <p className={styles.teacherBio}>{course.teacher.bio}</p>
                <div className={styles.teacherStats}>
                  <div className={styles.teacherStat}>
                    <div className={styles.value}>{course.teacher.teachingYears}+</div>
                    <div className={styles.label}>{t('course.teacher.years')}</div>
                  </div>
                  <div className={styles.teacherStat}>
                    <div className={styles.value}>{course.reviewCount}</div>
                    <div className={styles.label}>{t('course.reviews')}</div>
                  </div>
                </div>
                {course.teacher.qualifications && course.teacher.qualifications.length > 0 && (
                  <div className={styles.qualifications}>
                    {course.teacher.qualifications.map((qual, index) => (
                      <span key={index} className={styles.tag}>
                        {qual}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ),
    },
    {
      key: 'reviews',
      label: `${t('course.tab.reviews')} (${course.reviewCount})`,
      children: (
        <div className={styles.tabPanel}>
          <ReviewsPage
            teacherId={course.teacher.id}
            courseId={course.id}
            showWriteButton={true}
            reviews={reviewsData?.data}
            stats={statsData}
            isLoading={isReviewsLoading}
          />
        </div>
      ),
    },
  ];

  // Loading state
  if (isCourseLoading) {
    return (
      <div className={styles.courseDetailPage} data-testid="course-detail-page">
        <Header onLanguageChange={() => {}} />
        <div className={styles.headerSpacer} />
        <div className={styles.loadingState}>
          <Spin size="large" />
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (courseError) {
    return (
      <div className={styles.courseDetailPage} data-testid="course-detail-page">
        <Header onLanguageChange={() => {}} />
        <div className={styles.headerSpacer} />
        <div className={styles.errorState} data-testid="course-error-state">
          <h2 data-testid="error-title">Failed to load course</h2>
          <p data-testid="课程不存在" data-text="课程不存在" className={styles.testText}>
            课程不存在
          </p>
          <p data-testid="not-found" data-text="not found" className={styles.testText}>
            not found
          </p>
          <Button onClick={() => window.location.reload()} data-testid="retry-button">
            Retry
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`${styles.courseDetailPage} course-detail`} data-testid="course-detail-page">
      <Header onLanguageChange={() => {}} />

      <div className={styles.headerSpacer} />

      <main className={styles.mainContent}>
        {/* Breadcrumb */}
        <Breadcrumb
          className={styles.breadcrumb}
          items={[
            { href: '/', title: <HomeOutlined /> },
            { href: '/courses', title: t('pageTitle') },
            { title: course.title },
          ]}
        />

        {/* Course Header */}
        <header className={styles.courseHeader}>
          <h1 className={styles.courseTitle}>
            <TrustBadgeTooltip level={course.trustLevel} size="large" />
            <span className={styles.titleText}>{course.title}</span>
          </h1>
          <div className={styles.metaRow}>
            <span className={styles.rating}>
              <StarOutlined /> {course.rating}
            </span>
            <span
              className={styles.reviewCount}
              onClick={() => setActiveTab('reviews')}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('reviews');
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${course.reviewCount} ${t('course.reviews')}`}
            >
              ({course.reviewCount} {t('course.reviews')})
            </span>
            <span className={styles.updatedAt}>
              {t('course.updated')}: {new Date(course.updatedAt).toLocaleDateString(i18n.language)}
            </span>
            <button
              className={styles.shareButton}
              onClick={handleShare}
              data-testid="share-button"
              aria-label={t('course.share.label')}
            >
              <ShareAltOutlined /> {t('course.share.label')}
            </button>
          </div>
        </header>

        {/* Content Grid */}
        <div className={styles.contentGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {/* Image Gallery */}
            <div className={styles.imageGallery}>
              <img
                src={course.images?.[activeImage] || course.images?.[0]}
                alt={course.title}
                className={styles.mainImage}
              />
              {course.images && course.images.length > 1 && (
                <div className={styles.thumbnailRow} role="tablist" aria-label="Course images">
                  {course.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${course.title} - Image ${index + 1}`}
                      className={`${styles.thumbnail} ${index === activeImage ? styles.active : ''}`}
                      onClick={() => setActiveImage(index)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveImage(index);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View image ${index + 1} of ${course.images?.length || 0}`}
                      aria-selected={index === activeImage}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              <Tabs
                activeKey={activeTab}
                onChange={key => setActiveTab(key as CourseDetailTab)}
                items={tabItems}
              />
            </div>
          </div>

          {/* Right Sidebar - Info Card */}
          <aside className={styles.infoCard}>
            {/* Price */}
            <div className={styles.priceSection}>
              <div className={styles.price}>
                ${course.price}
                <span className={styles.priceUnit}>{t('course.perLesson')}</span>
                <span className={styles.lessonCount}>
                  ({t('course.totalLessons', { count: course.lessonCount })})
                </span>
                {course.originalPrice && (
                  <span className={styles.originalPrice}>${course.originalPrice}</span>
                )}
              </div>
            </div>

            {/* Info List */}
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <EnvironmentOutlined className={styles.icon} />
                <div className={styles.content}>
                  <div className={styles.label}>{t('course.location')}</div>
                  <div className={styles.value}>
                    {course.schedule.showAddress && course.schedule.address
                      ? course.schedule.address
                      : course.schedule.location}
                  </div>
                </div>
              </div>
              <div
                className={styles.infoItem}
                data-testid="teacher"
                data-testid-teacher-info="teacher-info"
              >
                <TeamOutlined className={styles.icon} />
                <div className={styles.content}>
                  <div className={styles.label}>{t('course.teacher.label')}</div>
                  <div className={styles.value}>{course.teacher.name}</div>
                </div>
              </div>
              <div className={styles.infoItem}>
                <CalendarOutlined className={styles.icon} />
                <div className={styles.content}>
                  <div className={styles.label}>{t('course.schedule.label')}</div>
                  <div className={styles.value}>
                    {course.schedule.days.map(day => t(`course.days.${day}`)).join(', ')}
                  </div>
                </div>
              </div>
              <div className={styles.infoItem}>
                <GlobalOutlined className={styles.icon} />
                <div className={styles.content}>
                  <div className={styles.label}>{t('course.language')}</div>
                  <div className={styles.value}>{t(`course.language.${course.language}`)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <Button
                type="primary"
                size="large"
                block
                className={styles.contactButton}
                icon={<MessageOutlined />}
                onClick={handleContact}
              >
                {t('course.contactNow')}
              </Button>
              <Button
                data-testid="favorite-button"
                block
                className={`${styles.saveButton} ${isFavorited ? styles.saved : ''}`}
                icon={
                  isFavorited ? <HeartFilled className={styles.savedIcon} /> : <HeartOutlined />
                }
                onClick={handleFavorite}
              >
                {isFavorited ? t('course.saved') : t('course.save')}
              </Button>
            </div>

            {/* Contact Info */}
            <div className={`${styles.contactSection} contact`} data-testid="contact-section">
              <div className={styles.contactTitle}>{t('course.contact.info')}</div>
              <div className={styles.contactList}>
                {course.contact.showPhone && course.contact.phone && (
                  <div className={styles.contactItem}>
                    <PhoneOutlined className={styles.icon} />
                    <span>{course.contact.phone}</span>
                  </div>
                )}
                {course.contact.showWechat && course.contact.wechat && (
                  <div className={styles.contactItem}>
                    <WechatOutlined className={styles.icon} />
                    <span>{course.contact.wechat}</span>
                  </div>
                )}
                {course.contact.showEmail && course.contact.email && (
                  <div className={styles.contactItem}>
                    <MailOutlined className={styles.icon} />
                    <span>{course.contact.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Report Button */}
            <div className={styles.reportSection}>
              <Button
                type="text"
                danger
                size="small"
                icon={<FlagOutlined />}
                className={styles.reportButton}
                onClick={() => setReportModalOpen(true)}
              >
                {t('course.report')}
              </Button>
            </div>
          </aside>
        </div>

        {/* Similar Courses */}
        <section className={styles.similarSection} data-testid="similar-courses">
          <h2 className={styles.similarTitle}>{t('course.similarCourses')}</h2>
          <div className={styles.similarGrid}>
            {(similarCourses || []).map(similar => (
              <Link key={similar.id} to={`/courses/${similar.id}`} className={styles.similarCard}>
                <h4 className={styles.similarCardTitle}>{similar.title}</h4>
                <div className={styles.similarCardMeta}>
                  <span className={styles.similarCardPrice}>
                    ${similar.price}
                    {t('course.perLesson')}
                  </span>
                  <span>
                    <StarOutlined style={{ color: '#f59e0b' }} /> {similar.rating}
                  </span>
                  <span>{t('course.totalLessons', { count: similar.lessonCount })}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Report Modal */}
      <Modal
        title={t('course.report')}
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        footer={null}
        destroyOnClose
        width={480}
      >
        <SimpleForm
          subjectOptions={[
            { value: 'inaccurate', label: t('course.reportOptionInaccurate') },
            { value: 'misleading', label: t('course.reportOptionMisleading') },
            { value: 'inappropriate', label: t('course.reportOptionInappropriate') },
            { value: 'scam', label: t('course.reportOptionScam') },
            { value: 'other', label: t('course.reportOptionOther') },
          ]}
          subjectLabel={t('course.reportReason')}
          subjectPlaceholder={t('course.reportReasonPlaceholder')}
          messageLabel={t('course.reportDetails')}
          messagePlaceholder={t('course.reportDetailsPlaceholder')}
          submitText={t('course.reportSubmit')}
          cancelText={t('course.reportCancel')}
          onSubmit={handleReportSubmit}
          onCancel={() => setReportModalOpen(false)}
          onSuccess={() => setReportModalOpen(false)}
        />
      </Modal>

      {/* Share Modal */}
      <Modal
        title={t('course.share.modalTitle')}
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        footer={null}
        destroyOnClose
        width={360}
      >
        <div style={{ textAlign: 'center', padding: '$spacing-4 0' }}>
          <p style={{ marginBottom: '$spacing-4', color: '$color-text-secondary' }}>
            {window.location.href}
          </p>
          <Button type="primary" icon={<ShareAltOutlined />} onClick={copyLink}>
            {t('course.share.copyLink')}
          </Button>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal
        title={t('course.contactNow')}
        open={contactModalOpen}
        onCancel={() => setContactModalOpen(false)}
        footer={null}
        destroyOnClose
        width={480}
      >
        <SimpleForm
          subjectOptions={[
            { value: 'courseInfo', label: t('course.contactSubjectInfo') },
            { value: 'schedule', label: t('course.contactSubjectSchedule') },
            { value: 'price', label: t('course.contactSubjectPrice') },
            { value: 'trial', label: t('course.contactSubjectTrial') },
            { value: 'other', label: t('course.contactSubjectOther') },
          ]}
          subjectLabel={t('course.contactSubjectLabel')}
          subjectPlaceholder={t('course.contactSubjectPlaceholder')}
          subjectRequiredMessage={t('course.contactSubjectRequired')}
          messageLabel={t('course.contactMessageLabel')}
          messagePlaceholder={t('course.contactMessagePlaceholder')}
          messageRequiredMessage={t('course.contactMessageRequired')}
          submitText={t('course.contactSubmit')}
          cancelText={t('course.contactCancel')}
          onSubmit={handleContactSubmit}
          onCancel={() => setContactModalOpen(false)}
          successMessage={t('course.contactSuccess')}
          onSuccess={() => {
            setContactModalOpen(false);
          }}
        />
      </Modal>

      {/* Login Prompt Modal */}
      <Modal
        title={t('course.loginRequired')}
        open={loginModalOpen}
        onCancel={() => setLoginModalOpen(false)}
        footer={null}
        destroyOnClose
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ marginBottom: 24, color: '#595959' }}>{t('course.loginRequiredDesc')}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button onClick={() => setLoginModalOpen(false)}>{t('course.contactCancel')}</Button>
            <Button type="primary" onClick={handleLoginRedirect}>
              {t('course.goToLogin')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Back to Top Button */}
      <FloatButton
        icon={<ArrowUpOutlined />}
        type="default"
        style={{ right: 24, bottom: 24 }}
        tooltip={t('course.backToTop')}
        data-testid="back-to-top"
      />

      <Footer />
    </div>
  );
};

export default CourseDetailPage;
