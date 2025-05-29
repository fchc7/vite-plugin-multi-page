import * as path from 'node:path';
import * as fs from 'node:fs';
import { glob } from 'glob';
import { filterEntryFiles } from './file-filter';
import { escapeRegExp } from './utils';
import type { BuildStrategy, PageConfig, PageConfigFunction, PageConfigContext } from './types';

// 简单的 glob 模式匹配函数
function simpleMatch(pattern: string, str: string): boolean {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    .replace(/\*/g, '.*') // * 匹配任意字符
    .replace(/\?/g, '.'); // ? 匹配单个字符

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

export function createBuildConfig(
  config: any,
  options: {
    entry: string;
    exclude: string[];
    template: string;
    placeholder: string;
    buildStrategies?: Record<string, BuildStrategy>;
    pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
  },
  log: (...args: any[]) => void,
  tempFiles: string[],
  pageMapping: Map<string, string>
) {
  const allFiles = glob.sync(options.entry, { cwd: process.cwd() });
  const entryFiles = filterEntryFiles(allFiles, options.entry, options.exclude, log);

  if (entryFiles.length === 0) {
    console.warn('[vite-plugin-multi-page] No entry files found matching pattern:', options.entry);
    return;
  }

  log('扫描到的所有文件:', allFiles);
  log('过滤后的入口文件:', entryFiles);

  // 清理旧的临时文件
  const existingTempFiles = glob.sync('temp-*.html', { cwd: process.cwd() });
  existingTempFiles.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      log(`清理旧的临时文件: ${file}`);
    }
  });

  const input: Record<string, string> = {};
  tempFiles.length = 0; // 清空数组
  pageMapping.clear();

  // 分组页面按构建策略
  const strategyGroups: Record<string, typeof entryFiles> = {};
  const defaultStrategy = 'default';

  entryFiles.forEach(entryFile => {
    const { name, file } = entryFile;

    // 获取页面配置
    const pageConfig = getPageConfig(
      options.pageConfigs,
      {
        pageName: name,
        filePath: file,
        relativePath: path.relative(process.cwd(), file),
        strategy: undefined,
        isMatched: false,
      },
      log
    );

    const strategy = pageConfig?.strategy || defaultStrategy;

    if (!strategyGroups[strategy]) {
      strategyGroups[strategy] = [];
    }
    strategyGroups[strategy].push(entryFile);

    // 创建HTML文件
    const templatePath = pageConfig?.template
      ? path.resolve(process.cwd(), pageConfig.template)
      : path.resolve(process.cwd(), options.template);

    const tempHtmlPath = path.resolve(process.cwd(), `temp-${name}.html`);

    if (fs.existsSync(templatePath)) {
      let html = fs.readFileSync(templatePath, 'utf-8');
      html = html.replace(new RegExp(escapeRegExp(options.placeholder), 'g'), `/${file}`);

      fs.writeFileSync(tempHtmlPath, html);
      tempFiles.push(tempHtmlPath);

      input[name] = tempHtmlPath;
      pageMapping.set(`temp-${name}.html`, `${name}.html`);

      log(`创建临时文件: temp-${name}.html -> ${name}.html (策略: ${strategy})`);
    }
  });

  log('Build input configuration:', input);
  log('Strategy groups:', Object.keys(strategyGroups));

  // 应用构建策略
  config.build = config.build || {};
  config.build.rollupOptions = config.build.rollupOptions || {};
  config.build.rollupOptions.input = input;

  // 应用默认或指定的构建策略
  const defaultStrategyConfig = options.buildStrategies?.[defaultStrategy];
  if (defaultStrategyConfig) {
    applyBuildStrategy(config, defaultStrategyConfig, log);
  }

  // 如果只有一个策略组且不是默认策略，应用该策略
  const strategyKeys = Object.keys(strategyGroups);
  if (strategyKeys.length === 1 && strategyKeys[0] !== defaultStrategy) {
    const singleStrategy = options.buildStrategies?.[strategyKeys[0]];
    if (singleStrategy) {
      applyBuildStrategy(config, singleStrategy, log);
    }
  }

  // 处理多策略情况（需要多次构建）
  if (
    strategyKeys.length > 1 ||
    (strategyKeys.length === 1 &&
      strategyKeys[0] !== defaultStrategy &&
      options.buildStrategies?.[strategyKeys[0]])
  ) {
    log('检测到多构建策略，将创建策略映射');
    // 在插件实例上存储策略信息，供后续处理
    (config as any).__multiPageStrategies = {
      groups: strategyGroups,
      strategies: options.buildStrategies,
      pageConfigs: options.pageConfigs,
    };
  }
}

function getPageConfig(
  pageConfigs: Record<string, PageConfig> | PageConfigFunction | undefined,
  context: PageConfigContext,
  log: (...args: any[]) => void
): PageConfig | null {
  if (!pageConfigs) return null;

  // 如果是函数，直接调用
  if (typeof pageConfigs === 'function') {
    const result = pageConfigs(context);
    if (result) {
      log(`函数配置匹配页面 ${context.pageName}:`, result);
    }
    return result;
  }

  // 对象配置：支持精确匹配和模式匹配
  for (const [key, config] of Object.entries(pageConfigs)) {
    // 精确匹配页面名称
    if (key === context.pageName) {
      log(`精确匹配页面 ${context.pageName}:`, config);
      return config;
    }

    // 模式匹配
    if (config.match) {
      const patterns = Array.isArray(config.match) ? config.match : [config.match];
      const isMatched = patterns.some(
        pattern =>
          simpleMatch(pattern, context.pageName) ||
          simpleMatch(pattern, context.relativePath) ||
          simpleMatch(pattern, context.filePath)
      );

      if (isMatched) {
        log(`模式匹配页面 ${context.pageName} (模式: ${config.match}):`, config);
        return { ...config, match: undefined }; // 移除 match 属性避免传递给构建配置
      }
    }

    // glob 模式匹配页面名称
    if (simpleMatch(key, context.pageName)) {
      log(`Glob匹配页面 ${context.pageName} (模式: ${key}):`, config);
      return config;
    }
  }

  return null;
}

function applyBuildStrategy(config: any, strategy: BuildStrategy, log: (...args: any[]) => void) {
  log('应用构建策略:', strategy);

  // 应用完整的 Vite 配置
  if (strategy.viteConfig) {
    const { build: viteBuild, ...otherViteConfig } = strategy.viteConfig;

    // 合并非构建配置
    Object.keys(otherViteConfig).forEach(key => {
      if (key !== 'plugins') {
        // 跳过 plugins，避免冲突
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

    // 合并构建配置
    if (viteBuild) {
      config.build = {
        ...config.build,
        ...viteBuild,
      };
    }
  }

  // 应用输出配置
  if (strategy.output) {
    config.build.rollupOptions.output = {
      ...config.build.rollupOptions.output,
      ...strategy.output,
    };
  }

  // 应用构建配置
  if (strategy.build) {
    config.build = {
      ...config.build,
      ...strategy.build,
    };
  }

  // 应用环境变量
  if (strategy.define) {
    config.define = {
      ...config.define,
      ...strategy.define,
    };
  }

  // 应用别名配置
  if (strategy.alias) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      ...strategy.alias,
    };
  }

  // 应用服务器配置
  if (strategy.server) {
    config.server = {
      ...config.server,
      ...strategy.server,
    };
  }

  // 应用 CSS 配置
  if (strategy.css) {
    config.css = {
      ...config.css,
      ...strategy.css,
    };
  }

  // 应用优化依赖配置
  if (strategy.optimizeDeps) {
    config.optimizeDeps = {
      ...config.optimizeDeps,
      ...strategy.optimizeDeps,
    };
  }
}

export function createDevConfig(
  options: {
    entry: string;
    exclude: string[];
  },
  log: (...args: any[]) => void
) {
  const allFiles = glob.sync(options.entry, { cwd: process.cwd() });
  const entryFiles = filterEntryFiles(allFiles, options.entry, options.exclude, log);

  const input: Record<string, string> = {};
  entryFiles.forEach(({ name, file }) => {
    input[name] = path.resolve(process.cwd(), file);
  });
  log('Dev input configuration:', input);
}
