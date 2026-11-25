<script setup>
import { onMounted } from 'vue';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';

const { loadAll } = useSupabaseContent();

onMounted(() => {
  loadAll();
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
