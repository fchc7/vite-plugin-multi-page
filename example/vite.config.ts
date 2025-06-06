import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// 使用构建后的版本
import plugin from '../dist/index.mjs';

// 使用包装后的defineConfig以支持命令行参数
export default defineConfig({
  plugins: [
    vue(),
    // 插件现在会自动加载 multipage.config.ts 配置文件
    plugin(),
  ],
  resolve: {
    dedupe: ['vue'],
  },
});
