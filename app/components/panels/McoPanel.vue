<script setup>
// Misi kisah nyata Mars Climate Orbiter: kisah (wahana hilang) → investigasi (cari penyebab) → ulangi sejarah
// (konversi pound-gaya·detik ke newton·detik). Waktu & adegan dijalankan game/missionMco.js (store.mission).
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, rewardMission } from '~/composables/useGame.js';
import { MCO as D } from '~/data/missions.js';
const M = store.mission;
const G = () => game()?.mission;
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const date = computed(() => { const d = new Date(D.launchUTC + M.clock * 86400e3); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; });
const month = computed(() => Math.min(9.4, M.clock / 30.4).toFixed(1).replace('.', ','));
const nf = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
const PHASE = { cruise: 'Menuju Mars', arrive: 'Tiba di Mars', wait: 'Menunggu sinyal', lost: 'Wahana hilang', investigate: 'Investigasi', fix: 'Ulangi sejarah', retry: 'Tiba di Mars (coba lagi)', orbit: 'Di orbit Mars', done: 'Selesai' };
const bad = computed(() => ['arrive', 'wait', 'lost'].includes(M.step));

// ---- menunggu sinyal ----
const waitN = ref(0); let waitT = 0;
watch(() => M.step, (s) => {
  clearInterval(waitT);
  if (s === 'wait') { waitN.value = 0; waitT = setInterval(() => { waitN.value++; }, 1000); }
  if (s === 'done') { result.stars = G()?.starsNow() || 1; result.reward = rewardMission(D.id, result.stars); }
});

// ---- investigasi ----
const inv = reactive({ open: [false, false, false], pick: null, tries: 0 });
const allOpen = computed(() => inv.open.every(Boolean));
const invOpt = computed(() => (inv.pick == null ? null : D.options[inv.pick]));
function openClue(i) { if (!inv.open[i]) { inv.open[i] = true; game()?.click(); } }
function choose(i) { if (invOpt.value?.ok) return; inv.pick = i; inv.tries++; if (D.options[i].ok) game()?.correct(); else game()?.wrong(); }

// ---- ulangi sejarah: konversi satuan ----
const fx = reactive({ k: 0, pick: null, msg: '', ok: false, tries: 0, done: false });
const pk = computed(() => D.packets[Math.min(fx.k, D.packets.length - 1)]);
function answer(o) {
  if (fx.ok) return;
  fx.pick = o; fx.tries++;
  if (Math.abs(o - pk.value.a) < 1e-6) {
    fx.ok = true; fx.msg = `Benar: ${nf(pk.value.v)} × ${nf(D.factor)} = ${nf(pk.value.a)} N·s`;
    G()?.mark(`p${fx.k}`, fx.tries <= 1, (fx.k + 1) / D.packets.length); game()?.correct();
  } else {
    fx.msg = Math.abs(o - pk.value.v) < 1e-6 ? 'Itu angka aslinya — belum diubah. Inilah kesalahan yang terjadi pada 1999!'
      : o < pk.value.v ? 'Terbalik: untuk mengubah pound-gaya ke newton, kalikan dengan 4,45 (bukan dibagi).'
        : 'Belum tepat. Kalikan angka dengan 4,45.';
    game()?.wrong();
  }
}
function nextPacket() {
  if (fx.k < D.packets.length - 1) Object.assign(fx, { k: fx.k + 1, pick: null, msg: '', ok: false, tries: 0 });
  else fx.done = true;
}
const altPct = (km) => clamp01((km - 0) / 260) * 100;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

const result = reactive({ stars: 0, reward: 0 });
function restart() {
  G()?.reset();
  Object.assign(inv, { open: [false, false, false], pick: null, tries: 0 });
  Object.assign(fx, { k: 0, pick: null, msg: '', ok: false, tries: 0, done: false });
  Object.assign(result, { stars: 0, reward: 0 });
}
onMounted(restart);
onBeforeUnmount(() => clearInterval(waitT));
</script>

<template>
  <div class="mi" :class="{ bad, black: M.blackout && ['arrive', 'wait'].includes(M.step) }">
    <div class="stat">
      <span class="tag" :class="bad ? 'red' : ''">{{ D.tag }}</span>
      <h1 class="h1">{{ D.title }}</h1>
      <div v-if="M.step !== 'brief'" class="clk" :class="{ bad }">
        <b>{{ date }}</b>
        <span v-if="M.step === 'cruise'" class="sub">· bulan ke-{{ month }}</span>
      </div>
      <div v-if="M.step !== 'brief'" class="ph"><span class="dotp" :class="{ red: bad }" />{{ PHASE[M.step] }}</div>
      <div v-if="M.step === 'cruise'" class="info">
        <div><small>Prakiraan tiba</small><b class="num">{{ D.plannedKm }} km</b></div>
        <div><small>Pendorong kecil menyala</small><b class="num">{{ M.amd }}×</b></div>
      </div>
      <div v-if="['arrive', 'retry', 'orbit'].includes(M.step)" class="info" :class="{ hot: M.step === 'arrive' && M.alt < 90 }">
        <div><small>Ketinggian di atas Mars</small><b class="num">{{ M.alt.toLocaleString('id-ID') }} km</b></div>
        <div v-if="M.blackout"><small>Sinyal</small><b>Tertutup Mars</b></div>
      </div>
    </div>
    <button class="modern-close-btn" aria-label="Keluar dari misi" title="Keluar misi (Esc)" @click="game()?.back()"><UiIcon name="tutup" :size="18" /></button>
    <Transition name="fade"><div v-if="M.note" class="note">{{ M.note }}</div></Transition>
    <div v-if="M.step === 'wait'" class="static" aria-hidden="true" />

    <Transition name="rise" mode="out-in">
      <section v-if="M.step === 'brief'" key="brief" class="card mc">
        <h2 class="h2">Misi ke Mars</h2>
        <p class="tx">{{ D.brief }}</p>
        <p class="small">11 Desember 1998 · Diluncurkan dari Cape Canaveral, Amerika Serikat</p>
        <button class="btn primary lg block" @click="G()?.launch()"><UiIcon name="kilat" :size="20" />Luncurkan</button>
      </section>

      <section v-else-if="M.step === 'wait'" key="wait" class="card mc center">
        <span class="tag">Pusat kendali, 23 September 1999</span>
        <h2 class="h2">Menunggu sinyal kembali…</h2>
        <b class="big num">{{ String(Math.floor(waitN / 60)).padStart(2, '0') }}:{{ String(waitN % 60).padStart(2, '0') }}</b>
        <p class="small">Wahana sedang di balik Mars. Sinyal seharusnya muncul lagi saat ia keluar dari bayangan planet.</p>
      </section>

      <section v-else-if="M.step === 'lost'" key="lost" class="card mc">
        <span class="tag red">Wahana hilang</span>
        <h2 class="h2">Sinyal tidak pernah kembali</h2>
        <p class="tx">{{ D.lost }}</p>
        <button class="btn star lg block" @click="G()?.investigate()"><UiIcon name="info" :size="20" />Selidiki penyebabnya</button>
      </section>

      <section v-else-if="M.step === 'investigate'" key="inv" class="card mc">
        <span class="tag">Kamu tim penyelidik</span>
        <h2 class="h2">Kumpulkan petunjuk</h2>
        <div class="clues">
          <button v-for="(c, i) in D.clues" :key="i" class="clue" :class="{ on: inv.open[i] }" @click="openClue(i)">
            <b><span class="n">{{ i + 1 }}</span>{{ c.t }}</b>
            <p v-if="inv.open[i]">{{ c.d }}</p>
            <small v-else>Ketuk untuk membuka</small>
          </button>
        </div>
        <template v-if="allOpen">
          <h3 class="q">{{ D.question }}</h3>
          <div class="opts"><button v-for="(o, i) in D.options" :key="i" class="opt" :class="{ ok: inv.pick === i && o.ok, bad: inv.pick === i && !o.ok }" @click="choose(i)">{{ o.t }}</button></div>
          <p v-if="invOpt" class="fb" :class="{ ok: invOpt.ok }">{{ invOpt.why }}</p>
          <button v-if="invOpt?.ok" class="btn primary block" @click="G()?.complete('investigate', inv.tries <= 1)">Ulangi sejarah<UiIcon name="lanjut" :size="18" /></button>
        </template>
      </section>

      <section v-else-if="M.step === 'fix'" key="fix" class="card mc">
        <span class="tag">Kamu jadi navigator · paket {{ Math.min(fx.k + 1, D.packets.length) }} dari {{ D.packets.length }}</span>
        <h2 class="h2">Ubah ke satuan yang benar</h2>
        <p class="tx">Data dorongan dari tim pembuat wahana memakai pound-gaya·detik. Komputer navigasi butuh newton·detik.</p>
        <div class="rule"><b>1 lbf·s = {{ nf(D.factor) }} N·s</b><span>(pound-gaya·detik → newton·detik)</span></div>
        <template v-if="!fx.done">
          <div class="pkt"><small>Data masuk</small><b class="num">{{ nf(pk.v) }} lbf·s</b><span>→ berapa N·s?</span></div>
          <div class="opts grid"><button v-for="o in pk.opts" :key="o" class="opt num" :class="{ ok: fx.pick === o && fx.ok, bad: fx.pick === o && !fx.ok }" @click="answer(o)">{{ nf(o) }} N·s</button></div>
          <p v-if="fx.msg" class="fb" :class="{ ok: fx.ok }">{{ fx.msg }}</p>
          <button v-if="fx.ok" class="btn primary block" @click="nextPacket">{{ fx.k < D.packets.length - 1 ? 'Paket berikutnya' : 'Hitung ulang jalur' }}<UiIcon name="lanjut" :size="18" /></button>
        </template>
        <div class="alt">
          <div class="nr"><span>Prakiraan ketinggian saat tiba</span><b class="num" :class="{ red: M.pred < 80 }">{{ M.pred }} km</b></div>
          <div class="altbar"><div class="danger" :style="{ width: altPct(80) + '%' }" /><div class="mk" :style="{ left: altPct(M.pred) + '%' }" /><div class="tgt" :style="{ left: altPct(D.plannedKm) + '%' }" /></div>
          <div class="leg"><span class="r">terlalu rendah (atmosfer)</span><span>target {{ D.plannedKm }} km</span></div>
        </div>
        <button v-if="fx.done" class="btn star lg block" @click="G()?.complete('fix', true)"><UiIcon name="kilat" :size="20" />Coba masuk orbit lagi</button>
      </section>

      <section v-else-if="M.step === 'done'" key="done" class="card mc fin">
        <div class="stars" :aria-label="`${result.stars} dari 3 bintang`"><UiIcon v-for="n in 3" :key="n" :name="n <= result.stars ? 'bintang' : 'bintang-o'" :size="46" :class="{ got: n <= result.stars }" :style="{ animationDelay: n * .15 + 's' }" /></div>
        <h2 class="h2">Masuk orbit Mars!</h2>
        <p class="tx">{{ D.success }}</p>
        <div v-if="result.reward" class="gain"><UiIcon name="bintang" :size="20" /><b class="num">+{{ result.reward }}</b><span>bintang · misi pertama selesai</span></div>
        <div class="lessons"><b>Pelajaran dari kisah ini</b><ul><li v-for="l in D.lessons" :key="l">{{ l }}</li></ul></div>
        <ul class="facts"><li v-for="f in D.facts" :key="f">{{ f }}</li></ul>
        <div class="row2">
          <button class="btn line" @click="restart"><UiIcon name="ulang" :size="18" />Main lagi</button>
          <button class="btn primary" @click="game()?.back()">Kembali terbang</button>
        </div>
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
.clk.bad b{
  color:#f87171;
}
.clk .sub{
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
.bad .dotp, .dotp.red{
  background:#f87171;
  box-shadow:0 0 8px rgba(248, 113, 113, 0.6);
}
@keyframes pulse{50%{opacity:.3}}

.info{
  display:flex;
  gap:16px;
  padding:10px 14px;
  margin-top:12px;
  border-radius:12px;
  background:rgba(11, 16, 36, 0.88);
  border:1px solid rgba(148, 174, 255, 0.18);
  box-shadow:0 8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter:blur(12px);
  width:fit-content;
  pointer-events:auto;
}
.info div{display:flex;flex-direction:column;gap:1px}
.info small{font-size:11px;color:var(--faint)}
.info b{font-family:var(--display);font-size:17px;font-weight:600;color:#fff}
.info.hot{border-color:rgba(239, 68, 68, 0.4);background:rgba(40, 12, 20, 0.85)}
.info.hot b{color:#f87171}

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

.mc.center{align-items:center;text-align:center}
.mc.center .tag{align-self:center}
.big{font-family:var(--display);font-size:44px;font-weight:600;color:var(--star);margin:2px 0}

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

/* KARTU PETUNJUK INVESTIGASI */
.clues{display:flex;flex-direction:column;gap:8px}
.clue{
  display:flex;
  flex-direction:column;
  gap:6px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(18,24,52,.7);
  text-align:left;
  border:1px dashed rgba(148,174,255,.24);
  transition:all .15s ease;
  cursor:pointer;
}
.clue:hover{
  background:rgba(24,32,68,.85);
  border-color:rgba(148,174,255,.4);
}
.clue.on{
  border-style:solid;
  border-color:rgba(56,189,248,.35);
  background:rgba(20,28,60,.85);
}
.clue b{
  display:flex;
  align-items:center;
  gap:10px;
  font-family:var(--display);
  font-weight:600;
  font-size:14px;
  color:#fff;
}
.clue .n{
  width:22px;
  height:22px;
  border-radius:6px;
  display:grid;
  place-items:center;
  background:rgba(56,189,248,.18);
  border:1px solid rgba(56,189,248,.35);
  color:#38bdf8;
  font-size:12px;
  font-weight:600;
  flex:none;
}
.clue p{
  font-size:13.5px;
  color:var(--muted);
  line-height:1.5;
  margin:0;
}
.clue small{
  font-size:12px;
  color:var(--faint);
}

.q{
  font-family:var(--display);
  font-weight:600;
  font-size:16px;
  color:#fff;
  margin-top:4px;
  line-height:1.3;
}

/* OPSI PILIHAN */
.opts{display:flex;flex-direction:column;gap:8px}
.opts.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
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
.opts.grid .opt{
  justify-content:center;
  text-align:center;
  font-size:16px;
  font-weight:600;
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

/* RUMUS KONVERSI SATUAN */
.rule{
  display:flex;
  flex-wrap:wrap;
  align-items:baseline;
  gap:8px;
  padding:10px 14px;
  border-radius:10px;
  background:rgba(56,189,248,.1);
  border:1px solid rgba(56,189,248,.25);
}
.rule b{
  font-family:var(--display);
  font-size:16px;
  font-weight:600;
  color:#38bdf8;
}
.rule span{
  font-size:12.5px;
  color:var(--muted);
}

.pkt{
  display:flex;
  align-items:baseline;
  gap:10px;
  flex-wrap:wrap;
  padding:4px 0;
}
.pkt small{
  font-size:12px;
  color:var(--faint);
}
.pkt b{
  font-family:var(--display);
  font-size:24px;
  font-weight:600;
  color:#fff;
}
.pkt span{
  font-size:13.5px;
  color:var(--muted);
}

/* ALTITUDE / KETINGGIAN MARS */
.alt{
  display:flex;
  flex-direction:column;
  gap:6px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(18,24,52,.7);
  border:1px solid rgba(148,174,255,.14);
}
.nr{display:flex;justify-content:space-between;font-size:13px;color:var(--muted)}
.nr b{color:#22c55e}.nr b.red{color:#ef4444}
.altbar{
  position:relative;
  height:12px;
  border-radius:6px;
  background:rgba(18,24,52,.9);
  border:1px solid rgba(148,174,255,.14);
  overflow:hidden;
}
.altbar .danger{position:absolute;left:0;top:0;bottom:0;background:rgba(239,68,68,.45)}
.altbar .mk{position:absolute;top:0;bottom:0;width:4px;margin-left:-2px;background:#fff;transition:left .6s cubic-bezier(.2,.9,.3,1.2)}
.altbar .tgt{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#22c55e}
.leg{display:flex;justify-content:space-between;font-size:11px;color:var(--faint)}
.leg .r{color:#ef4444}

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
.lessons{
  width:100%;
  text-align:left;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(34,197,94,.08);
  border:1px solid rgba(34,197,94,.24);
}
.lessons b{
  font-family:var(--display);
  font-weight:600;
  color:#4ade80;
  font-size:13.5px;
}
.lessons ul,.facts{
  display:flex;
  flex-direction:column;
  gap:6px;
  padding-left:18px;
  margin-top:6px;
  font-size:13.5px;
  color:var(--muted);
  line-height:1.5;
}
.facts{text-align:left;width:100%;margin-top:0}
.fin .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}

@media (max-width:760px){
  .stat{left:calc(16px + var(--safe-l, 0px));top:calc(16px + var(--safe-t, 0px));max-width:calc(100vw - 80px)}
  .stat .h1{font-size:clamp(17px, 3.8vw, 20px);white-space:normal}
  .clk b{font-size:12.5px}
  .info{margin-top:8px}
  .mc{bottom:calc(14px + var(--safe-b));padding:16px;max-height:calc(100vh - 120px);width:calc(100vw - 20px)}
  .note{top:auto;bottom:calc(60vh + 16px);border-radius:10px}
}
@media (max-height:540px) and (orientation:landscape){
  .stat{
    top:calc(10px + var(--safe-t, 0px));
    left:calc(12px + var(--safe-l, 0px));
    max-width:calc(100vw - min(370px, 50vw) - 30px);
  }
  .tag{margin-bottom:4px}
  .stat .h1{font-size:16px;margin-bottom:3px}
  .clk{margin-bottom:4px}
  .info{display:none}
  .mc{
    left:auto !important;
    right:calc(10px + var(--safe-r, 0px)) !important;
    transform:none !important;
    width:min(370px, 50vw) !important;
    bottom:calc(6px + var(--safe-b, 0px)) !important;
    top:calc(8px + var(--safe-t, 0px)) !important;
    max-height:calc(100dvh - 16px) !important;
    padding:12px 14px;
    gap:8px;
  }
  .tx{font-size:13px;line-height:1.4}
  .clues{gap:4px}
  .clue{padding:8px 10px}
  .opts{gap:6px}
  .opt{padding:8px 10px;font-size:13px;min-height:36px}
  .fb{padding:8px 10px;font-size:12.5px}
  .mc>.btn,.row2{position:sticky;bottom:0;z-index:3;margin-top:2px}
}
@media (prefers-reduced-motion:reduce){ .static,.dotp{animation:none} }
</style>
