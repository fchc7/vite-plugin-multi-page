<template>
  <div>
    <button @click="count++">+</button>
    <div class="count">
      {{ count }}
    </div>
    <button @click="count--">-</button>
    <img :src="icon" alt="icon" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import icon from '../../button-loading.svg';

const count = ref(0);
</script>

<style scoped>
.count {
  font-size: 20px;
  font-weight: bold;
}
</style>
