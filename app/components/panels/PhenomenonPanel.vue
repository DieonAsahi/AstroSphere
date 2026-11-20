<script setup>
// Laboratorium Fenomena (PRD §8–9). Mengganti POV tidak mengubah fase; Reset kamera ≠ Ulangi fenomena.
import { computed } from 'vue';
import { store, game } from '~/composables/useGame.js';
const L = () => game()?.lab;
const dur = computed(() => L()?.duration || 120);
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const POVS = [['ikhtisar', 'Ikhtisar'], ['depan', 'Depan'], ['samping', 'Samping'], ['atas', 'Atas'], ['bebas', 'Bebas'], ['pengamat', 'Pengamat Bumi']];
const statusText = computed(() => {
  const s = store.lab.status, c = Math.round(store.lab.covered * 100);
  if (store.lab.type === 'matahari') return s === 'total' ? 'Total · Matahari tertutup penuh di lokasi contoh' : s === 'cincin' ? `Cincin · ${c}% cakram tertutup` : s === 'sebagian' ? `Sebagian · ${c}% cakram Matahari tertutup` : 'Tidak terjadi gerhana di lokasi contoh';
  return s === 'total' ? 'Total · Bulan berada di umbra Bumi' : s === 'sebagian' ? `Sebagian · ${c}% cahaya Matahari terhalang Bumi` : 'Bulan belum memasuki bayangan Bumi';
});
const explain = computed(() => store.lab.type === 'matahari'
  ? 'Bulan berada di antara Matahari dan Bumi. Umbra Bulan hanya menyentuh sebagian kecil permukaan Bumi — di sana gerhana total; di wilayah penumbra gerhana terlihat sebagian.'
  : 'Bumi berada di antara Matahari dan Bulan. Saat Bulan masuk umbra Bumi, permukaannya meredup dan tampak kemerahan.');
const back = computed(() => store.lab.caller);
function scrub(e) { L()?.scrub(parseFloat(e.target.value)); }
function togglePlay() { store.lab.playing = !store.lab.playing; if (store.lab.playing && store.lab.t >= dur.value) L()?.replay(); }
</script>
<template>
  <div>
    <div class="ltitle">
      <button v-if="back" class="btn sm" @click="game()?.setMode(back)"><UiIcon name="kembali" :size="16" />Kembali ke {{ back === 'planet' ? 'Planet' : 'Sejarah' }}</button>
      <span class="badge acc2">Tidak berskala · jarak dipadatkan</span>
    </div>
    <div class="lbottom">
      <div class="tl panel">
        <div class="tlt">
          <button class="ib" :aria-label="store.lab.playing ? 'Jeda fenomena' : 'Putar fenomena'" @click="togglePlay"><UiIcon :name="store.lab.playing ? 'jeda' : 'putar'" /></button>
          <div class="info"><span class="kicker">Waktu fenomena</span><b class="mono">{{ fmt(store.lab.t) }} / {{ fmt(dur) }}</b></div>
          <div class="seg"><button v-for="s in [.5, 1, 2]" :key="s" :class="{ on: store.lab.speed === s }" @click="store.lab.speed = s">{{ s }}x</button></div>
        </div>
        <div class="scrub">
          <input type="range" min="0" :max="dur" step="0.1" :value="store.lab.t" aria-label="Geser waktu fenomena" @input="scrub">
          <div class="ticks"><span v-for="(l, i) in ['Awal', 'Kontak', 'Puncak', 'Kontak', 'Akhir']" :key="i" :style="{ left: i * 25 + '%' }">{{ l }}</span></div>
        </div>
      </div>
    </div>
    <aside class="side panel" aria-label="Panel fenomena">
      <div class="sbody scroll">
        <div class="kicker acc">Laboratorium fenomena</div>
        <h2>{{ store.lab.type === 'matahari' ? 'Gerhana Matahari' : 'Gerhana Bulan' }}</h2>
        <div class="seg block" role="tablist"><button :class="{ on: store.lab.type === 'matahari' }" @click="L()?.setType('matahari')">Gerhana Matahari</button><button :class="{ on: store.lab.type === 'bulan' }" @click="L()?.setType('bulan')">Gerhana Bulan</button></div>
        <p class="txt">{{ explain }}</p>
        <div class="kicker">Sudut pandang (POV)</div>
        <div class="povs"><button v-for="[id, lb] in POVS" :key="id" class="chip soft" :class="{ on: store.lab.pov === id }" @click="L()?.setPOV(id)">{{ lb }}</button></div>
        <p v-if="store.lab.pov === 'bebas'" class="hint">Seret untuk memutar, roda mouse / cubit untuk zoom.</p>
        <p v-if="store.lab.pov === 'pengamat'" class="hint">Kamera di permukaan Bumi ({{ store.lab.type === 'matahari' ? 'lokasi contoh di dalam jalur umbra, menatap Matahari' : 'sisi malam, Bulan di atas horizon' }}). Ukuran sudut mengikuti model lab, bukan proporsi nyata.</p>
        <hr class="divider">
        <UiToggle v-model="store.lab.labels" label="Label objek" />
        <UiToggle v-model="store.lab.volume" label="Volume bayangan" sub="Peneduhan di permukaan tetap tampil saat dimatikan" />
        <div class="status">
          <div class="kicker">Status di titik pengamat</div>
          <b :class="store.lab.status">{{ statusText }}</b>
          <small>Dihitung dari geometri Matahari–{{ store.lab.type === 'matahari' ? 'Bulan–Bumi' : 'Bumi–Bulan' }}, tidak bergantung kamera.</small>
        </div>
        <p v-if="store.lab.type === 'bulan'" class="note">Warna merah Bulan adalah ilustrasi pembiasan cahaya oleh atmosfer Bumi, bukan simulasi atmosfer lengkap.</p>
      </div>
      <div class="sfoot col">
        <div class="two"><button class="btn" @click="L()?.resetCam()"><UiIcon name="kamera" :size="16" />Reset kamera</button><button class="btn" @click="L()?.replay()"><UiIcon name="ulang" :size="16" />Ulangi fenomena</button></div>
        <button class="btn ghost" @click="game()?.setMode('jelajah')">‹ Kembali menjelajah</button>
      </div>
    </aside>
  </div>
</template>
<style scoped>
.ltitle{flex-direction:row;align-items:center;gap:12px}
h2{font-size:24px;font-weight:600}
.txt{font-size:13.5px;line-height:1.6;color:var(--dim)}
.povs{display:flex;flex-wrap:wrap;gap:6px}
.hint{font-size:11.5px;color:var(--faint);line-height:1.45}
.status{display:flex;flex-direction:column;gap:5px;padding:12px 14px;border-radius:10px;background:var(--soft)}
.status b{font-size:14px;color:var(--acc);font-weight:600}
.status b.none{color:var(--dim)}
.status small{font-size:11px;color:var(--faint)}
.note{font-size:11.5px;color:var(--acc2);line-height:1.45}
.sfoot.col{flex-direction:column}
.two{display:flex;gap:10px}.two .btn{flex:1;font-size:11.5px;padding:10px}
.tl{width:min(820px,calc(100vw - var(--side-w) - 120px));padding:14px 18px;display:flex;flex-direction:column;gap:10px}
.tlt{display:flex;align-items:center;gap:14px}
.info{display:flex;flex-direction:column;gap:2px;flex:1}
.info b{font-size:14px}
.scrub{position:relative;padding-bottom:16px}
.ticks span{position:absolute;bottom:0;transform:translateX(-50%);font-family:var(--mono);font-size:9.5px;color:var(--faint)}
.ticks span:first-child{transform:none}.ticks span:last-child{transform:translateX(-100%)}
@media (max-width:760px){ .tl{width:100%} .ltitle{flex-wrap:wrap} }
</style>
