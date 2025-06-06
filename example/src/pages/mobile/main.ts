import { createApp } from 'vue';
import App from './MobileApp.vue';
import './styles.css'; // 测试postcss-pxtorem

createApp(App).mount('#app');
console.log('这是移动版应用');
console.log('页面名称:', PAGE_NAME);
console.log('是否移动版:', IS_MOBILE);
console.log('是否默认版:', IS_TABLET);