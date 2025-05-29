import type { ViteDevServer } from "vite";
import * as path from "node:path";
import * as fs from "node:fs";
import { glob } from "glob";
import { filterEntryFiles } from "./file-filter";
import { escapeRegExp } from "./utils";

export function configureDevServer(
  server: ViteDevServer,
  options: {
    entry: string;
    exclude: string[];
    template: string;
    placeholder: string;
  },
  log: (...args: any[]) => void
) {
  const allFiles = glob.sync(options.entry, { cwd: process.cwd() });
  const entryFiles = filterEntryFiles(
    allFiles,
    options.entry,
    options.exclude,
    log
  );

  const pageMap = new Map<string, string>();
  entryFiles.forEach(({ name, file }) => {
    pageMap.set(name, file);
  });

  const pageNames = Array.from(pageMap.keys());
  log("Available pages:", pageNames);
  log("Page mapping:", Object.fromEntries(pageMap));

  server.middlewares.use((req: any, res: any, next: any) => {
    const originalUrl = req.url;
    const url = originalUrl?.split("?")[0];

    if (!url) {
      return next();
    }

    log(`处理请求: ${url}`);

    if (url === "/" && pageNames.length > 0) {
      const defaultPage = pageNames.includes("index") ? "index" : pageNames[0];
      log(`根路径重定向到: ${defaultPage}`);
      req.url = `/${defaultPage}.html`;
    }

    const finalUrl = req.url?.split("?")[0];
    const pageMatch = finalUrl?.match(/^\/([^\/\.]+)(\.html)?$/);

    if (pageMatch) {
      const pageName = pageMatch[1];

      log(`匹配到页面: ${pageName}`);
      log(`可用页面列表: ${pageNames.join(", ")}`);

      if (pageMap.has(pageName)) {
        const relativeEntryPath = pageMap.get(pageName)!;
        const entryPath = path.resolve(process.cwd(), relativeEntryPath);

        log(`页面 ${pageName} 对应文件: ${relativeEntryPath}`);

        if (fs.existsSync(entryPath)) {
          log(`找到入口文件: ${entryPath}`);

          const templatePath = path.resolve(process.cwd(), options.template);

          if (fs.existsSync(templatePath)) {
            let html = fs.readFileSync(templatePath, "utf-8");

            log(`读取模板文件: ${templatePath}`);
            log(`模板内容包含占位符: ${html.includes(options.placeholder)}`);

            if (!html.includes(options.placeholder)) {
              console.warn(
                `[vite-plugin-multi-page] 模板文件中没有找到占位符: ${options.placeholder}`
              );
              return next();
            }

            const entryFile = `/${relativeEntryPath}`;
            html = html.replace(
              new RegExp(escapeRegExp(options.placeholder), "g"),
              entryFile
            );

            log(`占位符 ${options.placeholder} 替换为: ${entryFile}`);
            log(`替换后包含占位符: ${html.includes(options.placeholder)}`);

            res.setHeader("Content-Type", "text/html");
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
