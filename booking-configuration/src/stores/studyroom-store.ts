import { defineStore, acceptHMRUpdate } from 'pinia';

interface User {
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export const useStudyroomStore = defineStore('studyroom', {
  state: () => ({
    users: [
      {
        email: 'admin@example.com',
        password: 'Admin@123',
        role: 'admin' as const,
      },
      {
        email: 'user@example.com',
        password: 'User@123',
        role: 'user' as const,
      },
    ] as User[],
    currentUser: null as User | null,
  }),

  actions: {
    login(email: string, password: string, role: 'admin' | 'user') {
      const normalizedEmail = email.trim().toLowerCase();
      const user = this.users.find(
        (item) =>
          item.email.toLowerCase() === normalizedEmail &&
          item.password === password &&
          item.role === role,
      );

      if (!user) {
        return null;
      }

      this.currentUser = user;
      return { role: user.role };
    },

    register(email: string, password: string, role: 'admin' | 'user' = 'user') {
      const normalizedEmail = email.trim().toLowerCase();
      const exists = this.users.some((u) => u.email.toLowerCase() === normalizedEmail);
      if (exists) {
        return null;
      }

      const user: User = { email: normalizedEmail, password, role };
      this.users.push(user);
      this.currentUser = user;
      return { role };
    },

    logout() {
      this.currentUser = null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStudyroomStore, import.meta.hot));
}
