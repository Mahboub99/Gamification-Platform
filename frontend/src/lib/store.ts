import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  experiencePoints: number;
  currentLevel: number;
  totalBadges: number;
  totalAchievements: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      login: (user, token) => {
        // Save token to localStorage for API access
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        }
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },
      logout: () => {
        // Remove token from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
      setUser: (user) =>
        set((state) => ({
          ...state,
          user,
        })),
      setLoading: (isLoading) =>
        set((state) => ({
          ...state,
          isLoading,
        })),
      initializeAuth: () => {
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('token');
          const state = get();
          
          console.log('Initializing auth:', {
            storedToken: !!storedToken,
            stateToken: !!state.token,
            isAuthenticated: state.isAuthenticated,
            hasUser: !!state.user
          });

          // If we have a stored token but no state, restore from localStorage
          if (storedToken && !state.token) {
            // Try to get user data from localStorage or make an API call
            const userData = localStorage.getItem('user');
            if (userData) {
              try {
                const user = JSON.parse(userData);
                set({
                  user,
                  token: storedToken,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } catch (error) {
                console.error('Error parsing user data:', error);
              }
            }
          }
        }
        set({ isHydrated: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Store rehydrated:', state);
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
    }),
    {
      name: 'theme-storage',
    }
  )
); 