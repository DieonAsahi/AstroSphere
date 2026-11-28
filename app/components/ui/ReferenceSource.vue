<script setup>
import { computed } from 'vue';
import { parseReferenceItems } from '~/utils/mediaSecurity.js';

const props = defineProps({
  source: {
    type: String,
    default: '',
  },
  fallback: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  box: {
    type: Boolean,
    default: false,
  },
  inline: {
    type: Boolean,
    default: false,
  },
  itemIndex: {
    type: [Number, String],
    default: null,
  },
});

const items = computed(() => {
  const text = (props.source || props.fallback || '').trim();
  const all = parseReferenceItems(text);
  if (!all.length) return [];
  if (props.itemIndex === null || props.itemIndex === undefined || props.itemIndex === '') {
    return all;
  }
  const idx = Number(props.itemIndex);
  if (!Number.isNaN(idx)) {
    if (all[idx]) {
      return [all[idx]];
    }
    return all[0] ? [all[0]] : [];
  }
  return all;
});
</script>

<template>
  <div
    v-if="items.length"
    class="ref-source-container"
    :class="{
      'as-box': box,
      'as-inline': inline,
      'has-multi': items.length > 1,
    }"
    @click.stop
  >
    <span v-if="label" class="ref-source-label">{{ label }}</span>
    <div class="ref-source-list" :class="{ 'is-column': !inline }">
      <div v-for="(item, idx) in items" :key="idx" class="ref-source-entry">
        <template v-for="(seg, sIdx) in item.segments" :key="sIdx">
          <a
            v-if="seg.type === 'link'"
            :href="seg.url"
            target="_blank"
            rel="noopener noreferrer"
            class="ref-source-link"
            @click.stop
          >{{ seg.text }}</a>
          <span v-else class="ref-source-text">{{ seg.text }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ref-source-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  font-size: 11.5px;
  pointer-events: auto;
  line-height: 1.45;
}

.ref-source-container.as-inline {
  display: inline-flex;
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.ref-source-container.as-box {
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.55);
  border-radius: 10px;
  border: 1px solid rgba(148, 174, 255, 0.14);
  border-left: 3px solid #3b82f6;
}

.ref-source-label {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.ref-source-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.ref-source-entry {
  display: block;
  min-width: 0;
  max-width: 100%;
  font-size: inherit;
  color: #94a3b8;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ref-source-link {
  color: #60a5fa;
  text-decoration: underline;
  text-underline-offset: 2px;
  font-weight: 500;
  pointer-events: auto;
  cursor: pointer;
  overflow-wrap: anywhere;
  word-break: break-word;
  transition: color 0.15s ease;
}

.ref-source-link:hover {
  color: #93c5fd;
  text-decoration: underline;
}

.ref-source-text {
  color: inherit;
}

/* Mobile Landscape & Layar Kompak */
@media (max-height: 520px) and (orientation: landscape) {
  .ref-source-container {
    gap: 2px;
  }
  .ref-source-container.as-box {
    padding: 8px 10px;
  }
  .ref-source-label {
    font-size: 9.5px;
  }
  .ref-source-list {
    gap: 4px;
  }
  .ref-source-entry {
    font-size: 11px;
    line-height: 1.4;
  }
}
</style>
