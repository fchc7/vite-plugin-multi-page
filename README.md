# vite-plugin-multi-page

> [English Documentation](./README-EN.md) | 中文文档

一个强大的 Vite 插件，用于构建多页面应用程序，支持智能文件路由和多种构建策略。

## ✨ 特性

- 🚀 **自动页面发现**：基于文件模式自动扫描和配置入口页面
- 🎯 **多构建策略**：为不同页面配置不同的构建选项和优化策略
- 🧩 **灵活配置**：支持对象配置、函数配置和模式匹配
- 📱 **响应式模板**：不同页面可使用不同的 HTML 模板
- 🔧 **完整 Vite 集成**：继承所有 Vite 配置选项
- 🌍 **环境变量支持**：页面级和策略级环境变量定义
- 🎨 **开发友好**：详细的调试日志和热重载支持

## 📦 安装

```bash
npm install @fchc8/vite-plugin-multi-page
# 或
yarn add @fchc8/vite-plugin-multi-page
# 或
pnpm add @fchc8/vite-plugin-multi-page
```

## 🚀 快速开始

### 基础用法

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import viteMultiPage from '@fchc8/vite-plugin-multi-page';

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: 'src/pages/**/*.{ts,js}',
      template: 'index.html',
      exclude: ['src/main.ts'],
      debug: true,
    }),
  ],
});
```

### 项目结构示例

```
project/
├── src/
│   └── pages/
│       ├── home.ts          → /home.html
│       ├── about.ts         → /about.html
│       ├── admin/
│       │   └── dashboard.ts → /dashboard.html
│       └── mobile/
│           └── app.js       → /app.html
├── index.html
├── admin.html
└── mobile.html
```

## 🎯 高级配置

### 多构建策略

```typescript
import { defineConfig } from 'vite';
import viteMultiPage from '@fchc8/vite-plugin-multi-page';

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: 'src/pages/**/*.{ts,js}',

      // 定义构建策略
      buildStrategies: {
        // 现代浏览器策略
        default: {
          viteConfig: {
            define: {
              'process.env.BUILD_TYPE': '"modern"',
            },
          },
          output: {
            format: 'es',
            entryFileNames: 'assets/[name]-[hash].js',
          },
          build: {
            target: 'es2015',
            minify: 'esbuild',
            sourcemap: true,
          },
        },

        // 兼容模式策略
        legacy: {
          viteConfig: {
            define: {
              'process.env.BUILD_TYPE': '"legacy"',
            },
          },
          output: {
            format: 'iife',
            entryFileNames: 'legacy/[name].js',
          },
          build: {
            target: 'es5',
            minify: 'terser',
            sourcemap: false,
          },
        },

        // 移动端优化策略
        mobile: {
          viteConfig: {
            css: {
              devSourcemap: true,
            },
            optimizeDeps: {
              include: ['mobile-utils'],
            },
          },
          build: {
            target: 'es2018',
            chunkSizeWarningLimit: 300,
          },
        },
      },
    }),
  ],
});
```

### 函数配置

```typescript
viteMultiPage({
  entry: 'src/pages/**/*.{ts,js}',

  // 使用函数进行动态配置
  pageConfigs: context => {
    const { pageName, filePath, relativePath } = context;

    // 管理后台页面
    if (pageName.startsWith('admin')) {
      return {
        strategy: 'default',
        template: 'admin.html',
        define: {
          'process.env.API_BASE': '"https://admin-api.example.com"',
        },
      };
    }

    // 移动端页面
    if (relativePath.includes('/mobile/')) {
      return {
        strategy: 'mobile',
        template: 'mobile.html',
        define: {
          'process.env.API_BASE': '"https://mobile-api.example.com"',
        },
      };
    }

    // 默认配置
    return {
      strategy: 'default',
    };
  },
});
```

### 对象配置与模式匹配

```typescript
viteMultiPage({
  entry: 'src/pages/**/*.{ts,js}',

  pageConfigs: {
    // 精确匹配
    home: {
      strategy: 'default',
      template: 'home.html',
    },

    // 通配符匹配
    'admin*': {
      strategy: 'default',
      template: 'admin.html',
    },

    // 模式匹配
    'mobile-app': {
      strategy: 'mobile',
      match: ['**/mobile/**', '*mobile*'],
      template: 'mobile.html',
    },
  },
});
```

## 📋 配置选项

### MultiPageOptions

| 选项              | 类型                                               | 默认值                                 | 描述             |
| ----------------- | -------------------------------------------------- | -------------------------------------- | ---------------- |
| `entry`           | `string`                                           | `"src/**/*.{ts,js}"`                   | 入口文件匹配模式 |
| `template`        | `string`                                           | `"index.html"`                         | 默认 HTML 模板   |
| `exclude`         | `string[]`                                         | `["src/main.ts", "src/vite-env.d.ts"]` | 排除的文件       |
| `placeholder`     | `string`                                           | `"{{ENTRY_FILE}}"`                     | 模板中的占位符   |
| `debug`           | `boolean`                                          | `false`                                | 启用调试日志     |
| `buildStrategies` | `Record<string, BuildStrategy>`                    | `{}`                                   | 构建策略定义     |
| `pageConfigs`     | `Record<string, PageConfig> \| PageConfigFunction` | `{}`                                   | 页面配置         |

### BuildStrategy

```typescript
interface BuildStrategy {
  // 完整的 Vite 配置支持
  viteConfig?: Omit<UserConfig, 'plugins' | 'build'> & {
    build?: BuildOptions;
  };

  // 输出配置
  output?: {
    format?: 'es' | 'cjs' | 'umd' | 'iife';
    dir?: string;
    entryFileNames?: string;
    chunkFileNames?: string;
    assetFileNames?: string;
    globals?: Record<string, string>;
    external?: string | string[] | ((id: string) => boolean);
  };

  // 构建配置
  build?: {
    target?: string | string[];
    minify?: boolean | 'terser' | 'esbuild';
    sourcemap?: boolean | 'inline' | 'hidden';
    lib?: boolean | LibraryOptions;
    cssCodeSplit?: boolean;
    cssTarget?: string | string[];
    rollupOptions?: any;
    // ... 更多 Vite 构建选项
  };

  // 环境变量
  define?: Record<string, any>;

  // 别名配置
  alias?: Record<string, string>;

  // 服务器配置
  server?: ServerOptions;

  // CSS 配置
  css?: CSSOptions;

  // 依赖优化
  optimizeDeps?: DepOptimizationOptions;
}
```

### PageConfig

```typescript
interface PageConfig {
  strategy?: string; // 使用的构建策略
  template?: string; // 页面模板
  exclude?: string[]; // 排除规则
  define?: Record<string, any>; // 环境变量
  alias?: Record<string, string>; // 别名
  build?: Partial<BuildStrategy['build']>; // 构建配置
  match?: string | string[]; // 匹配模式
}
```

## 🌟 使用场景

### 1. 企业级多页应用

```typescript
buildStrategies: {
  admin: {
    viteConfig: {
      define: { 'process.env.APP_TYPE': '"admin"' }
    },
    build: {
      target: 'es2015',
      sourcemap: true
    }
  },

  public: {
    viteConfig: {
      define: { 'process.env.APP_TYPE': '"public"' }
    },
    build: {
      target: 'es5',
      minify: 'terser'
    }
  }
}
```

### 2. 移动端优化

```typescript
buildStrategies: {
  mobile: {
    viteConfig: {
      css: { devSourcemap: true },
      optimizeDeps: { include: ['@mobile/utils'] }
    },
    build: {
      target: 'es2018',
      chunkSizeWarningLimit: 300,
      cssCodeSplit: true
    }
  }
}
```

### 3. 组件库开发

```typescript
buildStrategies: {
  library: {
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'MyLibrary',
        formats: ['es', 'umd']
      },
      minify: false,
      sourcemap: true
    }
  }
}
```

## 📱 示例项目

查看 `example/` 目录获取完整的示例项目，包含：

- 管理后台页面（现代语法）
- 移动端应用（兼容语法）
- 组件库文档
- 不同的 HTML 模板
- 函数配置示例

### 快速开始

```bash
# 方法一：使用根目录脚本
npm run example:dev # 开发模式
npm run example:build # 构建
npm run example:preview # 预览构建结果

# 方法二：手动设置
npm run build # 先构建插件
cd example
npm install # 安装示例依赖
npm run dev # 运行开发服务器
```

### 示例页面

构建后访问以下页面：

- `/home.html` - 首页（默认策略）
- `/about.html` - 关于页面（默认策略）
- `/mobile.html` - 移动端页面（移动端模板）

## 🔧 开发

```bash
# 克隆项目
git clone https://github.com/fchc7/vite-plugin-multi-page.git
cd vite-plugin-multi-page

# 项目初始化
./scripts/setup.sh

# 开发模式
pnpm dev

# 类型检查
pnpm type-check

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 构建
pnpm build
```

## 🔄 Git Flow 工作流

我们使用 Git Flow 进行版本管理和发布：

### 功能开发

```bash
# 开始新功能
npm run git:feature start mobile-support

# 完成功能开发
npm run git:feature finish mobile-support
```

### 版本发布

```bash
# 开始发布准备
npm run git:release start 1.1.0

# 完成发布
npm run git:release finish 1.1.0

# 发布到 npm
npm run git:release publish minor
```

### 紧急修复

```bash
# 开始紧急修复
npm run git:hotfix start 1.0.1

# 完成修复
npm run git:hotfix finish 1.0.1
```

## 📦 发布流程

### 发布前检查

```bash
# 运行完整检查
npm run pre-release
```

### 直接发布

```bash
# 补丁版本 (1.0.0 -> 1.0.1)
npm run release:patch

# 次要版本 (1.0.0 -> 1.1.0)
npm run release:minor

# 主要版本 (1.0.0 -> 2.0.0)
npm run release:major

# 预发布版本
npm run release:beta  # Beta 版本
npm run release:alpha # Alpha 版本
```

### 自动化发布

推送标签会自动触发 GitHub Actions 发布：

```bash
git tag v1.1.0
git push origin v1.1.0
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Vite 官方文档](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [语义化版本](https://semver.org/lang/zh-CN/)
