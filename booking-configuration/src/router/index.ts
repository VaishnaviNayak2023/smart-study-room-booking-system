import { defineRouter } from '#q-app';
import type { RouteRecordRaw } from 'vue-router';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import LoginPage from '@/pages/LoginPage.vue';
import AdminDashboard from '@/pages/AdminDashboard.vue';
import UserDashboardPage from '@/pages/UserDashboardPage.vue';
import BookingsPage from '@/pages/Bookings.vue';
import ResourceTypes from '@/pages/ResourceTypes.vue';
import ManageResources from '@/pages/ManageResources.vue';
import PricingRules from '@/pages/PricingRules.vue';
import Reports from '@/pages/Reports.vue';
import SettingsPage from '@/pages/Settings.vue';
import RegisterPage from '@/pages/Register.vue';
import ProfilePage from '@/pages/Profile.vue';
import BrowseRooms from '@/pages/BrowseRooms.vue';
import MyBookings from '@/pages/MyBookings.vue';
import NotificationsPage from '@/pages/Notifications.vue';
import UserSettingsPage from '@/pages/UserSettings.vue';
import ErrorNotFound from '@/pages/ErrorNotFound.vue';
import { useStudyroomStore } from '@/stores/studyroom-store';

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const routes: RouteRecordRaw[] = [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginPage, meta: { public: true } },
    { path: '/register', component: RegisterPage, meta: { public: true } },

    // User routes
    { path: '/dashboard', component: UserDashboardPage, meta: { requiresAuth: true } },
    {
      path: '/browse-rooms',
      name: 'browse-rooms',
      component: BrowseRooms,
      meta: { requiresAuth: true },
    },
    { path: '/my-bookings', component: MyBookings, meta: { requiresAuth: true } },
    { path: '/profile', component: ProfilePage, meta: { requiresAuth: true } },
    { path: '/notifications', component: NotificationsPage, meta: { requiresAuth: true } },
    { path: '/user-settings', component: UserSettingsPage, meta: { requiresAuth: true } },

    // Admin routes
    {
      path: '/admin-dashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/bookings',
      component: BookingsPage,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/resource-types',
      component: ResourceTypes,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/manage-resources',
      component: ManageResources,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/pricing-rules',
      name: 'pricing-rules',
      component: PricingRules,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/reports',
      component: Reports,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/settings',
      component: SettingsPage,
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    { path: '/resources', redirect: '/browse-rooms' },

    { path: '/:catchAll(.*)*', component: ErrorNotFound },
  ];

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  // Auth + role guard
  let sessionValidated = false;

  Router.beforeEach(async (to) => {
    const studyroomStore = useStudyroomStore();

    if (!sessionValidated) {
      sessionValidated = true;
      await studyroomStore.validateSession();
    }

    if (to.path === '/login' || to.path === '/register') {
      if (studyroomStore.currentUser) {
        return {
          path: studyroomStore.currentUser.role === 'admin' ? '/admin-dashboard' : '/dashboard',
        };
      }
      return true;
    }

    const isLoggedIn = !!studyroomStore.currentUser;
    const userRole = studyroomStore.currentUser?.role;

    // Public pages (login/register) stay accessible so users can sign in or
    // register even if a previous session exists. Only redirect from other public
    // routes such as the site root to the appropriate dashboard.
    if (to.meta.public) {
      if (!isLoggedIn) {
        return true;
      }

      if (to.path === '/login' || to.path === '/register') {
        return true;
      }

      return {
        path: userRole === 'admin' ? '/admin-dashboard' : '/dashboard',
      };
    }

    // Protected pages — require login
    if (!isLoggedIn) {
      return { path: '/login' };
    }

    // Role-restricted pages — send to their own dashboard if not allowed
    const allowedRoles = to.meta.roles as string[] | undefined;
    if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
      return {
        path: userRole === 'admin' ? '/admin-dashboard' : '/dashboard',
      };
    }

    return true;
  });

  // enable HMR for it
  if (import.meta.hot) {
    import.meta.hot.accept(() => {});
  }

  return Router;
});
