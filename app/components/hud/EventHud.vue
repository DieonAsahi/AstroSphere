<script setup>
// HUD peristiwa antariksa (game/hazards.js): banner hitung mundur, perisai pesawat, efek layar, dan kartu hasil + fakta.
import { computed, ref, watch } from 'vue';
import { store } from '~/composables/useGame.js';
import { EVENTS } from '~/data/events.js';
const ev = store.event;
const E = computed(() => EVENTS[ev.kind] || null);
const banner = computed(() => {
  if (!ev.phase || !E.value) return null;
  if (ev.kind === 'badai') {
    if (ev.phase === 'warn') return { cls: 'warn', icon: 'matahari', t: E.value.warn, s: ev.safe ? 'Kamu sudah di bayangan — tetap di sana' : `Berlindung di bayangan ${ev.shelterName}`, n: ev.left };
    return { cls: ev.safe ? 'safe' : 'danger', icon: 'matahari', t: E.value.hit, s: ev.safe ? 'Aman di bayangan' : 'Terkena radiasi — cepat ke bayangan!', n: ev.left };
  }
  if (ev.phase === 'warn') return { cls: 'warn', icon: 'info', t: E.value.warn, s: store.touch ? 'Hindari dengan joystick' : 'Hindari: A/D belok · W/S naik-turun', n: ev.left };
  return { cls: ev.hits > 3 ? 'danger' : 'warn', icon: 'info', t: E.value.hit, s: ev.hits ? `Tertabrak ${ev.hits} kali` : 'Belum tertabrak', n: ev.left };
});
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

    <Transition name="fade">
      <div v-if="banner" class="banner" :class="banner.cls" role="status" aria-live="assertive">
        <span class="ic"><UiIcon :name="banner.icon" :size="22" /></span>
        <span class="tx"><b>{{ banner.t }}</b><small>{{ banner.s }}</small></span>
        <span class="n num">{{ banner.n }}</span>
      </div>
    </Transition>

    <!-- BANNER PERINGATAN PERISAI 0% (TURBO NONAKTIF) -->
    <Transition name="fade">
      <div v-if="ev.damaged" class="damaged-shield-banner" role="alert" aria-live="assertive">
        <span class="dam-ic"><UiIcon name="silang" :size="20" /></span>
        <div class="dam-tx">
          <b>Perisai rusak (Turbo nonaktif)</b>
          <small>Terbang mendekati planet terdekat untuk perbaikan otomatis.</small>
        </div>
      </div>
    </Transition>

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
.banner{position:absolute;left:50%;top:calc(var(--top) + 112px + var(--safe-t));transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:8px 10px 8px 8px;border-radius:999px;
  background:rgba(40,16,4,.92);border:2px solid #ffb347;color:#ffe3c2;max-width:calc(100vw - 24px);box-shadow:0 8px 30px rgba(0,0,0,.4)}
.banner.warn{animation:blink 1.2s ease-in-out infinite}
.banner.danger{background:rgba(48,6,6,.92);border-color:var(--coral);color:#ffd0d0}
.banner.safe{background:rgba(4,40,26,.92);border-color:var(--green);color:#c8f7e3}
.banner .ic{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,179,71,.22);flex:none}
.banner.danger .ic{background:rgba(255,107,107,.22)} .banner.safe .ic{background:rgba(54,211,154,.22)}
.banner .tx{display:flex;flex-direction:column;min-width:0}
.banner b{font-family:var(--display);font-weight: 500;font-size:16px;white-space:nowrap}
.banner small{font-size:13px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.banner .n{min-width:44px;height:38px;padding:0 8px;border-radius:999px;display:grid;place-items:center;background:rgba(0,0,0,.35);font-family:var(--display);font-weight: 600;font-size:20px}
@keyframes blink{50%{box-shadow:0 0 0 6px rgba(255,179,71,.18),0 8px 30px rgba(0,0,0,.4)}}
/* BANNER PERINGATAN PERISAI 0% */
.damaged-shield-banner{position:absolute;left:50%;bottom:calc(var(--gap) + 180px + var(--safe-b));transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:10px 18px;border-radius:999px;background:rgba(45,6,6,.94);border:1.5px solid var(--coral);box-shadow:0 0 24px rgba(255,107,107,.4);color:#ffd4d4;backdrop-filter:blur(8px);pointer-events:auto;z-index:15;animation:pulseDanger 1.4s infinite;white-space:nowrap}
@keyframes pulseDanger{0%,100%{box-shadow:0 0 16px rgba(255,107,107,.3)}50%{box-shadow:0 0 28px rgba(255,107,107,.65)}}
.dam-ic{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,107,107,.25);color:var(--coral);flex:none}
.dam-tx{display:flex;flex-direction:column;gap:1px}
.dam-tx b{font-family:var(--display);font-size:14px;color:#ff9e9e}
.dam-tx small{font-size:12px;color:#ffdede}

.shield{position:absolute;left:calc(var(--gap) + var(--safe-l));bottom:calc(var(--gap) + 172px + var(--safe-b));width:210px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:6px 10px;
  padding:10px 14px;border-radius:var(--r);background:var(--surface-a);border:1px solid var(--line);z-index:12}
.shield .lb{font-size:12.5px;color:var(--muted)}
.shield .bar{height:8px}
.shield b{font-size:14px}
.shield.ok .bar>i{background:var(--green)} .shield.mid .bar>i{background:var(--star)} .shield.bad .bar>i{background:var(--coral)}
.shield.bad{border-color:rgba(255,107,107,.5)}
.shield small{grid-column:1/-1;font-size:12px;color:var(--coral);line-height:1.4}
.res-wrap{position:absolute;inset:0;display:grid;place-items:center;padding:16px}
.res{pointer-events:auto;width:min(440px,100%);padding:22px;display:flex;flex-direction:column;gap:12px;border-top:4px solid var(--coral)}
.res.ok{border-top-color:var(--green)}
.top{display:flex;align-items:center;gap:14px}
.top small{font-size:12.5px;color:var(--faint)}
.top>div{flex:1}
.ric{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:rgba(255,107,107,.18);color:var(--coral);flex:none}
.res.ok .ric{background:rgba(54,211,154,.18);color:var(--green)}
.rw{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:rgba(255,201,71,.16);color:var(--star);font-family:var(--display);font-weight: 500}
.txt{font-size:15px;color:var(--muted);line-height:1.55}
.fact{padding:12px 14px;border-radius:var(--r);background:rgba(255,201,71,.08);border:1px solid rgba(255,201,71,.22)}
.fact b{display:flex;align-items:center;gap:6px;font-family:var(--display);font-weight: 500;font-size:14px;color:var(--star);margin-bottom:4px}
.fact p{font-size:14px;color:var(--muted);line-height:1.55}
.keys{display:flex;justify-content:center;gap:6px;font-size:12.5px;color:var(--faint)}
/* layar sentuh: banner di bawah chip tujuan, perisai di tengah bawah, kartu hasil sebagai lembar bawah */
.touch .banner{top:calc(var(--top) + 156px + var(--safe-t))}
.touch .banner small{white-space:normal}
.touch .shield{left:50%;transform:translateX(-50%);bottom:calc(14px + var(--safe-b));width:min(240px,60vw)}
.touch .res-wrap{place-items:end center;padding:12px 12px calc(12px + var(--safe-b))}
@media (max-width:760px){
  .banner b{font-size:14.5px}
  .banner .n{font-size:17px;min-width:38px;height:34px}
  .damaged-shield-banner{bottom:calc(var(--gap) + 155px + var(--safe-b));padding:8px 12px;white-space:normal;max-width:calc(100vw - 24px);text-align:left}
  .dam-tx b{font-size:13px}
  .dam-tx small{font-size:11.5px}
}
@media (prefers-reduced-motion:reduce){ .banner.warn{animation:none} }
</style>
