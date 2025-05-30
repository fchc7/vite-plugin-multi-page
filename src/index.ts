import type { Plugin } from 'vite';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { glob } from 'glob';
import type { MultiPageOptions } from './types';
import { createLogger } from './utils';
import { configureDevServer } from './dev-server';
import { createBuildConfig, createDevConfig } from './build-config';
import { filterEntryFiles } from './file-filter';

export type { MultiPageOptions };

function viteMultiPage(options: MultiPageOptions = {}): Plugin {
  const {
    entry = 'src/**/*.{ts,js}',
    template = 'index.html',
    exclude = ['src/main.ts', 'src/vite-env.d.ts'],
    placeholder = '{{ENTRY_FILE}}',
    debug = false,
    buildStrategies,
    pageConfigs,
  } = options;

  const log = createLogger(debug);
  let tempFiles: string[] = [];
  const pageMapping: Map<string, string> = new Map();

  return {
    name: 'vite-plugin-multi-page',

    config(config: any, { command }: { command: string }) {
      if (command === 'build') {
        createBuildConfig(
          config,
          { entry, exclude, template, placeholder, buildStrategies, pageConfigs },
          log,
          tempFiles,
          pageMapping
        );
      } else {
        createDevConfig({ entry, exclude }, log);

        if (buildStrategies || pageConfigs) {
          const allFiles = glob.sync(entry, { cwd: process.cwd() });
          const entryFiles = filterEntryFiles(allFiles, entry, exclude, log);

          const strategiesToApply = new Set<string>();

          entryFiles.forEach(({ name, file }) => {
            if (typeof pageConfigs === 'function') {
              const pageConfig = pageConfigs({
                pageName: name,
                filePath: file,
                relativePath: path.relative(process.cwd(), file),
                strategy: undefined,
                isMatched: false,
              });
              if (pageConfig?.strategy) {
                strategiesToApply.add(pageConfig.strategy);
              }
            } else if (pageConfigs) {
              const pageConfig = pageConfigs[name];
              if (pageConfig?.strategy) {
                strategiesToApply.add(pageConfig.strategy);
              }
            }
          });

          strategiesToApply.forEach(strategyName => {
            const strategy = buildStrategies?.[strategyName];
            if (strategy) {
              log(`开发模式应用策略 ${strategyName}:`, strategy);

              if (strategy.viteConfig) {
                // 解构时跳过 build 属性，因为开发模式不需要构建配置
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { build, ...otherViteConfig } = strategy.viteConfig;
                Object.keys(otherViteConfig).forEach(key => {
                  if (key !== 'plugins') {
                    const configKey = key as keyof typeof config;
                    const viteConfigValue = otherViteConfig[key as keyof typeof otherViteConfig];
                    if (viteConfigValue && typeof viteConfigValue === 'object') {
                      config[configKey] = {
                        ...(config[configKey] || {}),
                        ...viteConfigValue,
                      };
                    } else {
                      config[configKey] = viteConfigValue;
                    }
                  }
                });
              }

              if (strategy.define) {
                config.define = { ...config.define, ...strategy.define };
              }
              if (strategy.alias) {
                config.resolve = config.resolve || {};
                config.resolve.alias = { ...config.resolve.alias, ...strategy.alias };
              }
              if (strategy.server) {
                config.server = { ...config.server, ...strategy.server };
              }
              if (strategy.css) {
                config.css = { ...config.css, ...strategy.css };
              }
              if (strategy.optimizeDeps) {
                config.optimizeDeps = { ...config.optimizeDeps, ...strategy.optimizeDeps };
              }
            }
          });
        }
      }
    },

    configureServer(server) {
      configureDevServer(
        server,
        { entry, exclude, template, placeholder, buildStrategies, pageConfigs },
        log
      );
    },

    generateBundle() {
      // 用于处理JS/CSS资源，HTML在writeBundle中处理
    },

    writeBundle(options: any) {
      Array.from(pageMapping.entries()).forEach(([tempName, targetName]) => {
        const tempPath = path.resolve(options.dir || 'dist', tempName);
        const targetPath = path.resolve(options.dir || 'dist', targetName);

        if (fs.existsSync(tempPath)) {
          fs.renameSync(tempPath, targetPath);
          log(`重命名HTML文件: ${tempName} -> ${targetName}`);
        }
      });
    },

    closeBundle() {
      tempFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          const fileName = path.basename(filePath);
          log(`清理临时文件: ${fileName}`);
        }
      });
      tempFiles = [];
      pageMapping.clear();
    },
  };
}

// 默认导出
export default viteMultiPage;

// 具名导出以支持 CommonJS 和 ESM
export { viteMultiPage };
