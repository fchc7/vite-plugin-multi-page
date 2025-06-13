import type { MultiPageOptions } from './types';

/**
 * 默认配置选项
 */
export const DEFAULT_CONFIG: Required<Omit<MultiPageOptions, '__forceBuildStrategy'>> = {
  entry: 'src/pages/**/*.{ts,js}',
  exclude: [],
  template: 'index.html',
  placeholder: '{{ENTRY_FILE}}',
  debug: false,
  merge: 'all',
  strategies: {
    default: {},
  },
  pageConfigs: {},
};

/**
 * 合并用户配置和默认配置
 */
export function mergeWithDefaults(
  userConfig: MultiPageOptions | null | undefined
): MultiPageOptions {
  if (!userConfig) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    entry: userConfig.entry ?? DEFAULT_CONFIG.entry,
    exclude: userConfig.exclude ?? DEFAULT_CONFIG.exclude,
    template: userConfig.template ?? DEFAULT_CONFIG.template,
    placeholder: userConfig.placeholder ?? DEFAULT_CONFIG.placeholder,
    debug: userConfig.debug ?? DEFAULT_CONFIG.debug,
    merge: userConfig.merge ?? DEFAULT_CONFIG.merge,
    strategies: userConfig.strategies ?? DEFAULT_CONFIG.strategies,
    pageConfigs: userConfig.pageConfigs ?? DEFAULT_CONFIG.pageConfigs,
    __forceBuildStrategy: userConfig.__forceBuildStrategy,
  };
}

/**
 * 检查配置是否为空或无效
 */
export function isEmptyConfig(config: MultiPageOptions): boolean {
  // 检查是否是完全空的对象
  if (Object.keys(config).length === 0) {
    return true;
  }

  // 检查是否只有默认值或无效值
  const hasValidEntry = config.entry && config.entry !== DEFAULT_CONFIG.entry;
  const hasValidStrategies = config.strategies && Object.keys(config.strategies).length > 0;
  const hasValidPageConfigs =
    config.pageConfigs &&
    (typeof config.pageConfigs === 'function' || Object.keys(config.pageConfigs).length > 0);

  return !hasValidEntry && !hasValidStrategies && !hasValidPageConfigs;
}
