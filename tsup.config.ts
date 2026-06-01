import { defineConfig } from 'tsup';

export default defineConfig([
  // 主库配置
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node20',
    shims: true,
    external: [
      'vite',
      'glob',
      'cac',
      'jiti',
      'node:fs',
      'node:path',
      'node:url',
      'node:module',
      'node:child_process',
    ],
    noExternal: [],
    splitting: false,
    minify: true,
    esbuildOptions(options) {
      options.legalComments = 'none';
    },
    onSuccess: async () => {
      const fs = await import('fs');
      const path = await import('path');

      const cjsFile = path.resolve('dist/index.js');
      let content = fs.readFileSync(cjsFile, 'utf-8');

      if (content.includes('module.exports = __toCommonJS(src_exports);')) {
        content = content.replace(
          /var src_default = viteMultiPage;[\s\S]*?$/,
          `var src_default = viteMultiPage;

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

      const mtsFile = path.resolve('dist/index.d.mts');
      if (fs.existsSync(mtsFile)) {
        fs.unlinkSync(mtsFile);
      }
    },
  },
  // CLI配置 - ESM 输出，避免 CJS 上下文中加载 Vite 8 ESM 模块失败
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    outDir: 'dist',
    target: 'node20',
    shims: true,
    external: [
      'vite',
      'glob',
      'cac',
      'jiti',
      'node:fs',
      'node:path',
      'node:url',
      'node:module',
      'node:child_process',
    ],
    noExternal: [],
    minify: true,
    clean: false,
    esbuildOptions(options) {
      options.legalComments = 'none';
      options.banner = {
        js: '#!/usr/bin/env node',
      };
    },
  },
]);
