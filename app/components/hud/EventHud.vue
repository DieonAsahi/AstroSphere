<script setup>
// HUD peristiwa antariksa (game/hazards.js): banner hitung mundur, perisai pesawat, efek layar, dan kartu hasil + fakta.
import { computed, ref, watch } from 'vue';
import { store } from '~/composables/useGame.js';
import { EVENTS } from '~/data/events.js';
const ev = store.event;
const showShield = computed(() => ev.phase || ev.damaged || ev.shield < 99.5);
const shieldCls = computed(() => (ev.damaged ? 'bad' : ev.shield < 35 ? 'bad' : ev.shield < 70 ? 'mid' : 'ok'));
// kilat merah saat tertabrak
const flash = ref(false);
let ft = 0;
watch(() => ev.flash, () => { flash.value = true; clearTimeout(ft); ft = setTimeout(() => { flash.value = false; }, 260); });
function close() { ev.result = null; }
</script>

<template>
  <div class="ehud" :class="{ touch: store.touch }">
    <!-- efek layar: tepi oranye saat terkena radiasi, kilat merah saat tertabrak -->
    <div class="storm-fx" :style="{ opacity: ev.kind === 'badai' && ev.phase === 'active' ? (0.18 + ev.expo * 0.6).toFixed(2) : 0 }" />
    <div class="hit-fx" :class="{ on: flash }" />

    <div v-if="showShield" class="shield" :class="shieldCls">
      <span class="lb">{{ ev.damaged ? 'Pesawat rusak' : 'Perisai' }}</span>
      <div class="bar"><i :style="{ width: Math.round(ev.shield) + '%' }" /></div>
      <b class="num">{{ Math.round(ev.shield) }}%</b>
      <small v-if="ev.damaged">Turbo mati — dekati planet atau satelit untuk memperbaiki</small>
    </div>

    <Transition name="pop">
      <div v-if="ev.result" class="res-wrap">
        <div class="res card" :class="{ ok: ev.result.ok }" role="dialog" aria-modal="false" aria-labelledby="ev-t">
          <div class="top">
            <span class="ric"><UiIcon :name="ev.result.ok ? 'cek' : 'info'" :size="26" /></span>
            <div><small>{{ EVENTS[ev.result.kind]?.name }}</small><h2 id="ev-t" class="h2">{{ ev.result.title }}</h2></div>
            <span v-if="ev.result.reward" class="rw"><UiIcon name="bintang" :size="15" />+{{ ev.result.reward }}</span>
          </div>
          <p class="txt">{{ ev.result.text }}</p>
          <div class="fact"><b><UiIcon name="info" :size="15" />Tahukah kamu?</b><p>{{ ev.result.fact }}</p></div>
          <button class="btn primary block" @click="close"><UiIcon name="putar" :size="18" />Lanjut terbang</button>
          <p v-if="!store.touch" class="keys"><b class="kbd sm">Enter</b> lanjut</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ehud{position:fixed;inset:0;z-index:11;pointer-events:none}
.storm-fx{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,120,30,0) 45%,rgba(255,110,30,.55) 100%);transition:opacity .4s;mix-blend-mode:screen}
.hit-fx{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,40,40,0) 40%,rgba(255,40,40,.55) 100%);opacity:0;transition:opacity .25s}
.hit-fx.on{opacity:1;transition:none}

.shield{position:absolute;left:calc(var(--gap) + var(--safe-l));bottom:calc(var(--gap) + 172px + var(--safe-b));width:210px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:6px 10px;
  padding:10px 14px;border-radius:var(--r);background:var(--surface-a);border:1px solid var(--line);z-index:12}
.shield .lb{font-size:12.5px;color:var(--muted)}
.shield .bar{height:8px}
.shield b{font-size:14px}
.shield.ok .bar>i{background:var(--green)} .shield.mid .bar>i{background:var(--star)} .shield.bad .bar>i{background:var(--coral)}
.shield.bad{border-color:rgba(255,107,107,.5)}
.shield small{grid-column:1/-1;font-size:12px;color:var(--coral);line-height:1.4}
.res-wrap{position:absolute;inset:0;display:grid;place-items:center;padding:16px;background:rgba(5,8,20,.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.res{pointer-events:auto;width:min(440px,100%);padding:22px;display:flex;flex-direction:column;gap:12px;border-radius:14px;background:rgba(11,16,33,.96);border:1px solid rgba(148,163,184,.18);border-top:4px solid var(--coral);box-shadow:0 20px 50px rgba(0,0,0,.65)}
.res.ok{border-top-color:var(--green)}
.top{display:flex;align-items:center;gap:14px}
.top small{font-size:12.5px;color:var(--faint)}
.top>div{flex:1}
.ric{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:rgba(255,107,107,.18);color:var(--coral);flex:none}
.res.ok .ric{background:rgba(54,211,154,.18);color:var(--green)}
.rw{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:rgba(255,201,71,.16);color:var(--star);font-family:var(--display);font-weight:500}
.txt{font-size:15px;color:var(--muted);line-height:1.55}
.fact{padding:12px 14px;border-radius:var(--r);background:rgba(255,201,71,.08);border:1px solid rgba(255,201,71,.22)}
.fact b{display:flex;align-items:center;gap:6px;font-family:var(--display);font-weight:500;font-size:14px;color:var(--star);margin-bottom:4px}
.fact p{font-size:14px;color:var(--muted);line-height:1.55}
.keys{display:flex;justify-content:center;gap:6px;font-size:12.5px;color:var(--faint)}
/* layar sentuh: perisai di tengah bawah, kartu hasil sebagai lembar bawah */
.touch .shield{left:50%;transform:translateX(-50%);bottom:calc(14px + var(--safe-b));width:min(240px,60vw)}
.touch .res-wrap{place-items:end center;padding:12px 12px calc(12px + var(--safe-b))}
@media (max-height:520px) and (orientation:landscape){
  .touch .shield{width:min(195px,34vw);bottom:calc(8px + var(--safe-b));padding:7px 10px;gap:4px 8px}
  .touch .res-wrap{place-items:center;padding:10px calc(14px + var(--safe-r)) 10px calc(14px + var(--safe-l))}
  .res{max-height:calc(100dvh - 20px);overflow-y:auto;padding:14px 18px;gap:8px}
  .ric{width:38px;height:38px}
  .txt,.fact p{font-size:13px}
}
</style>
