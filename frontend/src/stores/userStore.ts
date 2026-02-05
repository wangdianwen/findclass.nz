import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TeacherInfo {
  id: string;
  bio: string;
  teachingYears: number;
  verified: boolean;
  rating: number;
  reviewCount: number;
  subjects: string[];
  teachingModes: string[];
  studentsCount: number;
  coursesCount: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
  isTeacher: boolean;
  teacherInfo: TeacherInfo | null;
  createdAt: string;
}

interface UserState {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    set => ({
      user: null,
      isLoggedIn: false,
      setUser: user => set({ user, isLoggedIn: true }),
      clearUser: () => set({ user: null, isLoggedIn: false }),
      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isLoggedIn: false });
      },
    }),
    {
      name: 'user-storage',
      partialize: state => ({ user: state.user, isLoggedIn: state.isLoggedIn }),
    }
  )
);

// Selector hooks for better performance
export const useUser = () => useUserStore(state => state.user);
export const useIsLoggedIn = () => useUserStore(state => state.isLoggedIn);
export const useIsTeacher = () => useUserStore(state => state.user?.isTeacher ?? false);
