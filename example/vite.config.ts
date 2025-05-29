import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 使用相对路径导入插件避免类型冲突
const viteMultiPage = require("../src/index").default;

export default defineConfig({
  plugins: [
    vue(),
    viteMultiPage({
      entry: "src/pages/**/*.{ts,js}",
      template: "index.html",
      exclude: ["src/main.ts", "src/vite-env.d.ts"],
      placeholder: "{{ENTRY_FILE}}",
      debug: true,

      // 简化配置避免类型问题
      pageConfigs: (context) => {
        const { pageName, relativePath } = context;

        console.log(`配置页面: ${pageName} (${relativePath})`);

        // Vue 移动端页面（特殊处理）
        if (pageName === 'vue-app' || relativePath.includes('vue-app')) {
          return {
            template: 'mobile.html'
          };
        }

        // 移动端页面
        if (pageName.includes('mobile') || relativePath.includes('/mobile/')) {
          return {
            template: 'mobile.html'
          };
        }

        // 管理后台页面
        if (pageName.startsWith('admin') || relativePath.includes('/admin/')) {
          return {
            template: 'admin.html'
          };
        }

        // 默认配置
        return {};
      }
    }),
  ],
});
