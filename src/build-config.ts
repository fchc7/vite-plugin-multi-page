import type { UserConfig } from 'vite';
import { mergeConfig } from 'vite';
import { glob } from 'glob';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { filterEntryFiles } from './file-filter';
import { getPageConfig } from './page-config';
import type { BuildConfigOptions, PageConfigContext, ConfigStrategy } from './types';
import { createLogger } from './utils';

/**
 * 构建时配置生成器
 * 根据策略和页面配置生成多页面构建配置
 */
export function generateBuildConfig(options: BuildConfigOptions): Record<string, UserConfig> {
  const {
    entry = 'src/pages/*/main.{ts,js}',
    exclude = [],
    template = 'index.html',
    placeholder = '<!--VITE_MULTI_PAGE_ENTRY-->',
    strategies = {},
    pageConfigs = {},
    forceBuildStrategy,
  } = options;

  const log = createLogger(true);
  const buildConfigs: Record<string, UserConfig> = {};

  try {
    // 1. 发现所有页面入口文件
    const allFiles = glob.sync(entry, { cwd: process.cwd() });
    const entryFiles = filterEntryFiles(allFiles, entry, exclude, log);

    if (entryFiles.length === 0) {
      log('警告: 未找到匹配的入口文件');
      return {};
    }

    // 2. 为每个页面分析配置和策略
    const pageStrategies = new Map<string, string>();
    const strategyPages = new Map<string, string[]>();

    for (const entryFile of entryFiles) {
      const pageContext = {
        pageName: entryFile.name,
        filePath: entryFile.file,
        relativePath: path.relative(process.cwd(), entryFile.file),
      } as PageConfigContext;

      // 获取页面配置
      const pageConfig = getPageConfig(pageConfigs, pageContext, log);
      const strategyName = pageConfig?.strategy || 'default';

      pageStrategies.set(entryFile.name, strategyName);

      if (!strategyPages.has(strategyName)) {
        strategyPages.set(strategyName, []);
      }
      strategyPages.get(strategyName)?.push(entryFile.name);
    }

    log(`📄 发现 ${entryFiles.length} 个页面: ${entryFiles.map(f => f.name).join(', ')}`);

    // 3. 如果指定了强制策略，只构建该策略的页面
    if (forceBuildStrategy) {
      const targetPages = strategyPages.get(forceBuildStrategy) || [];
      if (targetPages.length === 0) {
        log(`警告: 策略 "${forceBuildStrategy}" 下没有页面`);
        return {};
      }

      log(`强制构建策略: ${forceBuildStrategy}, 页面: ${targetPages.join(', ')}`);

      const config = generateStrategyConfig(
        forceBuildStrategy,
        targetPages,
        entryFiles,
        strategies[forceBuildStrategy],
        pageConfigs,
        template,
        placeholder,
        log
      );

      buildConfigs[forceBuildStrategy] = config;
      return buildConfigs;
    }

    // 4. 为每个策略生成构建配置
    for (const [strategyName, pages] of strategyPages) {
      if (pages.length === 0) continue;

      // 获取策略配置，如果没有定义则使用空配置（允许默认策略）
      const strategyConfig = strategies[strategyName] || {};
      const config = generateStrategyConfig(
        strategyName,
        pages,
        entryFiles,
        strategyConfig,
        pageConfigs,
        template,
        placeholder,
        log
      );

      buildConfigs[strategyName] = config;
    }

    // 确保至少有一个构建配置
    if (Object.keys(buildConfigs).length === 0) {
      log('警告: 未生成任何构建配置，创建默认配置');

      // 如果没有任何策略，创建一个默认策略包含所有页面
      const allPageNames = entryFiles.map(f => f.name);
      const defaultConfig = generateStrategyConfig(
        'default',
        allPageNames,
        entryFiles,
        {},
        pageConfigs,
        template,
        placeholder,
        log
      );

      buildConfigs['default'] = defaultConfig;
    }

    const strategyNames = Object.keys(buildConfigs);
    log(`📦 构建策略: ${strategyNames.join(', ')}`);
    return buildConfigs;
  } catch (error) {
    log('生成构建配置失败:', error);
    throw error;
  }
}

/**
 * 为特定策略生成构建配置
 */
function generateStrategyConfig(
  strategyName: string,
  pages: string[],
  entryFiles: Array<{ name: string; file: string }>,
  strategyConfig: ConfigStrategy | undefined,
  pageConfigs: any,
  defaultTemplate: string,
  placeholder: string,
  log: (...args: any[]) => void
): UserConfig {
  const htmlInputs: Record<string, string> = {};
  const tempFiles: string[] = [];

  // 收集所有页面的 define 变量
  const allPageDefines: Record<string, any> = {};

  // 为每个页面确定使用的HTML模板并创建临时文件
  for (const pageName of pages) {
    const entryFile = entryFiles.find(f => f.name === pageName);
    if (!entryFile) continue;

    // 获取页面配置
    const pageContext = {
      pageName,
      filePath: entryFile.file,
      relativePath: path.relative(process.cwd(), entryFile.file),
      strategy: strategyName,
    } as PageConfigContext;

    const pageConfig = getPageConfig(pageConfigs, pageContext, log);

    // 收集页面级 define 变量
    if (pageConfig?.define) {
      Object.assign(allPageDefines, pageConfig.define);
    }

    // 确定HTML模板
    let templatePath = defaultTemplate;

    // 1. 页面特定模板（如 mobile.html 对应 mobile 页面）
    const pageSpecificTemplate = `${pageName}.html`;
    if (fs.existsSync(path.resolve(process.cwd(), pageSpecificTemplate))) {
      templatePath = pageSpecificTemplate;
    }
    // 2. 页面配置中指定的模板
    else if (pageConfig?.template) {
      templatePath = pageConfig.template;
    }

    // 读取模板内容
    const templateFullPath = path.resolve(process.cwd(), templatePath);
    if (!fs.existsSync(templateFullPath)) {
      log(`警告: 模板文件不存在: ${templatePath}`);
      continue;
    }

    let templateContent = fs.readFileSync(templateFullPath, 'utf-8');

    // 替换占位符
    if (templateContent.includes(placeholder)) {
      // 临时HTML在项目根目录中，使用相对路径
      const entryPath = `./${entryFile.file}`;
      templateContent = templateContent.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        entryPath
      );
    }

    // 创建临时HTML文件，使用新的命名规则：.temp.mp.[name].html
    const tempHtmlPath = path.resolve(process.cwd(), `.temp.mp.${pageName}.html`);
    fs.writeFileSync(tempHtmlPath, templateContent);
    tempFiles.push(tempHtmlPath);

    htmlInputs[pageName] = tempHtmlPath;
  }

  // 构建基础配置 - 直接输出到策略目录
  const baseConfig: UserConfig = {
    base: './', // 使用相对路径，支持子目录部署
    build: {
      outDir: `dist/${strategyName}`, // 直接输出到策略目录
      rollupOptions: {
        input: htmlInputs, // 使用临时HTML文件作为输入
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
      emptyOutDir: false, // 不清空输出目录，避免删除临时HTML文件
    },
    define: {},
  };

  // 使用Vite的mergeConfig进行智能深度合并
  let config: UserConfig = baseConfig;

  if (strategyConfig) {
    config = mergeConfig(baseConfig, strategyConfig);
  }

  // 合并页面级 define 变量到 Vite 的 define 配置中
  // 页面级 define 优先级高于策略级 define
  if (Object.keys(allPageDefines).length > 0) {
    config.define = {
      ...config.define,
      ...allPageDefines,
    };
  }

  // 手动处理需要特殊控制的配置项，防止被mergeConfig覆盖
  if (!config.build) config.build = {};
  if (!config.build.rollupOptions) config.build.rollupOptions = {};

  // 确保关键配置不被覆盖
  config.build.rollupOptions.input = htmlInputs; // 强制使用临时HTML文件作为输入
  config.build.emptyOutDir = false; // 不清空输出目录，避免删除临时HTML文件

  // 简化日志输出
  log(`策略 "${strategyName}" - ${pages.length} 个页面`);

  return config;
}

/**
 * 获取Vite配置的输出目录
 * 需要传入已解析的Vite配置或命令行参数
 */
export function getViteOutputDirectory(viteBuildArgs: string[] = []): string {
  // 1. 首先检查命令行参数中的 --outDir
  const outDirIndex = viteBuildArgs.findIndex(arg => arg === '--outDir');
  if (outDirIndex !== -1 && outDirIndex + 1 < viteBuildArgs.length) {
    const outDir = viteBuildArgs[outDirIndex + 1];
    return path.resolve(process.cwd(), outDir);
  }

  // 2. 检查 --outDir=value 格式
  const outDirArg = viteBuildArgs.find(arg => arg.startsWith('--outDir='));
  if (outDirArg) {
    const outDir = outDirArg.split('=')[1];
    return path.resolve(process.cwd(), outDir);
  }

  // 3. 如果没有命令行参数，使用 Vite 默认值
  // 注意：如果用户在 vite.config.ts 中配置了 build.outDir，
  // Vite 会自动使用该配置，我们这里只处理命令行参数的情况
  return path.resolve(process.cwd(), 'dist');
}

/**
 * 清理Vite配置的输出目录
 */
export function cleanViteOutputDirectory(viteBuildArgs: string[] = []): void {
  const outputDir = getViteOutputDirectory(viteBuildArgs);
  const log = createLogger(true);

  try {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      log(`🧹 清理输出目录: ${path.relative(process.cwd(), outputDir)}`);
    }
  } catch (error) {
    log(`⚠️ 清理输出目录失败: ${outputDir}`, error);
  }
}

/**
 * 获取所有可用的构建策略
 */
export function discoverPages(options: BuildConfigOptions): Array<{ name: string; file: string }> {
  const { entry = 'src/pages/*/main.{ts,js}', exclude = [] } = options;

  const log = createLogger(true);

  try {
    // 发现所有页面入口文件
    const allFiles = glob.sync(entry, { cwd: process.cwd() });
    const entryFiles = filterEntryFiles(allFiles, entry, exclude, log);

    return entryFiles;
  } catch (error) {
    log('发现页面失败:', error);
    throw error;
  }
}

export function getAvailableStrategies(options: BuildConfigOptions): string[] {
  const { entry = 'src/pages/*/main.{ts,js}', exclude = [], pageConfigs = {} } = options;

  const log = createLogger(false); // 静默模式
  const strategySet = new Set<string>();

  // 发现所有页面入口文件
  const allFiles = glob.sync(entry, { cwd: process.cwd() });
  const entryFiles = filterEntryFiles(allFiles, entry, exclude, log);

  if (entryFiles.length === 0) {
    throw new Error(`未找到匹配的入口文件: ${entry}`);
  }

  try {
    // 分析每个页面的策略
    for (const entryFile of entryFiles) {
      const pageContext = {
        pageName: entryFile.name,
        filePath: entryFile.file,
        relativePath: path.relative(process.cwd(), entryFile.file),
      } as PageConfigContext;

      const pageConfig = getPageConfig(pageConfigs, pageContext, log);
      const strategyName = pageConfig?.strategy || 'default';
      strategySet.add(strategyName);
    }

    // 只返回实际有页面的策略，不添加空策略
    return Array.from(strategySet).sort();
  } catch (error) {
    log('获取可用策略失败:', error);
    return ['default'];
  }
}
