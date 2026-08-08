import { defineStore, acceptHMRUpdate } from 'pinia';
import api, {
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '@/services/api';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface LoginResult {
  user: User;
  token: string;
}

export const useStudyroomStore = defineStore('studyroom', {
  state: () => ({
    currentUser: (getStoredUser() as User | null) ?? null,
    authToken: getToken() ?? null,
    loading: false,
  }),

  actions: {
    /** Initializes auth state from persisted localStorage on app boot. */
    init() {
      const stored = getStoredUser() as User | null;
      const token = getToken();
      if (!stored || !token) {
        clearToken();
        this.currentUser = null;
        this.authToken = null;
      } else {
        this.currentUser = stored;
        this.authToken = token;
      }
    },

    /**
     * Validates the stored token against the backend and refreshes the stored
     * user. Returns true if the session is still valid, false otherwise.
     * On failure (expired/invalid token) the session is cleared so the login
     * page is shown instead of skipping straight to the dashboard.
     */
    async validateSession(): Promise<boolean> {
      if (!this.authToken) {
        this.logout();
        return false;
      }
      try {
        const { data } = await api.get<{ user: User }>('/auth/me');
        this.currentUser = data.user;
        setStoredUser(data.user);
        return true;
      } catch {
        this.logout();
        return false;
      }
    },

async login(email: string, password: string, role: 'admin' | 'user') {
      this.loading = true;
      try {
        const { data } = await api.post<LoginResult>('/auth/login', { email, password, role });
        this.currentUser = data.user;
        this.authToken = data.token;
        setToken(data.token);
        setStoredUser(data.user);
        return data.user;
      } finally {
        this.loading = false;
      }
    },

    async register(email: string, password: string, name = '', role: 'admin' | 'user' = 'user') {
      this.loading = true;
      try {
        const { data } = await api.post<LoginResult>('/auth/register', {
          email,
          password,
          name,
          role,
        });
        this.currentUser = data.user;
        this.authToken = data.token;
        setToken(data.token);
        setStoredUser(data.user);
        return data.user;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      clearToken();
      this.currentUser = null;
      this.authToken = null;
    },

    async updateProfile(payload: {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    }): Promise<User> {
      const { data } = await api.put<{ user: User }>('/auth/profile', payload);
      this.currentUser = data.user;
      setStoredUser(data.user);
      return data.user;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStudyroomStore, import.meta.hot));
}

