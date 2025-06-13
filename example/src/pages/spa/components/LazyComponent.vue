<template>
  <div class="lazy-component">
    <h1>懒加载组件演示</h1>

    <div class="demo-section">
      <h2>动态组件加载</h2>
      <p>这个页面演示了多种懒加载技术：</p>

      <div class="buttons">
        <button @click="loadChart" class="demo-btn" :disabled="chartLoading">
          {{ chartLoaded ? '图表已加载' : chartLoading ? '加载中...' : '加载图表组件' }}
        </button>

        <button @click="loadTable" class="demo-btn" :disabled="tableLoading">
          {{ tableLoaded ? '表格已加载' : tableLoading ? '加载中...' : '加载表格组件' }}
        </button>

        <button @click="loadUtils" class="demo-btn" :disabled="utilsLoading">
          {{ utilsLoaded ? '工具已加载' : utilsLoading ? '加载中...' : '加载工具函数' }}
        </button>
      </div>

      <!-- 动态组件渲染区域 -->
      <div class="dynamic-content">
        <div v-if="chartLoaded" class="component-demo">
          <h3>📊 图表组件</h3>
          <div class="mock-chart">
            <div class="bar" style="height: 60%"></div>
            <div class="bar" style="height: 80%"></div>
            <div class="bar" style="height: 45%"></div>
            <div class="bar" style="height: 95%"></div>
            <div class="bar" style="height: 70%"></div>
          </div>
        </div>

        <div v-if="tableLoaded" class="component-demo">
          <h3>📋 数据表格</h3>
          <table class="demo-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in tableData" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="utilsLoaded" class="component-demo">
          <h3>🔧 工具函数演示</h3>
          <p>随机数: {{ randomNumber }}</p>
          <p>时间戳: {{ timestamp }}</p>
          <button @click="generateNew" class="small-btn">生成新数据</button>
        </div>
      </div>
    </div>

    <div class="performance-info">
      <h2>性能信息</h2>
      <div class="info-grid">
        <div class="info-card">
          <h4>代码分割</h4>
          <p>每个懒加载的组件/模块都会被打包成独立的chunk文件</p>
        </div>
        <div class="info-card">
          <h4>按需加载</h4>
          <p>只有当用户真正需要时，相关代码才会被下载和执行</p>
        </div>
        <div class="info-card">
          <h4>缓存优化</h4>
          <p>一旦加载过的模块会被浏览器缓存，不会重复下载</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

console.log('LazyComponent组件已加载');

// 加载状态
const chartLoading = ref(false);
const chartLoaded = ref(false);
const tableLoading = ref(false);
const tableLoaded = ref(false);
const utilsLoading = ref(false);
const utilsLoaded = ref(false);

// 数据
const tableData = reactive([
  { id: 1, name: '项目A', status: '进行中' },
  { id: 2, name: '项目B', status: '已完成' },
  { id: 3, name: '项目C', status: '待开始' },
]);

const randomNumber = ref(0);
const timestamp = ref('');

// 模拟加载图表组件
const loadChart = async () => {
  chartLoading.value = true;
  try {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('图表组件加载完成');
    chartLoaded.value = true;
  } finally {
    chartLoading.value = false;
  }
};

// 模拟加载表格组件
const loadTable = async () => {
  tableLoading.value = true;
  try {
    // 模拟异步加载和数据获取
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('表格组件加载完成');
    tableLoaded.value = true;
  } finally {
    tableLoading.value = false;
  }
};

// 模拟加载工具函数
const loadUtils = async () => {
  utilsLoading.value = true;
  try {
    // 模拟加载工具函数
    await new Promise(resolve => setTimeout(resolve, 600));
    console.log('工具函数加载完成');

    // 生成初始数据
    randomNumber.value = Math.floor(Math.random() * 1000);
    timestamp.value = new Date().toLocaleString();

    utilsLoaded.value = true;
  } finally {
    utilsLoading.value = false;
  }
};

const generateNew = () => {
  randomNumber.value = Math.floor(Math.random() * 1000);
  timestamp.value = new Date().toLocaleString();
};
</script>

<style scoped>
.lazy-component {
  max-width: 1000px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 2rem;
}

.demo-section {
  margin-bottom: 3rem;
}

.demo-section h2 {
  color: #42b883;
  margin-bottom: 1rem;
}

.buttons {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  flex-wrap: wrap;
}

.demo-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
  min-width: 150px;
}

.demo-btn:hover:not(:disabled) {
  background: #369870;
}

.demo-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.dynamic-content {
  margin: 2rem 0;
}

.component-demo {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.component-demo h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

/* 模拟图表样式 */
.mock-chart {
  display: flex;
  align-items: end;
  height: 150px;
  gap: 10px;
  margin: 1rem 0;
}

.bar {
  background: linear-gradient(to top, #42b883, #369870);
  width: 40px;
  border-radius: 4px 4px 0 0;
  animation: growUp 0.6s ease-out;
}

@keyframes growUp {
  from {
    height: 0 !important;
  }
}

/* 表格样式 */
.demo-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.demo-table th,
.demo-table td {
  border: 1px solid #ddd;
  padding: 0.75rem;
  text-align: left;
}

.demo-table th {
  background: #42b883;
  color: white;
}

.demo-table tr:nth-child(even) {
  background: #f2f2f2;
}

.small-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.small-btn:hover {
  background: #369870;
}

.performance-info h2 {
  color: #42b883;
  margin-bottom: 1.5rem;
  text-align: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.info-card h4 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.info-card p {
  color: #666;
  line-height: 1.6;
}
</style>
