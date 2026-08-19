<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Plus, 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  Ticket, 
  Info,
  Calendar
} from 'lucide-vue-next';
import { bookingStore } from '../store/booking';

const router = useRouter();

// State
const event = computed(() => bookingStore.selectedEvent);
const ticket = computed(() => bookingStore.selectedTicket);
const selectedseats = computed(() => bookingStore.selectedseats);
const quantity = computed(() => bookingStore.adults || 1);

// Trip type label from user's selection (Pergi, Pulang, Pulang Pergi)
const tripTypeName = computed(() => {
  return bookingStore.selectedTripStatus?.name || ticket.value?.trip_status?.name || 'Pergi';
});

const formatseatLabel = (seatId) => {
  if (!seatId) return '';
  const match = seatId.match(/^(.*?)_(1|2)$/);
  if (match) {
    const base = match[1];
    const typeId = parseInt(match[2], 10);
    return `${base} (${typeId === 1 ? 'Pergi' : 'Pulang'})`;
  }
  return seatId;
};

// Only return seat base without pergi/pulang suffix
const formatseatBase = (seatId) => {
  if (!seatId) return '';
  const match = seatId.match(/^(.*?)_(1|2)$/);
  return match ? match[1] : seatId;
};

// Fetch extra detail
const shuttleDetail = ref(null);
const shuttleAdminDetail = ref(null);

// Redirect to events if store is empty
onMounted(async () => {
  if (!event.value || !ticket.value) {
    router.push('/events');
    return;
  }
  
  // Fetch shuttle detail
  if (event.value.slug) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shuttle/${event.value.slug}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          shuttleDetail.value = result.data;
        }
      }
    } catch (e) {
      console.error('Error fetching shuttle detail for transaction view:', e);
    }
  }

  // Fetch all shuttles to get admin fee
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shuttle`);
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data && result.data.data) {
        const matched = result.data.data.find(s => s.name === event.value.name);
        if (matched) {
            shuttleAdminDetail.value = matched;
        }
      }
    }
  } catch (e) {
      console.error('Error fetching shuttle list for admin fee:', e);
  }

  startTimer();
});

// Timer countdown (15 minutes)
const timerMinutes = ref(15);
const timerSeconds = ref(0);
let timerInterval = null;

const startTimer = () => {
  timerInterval = setInterval(() => {
    if (timerSeconds.value > 0) {
      timerSeconds.value--;
    } else if (timerMinutes.value > 0) {
      timerMinutes.value--;
      timerSeconds.value = 59;
    } else {
      clearInterval(timerInterval);
      alert('Sesi pemesanan Anda telah berakhir. Silakan pilih tiket kembali.');
      router.push('/events');
    }
  }, 1000);
};

const formattedTime = computed(() => {
  const m = String(timerMinutes.value).padStart(2, '0');
  const s = String(timerSeconds.value).padStart(2, '0');
  return `${m}:${s}`;
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

// Accordion states
const isRegistrantOpen = ref(true);
const isVoucherOpen = ref(true);
const openTicketIndex = ref(0); // Index of the ticket accordion currently open
const isMobileSummaryOpen = ref(false);

// Form states
const registrant = ref({
  fullName: '',
  email: '',
  phonePrefix: '+62',
  phoneNumber: ''
});

// PP detection and helpers (MUST be before ticketOwners)
const isPP = computed(() => {
  return selectedseats.value.some(s => s.endsWith('_1')) && selectedseats.value.some(s => s.endsWith('_2'));
});

const effectiveTicketCount = computed(() => {
  return isPP.value
    ? selectedseats.value.filter(s => s.endsWith('_1')).length
    : selectedseats.value.length;
});

const getTicketOwnerLength = () => {
  return isPP.value ? selectedseats.value.length : quantity.value;
};

// Ticket Owners
const ticketOwners = ref(
  Array.from({ length: getTicketOwnerLength() }, () => ({
    useRegistrant: false,
    fullName: '',
    email: '',
    phonePrefix: '+62',
    phoneNumber: '',
    ktpNumber: '',
    profession: '',
    company: '',
    birthDate: ''
  }))
);

// Voucher State
const vouchers = ref([{ code: '', applied: false, discount: 0 }]);
const promoError = ref('');
const promoSuccess = ref('');

const addVoucherField = () => {
  if (vouchers.value.length < 3) {
    vouchers.value.push({ code: '', applied: false, discount: 0 });
  }
};

const applyVoucher = (index) => {
  const codeVal = vouchers.value[index].code.trim().toUpperCase();
  if (!codeVal) return;

  if (codeVal === 'AJAKDEKAT' || codeVal === 'DISKON10') {
    vouchers.value[index].applied = true;
    vouchers.value[index].discount = 15000; // Flat discount
    promoSuccess.value = 'Voucher berhasil digunakan! Potongan Rp 15.000 diterapkan.';
    promoError.value = '';
  } else {
    promoError.value = 'Kode voucher tidak valid.';
    promoSuccess.value = '';
  }
};

// Calculation computed properties
const effectivePrice = computed(() => bookingStore.selectedPrice || ticket.value?.price || 0);

const baseTicketPrice = computed(() => effectivePrice.value * (isPP.value ? effectiveTicketCount.value : quantity.value));

// Helper: get seat labels for owner at given index
const getOwnerLabel = (idx) => {
  if (!isPP.value) {
    const seat = selectedseats.value[idx];
    return `${tripTypeName.value} ${formatseatBase(seat || '')}`;
  }
  const seat = selectedseats.value[idx];
  if (!seat) return '';
  const dir = seat.endsWith('_1') ? 'Pergi' : 'Pulang';
  return `${dir} ${formatseatBase(seat)}`;
};

const totalDiscount = computed(() => {
  return vouchers.value.reduce((total, v) => total + (v.applied ? v.discount : 0), 0);
});
const adminFee = computed(() => {
  return Number(shuttleAdminDetail.value?.admin_fee || 8000);
});
const totalPayment = computed(() => {
  return Math.max(0, baseTicketPrice.value + adminFee.value - totalDiscount.value);
});

// Handle Gunakan Data Pemesan toggle
const handleUseRegistrantChange = (index) => {
  // For PP, fill both entries (pergi & pulang) for this passenger
  const indices = [index];
  
  indices.forEach(idx => {
    if (idx < 0 || idx >= ticketOwners.value.length) return;
    const owner = ticketOwners.value[idx];
    if (owner.useRegistrant) {
      owner.fullName = registrant.value.fullName;
      owner.email = registrant.value.email;
      owner.phonePrefix = registrant.value.phonePrefix;
      owner.phoneNumber = registrant.value.phoneNumber;
    }
  });
};

// Sync ticket owners when registrant info changes if toggled
watch(
  () => registrant.value,
  (newReg) => {
    ticketOwners.value.forEach((owner) => {
      if (owner.useRegistrant) {
        owner.fullName = newReg.fullName;
        owner.email = newReg.email;
        owner.phonePrefix = newReg.phonePrefix;
        owner.phoneNumber = newReg.phoneNumber;
      }
    });
  },
  { deep: true }
);

// Errors validation
const errors = ref({
  registrant: { fullName: '', email: '', phoneNumber: '' },
  owners: Array.from({ length: getTicketOwnerLength() }, () => ({
    fullName: '',
    email: '',
    phoneNumber: '',
    ktpNumber: '',
    profession: '',
    company: '',
    birthDate: ''
  }))
});

// Form Validation Helpers
const getNameError = (name) => {
  const cleanName = name.trim();
  if (!cleanName) {
    return 'Nama Lengkap wajib diisi';
  }
  if (cleanName.length < 3) {
    return 'Nama Lengkap minimal 3 karakter';
  }
  if (!/^[a-zA-Z\s'.]+$/.test(cleanName)) {
    return 'Nama Lengkap hanya boleh berisi huruf';
  }
  return '';
};

const getEmailError = (email) => {
  const cleanEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail) {
    return 'Email wajib diisi';
  }
  if (!emailRegex.test(cleanEmail)) {
    return 'Format email tidak valid (contoh: pemesan@email.com)';
  }
  return '';
};

const getPhoneError = (phone) => {
  const cleanPhone = phone.trim();
  if (!cleanPhone) {
    return 'Nomor telepon wajib diisi';
  }
  if (cleanPhone.startsWith('0')) {
    return 'Nomor telepon tidak boleh diawali dengan angka 0. Silakan langsung mulai dengan angka 8';
  }
  if (cleanPhone.startsWith('+62') || cleanPhone.startsWith('62')) {
    return 'Prefix +62 sudah disediakan. Silakan langsung mulai dengan angka 8';
  }
  if (!cleanPhone.startsWith('8')) {
    return 'Nomor telepon Indonesia harus diawali dengan angka 8';
  }
  if (!/^\d+$/.test(cleanPhone)) {
    return 'Nomor telepon hanya boleh berupa angka';
  }
  if (cleanPhone.length < 8 || cleanPhone.length > 13) {
    return 'Nomor telepon harus terdiri dari 8 hingga 13 digit angka';
  }
  return '';
};

const validateRegistrant = () => {
  let isValid = true;

  const nameErr = getNameError(registrant.value.fullName);
  errors.value.registrant.fullName = nameErr;
  if (nameErr) isValid = false;

  const emailErr = getEmailError(registrant.value.email);
  errors.value.registrant.email = emailErr;
  if (emailErr) isValid = false;

  const phoneErr = getPhoneError(registrant.value.phoneNumber);
  errors.value.registrant.phoneNumber = phoneErr;
  if (phoneErr) isValid = false;

  return isValid;
};

const validateOwners = () => {
  let isValid = true;

  ticketOwners.value.forEach((owner, index) => {
    const ownerErrors = errors.value.owners[index];

    const nameErr = getNameError(owner.fullName);
    ownerErrors.fullName = nameErr;
    if (nameErr) isValid = false;

    const emailErr = getEmailError(owner.email);
    ownerErrors.email = emailErr;
    if (emailErr) isValid = false;

    const phoneErr = getPhoneError(owner.phoneNumber);
    ownerErrors.phoneNumber = phoneErr;
    if (phoneErr) isValid = false;

    // Disabled fields (commented out in HTML layout)
    ownerErrors.ktpNumber = '';
    ownerErrors.profession = '';
    ownerErrors.company = '';
    ownerErrors.birthDate = '';
  });

  return isValid;
};

// Confirmation Modal State
const showConfirmModal = ref(false);
const isSubmitting = ref(false);

// Seat conflict modal
const showSeatConflictModal = ref(false);
const seatConflictData = ref(null);

const executeCheckout = async () => {
  showConfirmModal.value = false;
  isSubmitting.value = true;

  // Populate bookingStore details
  bookingStore.customer = {
    name: registrant.value.fullName,
    email: registrant.value.email,
    phone: registrant.value.phoneNumber
  };

  // Generate Booking Code for local usage
  const invoice_no = "INV-SHT-" + Date.now();

  const payload = {
    shuttle_id: event.value?.id || "",
    trip_id: event.value?.trip_id || 1,
    route_id: bookingStore.selectedRouteId || bookingStore.selectedPickup?.id || ticket.value?.route_id || "",
    shuttle_route_id: bookingStore.selectedTicket?.route_id || null,
    operational_date: bookingStore.selectedDate || "",
    total_qty: effectiveTicketCount.value,
    total_price: baseTicketPrice.value,
    total_voucher: totalDiscount.value,
    grandtotal: totalPayment.value,
    admin_fee: adminFee.value,
    ppn: 0,
    payment_status: "PENDING",
    tickets: selectedseats.value.map(seat => {
      // Parse type_id: PP seats have _1/_2 suffix, non-PP uses trip_status_id
      const seatMatch = seat.match(/^(.*?)_(1|2)$/);
      let typeId;
      let baseseat;
      if (seatMatch) {
        // PP type: _1 = Pergi, _2 = Pulang
        typeId = parseInt(seatMatch[2], 10);
        baseseat = seatMatch[1];
      } else {
        // Non-PP: use selectedTripStatus.id (1=Pergi, 2=Pulang)
        typeId = bookingStore.selectedTripStatus?.id || 1;
        baseseat = seat;
      }
      return {
        shuttle_ticket_id: ticket.value?.id || "",
        shuttle_session_id: parseInt(bookingStore.selectedSessionId) || 0,
        trip_status_id: bookingStore.selectedTripStatus?.id || 1,
        type_id: typeId, // 1 = pergi, 2 = pulang
        order_seat_number: baseseat,
        qty_ticket: 1,
        price: effectivePrice.value,
        ticket_fee: 0,
        is_promo: totalDiscount.value > 0 ? 1 : 0,
        promo_price: totalDiscount.value > 0 ? (totalDiscount.value / effectiveTicketCount.value) : 0,
        subtotal_price: effectivePrice.value,
        shuttle_route_id: ticket.value?.route_id || null
      };
    }),
    passengers: (() => {
      const allOwners = ticketOwners.value;
      const registrantEntry = {
        is_pemesan: 1,
        passenger_name: registrant.value.fullName,
        phone: registrant.value.phoneNumber,
        email: registrant.value.email,
        identity_type: "KTP",
        identity_number: "",
        emergency_contact: registrant.value.phoneNumber
      };
      
      return [registrantEntry, ...allOwners.map(o => ({
        is_pemesan: 0,
        passenger_name: o.fullName,
        phone: o.phoneNumber,
        email: o.email,
        identity_type: "KTP",
        identity_number: o.ktpNumber || "",
        emergency_contact: o.phoneNumber
      }))];
    })(),
  };

  try {
    const res = await fetch(import.meta.env.VITE_API_URL + '/api/shuttle-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      // Try to read error response body for conflict info
      let errData = null;
      try { errData = await res.json(); } catch (_) { /* ignore */ }
      const err = new Error('Gagal memproses pesanan.');
      err.responseData = errData;
      throw err;
    }

    const result = await res.json();
    bookingStore.lastOrderResponse = result;

    const paymentUrl = result.payment?.payment_url || result.data?.xendit_url;
    if (paymentUrl) {
      window.location.href = paymentUrl;
    } else {
      // Direct to confirmation page if no URL is provided
      router.push('/confirmation');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    // Check if error response has SEAT_CONFLICT data
    if (error.responseData && error.responseData.conflict?.error_type === 'SEAT_CONFLICT') {
      seatConflictData.value = error.responseData.conflict;
      showSeatConflictModal.value = true;
    } else {
      alert('Terjadi kesalahan saat memproses pesanan. Silakan coba lagi.');
    }
  } finally {
    isSubmitting.value = false;
  }
};

// Form submission (proceed to confirmation)
const handleNext = () => {
  const isRegValid = validateRegistrant();
  const isOwnValid = validateOwners();

  if (!isRegValid || !isOwnValid) {
    // Open the accordion of first error
    if (!isRegValid) {
      isRegistrantOpen.value = true;
    } else {
      const errorIdx = errors.value.owners.findIndex(o => Object.values(o).some(e => e !== ''));
      if (errorIdx !== -1) {
        openTicketIndex.value = errorIdx;
      }
    }
    
    // Smooth scroll to top of form area
    window.scrollTo({ top: 100, behavior: 'smooth' });
    return;
  }

  // Show confirmation modal
  showConfirmModal.value = true;
};

const goBack = () => {
  router.back();
};

const formatRp = (num) => {
  if (!num) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
};

const isLongText = (str, limit = 20) => {
  if (!str) return false;
  return str.length > limit;
};
</script>

<template>
  <div class="transaction-page" v-if="event && ticket">
    <!-- Navbar Header area -->
    <header class="tx-navbar">
      <div class="container nav-content">
        <button type="button" class="btn-nav-back" @click="goBack">
          <ArrowLeft :size="20" />
          <span>Kembali</span>
        </button>
        <span class="navbar-title-main">Pengisian Informasi Pemesanan</span>
      </div>
    </header>

    <main class="tx-main-content">
      <div class="container tx-grid">
        
        <!-- ================== LEFT COLUMN: FORMS ================== -->
        <div class="tx-forms-column">
          <h1 class="page-main-heading">Personal Informasi</h1>

          <!-- 1. DATA PEMESAN CARD (ACCORDION) -->
          <div class="form-card-wrapper">
            <div 
              class="form-card-header" 
              @click="isRegistrantOpen = !isRegistrantOpen"
              :class="{ 'header-expanded': isRegistrantOpen }"
            >
              <h2 class="form-header-title">Data Pemesan</h2>
              <button type="button" class="btn-toggle-accordion">
                <ChevronUp v-if="isRegistrantOpen" :size="20" />
                <ChevronDown v-else :size="20" />
              </button>
            </div>

            <div class="form-card-body" v-show="isRegistrantOpen">
              <div class="form-group-item">
                <label class="form-input-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  class="form-text-input" 
                  :class="{ 'input-error': errors.registrant.fullName }"
                  placeholder="Nama Lengkap" 
                  v-model="registrant.fullName"
                  @input="errors.registrant.fullName = getNameError(registrant.fullName)"
                  @blur="validateRegistrant"
                />
                <span class="form-error-msg" v-if="errors.registrant.fullName">
                  {{ errors.registrant.fullName }}
                </span>
              </div>

              <div class="form-group-item">
                <label class="form-input-label">Email</label>
                <input 
                  type="email" 
                  class="form-text-input" 
                  :class="{ 'input-error': errors.registrant.email }"
                  placeholder="Contoh: example@example.com" 
                  v-model="registrant.email"
                  @input="errors.registrant.email = getEmailError(registrant.email)"
                  @blur="validateRegistrant"
                />
                <span class="form-error-msg" v-if="errors.registrant.email">
                  {{ errors.registrant.email }}
                </span>
              </div>

              <div class="form-group-item">
                <label class="form-input-label">No Telepon</label>
                <div class="phone-input-combo" :class="{ 'input-error': errors.registrant.phoneNumber }">
                  <select class="phone-prefix-select" v-model="registrant.phonePrefix">
                    <option value="+62">+62</option>
                    <option value="+1">+1</option>
                    <option value="+60">+60</option>
                  </select>
                  <input 
                    type="text" 
                    class="phone-number-input" 
                    placeholder="Contoh: 81234567890" 
                    v-model="registrant.phoneNumber"
                    @input="errors.registrant.phoneNumber = getPhoneError(registrant.phoneNumber)"
                    @blur="validateRegistrant"
                  />
                </div>
                <span class="form-error-msg" v-if="errors.registrant.phoneNumber">
                  {{ errors.registrant.phoneNumber }}
                </span>
              </div>
            </div>
          </div>


          <!-- 3. TICKET OWNERS CARDS (ACCORDION PER TICKET) -->
          <div 
            v-for="(owner, idx) in ticketOwners" 
            :key="'owner-form-' + idx"
            class="form-card-wrapper ticket-owner-card"
          >
            <div 
              class="form-card-header"
              @click="openTicketIndex = (openTicketIndex === idx ? -1 : idx)"
              :class="{ 'header-expanded': openTicketIndex === idx }"
            >
              <div class="ticket-header-details">
                <div class="ticket-icon-badge">
                  <Ticket :size="18" />
                </div>
                <div>
                  <h3 class="ticket-owner-title">
                    {{ idx + 1 }}. Pemilik Tiket {{ getOwnerLabel(idx) }}
                  </h3>
                  <span class="ticket-owner-subtitle">1 Tiket x {{ formatRp(effectivePrice) }}</span>
                </div>
              </div>
              <button type="button" class="btn-toggle-accordion">
                <ChevronUp v-if="openTicketIndex === idx" :size="20" />
                <ChevronDown v-else :size="20" />
              </button>
            </div>

            <!-- Use registrant data toggle (Always visible outside accordion body) -->
            <div class="use-registrant-toggle-row" @click.stop>
              <span class="toggle-description-label">Gunakan Data Pemesan</span>
              <label class="switch-toggle-btn">
                <input 
                  type="checkbox" 
                  v-model="owner.useRegistrant" 
                  @change="handleUseRegistrantChange(idx)"
                />
                <span class="switch-slider-round"></span>
              </label>
            </div>

            <div class="form-card-body" v-show="openTicketIndex === idx">
              <!-- Form Fields -->
              <div class="form-grid-two-cols">
                <div class="form-group-item">
                  <label class="form-input-label">Nama Lengkap</label>
                  <input 
                    type="text" 
                    class="form-text-input" 
                    :class="{ 'input-error': errors.owners[idx]?.fullName }"
                    placeholder="Nama Lengkap" 
                    v-model="owner.fullName"
                    :disabled="owner.useRegistrant"
                    @input="errors.owners[idx].fullName = getNameError(owner.fullName)"
                    @blur="validateOwners"
                  />
                  <span class="form-error-msg" v-if="errors.owners[idx]?.fullName">
                    {{ errors.owners[idx].fullName }}
                  </span>
                </div>

                <div class="form-group-item">
                  <label class="form-input-label">Email</label>
                  <input 
                    type="email" 
                    class="form-text-input" 
                    :class="{ 'input-error': errors.owners[idx]?.email }"
                    placeholder="Contoh: example@example.com" 
                    v-model="owner.email"
                    :disabled="owner.useRegistrant"
                    @input="errors.owners[idx].email = getEmailError(owner.email)"
                    @blur="validateOwners"
                  />
                  <span class="form-error-msg" v-if="errors.owners[idx]?.email">
                    {{ errors.owners[idx].email }}
                  </span>
                </div>

                <div class="form-group-item">
                  <label class="form-input-label">No Telepon</label>
                  <div class="phone-input-combo" :class="{ 'disabled-combo': owner.useRegistrant, 'input-error': errors.owners[idx]?.phoneNumber }">
                    <select class="phone-prefix-select" v-model="owner.phonePrefix" :disabled="owner.useRegistrant">
                      <option value="+62">+62</option>
                      <option value="+1">+1</option>
                      <option value="+60">+60</option>
                    </select>
                    <input 
                      type="text" 
                      class="phone-number-input" 
                      placeholder="Contoh: 81234567890" 
                      v-model="owner.phoneNumber"
                      :disabled="owner.useRegistrant"
                      @input="errors.owners[idx].phoneNumber = getPhoneError(owner.phoneNumber)"
                      @blur="validateOwners"
                    />
                  </div>
                  <span class="form-error-msg" v-if="errors.owners[idx]?.phoneNumber">
                    {{ errors.owners[idx].phoneNumber }}
                  </span>
                </div>

                <!-- <div class="form-group-item">
                  <label class="form-input-label">Nomor KTP (ID Number)</label>
                  <input 
                    type="text" 
                    class="form-text-input" 
                    placeholder="Contoh: 3273123456789012" 
                    v-model="owner.ktpNumber"
                    maxlength="16"
                  />
                  <span class="form-error-msg" v-if="errors.owners[idx]?.ktpNumber">
                    {{ errors.owners[idx].ktpNumber }}
                  </span>
                </div>

                <div class="form-group-item">
                  <label class="form-input-label">Pekerjaan / Profesi</label>
                  <input 
                    type="text" 
                    class="form-text-input" 
                    placeholder="Contoh: Pegawai Swasta, Mahasiswa" 
                    v-model="owner.profession"
                  />
                  <span class="form-error-msg" v-if="errors.owners[idx]?.profession">
                    {{ errors.owners[idx].profession }}
                  </span>
                </div>

                <div class="form-group-item">
                  <label class="form-input-label">Perusahaan / Organisasi</label>
                  <input 
                    type="text" 
                    class="form-text-input" 
                    placeholder="Contoh: PT Ajak Kreatif" 
                    v-model="owner.company"
                  />
                  <span class="form-error-msg" v-if="errors.owners[idx]?.company">
                    {{ errors.owners[idx].company }}
                  </span>
                </div>

                <div class="form-group-item full-width-field">
                  <label class="form-input-label">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    class="form-text-input" 
                    v-model="owner.birthDate"
                  />
                  <span class="form-error-msg" v-if="errors.owners[idx]?.birthDate">
                    {{ errors.owners[idx].birthDate }}
                  </span>
                </div> -->
              </div>
            </div>
          </div>

        </div>

        <!-- ================== RIGHT COLUMN: EVENT + VOUCHER + SUMMARY ================== -->
        <aside class="tx-sidebar-column">
          <!-- Mini Event Card -->
          <div class="sidebar-mini-event-card">
            <img :src="event.image" :alt="event.name" class="mini-event-image" />
            <div class="mini-event-info">
              <h3 class="mini-event-title" v-if="!isLongText(event.name, 25)">{{ event.name }}</h3>
              <div class="marquee-container" v-else>
                <div class="marquee-inner-scroll">
                  <span class="mini-event-title" style="margin-bottom: 0;">{{ event.name }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <span class="mini-event-title" style="margin-bottom: 0;">{{ event.name }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                </div>
              </div>
              <span class="mini-event-date">{{ event.dateLabel || event.date }}</span>
            </div>
          </div>

          <!-- Voucher Box (Accordion) -->
          <div class="sidebar-box-wrapper voucher-box">
            <div 
              class="voucher-card-header" 
              @click="isVoucherOpen = !isVoucherOpen"
              :class="{ 'header-expanded': isVoucherOpen }"
            >
              <h3 class="box-header-title mb-0" style="border-bottom: none; padding-bottom: 0;">Voucher</h3>
              <button type="button" class="btn-toggle-accordion">
                <ChevronUp v-if="isVoucherOpen" :size="18" />
                <ChevronDown v-else :size="18" />
              </button>
            </div>
            
            <div class="voucher-card-body" v-show="isVoucherOpen">
              <div 
                v-for="(vouch, vIdx) in vouchers" 
                :key="'v-field-' + vIdx" 
                class="voucher-input-row"
              >
                <input 
                  type="text" 
                  class="voucher-text-input" 
                  placeholder="Masukan Kode Voucher" 
                  v-model="vouch.code"
                  :disabled="vouch.applied"
                />
                <button 
                  type="button" 
                  class="btn-submit-voucher" 
                  @click="applyVoucher(vIdx)"
                  :disabled="vouch.applied || !vouch.code.trim()"
                >
                  <Check v-if="vouch.applied" :size="16" />
                  <span v-else>Submit</span>
                </button>
              </div>

              <div class="promo-feedback-area">
                <span class="promo-error" v-if="promoError">{{ promoError }}</span>
                <span class="promo-success" v-if="promoSuccess">{{ promoSuccess }}</span>
              </div>

              <button 
                type="button" 
                class="btn-add-more-voucher" 
                @click="addVoucherField"
                v-if="vouchers.length < 3"
              >
                + Tambah Voucher
              </button>
            </div>
          </div>

          <!-- Order Summary Card -->
          <div class="sidebar-box-wrapper summary-box">
            <h3 class="box-header-title">Ringkasan Pesanan</h3>
            
            <div class="summary-details-section">
              <div class="s-category-row">
                <Ticket :size="16" class="s-ticket-icon" />
                <div class="s-category-info">
                  <span class="s-category-name" v-if="!isLongText(ticket.name, 25)">{{ ticket.name }}</span>
                  <div class="marquee-container" v-else>
                    <div class="marquee-inner-scroll">
                      <span class="s-category-name">{{ ticket.name }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span class="s-category-name">{{ ticket.name }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    </div>
                  </div>
                  <span class="s-category-calc">
                    {{ isPP ? effectiveTicketCount : quantity }} Tiket x {{ formatRp(effectivePrice) }}
                  </span>
                </div>
              </div>

              <!-- Trip Status / Jenis Trip -->
              <div class="summary-route-section">
                <div class="summary-route-label">JENIS TRIP</div>
                <div class="summary-route-value">
                  {{ tripTypeName }}
                </div>
              </div>



              <!-- Pemesan -->
              <div class="summary-route-section">
                <div class="summary-route-label">PEMESAN</div>
                <div class="summary-route-value">{{ registrant.fullName || '-' }}</div>
              </div>

              <!-- Penumpang -->
              <div class="summary-route-section">
                <div class="summary-route-label">PENUMPANG</div>
                <div class="summary-route-value">{{ quantity }} Dewasa</div>
              </div>

              <!-- Nomor seat -->
              <div class="summary-route-section" v-if="selectedseats && selectedseats.length > 0">
                <template v-if="isPP">
                  <div class="summary-route-label">NOMOR seat</div>
                  <div class="summary-route-value pp-seat-group">
                    <div class="pp-seat-line">
                      <span class="pp-leg-label">PERGI:</span>
                      <span>{{ selectedseats.filter(s => s.endsWith('_1')).map(s => formatseatBase(s)).join(', ') }}</span>
                    </div>
                    <div class="pp-seat-line">
                      <span class="pp-leg-label">PULANG:</span>
                      <span>{{ selectedseats.filter(s => s.endsWith('_2')).map(s => formatseatBase(s)).join(', ') }}</span>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="summary-route-label">NOMOR seat</div>
                  <div class="summary-route-value">{{ selectedseats.map(s => formatseatLabel(s)).join(', ') }}</div>
                </template>
              </div>

              <div class="summary-divider-dashed" style="margin-top: 20px;"></div>

              <div class="calculation-rows-list">
                <div class="calc-row-item">
                  <span class="calc-label">Jumlah ({{ isPP ? effectiveTicketCount : quantity }} Tiket)</span>
                  <span class="calc-value">{{ formatRp(baseTicketPrice) }}</span>
                </div>
                <div class="calc-row-item" v-if="totalDiscount > 0">
                  <span class="calc-label">Diskon Voucher</span>
                  <span class="calc-value discount-text">- {{ formatRp(totalDiscount) }}</span>
                </div>
                <div class="calc-row-item">
                  <span class="calc-label">Subtotal</span>
                  <span class="calc-value">{{ formatRp(baseTicketPrice - totalDiscount) }}</span>
                </div>
                <div class="calc-row-item">
                  <span class="calc-label">Biaya Admin</span>
                  <span class="calc-value">{{ formatRp(adminFee) }}</span>
                </div>
              </div>

              <div class="summary-divider-solid"></div>

              <div class="total-payment-highlight-row">
                <span class="total-pay-label">Total Pembayaran</span>
                <span class="total-pay-value">{{ formatRp(totalPayment) }}</span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </main>

    <!-- ================== FIXED BOTTOM ACTION BAR ================== -->
    <div class="tx-bottom-bar-fixed">
      <!-- Desktop version -->
      <div class="container bottom-bar-inner desktop-only-bar">
        <!-- Left: Countdown Timer -->
        <div class="timer-countdown-group">
          <div class="timer-ring-icon-wrap">
            <Clock :size="16" />
          </div>
          <div class="timer-texts">
            <span class="timer-sub-lbl">Segera selesaikan pesananmu</span>
            <span class="timer-clock-val">{{ formattedTime }}</span>
          </div>
        </div>

        <!-- Right: Submit Action Button -->
        <button 
          type="button" 
          class="btn-proceed-next" 
          @click="handleNext"
        >
          Selanjutnya
        </button>
      </div>

      <!-- Mobile version -->
      <div class="container bottom-bar-inner-mobile mobile-only-bar">
        <!-- Row 1: Total Price & Detail Toggle -->
        <div class="mobile-bar-row-one">
          <div class="price-info">
            <span class="price-lbl">TOTAL HARGA</span>
            <span class="price-val">{{ formatRp(totalPayment) }}</span>
          </div>
          <button type="button" class="btn-toggle-mobile-detail" @click="isMobileSummaryOpen = !isMobileSummaryOpen">
            <span class="detail-text">({{ isPP ? effectiveTicketCount : quantity }}) Detail</span>
            <ChevronUp v-if="!isMobileSummaryOpen" :size="16" />
            <ChevronDown v-else :size="16" />
          </button>
        </div>

        <!-- Row 2: Submit Button -->
        <button 
          type="button" 
          class="btn-submit-mobile" 
          @click="handleNext"
        >
          Beli Tiket Sekarang
        </button>
      </div>
    </div>

    <!-- ================== MOBILE DETAILS POPUP/BOTTOM SHEET ================== -->
    <div 
      class="mobile-summary-drawer-overlay" 
      v-if="isMobileSummaryOpen" 
      @click="isMobileSummaryOpen = false"
    >
      <div class="mobile-summary-drawer" @click.stop>
        <div class="drawer-header-row">
          <h3 class="drawer-title">Ringkasan Pesanan</h3>
          <button type="button" class="btn-close-drawer" @click="isMobileSummaryOpen = false">✕</button>
        </div>
        
        <div class="drawer-body-content">
          <div class="summary-details-section">
            <div class="s-category-row">
              <Ticket :size="16" class="s-ticket-icon" />
              <div class="s-category-info">
                <span class="s-category-name" v-if="!isLongText(ticket.name, 25)">{{ ticket.name }}</span>
                <div class="marquee-container" v-else>
                  <div class="marquee-inner-scroll">
                    <span class="s-category-name">{{ ticket.name }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <span class="s-category-name">{{ ticket.name }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  </div>
                </div>
                <span class="s-category-calc">
                  {{ isPP ? effectiveTicketCount : quantity }} Tiket x {{ formatRp(effectivePrice) }}
                </span>
              </div>
            </div>

            <!-- Trip Status / Jenis Trip -->
            <div class="summary-route-section">
              <div class="summary-route-label">JENIS TRIP</div>
              <div class="summary-route-value">
                {{ tripTypeName }}
              </div>
            </div>



            <!-- Pemesan -->
            <div class="summary-route-section">
              <div class="summary-route-label">PEMESAN</div>
              <div class="summary-route-value">{{ registrant.fullName || '-' }}</div>
            </div>

            <!-- Penumpang -->
            <div class="summary-route-section">
              <div class="summary-route-label">PENUMPANG</div>
              <div class="summary-route-value">{{ quantity }} Dewasa</div>
            </div>

            <!-- Nomor seat -->
            <div class="summary-route-section" v-if="selectedseats && selectedseats.length > 0">
              <template v-if="isPP">
                <div class="summary-route-label">NOMOR seat</div>
                <div class="summary-route-value pp-seat-group">
                  <div class="pp-seat-line">
                    <span class="pp-leg-label">PERGI:</span>
                    <span>{{ selectedseats.filter(s => s.endsWith('_1')).map(s => formatseatBase(s)).join(', ') }}</span>
                  </div>
                  <div class="pp-seat-line">
                    <span class="pp-leg-label">PULANG:</span>
                    <span>{{ selectedseats.filter(s => s.endsWith('_2')).map(s => formatseatBase(s)).join(', ') }}</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="summary-route-label">NOMOR seat</div>
                <div class="summary-route-value">{{ selectedseats.map(s => formatseatLabel(s)).join(', ') }}</div>
              </template>
            </div>

            <div class="summary-divider-dashed" style="margin-top: 20px;"></div>

            <div class="calculation-rows-list">
              <div class="calc-row-item">
                <span class="calc-label">Jumlah ({{ isPP ? effectiveTicketCount : quantity }} Tiket)</span>
                <span class="calc-value">{{ formatRp(baseTicketPrice) }}</span>
              </div>
              <div class="calc-row-item" v-if="totalDiscount > 0">
                <span class="calc-label">Diskon Voucher</span>
                <span class="calc-value discount-text">- {{ formatRp(totalDiscount) }}</span>
              </div>
              <div class="calc-row-item">
                <span class="calc-label">Subtotal</span>
                <span class="calc-value">{{ formatRp(baseTicketPrice - totalDiscount) }}</span>
              </div>
              <div class="calc-row-item">
                <span class="calc-label">Biaya Admin</span>
                <span class="calc-value">{{ formatRp(adminFee) }}</span>
              </div>
            </div>

            <div class="summary-divider-solid"></div>

            <div class="total-payment-highlight-row">
              <span class="total-pay-label">Total Pembayaran</span>
              <span class="total-pay-value">{{ formatRp(totalPayment) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================== CONFIRMATION MODAL POPUP ================== -->
    <div class="confirm-modal-overlay" v-if="showConfirmModal" @click="showConfirmModal = false">
      <div class="confirm-modal-card" @click.stop>
        <!-- Modal Header -->
        <div class="modal-header-row">
          <div class="modal-header-left">
            <span class="warning-icon-wrap">⚠️</span>
            <h3 class="modal-title-text">Konfirmasi</h3>
          </div>
          <button type="button" class="btn-close-modal" @click="showConfirmModal = false">✕</button>
        </div>

        <!-- Subheading -->
        <p class="modal-subheading-text">Pastikan data kamu sudah benar ya!</p>

        <!-- Details Box -->
        <div class="modal-details-box">
          <div class="modal-detail-item">
            <div class="modal-detail-lbl">Nama Lengkap</div>
            <div class="modal-detail-val">{{ registrant.fullName }}</div>
          </div>
          <div class="modal-detail-item">
            <div class="modal-detail-lbl">Email</div>
            <div class="modal-detail-val">{{ registrant.email }}</div>
          </div>
          <div class="modal-detail-item">
            <div class="modal-detail-lbl">No. Telepon / Handphone</div>
            <div class="modal-detail-val">{{ registrant.phonePrefix }}{{ registrant.phoneNumber }}</div>
          </div>
        </div>

        <!-- Alert Box -->
        <div class="modal-alert-box-info">
          <!-- Point 1 -->
          <div class="alert-info-point-row">
            <div class="point-num-circle">1</div>
            <div class="point-text-content">
              Invoice dan e-Tiket akan dikirim ke alamat email berikut:<br />
              <strong class="highlight-val">{{ registrant.email }}</strong>
            </div>
          </div>

          <!-- Point 2 -->
          <div class="alert-info-point-row">
            <div class="point-num-circle">2</div>
            <div class="point-text-content">
              e-Tiket juga akan dikirim melalui whatsapp dengan nomor:<br />
              <strong class="highlight-val">{{ registrant.phonePrefix }}{{ registrant.phoneNumber }}</strong>
            </div>
          </div>

          <!-- Point 3 -->
          <div class="alert-info-point-row">
            <div class="point-num-circle">3</div>
            <div class="point-text-content">
              Jika belum menerima notifikasi email setelah melakukan pembayaran hubungi:<br />
              <strong class="highlight-val">+62 813-2498-5355</strong> atau <strong class="highlight-val">teman@kolektix.com</strong>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer-actions-row">
          <button type="button" class="btn-modal-action btn-modal-edit" @click="showConfirmModal = false">
            Edit Data
          </button>
          <button type="button" class="btn-modal-action btn-modal-submit" @click="executeCheckout">
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ================== SEAT CONFLICT MODAL ================== -->
  <div class="confirm-modal-overlay" v-if="showSeatConflictModal" @click="showSeatConflictModal = false">
    <div class="confirm-modal-card" @click.stop>
      <!-- Modal Header -->
      <div class="modal-header-row">
        <div class="modal-header-left">
          <span class="warning-icon-wrap">⚠️</span>
          <h3 class="modal-title-text">Seat Tidak Tersedia</h3>
        </div>
        <button type="button" class="btn-close-modal" @click="showSeatConflictModal = false">✕</button>
      </div>

      <!-- Subheading -->
      <p class="modal-subheading-text">Maaf, seat yang kamu pilih sedang dipesan oleh pengguna lain.</p>

      <!-- Details Box -->
      <div class="modal-details-box">
        <div class="modal-detail-item">
          <div class="modal-detail-lbl">Nomor seat</div>
          <div class="modal-detail-val" style="font-weight: 700; color: var(--primary, #C94C4C); font-size: 1.1rem;">
            {{ seatConflictData?.seat || '-' }}
          </div>
        </div>
        <div class="modal-detail-item" v-if="seatConflictData?.ticket_type">
          <div class="modal-detail-lbl">Jenis Tiket</div>
          <div class="modal-detail-val">{{ seatConflictData.ticket_type.name }}</div>
        </div>
        <div class="modal-detail-item">
          <div class="modal-detail-lbl">Status</div>
          <div class="modal-detail-val" style="text-transform: uppercase; font-weight: 600; color: #f59e0b;">{{ seatConflictData?.status || 'PENDING' }}</div>
        </div>
      </div>

      <!-- Info -->
      <div class="modal-info-box" style="margin-top: 12px;">
        <p style="margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.6;">
          Silakan pilih seat lain atau tunggu beberapa saat dan coba lagi.
        </p>
      </div>

      <!-- Footer Actions -->
      <div class="modal-footer-actions-row">
        <button type="button" class="btn-modal-action btn-modal-submit" @click="showSeatConflictModal = false">
          Mengerti
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

/* Main layouts and vars overkendaraans */
.transaction-page {
  min-height: 100vh;
  background-color: #f3f6fa;
  font-family: 'Outfit', sans-serif;
  padding-bottom: 120px;
  color: #334155;
  transition: background-color 0.35s ease;
}

/* Dark theme support */
[data-theme="dark"] .transaction-page {
  background-color: #0f172a;
  color: #cbd5e1;
}

/* ================== NAVBAR HEADER ================== */
.tx-navbar {
  background-color: #ffffff;
  border-bottom: 1px solid rgba(201, 76, 76, 0.08);
  height: 64px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .tx-navbar {
  background-color: #1e293b;
  border-color: rgba(255, 255, 255, 0.06);
}

.nav-content {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.btn-nav-back {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #64748b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-nav-back:hover {
  background-color: #f1f5f9;
  color: var(--primary, #C94C4C);
}

[data-theme="dark"] .btn-nav-back:hover {
  background-color: #334155;
  color: #fff;
}

.navbar-title-main {
  font-size: 0.95rem;
  font-weight: 800;
  color: #334155;
}

[data-theme="dark"] .navbar-title-main {
  color: #f1f5f9;
}

/* ================== MAIN CONTENT GRID ================== */
.tx-main-content {
  padding-top: 100px;
}

.tx-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 32px;
  align-items: start;
}

.page-main-heading {
  font-size: 1.8rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 24px;
  letter-spacing: -0.5px;
}

[data-theme="dark"] .page-main-heading {
  color: #f1f5f9;
}

/* ================== FORM CARDS (ACCORDIONS) ================== */
.form-card-wrapper {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

[data-theme="dark"] .form-card-wrapper {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.05);
}

.form-card-header {
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background-color: #ffffff;
  user-select: none;
  transition: background-color 0.2s;
}

[data-theme="dark"] .form-card-header {
  background-color: #1e293b;
}

.form-card-header:hover {
  background-color: #fafbfc;
}

[data-theme="dark"] .form-card-header:hover {
  background-color: #334155;
}

.form-header-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0;
}

[data-theme="dark"] .form-header-title {
  color: #f1f5f9;
}

.btn-toggle-accordion {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card-body {
  padding: 24px;
  border-top: 1px solid #f1f5f9;
  background-color: #ffffff;
  animation: slide-down 0.25s ease-out;
}

[data-theme="dark"] .form-card-body {
  border-color: rgba(255, 255, 255, 0.05);
  background-color: #1e293b;
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================== INPUT FIELDS ================== */
.form-group-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.form-group-item:last-child {
  margin-bottom: 0;
}

.form-input-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme="dark"] .form-input-label {
  color: #94a3b8;
}

.form-text-input {
  background-color: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  color: #334155;
  outline: none;
  transition: all 0.25s;
}

[data-theme="dark"] .form-text-input {
  background-color: #0f172a;
  border-color: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

.form-text-input:focus {
  border-color: var(--primary, #C94C4C);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.08);
}

[data-theme="dark"] .form-text-input:focus {
  background-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.2);
}

/* Phone input with select country prefix */
.phone-input-combo {
  display: flex;
  background-color: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.25s;
}

[data-theme="dark"] .phone-input-combo {
  background-color: #0f172a;
  border-color: rgba(255, 255, 255, 0.08);
}

.phone-input-combo:focus-within {
  border-color: var(--primary, #C94C4C);
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.08);
}

[data-theme="dark"] .phone-input-combo:focus-within {
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.2);
}

.phone-prefix-select {
  background-color: #f1f5f9;
  border: none;
  border-right: 1.5px solid #e2e8f0;
  padding: 12px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
  outline: none;
  cursor: pointer;
}

[data-theme="dark"] .phone-prefix-select {
  background-color: #1e293b;
  border-right-color: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.phone-number-input {
  flex: 1;
  background: none;
  border: none;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  color: #334155;
  outline: none;
}

[data-theme="dark"] .phone-number-input {
  color: #f1f5f9;
}

.form-error-msg {
  font-size: 0.8rem;
  font-weight: 600;
  color: #ef4444;
}

/* ================== TICKET OWNER CARD ================== */
.ticket-owner-card {
  margin-top: 24px;
}

.ticket-header-details {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ticket-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background-color: rgba(201, 76, 76, 0.06);
  color: var(--primary, #C94C4C);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

[data-theme="dark"] .ticket-icon-badge {
  background-color: rgba(201, 76, 76, 0.15);
}

.ticket-owner-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 2px;
}

[data-theme="dark"] .ticket-owner-title {
  color: #f1f5f9;
}

.ticket-owner-subtitle {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

[data-theme="dark"] .ticket-owner-subtitle {
  color: #94a3b8;
}

/* Use registrant toggle */
.use-registrant-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f8fafc;
  border-radius: 10px;
  padding: 10px 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  margin: 0 24px 16px; /* Sits outside, padded from the card borders */
}

[data-theme="dark"] .use-registrant-toggle-row {
  background-color: #141c2f;
  border-color: rgba(255, 255, 255, 0.04);
}

/* Custom styling for ticket owner accordion body under toggle row */
.ticket-owner-card .form-card-body {
  border-top: none;
  padding-top: 0;
}

.toggle-description-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
}

[data-theme="dark"] .toggle-description-label {
  color: #cbd5e1;
}

/* Custom switch slider */
.switch-toggle-btn {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch-toggle-btn input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider-round {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #cbd5e1;
  border-radius: 24px;
  transition: 0.3s;
}

.switch-slider-round::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

.switch-toggle-btn input:checked + .switch-slider-round {
  background-color: var(--primary, #C94C4C);
}

.switch-toggle-btn input:checked + .switch-slider-round::before {
  transform: translateX(20px);
}

.form-grid-two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
}

.full-width-field {
  grid-column: span 2;
}

.disabled-combo {
  opacity: 0.6;
}

/* ================== SIDEBAR ================== */
.tx-sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 100px;
}

.sidebar-mini-event-card {
  display: flex;
  gap: 14px;
  background-color: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
}

[data-theme="dark"] .sidebar-mini-event-card {
  background-color: #1e293b;
  border-color: rgba(255, 255, 255, 0.05);
}

.mini-event-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.mini-event-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.mini-event-title {
  font-size: 0.9rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-theme="dark"] .mini-event-title {
  color: #f1f5f9;
}

.mini-event-date {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

[data-theme="dark"] .mini-event-date {
  color: #94a3b8;
}

.sidebar-box-wrapper {
  background-color: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .sidebar-box-wrapper {
  background-color: #1e293b;
  border-color: rgba(255, 255, 255, 0.05);
}

.box-header-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

[data-theme="dark"] .box-header-title {
  color: #f1f5f9;
  border-color: rgba(255, 255, 255, 0.05);
}

/* Voucher items */
.voucher-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.voucher-text-input {
  flex: 1;
  background-color: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  outline: none;
  text-transform: uppercase;
}

[data-theme="dark"] .voucher-text-input {
  background-color: #0f172a;
  border-color: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

.btn-submit-voucher {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-submit-voucher:hover:not(:disabled) {
  background-color: #e2e8f0;
  color: #1e293b;
}

.btn-submit-voucher:disabled {
  background-color: #f8fafc;
  color: #cbd5e1;
  border-color: #e2e8f0;
  cursor: not-allowed;
}

[data-theme="dark"] .btn-submit-voucher {
  background-color: #334155;
  color: #f1f5f9;
  border-color: rgba(255, 255, 255, 0.06);
}

[data-theme="dark"] .btn-submit-voucher:hover:not(:disabled) {
  background-color: #475569;
}

.promo-feedback-area {
  margin-bottom: 10px;
}

.promo-error {
  font-size: 0.75rem;
  font-weight: 700;
  color: #ef4444;
}

.promo-success {
  font-size: 0.75rem;
  font-weight: 700;
  color: #22c55e;
}

.btn-add-more-voucher {
  background: none;
  border: none;
  color: var(--primary, #C94C4C);
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  padding: 6px 0 0;
  transition: all 0.2s;
  width: 100%;
  text-align: center;
  border: 1.5px solid var(--primary, #C94C4C);
  border-radius: 8px;
  margin-top: 10px;
  padding: 8px 12px;
}

.btn-add-more-voucher:hover {
  background-color: rgba(201, 76, 76, 0.04);
}

/* Order Summary box */
.summary-details-section {
  display: flex;
  flex-direction: column;
}

.s-category-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 14px;
}

.s-ticket-icon {
  color: var(--primary, #C94C4C);
  margin-top: 3px;
}

.s-category-info {
  display: flex;
  flex-direction: column;
}

.s-category-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: #1e293b;
}

[data-theme="dark"] .s-category-name {
  color: #f1f5f9;
}

.s-category-calc {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
}

[data-theme="dark"] .s-category-calc {
  color: #94a3b8;
}

.summary-divider-dashed {
  border-top: 1.2px dashed #cbd5e1;
  margin-bottom: 14px;
}

[data-theme="dark"] .summary-divider-dashed {
  border-top-color: rgba(255, 255, 255, 0.15);
}

.calculation-rows-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calc-row-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

[data-theme="dark"] .calc-row-item {
  color: #94a3b8;
}

.calc-value {
  font-weight: 700;
  color: #334155;
}

[data-theme="dark"] .calc-value {
  color: #f1f5f9;
}

.discount-text {
  color: #22c55e;
}

.summary-divider-solid {
  border-top: 1px solid #cbd5e1;
  margin: 16px 0;
}

[data-theme="dark"] .summary-divider-solid {
  border-top-color: rgba(255, 255, 255, 0.15);
}

.total-payment-highlight-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-pay-label {
  font-size: 0.88rem;
  font-weight: 800;
  color: #1e293b;
}

[data-theme="dark"] .total-pay-label {
  color: #cbd5e1;
}

.total-pay-value {
  font-size: 1.25rem;
  font-weight: 900;
  color: #1e293b;
  letter-spacing: -0.5px;
}

[data-theme="dark"] .total-pay-value {
  color: #fff;
}

/* ================== FIXED BOTTOM ACTION BAR ================== */
.tx-bottom-bar-fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background-color: #ffffff;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.02);
  z-index: 99;
  display: flex;
  align-items: center;
}

[data-theme="dark"] .tx-bottom-bar-fixed {
  background-color: #1e293b;
  border-color: rgba(255, 255, 255, 0.05);
}

.bottom-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.timer-countdown-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timer-ring-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

[data-theme="dark"] .timer-ring-icon-wrap {
  border-color: #334155;
  color: #94a3b8;
}

.timer-texts {
  display: flex;
  flex-direction: column;
}

.timer-sub-lbl {
  font-size: 0.72rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.timer-clock-val {
  font-size: 1rem;
  font-weight: 800;
  color: #334155;
}

[data-theme="dark"] .timer-clock-val {
  color: #f1f5f9;
}

.btn-proceed-next {
  background-color: var(--primary, #C94C4C);
  color: #ffffff;
  font-weight: 800;
  font-size: 0.95rem;
  padding: 12px 32px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-btn, 0 4px 14px rgba(201, 76, 76, 0.3));
}

.btn-proceed-next:hover {
  background-color: #b34242;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(201, 76, 76, 0.4);
}

.btn-proceed-next:active {
  transform: translateY(0);
}

/* ================== RESPONSIVE STYLING ================== */
@media (max-width: 1024px) {
  .tx-grid {
    grid-template-columns: 1fr 300px;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .tx-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: stretch !important;
  }

  /* Disable Voucher Accordion on Mobile */
  .voucher-box .voucher-card-header {
    pointer-events: none !important;
  }
  .voucher-box .voucher-card-header .btn-toggle-accordion {
    display: none !important;
  }
  .voucher-box .voucher-card-body {
    display: block !important;
    margin-top: 16px;
  }

  .tx-sidebar-column {
    position: static;
    order: -1;
  }

  .tx-sidebar-column .summary-box {
    display: none !important;
  }

  .transaction-page {
    padding-bottom: 140px !important;
  }

  .sidebar-box-wrapper,
  .form-card-wrapper,
  .sidebar-mini-event-card {
    width: 100% !important;
  }

  .form-grid-two-cols {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .full-width-field {
    grid-column: auto;
  }

  .page-main-heading {
    font-size: 1.4rem;
    margin-bottom: 16px;
  }

  .form-card-header {
    padding: 14px 16px;
  }

  .form-card-body {
    padding: 16px;
  }

  .use-registrant-toggle-row {
    margin: 0 16px 12px;
    padding: 8px 12px;
  }

}

@media (max-width: 480px) {
  
  .timer-countdown-group {
    gap: 8px;
  }
  
  .timer-ring-icon-wrap {
    width: 32px;
    height: 32px;
  }

  .timer-clock-val {
    font-size: 0.9rem;
  }
  
  .timer-sub-lbl {
    font-size: 0.65rem;
  }

  .btn-proceed-next {
    padding: 10px 20px;
    font-size: 0.85rem;
  }
}

/* ================== ORDER SUMMARY ADDITIONAL SECTIONS ================== */
.summary-details-title-row {
  margin-top: 18px;
  margin-bottom: 4px;
}

.details-title-text {
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme="dark"] .details-title-text {
  color: #f1f5f9;
}

.summary-route-section {
  margin-top: 16px;
}

.summary-route-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--primary, #C94C4C);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.summary-route-value {
  font-size: 0.9rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.3;
}

[data-theme="dark"] .summary-route-value {
  color: #f1f5f9;
}

.summary-route-sub {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.3;
}

/* PP seat group display */
.pp-seat-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pp-seat-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
}

[data-theme="dark"] .pp-seat-line {
  color: #f1f5f9;
}

.pp-leg-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--primary, #C94C4C);
  letter-spacing: 0.5px;
  min-width: 60px;
}

[data-theme="dark"] .summary-route-sub {
  color: #94a3b8;
}

/* ================== ACCORDION VOUCHER ================== */
.voucher-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.voucher-card-header .box-header-title {
  margin-bottom: 0 !important;
  border-bottom: none !important;
  padding-bottom: 0 !important;
  flex: 1;
}

.voucher-card-header .btn-toggle-accordion {
  color: #94a3b8;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voucher-card-body {
  margin-top: 16px;
  animation: slide-down 0.25s ease-out;
}

/* ================== INPUT FIELD ERRORS ================== */
.form-text-input.input-error,
.phone-input-combo.input-error {
  border-color: #ef4444 !important;
  background-color: rgba(239, 68, 68, 0.02) !important;
}

[data-theme="dark"] .form-text-input.input-error,
[data-theme="dark"] .phone-input-combo.input-error {
  background-color: rgba(239, 68, 68, 0.05) !important;
}

/* ================== CONFIRMATION MODAL POPUP ================== */
.confirm-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeInModal 0.25s ease-out;
}

.confirm-modal-card {
  background-color: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: slideInCard 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="dark"] .confirm-modal-card {
  background-color: #1e293b;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

@keyframes fadeInModal {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInCard {
  from { transform: scale(0.95) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-icon-wrap {
  font-size: 1.25rem;
}

.modal-title-text {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0;
}

[data-theme="dark"] .modal-title-text {
  color: #f1f5f9;
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}

.btn-close-modal:hover {
  color: #475569;
}

.modal-subheading-text {
  font-size: 0.9rem;
  color: #475569;
  font-weight: 700;
  margin-bottom: 20px;
}

[data-theme="dark"] .modal-subheading-text {
  color: #cbd5e1;
}

/* Details Box */
.modal-details-box {
  background-color: #f8fafc;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

[data-theme="dark"] .modal-details-box {
  background-color: #0f172a;
  border-color: rgba(255, 255, 255, 0.05);
}

.modal-detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modal-detail-lbl {
  font-size: 0.72rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme="dark"] .modal-detail-lbl {
  color: #94a3b8;
}

.modal-detail-val {
  font-size: 0.9rem;
  font-weight: 800;
  color: #1e293b;
}

[data-theme="dark"] .modal-detail-val {
  color: #f1f5f9;
}

/* Informational Alert Box */
.modal-alert-box-info {
  background-color: rgba(201, 76, 76, 0.04);
  border: 1px solid rgba(201, 76, 76, 0.12);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

[data-theme="dark"] .modal-alert-box-info {
  background-color: rgba(201, 76, 76, 0.08);
  border-color: rgba(201, 76, 76, 0.2);
}

.alert-info-point-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.point-num-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #C94C4C;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

[data-theme="dark"] .point-num-circle {
  background-color: #C94C4C;
}

.point-text-content {
  font-size: 0.82rem;
  color: #3b4252;
  line-height: 1.4;
}

[data-theme="dark"] .point-text-content {
  color: #cbd5e1;
}

.point-text-content strong.highlight-val {
  color: #0f172a;
  font-weight: 800;
}

[data-theme="dark"] .point-text-content strong.highlight-val {
  color: #ffffff;
}

/* Footer Actions */
.modal-footer-actions-row {
  display: flex;
  gap: 16px;
}

.btn-modal-action {
  flex: 1;
  padding: 12px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  border: none;
}

.btn-modal-edit {
  background-color: #ffffff;
  color: #C94C4C;
  border: 1.5px solid #C94C4C;
}

.btn-modal-edit:hover {
  background-color: rgba(201, 76, 76, 0.04);
}

[data-theme="dark"] .btn-modal-edit {
  background-color: transparent;
  color: #C94C4C;
  border-color: #C94C4C;
}

[data-theme="dark"] .btn-modal-edit:hover {
  background-color: rgba(201, 76, 76, 0.08);
}

.btn-modal-submit {
  background-color: #C94C4C;
  color: #ffffff;
}

.btn-modal-submit:hover {
  background-color: #b34242;
}

[data-theme="dark"] .btn-modal-submit {
  background-color: #C94C4C;
}

[data-theme="dark"] .btn-modal-submit:hover {
  background-color: #b34242;
}

@media (max-width: 480px) {
  .confirm-modal-card {
    padding: 16px;
  }
  .modal-subheading-text {
    margin-bottom: 12px;
  }
  .modal-details-box {
    padding: 12px;
    margin-bottom: 16px;
    gap: 8px;
  }
  .modal-alert-box-info {
    padding: 12px;
    margin-bottom: 16px;
    gap: 12px;
  }
  .modal-footer-actions-row {
    gap: 10px;
  }
  .btn-modal-action {
    padding: 10px;
    font-size: 0.85rem;
  }
}

/* Bottom bar desktop / mobile display toggle */
.desktop-only-bar {
  display: flex !important;
}
.mobile-only-bar {
  display: none !important;
}

@media (max-width: 768px) {
  .desktop-only-bar {
    display: none !important;
  }
  .mobile-only-bar {
    display: flex !important;
  }
  .tx-bottom-bar-fixed {
    height: 110px !important;
    padding: 10px 16px;
    align-items: stretch;
  }
  .bottom-bar-inner-mobile {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 0 !important;
  }
  .mobile-bar-row-one {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .price-info {
    display: flex;
    flex-direction: column;
  }
  .price-lbl {
    font-size: 0.65rem;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.5px;
  }
  [data-theme="dark"] .price-lbl {
    color: #94a3b8;
  }
  .price-val {
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
    margin-top: 2px;
  }
  [data-theme="dark"] .price-val {
    color: #ffffff;
  }
  .btn-toggle-mobile-detail {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--primary, #C94C4C);
    font-weight: 700;
    font-size: 0.85rem;
    background: none;
    border: none;
    cursor: pointer;
  }
  .btn-submit-mobile {
    background-color: var(--primary, #C94C4C);
    color: #ffffff;
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 800;
    padding: 12px;
    border-radius: 12px;
    border: none;
    width: 100%;
    cursor: pointer;
    text-align: center;
    box-shadow: 0 4px 12px rgba(201, 76, 76, 0.2);
    transition: all 0.2s;
  }
  .btn-submit-mobile:hover {
    background-color: #b34242;
  }

  .tx-main-content {
    padding-bottom: 150px !important;
  }
  .page-main-heading {
    font-size: 1.35rem !important;
    margin-bottom: 16px !important;
  }
  .form-card-wrapper {
    border-radius: 10px !important;
    margin-bottom: 16px !important;
  }
  .form-card-header {
    padding: 12px 16px !important;
  }
  .form-header-title {
    font-size: 0.92rem !important;
  }
  .form-card-body {
    padding: 16px !important;
  }
  .form-group-item {
    margin-bottom: 12px !important;
    gap: 4px !important;
  }
  .form-input-label {
    font-size: 0.7rem !important;
  }
  .form-text-input,
  .phone-prefix-select,
  .phone-number-input {
    padding: 10px 12px !important;
    font-size: 0.85rem !important;
  }
}

/* Mobile Summary Drawer Bottom Sheet */
.mobile-summary-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mobile-summary-drawer {
  width: 100%;
  max-width: 500px;
  background-color: #ffffff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 24px;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.15);
  animation: slide-up-drawer 0.3s ease-out;
  max-height: 80vh;
  overflow-y: auto;
}

[data-theme="dark"] .mobile-summary-drawer {
  background-color: #1e293b;
}

@keyframes slide-up-drawer {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.drawer-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #cbd5e1;
}

[data-theme="dark"] .drawer-header-row {
  border-color: rgba(255, 255, 255, 0.1);
}

.drawer-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

[data-theme="dark"] .drawer-title {
  color: #f1f5f9;
}

.btn-close-drawer {
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
}

[data-theme="dark"] .btn-close-drawer {
  color: #94a3b8;
}

/* Infinite Marquee Styles */
.marquee-container {
  overflow: hidden;
  white-space: nowrap;
  width: 100%;
}

.marquee-inner-scroll {
  display: inline-block;
  white-space: nowrap;
  animation: marquee-scroll-loop 15s linear infinite;
}

@keyframes marquee-scroll-loop {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
