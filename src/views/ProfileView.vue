<script setup>
import { ref, computed, onMounted } from 'vue';
import { authState } from '../store/auth';
import { useRouter, useRoute } from 'vue-router';
import {
  ArrowLeft, User, LogOut, Shield, Star, ChevronRight,
  Clock, Wallet, Bookmark, UserCheck, Edit3,
  MessageSquare, ShoppingCart, Search, X, AlertCircle,
  Save, ShieldCheck, ChevronLeft, MoreVertical, Ticket, Tag, Globe
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

// Authentication guard
if (!authState.isLoggedIn) {
  authState.login();
}

// View switcher: 'profile' or 'history'
const activeView = ref('profile');

// User details
const userName = ref('afif maulana yusuf');
const userEmail = ref('afifmaulanayusuf11@gmail.com');
const userPhone = ref('+6281383260557');
const showEditModal = ref(false);
const editName = ref('');
const editEmail = ref('');
const editPhone = ref('');

// Transaction History States
const allTransactions = ref([]);
const searchQuery = ref('');
const statusFilter = ref('Semua');
const productFilter = ref('Semua');
const dateFilter = ref('Semua');
const isLoadingTransactions = ref(false);

// Load user profile details
const loadProfile = () => {
  const cached = localStorage.getItem('ajak_user_profile');
  if (cached) {
    try {
      const data = JSON.parse(cached);
      userName.value = data.name || userName.value;
      userEmail.value = data.email || userEmail.value;
      userPhone.value = data.phone || userPhone.value;
    } catch (e) {}
  }
};

// Save user profile details
const saveProfile = () => {
  userName.value = editName.value.trim() || userName.value;
  userEmail.value = editEmail.value.trim() || userEmail.value;
  userPhone.value = editPhone.value.trim() || userPhone.value;
  
  localStorage.setItem('ajak_user_profile', JSON.stringify({
    name: userName.value,
    email: userEmail.value,
    phone: userPhone.value
  }));
  
  if (authState.user) {
    authState.user.name = userName.value;
  }
  showEditModal.value = false;
};

const openEditModal = () => {
  editName.value = userName.value;
  editEmail.value = userEmail.value;
  editPhone.value = userPhone.value;
  showEditModal.value = true;
};


const initials = computed(() => {
  const name = userName.value || 'User';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const fetchTransactions = async () => {
  isLoadingTransactions.value = true;
  await new Promise(r => setTimeout(r, 400));

  const localBookings = JSON.parse(localStorage.getItem('ajak_bookings') || '[]');
  const isOnline = navigator.onLine;

  let serverOrders = [];
  
  if (isOnline) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shuttle-order`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data && result.data.data) {
          serverOrders = result.data.data;
          localStorage.setItem('ajak_cached_server_orders', JSON.stringify(serverOrders));
        }
      }
    } catch (e) {
      serverOrders = JSON.parse(localStorage.getItem('ajak_cached_server_orders') || '[]');
    }
  } else {
    serverOrders = JSON.parse(localStorage.getItem('ajak_cached_server_orders') || '[]');
  }

  const mappedServer = serverOrders.map(order => {
    const eventName = order.tickets?.[0]?.ticket?.name || order.tickets?.[0]?.shuttle_session?.name || 'Shuttle Reguler';
    const tripType = order.tickets?.[0]?.journey_type || order.tickets?.[0]?.trip_status?.name || order.tickets?.[0]?.ticket?.trip_status?.name || 'Pergi';
    return {
      id: order.invoice_no,
      invoice_no: order.invoice_no,
      created_at: order.created_at,
      status: order.payment_status?.toUpperCase() === 'PAID' || order.payment_status?.toUpperCase() === 'SUCCESS' ? 'SUCCESS' : 
              order.payment_status?.toUpperCase() === 'PENDING' ? 'PENDING' : 'FAILED',
      total_price: order.grandtotal || order.total_price || 0,
      event_name: eventName,
      type: 'Shuttle Bus',
      trip_type: tripType,
      isLocal: false
    };
  });

  const mappedLocal = localBookings.map(b => ({
    id: b.code,
    invoice_no: b.code,
    created_at: b.date,
    status: 'SUCCESS',
    total_price: b.totalPrice + 5000,
    event_name: b.event?.name || 'Shuttle Ticket',
    type: 'Shuttle Bus',
    trip_type: b.trip_type || (b.selectedseats?.some(s => s.includes('_1') || s.includes('_2')) ? 'Pulang Pergi' : 'Pergi'),
    isLocal: true
  }));

  const screenshotsMocks = [
    {
      id: '93608850132*****',
      invoice_no: 'TRX-109283-JAKCARD',
      created_at: '2026-04-10T17:15:00Z',
      status: 'SUCCESS',
      total_price: 11500,
      event_name: 'DKI Jakcard 10.000',
      type: 'Uang elektronik'
    },
    {
      id: '60329828141*****',
      invoice_no: 'TRX-209381-MANDIRI',
      created_at: '2026-01-19T17:16:00Z',
      status: 'SUCCESS',
      total_price: 11500,
      event_name: 'Mandiri E-Money 10.000',
      type: 'Uang elektronik'
    },
    {
      id: '60329860896*****',
      invoice_no: 'TRX-209390-MANDIRI',
      created_at: '2026-01-19T10:14:00Z',
      status: 'SUCCESS',
      total_price: 16500,
      event_name: 'Mandiri E-Money 15.000',
      type: 'Uang elektronik'
    },
    {
      id: '60329860896*****',
      invoice_no: 'TRX-102938-MANDIRI',
      created_at: '2025-07-16T12:05:00Z',
      status: 'SUCCESS',
      total_price: 16500,
      event_name: 'Mandiri E-Money 15.000',
      type: 'Uang elektronik'
    }
  ];

  const merged = [...mappedLocal, ...mappedServer, ...screenshotsMocks];
  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  allTransactions.value = merged;
  isLoadingTransactions.value = false;
};

const filteredTransactions = computed(() => {
  return allTransactions.value.filter(t => {
    const matchSearch = searchQuery.value.trim() === '' || 
      t.event_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      t.invoice_no.toLowerCase().includes(searchQuery.value.toLowerCase());

    let matchStatus = true;
    if (statusFilter.value === 'Berhasil') {
      matchStatus = t.status === 'SUCCESS';
    } else if (statusFilter.value === 'Pending') {
      matchStatus = t.status === 'PENDING';
    } else if (statusFilter.value === 'Gagal') {
      matchStatus = t.status === 'FAILED';
    }

    let matchProduct = true;
    if (productFilter.value === 'Shuttle Bus') {
      matchProduct = t.type === 'Shuttle Bus';
    } else if (productFilter.value === 'Uang elektronik') {
      matchProduct = t.type === 'Uang elektronik';
    }

    let matchDate = true;
    if (dateFilter.value !== 'Semua') {
      const transDate = new Date(t.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - transDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (dateFilter.value === 'Hari Ini') {
        matchDate = diffDays <= 1;
      } else if (dateFilter.value === '7 Hari Terakhir') {
        matchDate = diffDays <= 7;
      } else if (dateFilter.value === '30 Hari Terakhir') {
        matchDate = diffDays <= 30;
      }
    }

    return matchSearch && matchStatus && matchProduct && matchDate;
  });
});

const viewInvoice = (trx) => {
  if (trx.isLocal && trx.raw) {
    localStorage.setItem(`ajak_cached_invoice_${trx.invoice_no}`, JSON.stringify({
      invoice_no: trx.invoice_no,
      created_at: trx.created_at,
      payment_status: 'SUCCESS',
      total_price: trx.raw.totalPrice,
      admin_fee: 5000,
      grandtotal: trx.raw.totalPrice + 5000,
      pemesan: {
        passenger_name: trx.raw.customer?.name || 'User',
        email: trx.raw.customer?.email || '',
        phone: trx.raw.customer?.phone || ''
      },
      passengers: (trx.raw.selectedseats || []).map(seat => ({
        passenger_name: `${trx.raw.customer?.name || 'Penumpang'} (Kursi ${seat})`,
        name: trx.raw.customer?.name || 'Penumpang',
        identity_number: '-'
      })),
      tickets: (trx.raw.selectedseats || []).map(seat => ({
        price: trx.raw.totalPrice / (trx.raw.selectedseats.length || 1),
        order_seat_number: seat,
        ticket: {
          name: trx.raw.event?.name || 'Shuttle Ticket'
        }
      }))
    }));
  }
  router.push(`/shuttle-invoice/${trx.invoice_no}`);
};

const goBack = () => {
  if (activeView.value === 'history') {
    activeView.value = 'profile';
  } else {
    router.push('/');
  }
};

onMounted(() => {
  loadProfile();
  fetchTransactions();
  if (route.query.tab === 'history') {
    activeView.value = 'history';
  }
});
</script>

<template>
  <div class="mobile-frame-container">
    <div class="profile-page-mobile">
      
      <!-- ========================================== -->
      <!-- VIEW: PROFILE MENU                         -->
      <!-- ========================================== -->
      <div v-if="activeView === 'profile'" class="view-content">
        
        <!-- Header Gradient with Theme colors matching style.css -->
        <div class="profile-header-gradient">
          <div class="header-nav">
            <button class="back-circle-btn" @click="goBack">
              <ArrowLeft :size="16" color="#000" />
            </button>
            <span class="header-title">Profile</span>
          </div>

          <!-- Compact User Info Card -->
          <div class="user-info-card shadow-sm">
            <div class="card-inner">
              <div class="avatar-ring-theme">
                <span class="avatar-text">{{ initials }}</span>
              </div>
              <div class="user-details">
                <h3 class="user-name">{{ userName }}</h3>
                <p class="user-sub">{{ userEmail }}</p>
                <p class="user-sub">{{ userPhone }}</p>
              </div>
              <button class="edit-profile-btn" @click="openEditModal">
                <Edit3 :size="16" color="#6b6b6b" />
              </button>
            </div>
          </div>
        </div>

        <!-- Preferensi Section -->
        <div class="menu-section">
          <h4 class="section-heading">Preferensi</h4>
          <div class="menu-group shadow-sm">
            <div class="menu-item-row" @click="router.push('/coming-soon')">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <Shield :size="18" />
                </div>
                <span class="menu-item-label">Keamanan akun</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>

            <div class="menu-item-row" @click="router.push('/coming-soon')">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <Wallet :size="18" />
                </div>
                <span class="menu-item-label">Metode pembayaran</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>

            <div class="menu-item-row" @click="router.push('/coming-soon')">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <Bookmark :size="18" />
                </div>
                <span class="menu-item-label">Alamat tersimpan</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>

            <div class="menu-item-row" @click="router.push('/coming-soon')">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <UserCheck :size="18" />
                </div>
                <span class="menu-item-label">Pusat Akun Terverifikasi</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>
          </div>
        </div>

        <!-- Aktivitas Section -->
        <div class="menu-section">
          <h4 class="section-heading">Aktivitas di AJAK!</h4>
          <div class="menu-group shadow-sm">
            <div class="menu-item-row" @click="activeView = 'history'">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <Clock :size="18" />
                </div>
                <div class="menu-label-container">
                  <span class="menu-item-label">Aktivitas</span>
                  <span class="menu-item-desc">Lihat & cari riwayat transaksi pembelian</span>
                </div>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>

            <div class="menu-item-row" @click="router.push('/coming-soon')">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <Tag :size="18" />
                </div>
                <span class="menu-item-label">Promo & voucher</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>
          </div>
        </div>

        <!-- Pengaturan Aplikasi Section -->
        <div class="menu-section" style="margin-bottom: 24px;">
          <h4 class="section-heading">Pengaturan aplikasi</h4>
          <div class="menu-group shadow-sm">
            <div class="menu-item-row" @click="router.push('/coming-soon')">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <Globe :size="18" />
                </div>
                <span class="menu-item-label">Pilihan Bahasa</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>

            <div class="menu-item-row" @click="router.push('/coming-soon')">
              <div class="menu-item-left">
                <div class="menu-icon-box dark-icon">
                  <ShieldCheck :size="18" />
                </div>
                <span class="menu-item-label">Kebijakan Privasi</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>

            <div class="menu-item-row" @click="handleLogout">
              <div class="menu-item-left">
                <div class="menu-icon-box logout-icon">
                  <LogOut :size="18" color="var(--primary)" />
                </div>
                <span class="menu-item-label text-red">Keluar</span>
              </div>
              <div class="menu-item-right">
                <ChevronRight :size="16" class="chevron-gray" />
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ========================================== -->
      <!-- VIEW: TRANSACTION HISTORY                  -->
      <!-- ========================================== -->
      <div v-else-if="activeView === 'history'" class="view-content">
        
        <!-- Transaction Search Header -->
        <div class="history-header shadow-sm">
          <div class="history-top-row">
            <button class="back-btn" @click="goBack">
              <ArrowLeft :size="20" color="#000" />
            </button>
            
            <div class="search-input-wrapper">
              <Search :size="16" class="search-icon-inside" color="#6b6b6b" />
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Cari transaksi"
                class="search-text-input"
              />
              <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn">
                <X :size="14" />
              </button>
            </div>
          </div>

          <!-- Filter Chips -->
          <div class="filter-chips-row">
            <div class="chip-select-wrapper">
              <select v-model="statusFilter" class="chip-select">
                <option value="Semua">Semua status</option>
                <option value="Berhasil">Berhasil</option>
                <option value="Pending">Pending</option>
                <option value="Gagal">Gagal</option>
              </select>
            </div>

            <div class="chip-select-wrapper">
              <select v-model="productFilter" class="chip-select">
                <option value="Semua">Semua produk</option>
                <option value="Shuttle Bus">Shuttle Bus</option>
                <option value="Uang elektronik">Uang elektronik</option>
              </select>
            </div>

            <div class="chip-select-wrapper">
              <select v-model="dateFilter" class="chip-select">
                <option value="Semua">Semua tanggal</option>
                <option value="Hari Ini">Hari Ini</option>
                <option value="7 Hari Terakhir">7 Hari Terakhir</option>
                <option value="30 Hari Terakhir">30 Hari Terakhir</option>
              </select>
            </div>
          </div>
        </div>

        <!-- History Content Area -->
        <div class="history-list-container">
          <div v-if="isLoadingTransactions" class="loader-box">
            <div class="spinner-small"></div>
            <p class="loader-text">Memuat riwayat transaksi...</p>
          </div>

          <div v-else-if="filteredTransactions.length === 0" class="empty-box">
            <AlertCircle :size="36" color="#6b6b6b" />
            <p class="empty-text">Tidak menemukan transaksi</p>
          </div>

          <div v-else class="transactions-list-grid">
            <div 
              v-for="trx in filteredTransactions" 
              :key="trx.id" 
              class="transaction-card shadow-sm"
            >
              <div class="card-header-row">
                <div class="header-left-info">
                  <div class="category-icon-bg">
                    <component 
                      :is="trx.type === 'Shuttle Bus' ? Ticket : Wallet" 
                      :size="16" 
                      color="var(--primary)"
                    />
                  </div>
                  <div class="meta-texts">
                    <span class="category-name">{{ trx.type }}</span>
                    <span class="transaction-date">{{ new Date(trx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
                  </div>
                </div>
                <div class="header-right-status">
                  <span 
                    class="status-pill-badge" 
                    :class="{ 
                      success: trx.status === 'SUCCESS', 
                      pending: trx.status === 'PENDING',
                      failed: trx.status === 'FAILED'
                    }"
                  >
                    {{ trx.status === 'SUCCESS' ? 'Berhasil' : trx.status === 'PENDING' ? 'Pending' : 'Gagal' }}
                  </span>
                  <button class="more-btn">
                    <MoreVertical :size="14" color="#6b6b6b" />
                  </button>
                </div>
              </div>

              <div class="card-body-row">
                <div class="product-title-row">
                  <h4 class="product-title">{{ trx.event_name }}</h4>
                  <span v-if="trx.type === 'Shuttle Bus' && trx.trip_type" class="trip-type-badge">
                    {{ trx.trip_type }}
                  </span>
                </div>
                <p class="invoice-number-sub">{{ trx.id }}</p>
              </div>

              <div class="card-footer-row">
                <div class="price-box">
                  <span class="price-label">Total belanja</span>
                  <span class="price-value">Rp{{ Number(trx.total_price).toLocaleString('id-ID') }}</span>
                </div>
                <button 
                  class="action-button-theme" 
                  @click="viewInvoice(trx)"
                >
                  Lihat E-Tiket
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-card shadow-lg">
        <div class="modal-header">
          <h3 class="modal-title">Ubah Profil</h3>
          <button class="close-btn" @click="showEditModal = false">
            <X :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label class="input-label">Nama Lengkap</label>
            <input type="text" v-model="editName" class="modal-text-input" />
          </div>
          <div class="input-group">
            <label class="input-label">Email</label>
            <input type="email" v-model="editEmail" class="modal-text-input" />
          </div>
          <div class="input-group">
            <label class="input-label">Nomor Telepon</label>
            <input type="text" v-model="editPhone" class="modal-text-input" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showEditModal = false">Batal</button>
          <button class="btn-save" @click="saveProfile">
            <Save :size="14" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Mobile Mock Centered Container */
.mobile-frame-container {
  display: flex;
  justify-content: center;
  background-color: #f0f0f2;
  min-height: 100vh;
  width: 100%;
}

.profile-page-mobile {
  width: 100%;
  max-width: 480px;
  background-color: #f7f7f9;
  height: 100vh;
  position: relative;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  padding-bottom: 70px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none; /* Hide scrollbar Firefox */
  -ms-overflow-style: none; /* Hide scrollbar IE/Edge */
}

.profile-page-mobile::-webkit-scrollbar {
  display: none; /* Hide scrollbar Chrome/Safari/Webkit */
}

.view-content {
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* Color & Text Weight Utilities */
.text-red {
  color: var(--primary) !important;
}

/* ========================================== */
/* VIEW: PROFILE MENU                         */
/* ========================================== */

.profile-header-gradient {
  background: #C94C4C;
  padding: 30px 16px 20px;
  position: relative;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.header-nav {
  display: flex !important;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.back-circle-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
  padding: 0;
}
.back-circle-btn:active {
  background-color: #f1f5f9;
  transform: scale(0.92);
}

.header-title {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
}

/* User Card (Smaller size) */
.user-info-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 10px;
  position: relative;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.card-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-ring-theme {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary);
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--primary);
}

.avatar-text {
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600; /* Less bold than 700 */
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.95rem;
  font-weight: 600; /* Bold name */
  color: #2A2A2A;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-sub {
  font-size: 0.72rem;
  color: #6b6b6b;
  font-weight: 400; /* Not bold */
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.edit-profile-btn {
  background: #f5f5f7;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Member progress bar (Smaller size) */
.member-bar {
  background: linear-gradient(90deg, #1c1a1a 0%, #2d1010 100%);
  border: 1px solid rgba(201, 76, 76, 0.15);
  border-radius: 8px;
  padding: 6px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  color: #fff;
}

.member-left {
  display: flex;
  align-items: center;
  gap: 5px;
}

.star-badge-icon {
  background-color: rgba(201, 76, 76, 0.15);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--primary);
}

.member-title {
  font-size: 0.7rem;
  font-weight: 500; /* Less bold */
  color: var(--secondary);
}

.member-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-status {
  font-size: 0.65rem;
  color: #ddd;
  font-weight: 400; /* Not bold */
}

.member-arrow-btn {
  background: rgba(255,255,255,0.15);
  border: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Preferensi & Aktivitas lists (Smaller size) */
.menu-section {
  padding: 0 10px;
  margin-top: 12px;
}

.section-heading {
  font-size: 0.75rem;
  font-weight: 500; /* Less bold */
  color: #6b6b6b;
  margin-bottom: 4px;
  text-transform: capitalize;
}

.menu-group {
  background-color: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.02);
}

.menu-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #f6f6f8;
  cursor: pointer;
  transition: background 0.15s;
}
.menu-item-row:last-child {
  border-bottom: none;
}
.menu-item-row:active {
  background-color: #fafafc;
}

.menu-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.menu-icon-box {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dark-icon {
  background-color: #f0f0f4;
  color: #2a2a2a;
}
.logout-icon {
  background-color: rgba(201, 76, 76, 0.05);
}

.menu-label-container {
  display: flex;
  flex-direction: column;
}

.menu-item-label {
  font-size: 0.78rem;
  font-weight: 500; /* Semi-bold label */
  color: #2a2a2a;
}

.menu-item-desc {
  font-size: 0.65rem;
  color: #8b8b8b;
  font-weight: 400; /* Regular desc */
  margin-top: 1px;
}

.badge-promo {
  background-color: rgba(201, 76, 76, 0.1);
  color: var(--primary);
  font-size: 0.58rem;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 20px;
  margin-left: 5px;
}

.badge-new {
  background-color: var(--primary);
  color: #fff;
  font-size: 0.58rem;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 20px;
  margin-left: 5px;
}

.chevron-gray {
  color: #ccc;
}

/* ========================================== */
/* VIEW: TRANSACTION HISTORY                  */
/* ========================================== */

.history-header {
  background-color: #ffffff;
  padding: 8px 12px 6px;
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid #efeff2;
}

.history-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon-inside {
  position: absolute;
  left: 10px;
}

.search-text-input {
  width: 100%;
  padding: 6px 30px 6px 32px;
  border-radius: 8px;
  border: 1px solid #e0e0e6;
  font-size: 0.82rem;
  background-color: #f7f7f9;
  font-family: inherit;
  outline: none;
}
.search-text-input:focus {
  border-color: #ccc;
  background-color: #fff;
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
}

.header-action-icons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-icon-badge {
  position: relative;
  cursor: pointer;
  padding: 2px;
}

.badge-count {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.6rem;
  font-weight: 700;
  color: #fff;
  background-color: var(--primary);
  border-radius: 10px;
  padding: 1px 4px;
  min-width: 14px;
  text-align: center;
  line-height: 1;
}

.filter-chips-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-chips-row::-webkit-scrollbar {
  height: 3px;
}

.filter-chips-row::-webkit-scrollbar-track {
  background: transparent;
}

.filter-chips-row::-webkit-scrollbar-thumb {
  background: #e2e2e6;
  border-radius: 10px;
}

.chip-select-wrapper {
  position: relative;
  background-color: #f0f0f4;
  border-radius: 8px;
  padding: 2px 6px;
  border: 1px solid #e2e2e6;
  display: flex;
  align-items: center;
}

.chip-select {
  background: transparent;
  border: none;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  color: #333;
}

.history-list-container {
  padding: 12px;
  flex: 1;
}

.transactions-list-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Card Transactions (Smaller size) */
.transaction-card {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 8px 10px;
  border: 1px solid #efeff2;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.header-left-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-icon-bg {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background-color: rgba(201, 76, 76, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.meta-texts {
  display: flex;
  flex-direction: column;
}

.category-name {
  font-size: 0.72rem;
  color: #2a2a2a;
  font-weight: 500;
}

.transaction-date {
  font-size: 0.62rem;
  color: #8b8b8b;
  font-weight: 400; /* Regular */
  margin-top: 1px;
}

.header-right-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-pill-badge {
  font-size: 0.6rem;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: 4px;
}
.status-pill-badge.success {
  background-color: rgba(46, 125, 50, 0.08);
  color: #2e7d32;
}
.status-pill-badge.pending {
  background-color: #fff3e0;
  color: #ff9800;
}
.status-pill-badge.failed {
  background-color: rgba(201, 76, 76, 0.08);
  color: var(--primary);
}

.more-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
}

.card-body-row {
  border-top: 1px solid #f6f6f8;
  border-bottom: 1px solid #f6f6f8;
  padding: 6px 0;
  margin-bottom: 6px;
}

.product-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.product-title {
  font-size: 0.78rem;
  color: #2a2a2a;
  margin: 0;
  font-weight: 500; /* Medium, not extra bold */
}

.trip-type-badge {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--primary);
  background-color: rgba(201, 76, 76, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
}

.invoice-number-sub {
  font-size: 0.62rem;
  color: #8b8b8b;
  font-weight: 400; /* Regular */
  margin: 0;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-box {
  display: flex;
  flex-direction: column;
}

.price-label {
  font-size: 0.62rem;
  color: #8b8b8b;
  font-weight: 400; /* Regular */
}

.price-value {
  font-size: 0.78rem;
  color: #2a2a2a;
  font-weight: 600; /* Bold for price */
}

.action-button-theme {
  background-color: var(--primary);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 500; /* Less bold */
  padding: 4px 10px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  transition: transform 0.15s;
}
.action-button-theme:active {
  transform: scale(0.96);
}

/* Empty State / Loader */
.loader-box, .empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 12px;
  color: #6b6b6b;
  text-align: center;
  gap: 8px;
}
.loader-text, .empty-text {
  font-size: 0.78rem;
}
.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0,0,0,0.05);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ========================================== */
/* EDIT PROFILE MODAL                         */
/* ========================================== */

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  background-color: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f2f2f5;
}

.modal-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b6b6b;
  text-transform: uppercase;
}

.modal-text-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #dcdce2;
  border-radius: 6px;
  outline: none;
  font-family: inherit;
  font-size: 0.85rem;
}
.modal-text-input:focus {
  border-color: var(--primary);
}

.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #f2f2f5;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background-color: #fbfbfd;
}

.btn-cancel {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b6b6b;
  background: none;
  border: 1px solid #dcdce2;
  cursor: pointer;
}

.btn-save {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  background-color: var(--primary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}
.btn-save:active {
  transform: scale(0.97);
}

@media (max-width: 768px) {
  .menu-icon-box.dark-icon {
    background-color: rgba(201, 76, 76, 0.08) !important;
    color: var(--primary) !important;
  }
}
</style>
