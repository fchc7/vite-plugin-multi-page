const config = context => {
  const { mode, command, isCLI } = context;
  const isProduction = mode === 'production';

  return {
    entry: 'src/pages/**/*.{ts,js}',
    template: 'index.html',
    placeholder: '{{ENTRY_FILE}}',
    exclude: ['src/shared/**/*.ts'],
    debug: !isProduction || isCLI,

    // 构建产物合并模式
    // 'all' - 所有HTML文件放在根目录 (默认)
    // 'strategy' - 按策略分组，如: /dist/mobile/page1.html
    // 'page' - 按页面分组，如: /dist/homePage/index.html
    merge: 'page',

    strategies: {
      default: {
        // 默认策略配置
        define: {
          IS_DEFAULT: true,
          API_BASE: isProduction ? '"https://api.example.com"' : '"http://localhost:3001/api"',
          BUILD_MODE: `"${mode}"`,
          IS_MOBILE: false,
        },
        build: {
          sourcemap: !isProduction,
          minify: isProduction ? 'esbuild' : false,
        },
        // 默认策略不使用特殊的CSS处理
      },

      mobile: {
        // 移动端策略配置 - 包含复杂的构建配置
        define: {
          IS_MOBILE: true,
          API_BASE: isProduction
            ? '"https://mobile-api.example.com"'
            : '"http://localhost:3001/mobile-api"',
          MOBILE_VERSION: '"1.0.0"',
          BUILD_MODE: `"${mode}"`,
        },
        build: {
          target: ['es2015', 'chrome58', 'safari11'],
          minify: isProduction ? 'terser' : false,
          sourcemap: !isProduction,
          ...(isProduction && {
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
              },
            },
            rollupOptions: {
              output: {
                manualChunks: {
                  vendor: ['vue'],
                },
              },
            },
          }),
        },

        // CSS处理通过 postcss.config.js 根据环境变量动态配置
      },

      tablet: {
        // 平板策略配置
        define: {
          IS_TABLET: true,
          API_BASE: isProduction
            ? '"https://tablet-api.example.com"'
            : '"http://localhost:3001/tablet-api"',
          TABLET_MODE: true,
          BUILD_MODE: `"${mode}"`,
        },
        build: {
          target: ['es2018', 'chrome70', 'safari12'],
          chunkSizeWarningLimit: 1000,
          sourcemap: !isProduction,
          minify: isProduction ? 'esbuild' : false,
          ...(isProduction && {
            rollupOptions: {
              output: {
                chunkFileNames: 'assets/tablet-[name]-[hash].js',
                entryFileNames: 'assets/tablet-[name]-[hash].js',
                assetFileNames: 'assets/tablet-[name]-[hash].[ext]',
              },
            },
          }),
        },
        // CSS处理通过 postcss.config.js 根据环境变量动态配置
        ...(command === 'serve' && {
          server: {
            port: 3001,
            proxy: {
              '/tablet-api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/tablet-api/, ''),
              },
            },
          },
        }),
      },
    },

    // 页面配置函数
    pageConfigs: context => {
      // 根据文件路径判断应用的策略
      if (context.relativePath.includes('/mobile/')) {
        return {
          strategy: 'mobile',
          define: {
            PAGE_NAME: `"${context.pageName}"`,
            MOBILE_PAGE: true,
          },
          template: context.pageName === 'mobile' ? 'mobile.html' : undefined,
        };
      }

      if (context.relativePath.includes('/tablet/')) {
        return {
          strategy: 'tablet',
          define: {
            PAGE_NAME: `"${context.pageName}"`,
            TABLET_PAGE: true,
          },
        };
      }

      // 默认策略
      return {
        strategy: 'default',
        define: {
          PAGE_NAME: `"${context.pageName}"`,
          DEFAULT_PAGE: true,
        },
      };
    },

    // 页面环境变量注入函数 (仅在 page 模式下生效)
    pageEnvs: context => {
      const { pageName, strategy } = context;

      // 为每个页面注入特定的环境变量
      const envs: Record<string, string> = {
        VITE_CURRENT_PAGE_NAME: pageName,
        VITE_CURRENT_STRATEGY: strategy || 'default',
        VITE_BUILD_TIMESTAMP: new Date().toISOString(),
      };

      // 根据页面类型添加特定环境变量
      if (context.relativePath.includes('/mobile/')) {
        envs.VITE_IS_MOBILE_BUILD = 'true';
        envs.VITE_MOBILE_API_URL = isProduction
          ? 'https://mobile-api.example.com'
          : 'http://localhost:3001/mobile-api';
      } else if (context.relativePath.includes('/tablet/')) {
        envs.VITE_IS_TABLET_BUILD = 'true';
        envs.VITE_TABLET_API_URL = isProduction
          ? 'https://tablet-api.example.com'
          : 'http://localhost:3001/tablet-api';
      } else {
        envs.VITE_IS_DESKTOP_BUILD = 'true';
        envs.VITE_DESKTOP_API_URL = isProduction
          ? 'https://api.example.com'
          : 'http://localhost:3001/api';
      }

      return envs;
    },
  };
};

export default config;
