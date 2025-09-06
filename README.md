# @fchc8/vite-plugin-multi-page

> English Documentation | [English Documentation](./README-EN.md)

一个强大的 Vite 插件，支持多页面应用开发，提供多策略构建、TypeScript 配置支持和命令行工具。

## 特性

- 🎯 **多页面支持**: 自动发现页面入口文件
- 🔧 **多策略构建**: 支持为不同页面配置不同的构建策略
- 📝 **TypeScript 配置**: 支持 TypeScript 配置文件
- 🚀 **CLI 工具**: 提供命令行批量构建工具
- 🔄 **热重载**: 开发服务器支持页面热重载
- 📦 **扁平化输出**: 支持扁平化构建结果，减少目录层级
- ⚡ **并发构建**: 支持控制并发构建数量，提升构建效率
- 🗂️ **资源去重**: 自动去重共享资源，减少构建产物大小

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
import { defineConfig } from '@fchc8/vite-plugin-multi-page';

export default defineConfig(context => {
  const { mode } = context;
  const isProduction = mode === 'production';

  return {
    // 页面入口匹配规则
    entry: 'src/pages/**/*.{ts,js}',

    // HTML 模板
    template: 'index.html',

    // 排除的文件
    exclude: ['src/shared/**/*.ts'],

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
      if (context.relativePath.includes('/mobile/')) {
        return { strategy: 'mobile' };
      }
      return { strategy: 'default' };
    },
  };
});
```

### 3. 创建页面文件

按照约定创建页面文件:

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

### 构建产物组织策略

#### 策略分组模式（默认）

默认情况下，构建结果按策略分组：

```
dist/
├── default/
│   ├── home.html
│   ├── about.html
│   ├── assets/
│   │   ├── home-xxx.js
│   │   ├── about-xxx.js
│   │   └── shared-resource.svg
│   └── images/
├── mobile/
│   ├── mobile.html
│   ├── assets/
│   │   ├── mobile-xxx.js
│   │   └── button-loading.svg
│   └── images/
└── tablet/
    ├── tablet.html
    ├── assets/
    │   ├── tablet-xxx.js
    │   └── button-loading.svg
    └── images/
```

#### 扁平化模式（默认）

扁平化输出默认启用。使用 `--no-flatten` 参数禁用它：

```bash
# 默认行为（扁平化输出）
npx vite-mp

# 禁用扁平化输出
npx vite-mp --no-flatten
```

扁平化后的结构：

```
dist/
├── home.html
├── about.html
├── mobile.html
├── tablet.html
├── assets/
│   ├── home-xxx.js
│   ├── about-xxx.js
│   ├── mobile-xxx.js
│   ├── tablet-xxx.js
│   └── shared-resource.svg
├── images/
├── favicon.ico
└── some.css
```

#### 扁平化模式的优势

- ✅ **简化部署**: 所有文件在根目录，部署更简单
- ✅ **资源去重**: 自动去重相同内容的资源文件
- ✅ **减少层级**: 避免深层嵌套的目录结构
- ✅ **统一管理**: 所有资源集中管理，便于CDN配置

### 并发构建控制

通过 `--concurrency` 参数控制并发构建数量：

```bash
# 默认并发数为3
npx vite-mp

# 设置并发数为1（串行构建）
npx vite-mp --concurrency 1

# 设置并发数为5（高并发）
npx vite-mp --concurrency 5
```

#### 并发构建的优势

- ⚡ **提升效率**: 多策略并行构建，减少总构建时间
- 🔧 **资源控制**: 避免同时构建过多策略导致系统资源过载
- 🎯 **灵活配置**: 根据机器性能调整并发数量
- 📊 **进度可见**: 调试模式下显示批次构建进度

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
# 构建所有策略（默认扁平化输出）
npx vite-mp

# 禁用扁平化输出结构
npx vite-mp --no-flatten

# 控制并发构建数量
npx vite-mp --concurrency 2

# 构建指定策略
npx vite-mp --strategy mobile,tablet

# 传递额外的 Vite 参数
npx vite-mp --host --port 3000

# 启用调试模式
npx vite-mp --debug

# 组合使用
npx vite-mp --concurrency 4 --debug
```

### 开发服务器

```bash
# 启动开发服务器 (所有页面)
npm run dev

# 只显示特定策略的页面
npm run dev -- --strategy mobile
```

### 静态资源预览

构建完成后，可以使用多种方式预览静态资源：

```bash
# 使用 serve 工具（推荐）
npx serve dist -p 3000

# 使用 http-server
npx http-server dist -p 3000

# 使用 Python 简单服务器
python -m http.server 3000 --directory dist

# 使用 Node.js 简单服务器
npx http-server dist
```

访问地址：

- 默认（扁平化模式）：`http://localhost:3000/home.html`
- 策略分组模式：`http://localhost:3000/default/home.html`（使用 `--no-flatten`）

## 使用示例

### 默认扁平化构建

插件默认使用扁平化输出构建多策略应用：

```bash
# 默认扁平化构建，所有文件在根目录
npx vite-mp

# 高并发扁平化构建
npx vite-mp --concurrency 5

# 只构建移动端和平板端策略（默认扁平化）
npx vite-mp --strategy mobile,tablet
```

构建结果：

```
dist/
├── home.html          # 默认策略页面
├── about.html         # 默认策略页面
├── mobile.html        # 移动端策略页面
├── tablet.html        # 平板端策略页面
├── assets/            # 统一资源目录
│   ├── home-xxx.js
│   ├── about-xxx.js
│   ├── mobile-xxx.js
│   ├── tablet-xxx.js
│   └── shared-resource.svg
├── images/
├── favicon.ico
└── some.css
```

### 并发构建优化

根据机器性能调整并发数：

```bash
# 低配置机器：串行构建
npx vite-mp --concurrency 1

# 高配置机器：高并发构建
npx vite-mp --concurrency 8

# 调试模式查看构建进度
npx vite-mp --concurrency 4 --debug
```

### 生产环境部署

```bash
# 生产环境构建（默认扁平化）
npx vite-mp --concurrency 4

# 构建后可直接部署到CDN
# 所有资源都在根目录，便于CDN配置
```

## 环境变量

- `VITE_MULTI_PAGE_STRATEGY`: 当前构建策略（自动设置）
- `IS_MOBILE`: 移动端标识 (在 define 中配置)
- `API_BASE`: API 基础地址 (在 define 中配置)

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

| 选项          | 类型                       | 默认值                     | 描述             |
| ------------- | -------------------------- | -------------------------- | ---------------- |
| `entry`       | `string`                   | `'src/pages/**/*.{ts,js}'` | 页面入口匹配规则 |
| `template`    | `string`                   | `'index.html'`             | HTML 模板文件    |
| `placeholder` | `string`                   | `'{{ENTRY_FILE}}'`         | 模板占位符       |
| `exclude`     | `string[]`                 | `[]`                       | 排除的文件模式   |
| `debug`       | `boolean`                  | `false`                    | 启用调试日志     |
| `strategies`  | `Record<string, Strategy>` | `{}`                       | 构建策略配置     |
| `pageConfigs` | `Function \| Object`       | `{}`                       | 页面配置         |

### CLI 参数

| 参数            | 类型      | 默认值  | 描述                       |
| --------------- | --------- | ------- | -------------------------- |
| `--flatten`     | `boolean` | `true`  | 启用扁平化输出结构（默认） |
| `--no-flatten`  | `boolean` | `false` | 禁用扁平化输出结构         |
| `--concurrency` | `number`  | `3`     | 并发构建数量               |
| `--strategy`    | `string`  | -       | 指定构建策略（可多次使用） |
| `--debug`       | `boolean` | `false` | 启用调试模式               |
| `--cwd`         | `string`  | -       | 指定工作目录               |
| `--help`        | `boolean` | `false` | 显示帮助信息               |

### 工具函数

```typescript
import { defineConfig } from '@fchc8/vite-plugin-multi-page';

// 定义配置
export default defineConfig(context => ({
  // 配置选项
}));
```

## 示例项目

查看 [example](./example) 目录获取完整的示例项目。

## 许可证

MIT License
