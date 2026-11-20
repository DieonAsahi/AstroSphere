<script setup>
import { store } from '~/composables/useGame.js';
</script>
<template>
  <div class="loader">
    <div class="inner">
      <div class="mark"><UiIcon name="logo" :size="40" /></div>
      <div class="kicker acc">Sistem Bintang Surya</div>
      <div class="name">ASTROSPHERE</div>
      <template v-if="!store.loading.error">
        <div class="lbar"><i :style="{ width: store.loading.p * 100 + '%' }" /></div>
        <p class="txt">{{ store.loading.text }}</p>
      </template>
      <div v-else class="err panel" role="alert">
        <div class="kicker acc2">Pratinjau UI · WebGL tidak tersedia</div>
        <p>{{ store.loading.error }}</p>
      </div>
    </div>
  </div>
</template>
<style scoped>
.loader{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 60%,#0b1428 0%,#02040a 70%)}
.inner{width:min(380px,84vw);text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}
.mark{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:var(--soft);border:1px solid var(--line);box-shadow:0 0 34px rgba(var(--acc-rgb),.3)}
.name{font-weight:600;font-size:28px;letter-spacing:.34em;padding-left:.34em}
.lbar{width:100%;height:3px;background:var(--divider);border-radius:2px;overflow:hidden}
.lbar i{display:block;height:100%;background:var(--acc);box-shadow:0 0 12px var(--acc);transition:width .35s ease}
.txt{font-size:13px;color:var(--dim);letter-spacing:.04em;min-height:1.4em}
.err{padding:16px;text-align:left;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.5;color:var(--dim)}
</style>
