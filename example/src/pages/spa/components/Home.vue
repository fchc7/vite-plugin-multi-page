<template>
  <div class="home">
    <h1>欢迎来到首页</h1>
    <p>这是一个使用懒加载的SPA应用示例</p>

    <div class="feature-cards">
      <div class="card">
        <h3>懒加载路由</h3>
        <p>每个页面都是独立的代码块，按需加载</p>
      </div>
      <div class="card">
        <h3>代码分割</h3>
        <p>Vite会自动将懒加载的组件分割成单独的文件</p>
      </div>
      <div class="card">
        <h3>性能优化</h3>
        <p>减少初始包大小，提升加载速度</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 首页逻辑
console.log('Home组件已加载');
</script>

<style scoped>
.home {
  text-align: center;
}

h1 {
  color: #42b883;
  margin-bottom: 1rem;
}

.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.card {
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card h3 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.card p {
  color: #666;
  line-height: 1.6;
}
</style>
