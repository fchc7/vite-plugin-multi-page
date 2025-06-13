<template>
  <div class="about">
    <h1>关于我们</h1>
    <div class="content">
      <p>这是关于页面，展示懒加载的工作原理。</p>

      <div class="info-section">
        <h2>技术栈</h2>
        <ul>
          <li>Vue 3</li>
          <li>Vue Router</li>
          <li>Vite</li>
          <li>TypeScript</li>
        </ul>
      </div>

      <div class="info-section">
        <h2>懒加载优势</h2>
        <ol>
          <li>减少初始包大小</li>
          <li>提升首屏加载速度</li>
          <li>按需加载资源</li>
          <li>更好的用户体验</li>
        </ol>
      </div>

      <!-- 动态导入一个较大的库来测试代码分割 -->
      <button @click="loadHeavyLibrary" class="load-btn">
        {{ libraryLoaded ? '库已加载' : '加载重型库' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

console.log('About组件已加载');

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
.about {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 2rem;
}

.content {
  line-height: 1.6;
}

.info-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.info-section h2 {
  color: #42b883;
  margin-bottom: 1rem;
}

ul,
ol {
  margin-left: 1.5rem;
}

li {
  margin: 0.5rem 0;
}

.load-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.load-btn:hover {
  background: #369870;
}

.load-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
