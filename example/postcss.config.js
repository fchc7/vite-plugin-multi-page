// 动态PostCSS配置，根据构建策略应用不同的插件
export default ({ env }) => {
  const strategy = process.env.VITE_MULTI_PAGE_STRATEGY || 'default';

  console.log(`[PostCSS] 当前构建策略: ${strategy}`);

  const plugins = {};

  if (strategy === 'mobile') {
    // 移动端使用 pxtorem 转换
    plugins['postcss-pxtorem'] = {
      rootValue: 37.5, // 基于375px设计稿
      unitPrecision: 5,
      propList: ['*'],
      selectorBlackList: ['.ignore'],
      replace: true,
      mediaQuery: false,
      minPixelValue: 2,
      exclude: /node_modules/i,
    };
    console.log('[PostCSS] 移动端策略: 启用 postcss-pxtorem');
  } else if (strategy === 'tablet') {
    // 平板端使用 px-to-viewport 转换
    plugins['postcss-px-to-viewport'] = {
      viewportWidth: 1024, // 基于1024px平板设计稿
      viewportHeight: 768,
      unitPrecision: 5,
      viewportUnit: 'vw',
      selectorBlackList: ['.ignore'],
      minPixelValue: 1,
      mediaQuery: false,
      exclude: /node_modules/i,
    };
    console.log('[PostCSS] 平板端策略: 启用 postcss-px-to-viewport');
  } else {
    // 默认策略不使用特殊的CSS处理
    console.log('[PostCSS] 默认策略: 不使用特殊CSS处理');
  }

  return {
    plugins,
  };
};
