import type { ViteDevServer } from 'vite';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { glob } from 'glob';
import { filterEntryFiles } from './file-filter';
import { escapeRegExp } from './utils';
import type { PageConfig, ConfigStrategy, DevServerOptions } from './types';
import { getPageConfig } from './page-config';

function applyDevStrategy(
  server: ViteDevServer,
  strategy: ConfigStrategy,
  log: (...args: any[]) => void
) {
  if (!strategy) return;

  log('开发模式记录配置策略配置(已在config钩子中应用):', strategy);

  // 记录策略配置，实际应用已在插件的config钩子中完成
  if (strategy.define) {
    log('开发环境变量配置:', strategy.define);
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
  options: DevServerOptions,
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

    // 从传递的应用策略信息中获取，如果没有则使用配置或默认值
    const strategy = options.appliedStrategies?.get(name) || pageConfig?.strategy || 'default';

    pageMap.set(name, {
      file,
      config: pageConfig,
      strategy,
    });

    // 如果指定了配置策略，记录配置信息（实际应用已在config钩子中完成）
    if (options.configStrategies && pageConfig?.strategy) {
      const configStrategy = options.configStrategies[pageConfig.strategy];
      if (configStrategy) {
        applyDevStrategy(server, configStrategy, log);
      }
    }
  });

  const pageNames = Array.from(pageMap.keys());
  log('可用页面:', pageNames);
  log('页面配置映射:', Object.fromEntries(pageMap));

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
            let defineVars = {};

            // 从策略中获取环境变量
            if (
              pageInfo.strategy &&
              options.configStrategies &&
              options.configStrategies[pageInfo.strategy]?.define
            ) {
              defineVars = { ...defineVars, ...options.configStrategies[pageInfo.strategy].define };
              log(
                `应用策略 ${pageInfo.strategy} 的环境变量:`,
                options.configStrategies[pageInfo.strategy].define
              );
            }

            // 页面配置的环境变量(优先级更高)
            if (pageConfig?.define) {
              defineVars = { ...defineVars, ...pageConfig.define };
              log(`应用页面配置的环境变量:`, pageConfig.define);
            }

            // 在HTML中注入环境变量
            if (Object.keys(defineVars).length > 0) {
              const defineScript = Object.entries(defineVars)
                .map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`)
                .join('\n');

              if (defineScript) {
                const scriptTag = `<script>
                  // 页面级环境变量
                  ${defineScript}
                </script>`;
                html = html.replace('</head>', `${scriptTag}\n</head>`);
                log(`注入环境变量:`, defineVars);
              }
            }

            // 如果HTML文件中不包含head标签，尝试在body开始处注入
            if (Object.keys(defineVars).length > 0 && !html.includes('</head>')) {
              const defineScript = Object.entries(defineVars)
                .map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`)
                .join('\n');

              if (defineScript) {
                const scriptTag = `<script>
                  // 页面级环境变量
                  ${defineScript}
                </script>`;
                html = html.replace('<body>', `<body>\n${scriptTag}`);
                log(`在body标签中注入环境变量:`, defineVars);
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
