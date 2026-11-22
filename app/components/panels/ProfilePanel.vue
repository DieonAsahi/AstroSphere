<script setup>
// Profil pemain: Riwayat kuis · Pesawat (inventaris) · Kontrol (bisa diubah) · Akun & Awan (Supabase) · FAQ & kredit.
import { computed, ref, reactive, onBeforeUnmount } from 'vue';
import {
  store,
  game,
  saveProgress,
  saveSettings,
  quizMax,
  showToast,
  registerUser,
  loginUser,
  logoutUser,
} from '~/composables/useGame.js';
import { PLANETS, NAME_OF } from '~/data/solarSystem.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
import { POINTS_PER_QUESTION } from '~/data/quiz.js';
import { ACTIONS, resolveKeymap, keyLabels, keyLabel, canBind } from '~/data/keymap.js';
import { MODEL_CREDITS, LICENSE_URL } from '~/data/credits.js';
import { fmtDate } from '~/game/util.js';

const P = store.progress;
const TABS = [
  ['kuis', 'Riwayat kuis'],
  ['armada', 'Pesawat'],
  ['kontrol', 'Kontrol'],
  ['akun', 'Akun & Awan'],
  ['faq', 'Bantuan'],
];

const tab = computed({
  get: () => (TABS.some(([id]) => id === store.profileTab) ? store.profileTab : 'kuis'),
  set: (v) => { store.profileTab = v; },
});

const name = computed(() => store.account.loggedIn ? store.account.name : 'Penjelajah Tamu');
const visited = computed(() => store.discovered.filter((d) => PLANETS.some((p) => p.id === d)).length);
const perfect = computed(() => PLANETS.filter((p) => (P.best[p.id] ?? 0) >= quizMax()).length);
const stars = (s) => Math.round((s ?? 0) / POINTS_PER_QUESTION);
const ledger = computed(() => [...P.ledger].reverse().slice(0, 6));

const ledgerLabel = (l) => l.type === 'kuis' ? `Kuis ${PLANETS.find((p) => p.id === l.planet)?.name || ''}`
  : l.type === 'pesawat' ? `Membuka ${SHIPS[l.ship]?.name || 'pesawat'}`
  : l.type === 'tebak' ? `Tebakan benar: ${l.key?.startsWith('gerhana') ? (l.key === 'gerhana-bulan' ? 'gerhana Bulan' : 'gerhana Matahari') : PLANETS.find((p) => p.id === l.key)?.name || ''}`
  : l.type === 'mitos' ? `Mitos atau Fakta · ${l.correct}/${l.total} benar`
  : l.type === 'kartu' ? `Kartu baru: ${NAME_OF[l.key] || ''}`
  : l.type === 'peristiwa' ? (l.key === 'badai' ? 'Selamat dari badai Matahari' : 'Lolos dari sampah antariksa')
  : l.type === 'misi' ? (l.key === 'mco' ? 'Misi Mars Climate Orbiter selesai' : 'Misi Apollo 13 selesai') : 'Bintang';

function quiz(id) { store.quiz.planet = id; store.quiz.stage = 'intro'; game()?.setMode('kuis'); }
function openHangar(id) { game()?.setMode('hanggar'); game()?.previewShip(id); }
function useShip(id) { if (!P.owned.includes(id)) return; P.selectedShip = id; saveProgress(); game()?.setShip(id); game()?.chime(); }

// ---- ubah tombol ----
const km = computed(() => resolveKeymap(store.settings.keys));
const cap = ref(null);
function onCapture(e) {
  e.preventDefault(); e.stopPropagation();
  if (e.code === 'Escape') return endCapture();
  if (!canBind(e.code)) { showToast('Tombol itu tidak bisa dipakai.'); return; }
  const id = cap.value;
  store.settings.keys = { ...store.settings.keys, [id]: e.code };
  saveSettings(); game()?.applySettings();
  const clash = ACTIONS.filter((a) => a.id !== id && resolveKeymap(store.settings.keys)[a.id].includes(e.code)).map((a) => a.label);
  if (clash.length) showToast(`<b>${keyLabel(e.code)}</b> juga dipakai untuk ${clash.join(', ')}.`, 4200);
  endCapture();
}
function startCapture(id) { endCapture(); cap.value = id; store.capturing = true; window.addEventListener('keydown', onCapture, true); }
function endCapture() { cap.value = null; store.capturing = false; window.removeEventListener('keydown', onCapture, true); }
function resetKeys() { store.settings.keys = {}; saveSettings(); game()?.applySettings(); showToast('Tombol kembali ke bawaan.'); }
onBeforeUnmount(endCapture);
function setting(k, v) { store.settings[k] = v; game()?.applySettings(); }

// ---- formulir akun & awan di profil ----
const authMode = ref('login'); // 'login' | 'register'
const authForm = reactive({ username: '', password: '', busy: false, err: '', success: '' });

async function handleAuthSubmit() {
  if (authForm.busy) return;
  authForm.err = '';
  authForm.success = '';
  if (!authForm.username.trim()) { authForm.err = 'Isi nama penjelajah.'; return; }
  if (!authForm.password) { authForm.err = 'Isi kata sandi.'; return; }

  authForm.busy = true;
  const isReg = authMode.value === 'register';
  const res = isReg
    ? await registerUser(authForm.username, authForm.password)
    : await loginUser(authForm.username, authForm.password);
  authForm.busy = false;

  if (!res.ok) {
    authForm.err = res.err || 'Gagal memproses akun.';
    return;
  }

  authForm.password = '';
  const act = isReg ? 'Akun baru berhasil dibuat' : 'Berhasil masuk akun';
  authForm.success = `${act}! Progres lokal Anda telah digabungkan ke awan Supabase.`;
  showToast(`Selamat datang, <b>${store.account.name}</b>!`, 3200);
}

async function handleLogout() {
  await logoutUser();
  showToast('Anda telah keluar dari akun awan. Beralih ke Mode Tamu lokal.', 2800);
}

function triggerManualSync() {
  saveProgress();
  showToast('Progres berhasil disinkronkan ke awan Supabase!', 2200);
}

const open = ref({ 0: true });
const FAQ = [
  ['Apa itu AstroSphere?', 'Game belajar tata surya di browser. Terbangkan pesawat, singgahi delapan planet, lihat fenomenanya, telusuri sejarah eksplorasi, lalu uji dirimu lewat kuis.'],
  ['Bagaimana cara ke planet tertentu?', 'Buka Peta (tombol M atau lewat menu), pilih planet, lalu tekan "Terbang ke sini". Pesawat terbang otomatis dan berhenti sendiri saat tiba.'],
  ['Bagaimana mendapat bintang?', 'Kerjakan kuis planet: 3 soal, 50 bintang per jawaban benar. Bintang hanya bertambah kalau skormu lebih tinggi dari skor terbaik sebelumnya. Jawaban salah tidak mengurangi bintang.'],
  ['Untuk apa bintang?', 'Membuka pesawat baru di Hanggar: Orion Glider 300 bintang, Nova Voyager 700 bintang.'],
  ['Apakah progres tersimpan di awan?', 'Ya! Saat Anda mendaftar atau masuk akun, seluruh bintang, pesawat, dan catatan perjalanan tersimpan otomatis di basis data awan Supabase. Mode Tamu tetap tersimpan di perangkat ini.'],
  ['Apakah ukuran dan jaraknya asli?', 'Ukuran planet dibandingkan satu sama lain sudah sesuai aslinya. Jarak antarplanet dipadatkan dan Matahari diperkecil agar semuanya bisa dijelajahi.'],
];
</script>

<template>
  <div>
    <div class="dim solid" />
    <section class="prof scroll">
      <div class="wrap">
        <!-- HEADER KARTU PROFIL -->
        <div class="head card flat">
          <div class="av">{{ name.slice(0, 1).toUpperCase() }}</div>
          <div class="who">
            <h1 class="h2">{{ name }}</h1>
            <div class="tags-row">
              <span class="tag" :class="store.account.cloudSynced ? 'green' : ''">
                <UiIcon :name="store.account.cloudSynced ? 'orbit' : 'info'" :size="13" />
                {{ store.account.cloudSynced ? 'Tersimpan di Awan' : 'Tersimpan Lokal (Mode Tamu)' }}
              </span>
              <span v-if="store.account.username" class="uname-badge">@{{ store.account.username }}</span>
            </div>
          </div>
          <div class="kpis">
            <div class="kpi star"><UiIcon name="bintang" :size="20" /><b class="num">{{ P.points }}</b><small>bintang</small></div>
            <div class="kpi"><UiIcon name="planet" :size="20" /><b class="num">{{ visited }}/8</b><small>planet</small></div>
            <div class="kpi"><UiIcon name="piala" :size="20" /><b class="num">{{ perfect }}/8</b><small>kuis sempurna</small></div>
          </div>
          <button class="btn primary back" @click="game()?.back()"><UiIcon name="kembali" :size="18" />Kembali terbang</button>
        </div>

        <!-- TAB NAVIGASI -->
        <div class="seg tabs" role="tablist">
          <button v-for="[id, lb] in TABS" :key="id" role="tab" :aria-selected="tab === id" :class="{ on: tab === id }" @click="tab = id">{{ lb }}</button>
        </div>

        <!-- RIWAYAT KUIS -->
        <template v-if="tab === 'kuis'">
          <div class="rows">
            <div v-for="p in PLANETS" :key="p.id" class="qr card flat">
              <span class="planet-dot" :style="{ '--c': p.color, '--s': '40px' }" />
              <div class="qn"><b>{{ p.name }}</b><small>{{ P.attempts[p.id] ? `${P.attempts[p.id]}× dicoba` : 'Belum dicoba' }}</small></div>
              <div class="qs" :aria-label="`${stars(P.best[p.id])} dari 3 bintang`"><UiIcon v-for="n in 3" :key="n" :name="n <= stars(P.best[p.id]) ? 'bintang' : 'bintang-o'" :size="22" :class="{ got: n <= stars(P.best[p.id]) }" /></div>
              <button class="btn sm" :class="P.best[p.id] == null ? 'primary' : 'line'" @click="quiz(p.id)">{{ P.best[p.id] == null ? 'Main' : 'Ulangi' }}</button>
            </div>
          </div>
          <div v-if="ledger.length" class="ledger card flat">
            <h3 class="h3">Catatan bintang</h3>
            <div v-for="l in ledger" :key="l.id" class="lr">
              <span>{{ ledgerLabel(l) }}<small>{{ fmtDate(l.at) }}</small></span>
              <b class="num" :class="l.delta > 0 ? 'plus' : ''">{{ l.delta > 0 ? '+' : '' }}{{ l.delta }}</b>
            </div>
          </div>
        </template>

        <!-- PESAWAT -->
        <template v-else-if="tab === 'armada'">
          <div class="fleet">
            <div v-for="id in SHIP_IDS" :key="id" class="ship card flat" :class="{ on: id === P.selectedShip, lock: !P.owned.includes(id) }">
              <div class="sh"><span class="ic"><UiIcon :name="P.owned.includes(id) ? 'hanggar' : 'kunci'" :size="26" /></span>
                <div><b>{{ SHIPS[id].name }}</b><small>{{ SHIPS[id].cls }}</small></div></div>
              <div class="sst"><div v-for="(v, k) in SHIPS[id].stats" :key="k" class="st"><span>{{ k }}</span><div class="bar"><i :style="{ width: v * 100 + '%' }" /></div></div></div>
              <button v-if="id === P.selectedShip" class="btn block" disabled><UiIcon name="cek" :size="18" />Dipakai</button>
              <button v-else-if="P.owned.includes(id)" class="btn primary block" @click="useShip(id)">Pakai</button>
              <button v-else class="btn star block" @click="openHangar(id)"><UiIcon name="bintang" :size="18" />{{ SHIPS[id].price }} · lihat di hanggar</button>
            </div>
          </div>
        </template>

        <!-- KONTROL -->
        <template v-else-if="tab === 'kontrol'">
          <div class="ctl card flat">
            <div class="ch"><span class="ic"><UiIcon name="papan-ketik" :size="22" /></span><div><h3 class="h3">Keyboard</h3><p class="small">Tekan "Ubah", lalu tekan tombol baru. Esc untuk batal.</p></div>
              <button class="btn ghost sm" @click="resetKeys"><UiIcon name="ulang" :size="16" />Bawaan</button></div>
            <div v-for="a in ACTIONS" :key="a.id" class="kr" :class="{ cap: cap === a.id }">
              <div class="kl"><b>{{ a.label }}</b><small>{{ a.sub }}</small></div>
              <span class="ks"><template v-if="cap === a.id"><b class="kbd wait">Tekan tombol…</b></template><b v-else v-for="l in keyLabels(km[a.id])" :key="l" class="kbd">{{ l }}</b></span>
              <button class="btn sm line" @click="cap === a.id ? endCapture() : startCapture(a.id)">{{ cap === a.id ? 'Batal' : 'Ubah' }}</button>
            </div>
            <div class="kr fixed"><div class="kl"><b>Menu / jeda</b><small>Tidak bisa diubah</small></div><span class="ks"><b class="kbd">Esc</b></span><span /></div>
            <div class="kr fixed"><div class="kl"><b>Lihat sekeliling</b><small>Kursor tidak mengemudikan pesawat</small></div><span class="ks"><b class="kbd">Seret mouse</b></span><span /></div>
          </div>
          <div class="ctl card flat">
            <div class="ch"><span class="ic"><UiIcon name="sentuh" :size="22" /></span><div><h3 class="h3">Layar sentuh</h3></div></div>
            <div class="tcs">
              <div class="tile"><UiIcon name="target" :size="24" /><b>Kemudi Analog</b><small>Sentuh stik analog di kiri bawah untuk mengarahkan moncong pesawat.</small></div>
              <div class="tile"><UiIcon name="gas" :size="24" /><b>Tuas Dorong & Rem</b><small>Tarik tuas dorong di kanan bawah untuk mengatur maju, turbo, dan rem.</small></div>
              <div class="tile"><UiIcon name="mata" :size="24" /><b>Lihat sekeliling</b><small>Geser area tengah layar dengan tetikus atau jari.</small></div>
            </div>
          </div>
          <div class="ctl card flat">
            <div class="trow"><span>Kepekaan lihat sekeliling</span><span class="rng"><input type="range" min=".3" max="2.5" step=".1" :value="store.settings.sensitivity" @input="setting('sensitivity', +$event.target.value)"><b class="num">{{ store.settings.sensitivity.toFixed(1) }}×</b></span></div>
            <UiToggle :model-value="store.settings.invertY" label="Balik naik/turun" sub="Tombol naik = hidung ke bawah" @update:model-value="setting('invertY', $event)" />
          </div>
        </template>

        <!-- AKUN & SINKRONISASI AWAN -->
        <template v-else-if="tab === 'akun'">
          <div class="cloud-panel card flat">
            <div class="ch">
              <span class="ic"><UiIcon name="orbit" :size="24" /></span>
              <div>
                <h3 class="h3">Sinkronisasi Awan &amp; Akun Pemain</h3>
                <p class="small">Simpan progres penjelajahan, bintang, dan armada pesawat secara permanen di Supabase.</p>
              </div>
            </div>

            <!-- TAMPILAN JIKA SUDAH LOGIN -->
            <div v-if="store.account.loggedIn" class="acct-logged-in">
              <div class="info-banner card flat">
                <UiIcon name="cek" :size="20" class="ic-success" />
                <div class="ib-text">
                  <b>Akun Aktif Terhubung</b>
                  <p>Progres permainan Anda tersinkronisasi secara otomatis setiap kali ada capaian baru.</p>
                </div>
              </div>

              <div class="detail-rows">
                <div class="drow"><span>Nama Penjelajah</span><b>{{ store.account.name }}</b></div>
                <div class="drow"><span>Username Unik</span><b>@{{ store.account.username || store.account.name }}</b></div>
                <div class="drow"><span>Status Penyimpanan</span><span class="tag green">Awan Supabase Aktif</span></div>
              </div>

              <div class="btn-actions">
                <button class="btn line" @click="triggerManualSync">
                  <UiIcon name="ulang" :size="16" /> Sinkronkan Sekarang
                </button>
                <button class="btn ghost danger" @click="handleLogout">
                  <UiIcon name="keluar" :size="16" /> Keluar dari Akun Awan
                </button>
              </div>
            </div>

            <!-- TAMPILAN JIKA MASIH MODE TAMU -->
            <div v-else class="acct-guest">
              <div class="guest-banner card flat">
                <UiIcon name="info" :size="20" />
                <div>
                  <b>Anda Bermain dalam Mode Tamu</b>
                  <p>Progres saat ini hanya tersimpan di browser ini. Masuk atau buat akun agar capaian Anda tidak hilang saat cache terhapus dan bisa dibuka di perangkat lain.</p>
                </div>
              </div>

              <div class="auth-box card flat">
                <div class="auth-toggle seg">
                  <button :class="{ on: authMode === 'login' }" @click="authMode = 'login'; authForm.err = ''; authForm.success = ''">Masuk Akun</button>
                  <button :class="{ on: authMode === 'register' }" @click="authMode = 'register'; authForm.err = ''; authForm.success = ''">Daftar Akun Baru</button>
                </div>

                <form class="auth-form" @submit.prevent="handleAuthSubmit">
                  <label class="field">
                    <span>Nama Penjelajah</span>
                    <input
                      v-model="authForm.username"
                      type="text"
                      placeholder="Contoh: penjelajah_01"
                      maxlength="20"
                      autocomplete="username"
                    />
                    <small class="hint">3–20 karakter alfanumerik (huruf kecil, angka, atau garis bawah _).</small>
                  </label>

                  <label class="field">
                    <span>Kata Sandi</span>
                    <input
                      v-model="authForm.password"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      autocomplete="current-password"
                    />
                  </label>

                  <p v-if="authForm.err" class="msg-err"><UiIcon name="silang" :size="14" /> {{ authForm.err }}</p>
                  <p v-if="authForm.success" class="msg-ok"><UiIcon name="cek" :size="14" /> {{ authForm.success }}</p>

                  <button class="btn primary block" type="submit" :disabled="authForm.busy">
                    {{ authForm.busy ? 'Menghubungkan…' : (authMode === 'login' ? 'Masuk & Sinkronkan Progres' : 'Daftar Akun & Simpan ke Awan') }}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </template>

        <!-- FAQ -->
        <template v-else>
          <div class="faq">
            <div v-for="([q, a], i) in FAQ" :key="i" class="fi card flat" :class="{ open: open[i] }">
              <button class="fq" :aria-expanded="!!open[i]" @click="open[i] = !open[i]"><b>{{ q }}</b><UiIcon name="turun" :size="20" class="chev" /></button>
              <p v-if="open[i]">{{ a }}</p>
            </div>
          </div>
          <div class="credits card flat">
            <h3 class="h3">Kredit model 3D</h3>
            <p class="small">Model dari kreator Sketchfab berlisensi Creative Commons, diubah agar ringan di browser.</p>
            <ul>
              <li v-for="c in MODEL_CREDITS" :key="c.url"><span>{{ c.use }}</span><a :href="c.url" target="_blank" rel="noopener">{{ c.title }}</a> · {{ c.author }} · <a :href="LICENSE_URL[c.license]" target="_blank" rel="noopener">{{ c.license }}</a></li>
            </ul>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dim.solid{background:#060a1a}
.prof{position:fixed;inset:0;z-index:22;padding:calc(var(--top) + var(--safe-t)) 16px calc(24px + var(--safe-b))}
.wrap{width:min(1040px,100%);margin:0 auto;display:flex;flex-direction:column;gap:18px}
.head{display:flex;align-items:center;gap:18px;padding:18px 20px;flex-wrap:wrap}
.av{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--blue);font-family:var(--display);font-weight:700;font-size:28px;flex:none}
.who{display:flex;flex-direction:column;gap:6px;align-items:flex-start;flex:1;min-width:160px}
.tags-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.uname-badge{font-size:12px;color:var(--faint);font-family:var(--font);background:rgba(255,255,255,.05);padding:2px 8px;border-radius:999px}
.kpis{display:flex;gap:10px;flex-wrap:wrap}
.kpi{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:10px 16px;border-radius:var(--r);background:var(--surface-2);color:var(--sky)}
.kpi svg{grid-row:span 2}
.kpi b{font-size:20px;font-weight:600;color:var(--text);line-height:1.1}
.kpi small{font-size:12px;color:var(--faint)}
.kpi.star{color:var(--star)}
.tabs{align-self:flex-start;flex-wrap:wrap}
.tabs button{padding:0 18px;min-height:40px;font-size:15px}
.rows{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.qr{display:flex;align-items:center;gap:14px;padding:12px 14px}
.qn{flex:1;display:flex;flex-direction:column}
.qn b{font-family:var(--display);font-weight:600;font-size:16px}
.qn small{font-size:12.5px;color:var(--faint)}
.qs{display:flex;gap:2px;color:var(--line-2)} .qs .got{color:var(--star)}
.ledger{padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.lr{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px}
.lr small{display:block;font-size:12px;color:var(--faint)}
.lr b{font-weight:600} .lr b.plus{color:var(--star)}
.fleet{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.ship{padding:18px;display:flex;flex-direction:column;gap:14px;border:2px solid transparent}
.ship.on{border-color:var(--sky)}
.sh{display:flex;align-items:center;gap:12px}
.sh .ic{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:rgba(59,108,240,.18);color:var(--sky);flex:none}
.ship.lock .ic{background:rgba(255,201,71,.14);color:var(--star)}
.sh b{display:block;font-family:var(--display);font-weight:600;font-size:17px}
.sh small{font-size:12.5px;color:var(--faint)}
.sst{display:flex;flex-direction:column;gap:8px}
.st{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:10px;font-size:13px;color:var(--muted)}
.ctl{padding:16px 18px;display:flex;flex-direction:column;gap:4px}
.ch{display:flex;align-items:center;gap:12px;padding-bottom:10px;margin-bottom:4px;border-bottom:1px solid var(--line)}
.ch>div{flex:1}
.ch .ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(59,108,240,.18);color:var(--sky);flex:none}
.kr{display:grid;grid-template-columns:1fr auto 80px;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid rgba(43,55,112,.5)}
.kr:last-child{border-bottom:0}
.kr.cap{background:rgba(59,108,240,.1);border-radius:var(--r-sm);padding:8px 10px;margin:0 -10px}
.kl b{display:block;font-weight:500;font-size:15px}
.kl small{font-size:12.5px;color:var(--faint)}
.ks{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.kbd.wait{background:var(--blue);border-color:var(--blue-d);animation:blink 1s infinite}
@keyframes blink{50%{opacity:.55}}
.tcs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding-top:4px}
.tcs .tile{display:flex;flex-direction:column;gap:6px;color:var(--sky)}
.tcs b{color:var(--text);font-weight:600;font-size:15px}
.tcs small{color:var(--muted);font-size:13px;line-height:1.45}
.rng{display:flex;align-items:center;gap:10px;width:220px}.rng b{font-size:14px;width:40px;text-align:right}

/* Panel Awan & Akun */
.cloud-panel{padding:18px 20px;display:flex;flex-direction:column;gap:16px}
.info-banner{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:rgba(54,211,154,.08);border:1px solid rgba(54,211,154,.25);border-radius:var(--r)}
.ic-success{color:var(--green);flex:none;margin-top:2px}
.ib-text b{display:block;font-size:14.5px;color:var(--green);margin-bottom:2px}
.ib-text p{margin:0;font-size:13px;color:var(--muted)}
.detail-rows{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:var(--r);background:var(--surface-2)}
.drow{display:flex;justify-content:space-between;align-items:center;font-size:14px;padding:4px 0}
.drow span{color:var(--faint)}
.btn-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}
.btn.danger{color:#ff8080}
.guest-banner{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;background:rgba(59,108,240,.08);border:1px solid rgba(59,108,240,.22);border-radius:var(--r)}
.guest-banner b{display:block;font-size:15px;color:var(--sky);margin-bottom:4px}
.guest-banner p{margin:0;font-size:13.5px;color:var(--muted);line-height:1.45}
.auth-box{max-width:440px;padding:16px;display:flex;flex-direction:column;gap:14px;margin-top:4px}
.auth-toggle{align-self:flex-start}
.auth-form{display:flex;flex-direction:column;gap:12px}
.field{display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:var(--muted)}
.field input{width:100%;padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-3);color:var(--text);font-size:14px}
.field input:focus{border-color:var(--sky);outline:none}
.hint{font-size:11.5px;color:var(--faint)}
.msg-err{display:flex;align-items:center;gap:6px;color:#ff8080;font-size:13px;margin:0}
.msg-ok{display:flex;align-items:center;gap:6px;color:var(--green);font-size:13px;margin:0}

.faq{display:flex;flex-direction:column;gap:8px}
.fi{padding:0 18px}
.fq{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 0;text-align:left}
.fq b{font-family:var(--display);font-weight:600;font-size:16px}
.chev{transition:transform .2s;flex:none;color:var(--muted)}
.fi.open .chev{transform:rotate(180deg)}
.fi p{padding:0 0 16px;color:var(--muted);font-size:14.5px;line-height:1.6}
.credits{padding:16px 18px;display:flex;flex-direction:column;gap:8px}
.credits ul{list-style:none;display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:var(--muted)}
.credits li span{display:inline-block;min-width:120px;color:var(--text)}
@media (max-width:860px){ .rows{grid-template-columns:1fr} .fleet,.tcs{grid-template-columns:1fr} .back{width:100%} }
@media (max-width:560px){ .kr{grid-template-columns:1fr auto;row-gap:6px} .kr>.btn{grid-column:1/-1;justify-self:start} .kr.fixed>span:last-child{display:none} .kpi{padding:8px 12px} }
</style>
