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
      <div v-if="M.step !== 'brief'" class="clk"><b>{{ date }}</b><span v-if="M.step === 'cruise'">bulan ke-{{ month }}</span></div>
      <div v-if="M.step !== 'brief'" class="ph"><span class="dotp" />{{ PHASE[M.step] }}</div>
      <div v-if="M.step === 'cruise'" class="info card flat">
        <div><small>Prakiraan tiba</small><b class="num">{{ D.plannedKm }} km</b></div>
        <div><small>Pendorong kecil menyala</small><b class="num">{{ M.amd }}×</b></div>
      </div>
      <div v-if="['arrive', 'retry', 'orbit'].includes(M.step)" class="info card flat" :class="{ hot: M.step === 'arrive' && M.alt < 90 }">
        <div><small>Ketinggian di atas Mars</small><b class="num">{{ M.alt.toLocaleString('id-ID') }} km</b></div>
        <div v-if="M.blackout"><small>Sinyal</small><b>Tertutup Mars</b></div>
      </div>
    </div>
    <button class="ib x" aria-label="Keluar dari misi" title="Keluar misi (Esc)" @click="game()?.back()"><UiIcon name="tutup" :size="20" /></button>
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
.stat{position:absolute;left:calc(var(--gap) + var(--safe-l));top:calc(var(--top) + var(--safe-t));display:flex;flex-direction:column;gap:8px;max-width:340px;pointer-events:none}
.stat .h1{font-size:clamp(30px,3.6vw,46px);text-shadow:0 4px 24px rgba(0,0,0,.6)}
.tag.red{background:rgba(255,107,107,.2);color:var(--coral)}
.clk{display:flex;align-items:baseline;gap:10px;text-shadow:0 2px 10px rgba(0,0,0,.7)}
.clk b{font-family:var(--display);font-size:22px;font-weight:700;color:var(--star)}
.clk span{color:var(--muted);font-size:14px}
.ph{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--muted);text-shadow:0 2px 10px rgba(0,0,0,.7)}
.dotp{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 1.4s infinite}
.bad .dotp{background:var(--coral)}
@keyframes pulse{50%{opacity:.3}}
.info{display:flex;gap:18px;padding:10px 14px;border-radius:var(--r);pointer-events:auto}
.info div{display:flex;flex-direction:column}
.info small{font-size:12px;color:var(--faint)}
.info b{font-family:var(--display);font-size:19px}
.info.hot{border:1px solid var(--coral)}
.info.hot b{color:var(--coral)}
.x{position:absolute;right:calc(var(--gap) + var(--safe-r));top:calc(var(--top) + var(--safe-t))}
.note{position:absolute;left:50%;top:calc(var(--top) + 8px + var(--safe-t));transform:translateX(-50%);max-width:min(560px,calc(100vw - 140px));padding:10px 18px;border-radius:999px;background:var(--surface-a);border:1px solid var(--line);font-size:14px;text-align:center}
.static{position:absolute;inset:0;pointer-events:none;opacity:.16;background:repeating-linear-gradient(0deg,rgba(255,255,255,.5) 0 1px,transparent 1px 3px);animation:noise .25s steps(4) infinite;mix-blend-mode:screen}
@keyframes noise{25%{transform:translateY(-1px)}50%{transform:translateY(2px)}75%{transform:translateY(-2px)}}
.mc{position:absolute;left:50%;bottom:calc(var(--gap) + var(--safe-b));transform:translateX(-50%);width:min(580px,calc(100vw - 24px));max-height:calc(100vh - 190px);overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:12px}
.mc .tag{align-self:flex-start}
.mc.center{align-items:center;text-align:center}
.mc.center .tag{align-self:center}
.big{font-family:var(--display);font-size:46px;font-weight:700;color:var(--star)}
.tx{font-size:15px;color:var(--muted);line-height:1.6}
.clues{display:flex;flex-direction:column;gap:8px}
.clue{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:var(--r);background:var(--surface-2);text-align:left;border:2px dashed var(--line-2)}
.clue.on{border-style:solid;border-color:rgba(255,201,71,.4)}
.clue b{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:600}
.clue .n{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--star);color:#3a2a00;font-size:13px}
.clue p{font-size:14px;color:var(--muted);line-height:1.55}
.clue small{font-size:12.5px;color:var(--faint)}
.q{font-family:var(--display);font-weight:600;font-size:17px;margin-top:4px}
.opts{display:flex;flex-direction:column;gap:8px}
.opts.grid{display:grid;grid-template-columns:1fr 1fr}
.opt{padding:12px 14px;border-radius:var(--r);background:var(--surface-2);text-align:left;font-size:15px;border:2px solid transparent;transition:background .15s}
.opts.grid .opt{text-align:center;font-size:18px;font-weight:600}
.opt:hover{background:var(--surface-3)}
.opt.ok{border-color:var(--green);background:rgba(54,211,154,.12)}
.opt.bad{border-color:var(--coral);background:rgba(255,107,107,.12)}
.fb{padding:10px 14px;border-radius:var(--r-sm);background:rgba(255,107,107,.1);color:#ffd4d4;font-size:14.5px;line-height:1.5}
.fb.ok{background:rgba(54,211,154,.1);color:#c8f7e3}
.rule{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:10px 14px;border-radius:var(--r-sm);background:rgba(255,201,71,.1);border:1px solid rgba(255,201,71,.3)}
.rule b{font-family:var(--display);font-size:17px;color:var(--star)}
.rule span{font-size:13px;color:var(--muted)}
.pkt{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pkt small{font-size:12.5px;color:var(--faint)}
.pkt b{font-family:var(--display);font-size:26px}
.pkt span{color:var(--muted)}
.alt{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:var(--r);background:var(--surface-2)}
.nr{display:flex;justify-content:space-between;font-size:13.5px;color:var(--muted)}
.nr b{color:var(--green)}.nr b.red{color:var(--coral)}
.altbar{position:relative;height:14px;border-radius:999px;background:var(--surface-3);overflow:hidden}
.altbar .danger{position:absolute;left:0;top:0;bottom:0;background:rgba(255,107,107,.45)}
.altbar .mk{position:absolute;top:0;bottom:0;width:4px;margin-left:-2px;background:#fff;transition:left .6s cubic-bezier(.2,.9,.3,1.2)}
.altbar .tgt{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--green)}
.leg{display:flex;justify-content:space-between;font-size:11.5px;color:var(--faint)}
.leg .r{color:var(--coral)}
.fin{align-items:center;text-align:center}
.stars{display:flex;gap:6px;color:var(--line-2)}
.stars .got{color:var(--star);animation:popS .5s cubic-bezier(.2,.9,.3,1.4) both}
@keyframes popS{from{transform:scale(.2);opacity:0}}
.gain{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:rgba(255,201,71,.14);color:var(--star)}
.gain span{font-size:13.5px;color:var(--muted)}
.lessons{width:100%;text-align:left;padding:12px 14px;border-radius:var(--r);background:rgba(54,211,154,.08);border:1px solid rgba(54,211,154,.25)}
.lessons b{font-family:var(--display);font-weight:600;color:var(--green)}
.lessons ul,.facts{display:flex;flex-direction:column;gap:6px;padding-left:18px;margin-top:6px;font-size:14px;color:var(--muted);line-height:1.5}
.facts{text-align:left;width:100%}
.fin .row2{width:100%}
@media (max-width:760px){
  .stat{max-width:calc(100vw - 80px);gap:4px}
  .stat .h1{font-size:24px}
  .clk b{font-size:17px}
  .mc{bottom:calc(8px + var(--safe-b));padding:16px;max-height:60vh}
  .note{top:auto;bottom:calc(60vh + 16px);border-radius:var(--r)}
}
@media (max-height:520px){
  .stat{max-width:260px;gap:2px}
  .stat .h1{font-size:18px}
  .info{display:none}
  .mc{bottom:calc(6px + var(--safe-b));max-height:calc(100vh - 46px);padding:12px 14px;gap:8px}
  .tx{font-size:13px;line-height:1.4}
  .clues{gap:4px}
  .clue{padding:8px 10px}
  .opts{gap:6px}
  .opt{padding:8px 10px;font-size:13.5px}
  .fb{padding:8px 10px;font-size:13px}
  .mc>.btn,.row2{position:sticky;bottom:0;z-index:3;margin-top:2px}
}
@media (prefers-reduced-motion:reduce){ .static,.dotp{animation:none} }
</style>
