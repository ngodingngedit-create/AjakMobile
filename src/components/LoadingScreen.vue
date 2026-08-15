<script setup>
import { onMounted, ref, watch } from 'vue';

const props = defineProps({
  show: Boolean
});

const container = ref(null);
let anim = null;

const initLottie = () => {
  if (container.value && window.lottie) {
    if (anim) {
      anim.destroy();
    }
    anim = window.lottie.loadAnimation({
      container: container.value,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/mobile/loading.json'
    });
  }
};

onMounted(() => {
  if (props.show) {
    // Slight delay to allow DOM element to be fully laid out
    setTimeout(initLottie, 50);
  }
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    setTimeout(initLottie, 50);
  } else if (anim) {
    anim.destroy();
    anim = null;
  }
});
</script>

<template>
  <Transition name="loading-fade">
    <div v-if="show" class="global-loading-overlay">
      <div class="loading-content-card">
        <div ref="container" class="lottie-container"></div>
        <p class="loading-text">Memuat Halaman...</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.global-loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
}

.loading-content-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.lottie-container {
  width: 110px;
  height: 110px;
}

.loading-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary, #c94c4c);
  letter-spacing: 0.8px;
  text-transform: uppercase;
  animation: pulse 1.5s infinite ease-in-out;
  margin-top: -12px;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Vue Transitions */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.35s ease;
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
