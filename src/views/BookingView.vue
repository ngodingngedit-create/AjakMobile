<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MapPin, Clock, Calendar, ChevronLeft, ChevronDown, Check, Info, User, Mail, Phone, Wind, Zap, Music, ShieldCheck, Wifi, Sofa } from 'lucide-vue-next';
import { bookingStore } from '../store/booking';

const route = useRoute();
const router = useRouter();



const event = ref(null);
const activeTab = ref('tiket'); // 'deskripsi', 'tiket', 'terms'
const selectedTicket = ref(null);
const expandedTicketId = ref(null);
const currentStep = ref(1); // 1 = Select seat, 2 = Buyer details form
const tripTypeError = ref('');
const ppStep = ref(1); // 1 = Pergi, 2 = Pulang (only for PP / trip_status_id === 3)
const isEditMode = ref(false);
const isFilterWrapperExpanded = ref(true);
const isTicketsWrapperExpanded = ref(true);
const isHariExpanded = ref(true);
const isSesiExpanded = ref(true);

// Dynamic Shuttle Filter Data
const selectedDate = ref('2026-06-25');
const selectedSesi = ref('1');

const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const formatOpDate = (dateStr) => {
  if (!dateStr) return { shortDay: '', shortDate: '', label: '', fullDate: '' };
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return { shortDay: dateStr, shortDate: dateStr, label: dateStr, fullDate: dateStr };
  const d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
  const dayName = dayNamesShort[d.getDay()];
  const monthName = monthNamesShort[d.getMonth()];
  const dayNum = parseInt(parts[2]);
  return {
    shortDay: dayName,
    shortDate: `${dayNum} ${monthName}`,
    label: `${dayName}, ${dayNum} ${monthName} ${parts[0]}`,
    fullDate: `${dayNum} ${monthName} ${parts[0]}`
  };
};

const dateOptions = computed(() => {
  if (!event.value || !event.value.operation_days || !Array.isArray(event.value.operation_days) || event.value.operation_days.length === 0) {
    return [];
  }
  return event.value.operation_days.map(op => {
    const formatted = formatOpDate(op.operation_date);
    return {
      id: String(op.operation_date),
      label: formatted.label,
      date: formatted.fullDate,
      shortDay: formatted.shortDay,
      shortDate: formatted.shortDate,
      enabled: true,
      raw: op
    };
  });
});

const sessionOptions = computed(() => {
  if (!event.value || !event.value.operation_days || !Array.isArray(event.value.operation_days)) return [];
  const currentOp = event.value.operation_days.find(op => String(op.operation_date) === String(selectedDate.value));
  if (!currentOp || !currentOp.sessions || !Array.isArray(currentOp.sessions)) return [];
  
  const formatTimeOnly = (val) => {
    if (!val) return '';
    if (val.includes('T')) {
      const tPart = val.split('T')[1];
      return tPart ? tPart.slice(0, 5) : '';
    }
    return val.slice(0, 5);
  };

  return currentOp.sessions
    .filter(s => {
      // Filter out sessions named "Sore" or "Malam" (case-insensitive)
      const name = (s.name || '').toLowerCase();
      if (name.includes('sore') || name.includes('malam')) return false;
      
      // Filter out sessions with departure time >= 17:00 (evening/night only),
      // but always keep "Petang" sessions
      const depTime = formatTimeOnly(s.departure_time);
      if (depTime && depTime >= '17:00' && !name.includes('petang')) return false;
      
      return true;
    })
    .map(s => {
    const depTime = formatTimeOnly(s.departure_time);
    const arrTime = formatTimeOnly(s.arrival_time);
    const hasTickets = s.tickets && Array.isArray(s.tickets) && s.tickets.length > 0;
    return {
      id: String(s.id),
      name: s.name || 'Sesi',
      time: depTime ? depTime + ' WIB' : 'Jam Berangkat',
      departureTime: depTime ? depTime + ' WIB' : '',
      arrivalTime: arrTime ? arrTime + ' WIB' : '',
      available: hasTickets,
      tickets: s.tickets || []
    };
  });
});

// Calendar Popup States & Handlers
const showCalendarPopup = ref(false);
const calendarBtnWrapperRef = ref(null);

const toggleCalendarPopup = () => {
  showCalendarPopup.value = !showCalendarPopup.value;
};

const closeCalendarPopup = () => {
  showCalendarPopup.value = false;
};

const selectDateFromCalendar = (concertId) => {
  selectedDate.value = concertId;
  showCalendarPopup.value = false;
};

const handleWheelScroll = (e) => {
  if (e.deltaY !== 0) {
    e.preventDefault();
    const container = e.currentTarget;
    container.scrollLeft += e.deltaY;
  }
};

const handleClickOutside = (event) => {
  if (calendarBtnWrapperRef.value && !calendarBtnWrapperRef.value.contains(event.target)) {
    showCalendarPopup.value = false;
  }
};

const calendarMonthYear = computed(() => {
  if (!selectedDate.value) return 'Juni 2026';
  const parts = selectedDate.value.split('-');
  if (parts.length < 2) return 'Juni 2026';
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${monthNames[mIdx]} ${parts[0]}`;
});

const juneDays = computed(() => {
  if (!selectedDate.value) return [];
  const parts = selectedDate.value.split('-');
  if (parts.length < 3) return [];
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const opDates = dateOptions.value.map(d => d.id);
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(i).padStart(2, '0');
    const iso = `${year}-${monthStr}-${dayStr}`;
    const isConcert = opDates.includes(iso);
    days.push({
      num: i,
      isConcert,
      concertId: iso
    });
  }
  return days;
});

// Booking states (Quantity, selected seats, and buyer information)
const quantity = ref(1);
const selectedseatsMap = ref({});

const currentSelectionKey = computed(() => {
  if (!selectedTicket.value) return '';
  return `${selectedTicket.value.id}_${selectedDate.value}_${selectedSesi.value}`;
});

const selectedseats = computed({
  get: () => {
    const key = currentSelectionKey.value;
    if (!key) return [];
    return selectedseatsMap.value[key] || [];
  },
  set: (val) => {
    const key = currentSelectionKey.value;
    if (key) {
      selectedseatsMap.value[key] = val;
    }
  }
});

const allSelectedTickets = computed(() => {
  const list = [];
  if (!event.value) return [];
  
  for (const [key, seats] of Object.entries(selectedseatsMap.value)) {
    if (seats && seats.length > 0) {
      const [ticketId, dayId, sesiId] = key.split('_');
      const allTickets = filteredTickets.value;
      const ticket = allTickets.find(t => String(t.id) === String(ticketId));
      if (ticket) {
        list.push({
          key,
          ticket,
          dayId,
          sesiId,
          seats,
          price: getEffectivePrice(ticket),
          name: ticket.name
        });
      }
    }
  }
  return list;
});

const totalSelectedTicketsCount = computed(() => {
  return allSelectedTickets.value.reduce((sum, item) => {
    const count = isPP.value ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length;
    return sum + count;
  }, 0);
});

const totalSelectedTicketsPrice = computed(() => {
  return allSelectedTickets.value.reduce((sum, item) => {
    const count = isPP.value ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length;
    return sum + (item.price * count);
  }, 0);
});

const mergedSelectedseats = computed(() => {
  return Object.values(selectedseatsMap.value).flat();
});

const isPP = computed(() => selectedTripStatus.value?.id === 3);

// Helper: get price from ticket.prices array based on selected trip status
const getEffectivePrice = (ticket) => {
  if (!ticket || !selectedTripStatus.value || !ticket.prices || !ticket.prices.length) {
    return ticket?.price || 0;
  }
  const matchingPrice = ticket.prices.find(p => String(p.ticket_type_id) === String(selectedTripStatus.value.id));
  return matchingPrice ? parseInt(matchingPrice.price) : (ticket.price || 0);
};

const ppPergiSelectedCount = computed(() => {
  return selectedseats.value.filter(s => s.endsWith('_1')).length;
});
const ppPulangSelectedCount = computed(() => {
  return selectedseats.value.filter(s => s.endsWith('_2')).length;
});

const buyer = ref({
  name: '',
  email: '',
  phone: '',
  identity: ''
});

// Interactive canvas state
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const isCanvasOpen = ref(false);
const isFullscreen = ref(false);
const isTabsSticky = ref(false);
const isStageDraggable = ref(true);
const tabsBarRef = ref(null);
const showMobileDetailSheet = ref(false);

// Bottom sheet drag state
const isMobile = ref(window.innerWidth <= 768);
const updateMobileStatus = () => {
  isMobile.value = window.innerWidth <= 768;
};

const sheetDragStartY = ref(0);
const sheetDragDeltaY = ref(0);
const isSheetDragging = ref(false);
const isSheetClosing = ref(false);
const SHEET_DISMISS_THRESHOLD = 120; // px to drag down to dismiss
const SHEET_CLOSE_DURATION = 380;   // ms — must match CSS animation duration

const onSheetDragStart = (e) => {
  if (window.innerWidth > 768) return;
  const touch = e.touches ? e.touches[0] : e;
  sheetDragStartY.value = touch.clientY;
  sheetDragDeltaY.value = 0;
  isSheetDragging.value = true;
};

const onSheetDragMove = (e) => {
  if (!isSheetDragging.value || window.innerWidth > 768) return;
  if (e.cancelable) {
    e.preventDefault();
  }
  const touch = e.touches ? e.touches[0] : e;
  const delta = touch.clientY - sheetDragStartY.value;
  if (delta < 0) {
    // Dragging UP — allow flexible drag with soft dampening
    sheetDragDeltaY.value = Math.max(-120, delta * 0.6);
  } else {
    // Dragging DOWN — allow freely
    sheetDragDeltaY.value = delta;
  }
};

const animatedCloseSheet = () => {
  isSheetClosing.value = true;
  // Slide sheet down off-screen smoothly
  sheetDragDeltaY.value = window.innerHeight || 1000;
  setTimeout(() => {
    isSheetClosing.value = false;
    isCanvasOpen.value = false;
    sheetDragDeltaY.value = 0;
    errors.value.seats = '';
    // Sync with router hash if needed
    if (route.hash === '#seatmap') {
      router.back();
    }
  }, SHEET_CLOSE_DURATION);
};

const onSheetDragEnd = () => {
  if (!isSheetDragging.value || window.innerWidth > 768) return;
  isSheetDragging.value = false;
  if (sheetDragDeltaY.value > SHEET_DISMISS_THRESHOLD) {
    // Animate dismiss
    animatedCloseSheet();
  } else {
    // Snap back smoothly
    sheetDragDeltaY.value = 0;
  }
};

const handleScrollTabs = () => {
  if (!tabsBarRef.value) return;
  const rect = tabsBarRef.value.getBoundingClientRect();
  const threshold = window.innerWidth <= 768 ? 60 : 80;
  isTabsSticky.value = rect.top <= threshold + 2;
};

let lastDist = 0;

const getDistance = (t1, t2) => {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
};

const handleTouchStart = (e) => {
  const touches = (e.evt && e.evt.touches) || (e.touches) || (e.targetTouches);
  if (touches && touches.length === 2) {
    if (e.evt) e.evt.preventDefault();
    isStageDraggable.value = false;
    lastDist = getDistance(touches[0], touches[1]);
  }
};

const handleTouchMove = (e) => {
  const touches = (e.evt && e.evt.touches) || (e.touches) || (e.targetTouches);
  if (touches && touches.length === 2) {
    if (e.evt) e.evt.preventDefault();
    const dist = getDistance(touches[0], touches[1]);
    
    if (!lastDist) {
      lastDist = dist;
      return;
    }
    
    const scale = dist / lastDist;
    const newZoom = zoom.value * scale;
    zoom.value = Math.min(Math.max(newZoom, 0.5), 3.0);
    lastDist = dist;
  }
};

const handleTouchEnd = () => {
  lastDist = 0;
  isStageDraggable.value = true;
};

const onWheel = (e) => {
  if (e.evt) e.evt.preventDefault();
  const delta = e.evt ? e.evt.deltaY : e.deltaY;
  const zoomFactor = 0.05;
  let newZoom = zoom.value + (delta < 0 ? zoomFactor : -zoomFactor);
  zoom.value = Math.min(Math.max(newZoom, 0.5), 3.0);
};

const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.15, 2.5);
};

const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.15, 0.5);
};

const resetZoomPan = () => {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
};

const errors = ref({
  name: '',
  email: '',
  phone: '',
  seats: ''
});

const showPaymentModal = ref(false);
const selectedPayment = ref('');

const paymentMethods = [
  { id: 'qris', name: 'QRIS', icon: '📱' },
  { id: 'gopay', name: 'GoPay', icon: '🟢' },
  { id: 'dana', name: 'DANA', icon: '🔵' },
  { id: 'bca', name: 'BCA Virtual Account', icon: '🏦' }
];

// Bus cabin seats configuration layout (generated dynamically from available_seat_number)
const parsedseatmap = computed(() => {
  if (!event.value) return [];

  const shapes = [];
  const availableSeats = new Set();
  
  if (selectedTicket.value?.available_seat_number) {
    const raw = selectedTicket.value.available_seat_number;
    if (typeof raw === 'string' && raw.trim()) {
      raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).forEach(s => availableSeats.add(s));
    }
  }

  // Parse seatmap JSON to use as the absolute source of truth for layout
  let config = [];
  try {
    if (event.value.seatmap) {
      config = typeof event.value.seatmap === 'string' ? JSON.parse(event.value.seatmap) : event.value.seatmap;
    }
  } catch (e) {
    console.error('Error parsing seatmap JSON:', e);
  }

  const is59Layout = event.value?.total_seat === 59;

  // Define layout constants for 59-seat layout
  const seatW = 36;
  const seatH = 36;
  const gapX = 4;
  const gapAisle = 20;
  const areaX = -80;
  const areaY = 0;

  // Render static boxes ONLY for 59-seat layout
  if (is59Layout) {
    shapes.push({
      id: 'box-pintu-depan',
      type: 'box',
      x: areaX - 20,
      y: areaY - 45,
      width: seatW * 2 + gapX + 20,
      height: 30,
      text: 'PINTU DEPAN',
      background: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0
    });
    shapes.push({
      id: 'box-kemudi',
      type: 'box',
      x: areaX + seatW * 2 + gapX + gapAisle,
      y: areaY - 50,
      width: seatW * 3 + gapX * 2,
      height: 40,
      text: 'KEMUDI',
      background: '#ffffff',
      stroke: '#cbd5e1',
      strokeWidth: 1
    });
    shapes.push({
      id: 'box-pintu-belakang',
      type: 'box',
      x: areaX - 40,
      y: areaY + 10 * (seatH + gapX),
      width: seatW * 2 + gapX + 40,
      height: seatH,
      text: 'PINTU BELAKANG',
      background: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0
    });
  }

  // Render boxes from backend config if they exist
  config.forEach(item => {
    if (item.type === 'box' && item.position && item.size) {
      // If we're using our custom 59-seat layout, skip backend boxes to avoid duplicates
      if (is59Layout) {
        const textUpper = (item.text || '').toUpperCase();
        if (textUpper === 'KEMUDI' || textUpper.includes('PINTU')) return;
      }
      
      shapes.push({
        id: `box-${item.text || shapes.length}`,
        type: 'box',
        x: item.position[0],
        y: item.position[1],
        width: item.size[0],
        height: item.size[1],
        text: item.text,
        background: item.background || '#fff',
        radius: item.radius || [0, 0, 0, 0]
      });
    }
  });

  const seatZones = config.filter(item => !item.type && item.col !== undefined && item.row !== undefined);
  seatZones.sort((a, b) => (b.starting_seat || 1) - (a.starting_seat || 1));

  if (is59Layout) {
    let seatLabels = [];
    if (seatZones.length > 0) {
      // Extract what seats SHOULD exist according to backend seatmap
      seatZones.forEach(zone => {
        const prefixTrimmed = (zone.prefix || '').trim();
        const startSeat = zone.starting_seat || 1;
        const totalCol = zone.col || 5;
        const totalRow = zone.row || 1;
        let seatIndex = 0;
        for (let r = 0; r < totalRow; r++) {
          for (let c = 0; c < totalCol; c++) {
            const seatNum = startSeat + seatIndex;
            seatLabels.push(`${prefixTrimmed}${seatNum}`);
            seatIndex++;
          }
        }
      });
    } else {
      // Fallback: Use total_seat
      const total = event.value?.total_seat || 59;
      for (let i = 1; i <= total; i++) {
        seatLabels.push(`A${i}`);
      }
    }

    // Remove duplicates and explicitly filter out A60
    seatLabels = [...new Set(seatLabels)].filter(label => label.toUpperCase() !== 'A60');

    // Generate seats using our custom standard grid layout for 59 seats
    seatLabels.forEach((label, idx) => {
      let x, y;
      let isStandard = true;
      const match = label.match(/^[A-Za-z]*(\d+)$/);
      
      if (match) {
        const num = parseInt(match[1], 10);
        if (num <= 50) {
          const sIdx = num - 1;
          const col = sIdx % 5;
          const row = Math.floor(sIdx / 5);
          if (col < 2) {
            x = areaX + col * (seatW + gapX);
          } else {
            x = areaX + 2 * (seatW + gapX) + gapAisle + (col - 2) * (seatW + gapX);
          }
          y = areaY + row * (seatH + gapX);
        } else if (num >= 51 && num <= 53) {
          const col = 2 + (num - 51);
          const row = 10;
          x = areaX + 2 * (seatW + gapX) + gapAisle + (col - 2) * (seatW + gapX);
          y = areaY + row * (seatH + gapX);
        } else if (num >= 54 && num <= 59) {
          const col = num - 54;
          const row = 11;
          const startX = areaX - 8;
          x = startX + col * (seatW + gapX);
          y = areaY + row * (seatH + gapX);
        } else {
          isStandard = false;
        }
      } else {
        isStandard = false;
      }

      if (!isStandard) {
        const totalCol = 5;
        const colsLeft = 2;
        const col = idx % totalCol;
        const row = Math.floor(idx / totalCol);
        if (col < colsLeft) {
          x = areaX + col * (seatW + gapX);
        } else {
          x = areaX + colsLeft * (seatW + gapX) + gapAisle + (col - colsLeft) * (seatW + gapX);
        }
        y = areaY + row * (seatH + gapX);
      }

      const isPP = selectedTripStatus.value?.id === 3;
      if (isPP) {
        if (ppStep.value === 1) {
          shapes.push({
            id: `${label}_1`,
            type: 'seat',
            x, y,
            width: seatW,
            height: seatH,
            label,
            typeId: 1
          });
        } else {
          shapes.push({
            id: `${label}_2`,
            type: 'seat',
            x: x + 6,
            y: y + 6,
            width: seatW,
            height: seatH,
            label,
            typeId: 2
          });
        }
      } else {
        shapes.push({
          id: label,
          type: 'seat',
          x, y,
          width: seatW,
          height: seatH,
          label
        });
      }
    });

  } else {
    // Normal generation for non-59 seat buses based on backend config
    if (seatZones.length > 0) {
      const placedLabels = new Set();
      
      seatZones.forEach(zone => {
        const prefixTrimmed = (zone.prefix || '').trim();
        const startSeat = zone.starting_seat || 1;
        const totalCol = zone.col || 5;
        const totalRow = zone.row || 1;
        const colsLeft = zone.cols_left ?? Math.floor(totalCol / 2);
        const zoneGapAisle = zone.gap ?? gapAisle;
        const zoneAreaX = zone.position?.[0] ?? areaX;
        const zoneAreaY = zone.position?.[1] ?? areaY;

        let calcW = seatW;
        let calcH = seatH;
        if (totalRow === 1) {
          const zoneW = zone.size?.[0];
          const zoneH = zone.size?.[1];
          if (zoneW && zoneW > 0 && totalCol > 0) {
            const neededW = totalCol * seatW + (totalCol - 1) * gapX;
            if (neededW > zoneW) {
              calcW = Math.max(16, Math.floor((zoneW - (totalCol - 1) * gapX) / totalCol));
            }
          }
          if (zoneH && zoneH > 0) {
            const neededH = totalRow * seatH + (totalRow - 1) * gapX;
            if (neededH > zoneH) {
              calcH = Math.max(16, Math.floor((zoneH - (totalRow - 1) * gapX) / totalRow));
            }
          }
          if (calcW < seatW || calcH < seatH) {
            const minDim = Math.min(calcW, calcH);
            calcW = minDim;
            calcH = minDim;
          }
        }

        let seatIndex = 0;
        for (let r = 0; r < totalRow; r++) {
          for (let c = 0; c < totalCol; c++) {
            const seatNum = startSeat + seatIndex;
            const label = `${prefixTrimmed}${seatNum}`;
            seatIndex++;

            if (placedLabels.has(label.toUpperCase())) continue;
            placedLabels.add(label.toUpperCase());

            let x;
            if (c < colsLeft) {
              x = zoneAreaX + c * (calcW + gapX);
            } else {
              x = zoneAreaX + colsLeft * (calcW + gapX) + zoneGapAisle + (c - colsLeft) * (calcW + gapX);
            }
            const y = zoneAreaY + r * (calcH + gapX);

            const isPP = selectedTripStatus.value?.id === 3;
            if (isPP) {
              if (ppStep.value === 1) {
                shapes.push({
                  id: `${label}_1`,
                  type: 'seat',
                  x, y,
                  width: calcW,
                  height: calcH,
                  label,
                  typeId: 1
                });
              } else {
                shapes.push({
                  id: `${label}_2`,
                  type: 'seat',
                  x: x + 6,
                  y: y + 6,
                  width: calcW,
                  height: calcH,
                  label,
                  typeId: 2
                });
              }
            } else {
              shapes.push({
                id: label,
                type: 'seat',
                x, y,
                width: calcW,
                height: calcH,
                label
              });
            }
          }
        }
      });
    } else {
      // Fallback: Generate exactly total_seat seats using a basic standard layout
      const total = event.value?.total_seat || 14;
      for (let i = 1; i <= total; i++) {
        const label = `A${i}`;
        const col = (i - 1) % 5;
        const row = Math.floor((i - 1) / 5);
        let x;
        if (col < 2) {
          x = areaX + col * (seatW + gapX);
        } else {
          x = areaX + 2 * (seatW + gapX) + gapAisle + (col - 2) * (seatW + gapX);
        }
        const y = areaY + row * (seatH + gapX);

        const isPP = selectedTripStatus.value?.id === 3;
        if (isPP) {
          if (ppStep.value === 1) {
            shapes.push({
              id: `${label}_1`,
              type: 'seat',
              x, y,
              width: seatW,
              height: seatH,
              label,
              typeId: 1
            });
          } else {
            shapes.push({
              id: `${label}_2`,
              type: 'seat',
              x: x + 6,
              y: y + 6,
              width: seatW,
              height: seatH,
              label,
              typeId: 2
            });
          }
        } else {
          shapes.push({
            id: label,
            type: 'seat',
            x, y,
            width: seatW,
            height: seatH,
            label
          });
        }
      }
    }
  }

  // Pre-calculate full Konva configs to prevent massive Vue re-renders on every zoom/drag event
  return shapes.map(shape => {
    if (shape.type === 'box') {
      return {
        ...shape,
        groupConfig: { x: shape.x, y: shape.y },
        rectConfig: {
          width: shape.width,
          height: shape.height,
          fill: shape.background,
          cornerRadius: 6,
          stroke: shape.stroke !== undefined ? shape.stroke : '#cbd5e1',
          strokeWidth: shape.strokeWidth !== undefined ? shape.strokeWidth : 1
        },
        textConfig: {
          text: shape.text,
          width: shape.width,
          height: shape.height,
          align: 'center',
          verticalAlign: 'middle',
          fontSize: 12,
          fontStyle: 'bold',
          fill: '#475569'
        }
      };
    } else {
      const available = isseatAvailable(shape.id);
      const selected = selectedseats.value.includes(shape.id);
      
      // Determine colors based on typeId (1=Pergi=blue, 2=Pulang=orange)
      let seatFill, seatStroke;
      if (!available) {
        seatFill = '#e2e8f0';
        seatStroke = '#cbd5e1';
      } else if (selected) {
        if (shape.typeId === 2) {
          seatFill = '#f97316';
          seatStroke = '#ea580c';
        } else if (shape.typeId === 1) {
          seatFill = '#3b82f6';
          seatStroke = '#2563eb';
        } else {
          seatFill = '#ef4444';
          seatStroke = '#ef4444';
        }
      } else {
        if (shape.typeId === 2) {
          seatFill = '#fff7ed';
          seatStroke = '#fdba74';
        } else if (shape.typeId === 1) {
          seatFill = '#eff6ff';
          seatStroke = '#93c5fd';
        } else {
          seatFill = '#fff';
          seatStroke = '#94a3b8';
        }
      }
      
      return {
        ...shape,
        available,
        groupConfig: { x: shape.x, y: shape.y },
        rectConfig: {
          width: shape.width - 4,
          height: shape.height - 4,
          x: 2,
          y: 2,
          fill: seatFill,
          cornerRadius: 8,
          stroke: seatStroke,
          strokeWidth: 2
        },
        textConfig: {
          text: !available ? '✕' : shape.label,
          width: shape.width,
          height: shape.height,
          align: 'center',
          verticalAlign: 'middle',
          fontSize: !available ? 14 : 12,
          fontStyle: 'bold',
          fill: !available ? '#94a3b8' : (selected ? '#fff' : '#0f172a')
        }
      };
    }
  });
});

const getFacilityIcon = (facility) => {
  const fac = facility.toLowerCase();
  if (fac.includes('ac')) return Wind;
  if (fac.includes('wifi')) return Wifi;
  if (fac.includes('usb') || fac.includes('charger')) return Zap;
  if (fac.includes('reclining') || fac.includes('seat')) return Sofa;
  if (fac.includes('toilet') || fac.includes('asuransi')) return ShieldCheck;
  return ShieldCheck;
};

// Trip Status
const tripStatusOptions = ref([]);
const selectedTripStatus = ref(null);

const fetchTicketTypes = async () => {
  try {
    const res = await fetch(import.meta.env.VITE_API_URL + '/api/shuttle-ticket-type');
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      tripStatusOptions.value = result.data;
      // Don't auto-select; user chooses trip type
    }
  } catch (e) {
    console.error('Gagal fetch ticket types:', e);
  }
};

watch(() => route.hash, (newHash) => {
  if (newHash === '#seatmap') {
    isCanvasOpen.value = true;
  } else {
    if (isCanvasOpen.value && !isSheetClosing.value && window.innerWidth <= 768) {
      // User pressed browser back button
      animatedCloseSheet();
    } else {
      isCanvasOpen.value = false;
    }
  }
}, { immediate: true });

// Clear trip type error when user selects a trip type
watch(selectedTripStatus, (val) => {
  if (val) {
    tripTypeError.value = '';
    selectedseatsMap.value = {}; // Reset seats
  }
});

watch(dateOptions, (newDates) => {
  if (newDates && newDates.length > 0) {
    if (!selectedDate.value || !newDates.some(d => String(d.id) === String(selectedDate.value))) {
      selectedDate.value = String(newDates[0].id);
    }
  }
}, { immediate: true });

watch(sessionOptions, (newSessions) => {
  if (newSessions && newSessions.length > 0) {
    const currentValid = newSessions.find(s => String(s.id) === String(selectedSesi.value));
    if (!currentValid || !currentValid.available) {
      const firstAvail = newSessions.find(s => s.available) || newSessions[0];
      if (firstAvail) {
        selectedSesi.value = String(firstAvail.id);
      }
    }
  }
}, { immediate: true });

const filteredTickets = computed(() => {
  if (!event.value) return [];
  
  if (event.value.operation_days && Array.isArray(event.value.operation_days) && event.value.operation_days.length > 0) {
    const currentOp = event.value.operation_days.find(op => String(op.operation_date) === String(selectedDate.value));
    if (!currentOp) return [];
    const currentSesiObj = currentOp.sessions?.find(s => String(s.id) === String(selectedSesi.value));
    if (!currentSesiObj || !currentSesiObj.tickets || !Array.isArray(currentSesiObj.tickets)) return [];
    
    return currentSesiObj.tickets.map(t => {
      const isSold = Boolean(t.status?.is_soldout);
      const isFull = Boolean(t.status?.is_fullbook);
      const isFin = Boolean(t.status?.is_finish);
      
      return {
        id: t.id,
        name: t.name || 'Tiket Shuttle',
        ticket_category: t.trip_status?.name ? `Shuttle (${t.trip_status.name})` : 'Regular Shuttle',
        description: t.description || (t.route ? `Rute: ${t.route.origin_name || ''} -> ${t.route.destination_name || ''} (${t.route.distance_km || ''} km)` : ''),
        price: parseInt(t.price || 0),
        ticket_fee: t.ticket_fee || 0,
        available_seat_number: t.available_seat_number || 'A1,A2,A3,A4,A5,B1,B2,B3,C1,C2,C3,D1,D2,E1,E2,E3',
        taken_seat_number: t.taken_seat_number || '',
        pending_seat_number: t.pending_seat_number || '',
        reserved_seat_number: t.reserved_seat_number || '',
        ticket_end: t.ticket_end_date ? String(t.ticket_end_date).split('T')[0] : '',
        ending_time: t.ticket_end_time || '',
        ticket_start_date: t.ticket_start_date ? String(t.ticket_start_date).split('T')[0] : '',
        ticket_start_time: t.ticket_start_time || '',
        total_seat: t.total_seat || 59,
        ticket_type_id: 1,
        route_id: t.route?.id || t.route_id || '',
        route: t.route,
        trip_status: t.trip_status,
        prices: t.prices || [],
        is_soldout: isSold,
        is_fullbook: isFull,
        is_finish: isFin
      };
    }).filter(t => {
      // 🔹 Filter: di sesi 4 day 1 hanya tampilkan ticket rute Sudirman → Ancol
      const firstDate = dateOptions.value[0]?.id;
      const isDay1 = firstDate && String(selectedDate.value) === String(firstDate);
      const currentSesi = sessionOptions.value.find(s => String(s.id) === String(selectedSesi.value));
      const isSesiPetang = currentSesi && (currentSesi.name || '').toLowerCase().includes('petang');
      
      if (isDay1 && isSesiPetang) {
        const origin = (t.route?.origin_name || '').toLowerCase();
        const dest = (t.route?.destination_name || '').toLowerCase();
        return origin.includes('sudirman') && dest.includes('ancol');
      }
      return true;
    });
  }
  
  if (event.value.has_event_ticket && Array.isArray(event.value.has_event_ticket)) {
    return event.value.has_event_ticket;
  }
  return [];
});

watch([isCanvasOpen, isSheetClosing], ([isOpen, isClosing]) => {
  const active = isOpen || isClosing;
  // On mobile: lock scroll on both html and body to prevent ANY page scroll
  if (window.innerWidth <= 768) {
    if (active) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.body.classList.add('lock-scroll');
      document.documentElement.classList.add('lock-scroll');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.classList.remove('lock-scroll');
      document.documentElement.classList.remove('lock-scroll');
    }
  } else {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.classList.remove('lock-scroll');
    document.documentElement.classList.remove('lock-scroll');
  }
});

const showTicketDrawer = ref(false);
const openTicketDrawer = () => {
  showTicketDrawer.value = true;
};

const selectTicketAndOpenSeatmap = (t) => {
  selectedTicket.value = t;
  showTicketDrawer.value = false;
  isCanvasOpen.value = true;
};

const activeRouteInfo = computed(() => {
  if (selectedTicket.value?.route) {
    return selectedTicket.value.route;
  }
  const firstTicket = filteredTickets.value[0];
  if (firstTicket?.route) {
    return firstTicket.route;
  }
  return {
    origin_name: 'Kemayoran',
    origin_address: 'Stasiun DAMRI Kemayoran Jln Angkasa no 17B',
    destination_name: event.value?.venue_name || 'Terminal Bungurasih',
    destination_address: event.value?.venue_address || 'Kasian, Jl. Bungurasih Timur No.31, Kasian...',
    distance_km: 10
  };
});

const routeDurationText = computed(() => {
  if (!event.value?.start_time || !event.value?.end_time) return '10j';
  const parseTime = (tStr) => {
    const parts = tStr.split(':');
    return parseInt(parts[0], 10) + (parseInt(parts[1], 10) || 0) / 60;
  };
  const start = parseTime(event.value.start_time);
  const end = parseTime(event.value.end_time);
  let diff = end - start;
  if (diff < 0) diff += 24;
  return `${Math.round(diff)}j`;
});

const routeDateText = computed(() => {
  if (!selectedDate.value) return '17 Agt';
  const parts = selectedDate.value.split('-');
  if (parts.length < 3) return '17 Agt';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${monthNames[mIdx]}`;
});

const formatIDR = (num) => {
  if (!num) return 'IDR 0';
  return 'IDR ' + num.toLocaleString('id-ID');
};

onMounted(async () => {
  bookingStore.isLoading = true;
  const slug = route.params.slug;

  let item = null;
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/shuttle/${slug}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        item = result.data;
      }
    }
  } catch (err) {
    console.warn('API fetch failed:', err);
  }

  if (!item) {
    bookingStore.isLoading = false;
    router.replace('/');
    return;
  }

  const dateObj = new Date(item.start_date || new Date());
  const day = dateObj.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  let seats = 50;
  try {
    if (item.seatmap) {
      const seatmap = typeof item.seatmap === 'string' ? JSON.parse(item.seatmap) : item.seatmap;
      if (Array.isArray(seatmap)) {
        seats = 59;
      } else if (seatmap.rows && seatmap.cols) {
        seats = seatmap.rows * seatmap.cols;
      }
    }
  } catch (e) {
    console.warn('Invalid seatmap JSON', e);
  }

  let mappedTickets = [];
  if (item.tickets && item.tickets.length > 0) {
    mappedTickets = item.tickets.map(t => {
      return {
        id: t.id,
        name: t.name,
        ticket_category: 'Regular Shuttle',
        description: t.description || '',
        price: parseInt(t.price || 0),
        available_seat_number: t.available_seat_number || '', 
        taken_seat_number: t.taken_seat_number || '',
        pending_seat_number: t.pending_seat_number || '',
        reserved_seat_number: t.reserved_seat_number || '',
        ticket_end: t.ticket_end_date ? String(t.ticket_end_date).split('T')[0] : '',
        ending_time: t.ticket_end_time || '',
        route_id: t.route_id || null,
        total_seat: t.total_seat || 0
      };
    });
  } else if (item.operation_days && item.operation_days.length > 0) {
    item.operation_days.forEach(op => {
      if (op.sessions && op.sessions.length > 0) {
        op.sessions.forEach(s => {
          if (s.tickets && s.tickets.length > 0) {
            s.tickets.forEach(t => {
              mappedTickets.push({
                id: t.id,
                name: t.name || 'Tiket Shuttle',
                ticket_category: t.trip_status?.name ? `Shuttle (${t.trip_status.name})` : 'Regular Shuttle',
                description: t.description || '',
                price: parseInt(t.price || 0),
                available_seat_number: t.available_seat_number || 'A1,A2,A3,A4,A5,B1,B2,B3,C1,C2,C3,D1,D2,E1,E2,E3',
                taken_seat_number: t.taken_seat_number || '',
                total_seat: t.total_seat || 59,
                ticket_type_id: 1
              });
            });
          }
        });
      }
    });
  }

  const fetchedEvent = {
    id: item.id,
    name: item.name || 'Unknown',
    slug: item.slug,
    bus_code: '-',
    bus_type: '',
    plate_number: '-',
    seat_layout: '',
    total_seat: seats,
    facilities: (() => {
      if (!item.facilities) {
        return ['Full AC', 'Charger USB', 'Reclining seat', 'Asuransi'];
      }
      if (Array.isArray(item.facilities)) {
        return item.facilities.length > 0 ? item.facilities : ['Full AC', 'Charger USB', 'Reclining seat', 'Asuransi'];
      }
      if (typeof item.facilities === 'string') {
        try {
          const parsed = JSON.parse(item.facilities);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          const split = item.facilities.split(',').map(f => f.trim()).filter(Boolean);
          if (split.length > 0) return split;
        }
      }
      return ['Full AC', 'Charger USB', 'Reclining seat', 'Asuransi'];
    })(),
    trip_id: item.trip_id || (item.trips && item.trips.length > 0 ? item.trips[0].id : ''),
    date: item.start_date ? item.start_date.split('T')[0] : '',
    start_date: item.start_date,
    end_date: item.end_date,
    start_time: item.start_time ? item.start_time.slice(0, 5) : '00:00',
    end_time: item.end_time ? item.end_time.slice(0, 5) : '00:00',
    zone_time: 'WIB',
    dateLabel: `${day} ${month} ${year}`,
    time: item.start_time ? item.start_time.slice(0, 5) + ' WIB' : '',
    departureTime: '',
    returnTime: '',
    location: item.description || '',
    city: 'Jakarta',
    price: mappedTickets.length > 0 ? `Rp ${mappedTickets[0].price.toLocaleString('id-ID')}` : 'Lihat Detail',
    priceNum: mappedTickets.length > 0 ? mappedTickets[0].price : 0,
    image: item.image_url || '/hiace.jpg',
    description: item.description || '',
    term_condition: item.terms || '',
    seats: seats,
    seatmap: item.seatmap,
    is_name: item.is_name,
    is_email: item.is_email,
    is_phone: item.is_phone,
    is_noidentity: item.is_noidentity,
    tag: 'Shuttle Bersama',
    operation_days: item.operation_days || [],
    has_event_ticket: mappedTickets,
    venue_name: item.venue_name,
    venue_address: item.venue_address,
    venue_map: item.venue_map
  };

  event.value = fetchedEvent;
  bookingStore.selectedEvent = fetchedEvent;
  if (fetchedEvent.has_event_ticket && fetchedEvent.has_event_ticket.length > 0) {
    expandedTicketId.value = fetchedEvent.has_event_ticket[0].id;
  }

  fetchTicketTypes();

  document.addEventListener('click', tryAutoplay);
  document.addEventListener('touchstart', tryAutoplay);

  window.addEventListener('scroll', handleScrollTabs, { passive: true });
  window.addEventListener('resize', updateMobileStatus);
  document.addEventListener('click', handleClickOutside);
  handleScrollTabs();

  setTimeout(() => {
    bookingStore.isLoading = false;
  }, 800);
});

onUnmounted(() => {
  document.removeEventListener('click', tryAutoplay);
  document.removeEventListener('touchstart', tryAutoplay);
  window.removeEventListener('scroll', handleScrollTabs);
  window.removeEventListener('resize', updateMobileStatus);
  document.removeEventListener('click', handleClickOutside);
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.body.style.touchAction = '';
  document.body.classList.remove('lock-scroll');
  document.documentElement.classList.remove('lock-scroll');
});

const getCalendarDateParts = (dateStr) => {
  if (!dateStr) return { dayName: 'Wed', dayNum: '30', monthName: 'Dec' };
  const parts = dateStr.split(' ');
  let dayName = parts[0] || '';
  const dayLower = dayName.toLowerCase();
  if (dayLower.startsWith('jum')) dayName = 'Jum';
  else if (dayLower.startsWith('sab')) dayName = 'Sab';
  else if (dayLower.startsWith('min')) dayName = 'Min';
  else if (dayLower.startsWith('sen')) dayName = 'Sen';
  else if (dayLower.startsWith('sel')) dayName = 'Sel';
  else if (dayLower.startsWith('rab')) dayName = 'Rab';
  else if (dayLower.startsWith('kam')) dayName = 'Kam';
  
  return {
    dayName: dayName,
    dayNum: parts[1] || '',
    monthName: parts[2] || ''
  };
};

const formatDateLabelLong = (dateStr) => {
  if (!dateStr) return '';
  const pureDate = dateStr.split('T')[0];
  const parts = pureDate.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthStr = months[monthNum - 1];
  
  return `${day} ${monthStr} ${year}`;
};

const formatRp = (num) => {
  if (!num) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
};

const formatEventDates = (evt) => {
  if (!evt || !evt.start_date) return evt.dateLabel || evt.date || 'TBA';

  const start = new Date(evt.start_date);
  const end = evt.end_date ? new Date(evt.end_date) : start;
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const month = monthNames[start.getMonth()];
  const year = start.getFullYear();

  if (diffDays <= 5) {
    let days = [];
    for (let i = 0; i < diffDays; i++) {
        let d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d.getDate());
    }
    if (days.length === 1) return `${days[0]} ${month} ${year}`;
    const last = days.pop();
    return `${days.join(', ')} dan ${last} ${month} ${year}`;
  } else {
    return `${start.getDate()}-${end.getDate()} ${month} ${year}`;
  }
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return '';
  // Split by 'T' and '-' to prevent JS Date UTC conversion from shifting the day
  const pureDate = dateStr.split('T')[0];
  const parts = pureDate.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const days = parseInt(parts[2], 10);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthStr = months[monthNum - 1];
  
  return `${days} ${monthStr} ${year}`;
};

const formatTimeLabel = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeStr;
};

const maxTickets = computed(() => {
  return event.value?.max_buy_ticket || 999;
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

const isseatAvailable = (seatId) => {
  if (!selectedTicket.value) return false;
  const avail = (selectedTicket.value.available_seat_number || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (avail.length === 0) return false;
  
  const id = seatId.toUpperCase();
  // Strip _1 or _2 suffix used for PP type differentiation
  const baseId = id.replace(/_(1|2)$/, '');
  
  // Check available_seat_number (plain seat names)
  if (!avail.includes(baseId)) return false;
  
  // Helper to check entries with prefix format: typeId:Seat
  const getRelevantPrefixes = (seatIdStr) => {
    if (seatIdStr.endsWith('_1')) {
      // PP step 1 (Pergi leg): entries with 1: or 3: block the seat
      return ['1', '3'];
    } else if (seatIdStr.endsWith('_2')) {
      // PP step 2 (Pulang leg): entries with 2: or 3: block the seat
      return ['2', '3'];
    } else {
      // Non-PP: use selectedTripStatus id
      if (!selectedTripStatus.value) return [];
      return [String(selectedTripStatus.value.id)];
    }
  };
  
  const relevantPrefixes = getRelevantPrefixes(id);
  
  // Check prefixed entries (taken/pending/reserved)
  const isBlocked = (entries) => {
    return entries.some(entry => {
      if (!entry) return false;
      const colonIdx = entry.indexOf(':');
      if (colonIdx === -1) {
        // Old format (just seat name) — block if matches
        return entry.toUpperCase() === baseId;
      }
      const prefix = entry.substring(0, colonIdx).trim();
      const seat = entry.substring(colonIdx + 1).trim().toUpperCase();
      return seat === baseId && relevantPrefixes.includes(prefix);
    });
  };
  
  const taken = (selectedTicket.value.taken_seat_number || '').split(',').map(s => s.trim()).filter(Boolean);
  const pending = (selectedTicket.value.pending_seat_number || '').split(',').map(s => s.trim()).filter(Boolean);
  const reserved = (selectedTicket.value.reserved_seat_number || '').split(',').map(s => s.trim()).filter(Boolean);
  
  return !isBlocked(taken) && !isBlocked(pending) && !isBlocked(reserved);
};

const hasAvailableseats = (t) => {
  if (!t) return false;
  
  if (t.ticket_start_date) {
    const timeStr = t.ticket_start_time || '00:00:00';
    const [year, month, day] = t.ticket_start_date.split('-').map(Number);
    const [hour, minute, second] = timeStr.split(':').map(Number);
    const startDate = new Date(year, month - 1, day, hour, minute || 0, second || 0);
    
    if (new Date() < startDate) {
      return false; // Not available yet
    }
  }
  
  if (t.is_soldout || t.is_fullbook || t.is_finish) return false;
  if (t.status?.is_soldout || t.status?.is_fullbook || t.status?.is_finish) return false;
  
  if (t.ticket_type_id === 0) return true;
  if (!t.available_seat_number) return true;
  return t.available_seat_number.split(',').map(s => s.trim()).filter(Boolean).length > 0;
};

const getTicketStatus = (t) => {
  if (t.is_soldout) return 'TIKET HABIS';
  if (t.is_fullbook) return 'FULL BOOKED';
  if (t.is_finish) return 'PENJUALAN SELESAI';
  
  if (t.ticket_start_date) {
    const timeStr = t.ticket_start_time || '00:00:00';
    const [year, month, day] = t.ticket_start_date.split('-').map(Number);
    const [hour, minute, second] = timeStr.split(':').map(Number);
    const startDate = new Date(year, month - 1, day, hour, minute || 0, second || 0);
    
    if (new Date() < startDate) {
      return 'PENJUALAN DIMULAI PADA ' + formatDateLabelLong(t.ticket_start_date);
    }
  }
  
  // Show route name instead of 'PENJUALAN BERLANGSUNG'
  if (hasAvailableseats(t)) {
    if (t.route) {
      return `${t.route.origin_name} → ${t.route.destination_name}`;
    }
    return 'Tiket Tersedia';
  }
  return 'TIKET HABIS';
};

const getTicketStatusClass = (t) => {
  if (t.ticket_start_date) {
    const timeStr = t.ticket_start_time || '00:00:00';
    const [year, month, day] = t.ticket_start_date.split('-').map(Number);
    const [hour, minute, second] = timeStr.split(':').map(Number);
    const startDate = new Date(year, month - 1, day, hour, minute || 0, second || 0);
    
    if (new Date() < startDate) {
      return 'not-started';
    }
  }

  if (t.is_soldout || t.is_fullbook || t.is_finish || !hasAvailableseats(t)) return 'sold-out';
  return '';
};

const selectTicketCategory = (t) => {
  // Jika belum pilih jenis trip, tampilkan notif dan expand accordion
  if (!selectedTripStatus.value) {
    tripTypeError.value = 'Silakan pilih jenis trip terlebih dahulu';
    selectedTicket.value = t;
    expandedTicketId.value = t.id;
    // Scroll ke elemen dropdown trip status
    nextTick(() => {
      const el = document.querySelector('.trip-status-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return;
  }
  tripTypeError.value = '';
  selectedTicket.value = t;
  errors.value.seats = '';
  isEditMode.value = false;
  ppStep.value = 1;
  
  if (t.ticket_type_id === 0) {
    goToBuyerDetails();
  } else {
    // Save scroll so back button can restore it
    sessionStorage.setItem('booking_scroll_y', String(window.scrollY));
    router.push({ hash: '#seatmap' });
  }
};

const toggleTicketAccordion = (ticketId) => {
  if (expandedTicketId.value === ticketId) {
    expandedTicketId.value = null;
  } else {
    expandedTicketId.value = ticketId;
  }
};

const clearSelectedTicket = () => {
  const savedY = sessionStorage.getItem('booking_scroll_y');
  if (route.hash === '#seatmap') {
    // On mobile: animate out first, then navigate back after animation
    if (window.innerWidth <= 768) {
      isSheetClosing.value = true;
      setTimeout(() => {
        isSheetClosing.value = false;
        router.back();
        if (savedY !== null) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: Number(savedY), behavior: 'instant' });
          });
        }
      }, SHEET_CLOSE_DURATION);
    } else {
      router.back();
      if (savedY !== null) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: Number(savedY), behavior: 'instant' });
        });
      }
    }
  } else {
    if (window.innerWidth <= 768) {
      animatedCloseSheet();
    } else {
      isCanvasOpen.value = false;
    }
    if (savedY !== null) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(savedY), behavior: 'instant' });
      });
    }
  }
  errors.value.seats = '';
  ppStep.value = 1;
};

const clearSelectedseats = () => {
  const key = currentSelectionKey.value;
  if (key) {
    selectedseatsMap.value[key] = [];
  }
  errors.value.seats = '';
};

const deleteTicketSelectionByKey = (key) => {
  selectedseatsMap.value[key] = [];
  validateseats();
};

const handleEditseats = () => {
  router.push({ hash: '#seatmap' });
  setTimeout(() => {
    const el = document.querySelector('.bus-cabin-canvas-viewport');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
};

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

const deleteTicketSelection = () => {
  selectedTicket.value = null;
  selectedseats.value = [];
  isEditMode.value = false;
  errors.value.seats = '';
  showMobileDetailSheet.value = false;
  if (route.hash === '#seatmap') {
    router.back();
  } else {
    isCanvasOpen.value = false;
  }
};

const scrollToTickets = () => {
  const el = document.querySelector('.tickets-container-list');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  } else {
    if (event.value?.has_event_ticket?.length > 0) {
      selectTicketCategory(event.value.has_event_ticket[0]);
    }
  }
};

const goToPpStep2 = () => {
  if (ppPergiSelectedCount.value === 0) {
    errors.value.seats = 'Pilih minimal 1 seat Pergi terlebih dahulu';
    return;
  }
  errors.value.seats = '';
  ppStep.value = 2;
};

const goToPpStep1 = () => {
  ppStep.value = 1;
};

const goToBuyerDetails = () => {
  validateseats();
  // For PP, ensure both Pergi and Pulang seats are selected
  if (isPP.value) {
    const hasPergi = selectedseats.value.some(s => s.endsWith('_1'));
    const hasPulang = selectedseats.value.some(s => s.endsWith('_2'));
    if (!hasPergi || !hasPulang) {
      errors.value.seats = 'Pilih seat Pergi dan Pulang terlebih dahulu';
      return;
    }
  }
  if (!errors.value.seats) {
    // Populate bookingStore with event, ticket, seats, and quantity
    bookingStore.selectedEvent = event.value;
    bookingStore.selectedTicket = selectedTicket.value;
    bookingStore.selectedseats = [...mergedSelectedseats.value];
    bookingStore.adults = totalSelectedTicketsCount.value;
    bookingStore.toddlers = 0;
    bookingStore.selectedTripStatus = selectedTripStatus.value;
    bookingStore.selectedDate = selectedDate.value;
    bookingStore.selectedSessionId = selectedSesi.value;
    bookingStore.selectedRouteId = selectedTicket.value?.route_id || null;
    bookingStore.selectedPrice = getEffectivePrice(selectedTicket.value);
    
    // Direct user to transaction page
    router.push('/transaksi');
  }
};

const goBackToStep1 = () => {
  // Preserve current scroll position so page doesn't jump to top
  const scrollY = window.scrollY;
  currentStep.value = 1;
  // Restore scroll position after Vue re-renders the step
  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollY, behavior: 'instant' });
  });
};

const isFormValid = computed(() => {
  const isNameValid = !event.value?.is_name || (buyer.value.name.trim().length >= 3 && !errors.value.name);
  const isEmailValid = !event.value?.is_email || (buyer.value.email.trim().length > 0 && !errors.value.email);
  const isPhoneValid = !event.value?.is_phone || (buyer.value.phone.trim().length >= 8 && !errors.value.phone);
  const isIdentityValid = !event.value?.is_noidentity || (buyer.value.identity.trim().length >= 3 && !errors.value.identity);
  return isNameValid && isEmailValid && isPhoneValid && isIdentityValid;
});

const increaseQuantity = () => {
  if (quantity.value < maxTickets.value) {
    quantity.value++;
    validateseats();
  }
};

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
    const key = currentSelectionKey.value;
    if (key && selectedseatsMap.value[key] && selectedseatsMap.value[key].length > quantity.value) {
      selectedseatsMap.value[key] = selectedseatsMap.value[key].slice(0, quantity.value);
    }
    validateseats();
  }
};

const toggleseatSelection = (seatId) => {
  if (!isseatAvailable(seatId)) return;
  const key = currentSelectionKey.value;
  if (!key) return;
  
  // Ensure the key exists in the map as a reactive array
  if (!selectedseatsMap.value[key]) {
    selectedseatsMap.value[key] = [];
  }
  
  const seats = selectedseatsMap.value[key];
  const index = seats.indexOf(seatId);
  
  if (index !== -1) {
    // Deselect — create a new array to trigger reactivity
    selectedseatsMap.value[key] = seats.filter(s => s !== seatId);
  } else {
    if (seats.length >= maxTickets.value) {
      // Drop the oldest selection and add the new one
      selectedseatsMap.value[key] = [...seats.slice(1), seatId];
    } else {
      selectedseatsMap.value[key] = [...seats, seatId];
    }
  }
  
  if (selectedTicket.value?.ticket_type_id !== 0) {
    quantity.value = Math.max(1, selectedseatsMap.value[key].length);
  }
  
  validateseats();
};

const validateName = () => {
  if (!event.value?.is_name) { errors.value.name = ''; return; }
  const val = buyer.value.name.trim();
  if (!val) {
    errors.value.name = 'Nama lengkap wajib diisi.';
  } else if (val.length < 3) {
    errors.value.name = 'Nama terlalu pendek. Minimal 3 karakter.';
  } else {
    errors.value.name = '';
  }
};

const validateEmail = () => {
  if (!event.value?.is_email) { errors.value.email = ''; return; }
  const val = buyer.value.email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!val) {
    errors.value.email = 'Email wajib diisi.';
  } else if (!emailRegex.test(val)) {
    errors.value.email = 'Format email tidak valid.';
  } else {
    errors.value.email = '';
  }
};

const validatePhone = () => {
  if (!event.value?.is_phone) { errors.value.phone = ''; return; }
  const val = buyer.value.phone.trim();
  if (!val) {
    errors.value.phone = 'Nomor telepon wajib diisi.';
  } else if (val.startsWith('0')) {
    errors.value.phone = 'Nomor telepon tidak boleh diawali angka 0. Mulai dengan angka 8.';
  } else if (!/^\d+$/.test(val)) {
    errors.value.phone = 'Nomor telepon hanya boleh berisi angka.';
  } else if (val.length < 8 || val.length > 13) {
    errors.value.phone = 'Nomor telepon harus antara 8-13 digit.';
  } else {
    errors.value.phone = '';
  }
};

const validateIdentity = () => {
  if (!event.value?.is_noidentity) { errors.value.identity = ''; return; }
  const val = buyer.value.identity.trim();
  if (!val) {
    errors.value.identity = 'Nomor identitas wajib diisi.';
  } else {
    errors.value.identity = '';
  }
};

const validateseats = () => {
  errors.value.seats = '';
};

const isSelectionComplete = computed(() => {
  const isNameValid = !event.value?.is_name || (buyer.value.name.trim().length >= 3);
  const isEmailValid = !event.value?.is_email || (buyer.value.email.trim().length > 0);
  const isPhoneValid = !event.value?.is_phone || (buyer.value.phone.trim().length >= 8);
  const isIdentityValid = !event.value?.is_noidentity || (buyer.value.identity.trim().length >= 3);
  
  return totalSelectedTicketsCount.value > 0 &&
         isNameValid &&
         isEmailValid &&
         isPhoneValid &&
         isIdentityValid;
});

const goBack = () => {
  router.back();
};

const handleBeliTiketClick = () => {
  if (activeTab.value !== 'tiket') {
    activeTab.value = 'tiket';
  } else {
    if (!selectedTicket.value) {
      if (filteredTickets.value.length > 0) {
        toggleSeatmapCanvas(filteredTickets.value[0]);
      } else {
        alert("Silakan pilih tiket terlebih dahulu.");
      }
    } else if (selectedseats.value.length === 0) {
      toggleSeatmapCanvas(selectedTicket.value);
    } else {
      goToBuyerDetails();
    }
  }
};

const openChat = () => {
  alert('Fitur Chat dengan Penyelenggara segera hadir!');
};

const handleProceedToCheckout = () => {
  validateName();
  validateEmail();
  validatePhone();
  validateIdentity();
  validateseats();

  if (isSelectionComplete.value && !errors.value.name && !errors.value.email && !errors.value.phone && !errors.value.identity && !errors.value.seats) {
    // Save to bookingStore and go directly to confirmation/transaction page
    bookingStore.customer = {
      name: buyer.value.name,
      email: buyer.value.email,
      phone: buyer.value.phone,
      identity: buyer.value.identity
    };
    bookingStore.adults = totalSelectedTicketsCount.value;
    bookingStore.toddlers = 0;
    bookingStore.selectedseats = [...mergedSelectedseats.value];
    bookingStore.selectedTicket = allSelectedTickets.value[0]?.ticket || selectedTicket.value;
    bookingStore.selectedPickup = {
      name: 'Venue Acara (' + event.value.location_name + ')',
      address: event.value.location_address || event.value.location_name
    };
    bookingStore.selectedTripStatus = selectedTripStatus.value;
    bookingStore.selectedDate = selectedDate.value;
    bookingStore.selectedSessionId = selectedSesi.value;
    bookingStore.selectedRouteId = selectedTicket.value?.route_id || null;

    const code = bookingStore.generateBookingCode();
    const payload = {
      code,
      date: new Date().toISOString(),
      event: event.value,
      pickup: bookingStore.selectedPickup,
      customer: { ...bookingStore.customer },
      adults: bookingStore.adults,
      selectedseats: [...bookingStore.selectedseats],
      totalPrice: totalSelectedTicketsPrice.value,
      paymentMethod: 'QRIS',
      shuttle_route_id: bookingStore.selectedTicket?.shuttle_route_id || null
    };

    let existing = [];
    try {
      const cached = localStorage.getItem('ajak_bookings');
      if (cached) existing = JSON.parse(cached);
    } catch(e) {}
    existing.push(payload);
    localStorage.setItem('ajak_bookings', JSON.stringify(existing));

    router.push('/confirmation');
  }
};

const confirmBooking = () => {
  if (!selectedPayment.value) {
    alert('Pilih metode pembayaran terlebih dahulu');
    return;
  }

  // Save to bookingStore
  bookingStore.customer = {
    name: buyer.value.name,
    email: buyer.value.email,
    phone: buyer.value.phone
  };
  bookingStore.adults = totalSelectedTicketsCount.value;
  bookingStore.toddlers = 0;
  bookingStore.selectedseats = [...mergedSelectedseats.value];
  bookingStore.selectedPickup = { 
    name: 'Venue Acara (' + event.value.location_name + ')', 
    address: event.value.location_address || event.value.location_name
  };

  const code = bookingStore.generateBookingCode();
  const payload = {
    code,
    date: new Date().toISOString(),
    event: event.value,
    pickup: bookingStore.selectedPickup,
    customer: { ...bookingStore.customer },
    adults: bookingStore.adults,
    selectedseats: [...bookingStore.selectedseats],
    totalPrice: totalSelectedTicketsPrice.value,
    paymentMethod: selectedPayment.value,
    shuttle_route_id: bookingStore.selectedTicket?.shuttle_route_id || null
  };

  let existing = [];
  try {
    const cached = localStorage.getItem('ajak_bookings');
    if (cached) existing = JSON.parse(cached);
  } catch(e) {}
  existing.push(payload);
  localStorage.setItem('ajak_bookings', JSON.stringify(existing));

  showPaymentModal.value = false;
  router.push('/confirmation');
};

// YouTube Music Player
const isMuted = ref(false);
const youtubeIframeRef = ref(null);

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  const iframe = youtubeIframeRef.value;
  if (!iframe) return;
  // Use YouTube IFrame API postMessage — music keeps playing, no reload
  const command = isMuted.value ? 'mute' : 'unMute';
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func: command, args: [] }),
    '*'
  );
};

const tryAutoplay = () => {
  const iframe = youtubeIframeRef.value;
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      '*'
    );
    const command = isMuted.value ? 'mute' : 'unMute';
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }),
      '*'
    );
  }
  document.removeEventListener('click', tryAutoplay);
  document.removeEventListener('touchstart', tryAutoplay);
};
</script>

<template>
  <div class="event-detail-page" v-if="event">
    
    <!-- MOBILE REDESIGN VIEW (Visible on mobile only when currentStep === 1) -->
    <div v-if="isMobile && currentStep === 1" class="mobile-redesign-layout">
      <!-- Header Banner Image & Back Button overlay -->
      <div class="mobile-header-banner">
        <button class="mobile-back-circle-btn" @click="goBack" aria-label="Back">
          <ChevronLeft :size="24" />
        </button>
        <img :src="event.image" :alt="event.name" class="mobile-banner-img" />
      </div>

      <!-- Thumbnails Gallery -->
      <div class="mobile-gallery-row">
        <img :src="event.image" class="gallery-thumb" />
        <img src="/bus_parkir2.png" class="gallery-thumb" />
        <div class="gallery-thumb last-thumb">
          <img src="/bus_parkir3.png" />
          <div class="thumb-overlay">+5 lainnya</div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="mobile-tabs-container">
        <button 
          class="mobile-tab-btn" 
          :class="{ active: activeTab === 'deskripsi' }" 
          @click="activeTab = 'deskripsi'"
        >
          Deskripsi
        </button>
        <button 
          class="mobile-tab-btn" 
          :class="{ active: activeTab === 'tiket' }" 
          @click="activeTab = 'tiket'"
        >
          Tiket
        </button>
        <button 
          class="mobile-tab-btn" 
          :class="{ active: activeTab === 'terms' }" 
          @click="activeTab = 'terms'"
        >
          Syarat &amp; Ketentuan
        </button>
      </div>

      <!-- Mobile Tab Content -->
      <div class="mobile-tab-body">
        <!-- Deskripsi Tab Content (Mockup Layout) -->
        <div v-if="activeTab === 'deskripsi'" class="mobile-tab-detail-content" style="padding-bottom: 24px;">
          <!-- Title & Subtitle Section -->
          <div class="mobile-title-section">
            <div class="title-header-wrapper">
              <h2 class="mobile-bus-name">{{ event.name }}</h2>
              <svg class="verified-icon-only" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <p class="mobile-bus-type">{{ event.tag || 'Business' }}</p>
          </div>

          <!-- New Event Info Card -->
          <div class="mobile-event-info-card">
            <div class="info-row">
              <Calendar :size="20" class="info-icon" />
              <span class="info-value">{{ formatEventDates(event) }}</span>
            </div>
            <div class="info-row">
              <Clock :size="20" class="info-icon" />
              <span class="info-value">{{ event.start_time }} - {{ event.end_time }} {{ event.zone_time || 'WIB' }}</span>
            </div>
            <div class="info-row">
              <MapPin :size="20" class="info-icon" />
              <div class="info-value-col">
                <span class="venue-title">{{ event.venue_name || event.location_name || 'Lokasi Keberangkatan' }}</span>
                <span class="venue-addr" v-if="event.venue_address || event.location_address">
                  {{ event.venue_address || event.location_address }}
                </span>
              </div>
            </div>
            
            <div class="info-card-divider"></div>
            
            <div class="organizer-row">
              <img 
                :src="event.has_creator?.image_url || '/AJAKLogo/LOGO.png'" 
                class="organizer-logo" 
              />
              <div class="organizer-details">
                <span class="organizer-label">Diselenggarakan Oleh</span>
                <div class="organizer-name-wrapper">
                  <span class="organizer-name">{{ event.has_creator?.name || 'AJAK!' }}</span>
                  <svg class="organizer-verified-badge" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Description Section (original event description) -->
          <div class="mobile-description-section" v-if="event.description">
            <h3 class="section-title">Deskripsi Acara</h3>
            <div v-html="event.description" class="rich-html-content"></div>
          </div>

          <!-- Red Alert Banner (Below Description Card, themed to website's red) -->
          <div class="red-alert-banner">
            <Sofa :size="18" class="red-alert-icon" />
            <span>Kamu bisa pilih kursi di halaman selanjutnya.</span>
          </div>
        </div>

        <!-- Tiket Tab Content (Original booking mechanics inline) -->
        <div v-else-if="activeTab === 'tiket'" class="mobile-tab-tickets-content" style="padding: 16px 16px 32px;">
          <!-- Hari & Sesi Section -->
          <div class="outer-section-group filters-group mobile-filters-card" style="background: #ffffff; border-radius: 16px; padding: 18px 16px; border: 1px solid #edf2f7; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            <h3 class="outer-section-title" style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.2px;">Hari &amp; Sesi</h3>
            
            <!-- Date slider -->
            <div class="date-slider-container" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
              <div class="date-slider-scroll" @wheel="handleWheelScroll" style="display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; flex-grow: 1;">
                <button 
                  v-for="d in dateOptions" 
                  :key="d.id"
                  class="date-slider-item"
                  :class="{ 
                    active: selectedDate === d.id,
                    disabled: d.enabled === false
                  }"
                  :disabled="d.enabled === false"
                  @click="d.enabled !== false ? selectedDate = d.id : null"
                >
                  <span class="date-slider-day">{{ d.shortDay }}</span>
                  <span class="date-slider-val">{{ d.shortDate }}</span>
                </button>
              </div>
              <div class="date-slider-divider" style="width: 1px; height: 32px; background: #e2e8f0; margin: 0 8px;"></div>
              <div class="calendar-btn-wrapper" ref="calendarBtnWrapperRef" style="position: relative;">
                <button class="date-slider-calendar-btn" aria-label="Pilih Tanggal" @click="toggleCalendarPopup" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                  <Calendar :size="18" />
                </button>
                <transition name="fade-in-scale">
                  <div v-if="showCalendarPopup" class="mini-calendar-popup" style="position: absolute; right: 0; bottom: 44px; z-index: 100; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 250px;">
                    <div class="mini-cal-header" style="text-align: center; font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
                      <span class="mini-cal-month">{{ calendarMonthYear }}</span>
                    </div>
                    <div class="mini-cal-weekdays" style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 0.65rem; color: #64748b; font-weight: 700; margin-bottom: 6px;">
                      <span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span>
                    </div>
                    <div class="mini-cal-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                      <button 
                        v-for="day in juneDays" 
                        :key="day.num"
                        class="mini-cal-day-btn"
                        :class="{ 
                          'is-concert': day.isConcert, 
                          'active': selectedDate === day.concertId,
                          'disabled': !day.isConcert 
                        }"
                        :disabled="!day.isConcert"
                        @click="selectDateFromCalendar(day.concertId)"
                        style="height: 28px; width: 28px; border-radius: 50%; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; border: none; background: transparent;"
                      >
                        {{ day.num }}
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- Session selection pills -->
            <div class="session-section-wrapper" v-if="sessionOptions.length > 0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
              <div class="session-pills-row" @wheel="handleWheelScroll" style="display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none;">
                <button 
                  v-for="s in sessionOptions" 
                  :key="s.id"
                  class="session-pill-btn"
                  :class="{ 
                    active: selectedSesi === s.id && s.available, 
                    'unavailable-session': !s.available 
                  }"
                  :disabled="!s.available"
                  @click="s.available ? selectedSesi = s.id : null"
                >
                  <div class="session-pill-inner">
                    <span class="session-pill-name">{{ s.name }}</span>
                    <span class="session-pill-time">{{ s.departureTime }}</span>
                    <span v-if="!s.available" class="session-pill-status" style="font-size: 0.55rem; font-weight: 700; color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 2px 4px; border-radius: 4px; display: inline-block; margin-top: 2px;">TIDAK TERSEDIA</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Seating and categories list (vouchers) -->
          <div class="outer-section-group" style="background: #ffffff; border-radius: 16px; padding: 18px 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            <h3 class="outer-section-title" style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; letter-spacing: -0.2px;">Pilih Kursi</h3>
            <div class="tickets-list-wrapper" style="display: flex; flex-direction: column; gap: 16px;">
              <div 
                v-for="t in filteredTickets" 
                :key="t.id" 
                class="ticket-card-voucher"
                :id="selectedTicket?.id === t.id ? 'seatmap' : null"
                :class="{ selected: selectedTicket?.id === t.id && isCanvasOpen }"
              >
                <!-- Side notches -->
                <div class="ticket-side-notch-left"></div>
                <div class="ticket-side-notch-right"></div>
                
                <!-- Teleport seatmap (Teleport to body on mobile) -->
                <Teleport :disabled="!isMobile" v-if="(selectedTicket?.id === t.id && isCanvasOpen) || isSheetClosing" to="body">
                  <div v-if="isMobile" class="mobile-seatmap-backdrop" :class="{ 'is-closing': isSheetClosing }" @click="clearSelectedTicket" @touchmove.prevent></div>
                  <div class="selected-seatmap-canvas-container" :class="{ 'is-closing': isSheetClosing }" :style="{ transform: `translateY(${sheetDragDeltaY}px)`, transition: isSheetDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }" @click.stop>
                    <!-- Drag handle -->
                    <div class="sheet-drag-handle-area" @touchstart.stop="onSheetDragStart" @touchmove.stop="onSheetDragMove" @touchend.stop="onSheetDragEnd" @mousedown.stop="onSheetDragStart" @mousemove.stop="onSheetDragMove" @mouseup.stop="onSheetDragEnd">
                      <div class="sheet-drag-handle-pill"></div>
                    </div>
                    
                    <!-- Inner card body (seating selector canvas) -->
                    <div class="sheet-inner-card">
                      <div class="mobile-seatmap-header" @touchstart.stop @mousedown.stop>
                        <button type="button" class="btn-close-seatmap-mobile" @click.stop="clearSelectedTicket">✕</button>
                        <h3 class="mobile-seatmap-header-title">Pilih seat</h3>
                      </div>
                      <div class="seatmap-canvas-header">
                        <div class="seatmap-canvas-title-group">
                          <span class="seatmap-canvas-badge" :style="{ backgroundColor: t.seat_color || 'var(--primary)' }">
                            {{ selectedTripStatus?.name || t.trip_status?.name || 'Pergi' }}
                          </span>
                          <h3 class="seatmap-canvas-ticket-name">{{ t.name }}</h3>
                        </div>
                        <button type="button" class="btn-back-to-tickets" @click="clearSelectedTicket">Kembali</button>
                      </div>
                      
                      <!-- Seating canvas & Konva Stage -->
                      <div class="seatmap-canvas-body">
                        <div class="bus-cabin-canvas-viewport" :class="{ 'is-fullscreen-mode': isFullscreen }" @wheel.prevent="onWheel">
                          <div class="mobile-legends-overlay" @touchstart.stop>
                            <div class="legend-item"><span class="legend-box selected"></span><span>Dipilih</span></div>
                            <div class="legend-item"><span class="legend-box available"></span><span>Tersedia</span></div>
                            <div class="legend-item"><span class="legend-box occupied"></span><span>Tidak Tersedia</span></div>
                          </div>
                          <div class="mobile-zoom-controls-overlay" @touchstart.stop>
                            <button type="button" class="m-zoom-btn" @click="isFullscreen = !isFullscreen">🔍</button>
                            <button type="button" class="m-zoom-btn" @click="zoomIn">➕</button>
                            <button type="button" class="m-zoom-btn" @click="zoomOut">➖</button>
                          </div>
                          
                          <div class="bus-cabin-container konva-container" style="width: 100%; height: 100%; overflow: hidden; background: #f8fafc; border-radius: 12px; position: relative; z-index: 1;">
                            <v-stage :config="{ width: 800, height: 600, draggable: isStageDraggable, scaleX: zoom, scaleY: zoom }" @wheel="onWheel" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
                              <v-layer>
                                <v-group :config="{ x: 400, y: 100 }">
                                  <template v-for="shape in parsedseatmap" :key="shape.id">
                                    <v-group v-if="shape.type === 'box'" :config="shape.groupConfig">
                                      <v-rect :config="shape.rectConfig" />
                                      <v-text :config="shape.textConfig" />
                                    </v-group>
                                    <v-group v-else-if="shape.type === 'seat'" :config="shape.groupConfig" @click="shape.available ? toggleseatSelection(shape.id) : null" @tap="shape.available ? toggleseatSelection(shape.id) : null">
                                      <v-rect :config="shape.rectConfig" />
                                      <v-text :config="shape.textConfig" />
                                    </v-group>
                                  </template>
                                </v-group>
                              </v-layer>
                            </v-stage>
                          </div>
                        </div>
                        
                        <div v-if="isMobile && !isPP" class="canvas-bottom-action-bar">
                          <div class="canvas-bottom-left">
                            <span class="canvas-bottom-label">Total {{ selectedseats.length }} Seat</span>
                            <span class="canvas-bottom-total-price">{{ formatRp(getEffectivePrice(t) * (selectedseats.length || 1)) }}</span>
                          </div>
                          <button type="button" class="btn-canvas-pembayaran" :disabled="selectedseats.length === 0" @click="goToBuyerDetails()">Lanjut Pembayaran</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Teleport>

                <!-- Ticket Info (Visible card) -->
                <div class="ticket-header-row" @click="toggleTicketExpanded(t.id)">
                  <div class="ticket-header-left">
                    <div class="ticket-badge-category" :style="{ backgroundColor: t.seat_color || 'var(--primary)' }">
                      {{ t.ticket_category }}
                    </div>
                    <h4 class="ticket-title-main">{{ t.name }}</h4>
                    <p class="ticket-route-desc" v-if="t.description">{{ t.description }}</p>
                  </div>
                  <div class="ticket-header-right">
                    <div class="ticket-price-badge">
                      <template v-if="!selectedTripStatus">{{ formatRp(t.price) }}</template>
                      <template v-else>{{ formatRp(getEffectivePrice(t)) }}</template>
                    </div>
                    <div class="accordion-chevron" :class="{ rotated: expandedTicketId === t.id }">
                      <ChevronDown :size="16" />
                    </div>
                  </div>
                </div>

                <!-- Expanded Dropdowns -->
                <transition name="expand">
                  <div v-if="expandedTicketId === t.id" class="ticket-expanded-details">
                    <div class="accordion-section-divider"></div>
                    <div class="trip-status-section">
                      <span class="detail-col-label">Pilih Jenis Seat</span>
                      <div class="trip-status-dropdown-wrapper">
                        <select v-model="selectedTripStatus" class="trip-status-select" :class="{ 'trip-status-select-error': tripTypeError }" @change="bookingStore.selectedTripStatus = selectedTripStatus">
                          <option :value="null" disabled>Pilih jenis seat</option>
                          <option v-for="ts in tripStatusOptions" :key="ts.id" :value="ts">{{ ts.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div class="accordion-section-divider"></div>
                    <div class="ticket-facilities-section">
                      <span class="detail-col-label">Fasilitas Shuttle</span>
                      <div class="facilities-simple-list">
                        <div v-for="fac in event?.facilities || []" :key="fac" class="facility-simple-item">
                          <component :is="getFacilityIcon(fac)" :size="16" class="facility-icon-red" />
                          <span class="facility-text">{{ fac }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
                
                <div class="ticket-divider-row">
                  <div class="ticket-card-divider-dashed-line"></div>
                </div>
                
                <div class="ticket-bottom-section">
                  <div class="ticket-bottom-footer-row">
                    <div class="ticket-ending-details">
                      <span class="ending-label">{{ getTicketStatusClass(t) === 'not-started' ? 'PENJUALAN DIMULAI PADA' : 'BERAKHIR PADA' }}</span>
                      <span class="ending-value">
                        <template v-if="getTicketStatusClass(t) === 'not-started'">
                          {{ formatDateLabelLong(t.ticket_start_date) }}, <span class="countdown-text">{{ t.ticket_start_time }} WIB</span>
                        </template>
                        <template v-else>
                          {{ formatDateLabelLong(t.ticket_end) }}, <span class="countdown-text">{{ t.ending_time }} WIB</span>
                        </template>
                      </span>
                    </div>
                    <div class="ticket-footer-vertical-divider"></div>
                    <div class="ticket-action-select-btn-only">
                      <button 
                        class="select-ticket-btn" 
                        :class="{ selected: selectedTicket?.id === t.id && isCanvasOpen, 'sold-out': !hasAvailableseats(t) }" 
                        :disabled="getTicketStatusClass(t) === 'not-started' || getTicketStatusClass(t) === 'ended' || !hasAvailableseats(t)" 
                        @click="toggleSeatmapCanvas(t)"
                      >
                        {{ getTicketStatusClass(t) === 'not-started' ? 'Segera Hadir' : (getTicketStatusClass(t) === 'ended' ? 'Selesai' : (!hasAvailableseats(t) ? 'Penuh' : 'Pilih Seat')) }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Syarat & Ketentuan Tab Content -->
        <div v-else-if="activeTab === 'terms'" class="mobile-tab-terms-content">
          <div class="tab-card-content description-card">
            <h2 class="section-card-title">Syarat &amp; Ketentuan</h2>
            <div v-html="event.term_condition || '<p>Tidak ada syarat & ketentuan</p>'" class="rich-html-content"></div>
          </div>
        </div>
      </div>

      <!-- Sticky Bottom Footer (Global on mobile view) -->
      <div class="mobile-bottom-footer-redesign">
        <div class="footer-top-row">
          <div class="footer-price-info">
            <span class="total-harga-label">TOTAL HARGA</span>
            <span class="total-harga-val">{{ formatRp(totalSelectedTicketsPrice || event.priceNum || 262672) }}</span>
          </div>
          <div class="footer-detail-toggle" v-if="selectedseats.length > 0" @click="toggleSelectedTicketsSummary">
            <span class="detail-toggle-text">({{ selectedseats.length }}) Detail</span>
            <ChevronUp :size="16" class="detail-toggle-icon" />
          </div>
          <div class="footer-detail-toggle" v-else>
            <span class="detail-toggle-text">(0) Detail</span>
            <ChevronUp :size="16" class="detail-toggle-icon" />
          </div>
        </div>
        <button class="btn-beli-tiket-sekarang" @click="handleBeliTiketClick">
          Beli Tiket Sekarang
        </button>
      </div>

    </div>

    <!-- ORIGINAL LAYOUT -->
    <div v-else class="original-layout-wrapper">
      <!-- Desktop Header Banner Area -->
    <div class="event-header-banner desktop-header-view">
      <!-- Blurred background image overlay -->
      <div class="banner-blur-bg" :style="{ backgroundImage: `url(${event.image})` }"></div>
      
      <div class="container banner-content">
        <div class="header-nav">
          <button class="back-btn-top" @click="goBack">

          </button>
          <h1 class="header-event-title">{{ event.name }}</h1>
        </div>
        
        <div class="banner-grid">
          <!-- Left: Banner Image -->
          <div class="banner-image-container">
            <img :src="event.image" :alt="event.name" class="banner-img" />
            <div class="live-event-badge">
              <span class="live-dot"></span>
              <span>Live Event</span>
            </div>
          </div>
          
          <!-- Right: Floating Event Info Card -->
          <div class="details-card-floating">
            <div class="detail-row">
              <Calendar :size="22" class="detail-icon" />
              <div class="detail-text">
                <span class="detail-label">Tanggal Event</span>
                <span class="detail-value">{{ formatEventDates(event) }}</span>
              </div>
            </div>
            <div class="detail-row">
              <Clock :size="22" class="detail-icon" />
              <div class="detail-text">
                <span class="detail-label">Waktu Event</span>
                <span class="detail-value">{{ event.start_time }} - {{ event.end_time }} {{ event.zone_time }}</span>
              </div>
            </div>
            <div class="detail-row">
              <MapPin :size="22" class="detail-icon" />
              <div class="detail-text">
                <span class="detail-label">Venue Event</span>
                <a 
                  v-if="event.venue_map"
                  :href="event.venue_map" 
                  target="_blank" 
                  rel="noopener" 
                  class="detail-value venue-link"
                >{{ event.venue_name }}</a>
                <span v-else class="detail-value">{{ event.venue_name }}</span>
                <span v-if="event.venue_address" class="venue-address">{{ event.venue_address }}</span>
              </div>
            </div>

            
            <div class="organizer-section-new">
              <span class="org-label">Diselenggarakan Oleh</span>
              <div class="org-profile-new">
                <img 
                  :src="event.has_creator?.image_url || '/AJAKLogo/LOGO.png'" 
                  class="org-logo-new" 
                />
                <svg class="org-verified-badge" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>

    <!-- Mobile Header Banner Area (Visible on Mobile Only) -->
    <div class="mobile-header-view">
      <div class="mobile-banner-container">
        <img :src="event.image" :alt="event.name" class="mobile-banner-img" />
      </div>
      
      <div class="mobile-event-details-card">
        <h1 class="mobile-event-title">{{ event.name }}</h1>
        
        <div class="mobile-event-meta-list">
          <div class="mobile-meta-row">
            <Calendar :size="20" class="mobile-meta-icon" />
            <span class="mobile-meta-text">{{ formatEventDates(event) }}</span>
          </div>
          <div class="mobile-meta-row">
            <Clock :size="20" class="mobile-meta-icon" />
            <span class="mobile-meta-text">{{ event.start_time }} - {{ event.end_time }} {{ event.zone_time }}</span>
          </div>
          <div class="mobile-meta-row alignment-top">
            <MapPin :size="20" class="mobile-meta-icon flex-shrink-0" />
            <div class="mobile-venue-text-wrapper">
              <a 
                v-if="event.venue_map"
                :href="event.venue_map" 
                target="_blank" 
                rel="noopener" 
                class="mobile-meta-text mobile-venue-link"
              >{{ event.venue_name }}</a>
              <span v-else class="mobile-meta-text">{{ event.venue_name }}</span>
              <span v-if="event.venue_address" class="mobile-venue-address">{{ event.venue_address }}</span>
            </div>
          </div>

        </div>
        
        <div class="mobile-header-divider-dashed"></div>
        
        <div class="mobile-organizer-row">
          <div class="mobile-organizer-left">
            <div class="mobile-organizer-logo-container">
              <img 
                :src="event.has_creator?.image_url || '/AJAKLogo/LOGO.png'" 
                :alt="event.has_creator?.name || 'AJAK!'" 
                class="mobile-organizer-logo-img" 
              />
            </div>
            <div class="mobile-organizer-text">
              <span class="mobile-org-label">Diselenggarakan Oleh</span>
              <div class="mobile-org-name-row">
                <span class="mobile-org-name">{{ event.has_creator?.name || 'AJAK!' }}</span>
                <svg class="org-verified-badge" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    
    <!-- Sticky Tabs Navigation -->
    <div class="sticky-tabs-nav-bar" ref="tabsBarRef" :class="{ 'is-sticky': isTabsSticky }">
      <div class="container">
        <div class="tabs-navigation">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'deskripsi' }" 
            @click="activeTab = 'deskripsi'"
          >
            Deskripsi
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'tiket' }" 
            @click="activeTab = 'tiket'"
          >
            Tiket
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'terms' }" 
            @click="activeTab = 'terms'"
          >
            Syarat & Ketentuan
          </button>
        </div>
      </div>
    </div>
    
    <!-- Page Body Area -->
    <div class="event-details-body">
      <div class="container body-content-grid">
        
        <!-- Left: Tab Details -->
        <div class="details-left-col">
          <!-- Description Tab -->
          <div v-if="activeTab === 'deskripsi'" class="tab-card-content description-card">
            <h2 class="section-card-title">Deskripsi Acara</h2>
            <div v-html="event.description || '<p>Tidak ada deskripsi</p>'" class="rich-html-content"></div>
          </div>
          
          <!-- Tickets Tab (Accordion + Inline seatmap + Step Flow) -->
          <div v-else-if="activeTab === 'tiket'" class="tickets-container-list">
            
            <!-- STEP 1: Select ticket category and seats -->
            <div v-if="currentStep === 1" class="step1-grid">
              <!-- Left column: Tickets and seatmap List -->
              <div class="step1-left-col">
                <!-- Wrapper for Date & Session Filters -->
                <div class="outer-section-group filters-group">
                  <h3 class="outer-section-title">Hari &amp; Sesi</h3>
                  
                  <!-- Date Selection Section (Hari) - Style of Image 3 -->
                  <div class="date-slider-container">
                    <div class="date-slider-scroll" @wheel="handleWheelScroll">
                      <button 
                        v-for="d in dateOptions" 
                        :key="d.id"
                        class="date-slider-item"
                        :class="{ 
                          active: selectedDate === d.id,
                          disabled: d.enabled === false
                        }"
                        :disabled="d.enabled === false"
                        @click="d.enabled !== false ? selectedDate = d.id : null"
                      >
                        <span class="date-slider-day">{{ d.shortDay }}</span>
                        <span class="date-slider-val">{{ d.shortDate }}</span>
                      </button>
                    </div>
                    <div class="date-slider-divider"></div>
                    <div class="calendar-btn-wrapper" ref="calendarBtnWrapperRef">
                      <button 
                        class="date-slider-calendar-btn" 
                        aria-label="Pilih Tanggal"
                        @click="toggleCalendarPopup"
                      >
                        <Calendar :size="20" />
                      </button>
                      
                      <!-- Pop-up Calendar Card -->
                      <transition name="fade-in-scale">
                        <div v-if="showCalendarPopup" class="mini-calendar-popup">
                          <div class="mini-cal-header">
                            <span class="mini-cal-month">{{ calendarMonthYear }}</span>
                          </div>
                          <div class="mini-cal-weekdays">
                            <span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span>
                          </div>
                          <div class="mini-cal-grid">
                            <button 
                              v-for="day in juneDays" 
                              :key="day.num"
                              class="mini-cal-day-btn"
                              :class="{ 
                                'is-concert': day.isConcert, 
                                'active': selectedDate === day.concertId,
                                'disabled': !day.isConcert 
                              }"
                              :disabled="!day.isConcert"
                              @click="selectDateFromCalendar(day.concertId)"
                            >
                              {{ day.num }}
                            </button>
                          </div>
                        </div>
                      </transition>
                    </div>
                  </div>

                  <!-- Session Selection Section (Sesi) - Style of Image 2 but Premium -->
                  <div class="session-section-wrapper">
                    <!-- <div class="session-section-header">
                      <h4 class="session-section-title">Pilih Sesi Keberangkatan</h4>
                    </div> -->
                    <div class="session-pills-row" @wheel="handleWheelScroll">
                      <button 
                        v-for="s in sessionOptions" 
                        :key="s.id"
                        class="session-pill-btn"
                        :class="{ 
                          active: selectedSesi === s.id && s.available, 
                          'unavailable-session': !s.available 
                        }"
                        :disabled="!s.available"
                        @click="s.available ? selectedSesi = s.id : null"
                      >
                        <div class="session-pill-inner">
                          <span class="session-pill-name">{{ s.name }}</span>
                          <span class="session-pill-time">{{ s.departureTime }}</span>
                          <span v-if="!s.available" class="session-pill-status">TIDAK TERSEDIA</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Wrapper for Shuttle Tickets -->
                <div class="outer-section-group">
                  <h3 class="outer-section-title">pilih kursi</h3>
                  <div class="tickets-list-wrapper" style="display: flex; flex-direction: column; gap: 16px;">
                    <div 
                      v-for="t in filteredTickets" 
                      :key="t.id" 
                      class="ticket-card-voucher"
                      :id="selectedTicket?.id === t.id ? 'seatmap' : null"
                      :class="{ selected: selectedTicket?.id === t.id && isCanvasOpen }"
                    >
                          <!-- Voucher Side notches -->
                          <div class="ticket-side-notch-left"></div>
                          <div class="ticket-side-notch-right"></div>
                          
                          <!-- Mobile backdrop overlay and seatmap canvas (teleported to body on mobile) -->
                          <Teleport :disabled="!isMobile" v-if="(selectedTicket?.id === t.id && isCanvasOpen) || isSheetClosing" to="body">
                            <!-- Backdrop (rendered only on mobile) -->
                            <div 
                              v-if="isMobile"
                              class="mobile-seatmap-backdrop"
                              :class="{ 'is-closing': isSheetClosing }"
                              @click="clearSelectedTicket"
                              @touchmove.prevent
                            ></div>

                            <!-- If selected, show ONLY the seatmap canvas inside the card -->
                            <div 
                              class="selected-seatmap-canvas-container"
                              :class="{ 'is-closing': isSheetClosing }"
                              :style="{ 
                                transform: `translateY(${sheetDragDeltaY}px)`,
                                transition: isSheetDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
                              }"
                              @click.stop
                            >
                              <!-- Drag Handle — sits OUTSIDE/ABOVE the white card -->
                              <div 
                                class="sheet-drag-handle-area"
                                @touchstart.stop="onSheetDragStart"
                                @touchmove.stop="onSheetDragMove"
                                @touchend.stop="onSheetDragEnd"
                                @mousedown.stop="onSheetDragStart"
                                @mousemove.stop="onSheetDragMove"
                                @mouseup.stop="onSheetDragEnd"
                              >
                                <div class="sheet-drag-handle-pill"></div>
                              </div>

                              <!-- White card — everything below the handle -->
                              <div class="sheet-inner-card">
                                <!-- Mobile seatmap Header (supports dragging too) -->
                                <div 
                                  class="mobile-seatmap-header"
                                  @touchstart.stop="onSheetDragStart"
                                  @touchmove.stop="onSheetDragMove"
                                  @touchend.stop="onSheetDragEnd"
                                  @mousedown.stop="onSheetDragStart"
                                  @mousemove.stop="onSheetDragMove"
                                  @mouseup.stop="onSheetDragEnd"
                                >
                                  <button type="button" class="btn-close-seatmap-mobile" @touchstart.stop @click.stop="clearSelectedTicket">✕</button>
                                  <h3 class="mobile-seatmap-header-title">Pilih seat</h3>
                                </div>
                              <div class="seatmap-canvas-header">
                                <div class="seatmap-canvas-title-group">
                                  <span class="seatmap-canvas-badge" :style="{ backgroundColor: t.seat_color || 'var(--primary)' }">
                                    {{ selectedTripStatus?.name || t.trip_status?.name || 'Pergi' }}
                                  </span>
                                  <h3 class="seatmap-canvas-ticket-name">{{ t.name }}</h3>
                                </div>
                                <button type="button" class="btn-back-to-tickets" @click="clearSelectedTicket">
                                  Kembali
                                </button>
                              </div>

                              <!-- PP Step Indicator (only for PP trips) -->
                              <div v-if="isPP" class="pp-step-indicator">
                                <div class="pp-step-item" :class="{ active: ppStep === 1, completed: ppStep === 2 }" @click="goToPpStep1">
                                  <div class="pp-step-circle">
                                    <span v-if="ppStep === 2" class="pp-checkmark">✓</span>
                                    <span v-else>1</span>
                                  </div>
                                  <div class="pp-step-text">
                                    <span class="pp-step-title">Pilih seat Pergi</span>
                                    <span v-if="ppPergiSelectedCount > 0" class="pp-step-count">{{ ppPergiSelectedCount }} seat</span>
                                  </div>
                                </div>
                                <div class="pp-step-connector" :class="{ active: ppStep === 2 }"></div>
                                <div class="pp-step-item" :class="{ active: ppStep === 2 }">
                                  <div class="pp-step-circle">
                                    <span>2</span>
                                  </div>
                                  <div class="pp-step-text">
                                    <span class="pp-step-title">Pilih seat Pulang</span>
                                    <span v-if="ppPulangSelectedCount > 0" class="pp-step-count">{{ ppPulangSelectedCount }} seat</span>
                                  </div>
                                </div>
                              </div>

                              <div class="seatmap-canvas-body">
                                <!-- Bus cabin layout -->
                                <div 
                                  class="bus-cabin-canvas-viewport"
                                  :class="{ 'is-fullscreen-mode': isFullscreen }"
                                  @wheel.prevent="onWheel"
                                >
                                  <!-- Desktop Legends Overlay (Visible on Desktop Only) -->
                                  <div class="inline-legends" @mousedown.stop @touchstart.stop>
                                    <div class="legend-item">
                                      <span class="legend-box selected"></span>
                                      <span>Dipilih</span>
                                    </div>
                                    <div class="legend-item">
                                      <span class="legend-box available"></span>
                                      <span>Tersedia</span>
                                    </div>
                                    <div class="legend-item">
                                      <span class="legend-box occupied"></span>
                                      <span>Tidak Tersedia</span>
                                    </div>
                                  </div>

                                  <!-- Desktop Zoom Controls Overlay (Visible on Desktop Only) -->
                                  <div class="canvas-zoom-controls" @mousedown.stop @touchstart.stop>
                                    <button type="button" class="zoom-control-btn" @click="isFullscreen = !isFullscreen" :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'">
                                      <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                                      <svg v-else viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"></path></svg>
                                    </button>
                                    <button type="button" class="zoom-control-btn" @click="zoomIn" title="Zoom In">➕</button>
                                    <button type="button" class="zoom-control-btn" @click="zoomOut" title="Zoom Out">➖</button>
                                    <button type="button" class="zoom-control-btn text-btn" @click="resetZoomPan">Reset Layout</button>
                                  </div>

                                  <!-- Mobile Legends (Visible on Mobile Only) -->
                                  <div class="mobile-legends-overlay" @touchstart.stop>
                                    <div class="legend-item">
                                      <span class="legend-box selected"></span>
                                      <span>Dipilih</span>
                                    </div>
                                    <div class="legend-item">
                                      <span class="legend-box available"></span>
                                      <span>Tersedia</span>
                                    </div>
                                    <div class="legend-item">
                                      <span class="legend-box occupied"></span>
                                      <span>Tidak Tersedia</span>
                                    </div>
                                  </div>

                                  <!-- Mobile Zoom Controls (Visible on Mobile Only) -->
                                  <div class="mobile-zoom-controls-overlay" @touchstart.stop>
                                    <button type="button" class="m-zoom-btn" @click="isFullscreen = !isFullscreen">
                                      <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                                      <svg v-else viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"></path></svg>
                                    </button>
                                    <button type="button" class="m-zoom-btn" @click="zoomIn">➕</button>
                                    <button type="button" class="m-zoom-btn" @click="zoomOut">➖</button>
                                  </div>

                                  <div 
                                    class="bus-cabin-container konva-container"
                                    style="width: 100%; height: 100%; overflow: hidden; background: #f8fafc; border-radius: 12px; position: relative; z-index: 1;"
                                  >
                                    <v-stage 
                                      :config="{ 
                                        width: 800, 
                                        height: 600, 
                                        draggable: isStageDraggable, 
                                        scaleX: zoom, 
                                        scaleY: zoom 
                                      }"
                                      @wheel="onWheel"
                                      @touchstart="handleTouchStart"
                                      @touchmove="handleTouchMove"
                                      @touchend="handleTouchEnd"
                                    >
                                      <v-layer>
                                        <!-- Translate layer to center the layout initially -->
                                        <v-group :config="{ x: 400, y: 100 }">
                                          <template v-for="shape in parsedseatmap" :key="shape.id">
                                                    <!-- Box type (e.g. KEMUDI) -->
                                            <v-group v-if="shape.type === 'box'" :config="shape.groupConfig">
                                              <v-rect :config="shape.rectConfig" />
                                              <v-text :config="shape.textConfig" />
                                            </v-group>

                                            <!-- seat type -->
                                            <v-group 
                                              v-else-if="shape.type === 'seat'" 
                                              :config="shape.groupConfig"
                                              @click="shape.available ? toggleseatSelection(shape.id) : null"
                                              @tap="shape.available ? toggleseatSelection(shape.id) : null"
                                            >
                                              <v-rect :config="shape.rectConfig" />
                                              <v-text :config="shape.textConfig" />
                                            </v-group>

                                          </template>
                                        </v-group>
                                      </v-layer>
                                    </v-stage>
                                  </div>
                                </div>

                                <!-- PP Step Navigation Bar -->
                                <div v-if="isPP" class="pp-step-nav-bar">
                                  <div v-if="!isMobile" class="pp-nav-info">
                                    <div class="pp-steps-indicator">
                                      <span class="pp-step-dot" :class="ppStep === 1 ? 'active' : 'completed'">1</span>
                                      <span class="pp-step-line" :class="ppStep === 2 ? 'completed' : ''"></span>
                                      <span class="pp-step-dot" :class="ppStep === 2 ? 'active' : 'inactive'">2</span>
                                    </div>
                                    <div>
                                      <span class="pp-nav-label-text" v-if="ppStep === 1">
                                        Pilih seat Pergi
                                      </span>
                                      <span class="pp-nav-label-text" v-else>
                                        Pilih seat Pulang
                                      </span>
                                      <span class="pp-nav-seat-count">
                                        {{ ppStep === 1 ? ppPergiSelectedCount : ppPulangSelectedCount }} seat
                                      </span>
                                    </div>
                                  </div>
                                  <div class="pp-nav-actions">
                                    <button 
                                      v-if="ppStep === 2" 
                                      type="button" 
                                      class="pp-nav-btn pp-nav-back" 
                                      @click="goToPpStep1"
                                    >
                                      ← Kembali
                                    </button>
                                    <button 
                                      v-if="ppStep === 1"
                                      type="button" 
                                      class="pp-nav-btn pp-nav-next" 
                                      :disabled="ppPergiSelectedCount === 0"
                                      @click="goToPpStep2"
                                    >
                                      Lanjut ke Pulang →
                                    </button>
                                    <button
                                      v-if="ppStep === 2"
                                      type="button"
                                      class="pp-nav-btn pp-nav-next"
                                      :disabled="ppPulangSelectedCount === 0"
                                      @click="goToBuyerDetails()"
                                    >
                                      Lanjut Pembayaran →
                                    </button>
                                    <span v-if="ppStep === 2 && errors.seats" class="pp-nav-error">{{ errors.seats }}</span>
                                  </div>
                                </div>

                                <!-- Mobile Canvas Bottom Action Bar (non-PP only, PP uses step nav bar) -->
                                <div v-if="isMobile && !isPP" class="canvas-bottom-action-bar">
                                  <div class="canvas-bottom-left">
                                    <span class="canvas-bottom-seat-count">
                                      <template v-if="selectedseats.length === 0">Pilih seat</template>
                                      <template v-else>{{ selectedseats.length }} seat dipilih</template>
                                    </span>
                                    <span class="canvas-bottom-total-price">{{ formatRp(getEffectivePrice(t) * (selectedseats.length || 1)) }}</span>
                                  </div>
                                  <div class="canvas-bottom-right">
                                    <button
                                      class="canvas-bottom-btn"
                                      :disabled="selectedseats.length === 0"
                                      @click="goToBuyerDetails()"
                                    >
                                      Selanjutnya
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div><!-- end sheet-inner-card -->
                          </div>
                        </Teleport>


                          <!-- If not selected, show the normal ticket details and features accordion -->
                          <!-- If not selected, show the normal ticket details -->
                          <div v-else class="ticket-card-inner">
                            <!-- Top Section (Click to toggle accordion) -->
                            <div class="ticket-top-section" @click="toggleTicketAccordion(t.id)" style="cursor: pointer;">
                              <div class="ticket-top-left">
                                <h3 class="ticket-category-title">{{ t.name }}</h3>
                                <div class="ticket-status-badge" :class="getTicketStatusClass(t)">
                                  <span class="status-dot"></span>
                                  <span>{{ getTicketStatus(t) }}</span>
                                </div>
                              </div>
                              
                              <div class="ticket-top-right">
                                <div class="ticket-vertical-divider"></div>
                                <div class="ticket-price-box">
                                  <span class="ticket-price-label">{{ !selectedTripStatus ? 'Mulai dari' : 'Harga' }}</span>
                                  <div class="ticket-price-value-wrapper">
                                    <span class="ticket-price-value">
                                      <template v-if="!selectedTripStatus">{{ formatRp(t.price) }}</template>
                                      <template v-else>{{ formatRp(getEffectivePrice(t)) }}</template>
                                    </span>
                                    <ChevronDown 
                                      :size="18" 
                                      class="accordion-chevron-toggle"
                                      :class="{ rotated: expandedTicketId === t.id }"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <!-- Accordion Body: Hari Konser, Sesi Keberangkatan, and Fasilitas Shuttle -->
                            <transition name="expand-accordion">
                              <div v-show="expandedTicketId === t.id" class="ticket-accordion-body">
                              <!-- Horizontal line separator -->
                              <div class="accordion-section-divider"></div>
                              
                              <!-- Details Row: Hari Konser, Sesi Keberangkatan & Sesi Kepulangan -->
                              <div class="ticket-details-row">
                                <div class="detail-col hari-konser-col">
                                  <span class="detail-col-label">Hari Konser</span>
                                  <div class="calendar-detail-wrapper-simple">
                                    <Calendar :size="18" class="detail-icon-red" />
                                    <span class="info-bold-text">{{ dateOptions.find(d => String(d.id) === String(selectedDate))?.date || selectedDate }}</span>
                                  </div>
                                </div>
                                <div class="detail-col">
                                  <span class="detail-col-label">Sesi Berangkat</span>
                                  <div class="session-detail-wrapper-simple">
                                    <Clock :size="18" class="detail-icon-red" />
                                    <span class="info-bold-text">{{ sessionOptions.find(s => String(s.id) === String(selectedSesi))?.departureTime || sessionOptions.find(s => String(s.id) === String(selectedSesi))?.time || '' }}</span>
                                  </div>
                                </div>
                                <div class="detail-col">
                                  <span class="detail-col-label">Sesi Pulang</span>
                                  <div class="session-detail-wrapper-simple">
                                    <Clock :size="18" class="detail-icon-red" />
                                    <span class="info-bold-text">{{ sessionOptions.find(s => String(s.id) === String(selectedSesi))?.arrivalTime || '-' }}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <!-- Deskripsi Tiket -->
                              <div v-if="t.description" class="accordion-section-divider"></div>
                              <div v-if="t.description" class="ticket-description-section">
                                <span class="detail-col-label">Deskripsi Tiket</span>
                                <p class="ticket-description-text">{{ t.description }}</p>
                              </div>
                              
                              <!-- Pilih Jenis Trip Dropdown -->
                              <div class="accordion-section-divider"></div>
                              <div class="trip-status-section">
                                <span class="detail-col-label">Pilih Jenis Seat</span>
                                <div class="trip-status-dropdown-wrapper">
                                  <select 
                                    v-model="selectedTripStatus" 
                                    class="trip-status-select"
                                    :class="{ 'trip-status-select-error': tripTypeError }"
                                    @change="bookingStore.selectedTripStatus = selectedTripStatus"
                                  >
                                    <option :value="null" disabled>Pilih jenis seat</option>
                                    <option
                                      v-for="ts in tripStatusOptions"
                                      :key="ts.id"
                                      :value="ts"
                                    >
                                      {{ ts.name }}
                                    </option>
                                  </select>
                                  <span v-if="tripTypeError" class="trip-type-error-text">{{ tripTypeError }}</span>
                                </div>
                              </div>

                              <!-- Fasilitas Shuttle Section -->
                              <div class="accordion-section-divider"></div>
                              <div class="ticket-facilities-section">
                                <span class="detail-col-label">Fasilitas Shuttle</span>
                                <div class="facilities-simple-list">
                                  <div 
                                    v-for="fac in event?.facilities || []" 
                                    :key="fac" 
                                    class="facility-simple-item"
                                  >
                                    <component :is="getFacilityIcon(fac)" :size="16" class="facility-icon-red" />
                                    <span class="facility-text">{{ fac }}</span>
                                  </div>
                                </div>
                              </div>
                              <!-- End: Fasilitas Shuttle Section -->
                            </div>
                          </transition>

                            <!-- Divider Row with Dashed Line -->
                            <div class="ticket-divider-row">
                              <div class="ticket-card-divider-dashed-line"></div>
                            </div>
                            
                            <!-- Bottom Section (Always visible) -->
                            <div class="ticket-bottom-section">
                              <!-- Bottom Footer Info -->
                              <div class="ticket-bottom-footer-row">
                                <div class="ticket-ending-details">
                                  <span class="ending-label">{{ getTicketStatusClass(t) === 'not-started' ? 'PENJUALAN DIMULAI PADA' : 'BERAKHIR PADA' }}</span>
                                  <span class="ending-value">
                                    <template v-if="getTicketStatusClass(t) === 'not-started'">
                                      {{ formatDateLabelLong(t.ticket_start_date) }}, <span class="countdown-text">{{ t.ticket_start_time }} WIB</span>
                                    </template>
                                    <template v-else>
                                      {{ formatDateLabelLong(t.ticket_end) }}, <span class="countdown-text">{{ t.ending_time }} WIB</span>
                                    </template>
                                  </span>
                                </div>
                                
                                <div class="ticket-footer-vertical-divider"></div>
                                
                                <!-- Direct Book / Select seat Button -->
                                <div class="ticket-action-select-btn-only">
                                   <button 
                                    class="select-ticket-btn"
                                    :class="{ selected: selectedTicket?.id === t.id && isCanvasOpen, 'sold-out': !hasAvailableseats(t) }"
                                    :disabled="!hasAvailableseats(t)"
                                    @click.stop="selectTicketCategory(t)"
                                  >
                                    <template v-if="!hasAvailableseats(t)">
                                      <template v-if="getTicketStatusClass(t) === 'not-started'">Belum Dimulai</template>
                                      <template v-else>Habis</template>
                                    </template>
                                    <template v-else-if="t.ticket_type_id === 0">Beli Tiket</template>
                                    <template v-else>
                                      {{ (() => {
                                        const key = `${t.id}_${selectedDate}_${selectedSesi}`;
                                        const seats = selectedseatsMap[key];
                                        return seats && seats.length > 0 ? `Pilih seat (${seats.length})` : 'Pilih seat';
                                      })() }}
                                    </template>
                                  </button>
                                </div>
                              </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              <!-- Right column: Tiket Terpilih summary card -->
              <div class="step1-right-col">
                <div class="selected-summary-card sticky-summary-card">
                  <div class="summary-card-header">
                    <h3 class="summary-card-title">Tiket Dipilih</h3>
                    <button 
                      v-if="totalSelectedTicketsCount > 0" 
                      type="button" 
                      class="btn-edit-seats" 
                      :class="{ 'is-editing': isEditMode }"
                      @click="toggleEditMode"
                    >
                      <span>{{ isEditMode ? 'Selesai' : 'Edit' }}</span>
                      <svg v-if="!isEditMode" class="edit-icon-svg" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                  </div>
                  
                    <!-- Empty state when no seat is chosen -->
                    <div v-if="allSelectedTickets.length === 0" class="empty-summary-state">
                      <div class="info-circle-icon">
                        <Info :size="20" />
                      </div>
                      <p class="info-text">Belum ada seat yang dipilih</p>
                    </div>

                    <!-- Selected seats info -->
                    <div v-else class="summary-card-body">
                      <!-- Scrollable items list: scrolls when >2 categories -->
                      <div 
                        class="summary-items-scroll-container"
                        :class="{ 'is-scrollable': allSelectedTickets.length > 2 }"
                      >
                        <div 
                          v-for="(item, idx) in allSelectedTickets" 
                          :key="item.key"
                          class="summary-ticket-item"
                          :style="idx > 0 ? 'border-top: 1.5px solid #f1f5f9; padding-top: 14px; margin-top: 2px;' : ''"
                        >
                          <div class="summary-ticket-title-row">
                            <!-- Ticket Icon -->
                            <svg class="ticket-icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v14M9 9h.01M9 13h.01M9 17h.01"></path></svg>
                            
                            <span class="summary-ticket-name">{{ item.name }}</span>
                            <span class="summary-ticket-badge-count">{{ isPP ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length }}X</span>
                          </div>
                          
                          <!-- Day and Session Info -->
                          <div class="summary-ticket-meta-row">
                            <div class="summary-meta-info">
                              <span>{{ item.dayId }}</span> &bull; <span>{{ sessionOptions.find(s => String(s.id) === String(item.sesiId))?.name || item.sesiId }} ({{ sessionOptions.find(s => String(s.id) === String(item.sesiId))?.time || '' }})</span>
                            </div>
                            <button 
                              v-if="isEditMode" 
                              type="button" 
                              class="btn-delete-ticket-summary" 
                              @click="deleteTicketSelectionByKey(item.key)"
                              title="Hapus"
                            >
                              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                          </div>
                          
                          <div class="summary-ticket-seats-row">
                            seat: {{ item.seats.map(s => formatseatLabel(s)).join(', ') }}
                          </div>
                          
                          <div class="summary-ticket-price-row">
                            {{ formatRp(item.price * (isPP ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length)) }}
                          </div>
                        </div>
                      </div>
                      
                      <div class="summary-card-divider-dashes"></div>
                      
                      <div class="summary-total-row">
                        <span class="summary-total-label">Total ({{ totalSelectedTicketsCount }} Tiket)</span>
                        <span class="summary-total-price">{{ formatRp(totalSelectedTicketsPrice) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            <!-- STEP 2: Buyer Details form card -->
            <div v-else-if="currentStep === 2 && selectedTicket" class="booking-onpage-form-section">
              <div class="onpage-form-header">
                <button type="button" class="btn-back-to-step1" @click="goBackToStep1">
                  ← Ganti seat / Tiket
                </button>
                <h3 class="onpage-form-title">Data Pemesan</h3>
              </div>
              
              <div class="onpage-form-card">
                <div class="onpage-form-grid">
                  <!-- Left column: Summary info -->
                  <div class="onpage-form-left-col">
                    <h4 class="form-subheader mt-0 pt-0" style="border-top: none;">Detail Tiket</h4>
                    
                    <div 
                        v-for="(item, idx) in allSelectedTickets" 
                        :key="item.key" 
                        class="summary-details-box"
                        :style="idx > 0 ? 'margin-top: 12px;' : ''"
                      >
                        <div class="summary-detail-row">
                          <span class="sd-label">Kategori</span>
                          <span class="sd-value">{{ item.name }} ({{ item.dayId }} &bull; {{ sessionOptions.find(s => String(s.id) === String(item.sesiId))?.name || item.sesiId }})</span>
                        </div>
                        <div class="summary-detail-row">
                          <span class="sd-label">seat</span>
                          <span class="sd-value seats-highlight">{{ item.seats.map(s => formatseatLabel(s)).join(', ') }}</span>
                        </div>
                        <div class="summary-detail-row">
                          <span class="sd-label">Jumlah</span>
                          <span class="sd-value">{{ isPP ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length }} Tiket</span>
                        </div>
                        <div class="summary-detail-row">
                          <span class="sd-label">Harga per seat</span>
                          <span class="sd-value">{{ formatRp(item.price) }}</span>
                        </div>
                        <div class="summary-detail-row sd-total-row">
                          <span class="sd-label font-bold">Subtotal</span>
                          <span class="sd-value font-black text-primary">{{ formatRp(item.price * (isPP ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length)) }}</span>
                        </div>
                      </div>
                      
                      <!-- Grand Total display if multiple categories -->
                      <div class="grand-total-step2-box" style="margin-top: 16px; padding: 16px; border: 1.5px solid var(--border-color); border-radius: 12px; display: flex; justify-content: space-between; align-items: center; background: #fafafb;">
                        <span style="font-weight: 800; font-size: 0.95rem; color: #0f172a;">Total Terpilih ({{ totalSelectedTicketsCount }} seat)</span>
                        <span style="font-weight: 950; font-size: 1.25rem; color: var(--primary);">{{ formatRp(totalSelectedTicketsPrice) }}</span>
                      </div>
                  </div>

                  <!-- Right column: Input fields -->
                  <div class="onpage-form-right-col">
                    <div class="form-input-group mb-3" v-if="event?.is_name">
                      <label class="form-field-label"><User :size="12" /> Nama Lengkap</label>
                      <input 
                        type="text" 
                        v-model="buyer.name"
                        @input="validateName"
                        @blur="validateName"
                        placeholder="Masukkan nama lengkap"
                        class="sidebar-form-input"
                        :class="{ 'has-error': errors.name }"
                      />
                      <span v-if="errors.name" class="form-error-text">{{ errors.name }}</span>
                    </div>

                    <div class="form-input-group mb-3" v-if="event?.is_email">
                      <label class="form-field-label"><Mail :size="12" /> Email</label>
                      <input 
                        type="email" 
                        v-model="buyer.email"
                        @input="validateEmail"
                        @blur="validateEmail"
                        placeholder="contoh@email.com"
                        class="sidebar-form-input"
                        :class="{ 'has-error': errors.email }"
                      />
                      <span v-if="errors.email" class="form-error-text">{{ errors.email }}</span>
                    </div>

                    <div class="form-input-group mb-3" v-if="event?.is_phone">
                      <label class="form-field-label"><Phone :size="12" /> Nomor WhatsApp</label>
                      <input 
                        type="tel" 
                        v-model="buyer.phone"
                        @input="validatePhone"
                        @blur="validatePhone"
                        placeholder="8123456789"
                        class="sidebar-form-input"
                        :class="{ 'has-error': errors.phone }"
                      />
                      <span v-if="errors.phone" class="form-error-text">{{ errors.phone }}</span>
                    </div>

                    <div class="form-input-group mb-3" v-if="event?.is_noidentity">
                      <label class="form-field-label"><User :size="12" /> Nomor Identitas (KTP/NIK)</label>
                      <input 
                        type="text" 
                        v-model="buyer.identity"
                        @input="validateIdentity"
                        @blur="validateIdentity"
                        placeholder="Masukkan nomor identitas"
                        class="sidebar-form-input"
                        :class="{ 'has-error': errors.identity }"
                      />
                      <span v-if="errors.identity" class="form-error-text">{{ errors.identity }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Terms Tab -->
          <div v-else-if="activeTab === 'terms'" class="tab-card-content terms-card">
            <h2 class="section-card-title">Syarat & Ketentuan</h2>
            <div v-html="event.term_condition || '<p>Tidak ada syarat & ketentuan</p>'" class="rich-html-content"></div>
          </div>
        </div>
        
      </div>
    </div>


    <!-- Sticky Bottom Checkout Bar -->
    <!-- Desktop Bottom Bar View -->
    <div class="booking-bottom-bar desktop-bottom-bar-view">
      <div class="container bottom-bar-container">
        <div class="bottom-bar-left">
          <span class="bottom-bar-ticket-name font-bold" v-if="totalSelectedTicketsCount > 0">
              Total {{ totalSelectedTicketsCount }} seat
            </span>
            <span class="bottom-bar-ticket-name" v-else>
              Harga mulai dari
            </span>
            
            <span class="bottom-bar-total-price">
              {{ totalSelectedTicketsCount > 0 ? formatRp(totalSelectedTicketsPrice) : formatRp(event.priceNum || 0) }}
            </span>
        </div>
        
        <div class="bottom-bar-right">
          <!-- State 1: No seat selected yet -->
          <button 
            v-if="!selectedTicket || selectedseats.length === 0"
            class="bottom-bar-buy-btn"
            @click="scrollToTickets"
          >
            Pilih seat
          </button>
          
          <!-- State 2: seats selected, select step 1 -->
          <button 
            v-else-if="currentStep === 1"
            class="bottom-bar-buy-btn animate-pulse-once"
            :disabled="isPP && ppStep === 1 && ppPergiSelectedCount === 0"
            @click="isPP && ppStep === 1 ? goToPpStep2() : goToBuyerDetails()"
          >
            <template v-if="isPP && ppStep === 1">Lanjut ke Pulang</template>
            <template v-else>Selanjutnya</template>
          </button>
          
          <!-- State 3: Buyer details step 2 -->
          <button 
            v-else-if="currentStep === 2"
            class="bottom-bar-buy-btn"
            :disabled="!isFormValid"
            @click="handleProceedToCheckout"
          >
            Beli Tiket
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Bottom Bar View -->
    <div class="booking-bottom-bar mobile-bottom-bar-view">
      <div class="mobile-bottom-bar-content">
        <!-- Top Row: Price + Detail -->
        <div class="m-bottom-bar-top-row">
          <div class="m-bottom-bar-price-block">
            <span class="m-price-label">TOTAL HARGA</span>
            <span class="m-price-value">
              {{ totalSelectedTicketsCount > 0 ? formatRp(totalSelectedTicketsPrice) : formatRp(event.priceNum || 0) }}
            </span>
          </div>
          <div class="m-bottom-bar-detail-link" @click="showMobileDetailSheet = !showMobileDetailSheet">
            <span>({{ totalSelectedTicketsCount || 0 }}) Detail</span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" class="m-detail-chevron" :class="{ 'rotated': showMobileDetailSheet }">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </div>
        </div>
        
        <!-- Bottom Row: Buy Button -->
        <div class="m-bottom-bar-bottom-row">
          <button 
            v-if="!selectedTicket || selectedseats.length === 0"
            class="m-buy-btn"
            @click="scrollToTickets"
          >
            Beli Tiket Sekarang
          </button>
          
          <button 
            v-else-if="currentStep === 1"
            class="m-buy-btn"
            :disabled="isPP && ppStep === 1 && ppPergiSelectedCount === 0"
            @click="isPP && ppStep === 1 ? goToPpStep2() : goToBuyerDetails()"
          >
            <template v-if="isPP && ppStep === 1">Lanjut ke Pulang</template>
            <template v-else>Beli Tiket Sekarang</template>
          </button>
          
          <button 
            v-else-if="currentStep === 2"
            class="m-buy-btn"
            :disabled="!isFormValid"
            @click="handleProceedToCheckout"
          >
            Beli Tiket Sekarang
          </button>
        </div>
      </div>
    </div>
    
    <!-- Payment Selector Modal Popup -->
    <transition name="modal-fade">
      <div v-if="showPaymentModal" class="payment-modal-overlay" @click.self="showPaymentModal = false">
        <div class="payment-modal">
          <div class="pm-header">
            <h3>Pilih Metode Pembayaran</h3>
            <button class="pm-close" @click="showPaymentModal = false">✕</button>
          </div>
          <div class="pm-body">
            <div class="pm-total">
              <span>Total Tagihan</span>
              <strong>{{ formatRp(selectedTicket.price * quantity) }}</strong>
            </div>
            
            <div class="pm-methods">
              <label 
                v-for="method in paymentMethods" 
                :key="method.id" 
                class="pm-method-label"
                :class="{ active: selectedPayment === method.id }"
              >
                <input type="radio" :value="method.id" v-model="selectedPayment" class="pm-radio" />
                <span class="pm-icon">{{ method.icon }}</span>
                <span class="pm-name">{{ method.name }}</span>
                <Check v-if="selectedPayment === method.id" class="pm-check" :size="16" />
              </label>
            </div>
          </div>
          <div class="pm-footer">
            <button 
              class="pm-submit-btn" 
              :disabled="!selectedPayment" 
              @click="confirmBooking"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Mobile Detail Sheet (Bottom Sheet) -->
    <transition name="sheet-fade">
      <div v-if="showMobileDetailSheet" class="mobile-sheet-overlay" @click.self="showMobileDetailSheet = false">
        <div class="mobile-sheet-card" @click.stop>
          <div class="mobile-sheet-header">
            <div class="mobile-sheet-title-group">
              <div class="mobile-sheet-drag-handle"></div>
              <h3 class="mobile-sheet-title">Detail Tiket</h3>
            </div>
            <button 
              v-if="selectedTicket && selectedseats.length > 0" 
              type="button" 
              class="btn-edit-seats-mobile" 
              :class="{ 'is-editing': isEditMode }"
              @click="toggleEditMode"
            >
              <span>{{ isEditMode ? 'Selesai Edit' : 'Edit' }}</span>
              <svg v-if="!isEditMode" class="edit-icon-svg" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="mobile-sheet-close-btn" @click="showMobileDetailSheet = false">✕</button>
          </div>
          
          <div class="mobile-sheet-body">
            <!-- Empty state when no seat is chosen -->
            <div v-if="!selectedTicket || selectedseats.length === 0" class="empty-summary-state">
              <div class="info-circle-icon">
                <Info :size="20" />
              </div>
              <p class="info-text">Belum ada seat yang dipilih</p>
            </div>

              <!-- Selected seats info -->
              <div v-else class="mobile-sheet-detail-content">
                <div 
                  v-for="(item, idx) in allSelectedTickets" 
                  :key="item.key"
                  class="summary-ticket-item"
                  :style="idx > 0 ? 'margin-top: 16px; border-top: 1px dashed #f1f5f9; padding-top: 16px;' : ''"
                >
                  <div class="summary-ticket-title-row">
                    <!-- Ticket Icon -->
                    <svg class="ticket-icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v14M9 9h.01M9 13h.01M9 17h.01"></path></svg>
                    <span class="summary-ticket-name">Tiket {{ item.name }}</span>
                    <span class="summary-ticket-badge-count">{{ isPP ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length }}X</span>
                  </div>
                  
                  <!-- Day and Session Info -->
                  <div class="summary-ticket-meta-row" style="font-size: 0.8rem; color: #64748b; font-weight: 700; padding-left: 24px; margin-top: 2px; margin-bottom: 2px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                      <span>Hari: {{ item.dayId }}</span> &bull; <span>Sesi: {{ sessionOptions.find(s => String(s.id) === String(item.sesiId))?.name || item.sesiId }} ({{ sessionOptions.find(s => String(s.id) === String(item.sesiId))?.time || '' }})</span>
                    </div>
                    <button 
                      v-if="isEditMode" 
                      type="button" 
                      class="btn-delete-ticket-summary" 
                      @click="deleteTicketSelectionByKey(item.key)"
                      title="Hapus Tiket"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                  
                  <div class="summary-ticket-seats-row">
                    seat No: {{ item.seats.map(s => formatseatLabel(s)).join(', ') }}
                  </div>
                  
                  <div class="summary-ticket-price-row">
                    {{ formatRp(item.price * (isPP ? item.seats.filter(s => s.endsWith('_1')).length : item.seats.length)) }}
                  </div>
                </div>
                
                <div class="summary-card-divider-dashes"></div>
                
                <div class="summary-total-row">
                  <span class="summary-total-label">Total ({{ totalSelectedTicketsCount }} Tiket)</span>
                  <span class="summary-total-price font-bold text-primary">{{ formatRp(totalSelectedTicketsPrice) }}</span>
                </div>
              </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- YouTube audio iframe (hidden) -->
    <iframe
      ref="youtubeIframeRef"
      class="yt-music-iframe"
      src="https://www.youtube.com/embed/TYBlfpCVHBo?autoplay=1&loop=1&playlist=TYBlfpCVHBo&mute=0&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1"
      allow="autoplay; encrypted-media"
      allowfullscreen
      frameborder="0"
      title="Background Music"
    ></iframe>

    <!-- Floating Volume Toggle Button -->
    <button
      class="yt-vol-btn"
      @click="toggleMute"
      :class="{ muted: isMuted, 'hide-mobile-seatmap': isMobile && (isCanvasOpen || route.hash === '#seatmap' || showMobileDetailSheet) }"
      :title="isMuted ? 'Putar Musik' : 'Matikan Musik'"
      aria-label="Toggle musik"
    >
      <svg v-if="!isMuted" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
      </svg>
    </button>
    </div>
  </div>
</template>

<style scoped>
:root {
  --primary: #c94c4c;
  --bg-color: #f3f6fa;
  --border-color: #e2e8f0;
}

.event-detail-page {
  min-height: 100vh;
  background: var(--bg-color);
}

.mobile-header-view {
  display: none;
}

.desktop-header-view {
  display: block;
}

/* Banner section with solid navy dark blue background */
.event-header-banner {
  background: linear-gradient(135deg, #0d0d0d 0%, #1a0a0a 60%, #0d0d0d 100%);
  color: #ffffff;
  padding: 20px 0 50px; /* reduced top padding from 40px to 20px */
  margin-top: 80px;
  position: relative;
  overflow: hidden; /* prevents scaled blur overlay overflows */
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .event-header-banner {
    margin-top: 60px;
    padding: 20px 0 40px; /* reduced bottom padding on mobile */
  }
}

.banner-blur-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(40px); /* slightly blur image background */
  opacity: 0.25; /* soft color projection overlay */
  transform: scale(1.15); /* hides raw blur edges */
  z-index: 1;
  pointer-events: none;
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  z-index: 2; /* forces contents above the blur bg */
  margin-top: -10px; /* shift container upward slightly */
}

.header-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-btn-top {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
  font-weight: 700;
  align-self: flex-start;
  cursor: pointer;
  transition: color 0.2s;
  padding: 4px 0;
}
.back-btn-top:hover {
  color: #ffffff;
}

.header-event-title {
  font-size: 2rem;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.5px;
}

.banner-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 32px;
  align-items: stretch;
}

.banner-image-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1080/350;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.live-event-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 14px;
  border-radius: 20px;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  backdrop-filter: blur(8px);
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #ff3b30;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 8px #ff3b30;
}

/* Floating metadata details card */
.details-card-floating {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  color: #334155;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  z-index: 10;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 4px 0;
}

.detail-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.detail-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.detail-value {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.venue-link {
  text-decoration: none;
  color: #1e293b;
  transition: color 0.2s;
}

.venue-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

.venue-address {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  line-height: 1.3;
  margin-top: 2px;
}

.organizer-section-new {
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.org-label {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
}

.org-profile-new {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  background: transparent;
  padding: 4px 0;
}

.org-name-text {
  font-size: 0.92rem;
  font-weight: 700;
  color: #0f172a;
  margin-top: 4px;
  display: block;
}

.desktop-verified-icon {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(30%, -30%);
  color: #ffffff;
  background-color: #1d4ed8;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  padding: 3px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  z-index: 2;
  box-sizing: border-box;
}

.org-logo-new {
  width: 100px;
  height: auto;
  max-height: 80px;
  object-fit: contain;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.org-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
}

.org-name-text {
  font-size: 0.92rem;
  font-weight: 700;
  color: #0f172a;
}

.org-verified-badge {
  width: 16px;
  height: 16px;
  min-width: 16px;
  padding: 3px;
  background-color: #1d4ed8;
  color: #ffffff;
  border-radius: 50%;
  display: inline-flex;
  flex-shrink: 0;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(29, 78, 216, 0.35);
}

@media (max-width: 768px) {
  .org-logo-new {
    width: 80px;
    height: 80px;
  }
}

[data-theme="dark"] .organizer-section-new {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.sticky-tabs-nav-bar {
  position: sticky;
  top: 80px;
  z-index: 100;
  background: transparent;
  margin-top: -50px; /* pull up to overlap event-header-banner bottom padding */
  border-bottom: 1px solid transparent;
  box-shadow: none;
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .sticky-tabs-nav-bar {
    top: 60px;
    margin-top: 0 !important;
    background: #f1f5f9 !important;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
  }
  
  /* Mobile Event Header Layout Styling */
  .desktop-header-view {
    display: none !important;
  }
  
  .mobile-header-view {
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    padding: 16px 20px;
    margin-top: 60px; /* offset for top header bar */
  }
  
  .mobile-banner-container {
    width: 100%;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  .mobile-banner-img {
    width: 100%;
    aspect-ratio: 16 / 6.2;
    object-fit: cover;
    display: block;
  }
  
  .mobile-event-details-card {
    display: flex;
    flex-direction: column;
    padding: 18px 0 8px;
  }
  
  .mobile-event-title {
    font-size: 1.6rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.3;
    margin: 0 0 16px;
    letter-spacing: -0.5px;
  }
  
  .mobile-event-meta-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .mobile-meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .mobile-meta-icon {
    color: #8e9cae;
  }
  
  .mobile-meta-text {
    font-size: 1.05rem;
    font-weight: 600;
    color: #0f172a;
  }

  .mobile-meta-row.alignment-top {
    align-items: flex-start;
  }

  .flex-shrink-0 {
    flex-shrink: 0;
  }

  .mobile-venue-text-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mobile-venue-link {
    text-decoration: none;
    display: inline-block;
  }

  .mobile-venue-link:active, .mobile-venue-link:hover {
    color: var(--primary);
  }

  .mobile-venue-address {
    font-size: 0.85rem;
    font-weight: 500;
    color: #64748b;
    line-height: 1.3;
    margin-top: 2px;
  }
  
  .mobile-header-divider-dashed {
    border-top: 1.5px dashed #dbe1e8;
    margin: 18px 0;
    width: 100%;
  }
  
  .mobile-organizer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .mobile-organizer-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .mobile-organizer-logo-container {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 1px solid #e2e8f0;
    overflow: visible;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    position: relative;
    flex-shrink: 0;
  }

  .mobile-organizer-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  
  .mobile-organizer-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .mobile-org-label {
    font-size: 0.85rem;
    color: #64748b;
    font-weight: 600;
  }
  
  .mobile-org-name {
    font-size: 1.05rem;
    color: #0f172a;
    font-weight: 800;
  }

  .mobile-org-name-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mobile-verified-icon {
    color: #ffffff;
    background-color: #1d4ed8;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    padding: 2px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  .mobile-organizer-chat-btn {
    background: none;
    border: none;
    padding: 8px;
    color: #002d62;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }
  
  .mobile-organizer-chat-btn:active {
      transform: scale(0.95);
  }
  
  /* legacy badge class - no longer used */
  .mobile-verified-badge {
    display: none;
  }
  
  .tab-btn {
    color: #8e9cae !important;
  }
  
  .tab-btn:hover {
    color: #475569 !important;
  }
  
  .tab-btn.active {
    color: #0f172a !important;
  }
  
  .tab-btn.active::after {
    background-color: var(--primary) !important;
  }
  
  /* Mobile Bottom Checkout Bar overkendaraans */
  .desktop-bottom-bar-view {
    display: none !important;
  }
  
  .mobile-bottom-bar-view {
    display: block !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background-color: #ffffff; /* always white */
    border-top: 1px solid var(--border-color);
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.04);
    padding: 6px 16px 8px;
  }
  
  .mobile-bottom-bar-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .m-bottom-bar-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .m-bottom-bar-price-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .m-price-label {
    font-size: 0.6rem;
    color: var(--text-light, #6b6b6b);
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  
  .m-price-value {
    font-size: 1rem;
    font-weight: 900;
    color: var(--text-dark, #2A2A2A);
  }
  
  .m-bottom-bar-detail-link {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--primary, #C94C4C);
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
  }
  
  .m-detail-chevron {
    color: var(--primary, #C94C4C);
    margin-top: 1px;
    transition: transform 0.2s ease;
  }

  .m-detail-chevron.rotated {
    transform: rotate(180deg);
  }
  
  .m-bottom-bar-bottom-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  
  .m-buy-btn {
    flex-grow: 1;
    background-color: var(--primary, #C94C4C);
    color: #ffffff;
    padding: 14px 16px;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 800;
    text-align: center;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(201, 76, 76, 0.2);
    transition: transform 0.2s;
  }
  .m-buy-btn:active {
    transform: scale(0.98);
  }
}

/* Dark Theme Support for Mobile Event Header */
[data-theme="dark"] .mobile-header-view {
  background-color: var(--card-bg, #1a1a1a);
}

[data-theme="dark"] .mobile-event-title,
[data-theme="dark"] .mobile-meta-text,
[data-theme="dark"] .mobile-org-name {
  color: #f1f5f9;
}

[data-theme="dark"] .mobile-organizer-logo-container {
  border-color: rgba(255, 255, 255, 0.08);
  background-color: #1a1a1a;
}

[data-theme="dark"] .mobile-header-divider-dashed {
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .mobile-organizer-chat-btn {
  color: #3b82f6;
}

[data-theme="dark"] .sticky-tabs-nav-bar {
  background: var(--card-bg, #1a1a1a) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

[data-theme="dark"] .tab-btn {
  color: #71717a !important;
}

[data-theme="dark"] .tab-btn.active {
  color: #f4f4f5 !important;
}

[data-theme="dark"] .mobile-bottom-bar-view {
  background-color: var(--card-bg, #1a1a1a) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

[data-theme="dark"] .m-price-value,
[data-theme="dark"] .m-bottom-bar-detail-link,
[data-theme="dark"] .m-detail-chevron {
  color: #f1f5f9 !important;
}

[data-theme="dark"] .m-buy-btn {
  background-color: var(--primary, #C94C4C) !important;
  box-shadow: 0 4px 12px rgba(201, 76, 76, 0.3) !important;
}

/* ===== MOBILE BOTTOM SHEET ===== */
.mobile-sheet-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mobile-sheet-card {
  background-color: var(--card-bg, #FAF9F9);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 500px;
  padding: 20px;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

[data-theme="dark"] .mobile-sheet-card {
  background-color: var(--card-bg, #1a1a1a);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: none;
}

.mobile-sheet-drag-handle {
  width: 36px;
  height: 4px;
  background-color: #cbd5e1;
  border-radius: 2px;
  margin: 0 auto 12px;
}

[data-theme="dark"] .mobile-sheet-drag-handle {
  background-color: #475569;
}

.mobile-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
}

.mobile-sheet-title-group {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.mobile-sheet-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-dark, #2A2A2A);
  margin: 0;
}

.mobile-sheet-close-btn {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--text-light, #6b6b6b);
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px 8px;
}

.mobile-sheet-body {
  overflow-y: auto;
  flex-grow: 1;
  padding-bottom: 20px;
}

.mobile-sheet-detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Animations/Transitions for bottom sheet */
.sheet-fade-enter-active, .sheet-fade-leave-active {
  transition: opacity 0.25s ease;
}

.sheet-fade-enter-active .mobile-sheet-card,
.sheet-fade-leave-active .mobile-sheet-card {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.sheet-fade-enter-from, .sheet-fade-leave-to {
  opacity: 0;
}

.sheet-fade-enter-from .mobile-sheet-card,
.sheet-fade-leave-to .mobile-sheet-card {
  transform: translateY(100%);
}

/* When the tabs bar sticks */
.sticky-tabs-nav-bar.is-sticky {
  background: #f1f5f9; /* light grey #f1f5f9 */
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.08); /* smooth shadow */
  border-radius: 12px;
}

.tabs-navigation {
  display: flex;
  gap: 24px;
}

@media (max-width: 768px) {
  .tabs-navigation {
    gap: 16px;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    padding: 0 4px;
  }
  /* hide scrollbar for clean aesthetics */
  .tabs-navigation::-webkit-scrollbar {
    display: none;
  }
}

.tab-btn {
  color: rgba(255, 255, 255, 0.7); /* white translucent when transparent */
  font-size: 0.95rem;
  font-weight: 800;
  padding: 14px 0;
  position: relative;
  cursor: pointer;
  background: none;
  border: none;
  font-family: inherit;
  transition: color 0.2s ease;
}

@media (max-width: 768px) {
  .tab-btn {
    font-size: 0.8rem;
    padding: 10px 0;
  }
}
.tab-btn:hover {
  color: #ffffff;
}
.tab-btn.active {
  color: #ffffff;
}
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
}

/* Adjust tab button colors when sticky is active (light theme defaults) */
.sticky-tabs-nav-bar.is-sticky .tab-btn {
  color: #64748b;
}
.sticky-tabs-nav-bar.is-sticky .tab-btn:hover {
  color: #0f172a;
}
.sticky-tabs-nav-bar.is-sticky .tab-btn.active {
  color: var(--primary);
}

/* Dark theme overkendaraans for sticky tabs button colors */
[data-theme="dark"] .sticky-tabs-nav-bar.is-sticky .tab-btn {
  color: rgba(255, 255, 255, 0.6);
}
[data-theme="dark"] .sticky-tabs-nav-bar.is-sticky .tab-btn:hover {
  color: #ffffff;
}
[data-theme="dark"] .sticky-tabs-nav-bar.is-sticky .tab-btn.active {
  color: var(--primary);
}

/* Body container area styling */
.event-details-body {
  background: #f3f6fa; /* matched to transaction page background */
  padding: 40px 0 160px;
}

.body-content-grid {
  margin: 0 auto;
}

.details-left-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tab-card-content {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.section-card-title {
  font-size: 1.3rem;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 16px;
}

.rich-html-content {
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.7;
}

/* Voucher ticket component list */
.ticket-list-header {
  margin-bottom: 12px;
}

.ticket-count-label {
  font-size: 0.8rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ticket-description-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.ticket-description-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #334155;
  margin: 0;
  white-space: pre-line;
}

.detail-col-label {
  font-size: 0.75rem;
  color: #8a99ad;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.tickets-scroll-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ticket-card-voucher {
  position: relative;
  background: #ffffff;
  border-radius: 18px;
  border: none;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02); /* extra smooth shadow */
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}
.ticket-card-voucher:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Card Ticket Layout overkendaraans matching reference */
.ticket-card-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.ticket-top-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: #ffffff;
  transition: background-color 0.2s;
}
.ticket-top-section:hover {
  background: #fafafb;
}

.ticket-top-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ticket-top-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.ticket-vertical-divider {
  width: 1px;
  height: 38px;
  background-color: var(--border-color, #e2e8f0);
  margin-right: 4px;
}

.ticket-price-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.ticket-price-label {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.ticket-price-value-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ticket-price-value-wrapper .accordion-chevron-toggle {
  margin-left: 0;
  padding: 0;
}

.ticket-price-value {
  font-size: 1.45rem;
  font-weight: 900;
  color: #3f3f46;
}

/* Red / Green dot ticket status badge */
.ticket-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff1f2; /* soft red */
  color: #ef4444; /* red text */
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  align-self: flex-start;
}
.ticket-status-badge .status-dot {
  width: 6px;
  height: 6px;
  background-color: #ef4444;
  border-radius: 50%;
  display: inline-block;
}

/* Green available overkendaraans */
.ticket-status-badge:not(.sold-out) {
  background: #f0fdf4; /* soft green */
  color: #22c55e;
}
.ticket-status-badge:not(.sold-out) .status-dot {
  background-color: #22c55e;
}

/* Ticket Accordion Body Styling */
.ticket-accordion-body {
  background: #fcfcfd;
  padding: 0 28px 24px 28px;
  display: flex;
  flex-direction: column;
}

.accordion-section-divider {
  height: 1px;
  background-color: var(--border-color, #e2e8f0);
  margin: 16px 0;
  width: 100%;
}

/* Trip Status Dropdown Styles */
.trip-status-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.trip-status-dropdown-wrapper {
  width: 100%;
}

.trip-status-select {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  appearance: auto;
  -webkit-appearance: auto;
}

.trip-status-select:focus {
  outline: none;
  border-color: var(--primary, #C94C4C);
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.08);
}

[data-theme="dark"] .trip-status-select {
  background: #1a1a1a;
  color: #e4e4e7;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .trip-status-select:focus {
  border-color: var(--primary, #C94C4C);
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.15);
}

.trip-status-select-error {
  border-color: #dc2626 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12) !important;
}

.trip-status-select-error:focus {
  border-color: #dc2626 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15) !important;
}

.trip-type-error-text {
  margin-top: 6px;
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 500;
  display: block;
}

[data-theme="dark"] .trip-type-error-text {
  color: #fca5a5;
}

[data-theme="dark"] .trip-status-select-error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
}

.ticket-details-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  width: 100%;
}

.detail-col {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-col-label {
  font-size: 0.75rem;
  color: #8a99ad;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.calendar-detail-wrapper,
.session-detail-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Calendar paper sheet styling */
.calendar-sheet-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 58px;
  height: 64px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  padding: 4px 0;
  flex-shrink: 0;
}

.calendar-day-name {
  font-size: 0.65rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  line-height: 1.2;
}

.calendar-day-num {
  font-size: 1.35rem;
  font-weight: 900;
  color: #1e293b;
  line-height: 1;
}

.calendar-month-name {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--primary);
  text-transform: uppercase;
  line-height: 1.2;
}

/* Session badge box styling */
.session-badge-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 58px;
  height: 64px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  padding: 4px 0;
  flex-shrink: 0;
}

.session-label-top {
  font-size: 0.65rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  line-height: 1.2;
}

.session-value-mid {
  font-size: 1.35rem;
  font-weight: 900;
  color: #1d4ed8;
  line-height: 1;
}

.calendar-text-info,
.session-text-info {
  display: flex;
  flex-direction: column;
}

.info-bold-text {
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.4;
}

/* Fasilitas Shuttle Section styling */
.ticket-facilities-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.facilities-simple-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 6px;
}

.facility-simple-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.facility-icon-red {
  color: var(--primary, #C94C4C);
  flex-shrink: 0;
}

.facility-text {
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f172a;
}

/* Countdown text styling */
.countdown-text {
  color: inherit;
  font-family: 'Outfit', monospace;
  font-weight: 900;
  margin-left: 2px;
}

.ticket-action-select-btn-only {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* Responsive Overkendaraans */
@media (max-width: 768px) {
  .event-details-body {
    padding: 16px 0 120px;
  }
  
  .container {
    padding: 0 16px !important;
  }

  .ticket-card-voucher {
    border-radius: 12px;
  }

  .ticket-side-notch-left,
  .ticket-side-notch-right {
    width: 16px !important;
    height: 16px !important;
  }
  
  .ticket-side-notch-left {
    left: -8px !important;
  }
  
  .ticket-side-notch-right {
    right: -8px !important;
  }

  .ticket-top-section {
    padding: 12px 14px;
    flex-direction: row;
    align-items: center;
  }
  
  .ticket-category-title {
    font-size: 0.95rem; /* shrunken title to fit in one line */
  }

  .ticket-accordion-body {
    padding: 0 14px 12px 14px;
  }
  
  .ticket-details-row {
    gap: 12px 10px;
    flex-wrap: wrap;
  }

  .hari-konser-col {
    flex: 1 0 100% !important;
  }

  .detail-col {
    min-width: 0;
    flex: 1;
  }

  .detail-col-label {
    font-size: 0.62rem;
    letter-spacing: 0.5px;
  }

  .detail-col .session-detail-wrapper-simple,
  .detail-col .calendar-detail-wrapper-simple {
    gap: 8px;
  }

  .detail-col .info-bold-text {
    font-size: 0.68rem;
    line-height: 1.2;
  }

  .detail-col .detail-icon-red {
    flex-shrink: 0;
  }
  
  .calendar-sheet-box,
  .session-badge-box {
    width: 44px;
    height: 50px;
    border-radius: 8px;
  }
  
  .calendar-day-num,
  .session-value-mid {
    font-size: 1rem;
  }
  
  .info-bold-text {
    font-size: 0.78rem;
  }
  
  .ticket-bottom-section {
    padding: 12px 14px;
  }
  
  .ticket-bottom-footer-row {
    flex-direction: row !important; /* side by side layout on mobile to prevent wrapping */
    justify-content: space-between !important;
    align-items: center !important;
    gap: 8px !important;
    width: 100% !important;
  }
  
  .ticket-footer-vertical-divider {
    display: none;
  }
  
  .ticket-ending-details {
    align-items: flex-start !important;
    gap: 2px !important;
  }
  
  .ending-label {
    font-size: 0.55rem !important;
    letter-spacing: 0.2px;
  }
  
  .ending-value {
    font-size: 0.76rem !important;
    white-space: nowrap !important;
  }
  
  .ticket-action-select-btn-only {
    width: auto !important;
  }
  
  .ticket-action-select-btn-only .select-ticket-btn {
    width: auto !important;
    padding: 6px 12px !important;
    font-size: 0.78rem !important;
    border-radius: 8px !important;
    white-space: nowrap !important;
  }

  .tickets-list-wrapper {
    gap: 12px !important;
  }

  .facilities-simple-list {
    gap: 12px;
  }

  .facility-text {
    font-size: 0.78rem;
  }
}

/* Dark theme support */
[data-theme="dark"] .ticket-accordion-body {
  background: #151515;
}

[data-theme="dark"] .accordion-section-divider {
  background-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .calendar-sheet-box,
[data-theme="dark"] .session-badge-box {
  background: #252525;
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .calendar-day-num {
  color: #f3f4f6;
}

[data-theme="dark"] .session-value-mid {
  color: #60a5fa;
}

[data-theme="dark"] .info-bold-text {
  color: #e5e7eb;
}

[data-theme="dark"] .facility-text {
  color: #e2e8f0;
}

/* Ticket divider line & side notches */
.ticket-divider-row {
  position: relative;
  width: 100%;
  height: 0;
  z-index: 5;
}

.ticket-card-divider-dashed-line {
  border-top: 1.5px dashed var(--border-color);
  width: 100%;
  margin: 0;
}

.ticket-side-notch-left {
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background-color: #f5f5f5; /* Matches the outer-card-body background color #f5f5f5 */
  z-index: 10;
  box-shadow: inset -4px 0 6px rgba(0,0,0,0.06);
}

.ticket-side-notch-right {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background-color: #f5f5f5; /* Matches the outer-card-body background color #f5f5f5 */
  z-index: 10;
  box-shadow: inset 4px 0 6px rgba(0,0,0,0.06);
}

.ticket-notch {
  display: none;
}

/* Bottom section styles */
.ticket-bottom-section {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  padding: 24px 28px;
}

.ticket-bottom-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.ticket-ending-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ending-label {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ending-value {
  font-size: 0.95rem;
  font-weight: 800;
  color: #3f3f46;
}

.ticket-footer-vertical-divider {
  width: 1px;
  height: 48px;
  background-color: var(--border-color, #e2e8f0);
  margin: 0 16px;
  align-self: center;
}

.ticket-action-subtotal-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 18px;
  flex-shrink: 0;
}

.ticket-quantity-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ticket-quantity-row .quantity-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
}

.ticket-subtotal-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.subtotal-label {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
}

.subtotal-value {
  font-size: 1.25rem;
  font-weight: 900;
  color: #3f3f46;
}

.select-ticket-btn {
  padding: 10px 24px;
  background: var(--primary);
  color: #ffffff;
  font-family: inherit;
  font-weight: 800;
  font-size: 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-width: 120px;
  text-align: center;
}
.select-ticket-btn:hover:not(:disabled) {
  background: #b34242;
  transform: translateY(-1px);
}
.select-ticket-btn:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  border: 1px solid #e2e8f0;
}
.select-ticket-btn.selected {
  background: #10b981;
  color: #ffffff;
}

/* Dark theme support for ticket cards */
[data-theme="dark"] .ticket-top-section,
[data-theme="dark"] .ticket-bottom-section {
  background: var(--card-bg, #1a1a1a);
}

[data-theme="dark"] .ticket-top-section:hover {
  background: #252525;
}

[data-theme="dark"] .ticket-category-title,
[data-theme="dark"] .ticket-price-value,
[data-theme="dark"] .ending-value,
[data-theme="dark"] .subtotal-value {
  color: #e4e4e7;
}

[data-theme="dark"] .select-ticket-btn:disabled {
  background: #27272a;
  color: #71717a;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .ticket-status-badge {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}
[data-theme="dark"] .ticket-status-badge .status-dot {
  background-color: #f87171;
}

[data-theme="dark"] .ticket-status-badge:not(.sold-out) {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}
[data-theme="dark"] .ticket-status-badge:not(.sold-out) .status-dot {
  background-color: #4ade80;
}

/* Sidebar selected tickets container */
.sidebar-selected-ticket-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid var(--border-color);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 140px;
}

.sidebar-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1.5px solid #f1f5f9;
  padding-bottom: 12px;
}

.sidebar-card-title {
  font-size: 1.05rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
}

.edit-selection-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  background: none;
  border: none;
}
.edit-selection-btn:hover {
  text-decoration: underline;
}

.empty-selection-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  background: #f8fafc;
  border-radius: 14px;
  border: 1px dashed var(--border-color);
  text-align: center;
  gap: 10px;
}

.info-circle-icon {
  color: #94a3b8;
  background: #f1f5f9;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-text {
  font-size: 0.88rem;
  color: #64748b;
  font-weight: 600;
  margin: 0;
}

.selected-ticket-details-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Sidebar selected details results style */
.st-selected-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.st-compact-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.st-compact-price {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 700;
}

.selected-seats-summary-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px;
}

.result-item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 0.82rem;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}
.result-item-row.no-border {
  border-bottom: none;
  padding-bottom: 0;
}

.result-label {
  color: #64748b;
  font-weight: 600;
}

.result-val {
  color: #0f172a;
  font-weight: 700;
  text-align: right;
}

.seats-val {
  color: var(--primary);
  font-weight: 850;
  font-size: 0.85rem;
}

.no-seats-selected {
  color: #94a3b8;
  font-style: italic;
  font-weight: 500;
}

.sidebar-divider-dashed {
  border-top: 1.5px dashed var(--border-color);
  margin: 12px 0;
}

.pricing-summary-breakdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.price-summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 600;
}

.grand-total-row {
  font-size: 1rem;
  color: #0f172a;
  font-weight: 900;
  border-top: 1.5px solid #f1f5f9;
  padding-top: 8px;
  margin-top: 2px;
}

.checkout-submit-btn-sidebar {
  width: 100%;
  padding: 14px;
  background: var(--primary);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(201, 76, 76, 0.15);
  text-align: center;
}
.checkout-submit-btn-sidebar:hover:not(:disabled) {
  background: #b34242;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(201, 76, 76, 0.25);
}
.checkout-submit-btn-sidebar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Accordion Facilities styling */
.ticket-features-accordion-content {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color, #f1f5f9);
  border-bottom: 1px solid var(--border-color, #f1f5f9);
  padding-bottom: 14px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-toggle-accordion-details {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 800;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 6px;
  align-self: flex-start;
  transition: all 0.2s ease;
}

.btn-toggle-accordion-details:hover {
  color: #b34242;
  text-decoration: underline;
}

.btn-toggle-accordion-details .accordion-chevron-toggle {
  transition: transform 0.2s ease;
}

.btn-toggle-accordion-details .accordion-chevron-toggle.rotated {
  transform: rotate(180deg);
}

.accordion-quantity-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1.5px dashed var(--border-color);
}

.features-title {
  font-size: 0.8rem;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #475569;
  font-weight: 600;
}

.feature-icon {
  color: var(--primary);
}

.accordion-chevron-toggle {
  color: #64748b;
  cursor: pointer;
  transition: transform 0.2s;
  padding: 4px;
  margin-left: auto;
}

.accordion-chevron-toggle.rotated {
  transform: rotate(180deg);
}

/* Selected seatmap canvas container styles */
.selected-seatmap-canvas-container {
  padding: 24px;
  background: var(--card-bg, #ffffff);
  width: 100%;
  touch-action: none;
}

.mobile-seatmap-header {
  display: none;
}

.seatmap-canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1.5px dashed var(--border-color);
  padding-bottom: 16px;
  margin-bottom: 18px;
}

.seatmap-canvas-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.seatmap-canvas-ticket-name {
  font-size: 1.15rem;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 0;
}

.seatmap-canvas-badge {
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.btn-back-to-tickets {
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  background: none;
  border: 1.5px solid var(--primary);
  border-radius: 8px;
  padding: 6px 12px;
  transition: all 0.2s;
}
.btn-back-to-tickets:hover {
  background: var(--primary);
  color: #ffffff;
}

/* PP Step Indicator */
.pp-step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.pp-step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}
.pp-step-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  background: #e2e8f0;
  color: #94a3b8;
  flex-shrink: 0;
  transition: all 0.3s ease;
}
.pp-step-item.active .pp-step-circle {
  background: var(--primary, #2563eb);
  color: #fff;
}
.pp-step-item.completed .pp-step-circle {
  background: #10b981;
  color: #fff;
}
.pp-step-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.pp-step-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  transition: color 0.3s ease;
}
.pp-step-item.active .pp-step-title,
.pp-step-item.completed .pp-step-title {
  color: #0f172a;
}
.pp-step-count {
  font-size: 0.7rem;
  color: var(--primary, #2563eb);
  font-weight: 500;
}
.pp-step-connector {
  width: 24px;
  height: 2px;
  background: #e2e8f0;
  flex-shrink: 0;
  transition: background 0.3s ease;
}
.pp-step-connector.active {
  background: #10b981;
}
.pp-checkmark {
  font-size: 0.75rem;
}
/* PP Step Navigation Bar */
.pp-step-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  gap: 12px;
  position: sticky;
  bottom: 0;
  z-index: 15;
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.04);
}

/* Step indicator dots + label */
.pp-nav-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pp-steps-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pp-step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  transition: all 0.3s ease;
}

.pp-step-dot.active {
  background: linear-gradient(135deg, var(--primary, #C94C4C), #b73d3d);
  color: #fff;
  box-shadow: 0 2px 8px rgba(201, 76, 76, 0.3);
}

.pp-step-dot.inactive {
  background: #e2e8f0;
  color: #94a3b8;
}

.pp-step-dot.completed {
  background: #10b981;
  color: #fff;
}

.pp-step-line {
  width: 20px;
  height: 2px;
  background: #e2e8f0;
  border-radius: 2px;
}

.pp-step-line.completed {
  background: #10b981;
}

.pp-nav-label-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
  letter-spacing: -0.01em;
}

.pp-nav-seat-count {
  font-size: 0.72rem;
  background: rgba(201, 76, 76, 0.08);
  color: var(--primary, #C94C4C);
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.pp-nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .pp-nav-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

.pp-nav-btn {
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pp-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

.pp-nav-next {
  background: linear-gradient(135deg, var(--primary, #C94C4C), #b73d3d);
  color: #fff;
  box-shadow: 0 2px 8px rgba(201, 76, 76, 0.2);
}

.pp-nav-next:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(201, 76, 76, 0.3);
}

.pp-nav-back {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.pp-nav-back:hover {
  background: #e2e8f0;
}

.pp-nav-error {
  font-size: 0.72rem;
  color: #ef4444;
  font-weight: 600;
  max-width: 120px;
  text-align: right;
  line-height: 1.3;
}

/* Dark mode PP nav */
[data-theme="dark"] .pp-step-nav-bar {
  background: linear-gradient(135deg, #1e293b 0%, #1a2234 100%);
  border-top-color: rgba(255, 255, 255, 0.06);
  border-bottom-color: rgba(255, 255, 255, 0.04);
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .pp-nav-label-text {
  color: #e2e8f0;
}

[data-theme="dark"] .pp-nav-seat-count {
  background: rgba(201, 76, 76, 0.15);
}

[data-theme="dark"] .pp-nav-back {
  background: #334155;
  color: #cbd5e1;
  border-color: rgba(255, 255, 255, 0.06);
}

[data-theme="dark"] .pp-nav-back:hover {
  background: #475569;
}

[data-theme="dark"] .pp-step-dot.inactive {
  background: #334155;
  color: #64748b;
}

[data-theme="dark"] .pp-step-line {
  background: #334155;
}

.seatmap-canvas-body {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.inline-legends {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.inline-cabin-box {
  background: #f8fafc;
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-box {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #cbd5e1;
}

.legend-box.selected {
  background: #ef4444;
  border-color: #ef4444;
}

.legend-box.available {
  background: #ffffff;
}

.legend-box.occupied {
  background: #cbd5e1;
}

/* Bus grid alignment styling */
.bus-cabin-canvas-viewport {
  position: relative;
  width: 100%;
  height: 420px;
  overflow: hidden;
  background-color: #dbe1e8; /* Slate light blue-grey background matching the image */
  border: 1.5px solid var(--border-color);
  border-radius: 16px;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.02), 0 4px 14px rgba(0,0,0,0.05);
  transition: box-shadow 0.3s ease;
  cursor: grab;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none; /* disables browser gestures for custom touch panning */
}

.bus-cabin-canvas-viewport:active {
  cursor: grabbing;
}

.is-fullscreen-mode {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 99999 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  background: #f8fafc !important;
}

.mobile-legends-overlay,
.mobile-zoom-controls-overlay,
.sheet-drag-handle-area,
.mobile-seatmap-backdrop {
  display: none;
}

.canvas-zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  padding: 6px 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
}

/* Mobile Canvas Bottom Action Bar */
.canvas-bottom-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  position: sticky;
  bottom: 0;
  z-index: 20;
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.04);
  min-height: 60px;
}

.canvas-bottom-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.canvas-bottom-seat-count {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.canvas-bottom-total-price {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--primary, #C94C4C);
  letter-spacing: -0.02em;
}

.canvas-bottom-btn {
  padding: 11px 26px;
  background: linear-gradient(135deg, var(--primary, #C94C4C), #b73d3d);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  letter-spacing: -0.01em;
  box-shadow: 0 2px 8px rgba(201, 76, 76, 0.2);
}

.canvas-bottom-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.canvas-bottom-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(201, 76, 76, 0.35);
}

.canvas-bottom-btn:not(:disabled):active {
  transform: translateY(0px);
}

[data-theme="dark"] .canvas-bottom-action-bar {
  background: linear-gradient(135deg, #1e293b 0%, #1a2234 100%);
  border-top-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .canvas-bottom-seat-count {
  color: #94a3b8;
}

.zoom-control-btn {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  color: #334155;
}

.zoom-control-btn:hover {
  border-color: var(--primary);
  background: #fff5f5;
  color: var(--primary);
}

.zoom-control-btn.text-btn {
  width: auto;
  padding: 0 12px;
  font-size: 0.8rem;
  font-weight: 800;
  color: #475569;
}

.zoom-control-btn.text-btn:hover {
  color: var(--primary);
}

.bus-cabin-container {
  position: relative; /* relative parent for absolute coordinates */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 40px;
  z-index: 10;
}

.canvas-grid-bg {
  position: absolute;
  top: -3000px;
  bottom: -3000px;
  left: -3000px;
  right: -3000px;
  background-image: 
    linear-gradient(rgba(181, 184, 190, 0.778) 1px, transparent 1px),
    linear-gradient(90deg, rgba(181, 184, 190, 0.778) 1px, transparent 1px);
  background-size: 30px 30px;
  background-position: center center;
  z-index: -2;
  pointer-events: none;
}

.canvas-axis-x {
  position: absolute;
  top: 50%;
  left: -3000px;
  right: -3000px;
  height: 1px;
  background-color: rgba(181, 184, 190, 0.778); /* axis horizontal coordinate line */
  z-index: -1;
  pointer-events: none;
}

.canvas-axis-y {
  position: absolute;
  left: 50%;
  top: -3000px;
  bottom: -3000px;
  width: 1px;
  background-color: rgba(181, 184, 190, 0.778); /* axis vertical coordinate line */
  z-index: -1;
  pointer-events: none;
}

.bus-cockpit-front {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border-bottom: 1.5px dashed #cbd5e1;
  padding-bottom: 6px;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 850;
  margin-bottom: 4px;
}

.bus-grid-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seat-pair-col {
  display: flex;
  gap: 6px;
}

.door-placeholder-col {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px; /* equal to two seats + gap */
  height: 26px;
  font-size: 0.62rem;
  font-weight: 800;
  color: #94a3b8;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  background: #f1f5f9;
}

.row-num-badge {
  font-size: 0.68rem;
  font-weight: 800;
  color: #94a3b8;
  width: 14px;
  text-align: center;
}

.cabin-seat-btn {
  position: relative; /* important for absolute tooltip positioning */
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.65rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.cabin-seat-btn:hover:not(:disabled) {
  border-color: #c94c4c;
  background: #fff5f5;
}

.cabin-seat-btn.selected {
  background: #c94c4c !important;
  border-color: #c94c4c !important;
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(201, 76, 76, 0.2);
}

/* Tooltip styles */
.seat-tooltip {
  visibility: hidden;
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #0f172a;
  color: #ffffff;
  text-align: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.62rem;
  font-weight: 800;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  z-index: 100;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  pointer-events: none; /* so cursor clicks don't hit the tooltip */
}

/* Tooltip arrow */
.seat-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -4px;
  border-width: 4px;
  border-style: solid;
  border-color: #0f172a transparent transparent transparent;
}

.cabin-seat-btn:hover .seat-tooltip {
  visibility: visible;
  opacity: 1;
  transform: translateX(-50%) translateY(-2px);
}

.cabin-seat-btn:disabled {
  background: #cbd5e1;
  border-color: #cbd5e1;
  color: #64748b;
  cursor: not-allowed;
}

.seat-cross {
  font-size: 0.62rem;
}

.quantity-counter-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 4px;
  align-self: flex-start;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #0f172a;
  font-size: 1.15rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
}
.qty-btn:hover:not(:disabled) {
  background: #e2e8f0;
}
.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-val {
  font-size: 1.05rem;
  font-weight: 800;
  min-width: 24px;
  text-align: center;
}

.sidebar-form-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  font-family: inherit;
  font-size: 0.88rem;
  outline: none;
  transition: all 0.2s;
}
.sidebar-form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(201, 76, 76, 0.08);
}
.sidebar-form-input.has-error {
  border-color: #ef4444;
}

.form-field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 4px;
}

.form-subheader {
  font-size: 0.85rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 10px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.form-error-text {
  font-size: 0.7rem;
  font-weight: 700;
  color: #ef4444;
  margin-top: 2px;
  display: block;
}

/* ===== PAYMENT MODAL ===== */
.payment-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  padding: 20px;
}

.payment-modal {
  background: #ffffff;
  width: 100%;
  max-width: 440px;
  border-radius: 20px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1.5px solid #f1f5f9;
}

.pm-header h3 {
  font-size: 1.05rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
}

.pm-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
}

.pm-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pm-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.pm-total span {
  font-size: 0.85rem;
  color: #475569;
  font-weight: 700;
}

.pm-total strong {
  font-size: 1.2rem;
  font-weight: 900;
  color: #0f172a;
}

.pm-methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pm-method-label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.pm-method-label:hover {
  background: #f8fafc;
  border-color: var(--primary);
}

.pm-method-label.active {
  background: rgba(201, 76, 76, 0.03);
  border-color: var(--primary);
}

.pm-radio {
  display: none;
}

.pm-icon {
  font-size: 1.3rem;
}

.pm-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: #0f172a;
}

.pm-check {
  margin-left: auto;
  color: var(--primary);
}

.pm-footer {
  padding: 14px 20px;
  border-top: 1.5px solid #f1f5f9;
  background: #f8fafc;
}

.pm-submit-btn {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(201, 76, 76, 0.15);
}

.pm-submit-btn:hover:not(:disabled) {
  background: #b34242;
  transform: translateY(-1px);
}

.pm-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


/* Modal Fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Onpage Form Section */
.booking-onpage-form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.onpage-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.onpage-form-title {
  font-size: 1.25rem;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 0;
}

.selected-ticket-info-pill {
  background: var(--bg-color);
  border: 1.5px solid var(--border-color);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--primary);
}

.onpage-form-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  border: 1.5px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.onpage-form-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  align-items: start;
}

/* Step 1 Two-Column Layout Grid */
.step1-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 28px;
  align-items: start;
  width: 100%;
}

.step1-left-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.step1-right-col {
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 150px;
  align-self: start;
  z-index: 10;
  transition: top 0.3s ease;
}

@media (max-width: 992px) {
  .step1-right-col {
    position: relative;
    top: 0;
  }
}

.sticky-summary-card {
  position: relative;
  top: 0;
}

.empty-summary-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: #fafafb;
  text-align: center;
  gap: 12px;
}

/* Tiket Terpilih Card in Step 1 */
.selected-summary-card {
  background: #ffffff;
  border-radius: 14px;
  border: none;
  box-shadow: 0 4px 18px -4px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}

/* Outer wrapper for Tiket Dipilih - same style as filter outer cards */
.summary-outer-card {
  margin-bottom: 0;
}

/* Scrollable container: activates when >2 ticket categories */
.summary-items-scroll-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.summary-items-scroll-container.is-scrollable {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.summary-items-scroll-container.is-scrollable::-webkit-scrollbar {
  width: 4px;
}

.summary-items-scroll-container.is-scrollable::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

/* Summary ticket meta row */
.summary-ticket-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-left: 24px;
  margin-top: 2px;
  margin-bottom: 2px;
}

.summary-meta-info {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 700;
}

.summary-card-header {
  padding: 16px 24px;
  border-bottom: 1.5px dashed var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-card-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-card-title {
  font-size: 1.1rem;
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 0;
}

.summary-card-ticket-name {
  background: var(--bg-color);
  color: var(--primary);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.btn-edit-seats {
  color: var(--primary, #C94C4C);
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  background: none;
  border: none;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}
.btn-edit-seats:hover {
  text-decoration: underline;
  color: #b34242;
}

.edit-icon-svg {
  margin-top: 1px;
}

.summary-ticket-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.summary-ticket-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ticket-icon-svg {
  color: var(--primary, #C94C4C);
  flex-shrink: 0;
}

.summary-ticket-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.summary-ticket-badge-count {
  background-color: #ef4444; /* Red badge */
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-ticket-seats-row {
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 600;
  padding-left: 24px; /* Align nicely under name */
}

.summary-ticket-price-row {
  align-self: flex-end;
  font-size: 1.05rem;
  font-weight: 900;
  color: #0f172a;
}

.summary-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
}

.summary-total-label {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}

.summary-total-price {
  font-size: 1.15rem;
  font-weight: 950;
  color: #0f172a;
}

.sd-total-row {
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
  margin-top: 4px;
}

.summary-card-divider-dashes {
  border-top: 1px solid #f1f5f9;
  margin: 10px 0;
}

[data-theme="dark"] .summary-card-divider-dashes {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.summary-card-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.summary-info-label {
  color: #64748b;
  font-weight: 600;
}

.summary-info-value {
  color: #0f172a;
  font-weight: 800;
}

.highlighted-seats {
  color: var(--primary);
  background: rgba(201, 76, 76, 0.05);
  padding: 4px 10px;
  border-radius: 6px;
}

/* Step 2 Form Card Adjustments */
.btn-back-to-step1 {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  background: none;
  border: 1.5px solid var(--primary);
  border-radius: 8px;
  padding: 6px 12px;
  transition: all 0.2s;
}
.btn-back-to-step1:hover {
  background: var(--primary);
  color: #ffffff;
}

.summary-details-box {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.sd-label {
  color: #64748b;
  font-weight: 600;
}

.sd-value {
  color: #0f172a;
  font-weight: 800;
  text-align: right;
}

.seats-highlight {
  color: var(--primary);
}

/* Sticky Bottom Checkout Bar */
.desktop-bottom-bar-view {
  display: block;
}

.mobile-bottom-bar-view {
  display: none;
}

.booking-bottom-bar.desktop-bottom-bar-view {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: #ffffff; /* solid white */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1.5px solid var(--border-color);
  box-shadow: 0 -10px 30px rgba(201, 76, 76, 0.05);
  padding: 10px 0;
}

.bottom-bar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.bottom-bar-left {
  display: flex;
  flex-direction: column;
}

.bottom-bar-ticket-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bottom-bar-total-price {
  font-size: 1.5rem;
  font-weight: 950;
  color: var(--primary);
}

.bottom-bar-buy-btn {
  background: var(--primary);
  color: #ffffff;
  padding: 14px 44px;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 800;
  box-shadow: var(--shadow-btn);
  cursor: pointer;
  transition: all 0.2s;
}
.bottom-bar-buy-btn:hover:not(:disabled) {
  background: #b34242;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(201, 76, 76, 0.4);
}
.bottom-bar-buy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Bottom bar transition */
.bottom-bar-fade-enter-active,
.bottom-bar-fade-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
}
.bottom-bar-fade-enter-from,
.bottom-bar-fade-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Responsive queries */
@media (max-width: 992px) {
  .step1-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .banner-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .banner-image-container {
    height: 240px;
  }
  


  .onpage-form-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 576px) {
  .banner-image-container {
    height: 180px;
  }

  .bottom-bar-container {
    padding: 0 20px;
  }

  .bottom-bar-total-price {
    font-size: 1.25rem;
  }

  .bottom-bar-buy-btn {
    padding: 10px 24px;
    font-size: 0.9rem;
  }

  /* Responsive Ticket Category Card Overkendaraans (Mobile) */
  .ticket-top-section {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0 !important;
    padding: 16px 20px !important;
  }

  .ticket-top-left {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100% !important;
    border-bottom: 1.5px dashed var(--border-color, #e2e8f0);
    padding-bottom: 14px;
    margin-bottom: 14px;
  }

  .ticket-top-right {
    width: 100% !important;
    justify-content: flex-start !important;
    gap: 0 !important;
  }

  .ticket-vertical-divider {
    display: none !important;
  }

  .ticket-price-box {
    display: flex;
    flex-direction: column;
    align-items: flex-start !important;
    width: 100% !important;
  }

  .ticket-price-value-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between !important;
    width: 100% !important;
  }

  .ticket-price-value {
    font-size: 1.05rem !important;
  }

  .ticket-price-label {
    font-size: 0.62rem !important;
  }

  .ticket-price-value-wrapper .accordion-chevron-toggle {
    margin-left: 0 !important;
  }

  .features-title {
    font-size: 0.72rem !important;
  }

  .feature-item {
    font-size: 0.72rem !important;
  }

  .ticket-bottom-section {
    padding: 16px 20px !important;
  }

  .ticket-bottom-footer-row {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: flex-end !important;
    gap: 12px !important;
    width: 100% !important;
  }

  .ticket-footer-vertical-divider {
    display: none !important;
  }

  .ticket-ending-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 2px;
  }

  .ticket-ending-details .ending-label {
    font-size: 0.55rem !important;
  }

  .ticket-ending-details .ending-value {
    font-size: 0.68rem !important;
    font-weight: 800 !important;
  }

  .ticket-action-subtotal-group {
    width: auto !important;
    align-items: flex-end !important;
    gap: 8px !important;
  }

  .ticket-quantity-row {
    justify-content: flex-end !important;
    width: auto !important;
    margin: 0 !important;
  }

  .ticket-quantity-row .quantity-counter-wrapper {
    padding: 2px !important;
    gap: 6px !important;
    border-radius: 8px !important;
    width: fit-content !important;
  }

  .ticket-quantity-row .qty-btn {
    width: 24px !important;
    height: 24px !important;
    font-size: 0.8rem !important;
    border-radius: 6px !important;
  }

  .ticket-quantity-row .qty-val {
    font-size: 0.8rem !important;
    min-width: 16px !important;
  }

  .select-ticket-btn {
    width: auto !important;
    min-width: 90px !important;
    text-align: center;
    padding: 6px 14px !important;
    font-size: 0.8rem !important;
    min-height: 32px !important;
    border-radius: 8px !important;
  }

  .step1-right-col {
    display: none !important;
  }
}

@media (max-width: 480px) {
  /* Inherit mobile styling from 576px */
}

/* ===== FULLSCREEN seatMAP MODAL ===== */
.fullscreen-seatmap-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.fullscreen-seatmap-card {
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  background-color: var(--card-bg, #ffffff);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.fullscreen-card-header {
  padding: 20px 28px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--card-bg, #ffffff);
}

.fullscreen-header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.fullscreen-title {
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--text-dark, #0f172a);
  margin-bottom: 0;
}

.fullscreen-selected-seats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fs-seats-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-light, #64748b);
}

.fs-seats-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.fs-seat-pill {
  background-color: #2563eb; /* Blue seat pills matching second mockup */
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 9999px;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.fullscreen-close-btn-top {
  background: none;
  border: none;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-light, #64748b);
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s;
}
.fullscreen-close-btn-top:hover {
  color: var(--primary, #C94C4C);
  transform: scale(1.1);
}

.fs-viewport {
  flex-grow: 1;
  height: auto; /* overkendaraan 420px limit */
  min-height: 0;
  background-color: #dbe1e8; /* Slate light blue-grey background */
  border-left: none;
  border-right: none;
  border-radius: 0;
}

.fs-floating-controls {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  padding: 4px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.fs-float-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #334155;
  transition: all 0.2s;
  font-weight: 900;
}
.fs-float-btn:hover {
  border-color: var(--primary, #C94C4C);
  background-color: #fff5f5;
  color: var(--primary, #C94C4C);
}

.fullscreen-card-footer {
  padding: 16px 28px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background-color: var(--card-bg, #ffffff);
  display: flex;
  justify-content: center;
}

.fullscreen-close-btn-bottom {
  width: 100%;
  padding: 14px;
  background-color: var(--primary, #C94C4C);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(201, 76, 76, 0.25);
}
.fullscreen-close-btn-bottom:hover {
  background-color: #b34242;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(201, 76, 76, 0.35);
}

/* Dark theme overkendaraans for fullscreen modal */
[data-theme="dark"] .fullscreen-seatmap-card {
  background-color: var(--card-bg, #1a1a1a);
  border-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .fullscreen-card-header,
[data-theme="dark"] .fullscreen-card-footer {
  background-color: var(--card-bg, #1a1a1a);
  border-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .fs-floating-controls {
  background-color: rgba(26, 26, 26, 0.85);
}
[data-theme="dark"] .fs-float-btn {
  background-color: #1a1a1a;
  border-color: #334155;
  color: #f1f5f9;
}

/* Responsive fullscreen queries */
@media (max-width: 768px) {
  .fullscreen-seatmap-overlay {
    padding: 12px;
  }
  .fullscreen-seatmap-card {
    height: 95vh;
    border-radius: 16px;
  }
  .fullscreen-card-header {
    padding: 16px 20px;
  }
  .fullscreen-title {
    font-size: 1.2rem;
  }
  .fs-floating-controls {
    top: 16px;
    right: 16px;
  }
  
  /* ===========================================================
   * BOTTOM SHEET - Mobile seatmap Drawer
   * =========================================================== */

  /* Backdrop overlay */
  .mobile-seatmap-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.52);
    z-index: 1998;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: backdropFadeIn 0.28s ease forwards;
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes backdropFadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  .mobile-seatmap-backdrop.is-closing {
    animation: backdropFadeOut 0.35s ease forwards;
    pointer-events: none;
  }

  /* Outer shell — transparent, so drag handle floats above white card */
  .selected-seatmap-canvas-container {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    /* Extra height to give the handle room above the card */
    height: calc(92vh + 0px);
    max-height: 94vh;
    z-index: 1999;
    background: transparent;   /* transparent — card below handles bg */
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow: visible;           /* allow handle to float above */
    animation: sheetSlideUp 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }

  .selected-seatmap-canvas-container.is-closing {
    animation: sheetSlideDown 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards !important;
    pointer-events: none;
  }

  @keyframes sheetSlideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes sheetSlideDown {
    from { transform: translateY(0); }
    to { transform: translateY(100%); }
  }

  /* Drag handle — floats in the dark backdrop above the white card */
  .sheet-drag-handle-area {
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 12px 0 10px;
    cursor: grab;
    touch-action: none;
    flex-shrink: 0;
    background: transparent;   /* transparent — shows backdrop behind */
    z-index: 1;
  }

  .sheet-drag-handle-area:active {
    cursor: grabbing;
  }

  .sheet-drag-handle-pill {
    width: 42px;
    height: 5px;
    border-radius: 100px;
    background-color: rgba(255, 255, 255, 0.55);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  }

  /* White card — the actual visible bottom sheet content */
  .sheet-inner-card {
    flex: 1;
    background-color: var(--bg-color, #FFF8F8);
    border-radius: 20px 20px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.22), 0 -2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Mobile header inside the inner card */
  .sheet-inner-card .seatmap-canvas-header {
    display: none !important;
  }

  .mobile-seatmap-header {
    display: flex !important;
    align-items: center;
    gap: 12px;
    padding: 8px 16px 10px;
    background-color: var(--bg-color, #FFF8F8);
    border-bottom: 1px solid var(--border-color);
    width: 100%;
    z-index: 30;
    flex-shrink: 0;
  }

  .btn-close-seatmap-mobile {
    background: rgba(0, 0, 0, 0.06);
    border: none;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-dark, #2A2A2A);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 5px 8px;
    border-radius: 8px;
    transition: background 0.2s, transform 0.2s;
  }

  .btn-close-seatmap-mobile:active {
    transform: scale(0.92);
    background: rgba(0, 0, 0, 0.12);
  }

  .mobile-seatmap-header-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-dark, #2A2A2A);
    margin-bottom: 0;
  }
  
  /* seatmap body (canvas area) inside the inner card */
  .sheet-inner-card .seatmap-canvas-body {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    margin-top: 0;
    position: relative;
    overflow: hidden;
  }
  
  .sheet-inner-card .bus-cabin-canvas-viewport {
    flex-grow: 1;
    height: 100% !important;
    min-height: 0 !important;
    width: 100% !important;
    border: none;
    border-radius: 0;
    margin: 0;
    touch-action: none;
  }
  
  .sheet-inner-card .canvas-zoom-controls {
    display: none !important;
  }

  .sheet-inner-card .inline-legends {
    display: none !important;
  }

  /* Floating legend overlay inside canvas on mobile */
  .sheet-inner-card .mobile-legends-overlay {
    display: flex !important;
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 25;
    background-color: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 10px;
    padding: 6px 10px;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    pointer-events: auto;
  }

  .sheet-inner-card .mobile-legends-overlay .legend-item {
    font-size: 0.6rem !important;
    gap: 3px !important;
  }

  .sheet-inner-card .mobile-legends-overlay .legend-box {
    width: 9px !important;
    height: 9px !important;
  }

  /* Floating zoom controls overlay */
  .sheet-inner-card .mobile-zoom-controls-overlay {
    display: flex !important;
    flex-direction: column;
    gap: 5px;
    position: absolute;
    bottom: 90px;
    right: 14px;
    z-index: 25;
    background-color: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 20px;
    padding: 6px;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }

  .sheet-inner-card .mobile-zoom-controls-overlay .m-zoom-btn {
    width: 28px !important;
    height: 28px !important;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: #ffffff;
    border: none;
    font-size: 0.85rem !important;
    cursor: pointer;
    color: var(--text-dark);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 0 !important;
  }
  
  /* Confirm bar at the bottom of the sheet */
  .mobile-canvas-confirm-bar {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--card-bg, #FAF9F9);
    border-top: 1.5px solid var(--border-color);
    padding: 10px 14px;
    z-index: 2100;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04);
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .m-confirm-bar-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .m-confirm-label {
    font-size: 0.58rem;
    color: var(--text-light, #6b6b6b);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .m-confirm-value {
    font-size: 1rem;
    font-weight: 900;
    color: var(--text-dark, #2A2A2A);
  }
  
  .btn-confirm-seats-mobile {
    width: auto !important;
    min-width: 110px;
    padding: 9px 20px !important;
    background-color: var(--primary, #C94C4C);
    color: #ffffff;
    font-weight: 800;
    font-size: 0.9rem;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    box-shadow: var(--shadow-btn);
    transition: transform 0.2s;
  }

  .btn-confirm-seats-mobile:disabled {
    background-color: #cbd5e1 !important;
    color: #94a3b8 !important;
    cursor: not-allowed;
    box-shadow: none !important;
  }
  
  .btn-confirm-seats-mobile:active:not(:disabled) {
    transform: scale(0.98);
  }
}

/* Dark theme overkendaraans for mobile canvas confirm bar */
[data-theme="dark"] .mobile-canvas-confirm-bar {
  background-color: var(--card-bg, #1a1a1a) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

[data-theme="dark"] .m-confirm-value {
  color: #f1f5f9 !important;
}

[data-theme="dark"] .sheet-inner-card .mobile-zoom-controls-overlay,
[data-theme="dark"] .sheet-inner-card .mobile-legends-overlay {
  background-color: rgba(26, 26, 26, 0.9) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

[data-theme="dark"] .sheet-inner-card .mobile-zoom-controls-overlay .m-zoom-btn {
  background-color: #252525 !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: #f1f5f9 !important;
}

[data-theme="dark"] .mobile-seatmap-header {
  background-color: var(--card-bg, #1a1a1a) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

[data-theme="dark"] .btn-close-seatmap-mobile,
[data-theme="dark"] .mobile-seatmap-header-title {
  color: #f1f5f9 !important;
}

[data-theme="dark"] .btn-close-seatmap-mobile {
  background: rgba(255, 255, 255, 0.08) !important;
}

/* Inner card gets dark background */
[data-theme="dark"] .sheet-inner-card {
  background-color: var(--bg-color, #121212) !important;
}

/* Drag handle pill stays white/light on dark */
[data-theme="dark"] .sheet-drag-handle-pill {
  background-color: rgba(255, 255, 255, 0.35) !important;
}

/* Dark theme overkendaraans for desktop canvas overlays */
[data-theme="dark"] .inline-legends,
[data-theme="dark"] .canvas-zoom-controls {
  background-color: rgba(26, 26, 26, 0.95) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}

[data-theme="dark"] .inline-legends {
  color: #94a3b8 !important;
}

[data-theme="dark"] .zoom-control-btn {
  background-color: #252525 !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  color: #f1f5f9 !important;
}

[data-theme="dark"] .zoom-control-btn:hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border-color: var(--primary) !important;
  color: var(--primary) !important;
}

[data-theme="dark"] .zoom-control-btn.text-btn {
  color: #cbd5e1 !important;
}

[data-theme="dark"] .zoom-control-btn.text-btn:hover {
  color: var(--primary) !important;
}

/* Prevent main page scrolling when sheet is open */
html.lock-scroll, body.lock-scroll {
  overflow: hidden !important;
  height: 100vh !important;
  position: relative !important;
  touch-action: none;
}

/* Button Edit / Delete style additions */
.btn-delete-ticket-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--primary, #C94C4C);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-left: auto;
}

.btn-delete-ticket-summary:hover {
  background-color: #fee2e2;
  color: #b91c1c;
}

[data-theme="dark"] .btn-delete-ticket-summary:hover {
  background-color: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.btn-edit-seats-mobile {
  color: var(--primary, #C94C4C);
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  background: none;
  border: 1px solid var(--primary, #C94C4C);
  border-radius: 8px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  margin-left: auto;
  margin-right: 8px;
}

.btn-edit-seats-mobile:hover,
.btn-edit-seats-mobile.is-editing {
  background: var(--primary, #C94C4C);
  color: #ffffff;
}

[data-theme="dark"] .btn-edit-seats-mobile {
  border-color: var(--primary, #C94C4C);
  color: var(--primary, #C94C4C);
}

.btn-edit-seats.is-editing {
  border: 1px solid var(--primary, #C94C4C);
  border-radius: 8px;
  padding: 4px 10px;
}
.btn-edit-seats.is-editing:hover {
  background: var(--primary, #C94C4C);
  color: #ffffff !important;
}
/* Mock Filters Styles */
.ticket-list-header {
  margin-bottom: 24px;
}

.ticket-filters-wrapper {
  background: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.01);
}

.filter-section-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filter-section-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.date-filters-row,
.sesi-filters-row {
  display: flex;
  gap: 16px;
  width: 100%;
}

.date-filter-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  height: 90px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.date-filter-btn:hover:not(.active) {
  border-color: var(--primary, #C94C4C);
  background: #fafafb;
  transform: translateY(-1px);
}

.date-filter-btn.active {
  background: var(--primary, #C94C4C);
  color: #ffffff;
  border-color: var(--primary, #C94C4C);
  box-shadow: 0 4px 14px rgba(201, 76, 76, 0.25);
}

.date-btn-label {
  font-size: 1.05rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.date-btn-sub {
  font-size: 0.8rem;
  opacity: 0.8;
  font-weight: 600;
}

.date-filter-btn.active .date-btn-sub {
  color: rgba(255, 255, 255, 0.9);
}

.sesi-filter-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 16px;
  height: 110px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.sesi-filter-btn:hover:not(.active):not(.unavailable-session) {
  border-color: var(--primary, #C94C4C);
  background: #fafafb;
  transform: translateY(-1px);
}

.sesi-filter-btn.active {
  background: var(--primary, #C94C4C);
  color: #ffffff;
  border-color: var(--primary, #C94C4C);
  box-shadow: 0 4px 14px rgba(201, 76, 76, 0.25);
}

.sesi-title {
  font-size: 1.05rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.sesi-time {
  font-size: 0.8rem;
  opacity: 0.8;
  font-weight: 600;
}

.sesi-filter-btn.active .sesi-time {
  color: rgba(255, 255, 255, 0.9);
}

/* Session Availability Status Badges */
.session-status-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.session-status-badge.available {
  background: #dcfce7;
  color: #15803d;
}

.session-status-badge.unavailable {
  background: #fee2e2;
  color: #b91c1c;
}

/* Unavailable session overkendaraans */
.unavailable-session {
  background: #ffffff;
  border-color: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.8;
}

.unavailable-session .sesi-title {
  color: #94a3b8;
}

.unavailable-session .sesi-time {
  color: #cbd5e1;
}

/* Responsive Filters */
@media (max-width: 768px) {
  .ticket-filters-wrapper {
    padding: 12px;
    gap: 12px;
  }
  
  .date-filters-row,
  .sesi-filters-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .date-filter-btn {
    height: auto;
    padding: 10px;
    align-items: flex-start;
  }
  
  .sesi-filter-btn {
    height: auto;
    padding: 10px;
    min-height: 68px;
  }
  
  .session-status-badge {
    position: relative;
    top: 0;
    left: 0;
    margin-bottom: 6px;
    align-self: flex-start;
    font-size: 0.55rem;
    padding: 2px 6px;
  }
}

/* Dark mode overkendaraans for filters */
[data-theme="dark"] .ticket-filters-wrapper {
  background: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .filter-section-title {
  color: #f1f5f9;
}

[data-theme="dark"] .date-filter-btn,
[data-theme="dark"] .sesi-filter-btn {
  background: #252525;
  border-color: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

[data-theme="dark"] .date-filter-btn:hover:not(.active),
[data-theme="dark"] .sesi-filter-btn:hover:not(.active):not(.unavailable-session) {
  background: #2d2d2d;
  border-color: var(--primary, #C94C4C);
}

[data-theme="dark"] .date-filter-btn.active,
[data-theme="dark"] .sesi-filter-btn.active {
  background: var(--primary, #C94C4C);
  color: #ffffff;
  border-color: var(--primary, #C94C4C);
}

[data-theme="dark"] .unavailable-session {
  background: #1c1c1c;
  border-color: rgba(255, 255, 255, 0.04);
}

/* Outer Accordion Wrapper Styles */
.outer-section-group {
  margin-bottom: 28px;
}

.outer-section-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a; /* Matching screenshot dark text */
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.outer-accordion-card {
  background: #f8fafc; /* Matching screenshot body bg */
  border: none;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.01); /* smooth shadow */
}

.outer-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  cursor: pointer;
  background: #f5f5f5; /* Uniform wrapper bg matching body */
  user-select: none;
  transition: background-color 0.2s;
  border-bottom: none;
}

.outer-card-header:hover {
  background: #f1f5f9;
}

.outer-header-label {
  font-size: 0.95rem;
  font-weight: 800; /* Matching screenshot bold text */
  color: #0f172a; /* Matching screenshot dark text */
}

.outer-chevron {
  color: #0f172a; /* Matching screenshot chevron color */
  transition: transform 0.2s ease;
}

.outer-chevron.rotated {
  transform: rotate(180deg);
}

.outer-card-body {
  padding: 24px; /* Matching screenshot padding */
  background: #f5f5f5; /* Uniform wrapper bg matching body */
}

.filter-outer-body-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Inner Accordion for Filters */
.inner-filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding-bottom: 8px;
}

.inner-chevron {
  color: #64748b;
  transition: transform 0.2s ease;
}

.inner-chevron.rotated {
  transform: rotate(180deg);
}

/* Original Card Size Adjustments (Slightly Smaller & Tighter) */
.ticket-card-voucher {
  border-radius: 12px; /* reduced from 18px */
}

.ticket-category-title {
  font-size: 1.25rem; /* smaller, was default header h3 */
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0;
}

.ticket-top-section {
  padding: 16px 20px; /* reduced from 24px 28px */
}

.ticket-bottom-section {
  padding: 16px 20px; /* reduced from 24px 28px */
}

.ticket-accordion-body {
  padding: 0 20px 16px 20px; /* reduced from 0 28px 24px 28px */
}

.ticket-price-value {
  font-size: 1.25rem; /* reduced from 1.45rem */
}

/* Simple icons wrappers */
.calendar-detail-wrapper-simple,
.session-detail-wrapper-simple {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.detail-icon-red {
  color: var(--primary, #C94C4C);
  flex-shrink: 0;
}

.info-bold-text {
  font-size: 0.88rem; /* reduced from 0.95rem */
  font-weight: 800;
  color: #0f172a; /* matching bold value next to red icon */
}

.facility-badge-item {
  padding: 5px 12px; /* reduced from 6px 14px */
  font-size: 0.75rem; /* reduced from 0.78rem */
}

/* Dark theme support for outer accordion */
[data-theme="dark"] .outer-accordion-card,
[data-theme="dark"] .outer-card-header,
[data-theme="dark"] .outer-card-body {
  background: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .outer-card-header:hover {
  background: #222222;
}

[data-theme="dark"] .outer-card-title {
  color: #60a5fa;
}

[data-theme="dark"] .outer-header-label {
  color: #cbd5e1;
}

[data-theme="dark"] .outer-chevron {
  color: #cbd5e1;
}

[data-theme="dark"] .info-bold-text {
  color: #e4e4e7;
}

/* Smooth Accordion Height Transitions */
.expand-accordion-enter-active,
.expand-accordion-leave-active {
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  max-height: 1200px;
  overflow: hidden;
}

.expand-accordion-enter-from,
.expand-accordion-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* Premium Date Slider Styles (Image 3) */
.date-slider-container {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1.5px solid #f1f5f9;
  border-radius: 12px; /* Moderately rounded, uniform */
  padding: 12px 18px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
  width: 100%;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.date-slider-scroll {
  display: flex;
  gap: 12px;
  flex: 1;
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0 8px 0;
  -ms-overflow-style: auto;
  scrollbar-width: thin;
}

/* Beautiful custom scrollbar for date-slider-scroll */
.date-slider-scroll::-webkit-scrollbar {
  height: 6px;
}

.date-slider-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.date-slider-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.date-slider-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

[data-theme="dark"] .date-slider-scroll::-webkit-scrollbar-track {
  background: #27272a;
}

[data-theme="dark"] .date-slider-scroll::-webkit-scrollbar-thumb {
  background: #52525b;
}

[data-theme="dark"] .date-slider-scroll::-webkit-scrollbar-thumb:hover {
  background: #71717a;
}

.date-slider-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 76px;
  border-radius: 10px; /* Uniform moderate rounded */
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.date-slider-item:hover:not(.active):not(.disabled) {
  background: #f8fafc;
  color: #1e293b;
}

.date-slider-item.active {
  background: var(--primary, #C94C4C);
  color: #ffffff;
  box-shadow: 0 6px 18px -4px rgba(201, 76, 76, 0.35);
  transform: scale(1.03);
}

.date-slider-item.disabled {
  color: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.55;
}

.date-slider-day {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.date-slider-val {
  font-size: 0.95rem;
  font-weight: 800;
}

.date-slider-divider {
  width: 1px;
  height: 38px;
  background: #e2e8f0;
  margin: 0 16px;
  flex-shrink: 0;
}

/* Calendar Button Wrapper with absolute child */
.calendar-btn-wrapper {
  position: relative;
  display: inline-block;
}

.date-slider-calendar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px; /* Uniform rounded */
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.date-slider-calendar-btn:hover {
  border-color: var(--primary, #C94C4C);
  color: var(--primary, #C94C4C);
  background: #fafafb;
}

/* Mini Calendar Pop-up Card */
.mini-calendar-popup {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 99;
  width: 240px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px; /* Uniform moderate rounded */
  padding: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.mini-cal-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 6px;
}

.mini-cal-month {
  font-size: 0.85rem;
  font-weight: 800;
  color: #1e293b;
}

.mini-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 6px;
}

.mini-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.mini-cal-day-btn {
  border: none;
  background: transparent;
  height: 28px;
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #cbd5e1;
  box-sizing: border-box;
}

.mini-cal-day-btn.disabled {
  color: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.4;
}

.mini-cal-day-btn.is-concert {
  color: #1e293b;
  font-weight: 800;
}

.mini-cal-day-btn.is-concert:hover:not(.active) {
  background: #f1f5f9;
  color: var(--primary, #C94C4C);
}

.mini-cal-day-btn.active {
  background: var(--primary, #C94C4C);
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(201, 76, 76, 0.3);
}

/* Transition: fade-in-scale */
.fade-in-scale-enter-active,
.fade-in-scale-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-in-scale-enter-from,
.fade-in-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* Premium Session Selector Styles (Image 2 Redesigned) */
.session-section-wrapper {
  background: #f8fafc; /* Different background than date section */
  border: 1.5px solid #f1f5f9;
  border-radius: 12px; /* Moderately rounded, uniform */
  padding: 12px 16px; /* Smaller padding */
  box-shadow: none; /* No shadow to differentiate */
  width: fit-content; /* Custom size, non-uniform with date slider */
  max-width: 100%;
  margin-bottom: 8px; /* Reduced gap */
  box-sizing: border-box;
}

.session-section-header {
  margin-bottom: 10px;
}

.session-section-title {
  font-size: 0.88rem; /* Smaller font */
  font-weight: 800;
  color: #475569; /* Distinct title color */
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-pills-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.session-pill-btn {
  flex: 1;
  min-width: 130px;
  padding: 0;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

.session-pill-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  width: 100%;
  box-sizing: border-box;
}

.session-pill-btn:hover:not(.active):not(.unavailable-session) {
  border-color: var(--primary, #C94C4C);
  background: #f8fafc;
  color: var(--primary, #C94C4C);
}

.session-pill-btn.active {
  background: var(--primary, #C94C4C);
  color: #ffffff;
  border-color: var(--primary, #C94C4C);
  box-shadow: 0 4px 12px rgba(201, 76, 76, 0.2);
  transform: translateY(-1px);
}

.session-pill-name {
  font-size: 0.85rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
}

.session-pill-time {
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0.85;
  margin-top: 1px;
}

.session-pill-status {
  font-size: 0.52rem;
  font-weight: 800;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 4px;
  padding: 2px 4px;
  margin-top: 3px;
  text-transform: uppercase;
}

.session-pill-btn.unavailable-session {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.6;
}

/* UX Visual Indicator: Session Status Dot */
.session-status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}
.session-status-dot.available {
  background: #22c55e;
}
.session-status-dot.unavailable {
  background: #ef4444;
}
.session-pill-btn.active .session-status-dot.available {
  background: #4ade80; /* lighter green on active red background */
}
.session-pill-btn.active .session-status-dot.unavailable {
  background: #f87171; /* lighter red on active red background */
}

/* Session pill 2-column layout */
.session-pill-cols {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-top: 2px;
  width: 100%;
}
.sp-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  line-height: 1.15;
}
.sp-col-label-top {
  font-size: 0.5rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.5;
}
.sp-col-label-bot {
  font-size: 0.42rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
  margin-bottom: 1px;
}
.sp-col-time {
  font-size: 0.7rem;
  font-weight: 700;
}
.sp-col-divider {
  width: 1px;
  background: currentColor;
  opacity: 0.2;
  margin: 2px 4px;
  flex-shrink: 0;
}
.session-pill-btn.active .sp-col-label-top,
.session-pill-btn.active .sp-col-label-bot {
  opacity: 0.75;
}
/* Reduced Spacing between Filters Outer Group and seated Group */
.outer-section-group.filters-group {
  margin-bottom: 12px;
}

/* Responsive Overkendaraans */
@media (max-width: 768px) {
  .date-slider-container {
    padding: 8px 10px;
    margin-bottom: 12px;
  }
  
  .date-slider-item {
    width: 44px;
    height: 56px;
    border-radius: 6px;
  }
  
  .date-slider-day {
    font-size: 0.58rem;
    margin-bottom: 1px;
  }
  
  .date-slider-val {
    font-size: 0.72rem;
  }
  
  .date-slider-divider {
    margin: 0 8px;
    height: 22px;
  }
  
  .date-slider-calendar-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }
  
  .date-slider-calendar-btn svg {
    width: 16px;
    height: 16px;
  }
  
  .session-section-wrapper {
    padding: 10px 12px;
    margin-bottom: 8px;
    width: 100%; /* Spans full-width on mobile */
  }
  
  .session-section-title {
    font-size: 0.8rem;
  }
  
  .session-pills-row {
    gap: 8px;
    flex-wrap: nowrap;
    overflow-x: auto;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .session-pills-row::-webkit-scrollbar {
    display: none;
  }
  
  .session-pill-btn {
    flex: none;
    width: 160px;
    border-radius: 8px;
  }
  
  .session-pill-inner {
    padding: 8px 10px;
  }

  .session-pill-name {
    font-size: 0.7rem;
    margin-bottom: 3px;
  }

  .sp-col {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    line-height: 1.2;
  }
  .sp-col-label-top {
    display: block;
    font-size: 0.44rem;
    margin-bottom: 1px;
  }
  .sp-col-label-bot {
    font-size: 0.48rem;
    margin-bottom: 1px;
    white-space: nowrap;
  }
  .sp-col-time {
    font-size: 0.62rem;
    white-space: nowrap;
  }
  .sp-col-divider {
    margin: 2px 4px;
  }
  
  .session-status-dot {
    width: 4px;
    height: 4px;
    margin-right: 4px;
  }
  
  .session-pill-time {
    font-size: 0.6rem;
  }
}

@media (max-width: 480px) {
  .mini-calendar-popup {
    width: 220px;
    padding: 8px;
  }
  .mini-cal-day-btn {
    height: 24px;
    width: 24px;
    font-size: 0.7rem;
  }
}

/* Dark theme overkendaraans */
[data-theme="dark"] .date-slider-container {
  background: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .session-section-wrapper {
  background: #18181b; /* Dark neutral background for distinction */
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .date-slider-item:hover:not(.active):not(.disabled) {
  background: #252525;
  color: #cbd5e1;
}

[data-theme="dark"] .date-slider-item.disabled {
  color: #4b5563;
}

[data-theme="dark"] .date-slider-divider {
  background: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .date-slider-calendar-btn {
  background: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

[data-theme="dark"] .date-slider-calendar-btn:hover {
  background: #252525;
  border-color: var(--primary, #C94C4C);
}

[data-theme="dark"] .mini-calendar-popup {
  background: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .mini-cal-month {
  color: #e2e8f0;
}

[data-theme="dark"] .mini-cal-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .mini-cal-day-btn.disabled {
  color: #4b5563;
}

[data-theme="dark"] .mini-cal-day-btn.is-concert {
  color: #e2e8f0;
}

[data-theme="dark"] .mini-cal-day-btn.is-concert:hover:not(.active) {
  background: #2d2d2d;
}

[data-theme="dark"] .session-section-title {
  color: #94a3b8;
}

[data-theme="dark"] .session-pill-btn {
  background: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

[data-theme="dark"] .session-pill-btn:hover:not(.active):not(.unavailable-session) {
  background: #252525;
  border-color: var(--primary, #C94C4C);
}

[data-theme="dark"] .session-pill-btn.unavailable-session {
  background: #18181b;
  border-color: rgba(255, 255, 255, 0.04);
  color: #52525b;
}

[data-theme="dark"] .session-pill-status {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

/* ============================================
   YouTube Floating Volume Button
   ============================================ */

/* Hidden audio-only iframe */
.yt-music-iframe {
  position: fixed;
  width: 1px;
  height: 1px;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
  border: none;
}

/* Floating button — sits just above the bottom checkout bar,
   vertically aligned with the "Pilih seat" button on the right */
.yt-vol-btn {
  position: fixed;
  /* Desktop: bottom bar is ~76px tall, raised higher and shifted left */
  bottom: 96px;
  right: 40px;
  z-index: 9999;

  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  padding: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--primary, #C94C4C);
  color: #fff;
  cursor: pointer;

  box-shadow: 0 4px 16px rgba(201, 76, 76, 0.4);
  transition: background 0.2s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, opacity 0.35s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.35s ease;
}

/* Hide on mobile when seatmap is active with smooth transition */
.yt-vol-btn.hide-mobile-seatmap {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.8);
}

.yt-vol-btn:hover {
  background: #b03535;
  box-shadow: 0 6px 22px rgba(201, 76, 76, 0.5);
  transform: scale(1.07);
}

.yt-vol-btn:active {
  transform: scale(0.93);
  box-shadow: 0 2px 8px rgba(201, 76, 76, 0.35);
}

/* Muted: dimmed so user knows music is off */
.yt-vol-btn.muted {
  background: #c94c4c;
  opacity: 0.4;
  box-shadow: none;
}

.yt-vol-btn.muted:hover {
  opacity: 0.7;
  transform: scale(1.05);
}

/* Mobile: bottom bar is ~88px tall, raised higher and shifted left */
@media (max-width: 768px) {
  .yt-vol-btn {
    bottom: 112px;
    right: 20px;
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .yt-vol-btn {
    bottom: 112px;
    right: 20px;
    width: 38px;
    height: 38px;
  }
}

/* ==========================================================================
   MOBILE EVENT DETAIL REDESIGN & DRAWER STYLING (Aesthetic enhancements)
   ========================================================================== */
.mobile-redesign-layout {
  min-height: 100vh;
  background-color: #f1f5f9; /* slightly more grey background */
  padding-bottom: 96px; /* offset for bottom sticky footer */
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
}

.mobile-header-banner {
  position: relative;
  width: 100%;
  height: 56vw; /* Exact 16:9 ratio based on width */
  max-height: 240px;
  background: #e2e8f0;
  overflow: hidden;
  flex-shrink: 0;
}

.mobile-banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobile-back-circle-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 10;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
}
.mobile-back-circle-btn:active {
  background-color: #f1f5f9;
  transform: scale(0.92);
}

.mobile-gallery-row {
  display: flex;
  gap: 10px;
  padding: 8px 16px 0; /* tighter gap from top header image */
  background: #ffffff;
  overflow-x: auto;
  scrollbar-width: none; /* Hide scrollbar Firefox */
  -ms-overflow-style: none; /* Hide scrollbar IE 10+ */
  flex-shrink: 0;
  border-bottom: 1px solid #edf2f7; /* thin divider border */
}
.mobile-gallery-row::-webkit-scrollbar {
  display: none; /* Hide scrollbar Chrome/Safari */
}

.gallery-thumb {
  flex: 0 0 130px; /* Fixed width for horizontal scroll */
  height: 80px;
  object-fit: cover;
  border-radius: 10px;
  background: #e2e8f0;
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.last-thumb {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  height: 80px;
  flex: 0 0 130px; /* Fixed width for horizontal scroll */
}
.last-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 10px;
}

.mobile-tabs-container {
  display: flex;
  justify-content: flex-start;
  gap: 24px;
  background: #ffffff;
  margin-top: 0; /* no top margin so it touches gallery row background */
  border-bottom: 1px solid #edf2f7;
  position: sticky;
  top: 0;
  z-index: 50;
  flex-shrink: 0;
  padding: 8px 20px 4px; /* bottom padding and top padding for tabs layout alignment */
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.mobile-tab-btn {
  flex: initial;
  width: auto;
  padding: 12px 0;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.mobile-tab-btn.active {
  color: var(--primary, #c94c4c); /* changed to website red */
  border-bottom: none;
  font-weight: 700;
}
.mobile-tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: 32px; /* Short active indicator line */
  height: 3.5px;
  background-color: var(--primary, #c94c4c);
  border-radius: 2px;
}

.mobile-tab-body {
  flex-grow: 1;
}

.mobile-tab-detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px; /* reduced from 16px to make cards tighter */
}

.title-header-wrapper {
  display: flex;
  align-items: center;
  gap: 6px; /* tight gap next to title name */
  flex-wrap: nowrap;
  max-width: 100%;
}

.mobile-title-section {
  display: flex;
  flex-direction: column;
  gap: 4px; /* stack title and type vertically to prevent wrapping */
  padding: 20px 16px 4px;
}

.mobile-bus-name {
  font-size: 1.3rem; /* slightly smaller to fit nicely in one line */
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-bus-type {
  font-size: 0.8rem; /* reduced from 0.92rem */
  color: #64748b;
  font-weight: 500; /* made lighter */
  margin: 0;
}

.verified-icon-only {
  width: 20px;
  height: 20px;
  color: #2563eb; /* Blue checkmark badge icon */
  flex-shrink: 0;
  display: block;
}

.mobile-facilities-card {
  background: #ffffff;
  border-radius: 16px;
  margin: 0 16px;
  border: 1px solid #edf2f7;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.facilities-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 20px 16px;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: #334155;
  font-weight: 600;
}
.facility-item.full-width {
  grid-column: span 2;
}

.facility-icon {
  color: #64748b;
  flex-shrink: 0;
}

.red-alert-banner {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--primary, #c94c4c);
  font-weight: 700;
  border-radius: 12px;
  margin: -4px 16px 16px; /* pulled up closer to description card, tighter spacing */
}

.red-alert-icon {
  color: var(--primary, #c94c4c);
  flex-shrink: 0;
}

.mobile-route-section {
  background: #ffffff;
  border-radius: 16px;
  margin: 0 16px;
  padding: 20px 16px;
  border: 1px solid #edf2f7;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.mobile-route-section .section-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 20px 0;
  letter-spacing: -0.2px;
}

.route-timeline {
  position: relative;
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.timeline-line {
  position: absolute;
  left: 69px; /* Center-aligned with timeline node dots */
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.duration-badge {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
  transform: rotate(-90deg);
  margin-left: -1px;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.timeline-node {
  position: relative;
  display: flex;
  align-items: flex-start;
  z-index: 2;
  gap: 14px;
}

.node-time {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  width: 48px;
  text-align: right;
  flex-shrink: 0;
  letter-spacing: -0.2px;
}

.node-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 2px currentColor;
  flex-shrink: 0;
  margin-top: 4px;
}
.blue-dot {
  color: var(--primary, #c94c4c);
  background: var(--primary, #c94c4c);
}
.gray-dot {
  color: #94a3b8;
  background: #94a3b8;
}

.node-info {
  flex-grow: 1;
}

.node-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.node-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.node-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.node-address {
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.45;
}

.see-more-link {
  display: inline-block;
  margin-top: 14px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--primary, #c94c4c);
  text-decoration: none;
  transition: opacity 0.2s;
}
.see-more-link:active {
  opacity: 0.7;
}

.mobile-description-section {
  background: #ffffff;
  border-radius: 16px;
  margin: 0 16px; /* removed bottom margin, let parent gap handle it */
  padding: 16px; /* reduced padding to make spacing tighter */
  border: 1px solid #edf2f7;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.mobile-description-section .section-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 12px 0;
}

.mobile-bottom-footer-redesign {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #edf2f7;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  z-index: 999;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
  gap: 12px;
}

.footer-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-price-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.total-harga-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-harga-val {
  font-size: 1.35rem;
  font-weight: 900;
  color: #0f172a; /* Dark text as shown in mockup */
  letter-spacing: -0.2px;
}

.footer-detail-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--primary, #c94c4c); /* Red detail text */
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}

.detail-toggle-icon {
  margin-top: 1px;
}

.btn-beli-tiket-sekarang {
  background: var(--primary, #c94c4c); /* Red button */
  color: #ffffff;
  padding: 14px 0;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  text-align: center;
  box-shadow: 0 4px 14px rgba(201, 76, 76, 0.25);
  transition: background-color 0.2s, transform 0.2s;
  width: 100%;
}
.btn-beli-tiket-sekarang:active {
  background: #b03535;
  transform: scale(0.98);
}

/* Event Info Card (Date, Time, Venue, Organizer) */
.mobile-event-info-card {
  background: #ffffff;
  border-radius: 16px;
  margin: 0 16px;
  padding: 16px; /* reduced from 20px 16px to be tighter */
  border: 1px solid #edf2f7;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px; /* reduced from 16px to make items tighter */
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #334155;
  font-size: 0.95rem;
  font-weight: 500; /* changed from 600 to remove bold styling */
}

.info-icon {
  color: var(--primary, #c94c4c); /* red icons as requested */
  flex-shrink: 0;
  margin-top: 2px;
}

.info-value {
  line-height: 1.4;
}

.info-value-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.venue-title {
  font-weight: 500; /* changed from 700 to match sibling text and remove bold styling */
  color: #334155; /* soft dark grey matching other info row text */
}

.venue-addr {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
  line-height: 1.4;
}

.info-card-divider {
  height: 1px;
  background: #edf2f7;
  margin: 4px 0;
}

.organizer-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.organizer-logo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e2e8f0;
}

.organizer-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.organizer-label {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.organizer-name-wrapper {
  display: flex;
  align-items: center;
}

.organizer-name {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}

.organizer-verified-badge {
  width: 16px;
  height: 16px;
  color: #2563eb; /* Blue checkmark badge */
  flex-shrink: 0;
  margin-left: 4px;
  display: inline-block;
}

/* ==========================================================================
   SLIDE-UP TICKET SELECTOR DRAWER STYLING
   ========================================================================== */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 99999;
}

.ticket-selection-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  max-height: 82vh;
  overflow-y: auto;
  z-index: 100000;
  padding: 24px 20px 36px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.15);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 14px;
}

.drawer-header h3 {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.3px;
}

.btn-close-drawer {
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 0.9rem;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}
.btn-close-drawer:active {
  background: #e2e8f0;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drawer-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.ticket-drawer-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.ticket-drawer-card:active {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: scale(0.98);
}

.ticket-card-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ticket-badge {
  align-self: flex-start;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.ticket-name {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.ticket-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 10px;
}

.ticket-price {
  font-size: 1.1rem;
  font-weight: 900;
  color: #e11d48;
}

.btn-select-ticket {
  background: #2563eb;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(37,99,235,0.15);
}

/* Animations transitions */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.32, 0.94, 0.6, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateY(100%);
}

.mobile-tab-terms-content {
  padding: 16px;
}
</style>
