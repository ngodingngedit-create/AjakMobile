<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Splash from './components/Splash.vue';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import MobileNav from './components/MobileNav.vue';
import LoadingScreen from './components/LoadingScreen.vue';
import { bookingStore } from './store/booking';

const appReady = ref(true); // DEBUG: bypass splash
const router = useRouter();

const isMobile = ref(window.innerWidth <= 768);
const updateMobileStatus = () => {
  isMobile.value = window.innerWidth <= 768;
};

// Global route transitions loader on mobile view
router.beforeEach((to, from, next) => {
  if (window.innerWidth <= 768 && to.path !== from.path) {
    bookingStore.isLoading = true;
  }
  next();
});

router.afterEach((to, from) => {
  if (window.innerWidth <= 768) {
    // Only auto-resolve if NOT heading to details route (they fetch data and self-resolve)
    const isDetailRoute = to.name === 'booking' || to.name === 'shuttlebus-detail';
    if (!isDetailRoute) {
      setTimeout(() => {
        bookingStore.isLoading = false;
      }, 800);
    }
  } else {
    bookingStore.isLoading = false;
  }
});

const onSplashReady = () => {
  appReady.value = true;
};

onMounted(() => {
  window.addEventListener('resize', updateMobileStatus);
  setTimeout(() => {
    appReady.value = true;
  }, 4000);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileStatus);
});
</script>

<template>
  <Splash @ready="onSplashReady" />
  
  <div v-show="appReady" class="app-container">
    <Navbar v-if="$route.path !== '/portfolio'" />
    
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <Footer v-if="$route.path !== '/portfolio' && !$route.path.startsWith('/booking') && $route.path !== '/transaksi'" />
    <MobileNav v-if="$route.path !== '/portfolio' && !$route.path.startsWith('/booking') && $route.path !== '/transaksi'" />
  </div>

  <LoadingScreen :show="bookingStore.isLoading" />
</template>

<style>
/* App Layout */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

/* Route transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
