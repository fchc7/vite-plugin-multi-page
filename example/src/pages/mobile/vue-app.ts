import { createApp } from 'vue';
import MobileApp from './MobileApp.vue';
import './mobile.css';

// 设置根字体大小用于 rem 适配
function setRemBase() {
    const docEl = document.documentElement;
    const clientWidth = docEl.clientWidth;
    if (!clientWidth) return;

    // 基于 375px 设计稿，设置根字体大小
    docEl.style.fontSize = (clientWidth / 375) * 37.5 + 'px';
}

// 页面加载时设置
setRemBase();

// 窗口大小改变时重新设置
window.addEventListener('resize', setRemBase);
window.addEventListener('orientationchange', () => {
    setTimeout(setRemBase, 100);
});

// 创建 Vue 应用
const app = createApp(MobileApp);

// 挂载应用
app.mount('#app');

console.log('📱 Vue 移动端应用已启动');
console.log('当前构建类型:', process.env.BUILD_TYPE || 'default'); 