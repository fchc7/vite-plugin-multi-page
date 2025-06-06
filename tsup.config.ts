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
    cjsInterop: true,
    esbuildOptions(options) {
      options.legalComments = 'none';
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
