import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const viteMultiPage = require('../src/index').default;

export default defineConfig({
  // 测试define配置是否生效
  define: {
    __TEST_VAR__: JSON.stringify('这是一个测试变量'),
  },
  plugins: [
    vue(),
    viteMultiPage({
      entry: 'src/pages/**/*.{ts,js}',
      template: 'index.html',
      exclude: ['src/main.ts', 'src/vite-env.d.ts'],
      placeholder: '{{ENTRY_FILE}}',
      debug: true,

      configStrategies: {
        mobile: {
          // 环境变量，在开发和构建模式都会生效
          define: {
            __MODE__: JSON.stringify('mobile'),
            __THEME__: JSON.stringify('green'),
            __VERSION__: JSON.stringify('1.0.0'),
          },
          // 移动端CSS配置 - 使用更小的rootValue适合移动设备
          css: {
            // 避免直接设置postcss配置，而是使用一个预处理器选项
            preprocessorOptions: {
              scss: {
                additionalData: 'body { --mobile-root-value: 37.5px; }',
              },
            },
            devSourcemap: true,
          },
        },
        home: {
          // 管理端环境变量
          define: {
            __MODE__: JSON.stringify('admin'),
            __THEME__: JSON.stringify('blue'),
            __VERSION__: JSON.stringify('1.0.0'),
          },
          // PC端CSS配置
          css: {
            // 避免直接设置postcss配置，而是使用一个预处理器选项
            preprocessorOptions: {
              scss: {
                additionalData: 'body { --pc-root-value: 75px; }',
              },
            },
            devSourcemap: true,
          },
        },
      },

      // 简化配置避免类型问题
      pageConfigs: context => {
        const { pageName, relativePath } = context;

        console.log(`配置页面: ${pageName} (${relativePath})`);

        // 移动端页面
        if (pageName.includes('mobile') || relativePath.includes('/mobile/')) {
          return {
            template: 'mobile.html',
            strategy: 'mobile',
          };
        }

        // 首页 - 修复匹配条件，确保正确匹配
        if (pageName === 'home' || pageName === 'test-env') {
          return {
            strategy: 'home',
          };
        }

        // 默认配置
        return {};
      },
    }),
  ],
});
