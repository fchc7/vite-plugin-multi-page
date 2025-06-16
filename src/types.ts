import type { UserConfig } from 'vite';

// 核心配置选项
export interface MultiPageOptions {
  entry?: string;
  exclude?: string[];
  template?: string;
  placeholder?: string;
  debug?: boolean;
  merge?: 'all' | 'page'; // 构建产物合并模式
  strategies?: Record<string, ConfigStrategy>;
  pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
  __forceBuildStrategy?: string;
}

// 主要导出类型
export type Options = MultiPageOptions;

// 开发服务器选项
export interface DevServerOptions {
  entry: string;
  exclude: string[];
  template: string;
  placeholder: string;
  strategies?: Record<string, ConfigStrategy>;
  pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
  appliedStrategies?: Map<string, string>;
  devStrategy?: string; // 开发模式下指定的策略
}

// 构建配置选项
export interface BuildConfigOptions {
  entry: string;
  exclude: string[];
  template: string;
  placeholder: string;
  merge?: 'all' | 'page'; // 构建产物合并模式
  strategies?: Record<string, ConfigStrategy>;
  pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
  forceBuildStrategy?: string;
  forceBuildPage?: string; // 强制构建指定页面（用于单页面构建）
}

// 策略配置
export interface ConfigStrategy extends Omit<UserConfig, 'plugins'> {}

// 页面配置
export interface PageConfig {
  strategy?: string;
  define?: Record<string, any>;
  template?: string;
  viteConfig?: UserConfig;
  match?: string;
}

// 页面上下文
export interface PageContext {
  pageName: string;
  filePath: string;
  relativePath: string;
  fullPath?: string;
  strategy?: string;
  isMatched?: boolean;
}

// 页面配置上下文（别名）
export type PageConfigContext = PageContext;

// 页面配置函数
export type PageConfigFunction = (context: PageContext) => PageConfig | null;

// 入口文件信息
export interface EntryFile {
  name: string;
  file: string;
}

// 候选文件信息
export interface CandidateFile extends EntryFile {
  priority: number;
}

// 构建策略配置
export interface BuildStrategyConfig {
  strategy: string;
  pages: string[];
  configPath?: string;
}

// CLI选项
export interface CLIOptions {
  configFile: string;
  outDir?: string;
  debug?: boolean;
  mode?: string;
  minify?: boolean | string;
  build?: Record<string, any>;
  base?: string;
  strategy?: string;
  port?: number | string;
  host?: string;
  https?: boolean;
  open?: boolean;
}

// 插件上下文
export interface PluginContext {
  mode: string;
  command: 'build' | 'serve';
  isCLI: boolean;
}

// 配置函数类型
export type ConfigFunction = (context: PluginContext) => MultiPageOptions;

// 配置变换函数类型
export type ConfigTransformFunction = (
  config: MultiPageOptions,
  context: PluginContext
) => MultiPageOptions;

// 工具函数：定义配置
export function defineConfig(config: MultiPageOptions | ConfigFunction): ConfigFunction {
  // 如果传入的是函数，直接返回
  if (typeof config === 'function') {
    return config;
  }

  // 如果传入的是对象，包装成函数返回
  return () => config;
}

// 工具函数：定义配置变换
export function defineConfigTransform(transform: ConfigTransformFunction): ConfigTransformFunction {
  return transform;
}
