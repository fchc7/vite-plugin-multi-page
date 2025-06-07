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
    external: [
      // 设置所有依赖为外部依赖
      'vite',
      'glob',
      'esbuild',
      'cac',
      // Node.js 内置模块
      'node:fs',
      'node:path',
      'node:url',
      'node:module',
      'node:child_process',
    ],
    noExternal: [], // 确保没有依赖被打包进来
    splitting: false,
    minify: true, // 添加压缩
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
module.exports.getAvailableStrategies = getAvailableStrategies;
module.exports.getViteOutputDirectory = getViteOutputDirectory;
module.exports.cleanViteOutputDirectory = cleanViteOutputDirectory;
module.exports.mergeWithDefaults = mergeWithDefaults;`
        );
        fs.writeFileSync(cjsFile, content);
      }

      // 删除 .d.mts 文件以避免 Node.js 兼容性问题
      const mtsFile = path.resolve('dist/index.d.mts');
      if (fs.existsSync(mtsFile)) {
        fs.unlinkSync(mtsFile);
      }
    },
  },
  // CLI配置
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    target: 'node16',
    shims: true,
    external: [
      // 设置所有依赖为外部依赖
      'vite',
      'glob',
      'esbuild',
      'cac',
      // Node.js 内置模块
      'node:fs',
      'node:path',
      'node:url',
      'node:module',
      'node:child_process',
    ],
    noExternal: [], // 确保没有依赖被打包进来
    minify: true, // 添加压缩
    cjsInterop: true,
    esbuildOptions(options) {
      options.legalComments = 'none';
      options.banner = {
        js: '#!/usr/bin/env node',
      };
    },
  },
]);
