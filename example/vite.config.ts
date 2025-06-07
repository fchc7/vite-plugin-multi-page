import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// 使用 ESM 版本避免类型兼容性问题
import { viteMultiPage } from '../dist/index.mjs';

// 使用包装后的defineConfig以支持命令行参数
export default defineConfig({
  plugins: [
    vue(),
    // 插件现在会自动加载 multipage.config.ts 配置文件
    // 使用类型断言解决不同 pnpm 安装的类型兼容性问题
    viteMultiPage() as any,
  ],
  resolve: {
    dedupe: ['vue'],
  },
});
