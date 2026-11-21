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
          <div class="r"><span class="key"><b class="kbd">{{ k('turnL') }}</b><small>Putar</small></span><span class="key hl"><b class="kbd">{{ k('forward') }}</b><small>Maju</small></span><span class="key"><b class="kbd">{{ k('turnR') }}</b><small>Putar</small></span></div>
          <div class="r"><span class="key"><b class="kbd">{{ k('left') }}</b><small>Geser</small></span><span class="key"><b class="kbd">{{ k('back') }}</b><small>Mundur</small></span><span class="key"><b class="kbd">{{ k('right') }}</b><small>Geser</small></span></div>
        </div>
        <p class="cap">Terbang &amp; belok</p>
      </section>
      <section class="grp">
        <div class="pad arrows">
          <span class="key"><b class="kbd">{{ k('up') }}</b><small>Naik</small></span>
          <span class="key"><b class="kbd">{{ k('down') }}</b><small>Turun</small></span>
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
        <div class="joy"><i /><span>Geser</span></div>
        <div class="btns"><i class="b1">Turbo</i><i class="b2">Rem</i><i class="b3">Gas</i></div>
      </div>
      <ul class="tl">
        <li><b>Jempol kiri</b> — sentuh di mana saja di sisi kiri, lalu geser untuk mengarahkan pesawat.</li>
        <li><b>Gas</b> untuk maju, <b>Turbo</b> untuk melesat, <b>Rem</b> untuk berhenti.</li>
        <li><b>Geser sisi kanan</b> layar untuk melihat sekeliling.</li>
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
.phone{position:relative;width:280px;height:150px;border-radius:26px;border:3px solid var(--line-2);background:linear-gradient(160deg,#141d45,#0b1130);flex:none}
.joy{position:absolute;left:24px;bottom:20px;width:78px;height:78px;border-radius:50%;border:2px dashed var(--line-2);display:grid;place-items:center}
.joy i{width:34px;height:34px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 6px rgba(59,108,240,.25)}
.joy span{position:absolute;bottom:-20px;font-size:11px;color:var(--muted)}
.btns{position:absolute;right:16px;bottom:16px;display:grid;grid-template-columns:auto auto;grid-template-areas:". t" "r g";gap:6px;align-items:end}
.btns i{font-style:normal;display:grid;place-items:center;border-radius:50%;font-family:var(--display);font-weight:600;font-size:11px}
.btns .b1{grid-area:t;width:40px;height:40px;background:var(--star);color:var(--on-star)}
.btns .b2{grid-area:r;width:40px;height:40px;background:var(--surface-3)}
.btns .b3{grid-area:g;width:56px;height:56px;background:var(--blue)}
.tl{list-style:none;display:flex;flex-direction:column;gap:10px;max-width:360px;font-size:14.5px;color:var(--muted)}
.tl b{color:var(--text);font-weight:600}
.compact .grp{min-width:0;padding:12px 12px 10px}
@media (max-width:760px){ .grp{min-width:0;flex:1 1 140px} .key .kbd{min-width:42px;height:42px} }
</style>
