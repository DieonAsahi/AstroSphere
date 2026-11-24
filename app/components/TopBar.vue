<script setup>
// Bilah atas permainan: minimal. Jelajah → logo + misi + profil + menu. Mode belajar → tombol Kembali + menu.
import { computed, ref, onBeforeUnmount } from 'vue';
import { store, game, unreadCards } from '~/composables/useGame.js';
const LABEL = { planet: 'Planet', sejarah: 'Sejarah', fenomena: 'Fenomena', hanggar: 'Hanggar' };
const unread = computed(() => unreadCards());
const backLabel = computed(() => store.mode === 'planet' && store.pheno.on ? 'Selesai' : store.backTo === 'planet' ? 'Ke planet' : store.backTo === 'sejarah' ? 'Ke sejarah' : 'Terbang lagi');

const showMissionMenu = ref(false);
const missionsCompleted = computed(() => {
  let count = 0;
  if (store.progress.missions?.apollo13?.done) count++;
  if (store.progress.missions?.mco?.done) count++;
  return count;
});

function toggleMissions() {
  showMissionMenu.value = !showMissionMenu.value;
  game()?.click?.();
}

function launchMission(id) {
  showMissionMenu.value = false;
  game()?.setMode('misi', { mission: id });
}

function closeMissionMenu() {
  showMissionMenu.value = false;
}
onBeforeUnmount(closeMissionMenu);
</script>
<template>
  <header class="tb" :class="{ off: store.hudOff && store.mode === 'jelajah' }">
    <div class="l">
      <span v-if="store.mode === 'jelajah'" class="brand"><UiIcon name="logo" :size="26" /><b>AstroSphere</b></span>
      <template v-else>
        <button class="btn sm back" @click="game()?.back()"><UiIcon name="kembali" :size="18" />{{ backLabel }}</button>
        <span v-if="store.mode !== 'planet' && store.mode !== 'fenomena' && store.mode !== 'sejarah' && store.mode !== 'hanggar'" class="tag">{{ LABEL[store.mode] }}</span>
      </template>
    </div>
    <div class="r">
      <!-- TOMBOL CEPAT MISI SEJARAH (APOLLO 13 & MCO) -->
      <div v-if="store.mode === 'jelajah'" class="mission-wrapper">
        <button
          type="button"
          class="btn sm mission-top-btn"
          aria-haspopup="true"
          :aria-expanded="showMissionMenu"
          title="Buka Misi Kisah Nyata (Apollo 13 & MCO)"
          @click="toggleMissions"
        >
          <UiIcon name="kilat" :size="16" />
          <span>Misi</span>
          <span v-if="missionsCompleted" class="badge-mini" title="Misi telah diselesaikan">{{ missionsCompleted }}/2</span>
        </button>

        <!-- POPOVER PILIHAN MISI CEPAT -->
        <div v-if="showMissionMenu" class="mission-popover card">
          <div class="pop-header">
            <b>Misi Kisah Nyata</b>
            <button class="ib sm" aria-label="Tutup" @click="closeMissionMenu"><UiIcon name="tutup" :size="14" /></button>
          </div>
          <div class="pop-list">
            <button type="button" class="pop-item apollo" @click="launchMission('apollo13')">
              <span class="p-ic"><UiIcon name="kilat" :size="18" /></span>
              <div class="p-txt">
                <small>Kisah Nyata · 1970</small>
                <b>Apollo 13</b>
                <span class="p-sub">Penyelamatan darurat di Bulan</span>
              </div>
              <span v-if="store.progress.missions?.apollo13?.stars" class="p-star">
                <UiIcon name="bintang" :size="12" />{{ store.progress.missions.apollo13.stars }}/3
              </span>
            </button>

            <button type="button" class="pop-item mco" @click="launchMission('mco')">
              <span class="p-ic mco-ic"><UiIcon name="info" :size="18" /></span>
              <div class="p-txt">
                <small>Investigasi · 1999</small>
                <b>Mars Climate Orbiter</b>
                <span class="p-sub">Misteri salah satuan di Mars</span>
              </div>
              <span v-if="store.progress.missions?.mco?.stars" class="p-star">
                <UiIcon name="bintang" :size="12" />{{ store.progress.missions.mco.stars }}/3
              </span>
            </button>
          </div>
        </div>
      </div>

      <button v-if="store.mode === 'jelajah'" class="ib" aria-label="Profil pemain" title="Profil" @click="game()?.setMode('profil')"><UiIcon name="pengguna" /></button>
      <button class="ib menu" :aria-label="unread ? `Menu — ${unread} kartu baru di Jurnal` : 'Menu'" title="Menu (Esc)" @click="game()?.pause()"><UiIcon name="menu" /><span v-if="unread" class="badge" aria-hidden="true">{{ unread }}</span></button>
    </div>
  </header>
</template>
<style scoped>
.tb{position:fixed;left:0;right:0;top:0;z-index:30;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;pointer-events:none;
  padding:calc(var(--top) + var(--safe-t)) calc(var(--gap) + var(--safe-r)) 0 calc(var(--gap) + var(--safe-l));transition:opacity .3s}
.tb>*{pointer-events:auto}
.tb.off{opacity:0}.tb.off>*{pointer-events:none}
.l,.r{display:flex;align-items:center;gap:10px}
.l{height:36px}
.l .tag{
  height:36px;
  min-height:36px;
  padding:0 12px;
  display:inline-flex;
  align-items:center;
  border-radius:8px !important;
  font-family:var(--display);
  font-size:11px;
  font-weight:500;
  letter-spacing:.03em;
  background:rgba(148, 174, 255, 0.1);
  border:1px solid rgba(148, 174, 255, 0.18);
  color:#38bdf8;
  backdrop-filter:blur(6px);
}
.brand{display:flex;align-items:center;gap:9px;font-family:var(--display);font-size:20px;text-shadow:0 2px 10px rgba(0,0,0,.6)}
.brand b{font-weight:500}
.back{
  height:36px;
  min-height:36px;
  max-height:36px;
  padding:0 14px;
  display:inline-flex;
  align-items:center;
  gap:7px;
  font-family:var(--display);
  font-size:13px;
  font-weight:500;
  border-radius:10px !important;
  background:rgba(11,16,36,.78);
  border:1px solid rgba(148,174,255,.18);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  color:var(--text);
  box-shadow:0 4px 16px rgba(0,0,0,.35);
  transition:all .15s ease;
}
.back:hover{
  background:rgba(22,33,70,.88);
  border-color:rgba(148,174,255,.35);
  color:#fff;
}
.menu{position:relative}
.badge{position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;display:grid;place-items:center;background:var(--star);color:#3a2a00;font-family:var(--display);font-weight:600;font-size:10.5px;line-height:1;box-shadow:0 0 0 2px rgba(6,10,26,.85)}

/* TOMBOL CEPAT & POPOVER MISI */
.mission-wrapper{position:relative}
.mission-top-btn{display:inline-flex;align-items:center;gap:6px;height:40px;min-height:40px;background:rgba(11,16,36,.78);border:1px solid rgba(148,174,255,.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:var(--text);font-weight:500;padding:0 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.35);transition:all .15s ease}
.mission-top-btn:hover{background:rgba(22,33,70,.88);border-color:rgba(148,174,255,.35);color:#fff}
.badge-mini{background:rgba(234,179,8,.2);border:1px solid rgba(234,179,8,.4);color:var(--star);font-size:10.5px;font-weight:600;padding:1px 6px;border-radius:6px}

.r .ib{
  width:40px;
  height:40px;
  min-height:40px;
  border-radius:10px;
  background:rgba(11,16,36,.78);
  border:1px solid rgba(148,174,255,.18);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  color:var(--text);
  box-shadow:0 4px 16px rgba(0,0,0,.35);
  transition:all .15s ease;
}
.r .ib:hover{
  background:rgba(22,33,70,.88);
  border-color:rgba(148,174,255,.35);
  color:#fff;
}
.mission-popover{position:absolute;top:calc(100% + 8px);right:0;width:300px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:0 12px 30px rgba(0,0,0,.6);padding:12px;display:flex;flex-direction:column;gap:10px;z-index:40}
.pop-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:6px}
.pop-header b{font-family:var(--display);font-size:14px;color:var(--text)}
.pop-list{display:flex;flex-direction:column;gap:8px}
.pop-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);text-align:left;transition:background .15s,transform .1s;cursor:pointer}
.pop-item:hover{background:var(--surface-3);transform:translateX(-2px)}
.pop-item .p-ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.18);color:var(--sky);flex:none}
.pop-item .p-ic.mco-ic{background:rgba(59,130,246,.18);color:var(--sky)}
.pop-item .p-txt{display:flex;flex-direction:column;min-width:0;flex:1}
.pop-item small{font-size:10.5px;color:var(--faint)}
.pop-item b{font-family:var(--display);font-size:13.5px;color:var(--text);line-height:1.2}
.pop-item .p-sub{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pop-item .p-star{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;color:var(--star);font-weight:500}

@media (max-width:760px){ .brand b{display:none} .tag{display:none} .mission-top-btn span{display:none} }
</style>
