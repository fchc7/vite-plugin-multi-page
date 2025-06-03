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
- ⚡ **开发构建一致性**：确保开发模式与构建模式使用相同的配置逻辑
- 🔄 **配置同步**：环境变量、模板选择、构建策略在开发和生产环境保持一致

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
      configStrategies: {
        // 现代浏览器策略
        default: {
          define: {
            'process.env.BUILD_TYPE': '"modern"',
          },
          build: {
            target: 'es2015',
            minify: 'esbuild',
            sourcemap: true,
            rollupOptions: {
              output: {
                format: 'es',
                entryFileNames: 'assets/[name]-[hash].js',
              },
            },
          },
        },

        // 兼容模式策略
        legacy: {
          define: {
            'process.env.BUILD_TYPE': '"legacy"',
          },
          build: {
            target: 'es5',
            minify: 'terser',
            sourcemap: false,
            rollupOptions: {
              output: {
                format: 'iife',
                entryFileNames: 'legacy/[name].js',
              },
            },
          },
        },

        // 移动端优化策略
        mobile: {
          css: {
            devSourcemap: true,
          },
          optimizeDeps: {
            include: ['mobile-utils'],
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
// 配置策略 - 简化版，直接继承Vite配置
interface ConfigStrategy extends Omit<UserConfig, 'plugins'> {
  // 直接使用Vite的标准配置结构
  // 例如:
  // - define: 定义环境变量
  // - build: 构建配置
  // - css: CSS配置
  // - server: 服务器配置
  // - optimizeDeps: 依赖优化
  // 等等...
}
```

> **注意**: 配置策略接口已简化，直接继承自Vite的`UserConfig`。这样您可以直接使用Vite的标准配置结构，无需额外的嵌套。旧版本中的`output`属性功能可以通过`build.rollupOptions.output`实现。

### PageConfig

```typescript
interface PageConfig {
  strategy?: string; // 指定使用哪个配置策略
  template?: string; // 指定使用的HTML模板
  define?: Record<string, any>; // 页面级环境变量
  match?: string | string[]; // 用于模式匹配
}
```

> **注意**: PageConfig接口已简化，只保留了实际使用的核心属性。移除了未使用的`exclude`、`alias`和`build`属性，使接口更加清晰和聚焦。

## ⚡ 开发与构建一致性

### 配置同步机制

本插件确保开发模式与构建模式使用**完全相同的配置逻辑**，避免开发环境和生产环境的差异问题。

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
