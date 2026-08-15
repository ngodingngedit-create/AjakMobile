import { reactive } from 'vue';

export const bookingStore = reactive({
  isLoading: false,
  selectedEvent: null,
  selectedPickup: null,
  selectedReturn: null,
  selectedTicket: null,
  customer: {
    name: '',
    email: '',
    phone: ''
  },
  adults: 1,
  toddlers: 0,
  bookingCode: null,
  selectedseats: [],
  selectedTripStatus: null,
  selectedRouteId: null,
  selectedSessionId: null,
  selectedDate: null,
  selectedPrice: null,

  reset() {
    this.selectedEvent = null;
    this.selectedPickup = null;
    this.selectedReturn = null;
    this.selectedTicket = null;
    this.customer = { name: '', email: '', phone: '' };
    this.adults = 1;
    this.toddlers = 0;
    this.bookingCode = null;
    this.selectedseats = [];
    this.selectedTripStatus = null;
    this.selectedRouteId = null;
    this.selectedSessionId = null;
    this.selectedDate = null;
    this.selectedPrice = null;
  },

  generateBookingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'AJK-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    this.bookingCode = code;
    return code;
  },

  get totalPassengers() {
    return this.adults + this.toddlers;
  },

  get basePrice() {
    if (!this.selectedEvent) return 0;
    return this.selectedEvent.priceNum || 0;
  },

  get kendaraanPrice() {
    return this.basePrice * this.adults;
  },

  get adminFee() {
    if (this.selectedEvent && this.selectedEvent.id === 107) return 0;
    return 5000 * this.adults;
  },

  get totalPrice() {
    return this.kendaraanPrice + this.adminFee;
  }
});
