import * as fs from 'node:fs';
import type { Plugin } from 'vite';
import { mergeConfig } from 'vite';
import { setupDevMiddleware } from './dev-server';
import { generateBuildConfig } from './build-config';
import { loadUserConfig, hasCustomConfig } from './config-loader';
import type { Options, ConfigTransformFunction } from './types';

// 导出类型和工具函数
export { defineConfig, defineConfigTransform } from './types';
export type {
  ConfigFunction,
  ConfigTransformFunction,
  PluginContext,
  PageContext,
  PageConfig,
} from './types';

export function viteMultiPage(transform?: ConfigTransformFunction): Plugin {
  let resolvedOptions: Options;
  const tempFiles: string[] = [];
  let log: (...args: any[]) => void = () => {}; // 默认为空函数

  return {
    name: 'vite-multi-page',

    async configResolved(config) {
      // 检查是否有配置文件
      if (!hasCustomConfig()) {
        throw new Error(
          '未找到多页面配置文件！请创建以下配置文件之一：\n' +
            '  - multipage.config.js\n' +
            '  - multipage.config.mjs\n' +
            '  - multipage.config.ts'
        );
      }

      // 加载用户配置文件
      const userConfig = await loadUserConfig({
        mode: config.command === 'serve' ? 'development' : 'production',
        command: config.command,
        isCLI: false,
      });

      if (!userConfig) {
        throw new Error('配置文件加载失败！');
      }

      // 应用配置变换函数（如果提供）
      resolvedOptions = transform
        ? transform(userConfig, {
            mode: config.command === 'serve' ? 'development' : 'production',
            command: config.command,
            isCLI: false,
          })
        : userConfig;

      // 设置debug日志
      const debug = resolvedOptions.debug ?? false;
      log = debug ? console.log.bind(console, '[vite-multi-page]') : () => {};

      log('Vite配置已解析, 使用配置:', {
        strategies: Object.keys(resolvedOptions.strategies || {}),
        entry: resolvedOptions.entry,
      });
    },

    async config(config, { command }) {
      if (command === 'build') {
        // 在config钩子中临时加载配置，因为configResolved还没运行
        if (!resolvedOptions) {
          if (!hasCustomConfig()) {
            throw new Error(
              '未找到多页面配置文件！请创建以下配置文件之一：\n' +
                '  - multipage.config.js\n' +
                '  - multipage.config.mjs\n' +
                '  - multipage.config.ts'
            );
          }

          const userConfig = await loadUserConfig({
            mode: 'production',
            command: 'build',
            isCLI: false,
          });

          if (!userConfig) {
            throw new Error('配置文件加载失败！');
          }

          // 应用配置变换函数（如果提供）
          resolvedOptions = transform
            ? transform(userConfig, {
                mode: 'production',
                command: 'build',
                isCLI: false,
              })
            : userConfig;
          const debug = resolvedOptions.debug ?? false;
          log = debug ? console.log.bind(console, '[vite-multi-page]') : () => {};
        }

        log('配置构建模式');

        // 生成构建配置
        const forceBuildStrategy = process.env.VITE_BUILD_STRATEGY;
        const buildConfigs = generateBuildConfig({
          entry: resolvedOptions.entry || 'src/pages/**/*.{ts,js}',
          exclude: resolvedOptions.exclude || [],
          template: resolvedOptions.template || 'index.html',
          placeholder: resolvedOptions.placeholder || '{{ENTRY_FILE}}',
          strategies: resolvedOptions.strategies || {},
          pageConfigs: resolvedOptions.pageConfigs || {},
          forceBuildStrategy,
        });

        // 应用构建配置中的策略（如果有forceBuildStrategy，buildConfigs只会包含该策略）
        const targetStrategy = Object.keys(buildConfigs)[0];

        if (targetStrategy && buildConfigs[targetStrategy]) {
          log(`应用构建策略: ${targetStrategy}`);
          const strategyConfig = buildConfigs[targetStrategy];

          // 使用Vite的mergeConfig进行智能深度合并
          const mergedConfig = mergeConfig(config, strategyConfig);

          // 将合并结果复制回config对象
          Object.assign(config, mergedConfig);

          log(`已应用策略 "${targetStrategy}" 的配置:`, {
            build: !!strategyConfig.build,
            define: !!strategyConfig.define,
            plugins: strategyConfig.plugins?.length || 0,
          });
        } else {
          log('未找到可用的构建策略，使用默认配置');
        }
      }
    },

    configureServer(server) {
      if (server.config.command === 'serve') {
        log('配置开发服务器');

        setupDevMiddleware(
          server,
          {
            entry: resolvedOptions.entry || 'src/pages/**/*.{ts,js}',
            exclude: resolvedOptions.exclude || [],
            template: resolvedOptions.template || 'index.html',
            placeholder: resolvedOptions.placeholder || '{{ENTRY_FILE}}',
            strategies: resolvedOptions.strategies || {},
            pageConfigs: resolvedOptions.pageConfigs || {},
          },
          log
        );
      }
    },

    buildEnd() {
      // 清理临时文件
      if (tempFiles.length > 0) {
        log(`清理 ${tempFiles.length} 个临时文件`);
        tempFiles.forEach(file => {
          try {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
              log(`删除临时文件: ${file}`);
            }
          } catch (error) {
            log(`删除临时文件失败: ${file}`, error);
          }
        });
        tempFiles.length = 0;
      }
    },
  };
}

export default viteMultiPage;
export type { Options } from './types';
export { generateBuildConfig, getAvailableStrategies } from './build-config';
