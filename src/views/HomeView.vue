<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ShieldCheck, Bus, BusFront, Zap, Coffee, Sofa, MapPin, Navigation, Search, ArrowRight, Users, User, Baby, X, Calendar, Star, Clock, Tag, ChevronLeft, ChevronRight, Car, Building2, Plane, Wallet, Plus, LayoutGrid, Key, Bell, CreditCard, Ticket, Bed, Target, Layers, Info } from 'lucide-vue-next';
import { bookingStore } from '../store/booking';
import { authState } from '../store/auth';

const router = useRouter();

// Hero Images Loop (previous bus parkir images)
const heroImages = [
  { src: '/bus_parkir.png', alt: 'Bus Parkir 1' },
  { src: '/bus_parkir2.png', alt: 'Bus Parkir 2' },
  { src: '/bus_parkir3.png', alt: 'Bus Parkir 3' }
];
const currentHeroIndex = ref(0); // Default to first image
let heroInterval;

const prevIndex = computed(() => {
  return (currentHeroIndex.value - 1 + heroImages.length) % heroImages.length;
});
const nextIndex = computed(() => {
  return (currentHeroIndex.value + 1) % heroImages.length;
});

const prevSlide = () => {
  currentHeroIndex.value = prevIndex.value;
  resetAutoplay();
};

const nextSlide = () => {
  currentHeroIndex.value = nextIndex.value;
  resetAutoplay();
};

const goToSlide = (index) => {
  currentHeroIndex.value = index;
  resetAutoplay();
};

const resetAutoplay = () => {
  if (heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(() => {
    currentHeroIndex.value = nextIndex.value;
  }, 6000);
};

// Hero Category Pills State (Traveloka Style)
const activeCategory = ref('shuttle-bersama');
const heroSearchQuery = ref('');
const isStickyServices = ref(false);
const activeStickyCategory = ref(null);

const checkScroll = () => {
  const ctaEl = document.querySelector('.mobile-video-cta');
  if (ctaEl) {
    isStickyServices.value = window.scrollY > (ctaEl.offsetTop - 50);
  } else {
    isStickyServices.value = window.scrollY > 450;
  }
};

const handleHeroSearchSubmit = () => {
  if (!heroSearchQuery.value.trim()) return;
  router.push(`/events?q=${encodeURIComponent(heroSearchQuery.value)}`);
};

const heroCategories = [
  { id: 'shuttle-bersama', label: 'Shuttle Bersama', icon: Bus, target: '#vibes' },
  { id: 'event-konser', label: 'Event', icon: Calendar, isRoute: true, to: '/events', target: '#vibes' },
  { id: 'penjemputan', label: 'Titik Jemput', icon: MapPin, target: '#discovery' },
  { id: 'rental-mobil', label: 'Rental Mobil', icon: Car, badge: 'Coming Soon', isRoute: true, to: '/rental-mobil' },
  { id: 'hotel', label: 'Hotel', icon: Building2, badge: 'Coming Soon', isRoute: true, to: '/hotel' },
  { id: 'pesawat', label: 'Tiket Pesawat', icon: Plane, badge: 'Coming Soon', isRoute: true, to: '/tiket-pesawat' }
];

const selectHeroCategory = (cat) => {
  activeCategory.value = cat.id;
  if (cat.isRoute && cat.to) {
    router.push(cat.to);
    return;
  }
  if (cat.target) {
    const el = document.querySelector(cat.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

// Touch swipe logic for mobile devices
const touchStartX = ref(0);
const touchEndX = ref(0);

const handleTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX;
  touchEndX.value = e.touches[0].clientX;
};

const handleTouchMove = (e) => {
  touchEndX.value = e.touches[0].clientX;
};

const handleTouchEnd = () => {
  const diffX = touchStartX.value - touchEndX.value;
  if (Math.abs(diffX) > 50) {
    if (diffX > 0) {
      nextSlide();
    } else {
      prevSlide();
    }
  }
};

const ekslusifImages = [
  '/Toyota-Innova-Reborn-1.jpg',
  '/Avanza.jpg',
  '/hiace.jpg'
];
const currentEkslusifIndex = ref(0);
let ekslusifInterval;

// GPS & Map State
const userCoords = ref(null);
const selectedLocation = ref('');
const mapUrl = computed(() => {
  if (!selectedLocation.value) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(selectedLocation.value)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
});

onMounted(() => {
  resetAutoplay();

  ekslusifInterval = setInterval(() => {
    currentEkslusifIndex.value = (currentEkslusifIndex.value + 1) % ekslusifImages.length;
  }, 4000);

  // Request user GPS location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        userCoords.value = { lat, lng };
        selectedLocation.value = `${lat},${lng}`;
      },
      (error) => {
        console.warn("Geolocation access denied or failed:", error);
        selectedLocation.value = 'Jakarta, Indonesia';
      }
    );
  } else {
    selectedLocation.value = 'Jakarta, Indonesia';
  }

  fetchUpcomingEvents();
  fetchPickupLocations();

  window.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();
});

onUnmounted(() => {
  if (heroInterval) clearInterval(heroInterval);
  if (ekslusifInterval) clearInterval(ekslusifInterval);
  window.removeEventListener('scroll', checkScroll);
});

// API Data
const events = ref([]);


const fetchUpcomingEvents = async () => {
  try {
    const response = await fetch(import.meta.env.VITE_API_URL + '/api/shuttle');
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    if (result.success && result.data && result.data.data) {
      events.value = result.data.data.map(item => {
        const dateObj = new Date(item.start_date);
        const day = dateObj.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        let seats = 0;
        try {
          if (item.seatmap) {
            const seatmap = JSON.parse(item.seatmap);
            seats = seatmap.rows * seatmap.cols;
          }
        } catch (e) {
          console.warn('Invalid seatmap JSON', e);
        }

          const formatRp = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');
          return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            image: item.image_url,
            desc: item.description,
            date: item.start_date ? item.start_date.split('T')[0] : '',
            dateLabel: `${day} ${month} ${year}`,
            time: item.start_time ? item.start_time.slice(0, 5) + ' WIB' : '',
            location: item.description || 'TBA',
            city: 'Ecovention & Ecopark Ancol, Jakarta',
            organizer: item.organizer || (item.name && item.name.includes('Joyland') ? 'Plainsong Live' : (item.name && item.name.includes('Jakarta Fair') ? 'JIEXPO' : 'Ajak! Partner')),
            price: item.starting_price ? formatRp(item.starting_price) : 'Hubungi Kami',
            priceNum: item.starting_price || 0,
            tag: 'Shuttle Bersama',
            bus_type: 'MINIBUS',
            plate_number: '-',
            seats: seats,
            seat_layout: item.seat_layout || '-',
            facilities: item.facilities || []
          };
      });
    }
  } catch (error) {
    console.error('Failed to fetch shuttle events:', error);
  }
};

// Event Modal
const selectedEvent = ref(null);
const modalAdults = ref(1);
const modalToddlers = ref(0);

const openEventModal = (event) => {
  // Navigate directly to booking flow
  bookingStore.selectedEvent = event;
  router.push(`/booking/${event.slug}`);
};

const closeEventModal = () => {
  selectedEvent.value = null;
  document.body.style.overflow = '';
};

const bookEvent = () => {
  if (!selectedEvent.value) return;
  bookingStore.selectedEvent = selectedEvent.value;
  router.push(`/booking/${selectedEvent.value.slug}`);
  closeEventModal();
};

// Booking Widget State
const bookingOrigin = ref('');
const bookingDestination = ref('');
const adultCount = ref(0);
const toddlerCount = ref(0);

const facilities = [
  { icon: Bus, title: 'Armada Modern', desc: 'Kendaraan yang luas & nyaman' },
  { icon: ShieldCheck, title: 'Aman & Terpercaya', desc: 'Sopir terverifikasi & pelacakan' },
  { icon: Sofa, title: 'Kursi Nyaman', desc: 'Tata letak kursi ergonomis' },
  { icon: Zap, title: 'Pengisian Daya Gratis', desc: 'Isi daya gadget Anda selama perjalanan' },
  { icon: Coffee, title: 'Air Conditioner', desc: 'AC yang sejuk' }
];

const searchQuery = ref('');
const pickupLocations = ref([]);

const fetchPickupLocations = async () => {
  try {
    const res = await fetch(import.meta.env.VITE_API_URL + '/api/shuttleroutes');
    const result = await res.json();
    if (result.success && result.data?.data) {
      const uniqueOrigins = new Set();
      const mapped = [];
      result.data.data.forEach(r => {
        if (r.origin_name && !uniqueOrigins.has(r.origin_name)) {
          uniqueOrigins.add(r.origin_name);
          const name = r.origin_name.charAt(0).toUpperCase() + r.origin_name.slice(1);
          mapped.push({
            region: name,
            name: name,
            address: 'Titik Jemput ' + name,
            lat: null,
            lng: null
          });
        }
      });
      pickupLocations.value = mapped;
    }
  } catch (error) {
    console.error('Failed to fetch pickup locations:', error);
  }
};

const groupedLocations = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const filtered = pickupLocations.value.filter(loc =>
    loc.region.toLowerCase().includes(query) ||
    loc.name.toLowerCase().includes(query) ||
    loc.address.toLowerCase().includes(query)
  );
  const groups = {};
  filtered.forEach(loc => {
    if (!groups[loc.region]) groups[loc.region] = [];
    groups[loc.region].push(loc);
  });
  return groups;
});

let searchDebounceTimeout = null;
watch(searchQuery, (newVal) => {
  if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    if (newVal.trim()) {
      selectedLocation.value = newVal;
    }
  }, 1000);
});

const searchOnMap = () => {
  if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
  if (searchQuery.value.trim()) {
    selectedLocation.value = searchQuery.value;
  }
};

const selectPickup = (loc) => {
  bookingOrigin.value = loc.name;
  selectedLocation.value = loc.lat && loc.lng ? `${loc.lat},${loc.lng}` : `${loc.name}, ${loc.address}`;
  const portal = document.getElementById('booking-portal');
  if (portal) portal.scrollIntoView({ behavior: 'smooth' });
};

const handleSearch = () => {
  if (!bookingDestination.value) { alert('Please enter a destination.'); return; }
  if (!bookingOrigin.value) { alert('Please enter a pickup location.'); return; }
  alert(`Searching kendaraan for ${adultCount.value} adult(s) & ${toddlerCount.value} toddler(s) from ${bookingOrigin.value} to ${bookingDestination.value}`);
};

// Reviews
const reviews = [
  { id: 1, name: 'Rizky Aditya', initials: 'RA', trip: 'Silaturahmi → City Arena', stars: 5, color: '#C94C4C', comment: 'Pelayanan luar biasa! Berangkat on time, seatnya nyaman banget, dan drivernya ramah. Gak perlu khawatir soal parkir event lagi. Worth every penny!', date: '16 Okt 2026', tag: 'Shuttle Bersama' },
  { id: 2, name: 'Salsabila Putri', initials: 'SP', trip: 'Silaturahmi → Grand Park', stars: 5, color: '#7C4DFF', comment: 'Pertama kali coba AJAK! dan langsung ketagihan. Mobilnya bersih, ada charger USB, dan rutenya pas banget dari dekat rumah. Akan pakai lagi pastinya!', date: '23 Okt 2026', tag: 'Shuttle Bersama' },
  { id: 3, name: 'Daffa Ramadhan', initials: 'DR', trip: 'Silaturahmi → Stadium One', stars: 5, color: '#00897B', comment: 'VIP experience yang sesungguhnya. Dijemput langsung di depan venue, privat tanpa ribet. Untuk artis dan tamu penting, AJAK! Black Label adalah pilihan terbaik.', date: '6 Nov 2026', tag: 'VIP Pribadi' },
  { id: 4, name: 'Nadia Kusuma', initials: 'NK', trip: 'Silaturahmi → Downtown', stars: 4, color: '#F4511E', comment: 'Sangat membantu! Aplikasinya mudah, penjemputan point-nya jelas, dan harganya reasonable untuk kualitas yang didapat. Sedikit telat 5 menit, tapi overall bagus.', date: '13 Nov 2026', tag: 'Shuttle Bersama' },
  { id: 5, name: 'Kevin Pratama', initials: 'KP', trip: 'Silaturahmi → City Arena', stars: 5, color: '#1565C0', comment: 'Game changer untuk concert goers! Gak perlu mikirin parkir, macet, atau pulang kemalaman. AJAK! bikin experience konser jadi 10x lebih enjoyable.', date: '17 Okt 2026', tag: 'Shuttle Bersama' },
  { id: 6, name: 'Amelia Santoso', initials: 'AS', trip: 'Silaturahmi → Grand Park', stars: 5, color: '#6D4C41', comment: 'Recommended banget! Koordinasi grupnya mudah, seats comfy, dan systemnya terorganisir. Tim AJAK! juga responsif kalau ada pertanyaan.', date: '24 Okt 2026', tag: 'Shuttle Bersama' }
];

// duplicated for seamless marquee loop
const reviewsMarquee = [...reviews, ...reviews];

// Marquee logo count
const marqueeCount = 12;

const tagColors = {
  'Shuttle Bersama': '#1565C0',
  'Shuttle Eksklusif': '#C94C4C',
  Electronic: '#7C4DFF',
  Classical: '#00897B',
  Rock: '#C94C4C',
  Indie: '#F4511E',
  Jazz: '#1565C0',
  EDM: '#6D1B7B',
};

// Toast notification for mobile actions
const showToast = ref(false);
const toastMessage = ref('');
const triggerToast = (msg) => {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
};
</script>

<template>
  <div class="home-view">

    <!-- ===== EVENT DETAIL MODAL ===== -->
    <transition name="modal-fade">
      <div v-if="selectedEvent" class="modal-overlay" @click.self="closeEventModal">
        <div class="modal-card">
          <button class="modal-close" @click="closeEventModal"><X size="20" /></button>
          <div class="modal-img">
            <img :src="selectedEvent.image" :alt="selectedEvent.name" />
            <div class="modal-img-overlay"></div>
            <div class="modal-tag">{{ selectedEvent.tag }}</div>
          </div>
          <div class="modal-body">
            <h2 class="modal-title">{{ selectedEvent.name }}</h2>
            <p class="modal-desc">{{ selectedEvent.desc }}</p>

            <div class="modal-info-grid">
              <div class="meta-item"><Calendar size="15" /><span>{{ selectedEvent.date }} · {{ selectedEvent.time }}</span></div>
              <div class="meta-item"><MapPin size="15" /><span>{{ selectedEvent.location }}, {{ selectedEvent.city }}</span></div>
              <div class="meta-item"><Tag size="15" /><span>{{ selectedEvent.price }} / orang</span></div>
              <div class="meta-item seats"><Clock size="15" /><span>{{ selectedEvent.seats }} kursi tersisa</span></div>
            </div>

            <div class="modal-divider"></div>
            
            <div class="modal-route-box">
              <p class="section-tag-mini">Rute Perjalanan</p>
              <div class="route-visual">
                <div class="route-dot"></div>
                <div class="route-line-dashed"></div>
                <div class="route-target-icon"><Navigation size="14" /></div>
                <div class="route-labels">
                  <div class="route-label-item">
                    <span class="l-top">Penjemputan</span>
                    <span class="l-bottom">Titik Terdekat Anda</span>
                  </div>
                  <div class="route-label-item text-right">
                    <span class="l-top">Tujuan</span>
                    <span class="l-bottom">{{ selectedEvent.location }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-divider"></div>
            <p class="modal-counter-label">Jumlah Penumpang</p>

            <div class="modal-counters">
              <div class="m-counter-group">
                <span class="m-counter-lbl"><Users size="13" /> Dewasa</span>
                <div class="m-counter-ctrl">
                  <button class="cnt-btn" :class="{ faded: modalAdults <= 1 }" @click="modalAdults > 1 ? modalAdults-- : null">−</button>
                  <span class="cnt-val">{{ modalAdults }}</span>
                  <button class="cnt-btn" @click="modalAdults++">+</button>
                </div>
              </div>
              <div class="m-cnt-sep"></div>
              <div class="m-counter-group">
                <span class="m-counter-lbl"><Baby size="13" /> Balita</span>
                <div class="m-counter-ctrl">
                  <button class="cnt-btn" :class="{ faded: modalToddlers === 0 }" @click="modalToddlers > 0 ? modalToddlers-- : null">−</button>
                  <span class="cnt-val">{{ modalToddlers }}</span>
                  <button class="cnt-btn" @click="modalToddlers++">+</button>
                </div>
              </div>
            </div>

            <button class="modal-book-btn" @click="bookEvent">
              Pesan kendaraan Sekarang →
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== HERO SECTION ===== -->
    <section class="hero-section">

      <!-- Main Slider Wrapper -->
      <div 
        class="slider-wrapper"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div class="slider-track">
          <div 
            v-for="(img, index) in heroImages" 
            :key="img.src" 
            class="slider-card"
            :class="{ 
              'active': index === currentHeroIndex, 
              'prev': index === prevIndex, 
              'next': index === nextIndex,
              'hidden': index !== currentHeroIndex && index !== prevIndex && index !== nextIndex
            }"
            @click="goToSlide(index)"
          >
            <div class="card-inner">
              <img :src="img.src" :alt="img.alt" />
              <div class="hero-gradient-overlay"></div>
            </div>
          </div>
        </div>

        <!-- Slider Pagination Dots (Mobile Only) -->
        <div class="mobile-slider-dots">
          <span 
            v-for="(img, index) in heroImages" 
            :key="index" 
            class="mobile-dot"
            :class="{ active: index === currentHeroIndex }"
            @click="goToSlide(index)"
          ></span>
        </div>

        <!-- Hero Overlay Content & Category Buttons (Desktop Only) -->
        <div class="hero-overlay-content">
          <div class="hero-header-text">
            <h1 class="hero-title">Berangkat ke Event Favoritmu Tanpa Ribet</h1>
            <p class="hero-sub">Pesan shuttle, rental mobil, hotel, dan kebutuhan perjalanan lainnya dalam satu platform yang praktis, nyaman, dan terpercaya.</p>
          </div>

          <!-- Mobile Search Bar (Positioned ABOVE Category Card) -->
          <div class="hero-mobile-search-bar">
            <Search :size="18" class="search-ico" />
            <input
              type="text"
              v-model="heroSearchQuery"
              placeholder="Cari armada, rute, atau event..."
              class="search-input"
              @keydown.enter="handleHeroSearchSubmit"
            />
            <button v-if="heroSearchQuery" class="clear-search" @click="heroSearchQuery = ''">
              <X :size="14" />
            </button>
          </div>

          <!-- White Category Card -->
          <div class="category-pills-bar">
            <button
              v-for="cat in heroCategories"
              :key="cat.id"
              class="category-pill-btn"
              :class="{ active: activeCategory === cat.id }"
              @click="selectHeroCategory(cat)"
            >
              <span v-if="cat.badge" class="cat-badge">{{ cat.badge }}</span>
              <div class="cat-icon-wrapper">
                <component :is="cat.icon" size="24" class="cat-icon" />
              </div>
              <span class="cat-label">{{ cat.label }}</span>
            </button>
          </div>
        </div>
      </div>


      <!-- Mobile-Only Hero Layout Dashboard (Visible only on mobile <= 768px) -->
      <div class="mobile-dashboard-container">
        <!-- Greeting Row -->
        <div class="mobile-greeting-row">
          <span class="mobile-greeting-text">Hai <strong>{{ authState.user ? authState.user.name.toUpperCase() : 'TAMU' }}</strong>!</span>
          <div class="mobile-greeting-decor">
            <img src="/AJAKLogo/LOGO.png" alt="AJAK!" class="greeting-logo-img" />
          </div>
        </div>

        <!-- Services Grid (Match Image: 8 items in 4 columns grid) -->
        <div class="mobile-services-grid">
          <!-- Shuttle -->
          <button class="service-item" @click="selectHeroCategory({ id: 'shuttle-bersama', target: '#vibes' })">
            <div class="service-icon-bg bg-peach">
              <Bus :size="22" class="red-icon" />
            </div>
            <span class="service-label">Shuttle</span>
          </button>

          <!-- Konser -->
          <button class="service-item" @click="router.push('/events')">
            <div class="service-icon-bg bg-peach">
              <Ticket :size="22" class="red-icon" />
            </div>
            <span class="service-label">Konser</span>
          </button>

          <!-- Eksklusif -->
          <button class="service-item" @click="triggerToast('Layanan Shuttle Eksklusif sedang disiapkan!')">
            <div class="service-icon-bg bg-peach">
              <Sofa :size="22" class="red-icon" />
            </div>
            <span class="service-label">Eksklusif</span>
          </button>

          <!-- Jemput -->
          <button class="service-item" @click="selectHeroCategory({ id: 'penjemputan', target: '#discovery' })">
            <div class="service-icon-bg bg-peach">
              <Target :size="22" class="red-icon" />
            </div>
            <span class="service-label">Jemput</span>
          </button>

          <!-- Rental -->
          <button class="service-item" @click="triggerToast('Rental Mobil Coming Soon!')">
            <div class="service-icon-bg bg-peach">
              <span class="service-badge-tag badge-soon">Soon</span>
              <Key :size="22" class="red-icon" />
            </div>
            <span class="service-label">Rental</span>
          </button>

          <!-- Hotel -->
          <button class="service-item" @click="triggerToast('Hotel Booking Coming Soon!')">
            <div class="service-icon-bg bg-peach">
              <span class="service-badge-tag badge-soon">Soon</span>
              <Bed :size="22" class="red-icon" />
            </div>
            <span class="service-label">Hotel</span>
          </button>

          <!-- Pesawat -->
          <button class="service-item" @click="triggerToast('Tiket Pesawat Coming Soon!')">
            <div class="service-icon-bg bg-peach">
              <span class="service-badge-tag badge-soon">Soon</span>
              <Plane :size="22" class="red-icon" />
            </div>
            <span class="service-label">Pesawat</span>
          </button>

          <!-- Lainnya -->
          <button class="service-item" @click="triggerToast('Layanan Lainnya sedang disiapkan!')">
            <div class="service-icon-bg bg-peach">
              <LayoutGrid :size="22" class="red-icon" />
            </div>
            <span class="service-label">Lainnya</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ===== UPCOMING VIBES ===== -->
    <section class="section vibes-section" id="vibes">
      <div class="container">
        <!-- Mobile Only Video CTA Banner -->
        <div class="mobile-video-cta">
          <video 
            src="/mobile/CTAAJAKS.mp4" 
            autoplay 
            loop 
            muted 
            playsinline 
            webkit-playsinline
            class="cta-video"
          ></video>
        </div>

        <div class="events-cards">
          <div
            v-for="event in events.slice(0, 3)"
            :key="event.id"
            class="event-card"
            @click="openEventModal(event)"
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
                <div class="event-organizer">Oleh {{ event.organizer }}</div>
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
                <div class="event-card-footer">
                  <div class="event-price-block">
                    <span class="price-label">Mulai dari</span>
                    <div style="display: flex; flex-direction: column;">
                      <span class="event-price">{{ event.price }}</span>
                      <span style="font-size: 0.75rem; color: #000000; font-weight: 600;">*Termasuk tiket ancol</span>
                    </div>
                  </div>
                  <button class="book-now-btn">
                    Pesan Sekarang →
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

        <!-- View all CTA -->
        <div v-if="false" class="view-all-wrap">
          <button class="view-all-btn" @click="router.push('/events')">
            Lihat Semua Event
            <ArrowRight :size="18" />
          </button>
        </div>
      </div>
    </section>

    <!-- ===== MARQUEE 3 ===== -->
    <div class="text-marquee-wrap text-marquee">
      <div class="logo-marquee-track">
        <div class="logo-marquee-inner text-marquee-inner">
          <span>Alasan harus menggunakan Shuttle Bus dari AJAX! :</span>
          <span>TIDAK USAH REPOT CARI PARKIRAN</span>
          <span>TIDAK PERLU ANTERI PANJANG</span>
          <span>TIDAK PUSING MENGHADAPI KEMACETAN</span>
          <span>HEMAT TENAGA</span>
          <span>HEMAT BIAYA</span>
          <span>HEMAT WAKTU</span>
          <span>AMAN</span>
          <span>NYAMAN</span>
          <span>PERJALANAN MENYENANGKAN</span>
          <span>MENDAPATKAN PENGALAMAN DAN TEMAN BARU</span>
        </div>
      </div>
    </div>

    <!-- ===== PICKUP DISCOVERY ===== -->
    <section class="section pickup-discovery bg-light" id="discovery">
      <div class="container">
        <div class="section-title-box mb-5">
          <span class="sub-title">Denah Lokasi</span>
          <h2 class="creative-title">Temukan <span class="text-primary">Titik Jemput</span></h2>
          <div class="title-underline"></div>
        </div>

        <div class="discovery-grid">
          <div class="search-panel glass-morphism">
            <div class="custom-search">
              <Search size="20" class="srch-icon" />
              <input type="text" v-model="searchQuery" placeholder="Cari kota atau lokasi penjemputan..." @keyup.enter="searchOnMap">
            </div>
            <div class="results-scroll">
              <div v-for="(locations, region) in groupedLocations" :key="region">
                <h4 class="group-label">{{ region }}</h4>
                <div v-for="loc in locations" :key="loc.name" class="loc-card" @click="selectPickup(loc)">
                  <div class="loc-text">
                    <h5>{{ loc.name }}</h5>
                    <p>{{ loc.address }}</p>
                  </div>
                  <div class="loc-action"><ArrowRight size="18" /></div>
                </div>
              </div>
            </div>
          </div>

          <div class="map-panel">
            <iframe
              v-if="mapUrl"
              :src="mapUrl"
              width="100%"
              height="100%"
              style="border:0;"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
            <div v-else class="map-placeholder-fallback">
              <div class="map-spinner"></div>
              <p>Mencari lokasi Anda...</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FACILITIES ===== -->
    <section class="section amenities-section">
      <div class="container text-center">
        <h2 class="creative-title mb-5" style="color: white !important;">Fasilitas <span style="color: white !important;">Perjalanan</span></h2>
        <div class="amenities-grid">
          <div v-for="(fac, index) in facilities" :key="index" class="amenity-box">
            <div class="amenity-icon">
              <component :is="fac.icon" size="32" />
            </div>
            <h4>{{ fac.title }}</h4>
            <p>{{ fac.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== MARQUEE 4 — WHITE ===== -->
    <!-- <div class="logo-marquee-wrap white-marquee">
      <div class="logo-marquee-track">
        <div class="logo-marquee-inner">
          <div v-for="i in marqueeCount" :key="'d'+i" class="logo-marquee-item">
            <img src="/AJAKLogo/LOGO.png" alt="AJAK!" class="marquee-logo-img marquee-logo-color" />
          </div>
          <div v-for="i in marqueeCount" :key="'d2'+i" class="logo-marquee-item" aria-hidden="true">
            <img src="/AJAKLogo/LOGO.png" alt="AJAK!" class="marquee-logo-img marquee-logo-color" />
          </div>
        </div>
      </div>
    </div> -->

    <!-- ===== THE HEART (Tentang) ===== -->
    <section class="section heart-section" id="Tentang">
      <div class="container">
        <div class="heart-container">
          <span class="sub-title"> Tentang AJAK!</span>
          <h2 class="creative-title mb-4">Sekapur Sirih dari <span class="text-primary">AJAK!</span></h2>
          <div class="title-underline mx-auto mb-5"></div>
          <p class="main-para">
            Kami memulai dengan keyakinan sederhana: <strong>perjalanan menuju tempat terselenggaranya acara harus sama serunya dengan pertunjukan itu sendiri.</strong>
          </p>
          <p class="sub-para mt-4">
            Lahir pada akhir 2025, AJAK! menjembatani celah antara transit kota yang padat dan atmosfer panggung yang membara. Kami membangun jaringan transportasi yang aman, terorganisir, dan premium untuk penggemar, artis, dan semua orang diantaranya.
          </p>
          <div class="stats-row mt-5">
            <div class="stat-circle"><span class="val">50k+</span><span class="lab">Penumpang</span></div>
            <div class="stat-circle secondary"><span class="val">100+</span><span class="lab">Panggung</span></div>
            <div class="stat-circle"><span class="val">24/7</span><span class="lab">Layanan Customer Service</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section Divider -->
    <div v-if="false" class="section-divider-wrap">
      <div class="container">
        <div class="thin-border-divider"></div>
      </div>
    </div>

    <!-- ===== REVIEWS — INFINITE SCROLL MARQUEE ===== -->
    <section v-if="false" class="section reviews-section" id="reviews">
      <div class="container">
        <div class="section-title-box text-center mb-5">
          <span class="sub-title">Testimonial</span>
          <h2 class="creative-title">Apa Kata <span class="text-primary">Pengguna</span></h2>
          <div class="title-underline mx-auto"></div>
        </div>
      </div>

      <!-- Full-width marquee strip -->
      <div class="reviews-marquee-outer">
        <div class="reviews-marquee-inner">
          <div v-for="(review, i) in reviewsMarquee" :key="i + '-rv'" class="review-card">
            <div class="review-header">
              <div class="reviewer-avatar" :style="{ background: review.color }">{{ review.initials }}</div>
              <div class="reviewer-info">
                <div class="reviewer-name">{{ review.name }}</div>
                <div class="reviewer-trip">{{ review.trip }}</div>
              </div>
              <div class="review-stars">
                <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= review.stars }">★</span>
              </div>
            </div>
            <p class="review-text">{{ review.comment }}</p>
            <div class="review-footer">
              <span class="review-date">{{ review.date }}</span>
              <span class="review-tag">{{ review.tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FINAL CTA SECTION ===== -->
    <section class="section final-cta-section">
      <div class="container shadow-mobile-cleanup">
        <div class="cta-banner-card">
          <div class="cta-content">
            <h2 class="cta-title">Siap untuk perjalanan berikutnya?</h2>
            <p class="cta-desc">Temukan event favoritmu dan pesan kendaraan kamu sekarang tanpa ribet.</p>
          </div>
          <button class="btn btn-primary cta-action-btn" @click="router.push('/events')">
            Lihat Semua Event <ArrowRight size="20" />
          </button>
        </div>
      </div>
    </section>


    <!-- Custom Beautiful Slide-Up Toast (Mobile Only) -->
    <transition name="toast-fade">
      <div v-if="showToast" class="mobile-toast">
        <span class="toast-text">{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Sticky Services Filter Bar (Mobile only) -->
    <Teleport to="body">
      <transition name="fade-slide">
        <div v-if="isStickyServices" class="mobile-sticky-services-bar">
          <!-- Shuttle -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'shuttle-bersama' }"
            @click="activeStickyCategory = 'shuttle-bersama'; selectHeroCategory({ id: 'shuttle-bersama', target: '#vibes' })"
          >
            <Bus :size="12" />
            <span>Shuttle</span>
          </button>

          <!-- Konser -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'event-konser' }"
            @click="activeStickyCategory = 'event-konser'; selectHeroCategory({ id: 'event-konser', isRoute: true, to: '/events' })"
          >
            <Ticket :size="12" />
            <span>Konser</span>
          </button>

          <!-- Eksklusif -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'eksklusif' }"
            @click="activeStickyCategory = 'eksklusif'; triggerToast('Layanan Shuttle Eksklusif sedang disiapkan!')"
          >
            <Sofa :size="12" />
            <span>Eksklusif</span>
          </button>

          <!-- Jemput -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'penjemputan' }"
            @click="activeStickyCategory = 'penjemputan'; selectHeroCategory({ id: 'penjemputan', target: '#discovery' })"
          >
            <Target :size="12" />
            <span>Jemput</span>
          </button>

          <!-- Rental -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'rental-mobil' }"
            @click="activeStickyCategory = 'rental-mobil'; triggerToast('Rental Mobil Coming Soon!')"
          >
            <Key :size="12" />
            <span>Rental</span>
          </button>

          <!-- Hotel -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'hotel' }"
            @click="activeStickyCategory = 'hotel'; triggerToast('Hotel Booking Coming Soon!')"
          >
            <Bed :size="12" />
            <span>Hotel</span>
          </button>

          <!-- Pesawat -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'pesawat' }"
            @click="activeStickyCategory = 'pesawat'; triggerToast('Tiket Pesawat Coming Soon!')"
          >
            <Plane :size="12" />
            <span>Pesawat</span>
          </button>

          <!-- Lainnya -->
          <button 
            class="sticky-service-item" 
            :class="{ active: activeStickyCategory === 'lainnya' }"
            @click="activeStickyCategory = 'lainnya'; triggerToast('Layanan Lainnya sedang disiapkan!')"
          >
            <LayoutGrid :size="12" />
            <span>Lainnya</span>
          </button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.mobile-video-cta {
  display: none;
}
/* ===== GLOBAL TOKENS ===== */
.text-gradient {
  background: linear-gradient(135deg, #ff6b6b, #ff9a9a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sub-title {
  text-transform: uppercase;
  letter-spacing: 3px;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--primary);
  display: block;
  margin-bottom: 12px;
}
.creative-title {
  font-size: 2.25rem;
  font-weight: 900;
  letter-spacing: -1px;
}
.title-underline {
  width: 60px;
  height: 4px;
  background: var(--primary);
  border-radius: 2px;
  margin-top: 16px;
}

/* ===== HERO ===== */
.hero-section {
  position: relative;
  width: 100%;
  min-height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

/* Slider Track & Layout - FULL SCREEN BLEED (Under Transparent Navbar) */
.slider-wrapper {
  position: relative;
  width: 100vw;
  max-width: 100%;
  height: 580px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  overflow: hidden;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
}

.slider-track {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Slider Card Styles - FULL SCREEN FRAME */
.slider-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
  transition: opacity 1s ease-in-out;
  background: #111;
  user-select: none;
  opacity: 0;
  pointer-events: none;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.slider-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.hero-gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0.15) 45%,
    rgba(0, 0, 0, 0.45) 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* Active slide - Smooth Fade In */
.slider-card.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 10;
}

/* Hidden slides - Fade Out */
.slider-card.prev,
.slider-card.next,
.slider-card.hidden {
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}

/* ===== HERO OVERLAY CONTENT & CATEGORY BUTTONS ===== */
.hero-overlay-content {
  position: absolute;
  inset: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 105px 0 40px;
  text-align: center;
  pointer-events: none;
  width: 100%;
}

.hero-header-text {
  width: 100%;
  max-width: 1400px;
  padding: 0 40px;
  box-sizing: border-box;
  margin-bottom: 32px;
  pointer-events: auto;
  animation: heroFadeIn 0.8s ease-out;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
  margin: 0;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.65);
  line-height: 1.2;
}

.hero-sub {
  font-size: 0.98rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  margin-top: 10px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
  white-space: nowrap;
}

/* Mobile Search Bar in Hero (Hidden on Desktop) */
.hero-mobile-search-bar {
  display: none;
}

.cat-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Category Pills Bar - Grid Layout matching Navbar container width */
.category-pills-bar {
  width: 100%;
  max-width: 1400px;
  padding: 0 40px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  pointer-events: auto;
  animation: heroFadeIn 1s ease-out;
}

.category-pill-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  width: 100%;
  border-radius: 12px;
  background: transparent;
  border: 2px solid transparent;
  color: #ffffff;
  font-family: inherit;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.category-pill-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.category-pill-btn.active {
  background: rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  font-weight: 800;
  transform: translateY(-4px) scale(1.04);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.5);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.category-pill-btn.active .cat-icon {
  color: #ffffff;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
}

.cat-icon {
  transition: transform 0.3s ease;
}

.category-pill-btn:hover .cat-icon {
  transform: scale(1.15);
}

/* Category Badge */
.cat-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary, #C94C4C);
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 900;
  padding: 2px 10px;
  border-radius: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  border: 1.5px solid #ffffff;
  white-space: nowrap;
}

@keyframes heroFadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments for Slider */
@media (max-width: 1200px) {
  .hero-section {
    padding: 0;
  }
  .slider-wrapper {
    height: 440px;
    border-radius: 0;
  }
  .slider-card {
    width: 100% !important;
    height: 100% !important;
    border-radius: 0 !important;
  }
}

@media (max-width: 992px) {
  .hero-section {
    padding: 0;
  }
  .slider-wrapper {
    height: 380px !important;
    margin-top: 0 !important;
    border-radius: 0;
  }
  .slider-card {
    width: 100% !important;
    height: 100% !important;
    border-radius: 0 !important;
  }
  .hero-title {
    font-size: 1.8rem !important;
    white-space: normal !important;
  }
  .hero-sub {
    white-space: normal !important;
    font-size: 0.9rem !important;
  }
  .hero-header-text {
    padding: 0 20px !important;
    margin-bottom: 20px !important;
  }
  .category-pills-bar {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 10px !important;
    padding: 0 20px !important;
  }
  .creative-title {
    font-size: 1.85rem !important;
  }
  .events-cards {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 24px !important;
  }
  .tiers-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 24px !important;
  }
  .amenities-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 24px !important;
  }
}

@media (max-width: 768px) {
  .hero-section {
    min-height: auto;
    padding: 0;
    background: #fbfbfb !important;
    overflow: visible !important;
    margin-bottom: 20px !important;
    border-radius: 0 !important;
  }
  .slider-track,
  .slider-card {
    display: block !important;
    width: 100%;
    height: 100%;
  }
  .slider-wrapper {
    position: relative !important;
    width: 100% !important;
    height: 280px !important; /* Taller slider on mobile view to show more of slides */
    overflow: hidden !important;
    border-bottom-left-radius: 20px !important;
    border-bottom-right-radius: 20px !important;
    background: #111 !important;
    margin-top: 0 !important;
    border-radius: 0 !important;
  }
  .hero-overlay-content {
    display: none !important;
  }

  /* Mobile Slider dots */
  .mobile-slider-dots {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 40;
  }
  .mobile-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.45);
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .mobile-dot.active {
    width: 12px;
    border-radius: 2.5px;
    background: var(--primary, #C94C4C) !important;
  }

  /* Mobile Dashboard Container (includes greeting row) */
  .mobile-dashboard-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 10px 16px 6px; /* 16px sides aligns content with screen boundary lines */
    box-sizing: border-box;
    background: #ffffff;
    margin-top: -50px;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    position: relative;
    z-index: 51;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.04);
  }

  /* Greeting row inside the unified card */
  .mobile-greeting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
  .mobile-greeting-text {
    font-size: 0.88rem;
    font-weight: 400;
    color: #2d2d2d;
    letter-spacing: 0.01em;
    margin-left: 4px;
  }
  .mobile-greeting-text strong {
    font-weight: 600;
    color: #1a1a1a;
  }
  .mobile-greeting-decor {
    display: flex;
    align-items: center;
    margin-right: 4px;
  }
  .greeting-logo-img {
    height: 24px;
    width: auto;
    object-fit: contain;
  }

  /* Gojek-style Services Grid */
  .mobile-services-grid {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 6px;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    padding: 10px 16px;
    box-sizing: border-box;
    scrollbar-width: none; /* Hide scrollbar Firefox */
  }
  .mobile-services-grid::-webkit-scrollbar {
    display: none; /* Hide scrollbar Chrome/Safari/Opera */
  }
  .service-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    padding: 2px 0;
    flex: 0 0 68px; /* Prevent shrinking and maintain layout on horizontal scroll */
  }
  .service-icon-bg {
    width: 50px;
    height: 50px;
    border-radius: 12px; /* Less rounded/more squarer */
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;
    position: relative; /* Relative target for the Soon badge */
  }
  .service-item:active .service-icon-bg {
    transform: scale(0.9);
  }
  .service-label {
    font-size: 0.68rem;
    font-weight: 500;
    color: #2d2d2d;
    text-align: center;
    margin-top: 8px;
    line-height: 1.25;
    white-space: normal;
  }
  
  /* Service colors & icons */
  .bg-peach {
    background: #fff0f0;
  }
  .red-icon {
    color: #a32222;
  }
  .bg-soon {
    background: #f7f7f7;
  }
  .soon-icon {
    color: #888888;
  }

  /* Service badges - 3D Ribbon Fold style */
  .service-badge-tag {
    position: absolute;
    top: -3px; /* snugs cleanly on 12px border radius */
    left: -2px; /* shifted slightly to the right */
    font-size: 0.58rem;
    font-weight: 700;
    color: #ffffff;
    padding: 1px 7px 1px 6px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    border-top-left-radius: 2px;
    border-bottom-left-radius: 0;
    background: #b12525;
    z-index: 15;
    box-shadow: 1px 2px 4px rgba(0, 0, 0, 0.15);
    line-height: 1.2;
    font-family: inherit;
  }
  .badge-soon::before {
    content: '';
    position: absolute;
    left: 0;
    top: 100%;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 3px 3px 0 0; /* scaled down to fit -3px offset */
    border-color: #601212 transparent transparent transparent;
  }

  /* Mobile-Only Video CTA */
  .mobile-video-cta {
    display: block;
    width: 100%;
    margin-bottom: 24px;
    box-sizing: border-box;
  }
  .cta-video {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  }
  .vibes-section {
    padding-top: 0 !important;
    margin-top: -30px !important;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 0;
  }
  .slider-wrapper {
    height: 240px !important;
    border-radius: 0 !important;
  }
  .slider-card {
    display: block !important;
  }
  .category-pills-bar {
    display: none !important;
  }
  .nav-arrow {
    display: none;
  }
}

/* ===== BOOKING CARD ===== */
.booking-card {
  width: 100%; max-width: 900px;
  background: var(--navbar-bg);
  backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
  border-radius: 28px;
  box-shadow: var(--shadow-lg), 0 0 0 1px var(--border-color);
  overflow: hidden;
}
.booking-row-inputs {
  display: flex; align-items: center;
  padding: 30px 32px 20px; gap: 0;
  border-bottom: 1px solid var(--border-color);
}
.booking-row-bottom {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 32px 28px; gap: 24px;
}
.b-field { flex: 1; text-align: left; min-width: 0; }
.b-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--primary); margin-bottom: 8px;
}
.b-input {
  border: none; background: transparent; font-size: 1rem;
  font-weight: 600; color: var(--text-dark); font-family: inherit; outline: none; width: 100%;
}
.b-input::placeholder { color: #c5c5c5; font-weight: 500; }

.route-arrow { display: flex; align-items: center; padding: 0 20px; gap: 8px; flex-shrink: 0; }
.route-line { width: 40px; height: 1px; background: rgba(201,76,76,0.25); }
.route-icon {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(201,76,76,0.08); border: 1.5px solid rgba(201,76,76,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; color: var(--primary); flex-shrink: 0;
}

.b-counters { display: flex; align-items: center; gap: 24px; }
.b-counter-group { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.b-counter-label {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--primary);
}
.b-cnt-sep { width: 1px; height: 40px; background: rgba(0,0,0,0.07); }
.b-counter-ctrl { display: flex; align-items: center; gap: 12px; }
.cnt-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1.5px solid rgba(201,76,76,0.25); background: rgba(201,76,76,0.05);
  color: var(--primary); font-size: 1.1rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: var(--transition); line-height: 1; font-family: inherit;
}
.cnt-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }
.cnt-btn.faded { opacity: 0.3; cursor: not-allowed; }
.cnt-val { font-size: 1.25rem; font-weight: 900; color: var(--text-dark); min-width: 22px; text-align: center; }

.b-search-btn {
  display: flex; align-items: center; gap: 10px;
  background: var(--primary); color: white; border: none;
  border-radius: 16px; padding: 16px 32px;
  font-family: inherit; font-size: 0.9rem; font-weight: 800;
  cursor: pointer; transition: var(--transition); white-space: nowrap; letter-spacing: 0.5px;
}
.b-search-btn:hover { background: #b34242; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201,76,76,0.4); }

/* ===== LOGO MARQUEE ===== */
.logo-marquee-wrap {
  background: var(--primary); padding: 8px 0; overflow: hidden;
  display: flex; flex-direction: column; gap: 0;
}
.white-marquee {
  background: var(--bg-color);
  border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);
  padding: 4px 0;
}
.logo-marquee-track { overflow: hidden; width: 100%; }
.logo-marquee-inner {
  display: flex; width: max-content;
  animation: marquee-fwd 50s linear infinite;
  gap: 40px;
}
@keyframes marquee-fwd {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.logo-marquee-item {
  display: flex; align-items: center;
  padding: 0 !important;
  position: relative;
}
.logo-marquee-item::after {
  content: "•";
  position: absolute;
  right: -24px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.25rem;
}
.marquee-text {
  font-size: 1.25rem;
  font-weight: 800;
  color: white;
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
.marquee-logo-img {
  height: 95px; width: auto; object-fit: contain; opacity: 0.9;
  transition: opacity 0.3s; filter: brightness(0) invert(1);
}
.marquee-logo-color { filter: none; opacity: 0.8; height: 44px; }

/* ===== EVENTS ===== */
.vibes-section { padding-top: 25px; }

/* ===== TIERS (Armada Kami) ===== */
.tiers-section {
  padding-top: 35px;
}
.tiers-section .section-title-box {
  margin-bottom: 2rem !important;
}
.tiers-section .events-cards {
  gap: 20px;
}
.events-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.event-card {
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
  height: 160px;
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
.event-card:hover .event-card-img {
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
.event-card:hover .event-card-img::after {
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
  font-size: 0.8rem;
  color: var(--text-light);
  font-weight: 600;
  margin-bottom: 4px;
}
.event-name {
  font-size: 1.15rem !important;
  font-weight: 800 !important;
  color: var(--text-dark) !important;
  margin-bottom: 4px !important;
  letter-spacing: -0.3px;
  line-height: 1.3;
}
.event-organizer {
  font-size: 0.9rem;
  color: #000000 !important;
  font-weight: 400 !important;
  margin-bottom: 12px;
}
.event-meta { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.meta-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78rem;
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

/* View all button */
.view-all-wrap {
  display: flex;
  justify-content: center;
  margin-top: 48px;
}
.view-all-btn {
  display: inline-flex; align-items: center; gap: 10px;
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
  padding: 14px 32px;
  border-radius: 16px;
  font-family: inherit; font-size: 0.95rem; font-weight: 800;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  letter-spacing: 0.3px;
}
.view-all-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(201,76,76,0.25);
}
.view-all-btn:hover svg { transform: translateX(4px); }
.view-all-btn svg { transition: transform 0.3s; }
.view-all-btn:active { transform: translateY(0); }

/* ===== EVENT MODAL ===== */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.modal-card {
  background: var(--card-bg); border-radius: 32px; overflow: hidden;
  width: 100%; max-width: 520px;
  box-shadow: 0 40px 100px rgba(0,0,0,0.3);
  position: relative; max-height: 90vh; overflow-y: auto;
}
.modal-close {
  position: absolute; top: 16px; right: 16px; z-index: 10;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(0,0,0,0.4); color: white; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.modal-close:hover { background: var(--primary); transform: rotate(90deg); }
.modal-img { height: 200px; position: relative; }
.modal-img img { width: 100%; height: 100%; object-fit: cover; }
.modal-img-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6)); }
.modal-tag {
  position: absolute; bottom: 16px; left: 20px;
  background: var(--primary); color: white; padding: 4px 14px;
  border-radius: 20px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
}
.modal-body { padding: 32px; }
.modal-title { font-size: 1.8rem; font-weight: 900; margin-bottom: 12px; color: var(--text-dark); letter-spacing: -0.5px; }
.modal-desc { font-size: 0.95rem; color: var(--text-light); line-height: 1.7; margin-bottom: 24px; }

.modal-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 0; }
.meta-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.8rem; font-weight: 700; color: var(--text-dark);
  background: var(--input-bg); border-radius: 14px; padding: 12px 14px;
  border: 1px solid var(--border-color);
}
.meta-item.seats { color: var(--primary); background: rgba(201,76,76,0.04); border-color: rgba(201,76,76,0.1); }

.modal-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 24px 0; }

.section-tag-mini { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--primary); margin-bottom: 16px; }

/* Route Visual */
.modal-route-box { background: var(--input-bg); border-radius: 20px; padding: 20px; border: 1px dashed rgba(201,76,76,0.2); }
.route-visual { position: relative; height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; margin-bottom: 10px; }
.route-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); position: relative; z-index: 2; box-shadow: 0 0 0 4px rgba(201,76,76,0.1); }
.route-line-dashed { position: absolute; left: 15px; right: 15px; height: 1px; border-top: 2px dashed rgba(201,76,76,0.25); z-index: 1; }
.route-target-icon { width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; position: relative; z-index: 2; box-shadow: 0 4px 10px rgba(201,76,76,0.3); }
.route-labels { position: absolute; width: 100%; left: 0; bottom: -25px; display: flex; justify-content: space-between; }
.route-label-item { display: flex; flex-direction: column; }
.route-label-item .l-top { font-size: 0.65rem; font-weight: 700; color: #bbb; text-transform: uppercase; }
.route-label-item .l-bottom { font-size: 0.75rem; font-weight: 800; color: var(--text-dark); }
.text-right { text-align: right; }

.modal-counter-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: var(--primary); margin-bottom: 16px; }
.modal-counters { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }
.m-counter-group { display: flex; flex-direction: column; gap: 8px; }
.m-counter-lbl {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-light);
}
.m-counter-ctrl { display: flex; align-items: center; gap: 16px; }
.m-cnt-sep { width: 1px; height: 40px; background: rgba(0,0,0,0.07); }
.modal-book-btn {
  width: 100%; padding: 20px; background: var(--primary); color: white;
  border: none; border-radius: 20px; font-weight: 900; font-size: 1rem;
  cursor: pointer; transition: all 0.3s ease; font-family: inherit; letter-spacing: 0.5px;
  box-shadow: 0 10px 30px rgba(201,76,76,0.2);
}
.modal-book-btn:hover { background: #b34242; transform: translateY(-3px); box-shadow: 0 15px 35px rgba(201,76,76,0.4); }

/* divider */
.thin-border-divider { height: 1px; background: linear-gradient(to right, transparent, rgba(201, 76, 76, 0.1), transparent); margin: 10px 0; }

/* Final CTA */
.final-cta-section { padding: 40px 0 100px; }
.cta-banner-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d1010 100%);
  border-radius: 32px;
  padding: 50px 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
}
.cta-banner-card::before {
  content: ''; position: absolute; top: -50%; left: -20%; width: 60%; height: 200%;
  background: radial-gradient(circle, rgba(201,76,76,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.cta-title { font-size: 2.2rem; font-weight: 900; color: white; margin-bottom: 12px; letter-spacing: -1px; }
.cta-desc { font-size: 1.1rem; color: rgba(255,255,255,0.6); max-width: 500px; }
.cta-action-btn {
  padding: 18px 36px; font-size: 1rem; font-weight: 900;
  display: flex; align-items: center; gap: 12px;
  white-space: nowrap; border-radius: 18px;
  box-shadow: 0 10px 30px rgba(201,76,76,0.3);
}

/* responsive refinements */
@media (max-width: 1024px) {
  .cta-banner-card { flex-direction: column; text-align: center; padding: 40px; }
  .cta-desc { margin: 0 auto; }
}

@media (max-width: 768px) {
  .hero-section { margin-top: 0px !important; }

  .section {
    padding: 50px 0 !important;
  }
  .creative-title {
    font-size: 1.5rem !important;
  }
  .logo-marquee-wrap {
    padding: 6px 0 !important;
  }
  .logo-marquee-item {
    padding: 0 24px !important;
  }
  .marquee-text {
    font-size: 0.95rem !important;
    letter-spacing: 0.2px !important;
  }

  .booking-card { border-radius: 20px; }
  .booking-row-inputs { padding: 20px 20px 16px; gap: 12px; }
  .booking-row-bottom { padding: 12px 20px 20px; flex-direction: column; gap: 14px; }
  .b-search-btn { justify-content: center; width: 100%; height: 50px; font-size: 1rem; border-radius: 14px; }
  .b-counters { width: 100%; justify-content: space-around; gap: 10px; }
  .b-cnt-sep { height: 30px; }
  .route-arrow { padding: 4px 0; transform: rotate(90deg); }
  .route-line { width: 15px; }

  .events-cards { grid-template-columns: 1fr !important; gap: 28px; }
  .event-card-img { height: 180px !important; }
  .event-card-body { padding: 12px 0 0 !important; }
  .event-name { font-size: 1.15rem !important; margin-bottom: 4px !important; }
  .event-city-text { font-size: 0.85rem !important; }
  .vibes-section { padding-top: 18px !important; }
  .event-price { font-size: 1.1rem !important; }
  .event-card-footer {
    flex-direction: column;
    align-items: stretch !important;
    gap: 10px;
    padding-top: 12px !important;
  }
  .book-now-btn {
    width: 100%;
    text-align: center;
    padding: 8px 16px;
    font-size: 0.8rem;
    border-radius: 10px;
  }

  .tiers-grid { grid-template-columns: 1fr; gap: 20px; }
  .tier-visual { height: 180px; }
  .tier-info { padding: 20px; }
  .tier-info h3 { font-size: 1.4rem; }
  .tiers-section { padding-top: 15px !important; }
  .tiers-section .section-title-box { margin-bottom: 1rem !important; }
  .tiers-section .events-cards { gap: 16px !important; }
  .pickup-discovery { padding-top: 15px !important; }

  .discovery-grid {
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
  }
  .search-panel {
    height: 260px !important;
    padding: 12px !important;
    border-radius: 16px !important;
  }
  .custom-search {
    margin-bottom: 12px !important;
  }
  .custom-search input {
    padding: 10px 12px 10px 38px !important;
    font-size: 0.85rem !important;
    border-radius: 12px !important;
  }
  .srch-icon {
    left: 12px !important;
    width: 14px !important;
    height: 14px !important;
  }
  .group-label {
    margin: 10px 0 6px !important;
    font-size: 0.65rem !important;
  }
  .loc-card {
    padding: 10px 12px !important;
    border-radius: 12px !important;
    margin-bottom: 8px !important;
  }
  .loc-text h5 {
    font-weight: 800 !important;
    font-size: 0.85rem !important;
  }
  .loc-text p {
    font-size: 0.72rem !important;
  }
  .map-panel {
    min-height: 220px !important;
    height: 220px !important;
    border-radius: 16px !important;
    margin-bottom: 0 !important;
  }

  .amenities-section { padding: 45px 0 30px; }
  .amenities-grid {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    gap: 16px !important;
    margin-top: 28px !important;
    padding: 10px 20px 20px !important;
    margin-left: -20px !important;
    margin-right: -20px !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
  }
  .amenities-grid::-webkit-scrollbar {
    display: none !important;
  }
  .amenity-box {
    flex: 0 0 220px !important;
    text-align: center;
    background: rgba(255, 255, 255, 0.08) !important;
    padding: 20px 14px !important;
    border-radius: 18px !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
  }
  .amenity-icon {
    width: 60px !important;
    height: 60px !important;
    border-radius: 18px !important;
    margin: 0 auto 16px !important;
  }
  .amenity-icon svg {
    width: 28px !important;
    height: 28px !important;
  }
  .amenity-box h4 {
    font-size: 1rem !important;
    color: white !important;
    font-weight: 800 !important;
  }
  .amenity-box p {
    font-size: 0.82rem !important;
    color: rgba(255, 255, 255, 0.8) !important;
    line-height: 1.4 !important;
  }

  .heart-section { padding: 20px 0 20px; }
  .main-para { font-size: 1.2rem; line-height: 1.5; }
  .sub-para { font-size: 0.95rem; line-height: 1.6; }
  .stats-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 32px !important;
  }
  .stat-circle {
    width: 105px;
    height: 105px;
    border: 1.5px solid rgba(201, 76, 76, 0.12);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px;
  }
  .stat-circle .val {
    font-size: 1.3rem;
    font-weight: 900;
  }
  .stat-circle .lab {
    font-size: 0.55rem;
    line-height: 1.2;
    text-align: center;
    max-width: 90%;
    text-transform: uppercase;
    font-weight: 800;
  }

  .reviews-section { padding: 20px 0 0; }
  .review-card { width: 280px; padding: 18px; }
  .review-text { font-size: 0.82rem; }

  .cta-banner-card { padding: 32px 24px; border-radius: 24px; }
  .cta-title { font-size: 1.5rem; line-height: 1.2; }
  .cta-desc { font-size: 0.85rem; margin-bottom: 24px; }
  .cta-action-btn { width: 100%; justify-content: center; padding: 16px; font-size: 0.9rem; border-radius: 14px; }

  /* Modal mobile refinements — Centered Rounded Rectangle */
  .modal-card { 
    border-radius: 32px; 
    max-width: 350px; 
    width: 88%;
    max-height: 80vh; 
    margin: auto;
    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
  }
  .modal-img { height: 140px; }
  .modal-body { padding: 18px 16px 24px; }
  .modal-title { font-size: 1.25rem; margin-bottom: 8px; }
  .modal-desc { font-size: 0.85rem; line-height: 1.5; margin-bottom: 16px; }
  .modal-info-grid { grid-template-columns: 1fr; gap: 6px; }
  .meta-item { padding: 8px 12px; font-size: 0.75rem; border-radius: 10px; }
  .modal-divider { margin: 16px 0; }
  .modal-route-box { padding: 12px; border-radius: 14px; }
  .route-visual { height: 36px; margin-bottom: 4px; }
  .route-dot { width: 8px; height: 8px; }
  .route-target-icon { width: 26px; height: 26px; }
  .route-target-icon component { transform: scale(0.85); }
  .route-label-item .l-top { font-size: 0.6rem; }
  .route-label-item .l-bottom { font-size: 0.68rem; }
  .section-tag-mini { font-size: 0.6rem; margin-bottom: 10px; }
  .modal-counter-label { font-size: 0.6rem; margin-bottom: 12px; }
  .modal-counters { gap: 10px; margin-bottom: 20px; }
  .m-counter-group { flex: 1; }
  .m-counter-lbl { font-size: 0.58rem; }
  .m-counter-ctrl { gap: 10px; }
  .cnt-btn { width: 32px; height: 32px; }
  .cnt-val { font-size: 1rem; }
  .modal-book-btn { padding: 14px; font-size: 0.9rem; border-radius: 14px; }
}

/* modal transition */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.95); }

/* ===== TIERS ===== */
.tiers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.tier-card { border-radius: 36px; overflow: hidden; background: var(--card-bg); box-shadow: var(--shadow-md); display: flex; flex-direction: column; }
.tier-card.dark { background: #111; color: white; }
.tier-visual { height: 320px; position: relative; }
.tier-visual img { width: 100%; height: 100%; object-fit: cover; }
.tier-badge { position: absolute; bottom: 24px; left: 24px; background: var(--card-bg); color: var(--text-dark); padding: 7px 18px; border-radius: 10px; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; }
.tier-badge.vip { background: var(--primary); color: white; }
.tier-info { padding: 44px; }
.tier-tag { color: var(--primary); font-weight: 800; text-transform: uppercase; font-size: 0.75rem; margin-bottom: 10px; }
.tier-info h3 { font-size: 2rem; margin-bottom: 16px; }
.tier-list { list-style: none; margin-top: 24px; }
.tier-list li { margin-bottom: 12px; display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.95rem; }
.btn-outline-red { border: 2px solid var(--primary); color: var(--primary); padding: 12px 28px; border-radius: 14px; font-weight: 800; cursor: pointer; background: transparent; font-family: inherit; }
.btn-outline-red:hover { background: var(--primary); color: white; }

/* ===== DISCOVERY ===== */
.discovery-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 36px; }
.search-panel {
  border-radius: 28px; padding: 28px; height: 580px;
  display: flex; flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--border-color); box-shadow: var(--shadow-md);
}
.custom-search { position: relative; margin-bottom: 24px; }
.srch-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--primary); }
.custom-search input { width: 100%; padding: 16px 18px 16px 50px; border: 1px solid var(--border-color); border-radius: 18px; background: var(--input-bg); color: var(--text-dark); font-weight: 600; font-family: inherit; outline: none; }
.results-scroll { flex: 1; overflow-y: auto; padding-right: 8px; }
.group-label { font-size: 0.7rem; color: var(--text-light); text-transform: uppercase; letter-spacing: 2px; margin: 18px 0 8px; }
.loc-card { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; background: rgba(201,76,76,0.02); border-radius: 16px; margin-bottom: 10px; cursor: pointer; border: 1px solid transparent; transition: var(--transition); }
.loc-card:hover { background: var(--input-bg); border-color: var(--primary); box-shadow: var(--shadow-sm); }
.loc-text h5 { font-weight: 800; font-size: 1rem; margin-bottom: 3px; }
.loc-text p { font-size: 0.82rem; color: var(--text-light); }
.loc-action { color: var(--primary); }
.map-panel { border-radius: 28px; overflow: hidden; position: relative; min-height: 400px; height: 100%; border: 1px solid var(--border-color); box-shadow: var(--shadow-md); }
.map-panel iframe { width: 100%; height: 100%; border: 0; display: block; }
.map-placeholder-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: #1a1a1a; color: white; gap: 16px; min-height: 400px; }
.map-spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: map-spin 1s linear infinite; }
@keyframes map-spin { to { transform: rotate(360deg); } }
.map-floating-card { position: absolute; top: 24px; right: 24px; background: var(--card-bg); padding: 18px; border-radius: 20px; text-align: center; box-shadow: var(--shadow-md); }
.hub-count { font-size: 1.8rem; font-weight: 900; color: var(--primary); }
.hub-label { font-size: 0.7rem; font-weight: 800; color: var(--text-light); text-transform: uppercase; }

/* ===== AMENITIES ===== */
.amenities-section { background: var(--primary); padding: 60px 0 40px; }
.amenities-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 36px; margin-top: 36px; color: white; }
.amenity-icon { width: 68px; height: 68px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: white; border-radius: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; transition: var(--transition); }
.amenity-box:hover .amenity-icon { background: white; color: var(--primary); transform: translateY(-4px); }
.amenity-box h4 { font-weight: 800; margin-bottom: 10px; font-size: 1rem; }
.amenity-box p { font-size: 0.88rem; opacity: 0.75; }

/* ===== HEART SECTION ===== */
.heart-section { padding: 40px 0 40px; background-image: radial-gradient(ellipse at 50% 0%, rgba(201,76,76,0.06) 0%, transparent 60%); }
.heart-container { max-width: 800px; margin: 0 auto; text-align: center; }
.main-para { font-size: 1.85rem; font-weight: 800; line-height: 1.45; color: var(--text-dark); }
.sub-para { font-size: 1.1rem; line-height: 1.85; color: var(--text-light); }
.stats-row { display: flex; justify-content: center; gap: 40px; align-items: center; }
.stat-circle {
  width: 140px; height: 140px; border: 1.5px solid rgba(201,76,76,0.12); border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; transition: var(--transition);
}
.stat-circle:hover { border-color: var(--primary); box-shadow: 0 0 0 6px rgba(201,76,76,0.05); transform: scale(1.05); }
.stat-circle.secondary { background: var(--primary); color: white; border: none; box-shadow: 0 12px 30px rgba(201,76,76,0.3); }
.stat-circle .val { font-size: 1.75rem; font-weight: 900; }
.stat-circle .lab { font-size: 0.65rem; text-transform: uppercase; font-weight: 800; letter-spacing: 1.5px; opacity: 0.7; }

/* ===== REVIEWS — HORIZONTAL MARQUEE ===== */
.reviews-section { background: var(--bg-color); padding: 40px 0 0; }
.reviews-marquee-outer {
  overflow: hidden;
  padding: 40px 0 80px;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
}
.reviews-marquee-inner {
  display: flex;
  gap: 24px;
  width: max-content;
  animation: reviews-scroll 40s linear infinite;
}
.reviews-marquee-inner:hover { animation-play-state: paused; }
@keyframes reviews-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.review-card {
  background: var(--card-bg); border-radius: 24px; padding: 28px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  display: flex; flex-direction: column; gap: 16px;
  width: 360px; flex-shrink: 0;
  transition: var(--transition);
}
.review-card:hover { box-shadow: var(--shadow-lg); border-color: var(--primary); }
.review-header { display: flex; align-items: center; gap: 14px; }
.reviewer-avatar {
  width: 46px; height: 46px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 1rem; color: white; flex-shrink: 0;
}
.reviewer-info { flex: 1; }
.reviewer-name { font-weight: 800; font-size: 0.95rem; color: var(--text-dark); margin-bottom: 2px; }
.reviewer-trip { font-size: 0.72rem; color: var(--text-light); font-weight: 600; }
.review-stars { display: flex; gap: 2px; flex-shrink: 0; }
.star { font-size: 0.9rem; color: #e0e0e0; }
.star.filled { color: #FFB800; }
.review-text { font-size: 0.9rem; line-height: 1.75; color: var(--text-light); flex: 1; }
.review-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05); }
.review-date { font-size: 0.72rem; color: #bbb; font-weight: 600; }
.review-tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--primary); background: rgba(201,76,76,0.08); padding: 3px 10px; border-radius: 20px; }

@media (max-width: 480px) {
  .events-cards { grid-template-columns: 1fr; gap: 32px; }
  .event-card-img { height: 150px !important; }
  .event-card-body { padding: 12px 0 0 !important; }
  .event-name { font-size: 1.1rem !important; }
  .creative-title {
    font-size: 1.3rem !important;
  }
  .logo-marquee-wrap {
    padding: 4px 0 !important;
  }
  .logo-marquee-inner {
    gap: 30px !important;
  }
  .logo-marquee-item {
    padding: 0 !important;
  }
  .logo-marquee-item::after {
    right: -18px !important;
    font-size: 0.85rem;
  }
  .marquee-text {
    font-size: 0.85rem !important;
  }
  .amenities-section { padding: 30px 0 20px; }
  .stats-row {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .stat-circle {
    width: 120px;
    height: 120px;
  }
  .stat-circle .val {
    font-size: 1.5rem;
  }
  .stat-circle .lab {
    font-size: 0.65rem;
  }
}

.text-marquee { background: var(--primary); padding: 15px 0; color: white; display: flex; align-items: center; overflow: hidden; }
.text-marquee-inner { display: flex; gap: 40px; padding-right: 40px; font-weight: bold; font-size: 1.2rem; align-items: center; white-space: nowrap; }
.text-marquee-inner span { position: relative; }
.text-marquee-inner span:not(:last-child)::after { content: "•"; position: absolute; right: -25px; color: rgba(255,255,255,0.5); }

/* Custom slide-up toast notification */
.mobile-toast {
  position: fixed;
  bottom: 80px; /* above bottom navigation */
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(45, 45, 45, 0.95);
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 20px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  max-width: 85%;
  width: max-content;
  text-align: center;
  pointer-events: none;
}
.toast-text {
  font-size: 0.8rem;
  font-weight: 700;
}

/* Toast animations */
.toast-fade-enter-active, 
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

.event-card-mobile {
  display: none;
}

@media (max-width: 768px) {
  .events-cards {
    display: flex !important;
    flex-direction: row !important;
    overflow-x: auto !important;
    scroll-snap-type: x mandatory;
    gap: 16px !important;
    padding: 4px 4px 16px 4px !important;
    -webkit-overflow-scrolling: touch;
  }
  .events-cards::-webkit-scrollbar {
    display: none;
  }
  
  .event-card-desktop {
    display: none !important;
  }
  
  .event-card {
    background: var(--card-bg, #ffffff) !important;
    border: none !important;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
    border-radius: 12px !important;
    overflow: hidden;
    padding: 0 !important;
    display: block !important;
    transition: all 0.3s ease !important;
    flex: 0 0 280px !important;
    scroll-snap-align: start;
  }

  .event-card-mobile {
    display: flex !important;
    flex-direction: column;
    width: 100%;
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
    font-size: 1.25rem;
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

  /* Hide sections below vibes-section on mobile */
  .text-marquee-wrap,
  .pickup-discovery,
  .amenities-section,
  .heart-section,
  .final-cta-section {
    display: none !important;
  }

  /* Sticky Services Bar */
  .mobile-sticky-services-bar {
    position: fixed;
    top: 44px;
    left: 10px;
    right: 0;
    z-index: 998;
    background: #ffffff !important;
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08)) !important;
    box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.12) !important;
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding: 10px 16px;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
  }
  
  [data-theme="dark"] .mobile-sticky-services-bar {
    background: #ffffff !important;
    border-bottom-color: var(--border-color, rgba(255, 255, 255, 0.08)) !important;
  }
  
  .mobile-sticky-services-bar::-webkit-scrollbar {
    display: none;
  }

  .sticky-service-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 16px;
    background: #f4f4f5;
    border: 1px solid rgba(0, 0, 0, 0.04);
    color: #888888;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    flex: 0 0 auto;
    scroll-snap-align: start;
    transition: all 0.2s ease;
  }
  
  [data-theme="dark"] .sticky-service-item {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.02);
    color: #888888;
  }

  .sticky-service-item svg {
    color: #888888 !important;
    transition: color 0.2s ease;
  }

  .sticky-service-item.active {
    background: var(--primary, #C94C4C) !important;
    color: #ffffff !important;
    border-color: var(--primary, #C94C4C) !important;
  }

  .sticky-service-item.active svg {
    color: #ffffff !important;
  }

  /* Transition for sticky bar (targeted globally for Teleport elements) */
  :global(.fade-slide-enter-active),
  :global(.fade-slide-leave-active) {
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  
  :global(.fade-slide-enter-from),
  :global(.fade-slide-leave-to) {
    transform: translateY(-20px) !important;
    opacity: 0 !important;
  }
}
</style>
