export default {
  plugins: {
    autoprefixer: {},
    'postcss-pxtorem': {
      rootValue: 37.5, // 默认值，基于375px设计稿
      unitPrecision: 5,
      propList: ['*'],
      selectorBlackList: ['.ignore'],
      replace: true,
      mediaQuery: false,
      minPixelValue: 2,
      exclude: /node_modules/i,
    },
  },
};
