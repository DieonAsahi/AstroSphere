<script setup>
// "Tebak dulu": pertanyaan → tebakan → amati simulasi → hasil + penjelasan.
// Dipakai di mode Planet (fenomena tiap planet) dan di lab gerhana. Tombol 1–3 juga bisa dipakai untuk memilih.
import { onMounted, onBeforeUnmount } from 'vue';
import { store } from '~/composables/useGame.js';
import { PREDICT_REWARD } from '~/data/learning.js';
const props = defineProps({
  q: { type: Object, required: true },          // { q, opts, a }
  picked: { type: Number, default: null },
  revealed: { type: Boolean, default: false },
  ok: { type: Boolean, default: false },
  reward: { type: Number, default: 0 },
  why: { type: String, default: '' },
  wait: { type: String, default: 'Perhatikan simulasinya…' },
  progress: { type: Number, default: null },     // 0..1 menuju jawaban (opsional)
});
const emit = defineEmits(['pick']);
const LT = ['A', 'B', 'C', 'D'];
function onKey(e) {
  if (props.picked != null || store.modal || e.repeat || /INPUT|TEXTAREA/.test(e.target?.tagName || '')) return;
  const k = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
  if (k >= 0 && k < props.q.opts.length) emit('pick', k);
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="pc" :class="{ done: revealed, ok: revealed && ok, no: revealed && !ok }">
    <template v-if="picked == null">
      <span class="tag star"><UiIcon name="kuis" :size="14" />Tebak dulu</span>
      <h2 class="h2 q">{{ q.q }}</h2>
      <div class="opts" role="group" :aria-label="q.q">
        <button v-for="(o, i) in q.opts" :key="i" class="opt" @click="emit('pick', i)"><span class="lt">{{ LT[i] }}</span><span>{{ o }}</span></button>
      </div>
      <p class="hint"><UiIcon name="bintang" :size="14" />Tebakan benar +{{ q?.points || PREDICT_REWARD }} bintang</p>
    </template>
    <template v-else>
      <div class="mine"><small>Tebakanmu</small><b>{{ q.opts[picked] }}</b></div>
      <div v-if="!revealed" class="watch" aria-live="polite">
        <span class="pulse" aria-hidden="true" /><span>{{ wait }}</span>
        <div v-if="progress != null" class="bar"><i :style="{ width: Math.min(100, progress * 100) + '%' }" /></div>
      </div>
      <div v-else class="res" aria-live="polite">
        <b class="rt"><UiIcon :name="ok ? 'cek' : 'info'" :size="20" />{{ ok ? 'Tebakanmu benar!' : 'Belum tepat' }}<span v-if="reward" class="rw"><UiIcon name="bintang" :size="14" />+{{ reward }}</span></b>
        <p v-if="!ok" class="ans">Jawabannya: <b>{{ q.opts[q.a] }}</b></p>
        <p class="why">{{ why }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pc{display:flex;flex-direction:column;gap:12px;flex-shrink:0}
.pc .tag{
  align-self:flex-start;
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:4px 10px;
  border-radius:8px !important;
  font-family:var(--display);
  font-size:11px;
  font-weight:600;
  letter-spacing:.04em;
  background:rgba(245, 158, 11, 0.16);
  border:1px solid rgba(245, 158, 11, 0.35);
  color:#fbbf24;
}
.q{
  font-family:var(--display);
  font-size:clamp(18px, 1.8vw, 21px);
  font-weight:600;
  line-height:1.3;
  color:#f8fafc;
  margin:0;
}
.opts{display:flex;flex-direction:column;gap:8px}
.opt{
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px 14px;
  min-height:52px;
  border-radius:10px !important;
  background:rgba(15, 23, 42, 0.65);
  border:1px solid rgba(148, 174, 255, 0.16);
  text-align:left;
  font-size:14px;
  font-weight:500;
  color:#f1f5f9;
  cursor:pointer;
  transition:all .15s ease;
}
.opt:hover{
  background:rgba(15, 23, 42, 0.9);
  border-color:rgba(148, 174, 255, 0.35);
  transform:translateY(-1px);
}
.opt:active{transform:scale(.99)}
.opt .lt{
  flex:none;
  width:32px;
  height:32px;
  border-radius:8px !important;
  display:grid;
  place-items:center;
  background:rgba(148, 174, 255, 0.1);
  border:1px solid rgba(148, 174, 255, 0.18);
  font-family:var(--display);
  font-weight:600;
  font-size:13.5px;
  color:#38bdf8;
}
.hint{display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8}
.hint :deep(svg){color:#fbbf24}
.mine{
  display:flex;
  flex-direction:column;
  gap:3px;
  padding:12px 14px;
  border-radius:10px !important;
  background:rgba(15, 23, 42, 0.65);
  border:1px solid rgba(148, 174, 255, 0.16);
  border-left:4px solid #38bdf8 !important;
}
.mine small{font-size:11.5px;color:#94a3b8}
.mine b{font-family:var(--display);font-weight:600;font-size:15px;color:#f8fafc}
.ok .mine{border-left-color:#34d399 !important}
.no .mine{border-left-color:#f87171 !important}
.watch{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:13.5px;color:#94a3b8}
.pulse{width:10px;height:10px;border-radius:50%;background:#38bdf8;animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{transform:scale(.55);opacity:.5}}
.watch .bar{flex-basis:100%;height:6px;border-radius:3px;background:rgba(148, 174, 255, 0.12);overflow:hidden}
.watch .bar i{display:block;height:100%;background:#38bdf8;transition:width .2s}
.res{
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:14px;
  border-radius:10px !important;
  background:rgba(239, 68, 68, 0.12);
  border:1px solid rgba(239, 68, 68, 0.25);
  animation:rise .35s ease both;
}
.ok .res{
  background:rgba(16, 185, 129, 0.12);
  border-color:rgba(16, 185, 129, 0.28);
}
@keyframes rise{from{transform:translateY(8px);opacity:0}}
.rt{display:flex;align-items:center;gap:8px;font-family:var(--display);font-weight:600;font-size:16px;color:#f87171}
.ok .rt{color:#34d399}
.rw{
  margin-left:auto;
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:3px 9px;
  border-radius:6px !important;
  background:rgba(245, 158, 11, 0.16);
  border:1px solid rgba(245, 158, 11, 0.3);
  color:#fbbf24;
  font-size:12px;
  font-weight:600;
}
.ans{font-size:13.5px;color:#cbd5e1;margin:0}.ans b{color:#fff;font-weight:600}
.why{font-size:13.5px;color:#94a3b8;line-height:1.55;margin:0}
@media (prefers-reduced-motion:reduce){ .pulse,.res{animation:none} }
</style>
