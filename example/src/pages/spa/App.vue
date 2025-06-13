<script setup lang="ts">
// 移除不需要的导入
</script>

<template>
  <div id="app">
    <header>
      <nav>
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link to="/about" class="nav-link">关于</router-link>
        <router-link to="/contact" class="nav-link">联系</router-link>
        <router-link to="/lazy" class="nav-link">懒加载组件</router-link>
      </nav>
    </header>

    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
header {
  background: #f0f0f0;
  padding: 1rem;
  margin-bottom: 2rem;
}

nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: #2c3e50;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: #e0e0e0;
}

.nav-link.router-link-active {
  background-color: #42b883;
  color: white;
}

main {
  padding: 0 2rem;
}
</style>
