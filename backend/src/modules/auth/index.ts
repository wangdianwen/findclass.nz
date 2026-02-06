/**
 * Auth Module Index
 */

export * from './auth.types';
export { authRoutes } from './routes';

// Export repositories
export {
  UserRepository,
  type User,
  type CreateUserDTO,
  type UpdateUserDTO,
} from './user.repository';

export {
  SessionRepository,
  type Session,
  type CreateSessionDTO,
  hashToken,
} from './session.repository';

export {
  VerificationCodeRepository,
  type VerificationCode,
  type CreateVerificationCodeDTO,
} from './verification.repository';

export {
  RoleApplicationRepository,
  type RoleApplication,
  type CreateRoleApplicationDTO,
  type ApplicationStatus,
} from './role-application.repository';

// Export function-based controllers
export {
  registerController,
  loginController,
  sendVerificationCodeController,
  verifyCodeController,
  refreshTokenController,
  logoutController,
  getCurrentUserController,
  updateCurrentUserController,
  passwordResetRequestController,
  passwordResetController,
  // RBAC controllers
  getMyRolesController,
  applyRoleController,
  approveRoleApplicationController,
  cancelRoleApplicationController,
  getPendingRoleApplicationsController,
} from './auth.controller';

// Re-export service functions
export {
  register,
  login,
  sendVerificationCode,
  verifyCode,
  rotateRefreshToken,
  logout,
  getCurrentUser,
  updateCurrentUser,
  requestPasswordReset,
  resetPassword,
  getUserByEmail,
  getUserById,
  generateVerificationCode,
  // RBAC service functions
  getUserRoles,
  applyForRole,
  approveRoleApplication,
  cancelRoleApplication,
  getPendingRoleApplications,
  userHasRole,
  userHasAnyRole,
  userIsAdmin,
} from './auth.service';
