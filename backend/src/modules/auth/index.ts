/**
 * Auth Module Index
 */

export * from './auth.types';
export { authRoutes } from './routes';

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
