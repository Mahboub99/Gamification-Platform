import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Request - Token:', token ? 'Present' : 'Missing');
    console.log('API Request - URL:', config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Request - Authorization header set');
    } else {
      console.log('API Request - No token found in localStorage');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials),
    register: (userData: {
      username: string;
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => apiClient.post('/auth/register', userData),
    profile: () => apiClient.get('/auth/profile'),
    updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  },
  users: {
    getAll: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/users', { params }),
    getById: (id: number) => apiClient.get(`/users/${id}`),
    getStats: (id: number) => apiClient.get(`/users/${id}/stats`),
    getExperienceHistory: (id: number) => apiClient.get(`/users/${id}/experience`),
    update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
    delete: (id: number) => apiClient.delete(`/users/${id}`),
  },
  badges: {
    getAll: () => apiClient.get('/badges'),
    getById: (id: number) => apiClient.get(`/badges/${id}`),
    create: (data: any) => apiClient.post('/badges', data),
    update: (id: number, data: any) => apiClient.put(`/badges/${id}`, data),
    delete: (id: number) => apiClient.delete(`/badges/${id}`),
    getUserBadges: (userId: number) => apiClient.get(`/badges/user/${userId}`),
    giveToUser: (userId: number, badgeId: number) => apiClient.post(`/badges/award`, { user_id: userId, badge_id: badgeId }),
  },
  leaderboards: {
    getLevels: () => apiClient.get('/leaderboards/levels'),
    getExperience: () => apiClient.get('/leaderboards/experience'),
    getBadges: () => apiClient.get('/leaderboards/badges'),
    getAchievements: () => apiClient.get('/leaderboards/achievements'),
    getActivity: () => apiClient.get('/leaderboards/activity'),
    getUserPosition: (userId: number) =>
      apiClient.get(`/leaderboards/user/${userId}/position`),
  },
  activities: {
    getAll: () => apiClient.get('/activities'),
    getById: (id: number) => apiClient.get(`/activities/${id}`),
    complete: (id: number, userId: number) => apiClient.post(`/activities/${id}/complete`, { user_id: userId }),
    getUserActivities: () => apiClient.get('/activities/user'),
  },
  achievements: {
    getAll: () => apiClient.get('/achievements'),
    getById: (id: number) => apiClient.get(`/achievements/${id}`),
    create: (data: any) => apiClient.post('/achievements', data),
    update: (id: number, data: any) => apiClient.put(`/achievements/${id}`, data),
    delete: (id: number) => apiClient.delete(`/achievements/${id}`),
    getUserAchievements: (userId: number) =>
      apiClient.get(`/achievements/user/${userId}`),
  },
  levels: {
    getAll: () => apiClient.get('/levels'),
    getById: (id: number) => apiClient.get(`/levels/${id}`),
    create: (data: any) => apiClient.post('/levels', data),
    update: (id: number, data: any) => apiClient.put(`/levels/${id}`, data),
    delete: (id: number) => apiClient.delete(`/levels/${id}`),
  },
};

export default apiClient; 