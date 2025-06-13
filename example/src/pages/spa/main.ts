import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import './style.css';
import App from './App.vue';

// 懒加载路由组件
const Home = () => import('./components/Home.vue');
const About = () => import('./components/About.vue');
const Contact = () => import('./components/Contact.vue');
const LazyComponent = () => import('./components/LazyComponent.vue');

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/contact', component: Contact },
  { path: '/lazy', component: LazyComponent },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
