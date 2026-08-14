<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { X, Instagram, Compass, ShieldCheck, CreditCard } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const paymentMethods = [
  { name: 'BJB', logo: '/metodePembayaran/TFBANK/bjb.png' },
  { name: 'BCA', logo: '/metodePembayaran/TFBANK/bca.png' },
  { name: 'BNI', logo: '/metodePembayaran/TFBANK/bni.png' },
  { name: 'DANA', logo: '/metodePembayaran/Ewallets/dana.png' },
  { name: 'OVO', logo: '/metodePembayaran/Ewallets/ovo.png' },
  { name: 'ShopeePay', logo: '/metodePembayaran/Ewallets/shopeepay.png' },
  { name: 'LinkAja', logo: '/metodePembayaran/Ewallets/linkaja.png' },
  { name: 'AstraPay', logo: '/metodePembayaran/Ewallets/astrapay.png' },
  { name: 'Jenius', logo: '/metodePembayaran/Ewallets/Jenius.png' },
  { name: 'QRIS', logo: '/metodePembayaran/qris/qris.jpg' },
  { name: 'VISA', logo: '/metodePembayaran/CARDCREDIT/VISA.webp' },
  { name: 'MasterCard', logo: '/metodePembayaran/CARDCREDIT/mastercard.png' },
  { name: 'JCB', logo: '/metodePembayaran/CARDCREDIT/jcb.png' },
  { name: 'American Express', logo: '/metodePembayaran/CARDCREDIT/americanexpress.png' },
  { name: 'BRI Direct Debit', logo: '/metodePembayaran/debit/bridirectdebit.png' },
  { name: 'Mandiri', logo: '/metodePembayaran/debit/mandiri.png' },
  { name: 'Alfamart', logo: '/metodePembayaran/retail/alfamart.jpg' },
  { name: 'Indomaret', logo: '/metodePembayaran/retail/indomaret.jpg' }
];

const isOnHome = computed(() => route.path === '/');

const handleFooterNav = (targetId) => {
  if (targetId === 'home') {
    router.push('/');
    return;
  }
  if (targetId === 'events') {
    router.push('/events');
    return;
  }
  
  // Scroll sections
  if (!isOnHome.value) {
    router.push('/').then(() => {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    });
    return;
  }
  const el = document.getElementById(targetId);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

const paymentScrollContainer = ref(null);
let scrollInterval = null;

onMounted(() => {
  const container = paymentScrollContainer.value;
  if (!container) return;

  let speed = 0.8; // Smooth, slow speed
  let isHovered = false;

  const handleMouseEnter = () => { isHovered = true; };
  const handleMouseLeave = () => { isHovered = false; };

  container.addEventListener('mouseenter', handleMouseEnter);
  container.addEventListener('mouseleave', handleMouseLeave);

  scrollInterval = setInterval(() => {
    if (isHovered) return;
    
    container.scrollTop += speed;
    
    // Half height wrap-around for seamless loop since list is duplicated
    const halfHeight = container.scrollHeight / 2;
    if (container.scrollTop >= halfHeight - 1) {
      container.scrollTop = 0;
    }
  }, 25);
});

onBeforeUnmount(() => {
  if (scrollInterval) clearInterval(scrollInterval);
});
</script>

<template>
  <footer class="footer">
    <div class="container footer-container">
      <!-- Desktop & Tablet Layout -->
      <div v-if="false" class="footer-grid desktop-footer-content">
        <!-- Column 1: Brand -->
        <div class="footer-col brand-col">
          <div class="footer-logo-wrapper">
            <div class="footer-logo-container">
              <router-link to="/">
                <img src="/AJAKLogo/LOGO.png" alt="AJAK! Logo" class="footer-logo-img" />
              </router-link>
            </div>
            <div class="footer-tagline-container">
              <span class="logo-tagline">Antar Jemput Anak Konser</span>
            </div>
          </div>
          <p class="brand-desc">
           platform perjalanan untuk seluruh acara/event di indonesia, kami menyediakan solusi shuttle bus yang aman, nyaman dan terpercaya untuk mengantar anda ke event/acara impian.
          </p>
          <div class="social-links">
            <a href="#" class="social-btn" aria-label="X">
              <X class="social-icon" />
            </a>
            <a href="#" class="social-btn" aria-label="TikTok">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="social-icon">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
            <a href="#" class="social-btn" aria-label="Instagram">
              <Instagram class="social-icon" />
            </a>
          </div>
        </div>

        <!-- Grouped Columns 2 & 3 -->
        <div class="footer-nav-columns">
          <!-- Tentang AJAK! (Bantuan & Legalitas) -->
          <div class="footer-col">
            <h4 class="footer-col-title">
              <ShieldCheck class="title-icon" />
              Tentang AJAK!
            </h4>
            <div class="legal-buttons">
              <router-link 
                to="/help?tab=syarat"
                :class="['legal-tab-btn', { active: $route.path === '/help' && $route.query.tab === 'syarat' }]"
              >
                Syarat & Ketentuan
              </router-link>
              <router-link 
                to="/help?tab=kebijakan"
                :class="['legal-tab-btn', { active: $route.path === '/help' && $route.query.tab === 'kebijakan' }]"
              >
                Kebijakan Privasi
              </router-link>
              <router-link 
                to="/help?tab=cara"
                :class="['legal-tab-btn', { active: $route.path === '/help' && $route.query.tab === 'cara' }]"
              >
                Cara Pembelian Tiket
              </router-link>
            </div>
          </div>

          <!-- Tautan Cepat -->
          <div class="footer-col">
            <h4 class="footer-col-title">
              <Compass class="title-icon" />
              Tautan Cepat
            </h4>
            <ul class="footer-links">
              <li><a href="#" @click.prevent="handleFooterNav('home')">Beranda</a></li>
              <li><a href="#" @click.prevent="handleFooterNav('events')">Event</a></li>
              <li><a href="#" @click.prevent="handleFooterNav('services')">Layanan</a></li>
              <li><a href="#" @click.prevent="handleFooterNav('discovery')">Penjemputan</a></li>
              <li><a href="#" @click.prevent="handleFooterNav('Tentang')">Tentang</a></li>
            </ul>
          </div>
        </div>

        <!-- Column 3: Payment Methods -->
        <div class="footer-col payment-col">
          <h4 class="footer-col-title">
            <CreditCard class="title-icon" />
            Metode Pembayaran
          </h4>
          <div class="payment-scroll-wrapper">
            <div class="payment-scroll-container" ref="paymentScrollContainer">
              <div class="payment-grid">
                <!-- First set -->
                <div 
                  v-for="(pay, idx) in paymentMethods" 
                  :key="'a-' + idx" 
                  class="payment-card"
                  :title="pay.name"
                >
                  <img :src="pay.logo" :alt="pay.name" />
                </div>
                <!-- Second set for seamless looping -->
                <div 
                  v-for="(pay, idx) in paymentMethods" 
                  :key="'b-' + idx" 
                  class="payment-card"
                  :title="pay.name"
                  aria-hidden="true"
                >
                  <img :src="pay.logo" :alt="pay.name" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile App Style Footer -->
      <div class="mobile-footer-content">
        <div class="footer-logo-wrapper text-center">
          <router-link to="/">
            <img src="/AJAKLogo/LOGO.png" alt="AJAK! Logo" class="footer-logo-img" />
          </router-link>
          <span class="logo-tagline text-center">Antar Jemput Anak Konser</span>
        </div>
        <p v-if="false" class="brand-desc text-center mt-3">
          Solusi Shuttle Bus Konser Terpercaya di Indonesia
        </p>
        <div v-if="false" class="social-links justify-center mt-3">
          <a href="#" class="social-btn" aria-label="X">
            <X class="social-icon" />
          </a>
          <a href="#" class="social-btn" aria-label="TikTok">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="social-icon">
              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
            </svg>
          </a>
          <a href="#" class="social-btn" aria-label="Instagram">
            <Instagram class="social-icon" />
          </a>
        </div>
        <div v-if="false" class="mobile-legal-links mt-4">
          <router-link to="/help?tab=syarat">Syarat & Ketentuan</router-link>
          <span class="dot-sep">•</span>
          <router-link to="/help?tab=kebijakan">Kebijakan Privasi</router-link>
        </div>
      </div>

      <hr class="footer-divider" />

      <!-- Bottom Bar -->
      <div class="footer-bottom">
        <p class="copyright">© 2025 AJAK! Transportation. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--bg-color);
  color: var(--text-light);
  padding: 60px 0 30px;
  border-top: 1.5px solid rgba(201, 76, 76, 0.19); /* Low opacity border */
  font-size: 0.95rem;
  margin-top: auto;
}

.footer-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr; /* 3 main columns on desktop */
  gap: 60px; /* Generous gap between Brand and Nav columns */
}

.payment-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.payment-scroll-wrapper {
  position: relative;
  width: 100%;
}

.payment-scroll-container {
  width: 100%;
  max-width: 200px; /* Slightly wider boundary */
  height: 180px; /* Longer vertical boundary */
  overflow-y: auto;
  cursor: grab;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.payment-scroll-container::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

.payment-scroll-container:active {
  cursor: grabbing;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(3, 50px); /* Fixed columns to bring cards close */
  justify-content: flex-start; /* Shift grid slightly to the left */
  gap: 4px;
  width: 100%;
}

.payment-card {
  width: 50px; /* Slightly enlarged */
  height: 50px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.25s ease;
}

.payment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(201, 76, 76, 0.1);
  border-color: rgba(201, 76, 76, 0.2);
}

.payment-card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.footer-nav-columns {
  display: flex;
  justify-content: flex-start;
  gap: 96px; /* Even wider gap between Column 2 and 3 */
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 160px;
}

.brand-col {
  padding-right: 40px;
}

.footer-logo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 152px;
}

.footer-logo-container {
  display: block;
  width: 100%;
}

.footer-logo-container a {
  display: block;
  width: 100%;
}

.footer-logo-img {
  height: 48px;
  width: 100%;
  object-fit: contain;
  object-position: left;
  margin-left: -8px;
  margin-bottom: 4px;
}

.footer-tagline-container {
  display: block;
  width: 100%;
}

.logo-tagline {
  font-size: 0.50rem;
  font-weight: 700;
  color: #6b6b76;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-top: -2px;
  display: block;
  padding-left: 0;
}

.brand-desc {
  line-height: 1.6;
  font-size: 0.9rem;
  color: var(--text-light);
}

.social-links {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(201, 76, 76, 0.05);
  border: 1px solid rgba(201, 76, 76, 0.12);
  color: var(--text-light);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.social-btn:hover {
  background-color: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(201, 76, 76, 0.2);
}

.social-icon {
  width: 18px;
  height: 18px;
}

.footer-col-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.title-icon {
  width: 18px;
  height: 18px;
  color: var(--primary);
}

.footer-links {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-links a {
  color: var(--text-light);
  transition: all 0.2s ease;
  font-weight: 500;
}

.footer-links a:hover {
  color: var(--primary);
  padding-left: 4px;
}

.legal-buttons {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.legal-tab-btn {
  color: var(--text-light);
  background: none;
  border: none;
  padding: 0;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: left;
  transition: all 0.2s ease;
  cursor: pointer;
}

.legal-tab-btn:hover {
  color: var(--primary);
  padding-left: 4px;
}

.legal-tab-btn.active {
  color: var(--primary);
  font-weight: 600;
}

.legal-tab-btn.active:hover {
  color: #ff6b6b;
  padding-left: 0;
}

.footer-divider {
  border: 0;
  height: 1.5px;
  background: var(--primary); /* Visible divider using primary color */
  opacity: 0.10; /* Low opacity divider */
  margin: 10px 0 0;
}

/* Footer Bottom */
.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #6b6b76;
}

.copyright {
  margin: 0;
  font-size: 0.75rem;
}

/* Responsive Rules */
@media (max-width: 991px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .brand-col {
    padding-right: 0;
  }
  
  .footer-nav-columns {
    justify-content: space-between;
    gap: 20px;
  }
}

.mobile-footer-content {
  display: none;
}

.justify-center {
  justify-content: center;
}

.text-center {
  text-align: center;
}

.mt-3 {
  margin-top: 12px;
}

.mt-4 {
  margin-top: 16px;
}

.mobile-legal-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 0.85rem;
}

.mobile-legal-links a {
  color: var(--text-light);
  font-weight: 500;
  transition: color 0.2s ease;
}

.mobile-legal-links a:hover {
  color: var(--primary);
}

.dot-sep {
  color: rgba(201, 76, 76, 0.25);
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .footer {
    padding: 30px 0 80px !important;
  }

  .footer-container {
    gap: 12px !important;
  }

  .footer-divider {
    margin: 8px 0 !important;
  }

  .desktop-footer-content {
    display: none !important;
  }

  .mobile-footer-content {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    gap: 6px !important;
  }

  .mobile-footer-content .footer-logo-wrapper {
    width: 100%;
    max-width: 120px;
    align-items: center;
  }

  .mobile-footer-content .footer-logo-img {
    margin-left: 0;
    object-position: center;
    height: 38px !important;
  }

  .mobile-footer-content .logo-tagline {
    font-size: 0.45rem !important;
    white-space: nowrap !important;
    letter-spacing: 0.2px !important;
    display: block !important;
    text-align: center !important;
    width: 100% !important;
    margin-top: 4px !important;
  }

  .mobile-footer-content .brand-desc {
    max-width: 280px;
    margin: 0 auto;
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .footer-bottom {
    justify-content: center !important;
    align-items: center;
  }

  .copyright {
    text-align: center;
    width: 100%;
    font-size: 0.68rem !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
}
</style>
