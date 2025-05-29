import type { Plugin } from "vite";
import * as path from "node:path";
import * as fs from "node:fs";
import type { MultiPageOptions } from "./types";
import { createLogger } from "./utils";
import { configureDevServer } from "./dev-server";
import { createBuildConfig, createDevConfig } from "./build-config";

export type { MultiPageOptions };

export default function viteMultiPage(options: MultiPageOptions = {}): Plugin {
  const {
    entry = "src/**/*.{ts,js}",
    template = "index.html",
    exclude = ["src/main.ts", "src/vite-env.d.ts"],
    placeholder = "{{ENTRY_FILE}}",
    debug = false,
    buildStrategies,
    pageConfigs,
  } = options;

  const log = createLogger(debug);
  let tempFiles: string[] = [];
  let pageMapping: Map<string, string> = new Map();

  return {
    name: "vite-plugin-multi-page",

    config(config: any, { command }: { command: string }) {
      if (command === "build") {
        createBuildConfig(
          config,
          { entry, exclude, template, placeholder, buildStrategies, pageConfigs },
          log,
          tempFiles,
          pageMapping
        );
      } else {
        createDevConfig({ entry, exclude }, log);
      }
    },

    configureServer(server) {
      configureDevServer(
        server,
        { entry, exclude, template, placeholder },
        log
      );
    },

    generateBundle() {
      // 用于处理JS/CSS资源，HTML在writeBundle中处理
    },

    writeBundle(options: any) {
      Array.from(pageMapping.entries()).forEach(([tempName, targetName]) => {
        const tempPath = path.resolve(options.dir || "dist", tempName);
        const targetPath = path.resolve(options.dir || "dist", targetName);

        if (fs.existsSync(tempPath)) {
          fs.renameSync(tempPath, targetPath);
          log(`重命名HTML文件: ${tempName} -> ${targetName}`);
        }
      });
    },

    closeBundle() {
      tempFiles.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          const fileName = path.basename(filePath);
          log(`清理临时文件: ${fileName}`);
        }
      });
      tempFiles = [];
      pageMapping.clear();
    },
  };
}

export { viteMultiPage };
