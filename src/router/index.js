import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'
import ComingSoonView from '../views/ComingSoonView.vue'
import EventsView from '../views/EventsView.vue'
import BookingView from '../views/BookingView.vue'
import ConfirmationView from '../views/ConfirmationView.vue'
import TransactionView from '../views/TransactionView.vue'
import HelpView from '../views/HelpView.vue'
import { authState } from '../store/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/events', name: 'events', component: EventsView },
    { path: '/booking/:slug', name: 'booking', component: BookingView },
    { path: '/shuttlebus/:slug', name: 'shuttlebus-detail', component: () => import('../views/ShuttleBusDetailView.vue') },
    { path: '/transaksi', name: 'transaksi', component: TransactionView, meta: { requiresAuth: true } },
    { path: '/confirmation', name: 'confirmation', component: ConfirmationView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
    { path: '/shuttle-invoice/:invoice_no', name: 'invoice', component: () => import('../views/InvoiceView.vue'), meta: { requiresAuth: true } },
    { path: '/rental-mobil', name: 'rental-mobil', component: () => import('../views/RentalMobilView.vue') },
    { path: '/rental-mobil/:slug', name: 'rental-mobil-detail', component: ComingSoonView },
    { path: '/hotel', name: 'hotel', component: ComingSoonView },
    { path: '/hotel/:slug', name: 'hotel-detail', component: ComingSoonView },
    { path: '/tiket-pesawat', name: 'tiket-pesawat', component: ComingSoonView },
    { path: '/tiket-pesawat/:id', name: 'tiket-pesawat-detail', component: ComingSoonView },
    { path: '/coming-soon', name: 'coming-soon', component: ComingSoonView },
    { path: '/profile', name: 'profile', component: ProfileView },
    { path: '/profile/payments', name: 'profile-payments', component: ComingSoonView, meta: { requiresAuth: true } },
    { path: '/profile/notifications', name: 'profile-notif', component: ComingSoonView, meta: { requiresAuth: true } },
    { path: '/profile/security', name: 'profile-security', component: ComingSoonView, meta: { requiresAuth: true } },
    { path: '/profile/settings', name: 'profile-settings', component: ComingSoonView, meta: { requiresAuth: true } },
    { path: '/profile/help', redirect: '/help' },
    { path: '/help', name: 'help', component: HelpView },
    { path: '/portfolio', name: 'portfolio', component: () => import('../views/PortfolioView.vue') },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authState.isLoggedIn) {
      next('/login');
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router
