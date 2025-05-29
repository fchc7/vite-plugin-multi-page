import * as path from "node:path";
import * as fs from "node:fs";
import { glob } from "glob";
import { filterEntryFiles } from "./file-filter";
import { escapeRegExp } from "./utils";

export function createBuildConfig(
  config: any,
  options: {
    entry: string;
    exclude: string[];
    template: string;
    placeholder: string;
  },
  log: (...args: any[]) => void,
  tempFiles: string[],
  pageMapping: Map<string, string>
) {
  const allFiles = glob.sync(options.entry, { cwd: process.cwd() });
  const entryFiles = filterEntryFiles(
    allFiles,
    options.entry,
    options.exclude,
    log
  );

  if (entryFiles.length === 0) {
    console.warn(
      "[vite-plugin-multi-page] No entry files found matching pattern:",
      options.entry
    );
    return;
  }

  log("扫描到的所有文件:", allFiles);
  log("过滤后的入口文件:", entryFiles);

  // 清理旧的临时文件
  const existingTempFiles = glob.sync("temp-*.html", { cwd: process.cwd() });
  existingTempFiles.forEach((file) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      log(`清理旧的临时文件: ${file}`);
    }
  });

  const input: Record<string, string> = {};
  tempFiles.length = 0; // 清空数组
  pageMapping.clear();

  entryFiles.forEach(({ name, file }) => {
    const tempHtmlPath = path.resolve(process.cwd(), `temp-${name}.html`);
    const templatePath = path.resolve(process.cwd(), options.template);

    if (fs.existsSync(templatePath)) {
      let html = fs.readFileSync(templatePath, "utf-8");
      html = html.replace(
        new RegExp(escapeRegExp(options.placeholder), "g"),
        `/${file}`
      );

      fs.writeFileSync(tempHtmlPath, html);
      tempFiles.push(tempHtmlPath);

      input[name] = tempHtmlPath;
      pageMapping.set(`temp-${name}.html`, `${name}.html`);

      log(`创建临时文件: temp-${name}.html -> ${name}.html`);
    }
  });

  log("Build input configuration:", input);

  config.build = config.build || {};
  config.build.rollupOptions = config.build.rollupOptions || {};
  config.build.rollupOptions.input = input;
}

export function createDevConfig(
  options: {
    entry: string;
    exclude: string[];
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

  const input: Record<string, string> = {};
  entryFiles.forEach(({ name, file }) => {
    input[name] = path.resolve(process.cwd(), file);
  });
  log("Dev input configuration:", input);
}
