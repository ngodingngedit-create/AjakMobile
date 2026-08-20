<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Car, Users, Fuel, Gauge, Search, Star, ChevronRight } from "lucide-vue-next";

const router = useRouter();
const searchQuery = ref("");
const activeFilter = ref("semua");
const activeSort = ref("populer");

const filters = [
  { id: "semua", label: "Semua" },
  { id: "mpv", label: "MPV" },
  { id: "suv", label: "SUV" },
  { id: "sedan", label: "Sedan" },
  { id: "minibus", label: "Minibus" },
];

const cars = ref([
  { slug: "toyota-avanza", name: "Toyota Avanza", type: "mpv", category: "MPV", image: "/rental_avanza.png", capacity: 7, transmission: "Manual", fuel: "Bensin", year: 2023, pricePerDay: 350000, rating: 4.8, reviewCount: 124, badge: "Terpopuler", badgeColor: "#C94C4C", available: true, features: ["AC", "Audio", "GPS", "Asuransi"] },
  { slug: "toyota-innova", name: "Toyota Innova Reborn", type: "mpv", category: "MPV", image: "/rental_innova.png", capacity: 7, transmission: "Otomatis", fuel: "Diesel", year: 2024, pricePerDay: 550000, rating: 4.9, reviewCount: 89, badge: "Premium", badgeColor: "#7C4DFF", available: true, features: ["AC", "Audio", "GPS", "Asuransi", "Wifi"] },
  { slug: "honda-hrv", name: "Honda HR-V", type: "suv", category: "SUV", image: "/rental_avanza.png", capacity: 5, transmission: "Otomatis", fuel: "Bensin", year: 2023, pricePerDay: 500000, rating: 4.7, reviewCount: 67, badge: null, badgeColor: null, available: true, features: ["AC", "Audio", "GPS", "Asuransi"] },
  { slug: "toyota-alphard", name: "Toyota Alphard", type: "mpv", category: "MPV", image: "/rental_innova.png", capacity: 7, transmission: "Otomatis", fuel: "Bensin", year: 2024, pricePerDay: 1200000, rating: 5.0, reviewCount: 42, badge: "VIP", badgeColor: "#F4511E", available: true, features: ["AC Dual Zone", "Home Theater", "GPS", "Full Asuransi", "Wifi"] },
  { slug: "toyota-hiace", name: "Toyota HiAce", type: "minibus", category: "Minibus", image: "/hiace.jpg", capacity: 15, transmission: "Manual", fuel: "Diesel", year: 2022, pricePerDay: 700000, rating: 4.6, reviewCount: 98, badge: "Kapasitas Besar", badgeColor: "#00897B", available: true, features: ["AC", "Audio", "GPS", "Asuransi"] },
  { slug: "toyota-fortuner", name: "Toyota Fortuner", type: "suv", category: "SUV", image: "/rental_avanza.png", capacity: 7, transmission: "Otomatis", fuel: "Diesel", year: 2024, pricePerDay: 900000, rating: 4.9, reviewCount: 55, badge: null, badgeColor: null, available: false, features: ["AC", "Audio", "GPS", "Asuransi", "4WD"] },
]);

const filteredCars = computed(() => {
  let result = cars.value;
  if (activeFilter.value !== "semua") result = result.filter(c => c.type === activeFilter.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  }
  if (activeSort.value === "murah") result = [...result].sort((a, b) => a.pricePerDay - b.pricePerDay);
  if (activeSort.value === "mahal") result = [...result].sort((a, b) => b.pricePerDay - a.pricePerDay);
  if (activeSort.value === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
  return result;
});

const formatPrice = (num) => "Rp " + num.toLocaleString("id-ID");
const goToDetail = (car) => { router.push(`/rental-mobil/${car.slug}`); };
</script>

<template>
  <div class="rental-page">
    <section class="rental-hero">
      <div class="hero-bg-gradient"></div>
      <div class="hero-content">
        <div class="hero-badge"><Car :size="14" /> Rental Mobil</div>
        <h1 class="hero-title">Sewa Mobil <span class="hero-accent">Bebas Ribet</span></h1>
        <p class="hero-sub">Armada pilihan terbaik untuk menemani perjalananmu ke event favorit. Sopir berpengalaman, asuransi lengkap.</p>
        <div class="search-bar">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Cari jenis mobil atau kapasitas..." class="search-input" />
        </div>
      </div>
    </section>

    <div class="filter-sort-bar">
      <div class="filter-chips">
        <button v-for="f in filters" :key="f.id" class="filter-chip" :class="{ active: activeFilter === f.id }" @click="activeFilter = f.id">{{ f.label }}</button>
      </div>
      <select v-model="activeSort" class="sort-select">
        <option value="populer">Terpopuler</option>
        <option value="murah">Termurah</option>
        <option value="mahal">Termahal</option>
        <option value="rating">Rating Tertinggi</option>
      </select>
    </div>

    <div class="results-section">
      <div class="results-header">
        <span class="results-count">{{ filteredCars.length }} armada tersedia</span>
        <span class="results-tag">Harga/hari, belum termasuk sopir</span>
      </div>

      <div v-if="filteredCars.length === 0" class="empty-state">
        <Car :size="48" class="empty-icon" />
        <p>Tidak ada armada yang sesuai filter.</p>
        <button class="reset-btn" @click="activeFilter = 'semua'; searchQuery = ''">Reset Filter</button>
      </div>

      <div class="cars-grid">
        <div v-for="car in filteredCars" :key="car.slug" class="car-card" :class="{ unavailable: !car.available }" @click="goToDetail(car)">
          <div v-if="car.badge" class="car-badge" :style="{ background: car.badgeColor }">{{ car.badge }}</div>
          <div v-if="!car.available" class="unavailable-overlay"><span>Tidak Tersedia</span></div>
          <div class="car-image-wrap">
            <img :src="car.image" :alt="car.name" class="car-image" />
            <div class="car-category-tag">{{ car.category }}</div>
          </div>
          <div class="car-body">
            <div class="car-header">
              <div>
                <h3 class="car-name">{{ car.name }}</h3>
                <div class="car-year">{{ car.year }}</div>
              </div>
              <div class="car-rating">
                <Star :size="13" fill="currentColor" />
                <span>{{ car.rating }}</span>
                <span class="review-count">({{ car.reviewCount }})</span>
              </div>
            </div>
            <div class="car-specs">
              <div class="spec-item"><Users :size="14" /><span>{{ car.capacity }} org</span></div>
              <div class="spec-item"><Gauge :size="14" /><span>{{ car.transmission }}</span></div>
              <div class="spec-item"><Fuel :size="14" /><span>{{ car.fuel }}</span></div>
            </div>
            <div class="car-features">
              <span v-for="f in car.features.slice(0, 3)" :key="f" class="feature-tag">{{ f }}</span>
              <span v-if="car.features.length > 3" class="feature-tag more">+{{ car.features.length - 3 }}</span>
            </div>
            <div class="car-footer">
              <div class="car-price">
                <span class="price-from">Mulai dari</span>
                <div class="price-row"><span class="price-num">{{ formatPrice(car.pricePerDay) }}</span><span class="price-unit">/hari</span></div>
              </div>
              <button class="book-btn" :disabled="!car.available">Pilih <ChevronRight :size="16" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rental-page { min-height: 100vh; font-family: "Inter", sans-serif; background: #f8f9fb; }
.rental-hero { position: relative; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #c94c4c 100%); padding: 100px 24px 48px; overflow: hidden; }
.hero-bg-gradient { position: absolute; inset: 0; background: radial-gradient(ellipse at 80% 50%, rgba(201,76,76,0.35) 0%, transparent 60%); }
.hero-content { position: relative; max-width: 720px; margin: 0 auto; text-align: center; }
.hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,76,76,0.25); border: 1px solid rgba(201,76,76,0.4); color: #ff8a80; padding: 6px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; margin-bottom: 16px; }
.hero-title { font-size: clamp(1.8rem, 5vw, 2.8rem); font-weight: 900; color: #fff; line-height: 1.2; margin-bottom: 12px; }
.hero-accent { color: #ff6b6b; }
.hero-sub { color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.6; margin-bottom: 28px; max-width: 500px; margin-left: auto; margin-right: auto; }
.search-bar { display: flex; align-items: center; gap: 10px; background: white; border-radius: 14px; padding: 12px 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.search-icon { color: #94a3b8; flex-shrink: 0; }
.search-input { flex: 1; border: none; outline: none; font-size: 0.9rem; color: #1e293b; font-family: inherit; background: transparent; }
.search-input::placeholder { color: #94a3b8; }
.filter-sort-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; background: white; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; z-index: 10; overflow-x: auto; }
.filter-chips { display: flex; gap: 8px; flex-shrink: 0; }
.filter-chip { padding: 6px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; border: 1.5px solid #e2e8f0; background: white; color: #475569; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.filter-chip.active { background: var(--primary, #C94C4C); border-color: var(--primary, #C94C4C); color: white; }
.sort-select { border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 6px 10px; font-size: 0.8rem; font-weight: 600; color: #475569; background: white; cursor: pointer; outline: none; font-family: inherit; }
.results-section { max-width: 1100px; margin: 0 auto; padding: 24px 20px 100px; }
.results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.results-count { font-weight: 700; font-size: 0.9rem; color: #1e293b; }
.results-tag { font-size: 0.75rem; color: #94a3b8; }
.cars-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.car-card { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; cursor: pointer; transition: all 0.3s ease; position: relative; }
.car-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); border-color: rgba(201,76,76,0.2); }
.car-card.unavailable { opacity: 0.65; }
.car-badge { position: absolute; top: 12px; left: 12px; z-index: 3; color: white; font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; }
.unavailable-overlay { position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); border-radius: 18px; }
.unavailable-overlay span { background: rgba(0,0,0,0.75); color: white; padding: 8px 20px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; }
.car-image-wrap { position: relative; height: 180px; overflow: hidden; background: #f1f5f9; }
.car-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.car-card:hover .car-image { transform: scale(1.05); }
.car-category-tag { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; backdrop-filter: blur(4px); }
.car-body { padding: 16px; }
.car-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.car-name { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; }
.car-year { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
.car-rating { display: flex; align-items: center; gap: 3px; color: #f59e0b; font-size: 0.8rem; font-weight: 700; }
.review-count { color: #94a3b8; font-weight: 400; }
.car-specs { display: flex; gap: 12px; margin-bottom: 12px; }
.spec-item { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: #475569; font-weight: 500; }
.car-features { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.feature-tag { background: #f1f5f9; color: #475569; font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; }
.feature-tag.more { background: rgba(201,76,76,0.08); color: var(--primary, #C94C4C); }
.car-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid #f1f5f9; }
.car-price { display: flex; flex-direction: column; }
.price-from { font-size: 0.68rem; color: #94a3b8; font-weight: 500; }
.price-row { display: flex; align-items: baseline; gap: 2px; }
.price-num { font-size: 1.05rem; font-weight: 900; color: #0f172a; }
.price-unit { font-size: 0.7rem; color: #94a3b8; }
.book-btn { display: flex; align-items: center; gap: 4px; background: var(--primary, #C94C4C); color: white; border: none; padding: 8px 16px; border-radius: 10px; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.book-btn:hover { background: #b03a3a; transform: scale(1.03); }
.book-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
.empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
.empty-icon { margin: 0 auto 16px; color: #cbd5e1; }
.reset-btn { margin-top: 12px; padding: 8px 20px; border-radius: 10px; border: 1.5px solid var(--primary, #C94C4C); color: var(--primary, #C94C4C); background: white; font-weight: 700; cursor: pointer; font-family: inherit; }
@media (max-width: 768px) {
  .rental-hero { padding: 80px 16px 36px; }
  .filter-sort-bar { padding: 10px 16px; gap: 8px; }
  .results-section { padding: 16px 16px 100px; }
  .cars-grid { grid-template-columns: 1fr; gap: 14px; }
  .car-image-wrap { height: 160px; }
}
</style>
