<template>
  <div>
    <button @click="count++">+</button>
    <div class="count">
      {{ count }}
    </div>
    <button @click="count--">-</button>
    <img :src="icon" alt="icon" />
    <img :src="logo" alt="logo" />

    <!-- 动态导入一个较大的库来测试代码分割 -->
    <button @click="loadHeavyLibrary" class="load-btn">
      {{ libraryLoaded ? '库已加载' : '加载重型库' }}
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import icon from '../../button-loading.svg';
import logo from '/images/logo.png';

const count = ref(0);

const libraryLoaded = ref(false);

const loadHeavyLibrary = async () => {
  try {
    // 动态导入一个库（这里用lodash作为示例）
    const { default: _ } = (await import('lodash-es')) as any;
    console.log('Lodash库已加载:', _.version);
    libraryLoaded.value = true;
  } catch (error) {
    console.log('库加载失败，但这是正常的（因为可能没有安装lodash-es）');
    libraryLoaded.value = true;
  }
};
</script>

<style scoped>
.count {
  font-size: 20px;
  font-weight: bold;
}
</style>
