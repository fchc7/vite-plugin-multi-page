<template>
  <div class="mobile-container">
    <header class="mobile-header">
      <h1>📱 Vue 移动端应用</h1>
      <p>Vue3 + PostCSS rem 适配演示</p>
    </header>

    <main class="mobile-main">
      <!-- 设备信息section -->
      <section class="demo-section mobile-fade-in">
        <h2>📊 设备信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>屏幕宽度:</label>
            <span>{{ deviceInfo.screenWidth }}px</span>
          </div>
          <div class="info-item">
            <label>根字体:</label>
            <span>{{ deviceInfo.fontSize }}px</span>
          </div>
          <div class="info-item">
            <label>像素比:</label>
            <span>{{ deviceInfo.pixelRatio }}</span>
          </div>
          <div class="info-item">
            <label>用户代理:</label>
            <span class="user-agent">{{ deviceInfo.userAgent }}</span>
          </div>
          <div class="info-item">
            <label>Vue 版本:</label>
            <span>{{ vueVersion }}</span>
          </div>
        </div>
      </section>

      <!-- Vue 交互演示 section -->
      <section class="demo-section mobile-fade-in">
        <h2>🎛️ Vue 交互演示</h2>
        <div class="controls">
          <!-- 计数器 -->
          <button
            @click="incrementCount"
            class="mobile-btn mobile-btn-primary"
            :class="{ 'mobile-bounce': isAnimating }"
          >
            点击次数: {{ count }}
          </button>

          <!-- 输入框 -->
          <input
            v-model="inputText"
            type="text"
            class="mobile-input"
            placeholder="输入一些文字..."
            @focus="onInputFocus"
            @blur="onInputBlur"
          />

          <!-- 输入显示 -->
          <div class="input-display" :style="inputDisplayStyle">
            {{ displayText }}
          </div>

          <!-- 切换主题 -->
          <button @click="toggleTheme" class="mobile-btn mobile-btn-secondary">
            {{ isDarkTheme ? '🌙 深色主题' : '☀️ 浅色主题' }}
          </button>
        </div>
      </section>

      <!-- Vue 响应式演示 -->
      <section class="demo-section mobile-fade-in">
        <h2>⚡ Vue 响应式演示</h2>
        <div class="responsive-demo">
          <!-- 实时时间 -->
          <div class="time-display">
            <p>当前时间: {{ currentTime }}</p>
          </div>

          <!-- 数据绑定演示 -->
          <div class="data-binding">
            <input v-model="sliderValue" type="range" min="0" max="100" class="slider" />
            <p>滑块值: {{ sliderValue }}%</p>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: sliderValue + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- rem 演示 section -->
      <section class="demo-section mobile-fade-in">
        <h2>📐 PostCSS rem 演示</h2>
        <div class="rem-demo">
          <div class="box small" :style="boxStyle.small" @click="animateBox('small')">
            小盒子<br />75px → 2rem
          </div>
          <div class="box medium" :style="boxStyle.medium" @click="animateBox('medium')">
            中盒子<br />112px → 3rem
          </div>
          <div class="box large" :style="boxStyle.large" @click="animateBox('large')">
            大盒子<br />150px → 4rem
          </div>
        </div>
        <p class="rem-tip">点击盒子看动画效果！所有尺寸都会自动适配屏幕</p>
      </section>
    </main>

    <footer class="mobile-footer">
      <p>© 2024 Vue 移动端多页面应用演示</p>
      <p>构建时间: {{ buildTime }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { version } from 'vue';

// 响应式数据
const count = ref(0);
const inputText = ref('');
const currentTime = ref('');
const sliderValue = ref(50);
const isDarkTheme = ref(false);
const isAnimating = ref(false);
const isInputFocused = ref(false);

// 设备信息
const deviceInfo = reactive({
  screenWidth: window.innerWidth,
  fontSize: '37.5',
  pixelRatio: window.devicePixelRatio || 1,
  userAgent: navigator.userAgent.includes('Mobile') ? '移动设备' : '桌面设备',
});

// 盒子动画状态
const boxAnimations = reactive({
  small: false,
  medium: false,
  large: false,
});

// 计算属性
const vueVersion = computed(() => version);

const displayText = computed(() => {
  return inputText.value.trim() || '输入内容将显示在这里';
});

const inputDisplayStyle = computed(() => ({
  color: inputText.value.trim() ? '#333' : '#999',
  borderColor: isInputFocused.value ? '#667eea' : 'transparent',
  transform: isInputFocused.value ? 'scale(1.02)' : 'scale(1)',
}));

const buildTime = computed(() => {
  return new Date().toLocaleString('zh-CN');
});

const boxStyle = computed(() => ({
  small: {
    transform: boxAnimations.small ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
    background: boxAnimations.small ? '#ff8a8a' : '#ff6b6b',
  },
  medium: {
    transform: boxAnimations.medium ? 'scale(1.1) rotate(-5deg)' : 'scale(1)',
    background: boxAnimations.medium ? '#5eede4' : '#4ecdc4',
  },
  large: {
    transform: boxAnimations.large ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
    background: boxAnimations.large ? '#60c5f1' : '#45b7d1',
  },
}));

// 方法
function incrementCount() {
  count.value++;

  // 添加动画效果
  isAnimating.value = true;
  setTimeout(() => {
    isAnimating.value = false;
  }, 600);
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value;
  document.body.classList.toggle('dark-theme', isDarkTheme.value);
}

function onInputFocus() {
  isInputFocused.value = true;
}

function onInputBlur() {
  isInputFocused.value = false;
}

function animateBox(boxType: 'small' | 'medium' | 'large') {
  boxAnimations[boxType] = true;
  setTimeout(() => {
    boxAnimations[boxType] = false;
  }, 300);
}

function updateDeviceInfo() {
  deviceInfo.screenWidth = window.innerWidth;
  deviceInfo.fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize).toFixed(1);
}

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('zh-CN');
}

// 生命周期
let timeInterval: ReturnType<typeof setInterval>;
let resizeHandler: () => void;

onMounted(() => {
  // 更新设备信息
  updateDeviceInfo();

  // 启动时钟
  updateTime();
  timeInterval = setInterval(updateTime, 1000);

  // 监听窗口大小变化
  resizeHandler = () => {
    updateDeviceInfo();
  };
  window.addEventListener('resize', resizeHandler);

  console.log('📱 Vue 移动端组件已挂载');
});

onUnmounted(() => {
  // 清理定时器和事件监听器
  if (timeInterval) {
    clearInterval(timeInterval);
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }

  console.log('📱 Vue 移动端组件已卸载');
});
</script>

<style scoped>
/* Vue 组件专用样式 */
.responsive-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.time-display {
  text-align: center;
  font-size: 16px;
  color: #667eea;
  font-weight: 500;
}

.data-binding {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.rem-tip {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-top: 16px;
  font-style: italic;
}

.box {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.box:active {
  transform: translateY(0);
}

/* 深色主题 */
:global(.dark-theme) .demo-section {
  background: #2d3748;
  color: white;
}

:global(.dark-theme) .info-item {
  background: #4a5568;
}

:global(.dark-theme) .mobile-input {
  background: #4a5568;
  color: white;
  border-color: #718096;
}

:global(.dark-theme) .input-display {
  background: #4a5568;
  color: #e2e8f0;
}
</style>
