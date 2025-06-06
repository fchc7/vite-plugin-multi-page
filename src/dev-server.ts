import type { ViteDevServer } from 'vite';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { glob } from 'glob';
import { filterEntryFiles } from './file-filter';
import { escapeRegExp } from './utils';
import { DevServerOptions, PageConfigContext } from './types';
import { getPageConfig } from './page-config';

export function configureDevServer(
  server: ViteDevServer,
  options: DevServerOptions,
  log: (...args: any[]) => void
) {
  try {
    const allFiles = glob.sync(options.entry, { cwd: process.cwd() });
    let entryFiles = filterEntryFiles(allFiles, options.entry, options.exclude, log);

    if (entryFiles.length === 0) {
      log('警告: 未找到匹配的入口文件');
      return;
    }

    // 获取指定的策略，优先使用命令行参数
    const cliStrategy = ((server.config as any).__cliStrategy ||
      (server.config as any).strategy) as string | undefined;

    // 如果指定了策略，则只显示该策略下的页面或没有指定策略的默认页面
    if (cliStrategy) {
      log(`开发服务器使用指定的策略: ${cliStrategy}`);

      // 过滤入口文件，只保留匹配策略的页面
      entryFiles = entryFiles.filter(file => {
        const pageName = file.name;
        const pageStrategy = options.appliedStrategies?.get(pageName) || undefined;

        // 在指定策略为default时，包含所有没有指定策略的页面
        if (cliStrategy === 'default') {
          return !pageStrategy || pageStrategy === 'default';
        }

        // 其他策略，只包含匹配的页面
        return pageStrategy === cliStrategy;
      });

      log(`策略 "${cliStrategy}" 下可用的页面: ${entryFiles.map(f => f.name).join(', ') || '无'}`);
    }

    log('开发服务器应用的入口文件:', entryFiles);

    // 修改中间件来处理HTML请求
    server.middlewares.use(async (req, res, next) => {
      try {
        const url = req.url || '';
        const pathWithoutQuery = url.split('?')[0];

        // 处理根路径请求 - 显示所有页面的索引
        if (pathWithoutQuery === '/') {
          const indexHtml = generateIndexHtml(entryFiles, options, log);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(indexHtml);
          return;
        }

        // 跳过明显的静态资源请求
        if (
          pathWithoutQuery.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) &&
          !pathWithoutQuery.endsWith('.html')
        ) {
          return next();
        }

        // 提取页面名称，同时处理带.html后缀和不带后缀的情况
        let pageName = '';
        if (pathWithoutQuery.endsWith('.html')) {
          pageName = path.basename(pathWithoutQuery, '.html');
        } else if (pathWithoutQuery.startsWith('/')) {
          // 处理无扩展名的路径，如 /mobile
          pageName = pathWithoutQuery.substring(1); // 移除开头的斜杠
        }

        if (!pageName) {
          return next();
        }

        const matchedFile = entryFiles.find(file => file.name === pageName);

        if (!matchedFile) {
          return next();
        }

        // 获取页面配置
        const pageContext = {
          pageName: matchedFile.name,
          filePath: matchedFile.file,
          relativePath: path.relative(process.cwd(), matchedFile.file),
          strategy: undefined,
          isMatched: false,
        } as PageConfigContext;

        const pageConfig = getPageConfig(options.pageConfigs, pageContext, log);

        // 应用配置策略
        if (pageConfig?.strategy) {
          pageContext.strategy = pageConfig.strategy;
        } else if (options.appliedStrategies?.has(pageName)) {
          // 使用缓存的策略信息
          const strategyName = options.appliedStrategies.get(pageName);
          if (strategyName) {
            pageContext.strategy = strategyName;
          }
        }

        // 获取模板文件路径
        // 首先检查是否有页面特定的模板（例如mobile.html对应mobile页面）
        let templatePath = '';

        // 尝试以页面名称查找匹配的模板
        const pageSpecificTemplate = path.resolve(process.cwd(), `${pageName}.html`);
        if (fs.existsSync(pageSpecificTemplate)) {
          templatePath = pageSpecificTemplate;
        }
        // 然后尝试使用页面配置中指定的模板
        else if (pageConfig?.template) {
          templatePath = path.resolve(process.cwd(), pageConfig.template);
        }
        // 最后使用默认模板
        else {
          templatePath = path.resolve(process.cwd(), options.template);
        }

        if (!fs.existsSync(templatePath)) {
          return next();
        }

        // 读取并修改模板
        let html = fs.readFileSync(templatePath, 'utf-8');

        // 检查模板中是否包含占位符
        const containsPlaceholder = html.includes(options.placeholder);

        // 替换占位符为入口文件路径
        if (containsPlaceholder) {
          const originalHtml = html;

          // 方式1: 直接字符串替换
          html = html.split(options.placeholder).join(`/${matchedFile.file}`);

          // 检查替换结果
          if (html === originalHtml) {
            // 方式2: 正则表达式替换
            const escapedPlaceholder = escapeRegExp(options.placeholder);
            const placeholderRegex = new RegExp(escapedPlaceholder, 'g');
            html = originalHtml.replace(placeholderRegex, `/${matchedFile.file}`);

            // 检查替换结果
            if (html === originalHtml) {
              // 方式3: 硬编码替换具体的占位符格式
              html = originalHtml.replace(/\{\{ENTRY_FILE\}\}/g, `/${matchedFile.file}`);
            }
          }
        }

        // 添加页面级define变量
        if (pageConfig?.define) {
          const defineScript = Object.entries(pageConfig.define)
            .map(([key, value]) => {
              const stringValue = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
              return `window.${key} = ${stringValue};`;
            })
            .join('\n');

          if (defineScript) {
            // 注入到head标签底部
            html = html.replace(
              /<\/head>/i,
              `<script type="text/javascript">\n${defineScript}\n</script>\n</head>`
            );
          }
        }

        // 发送响应
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      } catch (error) {
        log(`开发服务器处理请求失败: ${error}`);
        next(error);
      }
    });

    log('开发服务器配置完成');
  } catch (error) {
    log(`配置开发服务器失败: ${error}`);
    throw error;
  }
}

// 为了兼容性，导出setupDevMiddleware作为configureDevServer的别名
export const setupDevMiddleware = configureDevServer;

// 生成索引页面HTML
function generateIndexHtml(
  entryFiles: { name: string; file: string }[],
  options: DevServerOptions,
  log: (...args: any[]) => void
): string {
  try {
    const pageItems = entryFiles
      .map(file => {
        // 获取页面配置和策略
        const pageContext = {
          pageName: file.name,
          filePath: file.file,
          relativePath: path.relative(process.cwd(), file.file),
          strategy: undefined,
          isMatched: false,
        };

        const pageConfig = getPageConfig(options.pageConfigs, pageContext, log);

        // 确定策略
        let strategy = 'default';
        if (pageConfig?.strategy) {
          strategy = pageConfig.strategy;
        } else if (options.appliedStrategies?.has(file.name)) {
          const strategyName = options.appliedStrategies.get(file.name);
          if (strategyName) {
            strategy = strategyName;
          }
        }

        const strategyBadge =
          strategy !== 'default' ? `<span class="badge">${strategy}</span>` : '';

        return `
        <div class="page-item">
          <a href="${file.name}.html" class="page-link">
            ${file.name}${strategyBadge}
          </a>
          <div class="page-path">${file.file}</div>
        </div>`;
      })
      .join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>多页面应用索引</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f7;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
          color: #111;
        }
        .page-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .page-item {
          background-color: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .page-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .page-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 18px;
          font-weight: 500;
          color: #0066cc;
          text-decoration: none;
          margin-bottom: 8px;
        }
        .page-path {
          font-size: 14px;
          color: #666;
          word-break: break-all;
        }
        .badge {
          display: inline-block;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          background-color: #e6f2ff;
          color: #0066cc;
          margin-left: 8px;
        }
        .stats {
          margin-bottom: 20px;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1>多页面应用索引</h1>
      <div class="stats">
        找到 ${entryFiles.length} 个页面
      </div>
      <div class="page-list">
        ${pageItems}
      </div>
    </body>
    </html>
    `;
  } catch (error) {
    log(`生成索引页失败: ${error}`);
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>错误</title>
    </head>
    <body>
      <h1>生成索引页时发生错误</h1>
      <p>${error}</p>
    </body>
    </html>
    `;
  }
}
