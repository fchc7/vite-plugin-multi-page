import type { ViteDevServer } from 'vite';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { glob } from 'glob';
import { filterEntryFiles } from './file-filter';
import { escapeRegExp } from './utils';
import type { PageConfig, PageConfigFunction, PageConfigContext, BuildStrategy } from './types';

function simpleMatch(pattern: string, text: string): boolean {
  const regexPattern = pattern
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
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
        return { ...config, match: undefined };
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

function applyDevStrategy(
  server: ViteDevServer,
  strategy: BuildStrategy,
  log: (...args: any[]) => void
) {
  if (!strategy) return;

  log('开发模式应用构建策略:', strategy);

  // 注意：开发服务器的配置在启动后是只读的
  // 这里主要记录配置信息，实际应用需要在插件的 config 钩子中处理

  if (strategy.define) {
    log('开发环境变量配置:', strategy.define);
  }

  if (strategy.alias) {
    log('开发别名配置:', strategy.alias);
  }

  if (strategy.server) {
    log('服务器配置:', strategy.server);
  }

  if (strategy.css) {
    log('CSS配置:', strategy.css);
  }

  if (strategy.optimizeDeps) {
    log('依赖优化配置:', strategy.optimizeDeps);
  }
}

export function configureDevServer(
  server: ViteDevServer,
  options: {
    entry: string;
    exclude: string[];
    template: string;
    placeholder: string;
    buildStrategies?: Record<string, BuildStrategy>;
    pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
  },
  log: (...args: any[]) => void
) {
  const allFiles = glob.sync(options.entry, { cwd: process.cwd() });
  const entryFiles = filterEntryFiles(allFiles, options.entry, options.exclude, log);

  const pageMap = new Map<string, { file: string; config: PageConfig | null; strategy?: string }>();

  entryFiles.forEach(({ name, file }) => {
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

    const strategy = pageConfig?.strategy || 'default';

    pageMap.set(name, {
      file,
      config: pageConfig,
      strategy,
    });

    // 如果指定了构建策略，记录配置信息
    if (options.buildStrategies && pageConfig?.strategy) {
      const buildStrategy = options.buildStrategies[pageConfig.strategy];
      if (buildStrategy) {
        applyDevStrategy(server, buildStrategy, log);
      }
    }
  });

  const pageNames = Array.from(pageMap.keys());
  log('Available pages:', pageNames);
  log('Page mapping with configs:', Object.fromEntries(pageMap));

  server.middlewares.use((req: any, res: any, next: any) => {
    const originalUrl = req.url;
    const url = originalUrl?.split('?')[0];

    if (!url) {
      return next();
    }

    log(`处理请求: ${url}`);

    if (url === '/' && pageNames.length > 0) {
      const defaultPage = pageNames.includes('index') ? 'index' : pageNames[0];
      log(`根路径重定向到: ${defaultPage}`);
      req.url = `/${defaultPage}.html`;
    }

    const finalUrl = req.url?.split('?')[0];
    // eslint-disable-next-line no-useless-escape
    const pageMatch = finalUrl?.match(/^\/([^\/\.]+)(\.html)?$/);

    if (pageMatch) {
      const pageName = pageMatch[1];

      log(`匹配到页面: ${pageName}`);
      log(`可用页面列表: ${pageNames.join(', ')}`);

      if (pageMap.has(pageName)) {
        const pageInfo = pageMap.get(pageName);
        if (!pageInfo) {
          log(`页面信息获取失败: ${pageName}`);
          return next();
        }

        const relativeEntryPath = pageInfo.file;
        const pageConfig = pageInfo.config;
        const entryPath = path.resolve(process.cwd(), relativeEntryPath);

        log(`页面 ${pageName} 对应文件: ${relativeEntryPath}`);
        log(`页面配置:`, pageConfig);

        if (fs.existsSync(entryPath)) {
          log(`找到入口文件: ${entryPath}`);

          // 根据页面配置选择模板
          const templateFile = pageConfig?.template || options.template;
          const templatePath = path.resolve(process.cwd(), templateFile);

          if (fs.existsSync(templatePath)) {
            let html = fs.readFileSync(templatePath, 'utf-8');

            log(`读取模板文件: ${templatePath}`);
            log(`模板内容包含占位符: ${html.includes(options.placeholder)}`);

            if (!html.includes(options.placeholder)) {
              console.warn(
                `[vite-plugin-multi-page] 模板文件中没有找到占位符: ${options.placeholder}`
              );
              return next();
            }

            const entryFile = `/${relativeEntryPath}`;
            html = html.replace(new RegExp(escapeRegExp(options.placeholder), 'g'), entryFile);

            // 应用页面级环境变量注入
            if (pageConfig?.define) {
              // 在HTML中注入环境变量
              const defineScript = Object.entries(pageConfig.define)
                .map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`)
                .join('\n');

              if (defineScript) {
                const scriptTag = `<script>
                  // 页面级环境变量
                  ${defineScript}
                </script>`;
                html = html.replace('</head>', `${scriptTag}\n</head>`);
                log(`注入页面环境变量:`, pageConfig.define);
              }
            }

            log(`占位符 ${options.placeholder} 替换为: ${entryFile}`);
            log(`使用模板: ${templateFile}`);

            res.setHeader('Content-Type', 'text/html');
            res.end(html);
            return;
          } else {
            log(`模板文件不存在: ${templatePath}`);
          }
        } else {
          log(`入口文件不存在: ${entryPath}`);
        }
      } else {
        log(`页面 ${pageName} 不在可用列表中`);
      }
    }

    next();
  });
}
