<script setup>
// Modal: akun (login/daftar — UI saja, backend belum tersambung), pengaturan, kontrol, jurnal, konfirmasi.
import { reactive, computed, ref } from 'vue';
import { store, game, saveAccount, wipeAll } from '~/composables/useGame.js';
import { SUN, PLANETS, MOONS, BELT, COLOR_OF } from '~/data/solarSystem.js';
const f = reactive({ name: '', email: '', pass: '', show: false, err: '' });
function close() { store.modal = null; f.err = ''; }
function login() {
  if (!/^\S+@\S+\.\S+$/.test(f.email)) { f.err = 'Masukkan alamat email yang valid.'; return; }
  if (f.pass.length < 8) { f.err = 'Password minimal 8 karakter.'; return; }
  Object.assign(store.account, { loggedIn: true, email: f.email, name: f.name || f.email.split('@')[0] }); saveAccount();
  f.pass = ''; close();
  store.toast.html = 'Masuk sebagai <b>' + store.account.name + '</b> · sinkronisasi cloud belum tersambung, progres tetap lokal'; store.toast.show = true; setTimeout(() => { store.toast.show = false; }, 4000);
}
function logout() { Object.assign(store.account, { loggedIn: false, name: '', email: '' }); saveAccount(); close(); }
function setting(k, v) { store.settings[k] = v; game()?.applySettings(); }
const bodies = computed(() => [SUN, ...PLANETS, ...MOONS, BELT]);
const found = (id) => store.discovered.includes(id);
function wipe() { wipeAll(); location.reload(); }
const confirmWipe = ref(false);
</script>
<template>
  <Transition name="fade">
    <div v-if="store.modal" class="modal" @pointerdown.self="close">
      <div class="box panel" role="dialog" aria-modal="true">
        <button class="x ib" aria-label="Tutup" @click="close"><UiIcon name="tutup" :size="18" /></button>

        <template v-if="store.modal === 'login' || store.modal === 'register'">
          <div class="kicker acc">{{ store.modal === 'login' ? 'Akun AstroSphere · opsional' : 'Buat akun · opsional' }}</div>
          <h2>{{ store.modal === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun AstroSphere' }}</h2>
          <div v-if="store.account.loggedIn" class="info">Kamu masuk sebagai <b>{{ store.account.name }}</b>. <button class="link" @click="logout">Keluar</button></div>
          <template v-else>
            <div class="info"><i />Sinkronisasi cloud belum tersambung di versi ini. Progres tamu tetap tersimpan di browser dan dapat ditautkan setelah backend tersedia.</div>
            <form class="form" @submit.prevent="login">
              <label v-if="store.modal === 'register'"><span class="kicker">Nama pengguna</span><input v-model="f.name" autocomplete="nickname" placeholder="Nama penjelajah"></label>
              <label><span class="kicker">Email</span><input v-model="f.email" type="email" autocomplete="email" placeholder="nama@email.com"></label>
              <label><span class="kicker">Password</span><span class="pw"><input v-model="f.pass" :type="f.show ? 'text' : 'password'" :autocomplete="store.modal === 'login' ? 'current-password' : 'new-password'" placeholder="Minimal 8 karakter"><button type="button" class="eye" :aria-label="f.show ? 'Sembunyikan password' : 'Tampilkan password'" @click="f.show = !f.show"><UiIcon name="mata" :size="18" /></button></span></label>
              <p v-if="f.err" class="err" role="alert">{{ f.err }}</p>
              <button class="btn primary block" type="submit">{{ store.modal === 'login' ? 'Masuk' : 'Daftar' }}</button>
            </form>
            <button class="btn ghost block" @click="close">Lanjut sebagai tamu</button>
            <p class="sw">{{ store.modal === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?' }} <button class="link" @click="store.modal = store.modal === 'login' ? 'register' : 'login'">{{ store.modal === 'login' ? 'Daftar' : 'Masuk' }}</button></p>
          </template>
        </template>

        <template v-else-if="store.modal === 'settings'">
          <div class="kicker">Preferensi pemain</div><h2>Pengaturan</h2>
          <UiToggle :model-value="store.settings.soundEnabled" label="Suara" sub="Mesin, ambien, dan efek" @update:model-value="setting('soundEnabled', $event)" />
          <div class="trow"><span>Opasitas HUD</span><span class="rng"><input type="range" min=".2" max="1" step=".05" :value="store.settings.hudOpacity" @input="setting('hudOpacity', +$event.target.value)"><b class="mono">{{ Math.round(store.settings.hudOpacity * 100) }}%</b></span></div>
          <div class="trow"><span>Sensitivitas mouse</span><span class="rng"><input type="range" min=".3" max="2.5" step=".1" :value="store.settings.sensitivity" @input="setting('sensitivity', +$event.target.value)"><b class="mono">{{ store.settings.sensitivity.toFixed(1) }}×</b></span></div>
          <UiToggle :model-value="store.settings.invertY" label="Balik sumbu vertikal" sub="Dorong ke atas = hidung turun" @update:model-value="setting('invertY', $event)" />
          <UiToggle :model-value="store.settings.reduceMotion" label="Kurangi gerak" sub="Tanpa rotasi kamera otomatis; data astronomi tidak berubah" @update:model-value="setting('reduceMotion', $event)" />
          <div class="trow"><span>Kualitas grafis<small>Rendah = tanpa bloom, resolusi lebih ringan</small></span><span class="seg"><button :class="{ on: store.settings.graphics === 'tinggi' }" @click="setting('graphics', 'tinggi')">Tinggi</button><button :class="{ on: store.settings.graphics === 'rendah' }" @click="setting('graphics', 'rendah')">Rendah</button></span></div>
          <div class="danger">
            <button v-if="!confirmWipe" class="btn sm dz" @click="confirmWipe = true">Hapus data tersimpan</button>
            <template v-else><span class="dim">Posisi, jurnal, poin, dan pengaturan di browser ini akan dihapus permanen.</span><button class="btn sm" @click="confirmWipe = false">Batal</button><button class="btn sm dz" @click="wipe">Hapus</button></template>
          </div>
        </template>

        <template v-else-if="store.modal === 'controls'">
          <div class="kicker">Panduan</div><h2>Kontrol</h2>
          <div class="ctl">
            <h3>Keyboard &amp; mouse</h3>
            <div class="r"><span>Dorong maju / mundur</span><span><kbd>W</kbd> <kbd>S</kbd> · roda mouse</span></div>
            <div class="r"><span>Kemudi</span><span>Mouse · <kbd>A</kbd><kbd>D</kbd> <kbd>↑</kbd><kbd>↓</kbd></span></div>
            <div class="r"><span>Guling · naik/turun</span><span><kbd>Q</kbd><kbd>E</kbd> · <kbd>Space</kbd><kbd>C</kbd></span></div>
            <div class="r"><span>Boost · berhenti</span><span><kbd>Shift</kbd> · <kbd>X</kbd></span></div>
            <div class="r"><span>Target · arahkan</span><span><kbd>T</kbd> · tahan <kbd>G</kbd></span></div>
            <div class="r"><span>Pandangan bebas</span><span>tahan klik kanan / <kbd>L</kbd></span></div>
            <div class="r"><span>Kamera · peta · jurnal</span><span><kbd>V</kbd> · <kbd>M</kbd> · <kbd>J</kbd></span></div>
            <div class="r"><span>Garis orbit · HUD · jeda</span><span><kbd>O</kbd> · <kbd>H</kbd> · <kbd>Esc</kbd></span></div>
            <h3>Mode Planet, Sejarah &amp; Fenomena</h3>
            <div class="r"><span>Putar kamera · zoom</span><span>seret · roda mouse / cubit</span></div>
            <div class="r"><span>Kembali menjelajah</span><span><kbd>Esc</kbd></span></div>
            <h3>Layar sentuh</h3>
            <div class="r"><span>Kemudi · dorongan</span><span>geser kiri · tuas kanan</span></div>
            <div class="r"><span>Pandangan bebas</span><span>geser area kosong</span></div>
          </div>
        </template>

        <template v-else-if="store.modal === 'journal'">
          <div class="kicker">{{ store.discovered.length }}/{{ bodies.length }} objek tercatat</div><h2>Jurnal penjelajahan</h2>
          <div class="journal">
            <div v-for="b in bodies" :key="b.id" class="jr" :class="{ unk: !found(b.id) }">
              <i :style="{ background: found(b.id) ? COLOR_OF[b.id] : 'transparent' }" />
              <div><b>{{ found(b.id) ? b.name : 'Belum ditemukan' }}</b><em v-if="found(b.id)">{{ b.kind }}</em><p>{{ found(b.id) ? b.desc : 'Terbanglah lebih dekat untuk memindai objek ini.' }}</p></div>
            </div>
          </div>
        </template>

        <template v-else-if="store.modal === 'confirmNew'">
          <div class="kicker">Konfirmasi</div><h2>Mulai penjelajahan baru?</h2>
          <p class="dim">Posisi pesawat dan jurnal penemuan yang tersimpan akan diganti dengan perjalanan baru dari orbit Bumi. Poin, skor kuis, dan pesawat tetap dimiliki.</p>
          <div class="acts"><button class="btn ghost" @click="close">Batal</button><button class="btn primary" @click="close(); game()?.startGame(false)">Mulai baru</button></div>
        </template>
      </div>
    </div>
  </Transition>
</template>
<style scoped>
.modal{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(1,3,10,.62);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.box{position:relative;width:min(560px,92vw);max-height:86vh;overflow:auto;padding:26px 26px 24px;display:flex;flex-direction:column;gap:12px;touch-action:pan-y}
.x{position:absolute;right:14px;top:14px}
h2{font-size:22px;font-weight:600;letter-spacing:.02em;margin-bottom:4px;padding-right:48px}
.info{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:10px;background:var(--soft);border:1px solid var(--line);font-size:12.5px;line-height:1.5}
.info i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--acc2);margin-top:5px}
.form{display:flex;flex-direction:column;gap:12px}
label{display:flex;flex-direction:column;gap:7px}
input:not([type=range]){width:100%;min-height:46px;padding:11px 14px;border-radius:9px;border:1px solid var(--line);background:var(--bg);font-size:14px;-webkit-user-select:text;user-select:text}
input::placeholder{color:var(--faint)}
.pw{position:relative;display:block}.pw input{padding-right:46px}
.eye{position:absolute;right:4px;top:4px;width:38px;height:38px;display:grid;place-items:center;color:var(--dim)}
.err{color:var(--danger);font-size:12.5px}
.sw{text-align:center;font-size:12.5px;color:var(--dim)}
.link{color:var(--acc);text-decoration:underline;text-underline-offset:3px}
.rng{display:flex;align-items:center;gap:10px;width:200px}.rng b{font-size:12px;color:var(--dim);width:44px;text-align:right}
.danger{margin-top:12px;display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
.dz{border-color:rgba(255,110,90,.45);color:#ffb3a6}
.dim{color:var(--dim);font-size:13px;line-height:1.5}
.ctl h3{font-size:11px;letter-spacing:.26em;color:var(--acc);margin:14px 0 6px;text-transform:uppercase}
.ctl .r{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--dim);padding:5px 0}
.ctl .r span:last-child{color:var(--txt);text-align:right}
.journal{display:grid;gap:8px}
.jr{display:grid;grid-template-columns:14px 1fr;gap:12px;padding:12px 14px;border:1px solid var(--divider);border-radius:9px;background:rgba(var(--acc-rgb),.03)}
.jr i{width:12px;height:12px;border-radius:50%;margin-top:4px}
.jr.unk i{border:1px dashed var(--faint)}
.jr b{font-size:15px;letter-spacing:.06em;text-transform:uppercase}
.jr.unk b{color:var(--faint)}
.jr em{font-style:normal;color:var(--acc);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;margin-left:8px}
.jr p{color:var(--dim);font-size:13px;line-height:1.45;margin-top:4px}
.acts{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}
</style>
