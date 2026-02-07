import { useCallback } from 'react';
import { useUserStore } from '@/stores/userStore';
import { authApi } from '@/services/api';

export function useAuth() {
  const { user, isLoggedIn, setUser, logout } = useUserStore();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      if (result.success && result.data) {
        localStorage.setItem('auth_token', result.data.accessToken);
        if (result.data.refreshToken) {
          localStorage.setItem('refresh_token', result.data.refreshToken);
        }
        // Fetch user info after login
        const userResult = await authApi.getMe();
        if (userResult.success && userResult.data) {
          setUser(userResult.data);
        }
        return { success: true };
      }
      return { success: false, message: result.message };
    },
    [setUser]
  );

  const register = useCallback(
    async (email: string, password: string, code: string) => {
      const result = await authApi.register({ email, password, code });
      if (result.success && result.data) {
        localStorage.setItem('auth_token', result.data.accessToken);
        if (result.data.refreshToken) {
          localStorage.setItem('refresh_token', result.data.refreshToken);
        }
        // Fetch user info after register
        const userResult = await authApi.getMe();
        if (userResult.success && userResult.data) {
          setUser(userResult.data);
        }
        return { success: true };
      }
      return { success: false, message: result.message };
    },
    [setUser]
  );

  const fetchUser = useCallback(async () => {
    try {
      const result = await authApi.getMe();
      if (result.success && result.data) {
        setUser(result.data);
        return { success: true, user: result.data };
      }
    } catch {
      // Not logged in or token expired
      logout();
    }
    return { success: false };
  }, [setUser, logout]);

  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;

    try {
      const result = await authApi.refresh({ refreshToken: refresh });
      if (result.success && result.data) {
        localStorage.setItem('auth_token', result.data.accessToken);
        return true;
      }
    } catch {
      logout();
    }
    return false;
  }, [logout]);

  const socialLogin = useCallback(
    async (provider: 'google' | 'wechat', credential?: string) => {
      const result = await authApi.socialLogin(provider, credential);
      if (result.success && result.data) {
        localStorage.setItem('auth_token', result.data.accessToken);
        if (result.data.refreshToken) {
          localStorage.setItem('refresh_token', result.data.refreshToken);
        }
        // Fetch user info after social login
        const userResult = await authApi.getMe();
        if (userResult.success && userResult.data) {
          setUser(userResult.data);
        }
        return { success: true };
      }
      return { success: false, message: result.message };
    },
    [setUser]
  );

  return {
    user,
    isLoggedIn,
    isTeacher: user?.isTeacher ?? false,
    login,
    register,
    logout,
    fetchUser,
    refreshToken,
    socialLogin,
  };
}
