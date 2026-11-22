<script setup>
// Panduan kontrol bergambar (dipakai di layar "Cara terbang" dan menu Kontrol). Label tombol mengikuti pemetaan pemain.
import { computed, ref } from 'vue';
import { store } from '~/composables/useGame.js';
import { resolveKeymap, keyLabel } from '~/data/keymap.js';
const props = defineProps({ compact: Boolean });
const tab = ref(store.touch ? 'sentuh' : 'keyboard');
const km = computed(() => resolveKeymap(store.settings.keys));
const k = (id) => keyLabel(km.value[id]?.[0]);
</script>
<template>
  <div class="kg" :class="{ compact }">
    <div class="seg" role="tablist" aria-label="Jenis kontrol">
      <button role="tab" :aria-selected="tab === 'keyboard'" :class="{ on: tab === 'keyboard' }" @click="tab = 'keyboard'"><UiIcon name="papan-ketik" :size="18" /> Keyboard</button>
      <button role="tab" :aria-selected="tab === 'sentuh'" :class="{ on: tab === 'sentuh' }" @click="tab = 'sentuh'"><UiIcon name="sentuh" :size="18" /> Layar sentuh</button>
    </div>

    <div v-if="tab === 'keyboard'" class="kb">
      <section class="grp">
        <div class="pad">
          <div class="r">
            <span class="key"><b class="kbd">{{ k('down') }}</b><small>Turun</small></span>
            <span class="key hl"><b class="kbd">{{ k('forward') }}</b><small>Maju</small></span>
            <span class="key"><b class="kbd">{{ k('up') }}</b><small>Naik</small></span>
          </div>
          <div class="r">
            <span class="key"><b class="kbd">{{ k('left') }}</b><small>Belok</small></span>
            <span class="key"><b class="kbd">{{ k('back') }}</b><small>Mundur</small></span>
            <span class="key"><b class="kbd">{{ k('right') }}</b><small>Belok</small></span>
          </div>
        </div>
        <p class="cap">Terbang &amp; arah</p>
      </section>
      <section class="grp">
        <div class="pad arrows">
          <span class="key"><b class="kbd">↑</b><small>Naik</small></span>
          <span class="key"><b class="kbd">↓</b><small>Turun</small></span>
        </div>
        <p class="cap">Arah hidung</p>
      </section>
      <section class="grp">
        <div class="pad col">
          <span class="key wide"><b class="kbd">{{ k('turbo') }}</b><small>Turbo</small></span>
          <span class="key wide"><b class="kbd">{{ k('brake') }}</b><small>Rem</small></span>
          <span class="key wide"><b class="kbd sp">{{ k('stop') }}</b><small>Berhenti</small></span>
        </div>
        <p class="cap">Kecepatan</p>
      </section>
      <section class="grp">
        <div class="pad col">
          <span class="key wide"><b class="kbd">{{ k('map') }}</b><small>Peta</small></span>
          <span class="key wide"><b class="kbd">Esc</b><small>Menu</small></span>
          <span class="key wide"><b class="kbd"><UiIcon name="mouse" :size="18" /></b><small>Seret = lihat sekitar</small></span>
        </div>
        <p class="cap">Lainnya</p>
      </section>
    </div>

    <div v-else class="tc">
      <div class="phone" aria-hidden="true">
        <div class="stick-mock">
          <div class="grid-ring" />
          <i class="knob" />
          <span>Analog Kemudi</span>
        </div>
        <div class="throttle-mock">
          <div class="slots">
            <span class="slot hot">TURBO</span>
            <span class="slot act">MAJU</span>
            <span class="slot">NETRAL</span>
            <span class="slot warn">REM</span>
          </div>
          <div class="rail"><i class="lever" /></div>
        </div>
        <div class="stop-mock">STOP</div>
      </div>
      <ul class="tl">
        <li><b>Kemudi Analog (Kiri)</b> — seret stik analog di kiri bawah untuk mengarahkan haluan moncong pesawat (belok kiri/kanan &amp; naik/turun).</li>
        <li><b>Tuas Dorong (Kanan)</b> — geser tuas dorong di kanan bawah ke slot Turbo, Maju, Netral, atau Rem. Tekan tombol <b>STOP</b> untuk langsung diam.</li>
        <li><b>Seret tengah layar</b> dengan tetikus atau jari untuk melihat sekeliling kokpit dengan bebas.</li>
      </ul>
    </div>
  </div>
</template>
<style scoped>
.kg{display:flex;flex-direction:column;gap:20px;align-items:center}
.seg button{display:inline-flex;align-items:center;gap:6px}
.kb{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;width:100%}
.grp{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 18px 12px;border-radius:var(--r);background:var(--surface-2);min-width:150px}
.pad{display:flex;flex-direction:column;gap:8px;align-items:center}
.pad .r{display:flex;gap:8px}
.pad.arrows{flex-direction:column}
.key{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:56px}
.key .kbd{min-width:48px;height:46px;font-size:17px;border-radius:11px}
.key.hl .kbd{background:var(--blue);border-color:var(--blue-d)}
.key small{font-size:12px;color:var(--muted)}
.pad.col{flex-direction:column;gap:8px;align-items:stretch}
.key.wide{flex-direction:row;gap:10px;justify-content:flex-start}
.key.wide .kbd{min-width:70px;height:40px;font-size:15px}
.key.wide .kbd.sp{min-width:110px}
.key.wide small{font-size:13.5px;color:var(--text)}
.cap{font-family:var(--display);font-weight:600;font-size:14px;color:var(--faint)}
.tc{display:flex;gap:24px;align-items:center;flex-wrap:wrap;justify-content:center}
.phone{position:relative;width:290px;height:154px;border-radius:26px;border:3px solid var(--line-2);background:linear-gradient(160deg,#141d45,#0b1130);flex:none;overflow:hidden}
.stick-mock{position:absolute;left:20px;bottom:18px;width:72px;height:72px;border-radius:50%;background:radial-gradient(circle,rgba(22,33,70,.85) 0%,rgba(10,16,38,.95) 100%);border:2px solid rgba(143,176,255,.25);display:grid;place-items:center}
.stick-mock .grid-ring{position:absolute;inset:12px;border-radius:50%;border:1px dashed rgba(143,176,255,.2)}
.stick-mock .knob{position:relative;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b6cf0 0%,#1e3a8a 100%);box-shadow:0 0 10px rgba(59,108,240,.5)}
.stick-mock span{position:absolute;bottom:-20px;font-size:10.5px;color:var(--muted);white-space:nowrap}
.throttle-mock{position:absolute;right:18px;bottom:22px;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;background:rgba(16,23,58,.8);border:1px solid rgba(143,176,255,.2)}
.throttle-mock .slots{display:flex;flex-direction:column;gap:3px}
.throttle-mock .slot{font-size:9px;font-weight:700;color:var(--faint);letter-spacing:.04em}
.throttle-mock .slot.hot{color:#ffc947}
.throttle-mock .slot.act{color:#60a5fa}
.throttle-mock .slot.warn{color:#ff6b6b}
.throttle-mock .rail{position:relative;width:6px;height:68px;border-radius:999px;background:rgba(10,16,38,.9);border:1px solid rgba(143,176,255,.25);overflow:hidden}
.throttle-mock .lever{position:absolute;left:0;right:0;top:20px;height:12px;border-radius:999px;background:#60a5fa;box-shadow:0 0 6px #60a5fa}
.stop-mock{position:absolute;right:84px;bottom:14px;padding:2px 7px;border-radius:6px;background:rgba(255,107,107,.18);border:1px solid rgba(255,107,107,.4);color:#ff8585;font-size:9.5px;font-weight:700}
.tl{list-style:none;display:flex;flex-direction:column;gap:10px;max-width:360px;font-size:14.5px;color:var(--muted)}
.tl b{color:var(--text);font-weight:600}
.compact .grp{min-width:0;padding:12px 12px 10px}
@media (max-width:760px){ .grp{min-width:0;flex:1 1 140px} .key .kbd{min-width:42px;height:42px} }
</style>
