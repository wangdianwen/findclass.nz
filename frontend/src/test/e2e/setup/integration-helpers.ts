/**
 * Integration Test Helpers
 *
 * Utilities for integration tests that connect to a real staging backend.
 * These helpers provide:
 * - Direct API calls (bypassing UI for setup/cleanup)
 * - Test data generation and cleanup
 * - Authentication helpers
 * - Database state management
 *
 * IMPORTANT: These helpers assume the staging backend is running at:
 * - API: http://localhost:3001
 */

import { request, APIRequestContext } from '@playwright/test';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const API_TIMEOUT = 10000;

// Test account credentials (seeded data)
export const TEST_ACCOUNTS = {
  demo: {
    email: 'demo@findclass.nz',
    password: 'Password123',
    name: 'Demo User',
  },
  teacher: {
    email: 'teacher@findclass.nz',
    password: 'Password123',
    name: 'Teacher User',
  },
} as const;

// Test data tracking for cleanup
const createdTestData = {
  users: [] as string[],
  courses: [] as string[],
  applications: [] as string[],
  favorites: [] as string[],
  reviews: [] as string[],
};

/**
 * Create an API context for making direct backend calls
 */
export async function createAPIContext(): Promise<APIRequestContext> {
  return await request.newContext({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Generate a unique test email using timestamp
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@test.findclass.nz`;
}

/**
 * Generate a unique test phone number
 */
export function generateTestPhone(): string {
  const timestamp = Date.now().toString().slice(-8);
  return `04${timestamp}`;
}

/**
 * Register a new test user via API
 * @returns User data and auth token
 */
export async function createTestUser(apiContext: APIRequestContext, options?: {
  email?: string;
  password?: string;
  name?: string;
}) {
  const email = options?.email || generateTestEmail('user');
  const password = options?.password || 'Test1234!';
  const name = options?.name || 'Test User';

  // Step 1: Send verification code
  const codeResponse = await apiContext.post('/auth/send-verification-code', {
    data: { email, purpose: 'registration' },
  });

  if (!codeResponse.ok()) {
    throw new Error(`Failed to send verification code: ${codeResponse.status()}`);
  }

  const codeData = await codeResponse.json();
  // For staging/testing, backend might return the code directly or log it
  // In real scenario, you'd need to extract from logs or use a test email service
  const verificationCode = codeData.data?.code || '123456'; // Fallback for testing

  // Step 2: Register with verification code
  const registerResponse = await apiContext.post('/auth/register', {
    data: {
      email,
      password,
      name,
      verificationCode,
    },
  });

  if (!registerResponse.ok()) {
    const error = await registerResponse.text();
    throw new Error(`Failed to register user: ${registerResponse.status()} - ${error}`);
  }

  const registerData = await registerResponse.json();
  const token = registerData.data?.token;

  // Track for cleanup
  if (registerData.data?.user?.id) {
    createdTestData.users.push(registerData.data.user.id);
  }

  return {
    user: registerData.data?.user,
    token,
    email,
    password,
  };
}

/**
 * Login a user via API
 * @returns Auth token and user data
 */
export async function loginWithEmail(
  apiContext: APIRequestContext,
  email: string,
  password: string
) {
  const loginResponse = await apiContext.post('/auth/login', {
    data: { email, password },
  });

  if (!loginResponse.ok()) {
    throw new Error(`Login failed: ${loginResponse.status()}`);
  }

  const loginData = await loginResponse.json();
  return {
    token: loginData.data?.token,
    user: loginData.data?.user,
  };
}

/**
 * Login as demo user
 */
export async function loginAsDemo(apiContext: APIRequestContext) {
  return loginWithEmail(apiContext, TEST_ACCOUNTS.demo.email, TEST_ACCOUNTS.demo.password);
}

/**
 * Login as teacher
 */
export async function loginAsTeacher(apiContext: APIRequestContext) {
  return loginWithEmail(apiContext, TEST_ACCOUNTS.teacher.email, TEST_ACCOUNTS.teacher.password);
}

/**
 * Delete a test user via API (requires admin or self-delete)
 * Note: This might require admin privileges or a dedicated test cleanup endpoint
 */
export async function deleteTestUser(apiContext: APIRequestContext, userId: string, token: string) {
  const response = await apiContext.delete(`/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Cleanup tracking
  const index = createdTestData.users.indexOf(userId);
  if (index > -1) {
    createdTestData.users.splice(index, 1);
  }

  return response.ok();
}

/**
 * Apply for teacher role
 */
export async function applyForTeacherRole(
  apiContext: APIRequestContext,
  token: string,
  applicationData?: {
    name?: string;
    email?: string;
    phone?: string;
    qualifications?: string;
    experience?: string;
    subjects?: string[];
    bio?: string;
  }
) {
  const response = await apiContext.post('/auth/roles/apply', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      role: 'TEACHER',
      application: {
        name: applicationData?.name || 'Test Teacher',
        email: applicationData?.email || generateTestEmail('teacher'),
        phone: applicationData?.phone || generateTestPhone(),
        qualifications: applicationData?.qualifications || 'Bachelor of Education',
        experience: applicationData?.experience || '5 years teaching experience',
        subjects: applicationData?.subjects || ['Math', 'English'],
        bio: applicationData?.bio || 'Passionate teacher',
      },
    },
  });

  if (!response.ok()) {
    throw new Error(`Teacher application failed: ${response.status()}`);
  }

  const data = await response.json();

  // Track for cleanup
  if (data.data?.id) {
    createdTestData.applications.push(data.data.id);
  }

  return data.data;
}

/**
 * Add course to favorites
 */
export async function addFavorite(
  apiContext: APIRequestContext,
  token: string,
  courseId: string
) {
  const response = await apiContext.post(`/courses/${courseId}/favorite`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to add favorite: ${response.status()}`);
  }

  return response.json();
}

/**
 * Remove course from favorites
 */
export async function removeFavorite(
  apiContext: APIRequestContext,
  token: string,
  courseId: string
) {
  const response = await apiContext.delete(`/courses/${courseId}/favorite`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to remove favorite: ${response.status()}`);
  }

  return response.json();
}

/**
 * Get user's favorites
 */
export async function getFavorites(apiContext: APIRequestContext, token: string) {
  const response = await apiContext.get('/users/favorites', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to get favorites: ${response.status()}`);
  }

  return response.json();
}

/**
 * Search courses via API
 */
export async function searchCourses(apiContext: APIRequestContext, params?: {
  keyword?: string;
  city?: string;
  subject?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.keyword) searchParams.append('keyword', params.keyword);
  if (params?.city) searchParams.append('city', params.city);
  if (params?.subject) searchParams.append('subject', params.subject);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const response = await apiContext.get(`/courses/search?${searchParams.toString()}`);

  if (!response.ok()) {
    throw new Error(`Course search failed: ${response.status()}`);
  }

  return response.json();
}

/**
 * Get course details by ID
 */
export async function getCourseById(apiContext: APIRequestContext, courseId: string) {
  const response = await apiContext.get(`/courses/${courseId}`);

  if (!response.ok()) {
    throw new Error(`Failed to get course: ${response.status()}`);
  }

  return response.json();
}

/**
 * Create a test review (requires course to exist)
 */
export async function createReview(
  apiContext: APIRequestContext,
  token: string,
  courseId: string,
  reviewData: {
    rating: number;
    comment: string;
  }
) {
  const response = await apiContext.post(`/reviews`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      courseId,
      overallRating: reviewData.rating,
      content: reviewData.comment,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create review: ${response.status()}`);
  }

  const data = await response.json();

  // Track for cleanup
  if (data.data?.id) {
    createdTestData.reviews.push(data.data.id);
  }

  return data.data;
}

/**
 * Cleanup all test data created during tests
 * Note: This requires admin privileges or dedicated cleanup endpoints
 */
export async function cleanupTestData(apiContext: APIRequestContext, adminToken?: string) {
  const cleanupResults = {
    usersDeleted: 0,
    applicationsDeleted: 0,
    reviewsDeleted: 0,
    errors: [] as string[],
  };

  // Delete test users (requires admin token)
  if (adminToken && createdTestData.users.length > 0) {
    for (const userId of createdTestData.users) {
      try {
        await deleteTestUser(apiContext, userId, adminToken);
        cleanupResults.usersDeleted++;
      } catch (error) {
        cleanupResults.errors.push(`Failed to delete user ${userId}: ${error}`);
      }
    }
  }

  // Clear tracking arrays
  createdTestData.users = [];
  createdTestData.courses = [];
  createdTestData.applications = [];
  createdTestData.favorites = [];
  createdTestData.reviews = [];

  return cleanupResults;
}

/**
 * Get list of created test data (for debugging)
 */
export function getTestDataSummary() {
  return { ...createdTestData };
}

/**
 * Wait for backend to be healthy
 */
export async function waitForBackend(): Promise<boolean> {
  const startTime = Date.now();
  const timeout = 60000; // 60 seconds
  const interval = 2000; // Check every 2 seconds

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Backend not ready yet, wait and retry
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Health check for staging environment
 */
export async function checkStagingHealth() {
  const healthUrl = API_BASE_URL.replace('/api/v1', '/health');

  try {
    const response = await fetch(healthUrl);
    const data = await response.json();

    return {
      healthy: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Setup integration test environment
 * - Verify backend is running
 * - Create API context
 * - Verify test accounts exist
 */
export async function setupIntegrationTest() {
  // Check backend health
  const health = await checkStagingHealth();
  if (!health.healthy) {
    throw new Error(
      'Staging backend is not healthy. Please run: npm run staging:deploy'
    );
  }

  // Create API context
  const apiContext = await createAPIContext();

  // Verify demo account exists (try to login)
  try {
    await loginAsDemo(apiContext);
  } catch (error) {
    throw new Error(
      'Demo account not found. Please ensure SEED_SAMPLE_DATA=true is set.'
    );
  }

  return apiContext;
}

/**
 * Teardown integration test
 * - Cleanup test data
 * - Dispose API context
 */
export async function teardownIntegrationTest(
  apiContext: APIRequestContext,
  adminToken?: string
) {
  await cleanupTestData(apiContext, adminToken);
  await apiContext.dispose();
}
