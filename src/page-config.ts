import type { PageConfig, PageConfigFunction, PageConfigContext } from './types';

/**
 * 根据页面上下文获取页面配置
 */
export function getPageConfig(
  pageConfigs: Record<string, PageConfig> | PageConfigFunction | undefined,
  context: PageConfigContext,
  log: (...args: any[]) => void
): PageConfig | null {
  if (!pageConfigs) return null;

  // 如果是函数，直接调用
  if (typeof pageConfigs === 'function') {
    const result = pageConfigs(context);
    return result;
  }

  // 对象配置：支持精确匹配和模式匹配
  for (const [key, config] of Object.entries(pageConfigs)) {
    // 精确匹配页面名称
    if (key === context.pageName) {
      log(`精确匹配页面 ${context.pageName}:`, config);
      return config;
    }

    // 模式匹配
    if (config.match) {
      const patterns = Array.isArray(config.match) ? config.match : [config.match];
      const isMatched = patterns.some(
        pattern =>
          simpleMatch(pattern, context.pageName) ||
          simpleMatch(pattern, context.relativePath) ||
          simpleMatch(pattern, context.filePath)
      );

      if (isMatched) {
        log(`模式匹配页面 ${context.pageName} (模式: ${config.match}):`, config);
        return { ...config, match: undefined };
      }
    }

    // glob 模式匹配页面名称
    if (simpleMatch(key, context.pageName)) {
      log(`Glob匹配页面 ${context.pageName} (模式: ${key}):`, config);
      return config;
    }
  }

  return null;
}

/**
 * 简单的模式匹配函数
 */
function simpleMatch(pattern: string, text: string): boolean {
  const regexPattern = pattern
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
}
