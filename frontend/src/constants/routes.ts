// ============================================
// Route Constants
// ============================================

export const ROUTES = {
  // Public routes
  HOME: '/',
  COURSES: '/courses',
  TUTORS: '/tutors',
  ABOUT: '/about',
  HELP: '/help',
  CONTACT: '/contact',
  FEEDBACK: '/feedback',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  COOKIE_POLICY: '/cookie-policy',

  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',

  // Tutor routes
  TUTOR_DASHBOARD: '/tutor/dashboard',
  TUTOR_COURSES: '/tutor/courses',
  TUTOR_STUDENTS: '/tutor/students',

  // Student routes
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_FAVORITES: '/student/favorites',

  // API routes (for internal use)
  API_COURSES: '/api/v1/courses',
  API_COURSES_SEARCH: '/api/v1/courses/search',
  API_TUTORS: '/api/v1/tutors',
  API_AUTH: '/api/v1/auth',
} as const;

// ============================================
// Route Parameters
// ============================================

export const ROUTE_PARAMS = {
  COURSE_ID: ':courseId',
  TUTOR_ID: ':tutorId',
  STUDENT_ID: ':studentId',
} as const;

// ============================================
// Route Generators
// ============================================

export const generateRoute = (route: string, params: Record<string, string> = {}): string => {
  let result = route;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, value);
  });
  return result;
};

export const getCourseRoute = (courseId: string): string =>
  generateRoute(`${ROUTES.COURSES}/${ROUTE_PARAMS.COURSE_ID}`, {
    courseId,
  });

export const getTutorRoute = (tutorId: string): string =>
  generateRoute(`${ROUTES.TUTORS}/${ROUTE_PARAMS.TUTOR_ID}`, {
    tutorId,
  });

export default ROUTES;
