import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Options } from './types';

export interface ConfigContext {
  mode: 'development' | 'production';
  command: 'serve' | 'build';
  isCLI?: boolean;
}

export type ConfigFunction = (context: ConfigContext) => Options;

const CONFIG_FILES = [
  'multipage.config.ts',
  'multipage.config.js',
  'multipage.config.mjs',
] as const;

export function hasCustomConfig(): boolean {
  for (const filename of CONFIG_FILES) {
    const configPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(configPath)) {
      return true;
    }
  }
  return false;
}

export async function loadUserConfig(context: ConfigContext): Promise<Options | null> {
  const customConfig = await loadCustomConfig();

  if (customConfig) {
    const result = customConfig(context);

    if (!result) {
      return {};
    }

    return result;
  }

  return null;
}

async function loadConfigFile(filePath: string): Promise<any> {
  if (filePath.endsWith('.ts')) {
    const { register } = await import('tsx/esm/api');
    register();
    const fileUrl = pathToFileURL(filePath).href;
    return import(`${fileUrl}?t=${Date.now()}`);
  }

  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
    const fileUrl = pathToFileURL(filePath).href;
    return import(`${fileUrl}?t=${Date.now()}`);
  }

  throw new Error(`不支持的配置文件类型: ${filePath}`);
}

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
        console.error(`加载配置文件 ${configFile} 失败:`, error);
      }
    }
  }

  return null;
}
