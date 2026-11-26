<script setup>
// Panduan kontrol bergambar lengkap (dipakai di modal jeda dan profil).
// Label tombol mengikuti pemetaan aksi pemain.
import { computed, ref } from 'vue';
import { store } from '~/composables/useGame.js';
import { resolveKeymap, keyLabel } from '~/data/keymap.js';

const props = defineProps({ compact: Boolean });
const tab = ref(store.touch ? 'sentuh' : 'keyboard');
const km = computed(() => resolveKeymap(store.settings.keys));
const k = (id, idx = 0) => keyLabel(km.value[id]?.[idx]);
const hasSecondKey = (id) => !!km.value[id]?.[1];
</script>

<template>
  <div class="kg" :class="{ compact, 'tab-sentuh': tab === 'sentuh' }">
    <!-- TAB SEGMENTED MODERN BERADIUS 10px -->
    <div class="ctrl-tabs" role="tablist" aria-label="Jenis kontrol">
      <button
        type="button"
        role="tab"
        class="ctrl-tab-btn"
        :class="{ active: tab === 'keyboard' }"
        :aria-selected="tab === 'keyboard'"
        @click="tab = 'keyboard'"
      >
        <UiIcon name="papan-ketik" :size="17" />
        <span>Keyboard</span>
      </button>
      <button
        type="button"
        role="tab"
        class="ctrl-tab-btn"
        :class="{ active: tab === 'sentuh' }"
        :aria-selected="tab === 'sentuh'"
        @click="tab = 'sentuh'"
      >
        <UiIcon name="sentuh" :size="17" />
        <span>Layar Sentuh</span>
      </button>
    </div>

    <!-- TAB KEYBOARD: 4 KELOMPOK LENGKAP -->
    <div v-if="tab === 'keyboard'" class="kg-grid">
      <!-- 1. KENDALI HIDUNG -->
      <section class="kg-card">
        <div class="kg-card-head">
          <UiIcon name="target" :size="16" class="head-ic" />
          <span class="head-title">Kendali Hidung</span>
        </div>
        <div class="kg-list">
          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('up') }}</b>
              <template v-if="hasSecondKey('up')">
                <span class="sep">/</span>
                <b class="kbd">{{ k('up', 1) }}</b>
              </template>
            </div>
            <div class="kg-info">
              <b class="kg-act">Hidung Naik (Pitch Up)</b>
              <small class="kg-sub">Arahkan moncong ke atas</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('down') }}</b>
              <template v-if="hasSecondKey('down')">
                <span class="sep">/</span>
                <b class="kbd">{{ k('down', 1) }}</b>
              </template>
            </div>
            <div class="kg-info">
              <b class="kg-act">Hidung Turun (Pitch Down)</b>
              <small class="kg-sub">Arahkan moncong ke bawah</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('left') }}</b>
              <template v-if="hasSecondKey('left')">
                <span class="sep">/</span>
                <b class="kbd">{{ k('left', 1) }}</b>
              </template>
            </div>
            <div class="kg-info">
              <b class="kg-act">Belok Kiri (Yaw)</b>
              <small class="kg-sub">Arahkan haluan ke kiri</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('right') }}</b>
              <template v-if="hasSecondKey('right')">
                <span class="sep">/</span>
                <b class="kbd">{{ k('right', 1) }}</b>
              </template>
            </div>
            <div class="kg-info">
              <b class="kg-act">Belok Kanan (Yaw)</b>
              <small class="kg-sub">Arahkan haluan ke kanan</small>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. KECEPATAN & DORONGAN -->
      <section class="kg-card">
        <div class="kg-card-head">
          <UiIcon name="gas" :size="16" class="head-ic" />
          <span class="head-title">Kecepatan &amp; Dorongan</span>
        </div>
        <div class="kg-list">
          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd wide-key">{{ k('forward') }}</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Gas / Maju</b>
              <small class="kg-sub">Akselerasi daya dorong maju</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd wide-key">{{ k('turbo') }}</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Turbo</b>
              <small class="kg-sub">Tahan untuk melesat cepat</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd wide-key">{{ k('brake') }}</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Rem</b>
              <small class="kg-sub">Tahan untuk perlambatan laju</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd wide-key sp">{{ k('stop') }}</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Berhenti Seketika</b>
              <small class="kg-sub">Langsung diam di tempat</small>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. MANUVER MENGHINDAR -->
      <section class="kg-card kg-wide">
        <div class="kg-card-head">
          <UiIcon name="pesawat" :size="16" class="head-ic" />
          <span class="head-title">Manuver Menghindar (Sampah Antariksa)</span>
        </div>
        <div class="kg-list two-col">
          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('rollL') }}</b>
              <template v-if="hasSecondKey('rollL')">
                <span class="sep">/</span>
                <b class="kbd">{{ k('rollL', 1) }}</b>
              </template>
            </div>
            <div class="kg-info">
              <b class="kg-act">Guling Kiri</b>
              <small class="kg-sub">Putar guling &amp; geser kiri menghindari rintangan</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('rollR') }}</b>
              <template v-if="hasSecondKey('rollR')">
                <span class="sep">/</span>
                <b class="kbd">{{ k('rollR', 1) }}</b>
              </template>
            </div>
            <div class="kg-info">
              <b class="kg-act">Guling Kanan</b>
              <small class="kg-sub">Putar guling &amp; geser kanan menghindari rintangan</small>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. KAMERA & SUDUT PANDANG -->
      <section class="kg-card">
        <div class="kg-card-head">
          <UiIcon name="mata" :size="16" class="head-ic" />
          <span class="head-title">Kamera &amp; Sudut Pandang</span>
        </div>
        <div class="kg-list">
          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('cam') }}</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Ganti Sudut Pandang Kamera</b>
              <small class="kg-sub">Kamera Belakang / Kokpit Pengemudi</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd badge-mouse">Klik Kiri 1&times;</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Aktifkan Kamera Bebas (POV)</b>
              <small class="kg-sub">Gerakkan kursor/trackpad untuk lihat 360&deg;</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd badge-mouse wide">Klik Kanan 1&times; / Klik Kiri 2&times;</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Matikan Kamera Bebas</b>
              <small class="kg-sub">Keluar &amp; luruskan kamera ke depan</small>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. NAVIGASI & MENU -->
      <section class="kg-card">
        <div class="kg-card-head">
          <UiIcon name="orbit" :size="16" class="head-ic" />
          <span class="head-title">Navigasi &amp; Menu</span>
        </div>
        <div class="kg-list">
          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('map') }}</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Buka Peta Tata Surya</b>
              <small class="kg-sub">Pilih tujuan penjelajahan sistem</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">{{ k('target') }}</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Ganti Target Tujuan</b>
              <small class="kg-sub">Pilih planet / target berikutnya</small>
            </div>
          </div>

          <div class="kg-item">
            <div class="kg-keys">
              <b class="kbd">Esc</b>
            </div>
            <div class="kg-info">
              <b class="kg-act">Menu Jeda / Kembali</b>
              <small class="kg-sub">Buka menu opsi atau kembali</small>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- TAB LAYAR SENTUH -->
    <div v-else class="tc">
      <div class="phone" aria-hidden="true">
        <div class="pause-mock"><span>⏸</span><small>Jeda</small></div>
        <div class="stick-mock">
          <div class="grid-ring" />
          <i class="knob" />
          <span>Kemudi Analog</span>
        </div>
        <div class="roll-mock left">↺<small>Kiri</small></div>
        <div class="roll-mock right">↻<small>Kanan</small></div>
        <div class="throttle-mock">
          <div class="mock-speedo">
            <span class="mock-speedo-val">0 <small>km/s</small></span>
            <div class="mock-thrust-line"><i /></div>
          </div>
          <div class="mock-body">
            <div class="slots">
              <span class="slot hot">TURBO</span>
              <span class="slot act">MAJU</span>
              <span class="slot">NETRAL</span>
              <span class="slot warn">REM</span>
            </div>
            <div class="rail"><i class="lever" /></div>
          </div>
        </div>
      </div>
      <ul class="tl">
        <li><b>Kemudi Analog (Kiri)</b> — seret stik analog di kiri bawah untuk mengarahkan moncong pesawat (belok kiri/kanan &amp; naik/turun).</li>
        <li><b>Tuas Kecepatan (Kanan)</b> — geser tuas dorong ke atas untuk <b>Maju / Turbo</b>, tengah untuk <b>Netral</b>, atau bawah untuk <b>Rem</b>.</li>
        <li><b>Tombol Guling Kiri &amp; Kanan</b> — ketuk tombol panah guling di kanan bawah untuk bermanuver menghindari sampah antariksa.</li>
        <li><b>Tombol Jeda</b> — ketuk ikon <b>Jeda</b> di layar untuk membuka Menu Jeda, Peta Tata Surya, Misi, dan Hanggar.</li>
        <li><b>Sentuh &amp; Seret Kamera</b> — sentuh dan geser area tengah layar untuk melihat sekeliling ruang angkasa 360°.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.kg{
  display:flex;
  flex-direction:column;
  gap:16px;
  align-items:center;
  width:100%;
}

/* TAB SEGMENTED MODERN */
.ctrl-tabs{
  display:inline-flex;
  padding:4px;
  gap:6px;
  border-radius:10px;
  background:rgba(11,16,36,.85);
  border:1px solid rgba(148,174,255,.16);
}
.ctrl-tab-btn{
  min-height:36px;
  padding:0 16px;
  border-radius:8px;
  font-size:13.5px;
  font-weight:500;
  font-family:var(--display);
  color:var(--muted);
  background:transparent;
  border:none;
  display:inline-flex;
  align-items:center;
  gap:7px;
  cursor:pointer;
  transition:all .15s ease;
}
.ctrl-tab-btn:hover{
  color:#fff;
  background:rgba(255,255,255,.05);
}
.ctrl-tab-btn.active{
  background:var(--blue);
  color:#fff;
  box-shadow:0 2px 10px rgba(37,99,235,.4);
}

/* GRID 4 KELOMPOK KONTROL */
.kg-grid{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:12px;
  width:100%;
}

.kg-card{
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:14px 16px;
  border-radius:12px;
  background:rgba(11,16,36,.65);
  border:1px solid rgba(148,174,255,.14);
}
.kg-card.kg-wide{
  grid-column:1 / -1;
}
.kg-list.two-col{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:10px 16px;
}
.kg-card-head{
  display:flex;
  align-items:center;
  gap:8px;
  padding-bottom:6px;
  border-bottom:1px solid rgba(148,174,255,.1);
}
.head-ic{
  color:#38bdf8;
  flex:none;
}
.head-title{
  font-family:var(--display);
  font-size:13px;
  font-weight:600;
  color:#fff;
  letter-spacing:.02em;
}

.kg-list{
  display:flex;
  flex-direction:column;
  gap:8px;
}
.kg-item{
  display:flex;
  align-items:center;
  gap:10px;
  min-height:36px;
}

.kg-keys{
  display:inline-flex;
  align-items:center;
  gap:4px;
  flex:none;
}
.sep{
  font-size:11px;
  color:rgba(148,174,255,.4);
}

.kg-info{
  display:flex;
  flex-direction:column;
  min-width:0;
  gap:1px;
}
.kg-act{
  font-family:var(--display);
  font-size:13px;
  font-weight:600;
  color:#fff;
  line-height:1.2;
}
.kg-sub{
  font-size:11px;
  color:var(--muted);
  line-height:1.25;
}

/* TOMBOL KBD */
.kbd{
  min-width:32px;
  height:28px;
  line-height:28px;
  padding:0 6px;
  font-size:12px;
  border-radius:7px;
  text-align:center;
  box-shadow:none;
  background:rgba(148,174,255,.1);
  border:1px solid rgba(148,174,255,.2);
  color:var(--text);
}
.wide-key{
  min-width:54px;
}
.wide-key.sp{
  min-width:64px;
}

.badge-mouse{
  padding:0 8px;
  font-size:11px;
  height:28px;
  line-height:28px;
  white-space:nowrap;
  flex:none;
  background:rgba(59,130,246,.18);
  border-color:rgba(148,174,255,.28);
  color:#93c5fd;
  border-radius:7px;
}
.badge-mouse.wide{
  font-size:10.5px;
  padding:0 9px;
}

/* TAB LAYAR SENTUH */
.tc{display:flex;gap:22px;align-items:center;flex-wrap:wrap;justify-content:center;padding:6px 0}
.phone{position:relative;width:300px;height:158px;border-radius:22px;border:3px solid var(--line-2);background:linear-gradient(160deg,#141d45,#0b1130);flex:none;overflow:hidden}
.pause-mock{position:absolute;left:14px;top:12px;display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:7px;background:rgba(16,23,58,.9);border:1px solid rgba(143,176,255,.26);font-size:9px;color:#e2e8f0}
.pause-mock span{font-size:8px}
.roll-mock{position:absolute;width:30px;height:30px;border-radius:8px;background:rgba(16,23,58,.9);border:1px solid rgba(143,176,255,.26);color:#93c5fd;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;line-height:1}
.roll-mock small{font-size:7px;color:var(--muted)}
.roll-mock.left{right:92px;bottom:14px}
.roll-mock.right{right:86px;bottom:48px}
.stick-mock{position:absolute;left:16px;bottom:22px;width:66px;height:66px;border-radius:50%;background:radial-gradient(circle,rgba(22,33,70,.85) 0%,rgba(10,16,38,.95) 100%);border:2px solid rgba(143,176,255,.25);display:grid;place-items:center}
.stick-mock .grid-ring{position:absolute;inset:12px;border-radius:50%;border:1px dashed rgba(143,176,255,.2)}
.stick-mock .knob{position:relative;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#3b6cf0 0%,#1e3a8a 100%);box-shadow:0 0 10px rgba(59,108,240,.5)}
.stick-mock span{position:absolute;bottom:-18px;font-size:9.5px;font-weight:500;color:var(--muted);white-space:nowrap}
.throttle-mock{position:absolute;right:14px;bottom:14px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 8px;border-radius:10px;background:rgba(16,23,58,.88);border:1px solid rgba(143,176,255,.2)}
.mock-speedo{display:flex;flex-direction:column;align-items:center;gap:2px;width:100%}
.mock-speedo-val{font-family:var(--display);font-size:10.5px;font-weight:600;color:#fff;line-height:1}
.mock-speedo-val small{font-size:8px;font-weight:500;color:#38bdf8}
.mock-thrust-line{width:100%;height:2px;border-radius:2px;background:rgba(148,174,255,.2);overflow:hidden}
.mock-thrust-line i{display:block;width:32%;height:100%;background:#38bdf8;border-radius:2px}
.mock-body{display:flex;align-items:center;gap:6px}
.throttle-mock .slots{display:flex;flex-direction:column;gap:2px}
.throttle-mock .slot{font-size:8px;font-weight:600;color:var(--faint);letter-spacing:.03em}
.throttle-mock .slot.hot{color:#f59e0b}
.throttle-mock .slot.act{color:#60a5fa}
.throttle-mock .slot.warn{color:#f87171}
.throttle-mock .rail{position:relative;width:5px;height:50px;border-radius:999px;background:rgba(10,16,38,.9);border:1px solid rgba(143,176,255,.25);overflow:hidden}
.throttle-mock .lever{position:absolute;left:0;right:0;top:16px;height:10px;border-radius:999px;background:#60a5fa;box-shadow:0 0 6px #60a5fa}
.tl{list-style:none;display:flex;flex-direction:column;gap:8px;max-width:380px;font-size:13px;color:var(--muted);line-height:1.42}
.tl b{color:var(--text);font-weight:600}

@media (max-width:760px){
  .kg-grid,
  .kg-list.two-col{
    grid-template-columns:1fr;
    gap:10px;
  }
}
@media (max-height:540px) and (orientation:landscape){
  .kg{gap:10px}
  .tc{flex-wrap:nowrap;gap:16px;padding:2px 0}
  .phone{width:240px;height:132px;border-radius:18px}
  .tl{font-size:12px;gap:5px;max-width:none}
}
</style>
