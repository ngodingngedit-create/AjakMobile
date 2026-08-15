<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, CheckCircle } from 'lucide-vue-next';
import { bookingStore } from '../store/booking';

const route = useRoute();
const router = useRouter();

const bus = ref(null);
const isLoading = ref(true);

onMounted(async () => {
  const slug = route.params.slug;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shuttlebuses/${slug}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const result = await res.json();
    if (result.success && result.data) {
      bus.value = result.data;
    }
  } catch (error) {
    console.error('Error fetching shuttle bus detail:', error);
  } finally {
    isLoading.value = false;
    setTimeout(() => {
      bookingStore.isLoading = false;
    }, 800);
  }
});
</script>

<template>
  <div class="shuttle-bus-detail">
    <div class="container" style="padding-top: 100px; padding-bottom: 50px;">
      <button class="btn btn-outline mb-4" @click="router.back()">
        <ArrowLeft size="18" style="margin-right: 8px;" /> Kembali
      </button>

      <div v-if="isLoading" class="text-center py-5" style="min-height: 400px; display: flex; align-items: center; justify-content: center;">
        <p>Memuat data armada...</p>
      </div>

      <div v-else-if="bus" class="bus-detail-card">
        <div style="display: flex; gap: 2.5rem; align-items: stretch; flex-wrap: wrap;">
          <!-- Image Section -->
          <div style="flex: 1; min-width: 300px;">
            <img 
              src="/bus_parkir.png"
              :alt="bus.bus_name"
              style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;"
            />
          </div>

          <!-- Info Section -->
          <div style="flex: 1.5; min-width: 300px; padding: 1rem 0;">
            <div style="display: inline-block; background: var(--primary); color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; margin-bottom: 1rem;">
              {{ bus.bus_code }} | Plat: {{ bus.plate_number }}
            </div>
            
            <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; color: #1e293b;">{{ bus.bus_name }}</h1>
            
            <p style="color: #64748b; margin-bottom: 2rem; line-height: 1.6; font-size: 1.05rem;">
              Nikmati perjalanan yang aman dan nyaman menggunakan armada <strong>{{ bus.bus_type === 'BIG_BUS' ? 'Big Bus' : (bus.bus_type === 'MEDIUM_BUS' ? 'Medium Bus' : 'Minibus') }}</strong> kami. 
              Armada ini merupakan pilihan terbaik untuk kenyamanan perjalanan jarak jauh maupun dekat dengan fasilitas terlengkap di kelasnya.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2.5rem;">
              <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
                <span style="display: block; font-size: 0.9rem; color: #64748b; margin-bottom: 0.25rem;">Total seat</span>
                <span style="font-size: 1.5rem; font-weight: 800; color: #0f172a;">{{ bus.total_seat }} seat</span>
              </div>
              <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
                <span style="display: block; font-size: 0.9rem; color: #64748b; margin-bottom: 0.25rem;">Layout seat</span>
                <span style="font-size: 1.5rem; font-weight: 800; color: #0f172a;">{{ bus.seat_layout }}</span>
              </div>
            </div>

            <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.25rem;">Fasilitas Armada</h3>
            <ul style="list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.25rem;">
              <li v-for="fac in bus.facilities" :key="fac" style="display: flex; align-items: center; gap: 0.75rem; color: #334155; font-weight: 500;">
                <CheckCircle size="20" style="color: var(--primary);" /> {{ fac }}
              </li>
            </ul>

          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-5" style="min-height: 400px; display: flex; align-items: center; justify-content: center;">
        <p>Armada tidak ditemukan.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bus-detail-card {
  background: white; 
  border-radius: 16px; 
  padding: 2.5rem; 
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border: 1px solid #cbd5e1;
  color: #475569;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.btn-outline:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}

@media (max-width: 768px) {
  .bus-detail-card {
    padding: 1.5rem;
  }
}
</style>
