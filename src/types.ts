import type { UserConfig } from 'vite';

export interface MultiPageOptions {
  entry?: string;
  template?: string;
  exclude?: string[];
  placeholder?: string;
  debug?: boolean;
  configStrategies?: Record<string, ConfigStrategy>;
  pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
}

export interface DevServerOptions {
  entry: string;
  exclude: string[];
  template: string;
  placeholder: string;
  configStrategies?: Record<string, ConfigStrategy>;
  pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
  appliedStrategies?: Map<string, string>;
}

export interface ConfigStrategy extends Omit<UserConfig, 'plugins'> {
  // 移除output属性，完全使用Vite标准配置结构
}

export interface PageConfigBase {
  // 保留核心属性
  strategy?: string; // 指定使用哪个配置策略
  template?: string; // 指定使用的HTML模板
  define?: Record<string, any>; // 页面级环境变量
  match?: string | string[]; // 用于模式匹配
}

export interface PageConfig extends PageConfigBase {}

export interface PageConfigContext {
  pageName: string;
  filePath: string;
  relativePath: string;
  strategy?: string;
  isMatched?: boolean;
}

export type PageConfigFunction = (context: PageConfigContext) => PageConfig | null;

export interface EntryFile {
  name: string;
  file: string;
}

export interface CandidateFile extends EntryFile {
  priority: number;
}
