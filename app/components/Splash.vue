<script setup>
// Layar awal: Beranda = Bumi berputar, Masuk = Matahari, Daftar = lubang hitam.
// Latar digambar hidup oleh WebGL kecil (utils/liveBackdrop.js, tanpa Three.js); gambar statis tampil lebih dulu
// dan jadi cadangan (mode Hemat untuk lubang hitam, "kurangi gerakan", hemat data, atau perangkat lambat).
// Dunia 3D game baru dimuat setelah pemain menekan "Main".
import { reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, registerUser, loginUser, logoutUser, showToast, shouldShowGuide } from '~/composables/useGame.js';
import { PLANETS } from '~/data/solarSystem.js';
import { SHIP_IDS } from '~/data/ships.js';

const f = reactive({ name: '', pass: '', show: false, err: '', busy: false, unknown: false });
function go(screen) { store.screen = screen; f.err = ''; f.pass = ''; f.unknown = false; }
function play(fromSave) {
  if (!fromSave && store.hasSave) { store.modal = 'confirmNew'; return; }
  store.startFromSave = !!fromSave;
  if (shouldShowGuide()) {
    store.phase = 'guide';
  } else {
    store.phase = 'loading';
  }
}
async function submit() {
  if (f.busy) return;
  const reg = store.screen === 'register';
  if (!f.name.trim()) { f.err = 'Isi nama penjelajah.'; return; }
  if (!f.pass) { f.err = 'Isi kata sandi.'; return; }
  f.busy = true; f.err = ''; f.unknown = false;
  const r = reg ? await registerUser(f.name, f.pass) : await loginUser(f.name, f.pass);
  f.busy = false;
  if (!r.ok) { f.err = r.err; f.unknown = !!r.unknown; return; }
  f.pass = '';
  showToast(`${reg ? 'Akun dibuat' : 'Selamat datang'}, <b>${store.account.name.replace(/[<>&"]/g, '')}</b>!`, 3200);
  play(store.hasSave);
}

// ---- latar hidup ----
const liveEl = ref(null), liveOn = ref(false);
let live = null;
const SCENE = { welcome: 'earth', login: 'sun', register: 'hole' };
const hemat = () => store.settings.graphics === 'rendah';
const sceneFor = (s) => (hemat() && s === 'register' ? null : SCENE[s]);
watch(() => store.screen, (s) => live?.setScene(sceneFor(s)));

onMounted(async () => {
  const c = navigator.connection, slowNet = !!(c && (c.saveData || /2g/.test(c.effectiveType || '')));
  // Unduh model 3D inti di latar saat browser senggang (prioritas rendah) — bukan di koneksi hemat data.
  if (!slowNet) {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    idle(() => {
      const coreHrefs = ['/models/planets/bumi.glb', '/models/planets/bulan.glb', '/models/ships/astra.glb'];
      for (const href of coreHrefs) {
        if (document.querySelector(`link[href="${href}"]`)) continue;
        const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l);
      }
    }, { timeout: 4000 });
  }
  const still = store.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || slowNet || !liveEl.value) return;
  const { createLiveBackdrop } = await import('~/utils/liveBackdrop.js');
  if (!liveEl.value) return;
  live = createLiveBackdrop(liveEl.value, (v) => { liveOn.value = v; }, { quality: hemat() ? .8 : 1 });
  live?.setScene(sceneFor(store.screen));
});
onBeforeUnmount(() => { live?.dispose(); live = null; });
</script>

<template>
  <div class="splash" :class="store.screen">
    <div class="bg earth" :class="{ on: store.screen === 'welcome' }" />
    <div class="bg sun" :class="{ on: store.screen === 'login' }" />
    <div class="bg hole" :class="{ on: store.screen === 'register' }" />
    <canvas ref="liveEl" class="live" :class="{ on: liveOn }" aria-hidden="true" />
    <div class="shade" />

    <header class="top">
      <button class="brand" type="button" aria-label="AstroSphere — ke beranda" @click="go('welcome')"><UiIcon name="logo" :size="30" /><span>AstroSphere</span></button>
    </header>

    <Transition name="rise" mode="out-in">
      <main v-if="store.screen === 'welcome'" key="w" class="hero">
        <h1 class="h1">Jelajahi tata surya</h1>
        <p class="lead">Terbangkan pesawatmu, singgahi delapan planet, dan kumpulkan bintang dari kuis.</p>
        <div class="cta">
          <template v-if="store.hasSave">
            <button class="btn primary lg" @click="play(true)"><UiIcon name="putar" :size="20" />Lanjutkan<small v-if="store.saveMeta">{{ store.saveMeta }}</small></button>
            <button class="btn line lg" @click="play(false)">Mulai baru</button>
          </template>
          <button v-else class="btn primary lg" @click="play(false)"><UiIcon name="putar" :size="20" />Mulai bermain</button>
        </div>
        <div v-if="store.account.loggedIn" class="acct me">
          <span class="avatar" aria-hidden="true">{{ store.account.name.slice(0, 1).toUpperCase() }}</span>
          <span class="hi">Hai, <b>{{ store.account.name }}</b></span>
          <button class="btn ghost sm" @click="logoutUser">Keluar</button>
        </div>
        <div v-else class="acct">
          <button class="btn line" @click="go('login')"><UiIcon name="pengguna" :size="18" />Masuk</button>
          <button class="btn line" @click="go('register')"><UiIcon name="plus" :size="18" />Daftar</button>
        </div>
        <p v-if="!store.account.loggedIn" class="note">Akun tidak wajib — kamu bisa langsung main.</p>
      </main>

      <main v-else key="f" class="formwrap">
        <form class="card form" novalidate @submit.prevent="submit">
          <button type="button" class="ib sm back" aria-label="Kembali ke beranda" @click="go('welcome')"><UiIcon name="kembali" :size="20" /></button>
          <h2 class="h2">{{ store.screen === 'login' ? 'Selamat datang kembali' : 'Buat akun penjelajah' }}</h2>
          <p class="small">{{ store.screen === 'login' ? 'Masuk dengan nama dan kata sandimu.' : 'Daftar dengan nama unik dan kata sandi.' }}</p>
          <label class="field">
            Nama penjelajah
            <input v-model="f.name" autocomplete="username" autocapitalize="none" placeholder="Contoh: penjelajah_01" maxlength="20">
          </label>
          <label class="field">Kata sandi
            <span class="pw"><input v-model="f.pass" :type="f.show ? 'text' : 'password'" :autocomplete="store.screen === 'login' ? 'current-password' : 'new-password'" :placeholder="store.screen === 'login' ? 'Kata sandimu' : 'Minimal 6 karakter'"><button type="button" class="eye" :aria-label="f.show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="f.show = !f.show"><UiIcon name="mata" :size="20" /></button></span>
          </label>
          <p v-if="f.err" class="err" role="alert">{{ f.err }}<button v-if="f.unknown" type="button" class="link" @click="go('register')">Daftar sekarang</button></p>
          <button class="btn primary block" type="submit" :disabled="f.busy">{{ store.screen === 'login' ? 'Masuk' : 'Daftar' }}</button>
          <button class="btn ghost block" type="button" @click="play(store.hasSave)">Main sebagai tamu</button>
          <p class="sw">{{ store.screen === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?' }}
            <button type="button" class="link" @click="go(store.screen === 'login' ? 'register' : 'login')">{{ store.screen === 'login' ? 'Daftar' : 'Masuk' }}</button></p>
          <p class="fine">Akun &amp; progres tersinkronisasi aman dengan awan Supabase.</p>
        </form>
      </main>
    </Transition>
  </div>
</template>

<style scoped>
.splash{position:fixed;inset:0;z-index:40;overflow:hidden;background:#05081a}
.bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .9s ease}
.bg.on{opacity:1}
.earth{background-image:url(/img/bg-earth.webp);background-position:center bottom}
.sun{background-image:url(/img/bg-sun.webp)}
.hole{background-image:url(/img/bg-blackhole.webp)}
.live{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .6s ease;pointer-events:none}
.live.on{opacity:1}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,26,.55) 0%,rgba(5,8,26,0) 34%)}
.top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;padding:calc(18px + var(--safe-t)) calc(28px + var(--safe-r)) 0 calc(28px + var(--safe-l));z-index:2}
<<<<<<< HEAD
.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:500;font-size:21px}
=======
.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight: 500;font-size:21px}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.hero{position:absolute;left:50%;top:12vh;transform:translateX(-50%);width:min(720px,calc(100vw - 32px));text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px;z-index:2}
.hero .h1{font-size:clamp(42px,7vw,84px);text-shadow:0 6px 40px rgba(0,0,0,.5)}
.hero .lead{max-width:34ch;font-size:clamp(16px,1.6vw,19px);color:#d5dcf5;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.cta .btn{min-width:200px}
.cta .btn small{font-family:var(--font);font-weight:400;font-size:12.5px;opacity:.85;margin-left:4px}
.acct{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.acct .btn{min-width:140px;background:rgba(8,12,34,.55)}
.acct.me{align-items:center;gap:12px;padding:6px 8px 6px 6px;border-radius:999px;background:rgba(8,12,34,.6);border:1px solid var(--line)}
<<<<<<< HEAD
.avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--blue);font-family:var(--display);font-weight:500}
.hi{color:var(--muted);font-size:15px}.hi b{color:var(--text);font-family:var(--display);font-weight:500}
=======
.avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--blue);font-family:var(--display);font-weight: 500}
.hi{color:var(--muted);font-size:15px}.hi b{color:var(--text);font-family:var(--display);font-weight: 500}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.note{font-size:13.5px;color:#c4cdee;text-shadow:0 1px 8px rgba(0,0,0,.7)}
.formwrap{position:absolute;inset:0;display:grid;place-items:center;padding:80px 16px 24px;z-index:2;overflow-y:auto}
.form{position:relative;width:min(420px,100%);padding:30px 28px 22px;display:flex;flex-direction:column;gap:14px;background:rgba(10,15,40,.9)}
.form .h2{font-size:26px;padding-right:44px}
.back{position:absolute;right:16px;top:16px}
.pw{position:relative;display:block}.pw input{padding-right:52px}
.eye{position:absolute;right:6px;top:5px;width:40px;height:40px;display:grid;place-items:center;color:var(--muted);border-radius:10px}
.err{color:var(--coral);font-size:14px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
.sw{text-align:center;font-size:14px;color:var(--muted)}
<<<<<<< HEAD
.link{color:var(--sky);font-weight:500;text-decoration:underline;text-underline-offset:3px}
=======
.link{color:var(--sky);font-weight: 500;text-decoration:underline;text-underline-offset:3px}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.fine{text-align:center;font-size:12px;color:var(--faint)}
.login .shade{background:linear-gradient(90deg,rgba(5,8,26,.35),rgba(5,8,26,0) 55%)}
.register .shade{background:radial-gradient(ellipse at center,rgba(0,0,0,0),rgba(0,0,0,.35) 80%)}
@media (max-width:760px){
  .top{padding:calc(12px + var(--safe-t)) 16px 0}
  .brand span{font-size:18px}
  .hero{top:auto;bottom:calc(40vh + 8px);gap:14px}
  .cta{flex-direction:column;width:100%;max-width:340px}
  .cta .btn{width:100%}
  .acct:not(.me){width:100%;max-width:340px;flex-wrap:nowrap}
  .acct:not(.me) .btn{flex:1;min-width:0}
  .form{padding:24px 18px 18px}
}
@media (max-width:760px) and (max-height:700px){ .hero{bottom:26vh} .note{display:none} }
</style>
