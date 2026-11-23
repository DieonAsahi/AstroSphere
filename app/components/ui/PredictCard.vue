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
      <p class="hint"><UiIcon name="bintang" :size="14" />Tebakan benar +{{ PREDICT_REWARD }} bintang</p>
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
.pc{display:flex;flex-direction:column;gap:12px}
.pc .tag{align-self:flex-start}
.q{font-size:clamp(19px,2vw,22px);line-height:1.3}
.opts{display:flex;flex-direction:column;gap:8px}
.opt{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:54px;border-radius:var(--r);background:var(--surface-2);border:2px solid transparent;text-align:left;font-size:15px;transition:background .15s,border-color .15s,transform .1s}
.opt:hover{background:var(--surface-3);border-color:var(--line-2)}
.opt:active{transform:scale(.98)}
.opt .lt{flex:none;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--surface-3);font-family:var(--display);font-weight: 500}
.hint{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--faint)}
.hint :deep(svg){color:var(--star)}
.mine{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:var(--r);background:var(--surface-2);border-left:4px solid var(--sky)}
.mine small{font-size:12.5px;color:var(--faint)}
.mine b{font-family:var(--display);font-weight: 500;font-size:16px}
.ok .mine{border-left-color:var(--green)}
.no .mine{border-left-color:var(--coral)}
.watch{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:14px;color:var(--muted)}
.pulse{width:10px;height:10px;border-radius:50%;background:var(--sky);animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{transform:scale(.55);opacity:.5}}
.watch .bar{flex-basis:100%;height:6px}
.res{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:var(--r);background:rgba(255,107,107,.1);animation:rise .35s ease both}
.ok .res{background:rgba(54,211,154,.1)}
@keyframes rise{from{transform:translateY(8px);opacity:0}}
.rt{display:flex;align-items:center;gap:8px;font-family:var(--display);font-weight: 500;font-size:18px;color:var(--coral)}
.ok .rt{color:var(--green)}
.rw{margin-left:auto;display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:rgba(255,201,71,.16);color:var(--star);font-size:14px}
.ans{font-size:14.5px;color:var(--muted)}.ans b{color:var(--text)}
.why{font-size:14.5px;color:var(--muted);line-height:1.6}
@media (prefers-reduced-motion:reduce){ .pulse,.res{animation:none} }
</style>
