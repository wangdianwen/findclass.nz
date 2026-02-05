/**
 * RBAC Service Unit Tests
 * Tests for role-based access control functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

// Mock external dependencies
vi.mock('@src/shared/db/dynamodb', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryItems: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  scanItems: vi.fn(),
  batchGetItems: vi.fn(),
  batchWriteItems: vi.fn(),
  transactWrite: vi.fn(),
  createEntityKey: vi.fn((type, id, sortKey) => ({
    PK: `${type}#${id}`,
    SK: sortKey || 'METADATA',
  })),
  getTableName: vi.fn(),
  getDynamoDBDocClient: vi.fn(),
}));

vi.mock('@src/shared/db/cache', () => ({
  getFromCache: vi.fn(),
  setCache: vi.fn(),
  deleteFromCache: vi.fn(),
  incrementRateLimit: vi.fn(),
  CacheKeys: {
    verify: vi.fn((email: string, type: string) => `verify:${email}:${type}`),
    roleApplication: vi.fn((userId: string) => `roleapp:${userId}`),
  },
}));

vi.mock('@src/core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getItem, queryItems, scanItems } from '@src/shared/db/dynamodb';

import { setCache, CacheKeys } from '@src/shared/db/cache';

import { resetLoggerMocks } from '../mocks/logger.mock';

import {
  getUserRoles,
  applyForRole,
  approveRoleApplication,
  getPendingRoleApplications,
  getApplicationHistory,
  getApplicationDetail,
  getUserApplications,
  userHasRole,
  userHasAnyRole,
  userIsAdmin,
} from '@src/modules/auth/auth.service';
import { UserRole, UserStatus } from '@src/shared/types';
import { RoleApplicationStatus } from '@src/modules/auth/auth.types';

import {
  createMockUser,
  createMockActiveUser,
  createMockAdminUser,
  createMockTeacherUser,
  createMockStudentUser,
} from '../fixtures/auth';

describe('RBAC Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLoggerMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserRoles', () => {
    it('should return user roles with current role', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });

      // When
      const result = await getUserRoles(mockUser.id);

      // Then
      expect(result).toBeDefined();
      expect(result.currentRole).toBe(UserRole.PARENT);
      expect(result.roles).toBeDefined();
      expect(result.roles.length).toBeGreaterThan(0);
    });

    it('should return current role from user object', async () => {
      // Given
      const mockUser = createMockTeacherUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });

      // When
      const result = await getUserRoles(mockUser.id);

      // Then
      expect(result.currentRole).toBe(UserRole.TEACHER);
    });

    it('should return admin role correctly', async () => {
      // Given
      const mockUser = createMockAdminUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });

      // When
      const result = await getUserRoles(mockUser.id);

      // Then
      expect(result.currentRole).toBe(UserRole.ADMIN);
    });

    it('should throw error when user not found', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);

      // When & Then
      await expect(getUserRoles('nonexistent-user')).rejects.toThrow('User not found');
    });

    it('should include role history from applications', async () => {
      // Given
      const mockUser = createMockActiveUser();
      const mockApplications = [
        {
          id: 'app_1',
          role: UserRole.TEACHER,
          status: RoleApplicationStatus.APPROVED,
          appliedAt: '2025-01-01T00:00:00.000Z',
          processedAt: '2025-01-02T00:00:00.000Z',
          comment: 'Approved',
        },
      ];
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: mockApplications });

      // When
      const result = await getUserRoles(mockUser.id);

      // Then
      expect(result.roles.length).toBe(2); // Current + 1 from history
      expect(result.roles.some(r => r.role === UserRole.TEACHER)).toBe(true);
    });

    it('should return pending application if exists', async () => {
      // Given
      const mockUser = createMockActiveUser();
      const mockApplications = [
        {
          id: 'app_pending',
          role: UserRole.TEACHER,
          status: RoleApplicationStatus.PENDING,
          appliedAt: '2025-01-01T00:00:00.000Z',
          reason: 'I want to teach',
        },
      ];
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: mockApplications });

      // When
      const result = await getUserRoles(mockUser.id);

      // Then
      expect(result.pendingApplication).toBeDefined();
      expect(result.pendingApplication?.role).toBe(UserRole.TEACHER);
      expect(result.pendingApplication?.status).toBe(RoleApplicationStatus.PENDING);
    });

    it('should not return pending application if none exists', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });

      // When
      const result = await getUserRoles(mockUser.id);

      // Then
      expect(result.pendingApplication).toBeUndefined();
    });
  });

  describe('applyForRole', () => {
    it('should create role application successfully', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });
      (setCache as Mock).mockResolvedValue(undefined);
      (CacheKeys.roleApplication as Mock).mockReturnValue(`roleapp:${mockUser.id}`);

      // When
      const result = await applyForRole(mockUser.id, UserRole.TEACHER, 'I want to teach');

      // Then
      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.TEACHER);
      expect(result.status).toBe(RoleApplicationStatus.PENDING);
      expect(result.applicationId).toBeDefined();
      expect(setCache).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);

      // When & Then
      await expect(applyForRole('nonexistent-user', UserRole.TEACHER)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when user already has the role', async () => {
      // Given
      const mockUser = createMockTeacherUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });

      // When & Then
      await expect(applyForRole(mockUser.id, UserRole.TEACHER)).rejects.toThrow(
        'You already have the TEACHER role'
      );
    });

    it('should throw error when pending application exists', async () => {
      // Given
      const mockUser = createMockActiveUser();
      const mockApplications = [
        {
          id: 'app_pending',
          role: UserRole.TEACHER,
          status: RoleApplicationStatus.PENDING,
          appliedAt: '2025-01-01T00:00:00.000Z',
        },
      ];
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: mockApplications });

      // When & Then
      await expect(applyForRole(mockUser.id, UserRole.TEACHER)).rejects.toThrow(
        'You already have a pending role application'
      );
    });

    it('should allow applying for different role when current role is not target', async () => {
      // Given
      const mockUser = createParentUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });
      (setCache as Mock).mockResolvedValue(undefined);
      (CacheKeys.roleApplication as Mock).mockReturnValue(`roleapp:${mockUser.id}`);

      // When
      const result = await applyForRole(mockUser.id, UserRole.TEACHER);

      // Then
      expect(result.role).toBe(UserRole.TEACHER);
    });

    it('should include reason in application', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });
      (setCache as Mock).mockResolvedValue(undefined);
      (CacheKeys.roleApplication as Mock).mockReturnValue(`roleapp:${mockUser.id}`);

      const reason = 'I want to share my knowledge';

      // When
      const result = await applyForRole(mockUser.id, UserRole.TEACHER, reason);

      // Then
      expect(result).toBeDefined();
    });

    it('should work without reason', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(mockUser);
      (queryItems as Mock).mockResolvedValue({ items: [] });
      (setCache as Mock).mockResolvedValue(undefined);
      (CacheKeys.roleApplication as Mock).mockReturnValue(`roleapp:${mockUser.id}`);

      // When
      const result = await applyForRole(mockUser.id, UserRole.TEACHER);

      // Then
      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.TEACHER);
    });
  });

  describe('approveRoleApplication', () => {
    it('should throw error when admin not found', async () => {
      // Given
      const applicationId = 'app_123';
      const adminId = 'nonexistent_admin';
      (getItem as Mock).mockResolvedValue(null);

      // When & Then
      await expect(
        approveRoleApplication(applicationId, adminId, true, 'Approved')
      ).rejects.toThrow('Admin user not found');
    });

    it('should throw error for non-admin user', async () => {
      // Given
      const applicationId = 'app_123';
      const nonAdminId = 'regular_user';
      const nonAdminUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(nonAdminUser);

      // When & Then
      await expect(approveRoleApplication(applicationId, nonAdminId, true)).rejects.toThrow(
        'Only administrators can process role applications'
      );
    });

    it('should throw error when application not found', async () => {
      // Given
      const applicationId = 'nonexistent_app';
      const adminId = 'admin_user';
      const adminUser = createMockAdminUser();
      (getItem as Mock).mockResolvedValue(adminUser);
      (scanItems as Mock).mockResolvedValue({ items: [] });

      // When & Then
      await expect(approveRoleApplication(applicationId, adminId, true)).rejects.toThrow(
        'Role application not found'
      );
    });
  });

  describe('getPendingRoleApplications', () => {
    it('should return pending applications', async () => {
      // Given
      const adminId = 'admin_user';
      const adminUser = createMockAdminUser();
      (getItem as Mock).mockResolvedValue(adminUser);
      (scanItems as Mock).mockResolvedValue({ items: [] });

      // When
      const result = await getPendingRoleApplications(adminId);

      // Then
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept custom limit', async () => {
      // Given
      const adminId = 'admin_user';
      const adminUser = createMockAdminUser();
      (getItem as Mock).mockResolvedValue(adminUser);
      (scanItems as Mock).mockResolvedValue({ items: [] });

      // When
      const result = await getPendingRoleApplications(adminId, 25);

      // Then
      expect(result).toBeDefined();
    });

    it('should throw error for non-admin user', async () => {
      // Given
      const adminId = 'regular_user';
      const nonAdminUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(nonAdminUser);

      // When & Then
      await expect(getPendingRoleApplications(adminId)).rejects.toThrow(
        'Only administrators can view pending applications'
      );
    });
  });

  describe('userHasRole', () => {
    it('should return true when user has the role', () => {
      const mockUser = createMockTeacherUser();
      expect(userHasRole(mockUser, UserRole.TEACHER)).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      const mockUser = createMockStudentUser();
      expect(userHasRole(mockUser, UserRole.TEACHER)).toBe(false);
    });

    it('should return true for PARENT role', () => {
      const mockUser = createMockActiveUser();
      expect(userHasRole(mockUser, UserRole.PARENT)).toBe(true);
    });

    it('should return true for ADMIN role', () => {
      const mockUser = createMockAdminUser();
      expect(userHasRole(mockUser, UserRole.ADMIN)).toBe(true);
    });
  });

  describe('userHasAnyRole', () => {
    it('should return true when user has any of the roles', () => {
      const mockUser = createMockTeacherUser();
      expect(userHasAnyRole(mockUser, [UserRole.TEACHER, UserRole.ADMIN])).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      const mockUser = createMockStudentUser();
      expect(userHasAnyRole(mockUser, [UserRole.TEACHER, UserRole.ADMIN])).toBe(false);
    });

    it('should return true for empty array of roles', () => {
      const mockUser = createMockActiveUser();
      expect(userHasAnyRole(mockUser, [])).toBe(false);
    });
  });

  describe('userIsAdmin', () => {
    it('should return true for admin user', () => {
      const mockUser = createMockAdminUser();
      expect(userIsAdmin(mockUser)).toBe(true);
    });

    it('should return false for non-admin user', () => {
      const mockUser = createMockActiveUser();
      expect(userIsAdmin(mockUser)).toBe(false);
    });

    it('should return false for teacher user', () => {
      const mockUser = createMockTeacherUser();
      expect(userIsAdmin(mockUser)).toBe(false);
    });

    it('should return false for student user', () => {
      const mockUser = createMockStudentUser();
      expect(userIsAdmin(mockUser)).toBe(false);
    });
  });
});

// Helper function to create parent user for tests
function createParentUser(overrides: Partial<ReturnType<typeof createMockUser>> = {}) {
  return createMockUser({
    id: 'usr_parent_test',
    email: 'parent@example.com',
    name: 'Parent Test User',
    role: UserRole.PARENT,
    ...overrides,
  });
}

describe('Role Application History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLoggerMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getApplicationHistory', () => {
    it('should return application history sorted by createdAt desc', async () => {
      // Given
      const applicationId = 'app_123';
      const mockApplication = {
        PK: 'USER#user_123',
        SK: 'ROLE#app_123',
        entityType: 'ROLE_APPLICATION',
        id: applicationId,
      };
      const mockHistory = [
        {
          id: 'hist_1',
          applicationId,
          action: 'SUBMITTED',
          performedBy: 'user_123',
          createdAt: '2025-01-01T10:00:00.000Z',
        },
        {
          id: 'hist_2',
          applicationId,
          action: 'APPROVED',
          performedBy: 'admin_123',
          createdAt: '2025-01-02T10:00:00.000Z',
        },
      ];
      (scanItems as Mock)
        .mockResolvedValueOnce({ items: [mockApplication] })
        .mockResolvedValue({ items: mockHistory });

      // When
      const result = await getApplicationHistory(applicationId);

      // Then
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].action).toBe('APPROVED'); // Most recent first
      expect(result[1].action).toBe('SUBMITTED');
    });

    it('should return empty array when no history exists', async () => {
      // Given
      const applicationId = 'app_123';
      const mockApplication = {
        PK: 'USER#user_123',
        SK: 'ROLE#app_123',
        entityType: 'ROLE_APPLICATION',
        id: applicationId,
      };
      (scanItems as Mock)
        .mockResolvedValueOnce({ items: [mockApplication] })
        .mockResolvedValue({ items: [] });

      // When
      const result = await getApplicationHistory(applicationId);

      // Then
      expect(result).toEqual([]);
    });

    it('should throw error when application not found', async () => {
      // Given
      const applicationId = 'nonexistent_app';
      (scanItems as Mock).mockResolvedValue({ items: [] });

      // When & Then
      await expect(getApplicationHistory(applicationId)).rejects.toThrow(
        'Role application not found'
      );
    });
  });

  describe('getApplicationDetail', () => {
    it('should return detailed application with history', async () => {
      // Given
      const applicationId = 'app_123';
      const mockUser = createMockActiveUser();
      const mockAdmin = createMockAdminUser();
      const mockApplication = {
        PK: 'USER#user_123',
        SK: 'ROLE#app_123',
        entityType: 'ROLE_APPLICATION',
        id: applicationId,
        userId: mockUser.id,
        role: UserRole.TEACHER,
        status: RoleApplicationStatus.APPROVED,
        reason: 'I want to teach',
        appliedAt: '2025-01-01T10:00:00.000Z',
        processedAt: '2025-01-02T10:00:00.000Z',
        processedBy: mockAdmin.id,
        comment: 'Approved',
      };
      const mockHistory = [
        {
          id: 'hist_1',
          applicationId,
          action: 'SUBMITTED',
          performedBy: mockUser.id,
          createdAt: '2025-01-01T10:00:00.000Z',
        },
        {
          id: 'hist_2',
          applicationId,
          action: 'APPROVED',
          performedBy: mockAdmin.id,
          createdAt: '2025-01-02T10:00:00.000Z',
        },
      ];

      (scanItems as Mock)
        .mockResolvedValueOnce({ items: [mockApplication] }) // First scan for application
        .mockResolvedValue({ items: [mockUser] }) // Get user
        .mockResolvedValue({ items: mockHistory }); // Get history

      (getItem as Mock).mockResolvedValueOnce(mockUser).mockResolvedValueOnce(mockAdmin);

      // When
      const result = await getApplicationDetail(applicationId);

      // Then
      expect(result).toBeDefined();
      expect(result.applicationId).toBe(applicationId);
      expect(result.userId).toBe(mockUser.id);
      expect(result.role).toBe(UserRole.TEACHER);
      expect(result.status).toBe(RoleApplicationStatus.APPROVED);
      expect(result.history.length).toBe(2);
    });

    it('should throw error when application not found', async () => {
      // Given
      const applicationId = 'nonexistent_app';
      (scanItems as Mock).mockResolvedValue({ items: [] });

      // When & Then
      await expect(getApplicationDetail(applicationId)).rejects.toThrow(
        'Role application not found'
      );
    });
  });

  describe('getUserApplications', () => {
    it('should return all user applications with history', async () => {
      // Given
      const userId = 'user_123';
      const mockApplications = [
        {
          PK: `USER#${userId}`,
          SK: 'ROLE#app_1',
          entityType: 'ROLE_APPLICATION',
          id: 'app_1',
          userId,
          role: UserRole.TEACHER,
          status: RoleApplicationStatus.PENDING,
          appliedAt: '2025-01-01T10:00:00.000Z',
        },
        {
          PK: `USER#${userId}`,
          SK: 'ROLE#app_2',
          entityType: 'ROLE_APPLICATION',
          id: 'app_2',
          userId,
          role: UserRole.INSTITUTION,
          status: RoleApplicationStatus.APPROVED,
          appliedAt: '2024-12-01T10:00:00.000Z',
        },
      ];
      const mockHistory = [];

      (queryItems as Mock).mockResolvedValue({ items: mockApplications });
      // Each call to getApplicationHistory scans for application then history
      (scanItems as Mock)
        .mockResolvedValueOnce({ items: [mockApplications[0]] }) // app_1 application
        .mockResolvedValueOnce({ items: mockHistory }) // app_1 history
        .mockResolvedValueOnce({ items: [mockApplications[1]] }) // app_2 application
        .mockResolvedValueOnce({ items: mockHistory }); // app_2 history

      // When
      const result = await getUserApplications(userId);

      // Then
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      // Sorted by appliedAt desc
      expect(result[0].role).toBe(UserRole.TEACHER);
      expect(result[1].role).toBe(UserRole.INSTITUTION);
    });

    it('should return empty array when user has no applications', async () => {
      // Given
      const userId = 'user_new';
      (queryItems as Mock).mockResolvedValue({ items: [] });

      // When
      const result = await getUserApplications(userId);

      // Then
      expect(result).toEqual([]);
    });

    it('should include history for each application', async () => {
      // Given
      const userId = 'user_123';
      const mockApplications = [
        {
          PK: `USER#${userId}`,
          SK: 'ROLE#app_1',
          entityType: 'ROLE_APPLICATION',
          id: 'app_1',
          userId,
          role: UserRole.TEACHER,
          status: RoleApplicationStatus.APPROVED,
          appliedAt: '2025-01-01T10:00:00.000Z',
        },
      ];
      const mockHistory = [
        {
          id: 'hist_1',
          applicationId: 'app_1',
          action: 'SUBMITTED',
          performedBy: userId,
          createdAt: '2025-01-01T10:00:00.000Z',
        },
      ];

      (queryItems as Mock).mockResolvedValue({ items: mockApplications });
      (scanItems as Mock).mockResolvedValue({ items: mockHistory });

      // When
      const result = await getUserApplications(userId);

      // Then
      expect(result[0].history.length).toBe(1);
      expect(result[0].history[0].action).toBe('SUBMITTED');
    });
  });
});
