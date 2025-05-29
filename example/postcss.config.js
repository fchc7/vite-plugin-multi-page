export default {
  plugins: {
    autoprefixer: {},
    'postcss-pxtorem': {
      rootValue: 37.5, // 设计稿宽度的 1/10，比如设计稿是 375px
      unitPrecision: 5, // rem 精确到小数点多少位
      propList: ['*'], // 指定转换的css属性的单位，*代表全部css属性的单位都进行转换
      selectorBlackList: ['.ignore'], // 指定不转换为视窗单位的类名
      replace: true, // 是否转换后直接更换属性值
      mediaQuery: false, // 是否在媒体查询的css代码中也进行转换，默认false
      minPixelValue: 2, // 设置最小的转换数值，如果为1的话，只有大于1的值才会被转换
      exclude: /node_modules/i, // 设置忽略文件，用正则做目录名匹配
    },
  },
};
