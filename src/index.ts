import * as fs from 'node:fs';
import type { Plugin } from 'vite';
import { mergeConfig } from 'vite';
import { setupDevMiddleware } from './dev-server';
import { generateBuildConfig } from './build-config';
import { loadUserConfig, hasCustomConfig } from './config-loader';
import { mergeWithDefaults } from './defaults';
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
      // 加载用户配置文件（如果存在）
      let userConfig: Options | null = null;

      if (hasCustomConfig()) {
        userConfig = await loadUserConfig({
          mode: config.command === 'serve' ? 'development' : 'production',
          command: config.command,
          isCLI: false,
        });
      }

      // 合并用户配置和默认配置
      const mergedConfig = mergeWithDefaults(userConfig);

      // 应用配置变换函数（如果提供）
      resolvedOptions = transform
        ? transform(mergedConfig, {
            mode: config.command === 'serve' ? 'development' : 'production',
            command: config.command,
            isCLI: false,
          })
        : mergedConfig;

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
          // 加载用户配置文件（如果存在）
          let userConfig: Options | null = null;

          if (hasCustomConfig()) {
            userConfig = await loadUserConfig({
              mode: 'production',
              command: 'build',
              isCLI: false,
            });
          }

          // 合并用户配置和默认配置
          const mergedConfig = mergeWithDefaults(userConfig);

          // 应用配置变换函数（如果提供）
          resolvedOptions = transform
            ? transform(mergedConfig, {
                mode: 'production',
                command: 'build',
                isCLI: false,
              })
            : mergedConfig;
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

          throw new Error(
            '❌ 构建失败: 未找到任何构建策略\n\n' +
              '可能的原因：\n' +
              '  1. 配置文件返回空对象 {}\n' +
              '  2. 未找到匹配的入口文件\n' +
              '  3. 模板文件不存在\n' +
              '  4. 未配置 strategies 对象\n\n' +
              '最小配置示例：\n' +
              'export default () => ({\n' +
              '  entry: "src/pages/**/*.{ts,js}",\n' +
              '  template: "index.html",\n' +
              '  strategies: {\n' +
              '    default: {}\n' +
              '  }\n' +
              '});'
          );
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
