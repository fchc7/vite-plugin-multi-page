<template>
    <div>
        <button @click="count++">+</button>
        <div class="count">   
            {{ count }}
        </div>
        <button @click="count--">-</button>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<style scoped>
.count {
    font-size: 20px;
    font-weight: bold;
}
</style>