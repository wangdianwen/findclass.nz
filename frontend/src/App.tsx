import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import {
  HomePage,
  CourseSearchPage,
  CourseDetailPage,
  AboutPage,
  CookiePolicyPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  HelpCentrePage,
  ContactPage,
  FeedbackPage,
  NotFoundPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  UserCenterPage,
  TeacherOnboardingPage,
  TeacherDashboardPage,
} from '@/pages';
import { ErrorFallback } from '@/components/ui';
import type { FallbackProps } from 'react-error-boundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={(props: FallbackProps) => (
        <ErrorFallback error={props.error} resetErrorBoundary={props.resetErrorBoundary} />
      )}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CourseSearchPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/help" element={<HelpCentrePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/user" element={<UserCenterPage />} />
        <Route path="/user/:tab" element={<UserCenterPage />} />
        <Route path="/teacher/onboarding" element={<TeacherOnboardingPage />} />
        <Route path="/teacher/apply" element={<TeacherOnboardingPage />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
        <Route path="/teacher/courses" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
