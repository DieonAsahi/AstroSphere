<script setup>
// HUD mode Jelajah (PRD §4.1): target navigasi, kecepatan, planet terdekat + koordinat, kontrol atas.
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { store, game } from '~/composables/useGame.js';
const hint = ref(false);
let t1, t2;
onMounted(() => {
  t1 = setTimeout(() => { hint.value = true; }, 1200);
  t2 = setTimeout(() => { hint.value = false; store.settings.tutorialSeen = true; }, store.settings.tutorialSeen ? 7000 : 15000);
});
onBeforeUnmount(() => { clearTimeout(t1); clearTimeout(t2); });
</script>
<template>
  <div class="hud layer" :class="{ off: store.hudOff }">
    <div class="hp panel tgt hud-el">
      <div class="kicker">Target navigasi · <kbd>T</kbd></div>
      <div class="big acc2">{{ store.hud.target.name }}</div>
      <div class="row"><span>Jarak</span><b>{{ store.hud.target.dist }}</b></div>
      <div class="row"><span>Waktu tiba</span><b>{{ store.hud.target.eta }}</b></div>
      <div class="row disc"><span>Jurnal</span><b>{{ store.hud.disc }} ditemukan</b></div>
    </div>

    <div class="tr">
      <button class="ib" :aria-label="store.settings.soundEnabled ? 'Matikan suara' : 'Nyalakan suara'" @click="game()?.toggleSound()"><UiIcon :name="store.settings.soundEnabled ? 'suara' : 'bisu'" /></button>
      <button class="ib" :class="{ on: store.camMode === 'cockpit' }" aria-label="Ganti kamera" @click="game()?.toggleCam()"><UiIcon name="kamera" /></button>
      <button class="ib" aria-label="Jeda" @click="game()?.pause()"><UiIcon name="jeda" /></button>
    </div>
    <Transition name="fade"><div v-if="store.saved.show" class="saved"><i />{{ store.saved.label }}</div></Transition>

    <div class="hp panel spd hud-el">
      <div class="kicker">Kecepatan</div>
      <div class="speed"><b>{{ store.hud.speed }}</b><span>km/s</span></div>
      <div class="thr"><i :style="{ left: store.hud.thrLeft + '%', width: store.hud.thrWidth + '%' }" /><div class="zero" /></div>
      <div class="row"><span>{{ store.hud.thrTxt }}</span><span class="boost" :class="{ on: store.hud.boost }">BOOST</span></div>
      <div v-if="store.hud.limited" class="lim">Pembatas dekat permukaan</div>
    </div>

    <div class="hp panel nav hud-el">
      <div class="kicker">Planet terdekat</div>
      <div class="big">{{ store.hud.near.name }}</div>
      <div class="sub">{{ store.hud.near.kind }}</div>
      <div class="row"><span>Jarak</span><b>{{ store.hud.near.dist }}</b></div>
      <div class="row"><span>Ketinggian</span><b>{{ store.hud.near.alt }}</b></div>
      <hr class="divider">
      <div class="kicker c">Koordinat posisi</div>
      <div class="coords"><span>X</span><b>{{ store.hud.x }}</b><span>Y</span><b>{{ store.hud.y }}</b><span>Z</span><b>{{ store.hud.z }}</b></div>
    </div>

    <Transition name="fade"><div v-if="store.hud.boundary" class="bound panel" role="status"><i />Mendekati batas navigasi — kecepatan keluar direm otomatis</div></Transition>
    <Transition name="fade"><div v-if="store.look.active" class="looktag"><i />Pandangan bebas</div></Transition>
    <Transition name="fade">
      <div v-if="hint" class="hint panel">
        <template v-if="store.touch">Geser sisi kiri untuk mengemudi · tuas kanan untuk dorongan · tahan <b>BOOST</b> · <b>◎</b> arahkan ke target</template>
        <template v-else><kbd>W</kbd>/<kbd>S</kbd> dorong &nbsp; <kbd>Mouse</kbd> atau <kbd>A</kbd><kbd>D</kbd><kbd>↑</kbd><kbd>↓</kbd> kemudi &nbsp; <kbd>Q</kbd>/<kbd>E</kbd> guling &nbsp; <kbd>Space</kbd>/<kbd>C</kbd> naik/turun &nbsp; <kbd>Shift</kbd> boost<br><kbd>T</kbd> target &nbsp; tahan <kbd>G</kbd> arahkan &nbsp; <kbd>X</kbd> berhenti &nbsp; <kbd>M</kbd> peta &nbsp; tahan <kbd>Klik kanan</kbd> pandangan bebas &nbsp; <kbd>Esc</kbd> jeda</template>
      </div>
    </Transition>
    <div class="date hud-el">Waktu jelajah · {{ store.hud.simDate }} · 1 hari = 50 dtk</div>
  </div>
</template>
<style scoped>
.hud{z-index:10;opacity:var(--hud-op)}
.hud>*{pointer-events:auto}
.hud.off .hud-el,.hud.off .tr{opacity:0;pointer-events:none}
.hp{position:absolute;padding:14px 16px;min-width:230px;display:flex;flex-direction:column;gap:6px}
.big{font-size:19px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
.acc2{color:var(--acc2)}
.sub{font-size:11.5px;color:var(--acc);letter-spacing:.12em;text-transform:uppercase;margin-top:-4px}
.disc{margin-top:4px;padding-top:8px;border-top:1px solid var(--divider)}
.tgt{left:calc(var(--inset) + var(--safe-l));top:calc(var(--header-h) + 30px + var(--safe-t))}
.tr{position:absolute;right:calc(var(--inset) + var(--safe-r));top:calc(var(--header-h) + 30px + var(--safe-t));display:flex;gap:10px}
.saved{position:absolute;right:calc(var(--inset) + var(--safe-r));top:calc(var(--header-h) + 88px + var(--safe-t));display:flex;align-items:center;gap:7px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
.saved i{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 8px var(--ok)}
.spd{left:calc(var(--inset) + var(--safe-l));bottom:calc(28px + var(--safe-b));width:270px}
.speed{display:flex;align-items:baseline;gap:10px}
.speed b{font-family:var(--mono);font-size:38px;font-weight:600;letter-spacing:-.02em;min-width:4ch}
.speed span{color:var(--dim);font-size:13px;letter-spacing:.1em}
.thr{position:relative;height:6px;margin:4px 0 2px;background:var(--divider);border-radius:3px;overflow:hidden}
.thr i{position:absolute;top:0;bottom:0;background:var(--acc);box-shadow:0 0 8px var(--acc)}
.thr .zero{position:absolute;top:-2px;bottom:-2px;width:1px;background:rgba(255,255,255,.5);left:23.08%}
.boost{color:var(--faint);font-weight:700;letter-spacing:.2em;font-size:11px;transition:color .2s}
.boost.on{color:#9ff3ff;text-shadow:0 0 10px var(--acc)}
.lim{font-size:10.5px;letter-spacing:.14em;color:var(--acc2);text-transform:uppercase}
.nav{right:calc(var(--inset) + var(--safe-r));bottom:calc(28px + var(--safe-b));width:260px}
.coords{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:13px}
.coords span{color:var(--acc);font-weight:700}
.coords b{font-family:var(--mono);font-weight:600;text-align:right}
.bound{position:absolute;left:50%;top:calc(var(--header-h) + 110px);transform:translateX(-50%);display:flex;align-items:center;gap:9px;padding:9px 14px;font-size:12px;letter-spacing:.06em;color:var(--acc2);border-color:rgba(var(--acc2-rgb),.55)}
.bound i{width:7px;height:7px;border-radius:50%;background:var(--acc2);box-shadow:0 0 8px var(--acc2)}
.looktag{position:absolute;left:50%;top:calc(var(--header-h) + 96px);transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:5px 12px;border:1px solid rgba(var(--acc-rgb),.35);border-radius:20px;background:var(--panel);font-size:10.5px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--acc)}
.looktag i{width:6px;height:6px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px var(--acc)}
.hint{position:absolute;left:50%;top:calc(var(--header-h) + 130px);transform:translateX(-50%);padding:12px 16px;font-size:12px;color:var(--dim);line-height:2.1;text-align:center;max-width:min(820px,92vw)}
.date{position:absolute;left:50%;bottom:calc(112px + var(--safe-b));transform:translateX(-50%);font-family:var(--mono);font-size:10.5px;color:var(--faint);white-space:nowrap}
/* sentuh / layar kecil */
.touch .hp{min-width:0;padding:9px 12px;gap:3px}
.touch .tgt{left:12px;top:calc(var(--header-h) + 6px);width:178px}
.touch .tgt .row:nth-of-type(2),.touch .tgt .disc{display:none}
.touch .big{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.touch .spd{left:auto;right:12px;bottom:auto;top:calc(var(--header-h) + 6px);width:178px}
.touch .speed b{font-size:22px}
.touch .nav{right:auto;left:12px;bottom:auto;top:calc(var(--header-h) + 98px);width:178px}
.touch .nav hr,.touch .nav .c,.touch .nav .sub,.touch .nav .row{display:none}
.touch .coords{grid-template-columns:auto 1fr auto 1fr auto 1fr;gap:2px 5px;font-size:10px}
.touch .tr{display:none}
.touch .date{display:none}
.touch .bound{top:calc(var(--header-h) + 200px);font-size:11px;max-width:90vw}
.touch .hint{top:calc(var(--header-h) + 210px)}
@media (max-width:760px){ .date{display:none} }
</style>
