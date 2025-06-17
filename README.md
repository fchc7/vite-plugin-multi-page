# @fchc8/vite-plugin-multi-page

> English Documentation | [English Documentation](./README-EN.md)

一个强大的 Vite 插件，支持多页面应用开发，提供多策略构建、TypeScript 配置支持和命令行工具。

## 特性

- 🎯 **多页面支持**: 自动发现页面入口文件
- 🔧 **多策略构建**: 支持为不同页面配置不同的构建策略
- 📝 **TypeScript 配置**: 支持 TypeScript 配置文件
- 🚀 **CLI 工具**: 提供命令行批量构建工具
- 🔄 **热重载**: 开发服务器支持页面热重载
- 📦 **智能合并**: 自动合并多策略构建结果

## 安装

```bash
npm install @fchc8/vite-plugin-multi-page --save-dev
```

## 快速开始

### 1. 配置 Vite

在 `vite.config.ts` 中添加插件:

```typescript
import { defineConfig } from 'vite';
import { viteMultiPage } from '@fchc8/vite-plugin-multi-page';

export default defineConfig({
  plugins: [viteMultiPage()],
});
```

### 2. 创建配置文件（可选）

插件提供了合理的默认配置，你可以选择：

**选项 A：无配置文件（使用默认配置）**

- 自动扫描 `src/pages/**/*.{ts,js}` 下的页面文件，目录下含有文件名main的文件作为页面入口
- 使用 `index.html` 作为模板
- 创建默认构建策略

**选项 B：最简配置**

创建 `multipage.config.ts`：

```typescript
import { defineConfig } from '@fchc8/vite-plugin-multi-page';

// 使用所有默认值
export default defineConfig(() => ({}));
```

**选项 C：完整配置**

创建 `multipage.config.ts` 或 `multipage.config.js`:

```typescript
import { defineConfig } from 'vite-plugin-multi-page';

// 方式1: 对象配置（推荐）
export default defineConfig({
  entry: 'src/pages/**/*.{ts,js}',
  template: 'index.html',
  strategies: {
    // 策略配置...
  },
});

// 方式2: 函数配置（动态配置）
export default defineConfig(context => {
  const { mode, command, isCLI } = context;
  const isProduction = mode === 'production';

  return {
    // 页面入口匹配规则
    entry: 'src/pages/**/*.{ts,js}',

    // HTML 模板
    template: 'index.html',

    // 模板占位符
    placeholder: '{{ENTRY_FILE}}',

    // 排除的文件
    exclude: ['src/shared/**/*.ts'],

    // 调试模式
    debug: !isProduction || isCLI,

    // 构建策略
    strategies: {
      default: {
        define: {
          IS_DEFAULT: true,
          API_BASE: isProduction ? '"https://api.example.com"' : '"http://localhost:3001/api"',
        },
        build: {
          sourcemap: !isProduction,
          minify: isProduction ? 'esbuild' : false,
        },
      },

      mobile: {
        define: {
          IS_MOBILE: true,
          API_BASE: isProduction
            ? '"https://mobile-api.example.com"'
            : '"http://localhost:3001/mobile-api"',
        },
        build: {
          target: ['es2015', 'chrome58', 'safari11'],
          minify: isProduction ? 'terser' : false,
        },
      },
    },

    // 页面配置函数
    pageConfigs: context => {
      // 根据文件路径判断应用的策略
      if (context.relativePath.includes('/mobile/')) {
        return {
          strategy: 'mobile',
          define: {
            PAGE_NAME: context.pageName,
            MOBILE_PAGE: true,
          },
        };
      }

      // 默认策略
      return {
        strategy: 'default',
        define: {
          PAGE_NAME: context.pageName,
          DEFAULT_PAGE: true,
        },
      };
    },
  };
});
```

### 3. 创建页面文件

按照约定创建页面文件:

**注意**：即使使用空配置 `defineConfig({})`，插件也会自动使用默认策略处理所有页面，确保最大兼容性。

```
src/pages/
├── home.js                    # → /home.html
├── about.js                   # → /about.html
├── mobile/
│   └── main.ts               # → /mobile.html (移动端策略)
└── admin/
    └── main.ts               # → /admin.html
```

## 页面发现规则

插件按照以下规则发现页面入口:

1. **第一级文件** (优先级 1): `src/pages/home.js` → `/home.html`
2. **目录main文件** (优先级 2): `src/pages/mobile/main.ts` → `/mobile.html`

**目录优先原则**: 如果同时存在 `src/pages/about.js` 和 `src/pages/about/main.ts`，将使用 `src/pages/about/main.ts`。

## 构建策略

### 策略配置

策略配置支持所有 Vite 配置选项:

```typescript
strategies: {
  mobile: {
    define: {
      IS_MOBILE: true,
    },
    build: {
      target: ['es2015'],
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
        },
      },
    },
    // 其他 Vite 配置...
  },
}
```

### 构建产物合并策略

通过 `merge` 选项控制构建产物的组织方式：

```typescript
export default defineConfig({
  // ... 其他配置
  merge: 'all' | 'page',
});
```

#### 可用模式

- **`all`** (默认): 所有HTML文件放在根目录，资源合并到 `/dist/assets/`

  ```
  dist/
  ├── home.html
  ├── about.html
  ├── mobile.html
  └── assets/
      ├── home-xxx.js
      ├── about-xxx.js
      └── shared-resource.svg
  ```

- **`page`**: 每个页面独立打包，各自拥有完整的资源副本
  ```
  dist/
  ├── home/
  │   ├── index.html
  │   ├── assets/
  │   │   ├── home-xxx.js
  │   │   └── button-loading.svg
  │   └── images/
  ├── about/
  │   ├── index.html
  │   ├── assets/
  │   │   ├── about-xxx.js
  │   │   └── button-loading.svg
  │   └── images/
  └── mobile/
      ├── index.html
      ├── assets/
      │   ├── mobile-xxx.js
      │   └── button-loading.svg
      └── images/
  ```

#### Page模式的优势

- ✅ **完全独立**: 每个页面目录包含所有必需资源，可独立部署
- ✅ **避免冲突**: 彻底解决了共享资源的归属问题
- ✅ **简洁命名**: 资源文件使用干净的文件名，无页面前缀
- ✅ **部署友好**: 支持CDN分发、微前端等架构模式

> **注意**:
>
> - Page模式会为每个页面创建资源副本，可能增加总体构建产物大小
> - 适合需要独立部署或有严格资源隔离需求的场景
> - `public/` 目录中的静态资源会自动复制到每个页面目录中

### 页面策略分配

通过 `pageConfigs` 函数为页面分配策略:

```typescript
pageConfigs: context => {
  const { pageName, relativePath } = context;

  if (relativePath.includes('/mobile/')) {
    return { strategy: 'mobile' };
  }

  if (pageName.startsWith('admin')) {
    return { strategy: 'admin' };
  }

  return { strategy: 'default' };
};
```

## 命令行工具

### 批量构建

```bash
# 构建所有策略
npx vite-mp

# 传递额外的 Vite 参数
npx vite-mp --host --port 3000

# 启用调试模式
npx vite-mp --debug
```

### 开发服务器

```bash
# 启动开发服务器 (所有页面)
npm run dev

# 只显示特定策略的页面
npm run dev -- --strategy mobile
```

## 使用示例

### Page模式独立部署

配置Page模式，每个页面获得完整的独立资源：

```typescript
// multipage.config.ts
export default defineConfig({
  entry: 'src/pages/**/*.{ts,js}',
  template: 'index.html',
  merge: 'page', // 启用Page模式
  strategies: {
    default: {
      build: {
        sourcemap: false,
        minify: 'esbuild',
      },
    },
    mobile: {
      build: {
        target: ['es2015'],
        minify: 'terser',
      },
    },
  },
  pageConfigs: context => {
    if (context.relativePath.includes('/mobile/')) {
      return { strategy: 'mobile' };
    }
    return { strategy: 'default' };
  },
});
```

构建结果：每个页面都有独立的资源文件，避免共享资源缺失问题。

### 共享资源处理

在Page模式下，共享资源（如图标、样式文件）会被复制到每个页面目录：

```typescript
// src/pages/about/main.ts
import buttonIcon from '../button-loading.svg'; // 共享资源

// src/pages/mobile/main.ts
import buttonIcon from '../button-loading.svg'; // 相同的共享资源
```

构建后两个页面都会有自己的资源副本：

- `dist/about/assets/button-loading-xxx.svg`
- `dist/mobile/assets/button-loading-xxx.svg`

## 环境变量

- `VITE_BUILD_STRATEGY`: 指定单个策略构建
- `VITE_MULTI_PAGE_BUILD_SINGLE_PAGE`: 指定单个页面构建（Page模式内部使用）
- `VITE_MULTI_PAGE_STRATEGY`: 当前构建策略（自动设置）
- `VITE_MULTI_PAGE_CURRENT_PAGE`: 当前页面名称（Page模式下自动设置）
- `VITE_MULTI_PAGE_MERGE_MODE`: 当前合并模式（Page模式下自动设置）
- `IS_MOBILE`: 移动端标识 (在 define 中配置)
- `API_BASE`: API 基础地址 (在 define 中配置)

### Page模式环境变量注入

在Page模式（`merge: 'page'`）下，您可以通过 `pageEnvs` 函数为每个页面注入特定的环境变量：

```typescript
// multipage.config.ts
export default defineConfig({
  merge: 'page', // 启用Page模式

  // 页面环境变量注入函数
  pageEnvs: context => {
    const { pageName, strategy, relativePath } = context;

    // 返回该页面特定的环境变量
    const envs: Record<string, string> = {
      VITE_CURRENT_PAGE_NAME: pageName,
      VITE_CURRENT_STRATEGY: strategy || 'default',
      VITE_BUILD_TIMESTAMP: new Date().toISOString(),
    };

    // 根据页面路径添加特定变量
    if (relativePath.includes('/mobile/')) {
      envs.VITE_IS_MOBILE = 'true';
      envs.VITE_API_URL = 'https://mobile-api.example.com';
    }

    return envs;
  },
});
```

#### 页面上下文 (PageContext)

`pageEnvs` 函数接收一个页面上下文对象，包含以下信息：

- `pageName`: 页面名称 (如 'home', 'mobile')
- `strategy`: 分配给该页面的策略名称
- `filePath`: 页面入口文件的绝对路径
- `relativePath`: 页面入口文件的相对路径

#### 使用场景

1. **页面特定的API配置**: 为不同页面设置不同的API端点
2. **页面标识**: 在运行时识别当前页面类型
3. **构建信息**: 注入构建时间戳、版本号等信息
4. **功能开关**: 为特定页面启用或禁用功能

#### 在代码中使用

注入的环境变量可以在代码中通过 `import.meta.env` 访问：

```typescript
// src/pages/mobile/main.ts
console.log('当前页面:', import.meta.env.VITE_CURRENT_PAGE_NAME);
console.log('当前策略:', import.meta.env.VITE_CURRENT_STRATEGY);
console.log('构建时间:', import.meta.env.VITE_BUILD_TIMESTAMP);

if (import.meta.env.VITE_IS_MOBILE === 'true') {
  // 移动端特定逻辑
}
```

**注意**: `pageEnvs` 功能仅在Page模式（`merge: 'page'`）下生效，因为only这种模式下每个页面是独立构建的。

## TypeScript 支持

插件完全支持 TypeScript 配置文件:

```typescript
// multipage.config.ts
import type { ConfigFunction } from '@fchc8/vite-plugin-multi-page';

const config: ConfigFunction = context => {
  return {
    entry: 'src/pages/**/*.{ts,js}',
    // ... 其他配置
  };
};

export default config;
```

## API 参考

### 配置选项

| 选项          | 类型                       | 默认值                     | 描述                               |
| ------------- | -------------------------- | -------------------------- | ---------------------------------- |
| `entry`       | `string`                   | `'src/pages/**/*.{ts,js}'` | 页面入口匹配规则                   |
| `template`    | `string`                   | `'index.html'`             | HTML 模板文件                      |
| `placeholder` | `string`                   | `'{{ENTRY_FILE}}'`         | 模板占位符                         |
| `exclude`     | `string[]`                 | `[]`                       | 排除的文件模式                     |
| `debug`       | `boolean`                  | `false`                    | 启用调试日志                       |
| `merge`       | `'all' \| 'page'`          | `'all'`                    | 构建产物合并策略                   |
| `strategies`  | `Record<string, Strategy>` | `{}`                       | 构建策略配置                       |
| `pageConfigs` | `Function \| Object`       | `{}`                       | 页面配置                           |
| `pageEnvs`    | `Function`                 | `() => null`               | 页面环境变量注入函数（仅Page模式） |

### 工具函数

```typescript
import { defineConfig, defineConfigTransform } from '@fchc8/vite-plugin-multi-page';

// 定义配置
export default defineConfig(context => ({
  // 配置选项
}));

// 配置转换
const transform = defineConfigTransform((config, context) => {
  // 修改配置
  return config;
});
```

## 示例项目

查看 [example](./example) 目录获取完整的示例项目。

## 许可证

MIT License
