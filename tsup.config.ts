import { defineConfig } from 'tsup';

export default defineConfig([
  // 主库配置
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node16',
    shims: true,
    external: ['vite', 'glob'],
    splitting: false,
    esbuildOptions(options) {
      options.legalComments = 'none';
    },
    onSuccess: async () => {
      // 修复 CommonJS 导出
      const fs = await import('fs');
      const path = await import('path');

      const cjsFile = path.resolve('dist/index.js');
      let content = fs.readFileSync(cjsFile, 'utf-8');

      // 查找并替换 module.exports 设置
      if (content.includes('module.exports = __toCommonJS(src_exports);')) {
        // 在文件末尾添加正确的导出
        content = content.replace(
          /var src_default = viteMultiPage;[\s\S]*?$/,
          `var src_default = viteMultiPage;

// 修复 CommonJS 导出 - 确保默认导出是函数
module.exports = src_default;
module.exports.default = src_default;
module.exports.viteMultiPage = viteMultiPage;
module.exports.defineConfig = defineConfig;
module.exports.defineConfigTransform = defineConfigTransform;
module.exports.generateBuildConfig = generateBuildConfig;
module.exports.getAvailableStrategies = getAvailableStrategies;`
        );
        fs.writeFileSync(cjsFile, content);
      }

      // 删除 .d.mts 文件以避免 Node.js 兼容性问题
      const mtsFile = path.resolve('dist/index.d.mts');
      if (fs.existsSync(mtsFile)) {
        fs.unlinkSync(mtsFile);
        console.log('已删除 index.d.mts 文件以避免兼容性问题');
      }
    },
  },
  // CLI配置
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    target: 'node16',
    shims: true,
    external: ['vite', 'glob'],
    cjsInterop: true,
    esbuildOptions(options) {
      options.legalComments = 'none';
      options.banner = {
        js: '#!/usr/bin/env node',
      };
    },
  },
]);
