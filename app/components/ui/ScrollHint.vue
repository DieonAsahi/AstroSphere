<script setup>
// Indikator petunjuk ringkas "Gulir ke bawah ↓" khusus mobile landscape
// Otomatis muncul ketika konten masih bisa digulir ke bawah, dan otomatis menghilang saat sudah mencapai dasar.
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

const props = defineProps({
  target: { type: [Object, null], default: null },
  label: { type: String, default: 'Gulir ke bawah' },
});

const canScroll = ref(false);
const hintRef = ref(null);

function getEl() {
  if (props.target?.$el) return props.target.$el;
  if (props.target instanceof HTMLElement) return props.target;
  if (hintRef.value?.parentElement) {
    let p = hintRef.value.parentElement;
    while (p) {
      if (typeof window !== 'undefined') {
        const s = window.getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowY)) return p;
      }
      p = p.parentElement;
    }
    return hintRef.value.parentElement;
  }
  return null;
}

function checkScroll() {
  const el = getEl();
  if (!el || !(el instanceof HTMLElement)) {
    canScroll.value = false;
    return;
  }
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  canScroll.value = remaining > 16;
}

function scrollDown(e) {
  e?.stopPropagation?.();
  const el = getEl();
  if (el) {
    el.scrollBy({ top: 120, behavior: 'smooth' });
  }
}

let ro = null;
let boundEl = null;

function bind() {
  unbind();
  nextTick(() => {
    const el = getEl();
    if (!el) return;
    boundEl = el;
    el.addEventListener('scroll', checkScroll, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    checkScroll();
  });
}

function unbind() {
  if (boundEl) {
    boundEl.removeEventListener('scroll', checkScroll);
    boundEl = null;
  }
  ro?.disconnect();
  ro = null;
}

onMounted(() => {
  bind();
  setTimeout(checkScroll, 350);
});

watch(() => props.target, () => {
  bind();
});

onBeforeUnmount(() => {
  unbind();
});
</script>

<template>
  <div ref="hintRef" class="scroll-hint-wrapper">
    <Transition name="fade-hint">
      <button
        v-if="canScroll"
        type="button"
        class="scroll-hint-pill"
        role="status"
        aria-label="Ada konten lebih lanjut di bawah. Ketuk untuk menggulir ke bawah"
        title="Gulir ke bawah"
        @click="scrollDown"
      >
        <span class="hint-txt">{{ label }}</span>
        <span class="hint-arrow" aria-hidden="true">↓</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.scroll-hint-wrapper{
  display:none;
}
@media (max-height: 540px) and (orientation: landscape){
  .scroll-hint-wrapper{
    display:contents;
  }
  .scroll-hint-pill{
    position:sticky;
    bottom:6px;
    left:0;
    right:0;
    margin:auto auto 4px auto;
    align-self:center;
    width:fit-content;
    display:inline-flex;
    align-items:center;
    gap:4px;
    padding:3px 10px;
    border-radius:999px;
    background:#070b18;
    border:1px solid rgba(255, 201, 71, 0.6);
    color:var(--star, #ffc947);
    font-family:var(--font);
    font-size:10.5px;
    font-weight:500;
    line-height:1.2;
    box-shadow:0 4px 14px rgba(0, 0, 0, 0.85), 0 0 12px rgba(255, 201, 71, 0.3);
    pointer-events:auto;
    cursor:pointer;
    z-index:35;
    white-space:nowrap;
    animation:bounceHint 1.8s infinite ease-in-out;
    transition:transform .12s ease, opacity .15s ease;
  }
  .scroll-hint-pill:active{
    transform:scale(0.95);
  }
  .hint-txt{
    font-size:10.5px;
    font-weight:500;
  }
  .hint-arrow{
    font-size:11.5px;
    font-weight:600;
    line-height:1;
  }
}
@keyframes bounceHint{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(2px)}
}
.fade-hint-enter-active,.fade-hint-leave-active{transition:opacity .2s ease,transform .2s ease}
.fade-hint-enter-from,.fade-hint-leave-to{opacity:0;transform:translateY(4px)}
</style>
