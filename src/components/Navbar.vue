<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { authState } from '../store/auth';
import { themeStore } from '../store/theme';
import { User, LogOut, Search, X, Moon, Sun, Home, Calendar, Layers, MapPin, Info, Menu, FileText, Headphones, SlidersHorizontal } from 'lucide-vue-next';
import { showEventsFilter } from '../store/filters';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const scrollSection = ref('');   // only tracks scroll sections on home page
const scrolled = ref(false);
const searchOpen = ref(false);
const searchQuery = ref('');
const sidebarOpen = ref(false);
const showTermsModal = ref(false);

const termsList = [
  "Tiket yang sudah dibeli tidak bisa di refund, terkecuali ada pembatalan dari pihak penyelenggara konser atau force major",
  "Customer wajib datang tepat waktu sesuai Schedule Shuttle",
  "Keterlambatan tanpa informasi lebih dari 10 menit di anggap tidak ada / cancel otomatis",
  "Customer dilarang merokok, menggunakan rokok elektrik/sejenisnya di dalam shuttle bus",
  "Customer dilarang membawa senjata tajam dan senjata api atau sejenisnya di dalam shuttle bus",
  "Tidak menerima pembelian tiket shuttle dalam pembayaran uang tunai/cash",
  "Tidak menerima penitipan barang customer didalam shuttle bus"
];

// Language State
const languages = [
  { code: 'id', name: 'Bahasa', flag: 'https://flagpedia.net/data/flags/h80/id.png' },
  { code: 'en', name: 'English', flag: 'https://flagpedia.net/data/flags/h80/us.png' }
];
const currentLang = ref(languages[0]);
const langDropdownOpen = ref(false);
const selectLang = (lang) => { currentLang.value = lang; langDropdownOpen.value = false; };

const handleLogout = () => { authState.logout(); router.push('/'); };

// Nav links — two types:
//   isRoute: true  → navigate to `to`, active = route.path match
//   isRoute: false → scroll to section id on home page, active = scroll position
const navLinks = [
  { id: 'home',      label: 'Beranda',     icon: Home,     isRoute: true,  to: '/' },
  { id: 'events',    label: 'Event',       icon: Calendar, isRoute: true,  to: '/events' },
  { id: 'services',  label: 'Layanan',     icon: Layers,   isRoute: false },
  { id: 'discovery', label: 'Penjemputan', icon: MapPin,   isRoute: false },
  { id: 'Tentang',   label: 'Tentang',     icon: Info,     isRoute: false },
];

const isOnHome = computed(() => route.path === '/');

// Active detection — clean logic
const isLinkActive = (link) => {
  if (link.id === 'home') {
    // Active only when on home AND no scroll section is active
    return route.path === '/' && !scrollSection.value;
  }
  if (link.id === 'events') {
    return route.path === '/events' ||
           route.path.startsWith('/booking') ||
           route.path === '/confirmation';
  }
  // Scroll sections only active on home page
  if (!isOnHome.value) return false;
  return scrollSection.value === link.id;
};

// Scroll tracking — only relevant on home page
const onScroll = () => {
  scrolled.value = window.scrollY > 40;
  if (!isOnHome.value) return;
  const sections = ['services', 'discovery', 'Tentang', 'reviews'];
  let found = '';
  for (const id of sections) {
    const el = document.getElementById(id);
    if (el && window.scrollY + 160 >= el.offsetTop) found = id;
  }
  scrollSection.value = found;
};

// Reset scroll tracking when leaving home
watch(isOnHome, (val) => { if (!val) scrollSection.value = ''; });

// Navigation handler
const handleNav = (link) => {
  if (link.isRoute) {
    router.push(link.to);
    return;
  }
  // Scroll-based links
  if (!isOnHome.value) {
    // Go home first, then scroll after route settles
    router.push('/').then(() => {
      setTimeout(() => {
        const el = document.getElementById(link.id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    });
    return;
  }
  const el = document.getElementById(link.id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

const toggleSearch = () => {
  searchOpen.value = !searchOpen.value;
  if (searchOpen.value) setTimeout(() => document.getElementById('navbar-search-input')?.focus(), 100);
  else searchQuery.value = '';
};

const handleSearchSubmit = () => {
  if (!searchQuery.value.trim()) return;
  router.push(`/events?q=${encodeURIComponent(searchQuery.value)}`);
  searchOpen.value = false;
  searchQuery.value = '';
};

const isSearchFocused = ref(false);
const searchWords = ['Shuttle...', 'Tiket konser...', 'Rental mobil...', 'Hotel...', 'Tiket pesawat...'];
const currentWordIndex = ref(0);
const currentWord = computed(() => searchWords[currentWordIndex.value]);
let wordRotationInterval = null;

const goToProfile = () => {
  if (authState.isLoggedIn) {
    router.push('/dashboard');
  } else {
    router.push('/login');
  }
};

const goToHelp = () => {
  router.push('/help');
};

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  wordRotationInterval = setInterval(() => {
    currentWordIndex.value = (currentWordIndex.value + 1) % searchWords.length;
  }, 2500);
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  if (wordRotationInterval) clearInterval(wordRotationInterval);
});
</script>


<template>
  <header v-if="route.name !== 'shuttlebus-detail' && route.name !== 'booking' && route.name !== 'transaksi'" class="navbar" :class="{ 'scrolled': scrolled, 'no-shadow': route.name === 'help', 'transparent-home': isOnHome && !scrolled }">
    <div class="container navbar-content">
      <!-- Desktop Navbar Layout -->
      <div class="navbar-desktop-layout">
        <!-- Logo -->
        <router-link to="/" class="logo">
          <img src="/AJAKLogo/LOGO.png" alt="AJAK! Logo" class="logo-img" />
        </router-link>

        <!-- Desktop Nav Links (Non-Home Pages) -->
        <nav class="nav-links" v-if="!isOnHome">
          <button
            v-for="link in navLinks"
            :key="link.id"
            class="nav-item"
            :class="{ active: isLinkActive(link) }"
            @click="handleNav(link)"
          >
            <span class="nav-label-text">{{ link.label }}</span>
            <component :is="link.icon" size="18" class="nav-icon-mobile" />
            <span class="nav-dot" v-if="isLinkActive(link)"></span>
          </button>
        </nav>

        <!-- Desktop Center Search Bar (Homepage) -->
        <div class="header-center-search" v-if="isOnHome">
          <div class="search-box-center">
            <Search size="17" class="search-box-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari armada, rute, atau event konser favoritmu..."
              @keydown.enter="handleSearchSubmit"
            />
            <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">
              <X size="14" />
            </button>
          </div>
        </div>

        <!-- Right: Search + Language + Auth -->
        <div class="nav-auth">
          <!-- Search Bar (expandable on non-home pages) -->
          <div class="search-wrap" v-if="!isOnHome" :class="{ open: searchOpen }">
            <transition name="search-expand">
              <div v-if="searchOpen" class="search-box">
                <Search size="16" class="search-box-icon" />
                <input
                  id="navbar-search-input"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari event..."
                  @keydown.enter="handleSearchSubmit"
                  @keydown.escape="toggleSearch"
                />
              </div>
            </transition>
            <button class="icon-pill-btn search-toggle" @click="toggleSearch">
              <Search v-if="!searchOpen" size="18" />
              <X v-else size="18" />
            </button>
          </div>

          <!-- Theme Toggle -->
          <button
            class="icon-pill-btn theme-toggle-btn"
            :title="themeStore.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            @click="themeStore.toggle()"
          >
            <transition name="theme-icon" mode="out-in">
              <Moon v-if="!themeStore.isDark" key="moon" size="17" />
              <Sun v-else key="sun" size="17" />
            </transition>
          </button>

          <!-- Language Switcher (Visible in Mobile, replacing profile) -->
          <div class="lang-switcher">
            <button class="icon-pill-btn lang-btn" @click="langDropdownOpen = !langDropdownOpen">
              <img :src="currentLang.flag" :alt="currentLang.code" class="flag-img" />
            </button>
            <transition name="fade-drop">
              <div v-if="langDropdownOpen" class="lang-dropdown">
                <button v-for="lang in languages" :key="lang.code" class="lang-opt" @click="selectLang(lang)">
                  <img :src="lang.flag" class="flag-img" />
                  <span>{{ lang.name }}</span>
                </button>
              </div>
            </transition>
          </div>

          <!-- Hamburger Menu (Mobile Only) -->
          <button class="icon-pill-btn hamburger-btn" @click="sidebarOpen = true">
            <Menu size="18" />
          </button>

          <!-- Desktop Only Auth (Hidden on Mobile) -->
          <div class="desktop-auth-area">
            <template v-if="!authState.isLoggedIn">
              <router-link to="/login" class="btn btn-outline nav-btn" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 10px; height: 34px; display: flex; align-items: center;">Login</router-link>
            </template>
            <template v-else-if="authState.isLoggedIn">
              <router-link to="/dashboard" class="user-profile-nav">
                <div class="avatar-sm">
                  <User size="14" color="var(--primary)" />
                </div>
                <span class="user-name-label">{{ authState.user?.name }}</span>
              </router-link>
              <button @click="handleLogout" class="icon-pill-btn logout-btn" title="Logout">
                <LogOut size="18" />
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Mobile Navbar Layout (Pill Search + Profile) -->
      <div class="navbar-mobile-layout">
        <div class="mobile-nav-search-bar">
          <Search size="16" class="mobile-nav-search-icon" />
          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              @focus="isSearchFocused = true"
              @blur="isSearchFocused = false"
              @keydown.enter="handleSearchSubmit"
            />
            <div v-if="!searchQuery && !isSearchFocused" class="sliding-placeholder-container">
              <span class="animated-word-wrapper">
                <Transition name="placeholder-slide" mode="out-in">
                  <span :key="currentWord" class="animated-word">{{ currentWord }}</span>
                </Transition>
              </span>
            </div>
          </div>
          <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">
            <X size="12" />
          </button>
        </div>
        <button
          v-if="route.path === '/events'"
          class="mobile-nav-cs-btn"
          @click="showEventsFilter = !showEventsFilter"
          title="Filter"
        >
          <SlidersHorizontal size="18" class="mobile-nav-cs-icon" />
        </button>
        <button
          v-else
          class="mobile-nav-cs-btn"
          @click="goToHelp"
          title="Customer Service"
        >
          <Headphones size="18" class="mobile-nav-cs-icon" />
        </button>
      </div>
    </div>

    <!-- Mobile search bar (below navbar) -->
    <transition name="slide-down">
      <div v-if="searchOpen" class="mobile-search-bar">
        <div class="mob-srch-inner">
          <Search size="16" class="mob-srch-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari event, kota, atau layanan..."
            @keydown.enter="handleSearchSubmit"
          />
          <button @click="handleSearchSubmit" class="mob-go-btn">Cari</button>
        </div>
      </div>
    </transition>

    <!-- Mobile Sidebar -->
    <Teleport to="body">
      <transition name="slide-side">
        <div v-if="sidebarOpen" class="mobile-sidebar-overlay" @click="sidebarOpen = false">
          <div class="mobile-sidebar" @click.stop>
            <div class="sidebar-header">
              <img src="/AJAKLogo/LOGO.png" alt="AJAK! Logo" class="logo-img-sidebar" />
              <button class="icon-pill-btn" @click="sidebarOpen = false">
                <X size="18" />
              </button>
            </div>
            <div class="sidebar-search" style="margin-bottom: 16px;">
              <div class="search-box" style="margin: 0; width: 100%; border: 1.5px solid var(--border-color); background: rgba(0,0,0,0.02);">
                <Search size="16" class="search-box-icon" style="color: var(--text-light)" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari event..."
                  style="width: 100%; padding: 8px 0; border: none; background: transparent; outline: none; font-weight: 600; font-size: 0.9rem;"
                  @keydown.enter="handleSearchSubmit(); sidebarOpen = false;"
                />
              </div>
            </div>
            <div class="sidebar-links">
              <button
                v-for="link in navLinks"
                :key="link.id"
                class="sidebar-item"
                :class="{ active: isLinkActive(link) }"
                @click="handleNav(link); sidebarOpen = false;"
              >
                <component :is="link.icon" size="18" class="sidebar-icon" />
                <span>{{ link.label }}</span>
              </button>
              
              <button class="sidebar-item" @click="showTermsModal = true; sidebarOpen = false;">
                <FileText size="18" class="sidebar-icon" />
                <span>Terms and Condition</span>
              </button>
            </div>
            
            <div class="sidebar-footer">
              <!-- Auth -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                <template v-if="!authState.isLoggedIn">
                  <router-link to="/login" class="btn btn-outline" style="text-align:center; padding:10px; border-radius:12px; font-weight:700;" @click="sidebarOpen=false">Login</router-link>
                </template>
                <template v-else>
                  <div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(201,76,76,0.06); border-radius:12px; margin-bottom:4px;">
                    <div class="avatar-sm"><User size="16" color="var(--primary)" /></div>
                    <span style="font-weight:700; font-size:0.9rem;">{{ authState.user?.name }}</span>
                  </div>
                  <button @click="handleLogout(); sidebarOpen=false;" class="btn btn-primary" style="padding:10px; border-radius:12px; font-weight:700; display:flex; justify-content:center; gap:8px;">
                    <LogOut size="16" /> Logout
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Terms Modal -->
    <Teleport to="body">
      <transition name="fade-overlay">
        <div v-if="showTermsModal" class="modal-overlay" @click.self="showTermsModal = false">
          <div class="terms-modal">
            <div class="terms-header">
              <h3>Syarat dan Ketentuan</h3>
              <button class="icon-pill-btn" @click="showTermsModal = false"><X size="18" /></button>
            </div>
            <div class="terms-body">
              <ol class="terms-list">
                <li v-for="(term, index) in termsList" :key="index">{{ term }}</li>
              </ol>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </header>
</template>

<style scoped>
.navbar {
  background-color: var(--navbar-bg);
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  transition: background-color 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.12);
}
.navbar.scrolled {
  background-color: var(--navbar-scrolled-bg);
  box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.12);
  border-bottom-color: var(--border-color);
}
.navbar.no-shadow {
  box-shadow: none !important;
}
.navbar.transparent-home {
  background-color: transparent !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: none !important;
}
.navbar.transparent-home .logo-img {
  filter: brightness(0) invert(1);
}
.navbar.transparent-home .nav-item {
  color: #ffffff;
}
.navbar.transparent-home .nav-item:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.18);
}
.navbar.transparent-home .nav-item.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.28);
}
.navbar.transparent-home .nav-dot {
  background: #ffffff;
}
.navbar.transparent-home .icon-pill-btn {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}
.navbar.transparent-home .icon-pill-btn:hover {
  background: #ffffff;
  color: var(--primary);
}
.navbar.transparent-home .nav-btn {
  color: #ffffff !important;
  border-color: #ffffff !important;
  background: transparent !important;
}
.navbar.transparent-home .nav-btn:hover {
  background: #ffffff !important;
  color: var(--primary) !important;
  border-color: #ffffff !important;
}

/* Theme toggle */
.theme-toggle-btn { position: relative; overflow: hidden; }
.theme-icon-enter-active, .theme-icon-leave-active { transition: all 0.25s ease; }
.theme-icon-enter-from { opacity: 0; transform: rotate(-90deg) scale(0.5); }
.theme-icon-leave-to   { opacity: 0; transform: rotate(90deg) scale(0.5); }
.navbar-content {
  display: flex; justify-content: space-between; align-items: center;
  height: 68px; padding-top: 8px; gap: 20px;
}

/* Logo */
.logo { display: flex; align-items: center; flex: 1; justify-content: flex-start; }
.logo-img { height: 42px; width: auto; object-fit: contain; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

/* Nav Links */
.nav-links { display: flex; align-items: center; gap: 4px; justify-content: center; flex: 0 1 auto; }
.nav-item {
  position: relative; padding: 8px 16px; border-radius: 12px;
  font-weight: 600; font-size: 0.85rem; color: var(--text-dark);
  transition: color 0.2s ease, background-color 0.2s ease; background: transparent; border: none;
  cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center;
}
.nav-icon-mobile { display: none; }
.nav-item:hover { color: var(--primary); background: rgba(201, 76, 76, 0.07); }
.nav-item.active { color: var(--primary); background: rgba(201, 76, 76, 0.08); font-weight: 700; }
.nav-dot { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: var(--primary); }

/* Right area */
.nav-auth { display: flex; align-items: center; gap: 10px; flex: 1; justify-content: flex-end; }
.desktop-auth-area { display: flex; align-items: center; gap: 10px; }

/* REFINED ICON BUTTONS */
.icon-pill-btn {
  width: 40px; height: 40px; border-radius: 14px;
  background: rgba(201, 76, 76, 0.04); border: 1px solid rgba(201, 76, 76, 0.08);
  color: var(--primary); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 1.5, 0.6, 1);
  padding: 0;
}
.icon-pill-btn:hover { background: var(--primary); color: white; border-color: var(--primary); transform: translateY(-2px) scale(1.05); }
.icon-pill-btn:active { transform: scale(0.95); }

/* Language Switcher */
.lang-switcher { position: relative; }
.flag-img { width: 22px; height: 16px; border-radius: 4px; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.lang-dropdown {
  position: absolute; top: 110%; right: 0; margin-top: 8px;
  background: var(--card-bg); border-radius: 18px; padding: 8px;
  box-shadow: var(--shadow-lg); border: 1px solid var(--border-color);
  display: flex; flex-direction: column; gap: 6px; min-width: 130px;
}
.lang-opt {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  border-radius: 12px; border: none; background: transparent;
  cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 700;
  color: var(--text-dark);
  transition: all 0.2s;
}
.lang-opt:hover { background: rgba(201,76,76,0.06); color: var(--primary); }

/* Search Area */
.search-wrap { display: flex; align-items: center; }
.search-box {
  background: var(--input-bg); border-radius: 14px; padding: 0 16px;
  display: flex; align-items: center; gap: 10px; margin-right: 8px;
  height: 40px; border: 1px solid var(--border-color);
}
.search-box input { border: none; background: transparent; outline: none; font-family: inherit; font-size: 0.85rem; font-weight: 600; min-width: 180px; color: var(--text-dark); }

/* Mobile Search Bar Dropdown */
.mobile-search-bar { display: none; padding: 10px 16px 16px; background: var(--card-bg); border-bottom: 1px solid var(--border-color); }
.mob-srch-inner { display: flex; align-items: center; gap: 12px; background: var(--input-bg); border-radius: 16px; padding: 5px 6px 5px 16px; border: 1px solid var(--border-color); }
.mob-srch-inner input { flex: 1; border: none; background: transparent; outline: none; padding: 8px 0; font-family: inherit; font-size: 0.95rem; font-weight: 500; color: var(--text-dark); }
.mob-go-btn { background: var(--primary); color: white; border: none; border-radius: 12px; padding: 10px 20px; font-weight: 800; font-family: inherit; cursor: pointer; transition: all 0.2s; }

/* Transitions */
.search-expand-enter-active, .search-expand-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
.search-expand-enter-from, .search-expand-leave-to { opacity: 0; width: 0; margin-right: 0; }

.fade-drop-enter-active, .fade-drop-leave-active { transition: all 0.25s ease; }
.fade-drop-enter-from, .fade-drop-leave-to { opacity: 0; transform: translateY(-10px); }

/* User profile nav item */
.user-profile-nav { display: flex; align-items: center; gap: 10px; background: rgba(201,76,76,0.06); padding: 6px 16px 6px 8px; border-radius: 30px; border: 1px solid rgba(201,76,76,0.1); text-decoration: none; transition: all 0.2s; }
.user-profile-nav:hover { background: rgba(201,76,76,0.1); border-color: var(--primary); }
.avatar-sm { width: 28px; height: 28px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(201,76,76,0.15); }
.user-name-label { font-size: 0.82rem; font-weight: 800; color: var(--text-dark); }


/* Sidebar Styles */
.hamburger-btn { display: none; }
.desktop-auth-area, .search-wrap { display: flex; }
.lang-switcher { display: block; }
.mobile-sidebar-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6); z-index: 9999;
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
}
.mobile-sidebar {
  position: absolute; top: 0; right: 0; bottom: 0; width: 280px;
  background: var(--card-bg, #ffffff); box-shadow: -5px 0 30px rgba(0,0,0,0.15);
  display: flex; flex-direction: column; padding: 20px; z-index: 10000;
}
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.logo-img-sidebar { height: 32px; object-fit: contain; }
.sidebar-links { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.sidebar-item {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  border-radius: 14px; border: none; background: transparent;
  font-size: 1rem; font-weight: 700; color: var(--text-dark);
  cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.sidebar-item:hover { background: rgba(201, 76, 76, 0.05); color: var(--primary); }
.sidebar-item.active { background: rgba(201, 76, 76, 0.1); color: var(--primary); }
.sidebar-icon { color: inherit; }

.sidebar-footer {
  display: flex; flex-direction: column; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border-color);
}

/* Transitions */
.slide-side-enter-active, .slide-side-leave-active { transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-side-enter-from, .slide-side-leave-to { transform: translateX(100%); }
.slide-side-enter-to, .slide-side-leave-from { transform: translateX(0); }

.fade-overlay-enter-active, .fade-overlay-leave-active { transition: opacity 0.3s; }
.fade-overlay-enter-from, .fade-overlay-leave-to { opacity: 0; }

/* Terms Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; }
.terms-modal { background: var(--card-bg); width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 90vh; }
.terms-header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.terms-header h3 { font-size: 1.2rem; font-weight: 800; color: var(--text-dark); margin: 0; }
.terms-body { padding: 24px; overflow-y: auto; }
.terms-list { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 12px; color: var(--text-dark); font-size: 0.9rem; line-height: 1.5; font-weight: 600; }
.terms-list li { padding-left: 8px; }

.navbar-mobile-layout {
  display: none;
}

@media (max-width: 768px) {
  .navbar-desktop-layout {
    display: none !important;
  }
  .navbar-content {
    height: auto !important;
    padding-top: 0 !important;
    gap: 0 !important;
  }
  .navbar-mobile-layout {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 10px;
    box-sizing: border-box;
    padding: 0 4px;
    height: 34px;
  }
  
  .navbar {
    padding: 5px 0 !important;
    box-shadow: none !important;
  }

  .navbar.transparent-home {
    background: transparent !important;
    border-bottom: none !important;
    box-shadow: none !important;
  }
  
  .navbar.scrolled {
    background: #ffffff !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05) !important;
  }

  /* Mobile Search Pill */
  .mobile-nav-search-bar {
    flex: 1;
    height: 28px;
    background: #ffffff;
    border-radius: 14px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-sizing: border-box;
    margin-left: -6px;
    margin-right: 14px;
    transition: background-color 0.25s ease, border-color 0.25s ease;
  }

  .navbar.scrolled .mobile-nav-search-bar {
    background: #f4f4f5 !important;
    border-color: rgba(0, 0, 0, 0.08) !important;
    box-shadow: none !important;
  }
  .search-input-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    height: 100%;
    overflow: hidden;
  }
  .search-input-wrapper input {
    width: 100%;
    height: 100%;
    border: none !important;
    background: transparent !important;
    outline: none !important;
    font-size: 0.78rem;
    font-weight: 300 !important; /* Thin font weight */
    color: #2d2d2d;
    padding-left: 6px;
    font-family: inherit;
    position: relative;
    z-index: 2;
  }
  .sliding-placeholder-container {
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    pointer-events: none;
    z-index: 1;
    color: #444444; /* Darker charcoal black placeholder */
    font-size: 0.78rem;
    font-weight: 300 !important; /* Thin font weight */
    font-family: inherit;
    white-space: nowrap;
  }
  .animated-word-wrapper {
    display: inline-flex;
    position: relative;
    overflow: hidden;
    height: 16px;
    margin-left: 3px;
    align-items: center;
  }
  .animated-word {
    display: inline-block;
    white-space: nowrap;
    color: #444444; /* Darker charcoal black word */
    font-weight: 300 !important; /* Thin font weight */
  }
  .mobile-nav-search-icon {
    color: var(--primary); /* red color #C94C4C */
    flex-shrink: 0;
    width: 13px !important;
    height: 13px !important;
  }
  .mobile-nav-search-bar .clear-search-btn {
    background: none;
    border: none;
    color: #888888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    z-index: 3;
  }
  .mobile-nav-search-bar .clear-search-btn svg {
    width: 10px !important;
    height: 10px !important;
  }

  /* Mobile CS Circle button */
  .mobile-nav-cs-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    padding: 0;
    flex-shrink: 0;
    margin-right: -4px;
    transition: background-color 0.25s ease, border-color 0.25s ease;
  }

  .navbar.scrolled .mobile-nav-cs-btn {
    background: #f4f4f5 !important;
    border-color: rgba(0, 0, 0, 0.08) !important;
    box-shadow: none !important;
  }
  .mobile-nav-cs-icon {
    color: var(--primary); /* red color */
    width: 14px !important;
    height: 14px !important;
  }

  /* Placeholder slide transition */
  .placeholder-slide-enter-active,
  .placeholder-slide-leave-active {
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
  }
  .placeholder-slide-enter-from {
    transform: translateY(8px);
    opacity: 0;
  }
  .placeholder-slide-leave-to {
    transform: translateY(-8px);
    opacity: 0;
  }
}

/* Center Search Bar on Desktop (Home page) */
.header-center-search {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  max-width: 440px;
}

.search-box-center {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 42px;
  padding: 0 16px;
  border-radius: 24px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-box-center:focus-within {
  border-color: var(--primary);
  box-shadow: 0 4px 14px rgba(201, 76, 76, 0.15);
}

.search-box-center input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dark);
}

.search-box-center input::placeholder {
  color: var(--text-light);
  opacity: 0.8;
}

.search-box-center .search-box-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 50%;
  transition: all 0.2s;
}

.clear-search-btn:hover {
  color: var(--primary);
  background: rgba(201, 76, 76, 0.1);
}

/* Transparent Home mode styling for Center Search Bar */
.navbar.transparent-home .search-box-center {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.navbar.transparent-home .search-box-center:focus-within {
  background: rgba(255, 255, 255, 0.28);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.navbar.transparent-home .search-box-center input {
  color: #ffffff;
}

.navbar.transparent-home .search-box-center input::placeholder {
  color: rgba(255, 255, 255, 0.75);
}

.navbar.transparent-home .search-box-center .search-box-icon {
  color: #ffffff;
}

.navbar.transparent-home .clear-search-btn {
  color: rgba(255, 255, 255, 0.8);
}

.navbar.transparent-home .clear-search-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
}
</style>
