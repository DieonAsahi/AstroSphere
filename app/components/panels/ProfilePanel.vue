<script setup>
// Profil pemain: Riwayat Kuis, Inventaris Pesawat, FAQ, Pengaturan Kontrol.
import { computed, ref } from 'vue';
import { store, game, saveProgress, quizMax } from '~/composables/useGame.js';
import { PLANETS } from '~/data/solarSystem.js';
import { QUIZ } from '~/data/quiz.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
import { MODEL_CREDITS, LICENSE_URL } from '~/data/credits.js';
import { fmtDate } from '~/game/util.js';
const tab = computed({ get: () => store.profileTab, set: (v) => { store.profileTab = v; } });
const TABS = [['kuis', 'Riwayat Kuis'], ['armada', 'Inventaris Pesawat'], ['faq', 'FAQ'], ['kontrol', 'Pengaturan Kontrol']];
const P = store.progress;
const name = computed(() => store.account.loggedIn ? store.account.name : 'Penjelajah Tamu');
const nextShip = computed(() => SHIP_IDS.map((id) => SHIPS[id]).find((s) => !P.owned.includes(s.id)));
const spent = computed(() => P.ledger.filter((l) => l.delta < 0).reduce((a, l) => a - l.delta, 0));
const rows = computed(() => PLANETS.map((p) => {
  const b = P.best[p.id], n = P.attempts[p.id] || 0;
  const status = b == null ? ['Belum dimulai', 'faint'] : b >= quizMax() ? ['Sempurna', 'ok'] : ['Bisa ditingkatkan', 'acc2'];
  return { p, best: b, n, status, topic: QUIZ[p.id].topic, reward: P.ledger.filter((l) => l.planet === p.id).reduce((a, l) => a + l.delta, 0) };
}));
const ledger = computed(() => [...P.ledger].reverse().slice(0, 8));
const shipIdx = ref(Math.max(0, SHIP_IDS.indexOf(P.selectedShip)));
const ship = computed(() => SHIPS[SHIP_IDS[shipIdx.value]]);
function useShip(id) { if (!P.owned.includes(id)) return; P.selectedShip = id; saveProgress(); game()?.setShip(id); game()?.chime(); }
const openFaq = ref({ 0: true, 1: true });
const FAQ = [
  ['Apa itu AstroSphere?', 'Game edukasi tata surya berbasis browser untuk pelajar SMP ke atas dan masyarakat umum. Kamu menerbangkan pesawat, mengenal delapan planet, menelusuri sejarah eksplorasi, mempelajari gerhana, dan mengerjakan kuis.'],
  ['Bagaimana cara mengumpulkan poin?', 'Kerjakan kuis per planet: 3 soal, 50 poin per soal. Poin yang diterima adalah selisih skor baru dengan skor terbaik sebelumnya, jadi mengulang dengan skor sama tidak menambah poin. Jawaban salah tidak pernah mengurangi poin.'],
  ['Apakah perlu menginstal aplikasi?', 'Tidak. AstroSphere berjalan langsung di browser modern yang mendukung WebGL, di desktop maupun perangkat sentuh.'],
  ['Bagaimana membuka pesawat baru?', 'Astra Scout gratis sejak awal. Orion Glider terbuka dengan 300 poin dan Nova Voyager dengan 700 poin. Saldo hanya dipotong sekali saat membuka pesawat.'],
  ['Apakah progres tersimpan tanpa akun?', 'Ya. Mode tamu menyimpan checkpoint, jurnal, dan poin di browser ini. Akun bersifat opsional untuk sinkronisasi cloud, yang belum tersambung di versi ini.'],
  ['Apakah posisi planet di game akurat?', 'Ukuran planet relatif satu sama lain berskala nyata. Orbit dihitung dengan model edukasi Kepler dari elemen J2000; jarak antarplanet dipadatkan dan diberi label. Ini bukan alat untuk merencanakan pengamatan langit.'],
  ['Dari mana model 3D planet dan pesawatnya?', 'Model planet, Bulan, dan ketiga pesawat adalah karya kreator Sketchfab berlisensi Creative Commons (daftar lengkap di bawah). Model dioptimasi agar ringan di browser: kutub utara tekstur diarahkan ke sumbu rotasi dan bujur 0° disejajarkan, sehingga titik sejarah seperti lokasi pendaratan jatuh di tempat yang benar pada peta permukaan.'],
];
const KEYS = [
  ['Dorong maju', 'Tambah kecepatan', ['W', 'Roda ↑']], ['Dorong mundur', 'Kurangi kecepatan atau mundur', ['S', 'Roda ↓']], ['Kemudi', 'Belok dan angguk', ['A', 'D', '↑', '↓', 'Mouse']],
  ['Guling', 'Putar badan pesawat', ['Q', 'E']], ['Naik / turun', 'Geser vertikal', ['Space', 'C']], ['Boost', 'Akselerasi sementara', ['Shift']],
  ['Berhenti segera', 'Dorongan dan kecepatan menuju nol', ['X']], ['Ganti target', 'Pilih benda tujuan berikutnya', ['T']], ['Arahkan ke target', 'Tahan untuk menghadap target', ['Tahan G']],
  ['Pandangan bebas', 'Putar kamera tanpa ubah arah terbang', ['Klik kanan', 'L']], ['Kamera kokpit', 'Ganti sudut kamera', ['V']], ['Peta', 'Buka peta tata surya', ['M']],
  ['Jurnal', 'Buka jurnal penemuan', ['J']], ['Garis orbit / HUD', 'Tampilkan atau sembunyikan', ['O', 'H']], ['Jeda / lepas pointer', 'Buka menu jeda', ['Esc']],
];
function setting(k, v) { store.settings[k] = v; game()?.applySettings(); }
</script>
<template>
  <div>
    <div class="overlay-dim solid" />
    <section class="prof scroll">
      <div class="wrap">
        <div class="tophead">
          <span class="kicker acc">● Konsol pemain · {{ store.account.loggedIn ? 'akun terhubung (cloud belum tersambung)' : 'mode tamu · data tersimpan lokal' }}</span>
          <button class="btn primary sm" @click="game()?.setMode('jelajah')">‹ Kembali ke Eksplorasi</button>
        </div>
        <div class="idrow">
          <div class="cred panel">
            <div class="chips"><span class="badge">Kredensial penjelajah</span><span class="badge" :class="store.account.loggedIn ? 'ok' : 'acc2'">{{ store.account.loggedIn ? 'Akun' : 'Tamu' }}</span></div>
            <div class="who"><div class="av"><UiIcon name="pengguna" :size="40" /></div><div><h2>{{ name }}</h2><p class="cs">Pesawat aktif: {{ SHIPS[P.selectedShip].name }}</p></div></div>
            <hr class="divider">
            <div class="stats">
              <div><span class="kicker">Planet dikunjungi</span><b>{{ store.discovered.filter((d) => PLANETS.some((p) => p.id === d)).length }} / 8</b></div>
              <div><span class="kicker">Jurnal</span><b>{{ store.discovered.length }} objek</b></div>
              <div><span class="kicker">Kuis sempurna</span><b>{{ rows.filter((r) => r.best >= quizMax()).length }} / 8</b></div>
              <div><span class="kicker">Pesawat</span><b>{{ P.owned.length }} / 3 dimiliki</b></div>
            </div>
          </div>
          <div class="ptscard panel">
            <span class="kicker">Saldo poin</span>
            <b class="big">{{ P.points }}</b>
            <span class="pl">Poin tersedia</span>
            <p>Terkumpul {{ P.earned }} · dibelanjakan {{ spent }}. Poin dipakai untuk membuka pesawat di hanggar.</p>
            <template v-if="nextShip">
              <div class="row"><span>Menuju {{ nextShip.name }}</span><b>{{ Math.min(P.points, nextShip.price) }} / {{ nextShip.price }}</b></div>
              <div class="bar acc2"><i :style="{ width: Math.min(100, P.points / nextShip.price * 100) + '%' }" /></div>
            </template>
            <p v-else class="ok">Semua pesawat sudah dimiliki.</p>
          </div>
        </div>
        <div class="tabs panel" role="tablist">
          <button v-for="[id, lb] in TABS" :key="id" class="tb" :class="{ on: tab === id }" role="tab" :aria-selected="tab === id" @click="tab = id">{{ lb }}</button>
        </div>

        <!-- Riwayat kuis -->
        <template v-if="tab === 'kuis'">
          <div class="sect"><UiIcon name="piala" :size="22" /><h3>Riwayat evaluasi kuis astronomi</h3><span>Skor terbaik per planet · hadiah dari selisih skor terbaik</span></div>
          <div v-for="r in rows" :key="r.p.id" class="rec panel">
            <div class="c1"><span class="kicker">Topik materi</span><b>Kuis Planet · {{ r.p.name }}</b><small class="acc">{{ r.topic }}</small></div>
            <div><span class="kicker">Skor terbaik</span><b class="mono">{{ r.best ?? '—' }} / {{ quizMax() }}</b><small>{{ r.best == null ? 'Belum dikerjakan' : `Akurasi ${Math.round(r.best / quizMax() * 100)}%` }}</small></div>
            <div><span class="kicker">Percobaan</span><b class="mono">{{ r.n }} kali</b></div>
            <div><span class="kicker">Total hadiah</span><b class="mono acc2">+{{ r.reward }} poin</b></div>
            <span class="badge" :class="r.status[1]">{{ r.status[0] }}</span>
            <button class="btn sm" @click="store.quiz.planet = r.p.id; store.quiz.stage = 'intro'; game()?.setMode('kuis')">{{ r.best == null ? 'Mulai' : 'Ulangi' }}</button>
          </div>
          <div class="ledger panel">
            <div class="kicker acc2">Catatan transaksi poin</div>
            <p v-if="!ledger.length" class="dim">Belum ada transaksi. Selesaikan kuis untuk mendapat poin.</p>
            <div v-for="l in ledger" :key="l.id" class="row"><span>{{ l.type === 'kuis' ? `Kuis ${PLANETS.find((p) => p.id === l.planet)?.name} · percobaan ${l.attempt} (${l.from} → ${l.to})` : `Membuka ${SHIPS[l.ship]?.name}` }} · {{ fmtDate(l.at) }}</span><b :class="l.delta > 0 ? 'acc2' : ''">{{ l.delta > 0 ? '+' : '' }}{{ l.delta }}</b></div>
          </div>
        </template>

        <!-- Inventaris -->
        <template v-else-if="tab === 'armada'">
          <div class="sect"><UiIcon name="hanggar" :size="22" /><h3>Inventaris &amp; status armada pesawat</h3><span>Membuka memotong saldo sekali · memilih yang dimiliki gratis</span></div>
          <div class="fleet panel">
            <div class="sel">
              <div class="kicker acc">Pilih pesawat · {{ shipIdx + 1 }} / 3</div>
              <div class="nav"><button class="ib" aria-label="Sebelumnya" @click="shipIdx = (shipIdx + 2) % 3"><UiIcon name="kembali" /></button><div class="nm"><b>{{ ship.name }}</b><small>{{ ship.cls }} · {{ ship.length }}</small></div><button class="ib" aria-label="Berikutnya" @click="shipIdx = (shipIdx + 1) % 3"><UiIcon name="lanjut" /></button></div>
              <p>{{ ship.desc }}</p>
              <div v-for="(v, k) in ship.stats" :key="k" class="stat"><span>{{ k }}</span><div class="bar"><i :style="{ width: v * 100 + '%' }" /></div></div>
              <div class="row"><span>Status</span><b>{{ ship.id === P.selectedShip ? 'Dimiliki · dipakai' : P.owned.includes(ship.id) ? 'Dimiliki' : 'Terkunci' }}</b></div>
              <div class="row"><span>Harga</span><b>{{ ship.price ? ship.price + ' poin' : 'Gratis' }}</b></div>
              <button v-if="ship.id === P.selectedShip" class="btn block" disabled>Sedang digunakan</button>
              <button v-else-if="P.owned.includes(ship.id)" class="btn primary block" @click="useShip(ship.id)">Gunakan pesawat</button>
              <button v-else class="btn block" @click="game()?.setMode('hanggar')">Buka di Hanggar · {{ ship.price }} poin</button>
            </div>
            <div class="art" :class="ship.id"><span class="badge">Model 3D tampil di Hanggar</span></div>
          </div>
        </template>

        <!-- FAQ -->
        <template v-else-if="tab === 'faq'">
          <div class="sect"><UiIcon name="info" :size="22" /><h3>Pertanyaan umum (FAQ)</h3></div>
          <div class="faq">
            <div v-for="([q, a], i) in FAQ" :key="i" class="fi panel" :class="{ open: openFaq[i] }">
              <button class="fq" :aria-expanded="!!openFaq[i]" @click="openFaq[i] = !openFaq[i]"><b>{{ i + 1 }}. {{ q }}</b><UiIcon name="lanjut" :size="18" class="chev" /></button>
              <p v-if="openFaq[i]">{{ a }}</p>
            </div>
          </div>
          <div class="credits panel">
            <h4>Kredit model 3D</h4>
            <ul>
              <li v-for="c in MODEL_CREDITS" :key="c.url">
                <b>{{ c.use }}</b> — <a :href="c.url" target="_blank" rel="noopener noreferrer">“{{ c.title }}”</a> oleh {{ c.author }},
                <a :href="LICENSE_URL[c.license]" target="_blank" rel="noopener noreferrer">{{ c.license }}</a> · diubah (dioptimasi)
              </li>
            </ul>
          </div>
        </template>

        <!-- Kontrol -->
        <template v-else>
          <div class="sect"><UiIcon name="atur" :size="22" /><h3>Pengaturan kontrol simulasi</h3></div>
          <div class="ctl">
            <div class="keys panel">
              <div class="kicker">Bagian A · keyboard &amp; mouse</div>
              <div v-for="[l, s, ks] in KEYS" :key="l" class="krow"><div><b>{{ l }}</b><small>{{ s }}</small></div><span class="kk"><kbd v-for="k in ks" :key="k">{{ k }}</kbd></span></div>
            </div>
            <div class="rcol">
              <div class="touchc panel">
                <div class="kicker">Bagian B · kontrol sentuh</div>
                <div class="tgrid">
                  <div class="tt"><UiIcon name="arahkan" :size="24" /><b>Joystick virtual</b><small>Geser sisi kiri layar untuk mengemudi</small></div>
                  <div class="tt"><UiIcon name="naik" :size="24" /><b>Tuas dorong</b><small>Geser tuas kanan ke atas atau bawah</small></div>
                  <div class="tt"><UiIcon name="target" :size="24" /><b>Tombol aksi</b><small>Guling, naik, turun, target, arahkan, boost</small></div>
                  <div class="tt"><UiIcon name="mata" :size="24" /><b>Gestur kamera</b><small>Geser area kosong untuk pandangan bebas</small></div>
                </div>
              </div>
              <div class="prefs panel">
                <div class="kicker">Preferensi</div>
                <div class="trow"><span>Sensitivitas kemudi</span><span class="rng"><input type="range" min=".3" max="2.5" step=".1" :value="store.settings.sensitivity" @input="setting('sensitivity', +$event.target.value)"><b class="mono">{{ store.settings.sensitivity.toFixed(1) }}×</b></span></div>
                <UiToggle :model-value="store.settings.invertY" label="Balik sumbu Y" sub="Mouse ke atas = hidung turun" @update:model-value="setting('invertY', $event)" />
                <UiToggle :model-value="store.settings.reduceMotion" label="Kurangi gerak" sub="Matikan rotasi kamera otomatis, transisi singkat" @update:model-value="setting('reduceMotion', $event)" />
                <div class="trow"><span>Opasitas HUD</span><span class="rng"><input type="range" min=".2" max="1" step=".05" :value="store.settings.hudOpacity" @input="setting('hudOpacity', +$event.target.value)"><b class="mono">{{ Math.round(store.settings.hudOpacity * 100) }}%</b></span></div>
                <UiToggle :model-value="store.settings.soundEnabled" label="Suara" sub="Mesin, ambien, dan efek" @update:model-value="setting('soundEnabled', $event)" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
<style scoped>
.overlay-dim.solid{background:rgba(2,4,10,.82)}
.prof{position:fixed;left:0;right:0;top:var(--header-h);bottom:0;z-index:22}
.wrap{width:min(1440px,calc(100vw - 2 * var(--inset)));margin:0 auto;padding:24px 0 60px;display:flex;flex-direction:column;gap:20px}
.tophead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.idrow{display:flex;gap:20px}
.cred{flex:1;padding:26px 30px;display:flex;flex-direction:column;gap:16px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.who{display:flex;align-items:center;gap:20px}
.av{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;background:var(--soft);border:1.5px solid var(--acc);color:var(--acc);flex:none}
h2{font-size:40px;font-weight:700;line-height:1.1}
.cs{color:var(--acc);font-size:15px;margin-top:4px}
.stats{display:flex;gap:40px;flex-wrap:wrap}
.stats div{display:flex;flex-direction:column;gap:4px}.stats b{font-family:var(--mono);font-size:14px}
.ptscard{width:400px;flex:none;padding:26px;display:flex;flex-direction:column;gap:8px}
.ptscard .big{font-family:var(--mono);font-size:68px;color:var(--acc2);line-height:1}
.ptscard .pl{font-weight:600}
.ptscard p{font-size:13px;color:var(--dim);line-height:1.5}
.ok{color:var(--ok)}.acc{color:var(--acc)}.acc2{color:var(--acc2)}.dim{color:var(--dim);font-size:13px}
.tabs{display:flex;gap:6px;padding:6px;align-self:flex-start;flex-wrap:wrap}
.tb{min-height:42px;padding:10px 18px;border-radius:8px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.tb.on{background:var(--cta);color:var(--on-cta)}
.sect{display:flex;align-items:center;gap:12px;color:var(--acc);flex-wrap:wrap}
.sect h3{font-size:18px;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);font-weight:600}
.sect span{margin-left:auto;font-size:12px;color:var(--faint)}
.rec{display:grid;grid-template-columns:minmax(220px,2fr) 1.2fr 1fr 1.2fr auto auto;align-items:center;gap:22px;padding:18px 24px}
.rec>div{display:flex;flex-direction:column;gap:4px}
.rec b{font-size:16px}.rec small{font-size:11.5px;color:var(--faint)}
.ledger{padding:18px 22px;display:flex;flex-direction:column;gap:9px}
.fleet{position:relative;height:560px;overflow:hidden;display:flex}
.sel{position:relative;z-index:1;width:420px;margin:28px;padding:22px 24px;display:flex;flex-direction:column;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);align-self:flex-start}
.sel .nav{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sel .nm{text-align:center}.sel .nm b{display:block;font-size:22px;letter-spacing:.1em;text-transform:uppercase}.sel .nm small{font-size:12px;color:var(--acc)}
.sel p{font-size:13px;color:var(--dim);line-height:1.5}
.stat{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:12px;font-size:12px;color:var(--dim)}
.art{position:absolute;inset:0;background:radial-gradient(ellipse at 70% 50%,rgba(var(--acc-rgb),.14),transparent 60%);display:flex;align-items:flex-end;justify-content:flex-end;padding:22px}
.art.orion{background:radial-gradient(ellipse at 70% 50%,rgba(255,74,74,.14),transparent 60%)}
.art.nova{background:radial-gradient(ellipse at 70% 50%,rgba(63,182,255,.18),transparent 60%)}
.art.astra{background:radial-gradient(ellipse at 70% 50%,rgba(255,154,60,.14),transparent 60%)}
.faq{display:flex;flex-direction:column;gap:10px;max-width:980px}
.credits{max-width:980px;margin-top:14px;padding:14px 16px;border-radius:10px}
.credits h4{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--acc);margin:0 0 8px}
.credits ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--dim);line-height:1.5}
.credits b{color:var(--txt)}
.credits a{color:var(--acc)}
.fi{padding:4px 20px}
.fq{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:52px;text-align:left}
.fq b{font-size:15px;font-weight:600}
.chev{transition:transform .2s;color:var(--dim)} .fi.open .chev{transform:rotate(90deg)}
.fi p{font-size:13.5px;color:var(--dim);line-height:1.6;padding-bottom:16px}
.ctl{display:flex;gap:20px;align-items:flex-start}
.keys{flex:1;padding:20px 24px}
.krow{display:flex;align-items:center;gap:16px;padding:11px 0;border-top:1px solid var(--divider)}
.krow>div{flex:1;display:flex;flex-direction:column;gap:2px}.krow b{font-size:14px}.krow small{font-size:11.5px;color:var(--faint)}
.kk{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.rcol{width:520px;flex:none;display:flex;flex-direction:column;gap:16px}
.touchc,.prefs{padding:20px 24px;display:flex;flex-direction:column;gap:12px}
.tgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tt{display:flex;flex-direction:column;gap:6px;padding:16px;border-radius:10px;background:var(--bg);border:1px solid var(--divider);color:var(--acc)}
.tt b{color:var(--txt);font-size:14px}.tt small{font-size:11.5px;color:var(--dim);line-height:1.4}
.rng{display:flex;align-items:center;gap:10px;width:200px}.rng b{font-size:12px;color:var(--dim);width:44px;text-align:right}
@media (max-width:1100px){ .idrow,.ctl{flex-direction:column} .ptscard,.rcol{width:100%} .rec{grid-template-columns:1fr 1fr;gap:12px} }
@media (max-width:760px){ h2{font-size:28px} .fleet{height:auto} .sel{width:auto;margin:14px} .art{display:none} .tgrid{grid-template-columns:1fr} .stats{gap:18px} }
</style>
