<script setup>
// Misi kisah nyata Apollo 13: kartu cerita + 5 tugas (keputusan, hemat daya, koreksi arah, "kotak surat" CO2,
// masuk atmosfer). Waktu, posisi, dan sumber daya dijalankan game/mission.js (store.mission).
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, rewardMission } from '~/composables/useGame.js';
import { APOLLO13 as D } from '~/data/missions.js';
const M = store.mission;
const G = () => game()?.mission;
const S = D.steps;

// ---- jam & tanggal misi (waktu Houston, UTC−6) ----
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const clock = computed(() => { const h = Math.floor(M.clock), m = Math.floor((M.clock - h) * 60); return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; });
const date = computed(() => { const d = new Date(D.launchUTC + M.clock * 3600e3 - 6 * 3600e3); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; });
const dist = computed(() => M.dist.toLocaleString('id-ID'));
const crisis = computed(() => !['brief', 'launch'].includes(M.step));
const meterCls = (v, inv) => { const x = inv ? 100 - v : v; return x < 30 ? 'bad' : x < 60 ? 'mid' : 'ok'; };
const PHASE = { launch: 'Menuju Bulan', boom: 'Darurat!', decide: 'Darurat!', power: 'Darurat!', burn: 'Darurat!', coast2: 'Memutari Bulan', far: 'Di balik Bulan', coast3: 'Pulang ke Bumi', co2: 'Pulang ke Bumi', coast4: 'Pulang ke Bumi', reentry: 'Masuk atmosfer', splash: 'Mendarat', done: 'Selesai' };

// ---- 1. keputusan ----
const dec = reactive({ pick: null, tries: 0 });
const decOpt = computed(() => (dec.pick == null ? null : S.decide.options[dec.pick]));
function choose(i) { if (decOpt.value?.ok) return; dec.pick = i; dec.tries++; if (S.decide.options[i].ok) game()?.correct(); else game()?.wrong(); }

// ---- 2. hemat daya ----
const sw = reactive(Object.fromEntries(S.power.switches.map((s) => [s.id, true])));
const pw = reactive({ msg: '', ok: false, tries: 0 });
function checkPower() {
  pw.tries++;
  const bad = S.power.switches.find((s) => sw[s.id] !== s.keep);
  if (bad) { pw.msg = bad.why; pw.ok = false; game()?.wrong(); return; }
  pw.ok = true; pw.msg = 'Daya cukup untuk bertahan. Kabin jadi sangat dingin, tapi kru aman.'; game()?.correct();
}

// ---- 3. koreksi arah (tahan & lepas di zona hijau) ----
const burn = reactive({ v: 0, holding: false, res: '', tries: 0, ok: false });
let raf = 0, last = 0;
function burnPress() { if (burn.ok || burn.holding) return; burn.v = 0; burn.res = ''; burn.holding = true; last = 0; }
function burnRelease() {
  if (!burn.holding) return;
  burn.holding = false; burn.tries++;
  const [a, b] = S.burn.zone;
  if (burn.v >= a && burn.v <= b) { burn.ok = true; burn.res = 'Tepat! Pesawat kembali ke jalur memutari Bulan.'; game()?.correct(); }
  else { burn.res = burn.v < a ? 'Terlalu singkat — arah belum cukup berubah. Coba lagi.' : 'Terlalu lama — pesawat melenceng. Coba lagi.'; game()?.wrong(); }
}

// ---- 4. kotak surat CO2 ----
const co = reactive({ sel: {}, msg: '', ok: false, tries: 0 });
function toggleItem(id) { if (!co.ok) co.sel[id] = !co.sel[id]; }
function build() {
  co.tries++;
  const wrong = S.co2.items.find((i) => co.sel[i.id] && !i.ok), missing = S.co2.items.filter((i) => i.ok && !co.sel[i.id]).length;
  if (wrong) { co.msg = `${wrong.t} tidak dipakai untuk adaptor ini.`; game()?.wrong(); return; }
  if (missing) { co.msg = `Masih kurang ${missing} barang.`; game()?.wrong(); return; }
  co.ok = true; co.msg = S.co2.done; game()?.correct();
}

// ---- 5. masuk atmosfer (jaga sudut di jalur hijau) ----
const re = reactive({ a: 6.5, vel: 0, inT: 0, t: 0, run: false, res: '', ok: false, tries: 0, input: 0 });
const MIN_A = 3, MAX_A = 10;
const pctA = (a) => ((a - MIN_A) / (MAX_A - MIN_A)) * 100;
function reStart() { Object.assign(re, { a: 6.5, vel: (Math.random() - .5) * 1.5, inT: 0, t: 0, run: true, res: '', input: 0 }); last = 0; }
function reTick(dt) {
  if (!re.run) return;
  re.vel += ((Math.random() - .5) * 7 + (re.a < 6.5 ? -.6 : .6)) * dt; // guncangan atmosfer menjauhkan dari tengah
  re.vel = Math.max(-2.2, Math.min(2.2, re.vel));
  re.a = Math.max(MIN_A, Math.min(MAX_A, re.a + (re.vel + re.input * 3.2) * dt));
  re.t += dt; if (re.a >= S.reentry.band[0] && re.a <= S.reentry.band[1]) re.inT += dt;
  if (re.t >= S.reentry.seconds) {
    re.run = false; re.tries++;
    if (re.inT / re.t >= .7) { re.ok = true; re.res = 'Sudut aman! Pelindung panas menahan suhu ribuan derajat.'; game()?.correct(); }
    else { re.res = `Hanya ${Math.round(re.inT / re.t * 100)}% waktu di jalur hijau. Coba lagi.`; game()?.wrong(); }
  }
}
const inBand = computed(() => re.a >= S.reentry.band[0] && re.a <= S.reentry.band[1]);
function loop(t) {
  const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
  if (burn.holding) { burn.v = Math.min(1, burn.v + dt / 3); if (burn.v >= 1) burnRelease(); }
  reTick(dt);
  raf = requestAnimationFrame(loop);
}

function done(task, tries) { G()?.complete(task, tries <= 1); }
const result = reactive({ stars: 0, reward: 0 });
watch(() => M.step, (s) => {
  if (s === 'done') { result.stars = G()?.starsNow() || 1; result.reward = rewardMission(D.id, result.stars); }
  if (s === 'reentry') Object.assign(re, { run: false, res: '', ok: false, tries: 0, a: 6.5 });
});
function restart() {
  G()?.reset();
  Object.assign(dec, { pick: null, tries: 0 }); Object.assign(pw, { msg: '', ok: false, tries: 0 }); for (const s of S.power.switches) sw[s.id] = true;
  Object.assign(burn, { v: 0, holding: false, res: '', tries: 0, ok: false }); Object.assign(co, { sel: {}, msg: '', ok: false, tries: 0 });
  Object.assign(re, { run: false, res: '', ok: false, tries: 0, a: 6.5 }); Object.assign(result, { stars: 0, reward: 0 });
}

function onKey(e) {
  if (store.modal || store.mode !== 'misi') return;
  if (M.step === 'burn' && e.code === 'Space') { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) burnPress(); if (e.type === 'keyup') burnRelease(); return; }
  if (M.step === 'reentry' && re.run) {
    const up = ['ArrowLeft', 'ArrowUp'].includes(e.code), dn = ['ArrowRight', 'ArrowDown'].includes(e.code);
    if (up || dn) { e.preventDefault(); re.input = e.type === 'keydown' ? (up ? -1 : 1) : 0; }
  }
}
onMounted(() => { restart(); raf = requestAnimationFrame(loop); window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); });
onBeforeUnmount(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); });
</script>

<template>
  <div class="mi" :class="{ crisis, black: M.blackout }">
    <!-- status misi -->
    <div class="stat">
      <span class="tag" :class="crisis && M.step !== 'done' ? 'red' : ''">{{ D.tag }}</span>
      <h1 class="h1">{{ D.title }}</h1>
      <div v-if="M.step !== 'brief'" class="clk" :class="{ emergency: PHASE[M.step] === 'Darurat!' }">
        <b class="num">{{ clock }}</b>
        <span class="sep">·</span>
        <span>{{ date }}</span>
      </div>
      <div v-if="M.step !== 'brief'" class="ph"><span class="dotp" :class="{ red: PHASE[M.step] === 'Darurat!' }" />{{ PHASE[M.step] }} · <b class="num">{{ dist }} km</b> dari Bumi</div>
      <div v-if="crisis && M.step !== 'done'" class="meters">
        <div class="mt" :class="meterCls(M.o2)"><span>O₂</span><div class="bar"><i :style="{ width: M.o2 + '%' }" /></div><b class="num">{{ Math.round(M.o2) }}%</b></div>
        <div class="mt" :class="meterCls(M.power)"><span>Listrik</span><div class="bar"><i :style="{ width: M.power + '%' }" /></div><b class="num">{{ Math.round(M.power) }}%</b></div>
        <div v-if="M.co2 > 10" class="mt" :class="meterCls(M.co2, true)"><span>CO₂</span><div class="bar"><i :style="{ width: M.co2 + '%' }" /></div><b class="num">{{ Math.round(M.co2) }}%</b></div>
        <small v-if="M.cold" class="cold"><UiIcon name="bulan" :size="13" />Kabin sangat dingin untuk menghemat listrik</small>
      </div>
    </div>
    <button class="modern-close-btn" aria-label="Keluar dari misi" title="Keluar misi (Esc)" @click="game()?.back()"><UiIcon name="tutup" :size="18" /></button>
    <Transition name="fade"><div v-if="M.note" class="note">{{ M.note }}</div></Transition>

    <!-- ledakan -->
    <Transition name="fade">
      <div v-if="M.step === 'boom'" class="boom" role="alert">
        <q>{{ D.quote }}</q>
        <small>"Houston, kita punya masalah." — Jack Swigert & Jim Lovell, {{ date }}</small>
      </div>
    </Transition>
    <!-- radio terputus -->
    <div v-if="M.blackout" class="static" aria-hidden="true" />

    <!-- kartu langkah -->
    <Transition name="rise" mode="out-in">
      <section v-if="M.step === 'brief'" key="brief" class="card mc">
        <h2 class="h2">Misi ke Bulan</h2>
        <p class="tx">{{ D.brief }}</p>
        <div class="crew"><div v-for="c in D.crew" :key="c.name" class="cr"><span class="av">{{ c.name[0] }}</span><b>{{ c.name }}</b><small>{{ c.role }}</small></div></div>
        <p class="small">11 April 1970 · Pusat kendali: Houston, Amerika Serikat</p>
        <button class="btn primary lg block" @click="G()?.launch()"><UiIcon name="kilat" :size="20" />Luncurkan</button>
        <UiScrollHint />
      </section>

      <section v-else-if="M.step === 'decide'" key="decide" class="card mc">
        <span class="tag red">Tugas 1 dari 5</span>
        <h2 class="h2">{{ S.decide.title }}</h2>
        <p class="tx">{{ S.boom.text }} {{ S.decide.text }}</p>
        <div class="opts">
          <button v-for="(o, i) in S.decide.options" :key="i" class="opt" :class="{ ok: dec.pick === i && o.ok, bad: dec.pick === i && !o.ok }" @click="choose(i)">{{ o.t }}</button>
        </div>
        <p v-if="decOpt" class="fb" :class="{ ok: decOpt.ok }">{{ decOpt.why }}</p>
        <button v-if="decOpt?.ok" class="btn primary block" @click="done('decide', dec.tries)">Jalankan rencana<UiIcon name="lanjut" :size="18" /></button>
        <UiScrollHint />
      </section>

      <section v-else-if="M.step === 'power'" key="power" class="card mc">
        <span class="tag red">Tugas 2 dari 5</span>
        <h2 class="h2">{{ S.power.title }}</h2>
        <p class="tx">{{ S.power.text }}</p>
        <div class="sws">
          <UiToggle v-for="s in S.power.switches" :key="s.id" v-model="sw[s.id]" :label="s.t" :sub="sw[s.id] ? 'Menyala' : 'Mati'" />
        </div>
        <p v-if="pw.msg" class="fb" :class="{ ok: pw.ok }">{{ pw.msg }}</p>
        <button v-if="!pw.ok" class="btn primary block" @click="checkPower">Selesai</button>
        <button v-else class="btn primary block" @click="done('power', pw.tries)">Lanjut<UiIcon name="lanjut" :size="18" /></button>
        <UiScrollHint />
      </section>

      <section v-else-if="M.step === 'burn'" key="burn" class="card mc">
        <span class="tag red">Tugas 3 dari 5</span>
        <h2 class="h2">{{ S.burn.title }}</h2>
        <p class="tx">{{ S.burn.text }}</p>
        <div class="gauge" aria-hidden="true">
          <div class="zone" :style="{ left: S.burn.zone[0] * 100 + '%', width: (S.burn.zone[1] - S.burn.zone[0]) * 100 + '%' }" />
          <div class="fill" :style="{ width: burn.v * 100 + '%' }" />
        </div>
        <p v-if="burn.res" class="fb" :class="{ ok: burn.ok }">{{ burn.res }}</p>
        <button v-if="!burn.ok" class="btn star lg block hold" :class="{ on: burn.holding }" @pointerdown.prevent="burnPress" @pointerup="burnRelease" @pointerleave="burnRelease" @pointercancel="burnRelease">
          <UiIcon name="kilat" :size="20" />{{ burn.holding ? 'Mesin menyala…' : 'Tahan untuk menyalakan mesin' }}
        </button>
        <p v-if="!burn.ok && !store.touch" class="keys">atau tahan <b class="kbd sm">Spasi</b></p>
        <button v-if="burn.ok" class="btn primary block" @click="done('burn', burn.tries)">Lanjut<UiIcon name="lanjut" :size="18" /></button>
        <UiScrollHint />
      </section>

      <section v-else-if="M.step === 'far'" key="far" class="card mc">
        <span class="tag">Radio terputus</span>
        <h2 class="h2">{{ S.far.title }}</h2>
        <p class="tx">{{ S.far.text }}</p>
        <button class="btn primary block" @click="G()?.skipFar()">Lanjut<UiIcon name="lanjut" :size="18" /></button>
        <UiScrollHint />
      </section>

      <section v-else-if="M.step === 'co2'" key="co2" class="card mc">
        <span class="tag red">Tugas 4 dari 5</span>
        <h2 class="h2">{{ S.co2.title }}</h2>
        <p class="tx">{{ S.co2.text }}</p>
        <div class="items">
          <button v-for="it in S.co2.items" :key="it.id" class="item" :class="{ on: co.sel[it.id] }" :aria-pressed="!!co.sel[it.id]" @click="toggleItem(it.id)">
            <UiIcon :name="co.sel[it.id] ? 'cek' : 'plus'" :size="16" />{{ it.t }}
          </button>
        </div>
        <p v-if="co.msg" class="fb" :class="{ ok: co.ok }">{{ co.msg }}</p>
        <button v-if="!co.ok" class="btn primary block" @click="build">Rakit adaptor</button>
        <button v-else class="btn primary block" @click="done('co2', co.tries)">Pasang<UiIcon name="lanjut" :size="18" /></button>
        <UiScrollHint />
      </section>

      <section v-else-if="M.step === 'reentry'" key="reentry" class="card mc">
        <span class="tag red">Tugas 5 dari 5</span>
        <h2 class="h2">{{ S.reentry.title }}</h2>
        <p class="tx">{{ S.reentry.text }}</p>
        <div class="corr" :class="{ in: inBand }" aria-hidden="true">
          <div class="band" :style="{ left: pctA(S.reentry.band[0]) + '%', width: pctA(S.reentry.band[1]) - pctA(S.reentry.band[0]) + '%' }" />
          <div class="needle" :style="{ left: pctA(re.a) + '%' }"><span class="num">{{ re.a.toFixed(1) }}°</span></div>
          <span class="lbl l">landai — memantul</span><span class="lbl r">curam — terlalu panas</span>
        </div>
        <div v-if="re.run" class="prog"><div class="bar"><i :style="{ width: re.t / S.reentry.seconds * 100 + '%' }" /></div></div>
        <p v-if="re.res" class="fb" :class="{ ok: re.ok }">{{ re.res }}</p>
        <div v-if="re.run" class="row2 steer">
          <button class="btn" @pointerdown.prevent="re.input = -1" @pointerup="re.input = 0" @pointerleave="re.input = 0"><UiIcon name="kembali" :size="18" />Lebih landai</button>
          <button class="btn" @pointerdown.prevent="re.input = 1" @pointerup="re.input = 0" @pointerleave="re.input = 0">Lebih curam<UiIcon name="lanjut" :size="18" /></button>
        </div>
        <button v-else-if="!re.ok" class="btn star block" @click="reStart"><UiIcon name="putar" :size="18" />{{ re.tries ? 'Coba lagi' : 'Mulai masuk atmosfer' }}</button>
        <button v-else class="btn primary block" @click="done('reentry', re.tries)">Buka parasut<UiIcon name="lanjut" :size="18" /></button>
        <p v-if="re.run && !store.touch" class="keys"><b class="kbd sm">←</b><b class="kbd sm">→</b> atur sudut</p>
        <UiScrollHint />
      </section>

      <section v-else-if="M.step === 'done'" key="done" class="card mc fin">
        <div class="stars" :aria-label="`${result.stars} dari 3 bintang`"><UiIcon v-for="n in 3" :key="n" :name="n <= result.stars ? 'bintang' : 'bintang-o'" :size="46" :class="{ got: n <= result.stars }" :style="{ animationDelay: n * .15 + 's' }" /></div>
        <h2 class="h2">{{ S.splash.title }}</h2>
        <p class="tx">{{ S.splash.text }}</p>
        <div v-if="result.reward" class="gain"><UiIcon name="bintang" :size="20" /><b class="num">+{{ result.reward }}</b><span>bintang · misi pertama selesai</span></div>
        <ul class="facts"><li v-for="f in D.facts" :key="f">{{ f }}</li></ul>
        <p class="small">Bintang misi: tugas yang berhasil pada percobaan pertama.</p>
        <div class="row2">
          <button class="btn line" @click="restart"><UiIcon name="ulang" :size="18" />Main lagi</button>
          <button class="btn primary" @click="game()?.back()">Kembali terbang</button>
        </div>
        <UiScrollHint />
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.mi{position:fixed;inset:0;z-index:20;pointer-events:none}
.mi>*{pointer-events:auto}
.stat{
  position:absolute;
  left:calc(24px + var(--safe-l, 0px));
  top:calc(24px + var(--safe-t, 0px));
  display:flex;
  flex-direction:column;
  gap:0;
  max-width:min(440px, calc(100vw - 80px));
  pointer-events:none;
}
.stat .h1{
  font-family:var(--display);
  font-size:clamp(19px, 1.9vw, 24px);
  font-weight:600;
  line-height:1.2;
  letter-spacing:-0.02em;
  color:#fff;
  white-space:nowrap;
  margin:0 0 6px 0;
  text-shadow:0 2px 10px rgba(0, 0, 0, 0.7), 0 1px 3px rgba(0, 0, 0, 0.8);
}

/* TAG / STATUS BADGE MODERN */
.tag{
  align-self:flex-start;
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:3px 9px;
  border-radius:6px;
  font-family:var(--display);
  font-size:11px;
  font-weight:500;
  letter-spacing:.03em;
  background:rgba(148, 174, 255, 0.1);
  border:1px solid rgba(148, 174, 255, 0.18);
  color:#38bdf8;
  text-transform:none;
  line-height:1.3;
  backdrop-filter:blur(6px);
  margin-bottom:10px;
}
.tag.red{
  background:rgba(239, 68, 68, 0.14);
  border-color:rgba(239, 68, 68, 0.3);
  color:#f87171;
}

.clk{
  display:flex;
  align-items:center;
  gap:6px;
  margin-bottom:8px;
  text-shadow:0 1px 6px rgba(0, 0, 0, 0.8);
}
.clk b{
  font-family:var(--display);
  font-size:13px;
  font-weight:500;
  font-variant-numeric:tabular-nums;
  color:#38bdf8;
}
.clk.emergency b{
  color:#f87171;
}
.clk .sep{
  color:rgba(148, 174, 255, 0.4);
  font-size:12px;
}
.clk span:not(.sep){
  color:var(--muted);
  font-size:12px;
}

.ph{
  display:flex;
  align-items:center;
  gap:7px;
  font-size:12.5px;
  color:#cbd5e1;
  line-height:1.4;
  text-shadow:0 1px 6px rgba(0, 0, 0, 0.8);
}
.ph b{
  color:#f1f5f9;
  font-weight:600;
}
.dotp{
  width:7px;
  height:7px;
  min-width:7px;
  border-radius:50%;
  background:var(--green);
  box-shadow:0 0 8px rgba(52, 211, 153, 0.6);
  animation:pulse 1.4s infinite;
}
.crisis .dotp, .dotp.red{
  background:#f87171;
  box-shadow:0 0 8px rgba(248, 113, 113, 0.6);
}
@keyframes pulse{50%{opacity:.3}}

.meters{
  display:flex;
  flex-direction:column;
  gap:6px;
  padding:12px 14px;
  margin-top:12px;
  border-radius:12px;
  background:rgba(11, 16, 36, 0.88);
  border:1px solid rgba(148, 174, 255, 0.18);
  box-shadow:0 8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter:blur(12px);
  width:260px;
  pointer-events:auto;
}
.mt{
  display:grid;
  grid-template-columns:48px 1fr 38px;
  align-items:center;
  gap:8px;
  font-size:12px;
  color:var(--muted);
}
.mt b{text-align:right;color:#fff;font-size:12px}
.mt.ok .bar>i{background:var(--green)}
.mt.mid .bar>i{background:var(--star)}
.mt.bad .bar>i{background:#f87171}
.mt.bad b{color:#f87171}
.cold{
  display:flex;
  align-items:center;
  gap:5px;
  font-size:11px;
  color:#38bdf8;
  margin-top:2px;
}

/* TOMBOL TUTUP MODERN */
.modern-close-btn{
  position:fixed !important;
  top:calc(var(--gap, 16px) + var(--safe-t, 0px)) !important;
  right:calc(var(--gap, 16px) + var(--safe-r, 0px)) !important;
  left:auto !important;
  bottom:auto !important;
  width:36px !important;
  height:36px !important;
  min-width:36px !important;
  min-height:36px !important;
  border-radius:10px !important;
  background:rgba(148,174,255,.08) !important;
  border:1px solid rgba(148,174,255,.18) !important;
  color:var(--muted) !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  cursor:pointer !important;
  transition:all .15s ease !important;
  z-index:30 !important;
  pointer-events:auto !important;
}
.modern-close-btn:hover{
  background:rgba(148,174,255,.16) !important;
  border-color:rgba(148,174,255,.35) !important;
  color:#fff !important;
}

.note{
  position:absolute;
  left:50%;
  top:calc(var(--top) + 8px + var(--safe-t));
  transform:translateX(-50%);
  max-width:min(560px,calc(100vw - 140px));
  padding:8px 16px;
  border-radius:10px;
  background:rgba(11,16,36,.9);
  border:1px solid rgba(148,174,255,.2);
  box-shadow:0 8px 24px rgba(0,0,0,.5);
  backdrop-filter:blur(12px);
  font-size:13.5px;
  text-align:center;
}
.boom{position:absolute;inset:0;display:grid;place-content:center;gap:10px;text-align:center;padding:24px;background:radial-gradient(ellipse at center,rgba(120,0,0,.15),rgba(120,0,0,.55));animation:alarm .8s ease-in-out infinite;pointer-events:none}
.boom q{font-family:var(--display);font-weight:600;font-size:clamp(30px,5vw,64px);color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.8);quotes:'\201C' '\201D'}
.boom small{color:#ffd0d0;font-size:15px;text-shadow:0 2px 10px #000}
@keyframes alarm{50%{background-color:rgba(255,0,0,.12)}}
.static{position:absolute;inset:0;pointer-events:none;opacity:.16;background:repeating-linear-gradient(0deg,rgba(255,255,255,.5) 0 1px,transparent 1px 3px);animation:noise .25s steps(4) infinite;mix-blend-mode:screen}
@keyframes noise{25%{transform:translateY(-1px)}50%{transform:translateY(2px)}75%{transform:translateY(-2px)}}

/* KARTU DIALOG BAWAH MODERN */
.mc{
  position:absolute;
  left:50%;
  bottom:calc(clamp(28px, 4.5vh, 44px) + var(--safe-b));
  transform:translateX(-50%);
  width:min(580px,calc(100vw - 28px));
  max-height:calc(100vh - 150px);
  overflow-y:auto;
  overflow-x:hidden;
  padding:20px 24px;
  display:flex;
  flex-direction:column;
  gap:12px;
  border-radius:16px;
  background:rgba(10,14,32,.94);
  border:1px solid rgba(148,174,255,.18);
  box-shadow:0 16px 40px rgba(0,0,0,.65),0 0 24px rgba(59,130,246,.12);
  backdrop-filter:blur(16px);
  scrollbar-width:thin;
  scrollbar-color:rgba(148,174,255,.25) transparent;
}
.mc::-webkit-scrollbar{width:5px}
.mc::-webkit-scrollbar-track{background:transparent}
.mc::-webkit-scrollbar-thumb{background:rgba(148,174,255,.25);border-radius:99px}

.mc .h2{
  font-family:var(--display);
  font-size:20px;
  font-weight:600;
  color:#fff;
  line-height:1.25;
  margin:0;
}
.tx{
  font-size:14px;
  color:var(--muted);
  line-height:1.55;
  margin:0;
}
.small{
  font-size:12px;
  color:var(--faint);
  margin:0;
}

/* KARTU KRU TAKTIS */
.crew{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cr{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
  padding:10px 8px;
  border-radius:10px;
  background:rgba(18,24,52,.7);
  border:1px solid rgba(148,174,255,.14);
  text-align:center;
}
.cr .av{
  width:34px;
  height:34px;
  border-radius:8px;
  display:grid;
  place-items:center;
  background:rgba(59,130,246,.18);
  border:1px solid rgba(59,130,246,.35);
  color:#60a5fa;
  font-family:var(--display);
  font-weight:600;
  font-size:13.5px;
}
.cr b{
  font-family:var(--display);
  font-weight:600;
  font-size:13px;
  color:#fff;
  line-height:1.2;
}
.cr small{
  font-size:11px;
  color:var(--muted);
  line-height:1.2;
}

/* OPSI PILIHAN */
.opts{display:flex;flex-direction:column;gap:8px}
.opt{
  padding:10px 14px;
  border-radius:10px;
  min-height:42px;
  background:rgba(18,24,52,.75);
  border:1px solid rgba(148,174,255,.14);
  text-align:left;
  font-size:14px;
  font-weight:500;
  color:#e2e8f0;
  transition:all .15s ease;
  cursor:pointer;
  display:flex;
  align-items:center;
}
.opt:hover{
  background:rgba(30,41,82,.85);
  border-color:rgba(148,174,255,.3);
  transform:translateY(-1px);
}
.opt.ok{
  border-color:#22c55e;
  background:rgba(34,197,94,.12);
  color:#86efac;
  box-shadow:0 0 10px rgba(34,197,94,.2);
}
.opt.bad{
  border-color:#ef4444;
  background:rgba(239,68,68,.12);
  color:#fca5a5;
  box-shadow:0 0 10px rgba(239,68,68,.2);
}

/* KOTAK FEEDBACK */
.fb{
  padding:10px 14px;
  border-radius:10px;
  background:rgba(239,68,68,.1);
  border:1px solid rgba(239,68,68,.28);
  color:#fca5a5;
  font-size:13.5px;
  line-height:1.5;
  font-weight:500;
  margin:0;
}
.fb.ok{
  background:rgba(34,197,94,.1);
  border-color:rgba(34,197,94,.28);
  color:#86efac;
}

/* SAKELAR SEKOCI AQUARIUS */
.sws{
  display:flex;
  flex-direction:column;
  background:rgba(18,24,52,.6);
  border:1px solid rgba(148,174,255,.14);
  border-radius:10px;
  padding:2px 8px;
}
.sws :deep(.trow){
  padding:6px 6px;
  min-height:34px;
  border-bottom:1px solid rgba(148,174,255,.08);
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.sws :deep(.trow:last-child){border-bottom:none}
.sws :deep(.trow span){
  font-size:13px;
  font-weight:500;
  color:#e2e8f0;
}
.sws :deep(.trow small){
  font-size:11px;
  color:var(--muted);
  margin-left:6px;
}

/* INDIKATOR GAUGE & HOLD BUTTON */
.gauge{
  position:relative;
  height:20px;
  border-radius:8px;
  background:rgba(18,24,52,.9);
  border:1px solid rgba(148,174,255,.16);
  overflow:hidden;
}
.gauge .zone{position:absolute;top:0;bottom:0;background:rgba(34,197,94,.35);border-left:2px solid #22c55e;border-right:2px solid #22c55e}
.gauge .fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--star),#ff8a3a);opacity:.9}
.keys{display:flex;justify-content:center;align-items:center;gap:6px;font-size:12px;color:var(--faint);margin:0}

/* ADAPTOR CO2 ITEMS */
.items{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.item{
  display:flex;
  align-items:center;
  gap:8px;
  padding:9px 12px;
  border-radius:10px;
  background:rgba(18,24,52,.75);
  text-align:left;
  font-size:13.5px;
  font-weight:500;
  color:#e2e8f0;
  border:1px solid rgba(148,174,255,.14);
  cursor:pointer;
  transition:all .15s ease;
}
.item:hover{
  background:rgba(30,41,82,.85);
  border-color:rgba(148,174,255,.3);
}
.item.on{
  border-color:#38bdf8;
  background:rgba(56,189,248,.16);
  color:#fff;
}

/* REENTRY CORRIDOR */
.corr{
  position:relative;
  height:48px;
  border-radius:10px;
  background:linear-gradient(90deg,rgba(143,176,255,.12),rgba(255,107,107,.18));
  border:1px solid rgba(148,174,255,.16);
  margin-top:4px;
}
.corr .band{position:absolute;top:0;bottom:0;background:rgba(34,197,94,.35);border-left:2px solid #22c55e;border-right:2px solid #22c55e}
.corr .needle{position:absolute;top:-4px;bottom:-4px;width:4px;margin-left:-2px;background:#fff;border-radius:2px;box-shadow:0 0 10px rgba(255,255,255,.7)}
.corr .needle span{position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:600;white-space:nowrap;color:#fff}
.corr.in .needle{background:#22c55e;box-shadow:0 0 10px rgba(34,197,94,.8)}
.corr .lbl{position:absolute;bottom:4px;font-size:11px;color:var(--faint)}
.corr .lbl.l{left:8px}.corr .lbl.r{right:8px}
.prog .bar{height:6px;border-radius:4px}
.steer{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.steer .btn{user-select:none;touch-action:none}

/* TOMBOL AKSI MODERN */
.btn{
  height:42px;
  min-height:42px;
  padding:0 20px;
  border-radius:10px;
  font-family:var(--display);
  font-size:14px;
  font-weight:500;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  cursor:pointer;
  border:1px solid transparent;
  transition:all .15s ease;
}
.btn.block{width:100%}
.btn.primary{
  background:#3b82f6;
  color:#ffffff;
  border-color:transparent;
  box-shadow:0 2px 10px rgba(59,130,246,.35);
}
.btn.primary:hover{
  background:#2563eb;
  transform:translateY(-1px);
}
.btn.star{
  background:rgba(255,201,71,.15);
  border:1px solid rgba(255,201,71,.35);
  color:var(--star);
  box-shadow:0 2px 10px rgba(255,201,71,.2);
}
.btn.star:hover{
  background:rgba(255,201,71,.25);
  border-color:rgba(255,201,71,.55);
  transform:translateY(-1px);
}
.btn.hold{
  user-select:none;
  touch-action:none;
  height:44px;
}
.btn.hold.on{
  background:rgba(255,201,71,.28);
  border-color:rgba(255,201,71,.6);
  filter:brightness(1.15);
  transform:scale(.99);
}
.btn.line{
  background:transparent;
  border:1px solid rgba(148,174,255,.2);
  color:var(--muted);
}
.btn.line:hover{
  color:#fff;
  border-color:rgba(148,174,255,.35);
  background:rgba(255,255,255,.04);
}

/* SELESAI */
.fin{align-items:center;text-align:center}
.stars{display:flex;gap:6px;color:var(--line-2)}
.stars .got{color:var(--star);animation:popS .5s cubic-bezier(.2,.9,.3,1.4) both}
@keyframes popS{from{transform:scale(.2);opacity:0}}
.gain{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 14px;
  border-radius:10px;
  background:rgba(255,201,71,.12);
  border:1px solid rgba(255,201,71,.28);
  color:var(--star);
}
.gain span{font-size:13px;color:var(--muted)}
.facts{text-align:left;display:flex;flex-direction:column;gap:6px;padding-left:18px;font-size:13.5px;color:var(--muted);line-height:1.5;margin:0}
.fin .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}

@media (max-width:760px){
  .stat{left:calc(16px + var(--safe-l, 0px));top:calc(16px + var(--safe-t, 0px));max-width:calc(100vw - 80px)}
  .stat .h1{font-size:clamp(17px, 3.8vw, 20px);white-space:normal}
  .clk b{font-size:12.5px}
  .meters{width:220px;padding:8px 10px;margin-top:8px}
  .mc{bottom:calc(14px + var(--safe-b));padding:16px;max-height:calc(100vh - 120px);width:calc(100vw - 20px)}
  .crew{grid-template-columns:1fr 1fr 1fr}
  .items{grid-template-columns:1fr 1fr}
  .note{top:auto;bottom:calc(60vh + 16px);border-radius:10px}
}
@media (max-height:540px) and (orientation:landscape){
  .stat{
    top:calc(10px + var(--safe-t, 0px));
    left:calc(12px + var(--safe-l, 0px));
    max-width:calc(100vw - min(285px, 43vw) - 30px);
  }
  .tag{margin-bottom:4px}
  .stat .h1{font-size:15px;margin-bottom:2px}
  .clk{margin-bottom:3px}
  .clk b{font-size:11.5px}
  .meters{display:none}
  .mc{
    left:auto !important;
    right:calc(10px + var(--safe-r, 0px)) !important;
    transform:none !important;
    width:min(285px, 43vw) !important;
    bottom:calc(6px + var(--safe-b, 0px)) !important;
    top:calc(8px + var(--safe-t, 0px)) !important;
    max-height:calc(100dvh - 16px) !important;
    padding:10px 12px !important;
    gap:6px !important;
    border-radius:12px !important;
    overflow-y:auto !important;
  }
  .tx{font-size:12px;line-height:1.35}
  .opts{gap:5px}
  .opt{padding:6px 8px;font-size:12px;min-height:32px}
  .fb{padding:6px 8px;font-size:11.5px}
  .crew{gap:4px}
  .cr{padding:4px 6px;gap:4px}
  .cr .av{width:22px;height:22px;font-size:11px}
  .cr b{font-size:11px}
  .cr small{font-size:9.5px}
  .items{gap:4px}
  .item{padding:5px 8px;font-size:11.5px}
  .btn{height:34px !important;min-height:34px !important;font-size:12px !important;border-radius:8px !important}
  .mc>.btn,.row2{position:static !important;margin-top:6px !important}
}
@media (prefers-reduced-motion:reduce){ .boom,.static,.dotp{animation:none} }
</style>
