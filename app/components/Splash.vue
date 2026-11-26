<script setup>
// Layar awal: Beranda = Bumi berputar, Masuk = Matahari 3D, Daftar = tabrakan galaksi 3D.
// Beranda digambar oleh WebGL kecil (utils/liveBackdrop.js, tanpa Three.js). Masuk & Daftar memakai model GLB yang
// disiapkan (utils/splash3d.js: sun.glb + efek suar/CME/prominensa/granulasi/spikula, galaxy_collision.glb).
// Gambar statis tampil lebih dulu dan jadi cadangan ("kurangi gerakan", hemat data, atau perangkat lambat).
// Dunia 3D game baru dimuat setelah pemain menekan "Main".
import { reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, registerUser, loginUser, logoutUser, loginWithGoogle, showToast, shouldShowGuide, getActiveShipIds, resetGameLoading } from '~/composables/useGame.js';
import { PLANETS } from '~/data/solarSystem.js';

const f = reactive({ name: '', pass: '', show: false, err: '', busy: false, unknown: false });
watch(() => store.oauthError, (msg) => {
  if (msg) f.err = msg;
}, { immediate: true });
function go(screen) { store.screen = screen; f.err = ''; f.pass = ''; f.unknown = false; store.oauthError = ''; }
function play(fromSave) {
  if (!fromSave && store.hasSave) { store.modal = 'confirmNew'; return; }
  store.startFromSave = !!fromSave;
  if (!store.ready) resetGameLoading();
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
  f.busy = true; f.err = ''; f.unknown = false; store.oauthError = '';
  try {
    const r = reg ? await registerUser(f.name, f.pass) : await loginUser(f.name, f.pass);
    if (!r.ok) { f.err = r.err || 'Tidak dapat memproses permintaan saat ini. Silakan coba lagi.'; f.unknown = !!r.unknown; return; }
    f.pass = '';
    showToast(`${reg ? 'Akun dibuat' : 'Selamat datang'}, <b>${store.account.name.replace(/[<>&"]/g, '')}</b>!`, 3200);
    play(store.hasSave);
  } catch (err) {
    console.error('[AstroSphere] Splash auth submit error:', err);
    f.err = 'Saat ini permintaan belum dapat diproses. Silakan coba lagi.';
  } finally {
    f.busy = false;
  }
}
async function handleGoogleLogin() {
  if (f.busy) return;
  f.busy = true;
  f.err = '';
  store.oauthError = '';
  try {
    const r = await loginWithGoogle();
    if (!r.ok) {
      f.err = r.err || 'Tidak dapat menghubungkan layanan Google saat ini.';
    }
  } catch (err) {
    console.error('[AstroSphere] Splash Google login error:', err);
    f.err = 'Tidak dapat menghubungkan layanan Google saat ini.';
  } finally {
    f.busy = false;
  }
}

// ---- latar hidup ----
const liveEl = ref(null), liveOn = ref(false), live3dEl = ref(null), live3dOn = ref(false);
let live = null, liveLoad = null, live3d = null, live3dLoad = null, motionOk = false;
const SCENE_3D = { login: 'sun', register: 'galaxy' };
const hemat = () => store.settings.graphics === 'rendah';
async function getLive3d() {
  if (!motionOk || !live3dEl.value) return null;
  live3dLoad ||= import('~/utils/splash3d.js').then(({ createSplash3D }) =>
    (live3d = motionOk && live3dEl.value ? createSplash3D(live3dEl.value, (v) => { live3dOn.value = v; }, { quality: hemat() ? .8 : 1 }) : null));
  return live3dLoad;
}
async function getLive() {
  if (!motionOk || !liveEl.value) return null;
  liveLoad ||= import('~/utils/liveBackdrop.js').then(({ createLiveBackdrop }) =>
    (live = motionOk && liveEl.value ? createLiveBackdrop(liveEl.value, (v) => { liveOn.value = v; }, { quality: hemat() ? .8 : 1 }) : null));
  return liveLoad;
}
async function showScreen(s) {
  if (s === 'welcome') (await getLive())?.setScene(store.screen === 'welcome' ? 'earth' : null);
  else live?.setScene(null);
  const want = SCENE_3D[s] || null;
  if (!want) { live3d?.setScene(null); return; }
  (await getLive3d())?.setScene(store.screen === s ? want : null);
}
// unduh model lebih awal saat kursor/jari mendekati tombol Masuk/Daftar
async function prefetch3d(name) { (await getLive3d())?.prefetch(name); }
watch(() => store.screen, showScreen);

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

let bootCancelled = false;
onMounted(async () => {
  const c = navigator.connection, slowNet = !!(c && (c.saveData || /2g/.test(c.effectiveType || '')));
  const still = store.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finishSplashBoot = () => {
    store.splashLoading.p = 1;
    store.splashLoading.text = 'Siap menjelajah';
    store.splashLoading.ready = true;
  };

  if (!store.splashLoading.ready) {
    store.splashLoading.p = 0.12;
    store.splashLoading.text = 'Menyiapkan latar semesta';

    const withTimeout = (promise, ms = 12000) => Promise.race([
      promise,
      new Promise((r) => setTimeout(r, ms)),
    ]);

    try {
      await withTimeout((async () => {
        const bgPreload = Promise.all([
          preloadImage('/img/bg-earth.webp'),
          preloadImage('/img/bg-sun.webp'),
          preloadImage('/img/bg-galaxy.webp'),
        ]);
        if (still || slowNet || !liveEl.value) {
          await bgPreload;
          return;
        }
        motionOk = true;
        store.splashLoading.p = 0.28;
        store.splashLoading.text = 'Memuat visual beranda & masuk';
        const [liveInst, live3dInst] = await Promise.all([
          getLive(),
          getLive3d(),
          bgPreload,
        ]);
        if (bootCancelled || store.phase !== 'splash') return;
        store.splashLoading.p = 0.56;
        store.splashLoading.text = 'Menyiapkan animasi Matahari & galaksi';
        await Promise.all([
          liveInst?.preload?.() || Promise.resolve(),
          live3dInst?.preloadAll?.() || Promise.resolve(),
        ]);
        if (bootCancelled || store.phase !== 'splash') return;
        store.splashLoading.p = 0.9;
        store.splashLoading.text = 'Menyelaraskan tampilan awal';
        await showScreen(store.screen);
      })(), 12000);
    } catch {}
    finishSplashBoot();
  } else if (!still && !slowNet && liveEl.value) {
    motionOk = true;
    showScreen(store.screen);
  }

  // Unduh aset jelajah di latar saat browser senggang (prioritas rendah) — bukan di koneksi hemat data.
  if (!slowNet && !bootCancelled) {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    idle(() => {
      if (bootCancelled) return;
      const coreHrefs = [
        '/models/planets/bumi.glb',
        '/models/planets/bulan.glb',
        ...getActiveShipIds().map((id) => `/models/ships/${id}.glb`),
      ];
      for (const href of coreHrefs) {
        if (document.querySelector(`link[href="${href}"]`)) continue;
        const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l);
      }
    }, { timeout: 4000 });
  }
});
onBeforeUnmount(() => { bootCancelled = true; live?.dispose(); live = null; live3d?.dispose(); live3d = null; motionOk = false; });
</script>

<template>
  <div class="splash" :class="[store.screen, { booting: !store.splashLoading.ready }]">
    <div class="bg earth" :class="{ on: store.screen === 'welcome' }" />
    <div class="bg sun" :class="{ on: store.screen === 'login' }" />
    <div class="bg galaxy" :class="{ on: store.screen === 'register' }" />
    <canvas ref="liveEl" class="live" :class="{ on: liveOn }" aria-hidden="true" />
    <canvas ref="live3dEl" class="live" :class="{ on: live3dOn }" aria-hidden="true" />
    <div class="shade" />

    <header class="top">
      <button class="brand" type="button" aria-label="AstroSphere — ke beranda" @click="go('welcome')">
        <UiIcon name="logo" :size="30" />
        <span>AstroSphere</span>
      </button>

      <div v-if="store.account.loggedIn" class="user-pill">
        <span class="user-avatar" aria-hidden="true">{{ store.account.name.slice(0, 1).toUpperCase() }}</span>
        <span class="user-name">Hai, {{ store.account.name }}</span>
        <span class="user-sep" aria-hidden="true" />
        <button class="logout-link" type="button" aria-label="Keluar dari akun" @click="logoutUser">
          <svg class="logout-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Keluar
        </button>
      </div>
    </header>

    <Transition name="rise" mode="out-in">
      <main v-if="store.screen === 'welcome'" key="w" class="hero">
        <h1 class="h1">Jelajahi Tata Surya</h1>
        <p class="lead">Kemudikan pesawatmu melintasi tata surya, pelajari misteri tiap planet, dan tuntaskan misi bersejarah.</p>
        <div class="cta">
          <template v-if="store.hasSave">
            <button class="btn primary lg" @click="play(true)"><UiIcon name="putar" :size="20" />Lanjutkan<small v-if="store.saveMeta">{{ store.saveMeta }}</small></button>
            <button class="btn line lg" @click="play(false)">Mulai baru</button>
          </template>
          <button v-else class="btn primary lg" @click="play(false)"><UiIcon name="putar" :size="20" />Mulai bermain</button>
        </div>
        <div v-if="!store.account.loggedIn" class="acct">
          <button class="btn line" @click="go('login')" @pointerenter="prefetch3d('sun')" @focus="prefetch3d('sun')">
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Masuk
          </button>
          <button class="btn line" @click="go('register')" @pointerenter="prefetch3d('galaxy')" @focus="prefetch3d('galaxy')">
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Daftar
          </button>
        </div>
        <p v-if="!store.account.loggedIn" class="note">Akun tidak wajib — kamu bisa langsung menjelajah.</p>
      </main>

      <main v-else key="f" class="formwrap">
        <form class="card form" novalidate @submit.prevent="submit">
          <button type="button" class="back-link" @click="go('welcome')">
            <span class="back-arrow">&larr;</span> Kembali
          </button>

          <div class="form-header">
            <span class="card-eyebrow">OBSERVATORIUM ASTROSPHERE</span>
            <h2 class="form-title">
              {{ store.screen === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun AstroSphere' }}
            </h2>
            <p class="form-subtitle">
              {{ store.screen === 'login'
                ? 'Masuk untuk melanjutkan petualangan eksplorasi tata surya.'
                : 'Daftar untuk menyimpan progres dan melanjutkan petualanganmu.' }}
            </p>
          </div>

          <label class="form-field">
            <span>Nama Penjelajah</span>
            <input
              v-model="f.name"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              placeholder="Masukkan nama penjelajah"
              maxlength="20"
              class="form-input"
            >
          </label>

          <label class="form-field">
            <span>Kata Sandi</span>
            <div class="pw-box">
              <input
                v-model="f.pass"
                :type="f.show ? 'text' : 'password'"
                :autocomplete="store.screen === 'login' ? 'current-password' : 'new-password'"
                placeholder="Masukkan kata sandi"
                class="form-input"
              >
              <button
                type="button"
                class="eye-btn"
                :aria-label="f.show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                @click="f.show = !f.show"
              >
                <UiIcon name="mata" :size="18" />
              </button>
            </div>
          </label>

          <p v-if="f.err" class="form-err" role="alert">
            {{ f.err }}
            <button v-if="f.unknown" type="button" class="switch-link" @click="go('register')">Daftar sekarang</button>
          </p>

          <button class="btn primary form-submit-btn" type="submit" :disabled="f.busy">
            {{ store.screen === 'login' ? 'Masuk' : 'Daftar' }}
          </button>

          <template v-if="store.screen === 'login'">
            <div class="form-divider">
              <span class="divider-line" />
              <span class="divider-text">ATAU</span>
              <span class="divider-line" />
            </div>

            <button class="btn google-btn" type="button" :disabled="f.busy" @click="handleGoogleLogin">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              Lanjutkan dengan Google
            </button>

            <button class="btn guest-btn" type="button" @click="play(store.hasSave)">
              Masuk sebagai Tamu
            </button>
          </template>

          <p class="form-switch">
            {{ store.screen === 'login' ? 'Belum memiliki akun?' : 'Sudah memiliki akun?' }}
            <button type="button" class="switch-link" @click="go(store.screen === 'login' ? 'register' : 'login')">
              {{ store.screen === 'login' ? 'Daftar' : 'Masuk' }}
            </button>
          </p>
        </form>
      </main>
    </Transition>
  </div>
</template>

<style scoped>
.splash{position:fixed;inset:0;z-index:40;overflow:hidden;background:#05081a}
.splash.booting .top,.splash.booting .hero,.splash.booting .formwrap{opacity:0;pointer-events:none}
.bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .9s ease}
.bg.on{opacity:1}
.earth{background-image:url(/img/bg-earth.webp);background-position:center bottom}
.sun{background-image:url(/img/bg-sun.webp);filter:brightness(.76) saturate(1.05)}
.galaxy{background-image:url(/img/bg-galaxy.webp);background-position:32% center}
.live{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .6s ease;pointer-events:none}
.live.on{opacity:1}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,26,.55) 0%,rgba(5,8,26,0) 34%)}
.top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;padding:calc(18px + var(--safe-t)) calc(28px + var(--safe-r)) 0 calc(28px + var(--safe-l));z-index:2}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:500;font-size:21px}
.user-pill{display:flex;align-items:center;gap:9px;padding:4px 12px 4px 5px;border-radius:10px;background:rgba(10,16,40,.65);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(148,174,255,.22);box-shadow:0 4px 16px rgba(0,0,0,.35)}
.user-avatar{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--blue);color:#ffffff;font-family:var(--display);font-size:12px;font-weight:600;line-height:1;flex:none}
.user-name{font-size:13.5px;font-weight:500;color:#f4f7ff;line-height:1;white-space:nowrap}
.user-sep{width:1px;height:14px;background:rgba(255,255,255,.18);flex:none}
.logout-link{display:inline-flex;align-items:center;gap:5px;background:none;border:none;padding:0;margin:0;font-family:inherit;font-size:13px;font-weight:500;color:rgba(226,234,255,.8);cursor:pointer;transition:color .15s}
.logout-link:hover{color:#fca5a5}
.logout-icon{display:block;flex:none;opacity:.85;transition:transform .15s}
.logout-link:hover .logout-icon{opacity:1;transform:translateX(1px)}
.hero{position:absolute;top:50%;left:50%;transform:translate(-50%,-56%);width:min(840px,calc(100vw - 32px));text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px;z-index:2}
.hero .h1{font-size:clamp(26px,3.4vw,44px);white-space:nowrap;text-shadow:0 4px 28px rgba(0,0,0,.75);letter-spacing:-.01em;line-height:1.15}
.hero .lead{max-width:58ch;font-size:clamp(14px,1.4vw,16.5px);line-height:1.6;color:rgba(235,241,255,.92);text-shadow:0 2px 12px rgba(4,8,24,.85)}
.cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.cta .btn{min-width:200px;height:48px;min-height:48px;border-radius:10px;font-weight:500;font-size:15.5px;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.cta .btn.primary{background:var(--blue);box-shadow:0 4px 18px rgba(37,99,235,.45)}
.cta .btn.primary:hover{filter:brightness(1.12)}
.cta .btn.line{background:rgba(14,21,51,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(148,174,255,.35);color:#f4f7ff}
.cta .btn.line:hover{background:rgba(20,30,70,.92);border-color:rgba(148,174,255,.55)}
.cta .btn small{font-family:var(--font);font-weight:400;font-size:12.5px;opacity:.85;margin-left:4px}
.acct{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.acct .btn{min-width:116px;height:40px;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;font-size:14px;font-weight:500;background:rgba(6,10,26,.25);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(226,234,255,.28);color:rgba(241,244,255,.92);box-shadow:none;transition:background .15s,border-color .15s,transform .12s}
.acct .btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.45);color:#ffffff}
.btn-icon{flex:none;display:block;opacity:.92}
.note{font-size:13px;color:rgba(235,241,255,.88);text-shadow:0 2px 12px rgba(4,8,24,.98)}
.formwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:calc(46px + var(--safe-t)) calc(clamp(28px,5vw,72px) + var(--safe-r)) calc(18px + var(--safe-b)) calc(clamp(28px,5vw,72px) + var(--safe-l));z-index:2;overflow-y:auto}
.login .formwrap{justify-content:flex-start}
.register .formwrap{justify-content:flex-end}
.form{position:relative;flex:0 0 auto;width:min(432px,100%);margin:auto 0;padding:30px 32px;display:flex;flex-direction:column;gap:14px;background:rgba(11,16,33,.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(148,163,184,.18);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.65)}
.back-link{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:rgba(170,182,224,.85);cursor:pointer;background:none;border:none;padding:0;margin-bottom:2px;transition:color .15s}
.back-link:hover{color:#f4f7ff}
.back-arrow{font-size:14px;line-height:1}
.form-header{display:flex;flex-direction:column;gap:6px;margin-bottom:4px;text-align:left}
.card-eyebrow{font-size:11px;letter-spacing:.08em;color:#38bdf8;font-weight:600;text-transform:uppercase}
.form-title{font-size:21px;font-weight:600;color:#f4f7ff;line-height:1.25;margin:0}
.form-subtitle{font-size:13px;color:var(--muted);line-height:1.45}
.form-field{display:flex;flex-direction:column;gap:7px;text-align:left;font-size:13px;font-weight:500;color:#cbd5e1}
.form-input{width:100%;height:41px;padding:0 14px;background:#161d36;border:1px solid #2a355c;border-radius:10px;color:#f4f7ff;font-size:14px;transition:border-color .15s,box-shadow .15s}
.form-input:focus{outline:none;border-color:#38bdf8;box-shadow:0 0 0 2px rgba(56,189,248,.2)}
.form-input::placeholder{color:rgba(148,163,184,.65);font-size:13.5px}
.form-input:-webkit-autofill,
.form-input:-webkit-autofill:hover,
.form-input:-webkit-autofill:focus,
.form-input:-webkit-autofill:active{
  -webkit-text-fill-color:#f4f7ff !important;
  -webkit-box-shadow:0 0 0 1000px #161d36 inset !important;
  box-shadow:0 0 0 1000px #161d36 inset !important;
  transition:background-color 5000s ease-in-out 0s;
  caret-color:#f4f7ff;
}
.pw-box{position:relative;width:100%}
.pw-box .form-input{padding-right:44px}
.eye-btn{position:absolute;right:4px;top:2.5px;width:36px;height:36px;display:grid;place-items:center;color:var(--muted);background:none;border:none;border-radius:8px;cursor:pointer;transition:color .15s}
.eye-btn:hover{color:#f4f7ff}
.form-err{color:var(--coral);font-size:13px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);padding:8px 12px;border-radius:8px}
.form-submit-btn{width:100%;height:41px;min-height:41px;margin-top:4px;border-radius:10px;font-weight:500;font-size:14.5px;background:var(--blue);color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(37,99,235,.4)}
.form-submit-btn:hover{filter:brightness(1.12)}
.form-divider{display:flex;align-items:center;gap:12px;margin:2px 0}
.divider-line{flex:1;height:1px;background:rgba(148,174,255,.18)}
.divider-text{font-size:11px;font-weight:600;letter-spacing:.06em;color:rgba(170,182,224,.75)}
.google-btn{width:100%;height:41px;min-height:41px;border-radius:10px;font-size:13.5px;font-weight:500;background:#ffffff;color:#0f172a;border:1px solid rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 2px 10px rgba(0,0,0,.35);cursor:pointer;transition:background .15s,filter .15s,transform .12s}
.google-btn:hover{background:#f8fafc;filter:brightness(1.02)}
.google-btn:active{transform:translateY(1px)}
.guest-btn{width:100%;height:41px;min-height:41px;border-radius:10px;font-size:13.5px;font-weight:500;background:rgba(255,255,255,.03);border:1px solid rgba(148,174,255,.22);color:#f4f7ff;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s}
.guest-btn:hover{background:rgba(255,255,255,.08);border-color:rgba(148,174,255,.4)}
.form-switch{text-align:center;font-size:13px;color:var(--muted);margin-top:2px}
.switch-link{color:#38bdf8;font-weight:500;margin-left:4px;cursor:pointer;background:none;border:none;padding:0;transition:color .15s}
.switch-link:hover{color:#7dd3fc;text-decoration:underline;text-underline-offset:3px}
.login .shade{background:radial-gradient(ellipse at 72% 72%,rgba(5,8,26,.16) 0%,rgba(5,8,26,.38) 78%),linear-gradient(90deg,rgba(5,8,26,.44) 0%,rgba(5,8,26,.14) 48%,rgba(5,8,26,.08) 100%)}
.register .shade{background:linear-gradient(270deg,rgba(5,8,26,.42) 0%,rgba(5,8,26,.12) 45%,rgba(5,8,26,0) 72%)}
@media (max-width:768px){
  .top{padding:calc(12px + var(--safe-t)) 16px 0}
  .brand span{font-size:18px}
  .hero{top:50%;bottom:auto;left:50%;transform:translate(-50%,-52%);gap:14px;width:calc(100vw - 32px)}
  .hero .h1{white-space:normal;font-size:clamp(28px,6.5vw,36px)}
  .hero .lead{font-size:14px;line-height:1.5}
  .cta{flex-direction:column;width:100%;max-width:340px}
  .cta .btn{width:100%}
  .acct{width:100%;max-width:340px;flex-wrap:nowrap;gap:8px}
  .acct .btn{flex:1;min-width:0}
  .user-pill{padding:3px 10px 3px 4px;gap:7px}
  .user-name{font-size:12.5px}
  .galaxy{background-position:center center}
  .formwrap,.login .formwrap,.register .formwrap{justify-content:center;padding:calc(54px + var(--safe-t)) 14px 20px}
  .login .shade,.register .shade{background:radial-gradient(ellipse at center,rgba(5,8,26,.2),rgba(5,8,26,.55) 85%)}
  .form{padding:24px 22px;gap:13px}
  .form-title{font-size:19.5px}
}
@media (max-width:768px) and (max-height:700px){ .hero{top:50%;transform:translate(-50%,-50%)} .note{display:none} }
</style>
