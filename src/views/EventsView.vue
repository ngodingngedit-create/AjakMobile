<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Calendar, MapPin, Tag, Clock, Search, SlidersHorizontal, X, Wind, Wifi, Zap, Sofa, ShieldCheck, Layers, Info, User, Heart, Ticket, Music, Trophy, Sparkles, LayoutGrid, Users } from 'lucide-vue-next';
import { bookingStore } from '../store/booking';
import { showEventsFilter } from '../store/filters';

const router = useRouter();

const shuttleBuses = ref([]);
const isLoading = ref(true);
const fetchError = ref(null);



const mapBusToEvent = (item) => {
  const dateObj = new Date(item.start_date || new Date());
  const day = dateObj.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  let seats = 0;
  try {
    if (item.seatmap) {
      const seatmap = JSON.parse(item.seatmap);
      seats = seatmap.rows * seatmap.cols;
    } else if (item.total_seat) {
      seats = item.total_seat;
    }
  } catch (e) {
    console.warn('Invalid seatmap JSON', e);
  }

  // Dynamic starting price from API
  const formatRp = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  const priceNum = item.starting_price || 0;
  const priceStr = item.starting_price ? formatRp(item.starting_price) : 'Hubungi Kami';

  return {
    id: item.id,
    name: item.name || item.bus_name || 'Unknown',
    slug: item.slug,
    bus_code: item.bus_code || '-',
    bus_type: item.bus_type || 'MINIBUS',
    plate_number: item.plate_number || '-',
    seat_layout: item.seat_layout || '-',
    total_seat: seats,
    facilities: item.facilities || [],
    date: item.start_date ? item.start_date.split('T')[0] : '',
    dateLabel: `${day} ${month} ${year}`,
    time: item.start_time ? item.start_time.slice(0, 5) + ' WIB' : '',
    departureTime: '',
    returnTime: '',
    location: item.description || '',
    city: (item.location_city && item.location_city !== 'Jakarta') ? item.location_city : 'Ecovention & Ecopark Ancol, Jakarta',
    organizer: item.organizer || (item.name && item.name.includes('Joyland') ? 'Plainsong Live' : (item.name && item.name.includes('Jakarta Fair') ? 'JIEXPO' : 'Ajak! Partner')),
    price: priceStr,
    priceNum: priceNum,
    image: item.image_url || '',
    desc: item.description || '',
    seats: seats,
    tag: item.tag || ''
  };
};

const fetchShuttleBuses = async () => {
  isLoading.value = true;
  fetchError.value = null;
  try {
    const response = await fetch(import.meta.env.VITE_API_URL + '/api/shuttle');
    if (!response.ok) throw new Error('Gagal mengambil data dari API server.');
    const result = await response.json();
    if (result.success && result.data && result.data.data) {
      shuttleBuses.value = result.data.data.map(mapBusToEvent);
    } else {
      throw new Error('Format data API tidak sesuai.');
    }
  } catch (error) {
    console.error('Error fetching shuttle buses:', error);
    fetchError.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

// Mobile Hero Images and Slider
const mobileHeroImages = [
  { src: '/bus_parkir.png', alt: 'Promo 1' },
  { src: '/bus_parkir2.png', alt: 'Promo 2' },
  { src: '/bus_parkir3.png', alt: 'Promo 3' }
];
const currentMobileHeroIndex = ref(0);
let mobileHeroInterval;

const nextMobileSlide = () => {
  currentMobileHeroIndex.value = (currentMobileHeroIndex.value + 1) % mobileHeroImages.length;
};

const prevMobileSlide = () => {
  currentMobileHeroIndex.value = (currentMobileHeroIndex.value - 1 + mobileHeroImages.length) % mobileHeroImages.length;
};

const resetMobileAutoplay = () => {
  if (mobileHeroInterval) clearInterval(mobileHeroInterval);
  mobileHeroInterval = setInterval(nextMobileSlide, 5000);
};

// Touch swipe logic
const mobileTouchStartX = ref(0);
const mobileTouchEndX = ref(0);

const handleMobileTouchStart = (e) => {
  mobileTouchStartX.value = e.touches[0].clientX;
  mobileTouchEndX.value = e.touches[0].clientX;
};

const handleMobileTouchMove = (e) => {
  mobileTouchEndX.value = e.touches[0].clientX;
};

const handleMobileTouchEnd = () => {
  const diffX = mobileTouchStartX.value - mobileTouchEndX.value;
  if (Math.abs(diffX) > 50) {
    if (diffX > 0) {
      nextMobileSlide();
    } else {
      prevMobileSlide();
    }
    resetMobileAutoplay();
  }
};

// Mobile Categories filtering
const activeMobileCategory = ref('semua');
const mobileCategories = [
  { id: 'semua', label: 'Semua', icon: LayoutGrid, tag: 'Semua' },
  { id: 'musik', label: 'Konser', icon: Music, tag: 'Musik' },
  { id: 'pameran', label: 'Pameran', icon: Ticket, tag: 'Pameran' },
  { id: 'olahraga', label: 'Olahraga', icon: Trophy, tag: 'Olahraga' },
  { id: 'festival', label: 'Festival', icon: Sparkles, tag: 'Festival' },
  { id: 'bersama', label: 'Bersama', icon: Users, tag: 'Shuttle Bersama' },
  { id: 'eksklusif', label: 'Eksklusif', icon: Sofa, tag: 'Shuttle Eksklusif' },
];

const selectMobileCategory = (catId) => {
  activeMobileCategory.value = catId;
};

// Helper function to check keywords in event attributes
const matchesKeywords = (event, keywords) => {
  const name = (event.name || '').toLowerCase();
  const desc = (event.desc || event.description || '').toLowerCase();
  const city = (event.city || '').toLowerCase();
  return keywords.some(k => name.includes(k) || desc.includes(k) || city.includes(k));
};

// Search bar animated placeholder
const isSearchFocused = ref(false);
const searchWords = ['shuttle...', 'tiket konser...', 'rental mobil...', 'hotel...', 'tiket pesawat...'];
const currentWordIndex = ref(0);
const currentWord = computed(() => searchWords[currentWordIndex.value]);
let wordRotationInterval = null;

// Sticky search logic
const isStickySearch = ref(false);
const checkSearchScroll = () => {
  if (window.innerWidth <= 768) {
    const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || window.scrollY || 0;
    isStickySearch.value = scrollPos > 150;
  } else {
    isStickySearch.value = false;
  }
};

onMounted(() => {
  fetchShuttleBuses();
  resetMobileAutoplay();
  wordRotationInterval = setInterval(() => {
    currentWordIndex.value = (currentWordIndex.value + 1) % searchWords.length;
  }, 2500);
  window.addEventListener('scroll', checkSearchScroll, { passive: true });
});

onUnmounted(() => {
  if (mobileHeroInterval) clearInterval(mobileHeroInterval);
  if (wordRotationInterval) clearInterval(wordRotationInterval);
  window.removeEventListener('scroll', checkSearchScroll);
});

const getFacilityIcon = (facility) => {
  const fac = facility.toLowerCase();
  if (fac.includes('ac')) return Wind;
  if (fac.includes('wifi')) return Wifi;
  if (fac.includes('usb') || fac.includes('charger')) return Zap;
  if (fac.includes('reclining') || fac.includes('seat')) return Sofa;
  if (fac.includes('toilet')) return ShieldCheck;
  return Tag;
};

const formatBusType = (type) => {
  if (type === 'BIG_BUS') return 'Big Bus';
  if (type === 'MEDIUM_BUS') return 'Medium Bus';
  if (type === 'MINIBUS') return 'Minibus';
  return type;
};

const cities = ['Semua', 'Jakarta'];
const genres = ['Semua', 'Shuttle Bersama', 'Shuttle Eksklusif'];

const searchQuery = ref('');
const selectedCity = ref('Semua');
const selectedGenre = ref('Semua');
const showFilters = showEventsFilter;

const filteredEvents = computed(() => {
  let result = [...shuttleBuses.value];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.tag.toLowerCase().includes(q) ||
      e.bus_code.toLowerCase().includes(q) ||
      e.plate_number.toLowerCase().includes(q)
    );
  }
  
  if (selectedCity.value !== 'Semua') result = result.filter(e => e.city === selectedCity.value);
  if (selectedGenre.value !== 'Semua') result = result.filter(e => e.tag === selectedGenre.value);

  // Apply Mobile category filter if selected
  if (activeMobileCategory.value !== 'semua') {
    if (activeMobileCategory.value === 'bersama') {
      result = result.filter(e => e.tag === 'Shuttle Bersama');
    } else if (activeMobileCategory.value === 'eksklusif') {
      result = result.filter(e => e.tag === 'Shuttle Eksklusif');
    } else if (activeMobileCategory.value === 'musik') {
      result = result.filter(e => matchesKeywords(e, ['konser', 'musik', 'music', 'joyland', 'dewa', 'coldplay', 'sing', 'live', 'show', 'band']));
    } else if (activeMobileCategory.value === 'pameran') {
      result = result.filter(e => matchesKeywords(e, ['pameran', 'expo', 'fair', 'exhibition', 'jiexpo', 'art', 'gallery', 'museum']));
    } else if (activeMobileCategory.value === 'olahraga') {
      result = result.filter(e => matchesKeywords(e, ['olahraga', 'sport', 'run', 'marathon', 'bola', 'match', 'game', 'race']));
    } else if (activeMobileCategory.value === 'festival') {
      result = result.filter(e => matchesKeywords(e, ['festival', 'fest', 'carnival', 'party']));
    }
  }

  return result;
});

const activeFiltersCount = computed(() => {
  let c = 0;
  if (selectedCity.value !== 'Semua') c++;
  if (selectedGenre.value !== 'Semua') c++;
  return c;
});

const clearFilters = () => {
  selectedCity.value = 'Semua';
  selectedGenre.value = 'Semua';
  searchQuery.value = '';
  activeMobileCategory.value = 'semua';
};

const selectEvent = (event) => {
  bookingStore.selectedEvent = event;
  router.push(`/booking/${event.slug}`);
};

const tagColors = {
  'Shuttle Bersama': '#1565C0',
  'Shuttle Eksklusif': '#C94C4C',
};
</script>

<template>
  <div class="events-page">
    <!-- Mobile Hero Slider Section (Visible only on mobile) -->
    <div class="mobile-hero-slider-section">
      <!-- Top overlay controls -->
      <div class="mobile-slider-top-bar">
        <button class="mobile-circle-btn back-btn" @click="router.push('/')">
          <X :size="16" />
        </button>
      </div>

      <!-- Slider track -->
      <div 
        class="mobile-slider-wrapper"
        @touchstart="handleMobileTouchStart"
        @touchmove="handleMobileTouchMove"
        @touchend="handleMobileTouchEnd"
      >
        <div class="mobile-slider-track">
          <div 
            v-for="(img, idx) in mobileHeroImages" 
            :key="idx"
            class="mobile-slider-slide"
            :class="{ active: idx === currentMobileHeroIndex }"
          >
            <img :src="img.src" :alt="img.alt" />
            <div class="mobile-slider-gradient"></div>
          </div>
        </div>

        <!-- Slider indicators (Dots centered, Ad Badge removed) -->
        <div class="mobile-slider-bottom-indicators">
          <div class="mobile-slider-dots">
            <span 
              v-for="(img, idx) in mobileHeroImages" 
              :key="'dot-' + idx"
              class="mobile-slider-dot"
              :class="{ active: idx === currentMobileHeroIndex }"
              @click="currentMobileHeroIndex = idx; resetMobileAutoplay();"
            ></span>
          </div>
        </div>
      </div>

      <!-- Floating Search Bar -->
      <div class="mobile-floating-search-bar" :class="{ 'is-sticky': isStickySearch }">
        <Search :size="18" class="search-icon-mobile" />
        <div class="search-input-wrapper-mobile">
          <input 
            type="text" 
            v-model="searchQuery" 
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
            class="search-input-mobile"
          />
          <div v-if="!searchQuery && !isSearchFocused" class="sliding-placeholder-container-mobile">
            <span class="animated-word-wrapper-mobile">
              <Transition name="placeholder-slide" mode="out-in">
                <span :key="currentWord" class="animated-word-mobile">Cari {{ currentWord }}</span>
              </Transition>
            </span>
          </div>
        </div>
        <button class="search-filter-btn" @click="showFilters = !showFilters">
          <SlidersHorizontal :size="18" />
        </button>
      </div>
    </div>

    <!-- Mobile Horizontal Categories Scroll (Visible only on mobile) -->
    <div class="mobile-categories-scroll-section">
      <div class="mobile-categories-scroll-wrapper">
        <button 
          v-for="cat in mobileCategories" 
          :key="cat.id" 
          class="mobile-category-item"
          :class="{ active: activeMobileCategory === cat.id }"
          @click="selectMobileCategory(cat.id)"
        >
          <div class="mobile-category-icon-bg bg-peach">
            <component :is="cat.icon" :size="22" class="red-icon" />
          </div>
          <span class="mobile-category-label">{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Header -->
   <!-- <section class="events-hero">
      <div class="events-hero-bg"></div>
      <div class="container events-hero-content">
        <span class="subtitle-tag">Armada AJAK!</span>
        <h1 class="events-hero-title">Katalog <span class="text-red">Shuttle Bus</span></h1>
        <p class="events-hero-sub">Pilih jenis armada ternyaman untuk mengantarkanmu langsung ke lokasi konser favoritmu.</p>
      </div>
    </section> -->

    <!-- Search + Filter Bar (filter panel toggled via navbar) -->
    <transition name="filter-expand">
      <div v-if="showFilters" class="filter-bar-sticky">
        <div class="container">
          <div class="filter-panel">
            <div class="filter-group">
              <label class="filter-label">Kota Asal</label>
              <div class="filter-chips">
                <button
                  v-for="city in cities"
                  :key="city"
                  class="chip"
                  :class="{ active: selectedCity === city }"
                  @click="selectedCity = city"
                >{{ city }}</button>
              </div>
            </div>
            <div class="filter-group">
              <label class="filter-label">Tipe Layanan</label>
              <div class="filter-chips">
                <button
                  v-for="genre in genres"
                  :key="genre"
                  class="chip"
                  :class="{ active: selectedGenre === genre }"
                  @click="selectedGenre = genre"
                >{{ genre }}</button>
              </div>
            </div>
            <button v-if="activeFiltersCount > 0" class="clear-filter-btn" @click="clearFilters">
              <X :size="14" /> Reset Filter
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Events Grid -->
    <div class="container events-content">

      <!-- Skeleton Loader -->
      <div v-if="isLoading" class="events-grid">
        <div v-for="n in 3" :key="'shimmer-' + n" class="event-card skeleton-card">
          <div class="skeleton-img"></div>
          <div class="event-card-body">
            <div class="skeleton-title"></div>
            <div class="skeleton-meta"></div>
            <div class="skeleton-meta"></div>
            <div class="skeleton-footer"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredEvents.length === 0" class="empty-state">
        <div class="empty-icon">🚌</div>
        <h3>Armada tidak ditemukan</h3>
        <p>Coba sesuaikan filter atau kata pencarian kamu.</p>
        <button class="btn btn-primary" @click="clearFilters">Reset Filter</button>
      </div>

      <!-- Actual Cards Grid -->
      <div v-else class="events-grid">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-card"
          @click="selectEvent(event)"
        >
          <!-- Desktop Layout (hidden on mobile) -->
          <div class="event-card-desktop">
            <div class="event-card-img">
              <img :src="event.image" :alt="event.name" />
              <div class="event-img-overlay"></div>
              <div class="event-genre-tag" :style="{ background: tagColors[event.tag] }">
                {{ event.tag }}
              </div>
            </div>
            <div class="event-card-body">
              <div class="event-city-text">{{ event.city }}</div>
              <h3 class="event-name">{{ event.name }}</h3>
              <div class="event-meta">
                <div class="meta-row">
                  <Calendar :size="13" />
                  <span>{{ event.dateLabel }} · {{ event.time }}</span>
                </div>
                <div class="meta-row">
                  <MapPin :size="13" />
                  <span>{{ event.location }}</span>
                </div>
              </div>

              <!-- Facilities and seat layout -->
              <div class="bus-amenities-section">
                <div class="bus-layout-info">
                  <span class="layout-label">Layout seat: </span>
                  <span class="layout-value">{{ event.seat_layout.replace('_', '+') }} seating</span>
                </div>
                <div class="card-facilities-row">
                  <div 
                    v-for="fac in event.facilities" 
                    :key="fac" 
                    class="mini-facility-tag"
                    v-title="fac"
                  >
                    <component :is="getFacilityIcon(fac)" :size="12" />
                    <span>{{ fac }}</span>
                  </div>
                </div>
              </div>

              <div class="event-card-footer">
                <div class="event-price-block">
                  <span class="price-label">Mulai dari</span>
                  <div style="display: flex; flex-direction: column;">
                    <span class="event-price">{{ event.price }}</span>
                    <span style="font-size: 0.72rem; color: #000000; font-weight: 600;">*Termasuk tiket ancol</span>
                  </div>
                </div>
                <button class="book-now-btn">
                  Pesan →
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile Layout (visible only on mobile) -->
          <div class="event-card-mobile">
            <div class="mobile-card-img-wrapper">
              <span class="mobile-card-location-badge">{{ event.facilities && event.facilities[0] ? event.facilities[0].split(' ')[0] : 'Ancol' }}</span>
              <img :src="event.image" :alt="event.name" class="mobile-card-img" />
            </div>
            
            <div class="mobile-card-body">
              <!-- Event Name -->
              <h3 class="mobile-card-title">{{ event.name }}</h3>
              
              <!-- Date Row -->
              <div class="mobile-card-date">
                <Calendar :size="14" class="date-icon" />
                <span>{{ event.dateLabel }}</span>
              </div>
              
              <!-- Price -->
              <div class="mobile-card-price">{{ event.price }}</div>

              <!-- Dashed Divider -->
              <div class="mobile-card-divider"></div>

              <!-- Creator -->
              <div class="mobile-card-creator">
                <div class="creator-avatar">
                  <User :size="12" class="creator-avatar-icon" />
                </div>
                <span class="creator-name">{{ event.organizer || 'Ajak! Partner' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== HERO ===== */
.events-page {
  min-height: 100vh;
  background: var(--bg-color);
  padding-top: 80px;
}

.events-hero {
  position: relative;
  padding: 100px 0 64px;
  overflow: hidden;
}

.events-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0d0d0d 0%, #1a0a0a 60%, #0d0d0d 100%);
}
.events-hero-bg::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(201,76,76,0.18) 0%, transparent 70%);
  border-radius: 50%;
}

.events-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
}

.subtitle-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--primary);
  margin-bottom: 16px;
}

.events-hero-title {
  font-size: 4rem;
  font-weight: 900;
  color: white;
  letter-spacing: -2px;
  line-height: 1;
  margin-bottom: 16px;
}

.text-red { color: var(--primary); }

.events-hero-sub {
  color: rgba(255,255,255,0.6);
  font-size: 1.05rem;
  max-width: 480px;
  margin: 0 auto;
}

/* ===== FILTER BAR ===== */
.filter-bar-sticky {
  background: var(--navbar-bg);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 80px;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  flex-wrap: wrap;
}

/* Mobile: full-width search, no filter button (button is in navbar) */
.filter-row-mobile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.filter-row-mobile .search-box {
  flex: 1;
}

.search-box {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--input-bg);
  border-radius: 12px;
  padding: 10px 16px;
  border: 1.5px solid transparent;
  transition: all 0.2s;
}
.search-box:focus-within {
  border-color: var(--primary);
  background: var(--card-bg);
  box-shadow: 0 0 0 3px rgba(201,76,76,0.08);
}
.search-ico { color: #aaa; flex-shrink: 0; }
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.92rem;
  color: var(--text-dark);
  outline: none;
}
.search-input::placeholder { color: #bbb; }
.clear-search {
  color: #aaa;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  padding: 0;
  transition: color 0.2s;
}
.clear-search:hover { color: var(--primary); }

.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  white-space: nowrap;
}
.filter-toggle-btn:hover {
  background: rgba(201,76,76,0.06);
  border-color: var(--primary);
}
.filter-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--primary);
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sort-select {
  padding: 10px 14px;
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-dark);
  background: var(--card-bg);
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
  white-space: nowrap;
}
.sort-select:focus { border-color: var(--primary); }

/* Filter Panel */
.filter-panel {
  padding: 16px 0 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}
.filter-group { display: flex; flex-direction: column; gap: 10px; }
.filter-label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--primary);
}
.filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  padding: 6px 16px;
  border-radius: 30px;
  border: 1.5px solid var(--border-color);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--card-bg);
  color: var(--text-light);
}
.chip:hover { border-color: var(--primary); color: var(--primary); }
.chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}
.clear-filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 30px;
  border: 1.5px dashed rgba(201,76,76,0.4);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;
  align-self: center;
}
.clear-filter-btn:hover { background: rgba(201,76,76,0.06); }

.filter-expand-enter-active,
.filter-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.filter-expand-enter-from,
.filter-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.filter-expand-enter-to,
.filter-expand-leave-from {
  opacity: 1;
  max-height: 300px;
}

/* ===== EVENTS CONTENT ===== */
.events-content { padding: 20px 24px 100px; }

.results-count {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-light);
  margin-bottom: 28px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.empty-state {
  text-align: center;
  padding: 80px 24px;
}
.empty-icon { font-size: 3rem; margin-bottom: 16px; }
.empty-state h3 { font-size: 1.4rem; margin-bottom: 8px; }
.empty-state p { color: var(--text-light); margin-bottom: 24px; }

/* ===== EVENTS GRID ===== */
.events-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 36px;
}
.event-card:not(.skeleton-card) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  text-align: left;
  cursor: pointer;
  transition: none !important;
}
.event-card-img {
  height: 200px;
  position: relative;
  overflow: hidden;
  border-radius: 8px !important;
  transform: translateY(0) scale(1);
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s cubic-bezier(0.25, 1, 0.5, 1) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.event-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.event-card:not(.skeleton-card):hover .event-card-img {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
}
.event-card:hover .event-card-img img { transform: scale(1.07); }

/* Shine sweep animation (in/out) */
.event-card-img::after {
  content: "";
  position: absolute;
  top: 0;
  left: -150%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transform: skewX(-20deg);
  transition: left 0.75s cubic-bezier(0.15, 0.85, 0.35, 1);
  pointer-events: none;
  z-index: 5;
}
.event-card:not(.skeleton-card):hover .event-card-img::after {
  left: 150%;
}

.event-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
}
.event-genre-tag {
  position: absolute;
  top: 14px;
  left: 14px;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 2;
}

.event-card-body {
  padding: 16px 0 0 !important;
  display: flex;
  flex-direction: column;
}
.event-city-text {
  font-size: 0.9rem;
  color: var(--text-light);
  font-weight: 600;
  margin-bottom: 4px;
}
.event-name {
  font-size: 1.35rem !important;
  font-weight: 800 !important;
  color: var(--text-dark) !important;
  margin-bottom: 4px !important;
  letter-spacing: -0.3px;
  line-height: 1.3;
}
.event-meta { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.meta-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 400 !important;
  color: #000000 !important;
}
.meta-row svg { color: var(--primary); flex-shrink: 0; }
.event-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px dashed #d0d0d0 !important;
}
.price-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600 !important;
  color: #000000 !important;
  margin-bottom: 2px;
}
.event-price {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  color: #000000 !important;
}
.book-now-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}
.book-now-btn:hover {
  background: #b34242;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(201,76,76,0.25);
}

/* ===== SHUTTLE SPECIFIC DETAILS ===== */
.event-bus-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 6px;
}
.bus-badge-type {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(201, 76, 76, 0.1);
  color: var(--primary);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(201, 76, 76, 0.2);
}
.bus-badge-plate {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-dark);
  background: var(--input-bg);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  letter-spacing: 0.5px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}
.bus-amenities-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
  margin-bottom: 16px;
}
.bus-layout-info {
  font-size: 0.75rem;
  color: var(--text-light);
  margin-bottom: 8px;
  font-weight: 600;
}
.bus-layout-info .layout-value {
  color: var(--text-dark);
  font-weight: 800;
}
.card-facilities-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mini-facility-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-light);
  background: var(--input-bg);
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}
.mini-facility-tag:hover {
  background: var(--border-color);
  color: var(--text-dark);
}
.mini-facility-tag svg {
  color: var(--primary);
}

/* ===== SKELETON LOADING SHIMMER ===== */
.skeleton-card {
  pointer-events: none;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}
.skeleton-img {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, var(--input-bg) 25%, var(--border-color) 50%, var(--input-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-title {
  width: 60%;
  height: 20px;
  margin-bottom: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--input-bg) 25%, var(--border-color) 50%, var(--input-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-meta {
  width: 90%;
  height: 14px;
  margin-bottom: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--input-bg) 25%, var(--border-color) 50%, var(--input-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-footer {
  width: 100%;
  height: 40px;
  margin-top: 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--input-bg) 25%, var(--border-color) 50%, var(--input-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 960px) {
  .events-grid { grid-template-columns: repeat(2, 1fr); gap: 28px; }
  .events-hero-title { font-size: 2.8rem; }
  .event-card-body { padding: 12px 0 0 !important; }
  .event-card-img { height: 160px; }
  .event-name { font-size: 1.15rem !important; }
}

.event-card-mobile {
  display: none;
}

@media (max-width: 768px) {
  .events-grid {
    display: flex !important;
    flex-direction: column !important;
    overflow-x: unset !important;
    scroll-snap-type: unset;
    gap: 16px !important;
    padding: 4px 20px 20px 20px !important;
  }
  .events-grid::-webkit-scrollbar {
    display: none;
  }
  .events-hero { padding: 120px 0 48px; }
  .events-hero-title { font-size: 2.2rem; }
  .filter-row { gap: 8px; }
  .sort-select { font-size: 0.8rem; }
  
  .event-card-desktop {
    display: none !important;
  }
  
  .event-card {
    flex: unset !important;
    width: 100% !important;
    scroll-snap-align: unset;
  }
  
  .event-card:not(.skeleton-card) {
    background: var(--card-bg, #ffffff) !important;
    border: none !important;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
    border-radius: 12px !important;
    overflow: hidden;
    padding: 0 !important;
    display: block !important;
    transition: all 0.3s ease !important;
  }

  .event-card-mobile {
    display: flex !important;
    flex-direction: column;
    width: 100%;
  }

  .mobile-card-img-wrapper {
    position: relative;
    width: 100%;
    height: auto;
    background-color: #f8fafc;
    overflow: hidden;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }

  .mobile-card-img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    border-radius: 12px 12px 0 0;
  }

  .mobile-card-badge {
    position: absolute;
    top: 14px;
    left: 14px;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
    padding: 5px 12px;
    border-radius: 30px;
    font-size: 0.72rem;
    font-weight: 700;
    z-index: 10;
  }

  .mobile-card-action-buttons {
    position: absolute;
    top: 14px;
    right: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10;
  }

  .action-circle-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background-color 0.2s;
  }

  .action-circle-btn:active {
    background: rgba(15, 23, 42, 0.9);
  }

  .mobile-card-dots {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 10;
  }

  .mobile-card-dots .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transition: all 0.2s;
  }

  .mobile-card-dots .dot.active {
    background: #ffffff;
    width: 14px;
    border-radius: 4px;
  }

  .mobile-card-img-wrapper {
    position: relative;
    width: 100%;
    height: 140px;
  }

  .mobile-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px 12px 0 0;
  }

  .mobile-card-body {
    padding: 12px 14px 14px 14px;
    background: var(--card-bg, #ffffff);
    display: flex;
    flex-direction: column;
  }

  .mobile-card-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-dark, #2A2A2A);
    margin: 0 0 10px 0;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-card-date {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 0.82rem;
    font-weight: 400;
    margin: 0 0 8px 0;
  }

  .mobile-card-date .date-icon {
    color: var(--primary, #C94C4C) !important;
  }

  .mobile-card-price {
    font-size: 1.1rem;
    font-weight: 800;
    color: #0f172a !important;
    margin: 0 0 12px 0;
  }

  .mobile-card-location-badge {
    position: absolute;
    top: 12px;
    left: -3px;
    background: #b12525 !important;
    color: #ffffff !important;
    padding: 3px 12px 3px 8px;
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    z-index: 15;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.15);
    line-height: 1.2;
    letter-spacing: 0.5px;
  }

  .mobile-card-location-badge::before {
    content: '';
    position: absolute;
    left: 0;
    top: 100%;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 3px 3px 0 0;
    border-color: #601212 transparent transparent transparent;
  }

  .mobile-card-divider {
    border-top: 1px dashed #e2e8f0;
    margin: 0 0 10px 0;
    width: 100%;
  }

  .mobile-card-creator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }

  .mobile-card-creator .creator-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #f1f5f9;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    color: #64748b;
    font-size: 0.65rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mobile-card-creator .creator-avatar-icon {
    color: #64748b;
  }

  .mobile-card-creator .creator-name {
    font-size: 0.78rem;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
  }

  [data-theme="dark"] .mobile-card-creator .creator-avatar {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
    border-color: rgba(255, 255, 255, 0.08);
  }

  [data-theme="dark"] .mobile-card-creator .creator-name {
    color: #cbd5e1;
  }

  .mobile-card-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--text-dark, #1e293b);
    margin: 0;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .mobile-card-location {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 0.78rem;
    font-weight: 400;
  }

  .mobile-card-location .loc-icon {
    color: var(--primary, #C94C4C);
    flex-shrink: 0;
  }

  .mobile-card-specs-grid {
    display: none !important;
  }

  [data-theme="dark"] .mobile-card-specs-grid {
    display: none !important;
  }

  .spec-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .spec-icon {
    color: #94a3b8;
    flex-shrink: 0;
  }

  .truncate-spec {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .events-content {
    padding-top: 0 !important;
    padding-bottom: 20px !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}

/* ===== Mobile-Specific Styling (Desktop Hidden) ===== */
.mobile-hero-slider-section {
  display: none;
}

.mobile-categories-scroll-section {
  display: none;
}

@media (max-width: 768px) {
  .events-page {
    padding-top: 0 !important;
    background: #fafafa !important;
  }

  [data-theme="dark"] .events-page {
    background: #0f0f0f !important;
  }

  .mobile-hero-slider-section {
    display: block;
    position: relative;
    width: 100%;
    background-color: #000;
  }

  .mobile-slider-top-bar {
    position: absolute;
    top: 14px;
    left: 16px;
    right: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 100;
  }

  .mobile-circle-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #ffffff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    color: #1e293b;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.2s;
  }
  
  .mobile-circle-btn:active {
    background-color: #f1f5f9;
    transform: scale(0.92);
  }

  /* Slider Track */
  .mobile-slider-wrapper {
    position: relative;
    width: 100%;
    height: 240px;
    overflow: hidden;
  }

  .mobile-slider-track {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .mobile-slider-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
    z-index: 1;
  }

  .mobile-slider-slide.active {
    opacity: 1;
    z-index: 2;
  }

  .mobile-slider-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .mobile-slider-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.35) 0%,
      transparent 35%,
      transparent 65%,
      rgba(0, 0, 0, 0.4) 100%
    );
    z-index: 3;
  }

  /* Slider Indicators */
  .mobile-slider-bottom-indicators {
    position: absolute;
    bottom: 30px; /* Leave space for search bar */
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
  }

  .mobile-slider-dots {
    display: flex;
    gap: 5px;
  }

  .mobile-slider-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transition: all 0.25s ease;
    cursor: pointer;
  }

  .mobile-slider-dot.active {
    background: var(--primary, #C94C4C) !important;
    width: 18px;
    border-radius: 4px;
  }

  /* Floating Search Bar */
  .mobile-floating-search-bar {
    position: absolute;
    bottom: -19px; /* center align with 38px height */
    left: 16px;
    right: 16px;
    height: 38px;
    background: #ffffff;
    border-radius: 19px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    padding: 0 16px;
    z-index: 15;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mobile-floating-search-bar.is-sticky {
    position: fixed;
    top: 12px;
    left: 16px;
    right: 16px;
    bottom: auto;
    width: auto;
    height: 38px;
    border-radius: 19px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(0, 0, 0, 0.08);
    z-index: 1000;
    padding: 0 16px;
    background: rgba(0, 0, 0, 0.08) !important;
  }

  /* Full-width white background mask behind the floating sticky search bar capsule */
  .mobile-floating-search-bar.is-sticky::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 62px; /* height (38px) + top spacing (12px) + padding (12px) */
    background: #ffffff;
    z-index: -1;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
    pointer-events: none;
  }

  [data-theme="dark"] .mobile-floating-search-bar {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  }

  [data-theme="dark"] .mobile-floating-search-bar.is-sticky {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.08);
  }

  [data-theme="dark"] .mobile-floating-search-bar.is-sticky::before {
    background: #0f0f0f; /* Match dark theme background */
    border-bottom-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .search-icon-mobile {
    color: var(--primary, #C94C4C);
    margin-right: 10px;
    flex-shrink: 0;
  }

  .search-input-mobile {
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    font-size: 0.9rem;
    color: var(--text-dark);
    outline: none;
    font-weight: 500;
    z-index: 2;
  }

  .search-input-wrapper-mobile {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    height: 100%;
    overflow: hidden;
  }

  .sliding-placeholder-container-mobile {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    color: #94a3b8;
    font-weight: 500;
    z-index: 1;
  }

  .animated-word-wrapper-mobile {
    display: inline-block;
  }

  .animated-word-mobile {
    display: block;
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

  .search-filter-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--primary); /* soft red */
    cursor: pointer;
    transition: transform 0.2s;
  }

  .search-filter-btn:active {
    transform: scale(0.9);
  }

  /* Horizontal Category Scroll */
  .mobile-categories-scroll-section {
    display: block;
    margin-top: 36px;
    padding: 12px 0 8px 0;
    width: 100%;
    overflow: hidden;
  }

  .mobile-categories-scroll-wrapper {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 4px 16px 10px 16px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .mobile-categories-scroll-wrapper::-webkit-scrollbar {
    display: none;
  }

  .mobile-category-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    padding: 2px 0;
    flex: 0 0 68px; /* same style as homepage category items */
    outline: none;
  }

  .mobile-category-icon-bg {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;
    position: relative;
    background: #fff0f0;
  }

  [data-theme="dark"] .mobile-category-icon-bg {
    background: #251212;
  }

  .red-icon {
    color: var(--primary, #C94C4C);
    transition: color 0.2s ease;
  }

  .mobile-category-item:active .mobile-category-icon-bg {
    transform: scale(0.9);
  }

  .mobile-category-label {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--text-dark, #2d2d2d);
    text-align: center;
    margin-top: 8px;
    line-height: 1.25;
    white-space: nowrap;
  }

  /* Active States */
  .mobile-category-item.active .mobile-category-icon-bg {
    background: var(--primary, #C94C4C);
    box-shadow: 0 4px 12px rgba(201, 76, 76, 0.25);
  }

  .mobile-category-item.active .red-icon {
    color: #ffffff;
  }

  .mobile-category-item.active .mobile-category-label {
    color: var(--primary, #C94C4C);
    font-weight: 700;
  }
}
</style>

<style>
@media (max-width: 768px) {
  /* Hides the global navbar only on mobile for the events view page */
  .app-container:has(.events-page) .navbar {
    display: none !important;
  }
}
</style>
