# vite-plugin-multi-page

一个用于构建多页面应用的 Vite 插件，支持智能文件路由和优先级系统。

## 🏗️ 模块化架构

插件现在采用模块化设计，更易于维护和扩展：

```
src/
├── index.ts          # 主插件入口
├── types.ts          # TypeScript类型定义
├── utils.ts          # 工具函数
├── file-filter.ts    # 文件过滤和优先级逻辑
├── dev-server.ts     # 开发服务器配置
└── build-config.ts   # 构建配置
```

## ⚡ 快速开始

### 安装

```bash
npm install vite-plugin-multi-page
```

### 配置

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import viteMultiPage from "vite-plugin-multi-page";

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: "src/pages/**/*.{ts,js}",
      template: "index.html",
      placeholder: "{{ENTRY_FILE}}",
    }),
  ],
});
```

## 📁 文件路由规则

插件支持两种文件结构，具有智能优先级系统：

### 1. 直接文件（优先级 1）

```
src/pages/
├── home.ts    -> /home
├── about.ts   -> /about
└── blog.ts    -> /blog
```

### 2. 目录 main 文件（优先级 2）

```
src/pages/
├── home/
│   └── main.ts     -> /home (覆盖home.ts)
├── about/
│   └── main.ts     -> /about (覆盖about.ts)
└── contact.ts      -> /contact
```

**优先级规则：** 目录中的`main.{ts,js}`文件会覆盖同名的直接文件。

## 🎨 HTML 模板

在 HTML 模板中使用占位符：

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="{{ENTRY_FILE}}"></script>
  </body>
</html>
```

## 🔧 配置选项

| 选项          | 类型       | 默认值                                 | 说明                     |
| ------------- | ---------- | -------------------------------------- | ------------------------ |
| `entry`       | `string`   | `"src/**/*.{ts,js}"`                   | 页面入口文件的 glob 模式 |
| `template`    | `string`   | `"index.html"`                         | HTML 模板文件路径        |
| `exclude`     | `string[]` | `["src/main.ts", "src/vite-env.d.ts"]` | 排除的文件               |
| `placeholder` | `string`   | `"{{ENTRY_FILE}}"`                     | 入口文件占位符           |
| `debug`       | `boolean`  | `false`                                | 是否启用调试日志         |

## 📦 示例项目

查看 `example/` 目录了解完整的使用示例：

```bash
cd example
npm install
npm run dev
```

### 示例文件结构

```
example/
├── src/pages/
│   ├── home.ts           # 首页（优先级1）
│   ├── about.ts          # 关于页面（优先级1）
│   └── contact/
│       └── main.ts       # 联系页面（优先级2）
├── index.html            # HTML模板
├── vite.config.ts        # Vite配置
└── package.json
```

**路由结果：**

- `/` 或 `/home` → `home.ts`
- `/about` → `about.ts`
- `/contact` → `contact/main.ts`

## 🚀 开发与构建

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run type-check
```

## 📄 许可证

MIT
