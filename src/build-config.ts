import * as path from 'node:path';
import * as fs from 'node:fs';
import { glob } from 'glob';
import { mergeConfig } from 'vite';
import { filterEntryFiles } from './file-filter';
import { escapeRegExp } from './utils';
import type { ConfigStrategy, PageConfig, PageConfigFunction } from './types';
import { getPageConfig } from './page-config';

export function createBuildConfig(
  config: any,
  options: {
    entry: string;
    exclude: string[];
    template: string;
    placeholder: string;
    configStrategies?: Record<string, ConfigStrategy>;
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

  // 分组页面按配置策略
  const strategyGroups: Record<string, typeof entryFiles> = {};
  const defaultStrategy = 'default';
  // 存储每个页面对应的策略名称
  const pageStrategyMap = new Map<string, string>();

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
    // 记录页面对应的策略
    pageStrategyMap.set(name, strategy);

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

  // 应用配置策略
  config.build = config.build || {};
  config.build.rollupOptions = config.build.rollupOptions || {};
  config.build.rollupOptions.input = input;

  // 应用默认或指定的配置策略
  const defaultStrategyConfig = options.configStrategies?.[defaultStrategy];
  if (defaultStrategyConfig) {
    applyConfigStrategy(config, defaultStrategyConfig, log);
  }

  // 如果只有一个策略组且不是默认策略，应用该策略
  const strategyKeys = Object.keys(strategyGroups);
  if (strategyKeys.length === 1 && strategyKeys[0] !== defaultStrategy) {
    const singleStrategy = options.configStrategies?.[strategyKeys[0]];
    if (singleStrategy) {
      applyConfigStrategy(config, singleStrategy, log);
    }
  }

  // 多策略的情况下，需要为每个页面设置对应策略的环境变量
  Object.keys(strategyGroups).forEach(strategyName => {
    const strategy = options.configStrategies?.[strategyName];
    if (strategy?.define) {
      // 确保define配置存在
      config.define = config.define || {};

      // 将策略中的define配置应用到全局define中
      Object.entries(strategy.define).forEach(([key, value]) => {
        config.define[key] = value;
        log(`应用策略 ${strategyName} 的环境变量 ${key}:`, value);
      });
    }
  });

  // 检查页面级配置中的define
  entryFiles.forEach(({ name }) => {
    const pageConfig = getPageConfig(
      options.pageConfigs,
      {
        pageName: name,
        filePath: '',
        relativePath: '',
        strategy: pageStrategyMap.get(name),
        isMatched: true,
      },
      log
    );

    // 页面级define (优先级更高)
    if (pageConfig?.define) {
      config.define = config.define || {};
      Object.entries(pageConfig.define).forEach(([key, value]) => {
        config.define[key] = value;
        log(`应用页面 ${name} 的环境变量 ${key}:`, value);
      });
    }
  });

  // 处理多策略情况（需要多次构建）
  if (
    strategyKeys.length > 1 ||
    (strategyKeys.length === 1 &&
      strategyKeys[0] !== defaultStrategy &&
      options.configStrategies?.[strategyKeys[0]])
  ) {
    log('检测到多配置策略，将创建策略映射');
    // 在插件实例上存储策略信息，供后续处理
    (config as any).__multiPageStrategies = {
      groups: strategyGroups,
      strategies: options.configStrategies,
      pageConfigs: options.pageConfigs,
    };
  }
}

function applyConfigStrategy(config: any, strategy: ConfigStrategy, log: (...args: any[]) => void) {
  log('应用配置策略:', strategy);

  // 使用Vite的mergeConfig合并配置
  const mergedConfig = mergeConfig(config, strategy);

  // 将合并后的配置赋值回原配置，排除plugins以避免冲突
  Object.keys(mergedConfig).forEach(key => {
    if (key !== 'plugins') {
      config[key] = mergedConfig[key];
    }
  });

  // 确保define值被正确处理
  if (strategy.define) {
    config.define = config.define || {};
    // 通过Vite的标准define配置，确保构建时环境变量替换
    Object.entries(strategy.define).forEach(([key, value]) => {
      // 确保值被正确处理 - 直接赋值，Vite会处理字符串化
      config.define[key] = value;
      log(`设置环境变量 ${key}:`, value);
    });
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
