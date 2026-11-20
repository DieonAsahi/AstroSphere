<script setup>
const model = defineModel({ type: Boolean, default: false });
defineProps({ label: String, sub: String });
</script>
<template>
  <div class="trow">
    <span>{{ label }}<small v-if="sub">{{ sub }}</small></span>
    <button class="tog" :class="{ on: model }" role="switch" :aria-checked="model" :aria-label="label" @click="model = !model" />
  </div>
</template>
