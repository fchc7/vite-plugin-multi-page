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

      // 确保有正确的 module.exports
      if (
        !content.includes('module.exports = ') &&
        content.includes('var src_default = viteMultiPage;')
      ) {
        content = content.replace(
          /0 && \(module\.exports = \{[\s\S]*?\}\);/,
          `module.exports = src_default;
module.exports.default = src_default;
module.exports.viteMultiPage = viteMultiPage;
module.exports.defineConfig = defineConfig;
module.exports.defineConfigTransform = defineConfigTransform;
module.exports.generateBuildConfig = generateBuildConfig;
module.exports.getAvailableStrategies = getAvailableStrategies;`
        );
        fs.writeFileSync(cjsFile, content);
        console.log('✅ 修复了 CommonJS 导出');
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
