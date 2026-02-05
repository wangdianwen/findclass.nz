import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CookieConsent, useCookieConsent } from '@/components/cookie';
import { SectionSkeleton } from '@/components/ui/Loading';
import {
  HeroSkeleton,
  FeaturedCoursesSkeleton,
  FeaturesSkeleton,
  ValueSkeleton,
  CTASkeleton,
  InstitutionSkeleton,
  HeaderSkeleton,
  AnnouncementBarSkeleton,
} from '@/components/ui/Loading';
import { courseApi } from '@/services/api';
import type { CourseData } from '@/data/courseData';
import styles from './HomePage.module.scss';

// Lazy load components for code splitting - improves initial load time
const AnnouncementBar = lazy(() => import('@/components/shared/AnnouncementBar'));
const Header = lazy(() => import('@/components/shared/Header'));
const HeroSection = lazy(() => import('./sections/HeroSection'));
const FeaturedCoursesSection = lazy(() => import('./sections/FeaturedCoursesSection'));
const CTASection = lazy(() => import('./sections/CTASection'));
const InstitutionSection = lazy(() => import('./sections/InstitutionSection'));
const FeaturesSection = lazy(() => import('./sections/FeaturesSection'));
const ValueSection = lazy(() => import('./sections/ValueSection'));
const Footer = lazy(() => import('@/components/shared/Footer'));

// ============================================
// Main Component
// ============================================

const HomePage: React.FC = () => {
  const { i18n } = useTranslation();
  const { saveConsent } = useCookieConsent();

  // Fetch featured courses
  const { data: courses = [], isLoading, error } = useQuery<CourseData[]>({
    queryKey: ['featuredCourses'],
    queryFn: () => courseApi.getFeaturedCourses(6),
  });

  // Ensure courses is always an array (handles edge case where API returns non-array)
  const safeCourses = Array.isArray(courses) ? courses : [];

  // Handlers
  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  const handleCookieAccept = (categories: Parameters<typeof saveConsent>[0]) => {
    saveConsent(categories);
  };

  return (
    <div className={styles.container}>
      {/* Top Announcement Bar - Independent Suspense with skeleton fallback */}
      <Suspense fallback={<AnnouncementBarSkeleton />}>
        <AnnouncementBar />
      </Suspense>

      {/* Header - Independent Suspense with skeleton fallback */}
      <Suspense fallback={<HeaderSkeleton />}>
        <Header onLanguageChange={handleLanguageChange} />
      </Suspense>

      {/* Hero Section - Skeleton with actual content dimensions */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      {/* Featured Courses - Pass data from API */}
      <Suspense fallback={<FeaturedCoursesSkeleton />}>
        <FeaturedCoursesSection courses={safeCourses} isLoading={isLoading} error={error} />
      </Suspense>

      {/* Bottom Content - Individual Suspense with specific skeletons */}
      <Suspense fallback={<CTASkeleton />}>
        <CTASection />
      </Suspense>

      <Suspense fallback={<InstitutionSkeleton />}>
        <InstitutionSection />
      </Suspense>

      <Suspense fallback={<FeaturesSkeleton />}>
        <FeaturesSection />
      </Suspense>

      <Suspense fallback={<ValueSkeleton />}>
        <ValueSection />
      </Suspense>

      {/* Footer Spacer - Consistent spacing before footer */}
      <div className={styles.footerSpacer} />

      <Suspense fallback={<SectionSkeleton size="large" />}>
        <Footer />
      </Suspense>

      {/* Cookie Consent Banner - Rendered outside Suspense for immediate visibility */}
      <CookieConsent onAccept={handleCookieAccept} onDecline={() => saveConsent([])} />
    </div>
  );
};

export default HomePage;
