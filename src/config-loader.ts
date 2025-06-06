import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Module } from 'node:module';
import type { Options } from './types';

/**
 * 配置上下文
 */
export interface ConfigContext {
  mode: 'development' | 'production';
  command: 'serve' | 'build';
  isCLI?: boolean;
}

/**
 * 配置函数类型
 */
export type ConfigFunction = (context: ConfigContext) => Options;

/**
 * 配置文件名列表（优先级从高到低）
 */
const CONFIG_FILES = [
  'multipage.config.js',
  'multipage.config.mjs',
  'multipage.config.ts',
] as const;

/**
 * 检查是否存在自定义配置文件
 */
export function hasCustomConfig(): boolean {
  for (const filename of CONFIG_FILES) {
    const configPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(configPath)) {
      return true;
    }
  }
  return false;
}

/**
 * 加载用户的多页面配置
 */
export async function loadUserConfig(context: ConfigContext): Promise<Options | null> {
  // 尝试加载项目自定义配置
  const customConfig = await loadCustomConfig();

  if (customConfig) {
    // 使用项目自定义配置
    return customConfig(context);
  }

  // 没有找到用户配置
  return null;
}

/**
 * 加载配置文件
 */
async function loadConfigFile(filePath: string): Promise<any> {
  // 处理 TypeScript 文件
  if (filePath.endsWith('.ts')) {
    try {
      const code = await fs.promises.readFile(filePath, 'utf-8');

      // 使用 esbuild 实时转译 TS → JS
      const esbuild = (await import('esbuild')) as any;
      const result = await esbuild.transform(code, {
        loader: 'ts',
        format: 'cjs', // 使用 CommonJS 格式便于使用 Module._compile
        target: 'node16',
        sourcemap: false,
      });

      // 创建临时模块并编译
      const tempModule = new Module(filePath);
      tempModule.filename = filePath;
      tempModule.paths = (Module as any)._nodeModulePaths(path.dirname(filePath));

      // 编译代码
      (tempModule as any)._compile(result.code, filePath);

      return tempModule.exports;
    } catch (esbuildError) {
      console.warn('esbuild 转译失败，尝试简单转换:', esbuildError);

      // 备选方案：简单的文本替换
      const code = await fs.promises.readFile(filePath, 'utf-8');
      const jsCode = code
        .replace(/export\s+default\s+/, 'module.exports = ')
        .replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*/g, '')
        .replace(/:\s*[^=,})\]]+/g, ''); // 简单的类型注解移除

      const tempModule = new Module(filePath);
      tempModule.filename = filePath;
      tempModule.paths = (Module as any)._nodeModulePaths(path.dirname(filePath));

      (tempModule as any)._compile(jsCode, filePath);
      return tempModule.exports;
    }
  }

  // 处理 JavaScript 文件
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
    const fileUrl = pathToFileURL(filePath).href;
    return import(`${fileUrl}?t=${Date.now()}`);
  }

  throw new Error(`不支持的配置文件类型: ${filePath}`);
}

/**
 * 加载项目自定义配置文件
 */
async function loadCustomConfig(): Promise<ConfigFunction | null> {
  const cwd = process.cwd();

  for (const configFile of CONFIG_FILES) {
    const configPath = path.resolve(cwd, configFile);

    if (fs.existsSync(configPath)) {
      try {
        const configModule = await loadConfigFile(configPath);
        const configFunction = configModule.default || configModule;

        if (typeof configFunction === 'function') {
          return configFunction;
        } else {
          console.warn(`配置文件 ${configFile} 必须默认导出一个函数`);
        }
      } catch (error) {
        if (configFile.endsWith('.ts')) {
          console.error(`加载TypeScript配置文件 ${configFile} 失败:`, error);
          console.log('提示：确保你的项目支持TypeScript，或者使用 .js/.mjs 配置文件');
        } else {
          console.error(`加载配置文件 ${configFile} 失败:`, error);
        }
      }
    }
  }

  return null;
}
