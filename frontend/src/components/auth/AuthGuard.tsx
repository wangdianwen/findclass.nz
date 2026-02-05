import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore, useIsTeacher } from '@/stores/userStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireTeacher?: boolean;
}

/**
 * Protect routes based on authentication state
 *
 * @param requireAuth - If true, redirect to login if not authenticated
 * @param requireTeacher - If true, redirect to home if not a teacher
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireTeacher = false,
}) => {
  const isLoggedIn = useUserStore(state => state.isLoggedIn);
  const user = useUserStore(state => state.user);
  const isTeacher = useIsTeacher();
  const location = useLocation();

  // Check if user data needs to be fetched (for persisted sessions)
  useEffect(() => {
    if (isLoggedIn && !user) {
      // User is logged in but no user data - fetch it
      // This handles page refresh with persisted login state
      import('@/services/api').then(({ authApi }) => {
        authApi.getMe().then(result => {
          if (result.success && result.data) {
            useUserStore.getState().setUser(result.data);
          }
        }).catch(() => {
          // Token expired, clear session
          useUserStore.getState().logout();
        });
      });
    }
  }, [isLoggedIn, user]);

  // Require authentication
  if (requireAuth && !isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Require teacher role
  if (requireTeacher && !isTeacher) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Guest guard - redirect to home if already logged in
 * Used for login/register pages
 */
export const GuestGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = useUserStore(state => state.isLoggedIn);

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
