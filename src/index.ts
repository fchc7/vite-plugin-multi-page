import type { Plugin } from 'vite';
import { mergeConfig } from 'vite';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { glob } from 'glob';
import type { MultiPageOptions } from './types';
import { createLogger } from './utils';
import { configureDevServer } from './dev-server';
import { createBuildConfig, createDevConfig } from './build-config';
import { filterEntryFiles } from './file-filter';
import { getPageConfig } from './page-config';

export type { MultiPageOptions };

function viteMultiPage(options: MultiPageOptions = {}): Plugin {
  const {
    entry = 'src/**/*.{ts,js}',
    template = 'index.html',
    exclude = ['src/main.ts', 'src/vite-env.d.ts'],
    placeholder = '{{ENTRY_FILE}}',
    debug = false,
    configStrategies,
    pageConfigs,
  } = options;

  const log = createLogger(debug);
  let tempFiles: string[] = [];
  const pageMapping: Map<string, string> = new Map();
  // 存储开发模式下的页面和策略信息，供configureServer使用
  const devPageStrategies = new Map<string, string>();

  return {
    name: 'vite-plugin-multi-page',

    config(config: any, { command }: { command: string }) {
      if (command === 'build') {
        createBuildConfig(
          config,
          { entry, exclude, template, placeholder, configStrategies, pageConfigs },
          log,
          tempFiles,
          pageMapping
        );
      } else {
        createDevConfig({ entry, exclude }, log);

        if (configStrategies || pageConfigs) {
          const allFiles = glob.sync(entry, { cwd: process.cwd() });
          const entryFiles = filterEntryFiles(allFiles, entry, exclude, log);

          const strategiesToApply = new Set<string>();
          const pageToStrategyMap = new Map<string, string>();
          const globalDefines: Record<string, any> = {};

          entryFiles.forEach(({ name, file }) => {
            const relativePath = path.relative(process.cwd(), file);

            const pageContext = {
              pageName: name,
              filePath: file,
              relativePath,
              strategy: undefined,
              isMatched: false,
            };

            const pageConfig = getPageConfig(pageConfigs, pageContext, log);

            if (pageConfig?.strategy) {
              strategiesToApply.add(pageConfig.strategy);
              // 保存页面与策略的关系，供configureServer使用
              devPageStrategies.set(name, pageConfig.strategy);
              pageToStrategyMap.set(name, pageConfig.strategy);

              // 收集策略的define值
              if (
                configStrategies &&
                pageConfig?.strategy &&
                configStrategies[pageConfig.strategy]?.define
              ) {
                const strategyDefines = configStrategies[pageConfig.strategy].define;
                if (strategyDefines) {
                  Object.entries(strategyDefines).forEach(([key, value]) => {
                    // 使用JSON.stringify确保值被正确处理
                    globalDefines[key] = typeof value === 'string' ? value : JSON.stringify(value);
                  });
                }
              }
            }

            // 页面级define (优先级更高)
            if (pageConfig?.define) {
              Object.entries(pageConfig.define).forEach(([key, value]) => {
                globalDefines[key] = typeof value === 'string' ? value : JSON.stringify(value);
              });
            }
          });

          log('开发模式应用策略组:', Array.from(strategiesToApply));

          // 将所有收集到的define值应用到全局config
          if (Object.keys(globalDefines).length > 0) {
            config.define = config.define || {};
            config.define = { ...config.define, ...globalDefines };
            log('应用环境变量:', config.define);
          }

          // 应用全局策略配置
          strategiesToApply.forEach(strategyName => {
            const strategy = configStrategies?.[strategyName];
            if (strategy) {
              log(`开发模式应用策略 ${strategyName}:`, strategy);

              // 使用Vite的mergeConfig合并配置
              const mergedConfig = mergeConfig(config, strategy);

              // 将合并后的配置赋值回原配置
              Object.keys(mergedConfig).forEach(key => {
                if (key !== 'plugins') {
                  config[key] = mergedConfig[key];
                }
              });
            }
          });

          // 保存开发模式下应用的策略信息，方便configureServer使用
          (config as any).__devPageStrategies = devPageStrategies;
          (config as any).__configStrategies = configStrategies;
        }
      }
    },

    configureServer(server) {
      // 传递策略映射到开发服务器
      configureDevServer(
        server,
        {
          entry,
          exclude,
          template,
          placeholder,
          configStrategies,
          pageConfigs,
          // 传递已应用的策略映射
          appliedStrategies: (server.config as any).__devPageStrategies,
        },
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
