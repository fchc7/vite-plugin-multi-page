# 🏗️ vite-plugin-multi-page 架构原理

## 📖 概述

`vite-plugin-multi-page` 是一个专为 Vite 设计的多页面应用插件，通过智能文件路由和灵活的构建策略，让开发者能够轻松构建复杂的多页面应用。

## 🎯 核心设计理念

### 1. 约定优于配置

- **自动发现页面**：扫描 `src/pages/**/*.{ts,js}` 自动识别页面入口
- **智能路由**：基于文件路径自动生成页面路由
- **零配置启动**：开箱即用，最小化配置要求

### 2. 配置的渐进增强

- **默认策略**：提供合理的默认构建配置
- **页面级配置**：支持每个页面独立配置
- **构建策略**：预定义多种构建策略供复用

### 3. 开发与构建的一致性

- **配置统一**：开发模式与构建模式使用相同的配置逻辑
- **环境变量同步**：确保开发和生产环境变量一致
- **模板匹配**：开发和构建使用相同的模板选择逻辑

## 🏗️ 系统架构

```
vite-plugin-multi-page
├── 入口文件 (index.ts)          # 插件主入口，协调各模块
├── 类型定义 (types.ts)          # 完整的 TypeScript 类型系统
├── 文件发现 (file-filter.ts)    # 扫描和过滤页面文件
├── 构建配置 (build-config.ts)   # 构建时配置生成
├── 开发服务器 (dev-server.ts)   # 开发时路由和模板处理
└── 工具函数 (utils.ts)          # 通用工具和日志系统
```

## 🔍 核心工作流程

### 1. 插件初始化阶段

```typescript
viteMultiPage({
  entry: 'src/pages/**/*.{ts,js}',
  buildStrategies: {
    /* 策略定义 */
  },
  pageConfigs: {
    /* 页面配置 */
  },
});
```

**执行流程：**

1. 解析插件选项
2. 创建调试日志器
3. 初始化临时文件管理
4. 准备页面映射表

### 2. 文件发现阶段

```typescript
// file-filter.ts
export function filterEntryFiles(files, entry, exclude, log) {
  return files
    .filter(file => !isExcluded(file, exclude))
    .map(file => ({
      name: extractPageName(file),
      file: file,
    }));
}
```

**发现逻辑：**

- 使用 `glob` 扫描匹配模式
- 排除指定的文件（如 `main.ts`）
- 提取页面名称（基于文件路径）
- 生成页面映射关系

### 3. 配置解析阶段

#### 页面配置匹配

支持三种配置方式：

**3.1 函数配置（最灵活）**

```typescript
pageConfigs: context => {
  const { pageName, filePath, relativePath } = context;

  if (pageName.startsWith('admin')) {
    return {
      strategy: 'default',
      template: 'admin.html',
      define: { 'process.env.APP_TYPE': '"admin"' },
    };
  }

  return { strategy: 'default' };
};
```

**3.2 对象配置（模式匹配）**

```typescript
pageConfigs: {
  'admin*': {                    // glob 模式匹配
    strategy: 'admin',
    template: 'admin.html'
  },
  'mobile-app': {
    strategy: 'mobile',
    match: ['**/mobile/**'],     // 路径模式匹配
    template: 'mobile.html'
  }
}
```

**3.3 精确匹配**

```typescript
pageConfigs: {
  'home': { template: 'home.html' },
  'about': { template: 'about.html' }
}
```

#### 构建策略系统

**策略定义：**

```typescript
buildStrategies: {
  default: {
    viteConfig: {
      define: { 'process.env.BUILD_TYPE': '"modern"' },
      css: { devSourcemap: true }
    },
    build: {
      target: 'es2015',
      minify: 'esbuild',
      sourcemap: true
    },
    output: {
      format: 'es',
      entryFileNames: 'assets/[name]-[hash].js'
    }
  },

  mobile: {
    viteConfig: {
      css: { devSourcemap: true },
      optimizeDeps: { include: ['mobile-utils'] }
    },
    build: {
      target: 'es2018',
      chunkSizeWarningLimit: 300
    }
  }
}
```

### 4. 开发模式工作流程

#### 4.1 配置应用 (config 钩子)

```typescript
config(config, { command }) {
  if (command === 'serve') {
    // 1. 应用基础开发配置
    createDevConfig({ entry, exclude }, log);

    // 2. 收集页面策略
    const strategiesToApply = collectPageStrategies();

    // 3. 应用构建策略到开发配置
    strategiesToApply.forEach(strategy => {
      applyStrategyToDevConfig(config, strategy);
    });
  }
}
```

#### 4.2 开发服务器配置 (configureServer 钩子)

```typescript
configureServer(server) {
  // 1. 扫描页面文件
  const pageMap = createPageMap();

  // 2. 设置中间件
  server.middlewares.use((req, res, next) => {
    const pageName = extractPageFromUrl(req.url);

    if (pageMap.has(pageName)) {
      const pageInfo = pageMap.get(pageName);
      const template = selectTemplate(pageInfo.config);
      const html = generateHTML(template, pageInfo);

      res.setHeader('Content-Type', 'text/html');
      res.end(html);
      return;
    }

    next();
  });
}
```

**开发服务器特性：**

- **动态路由**：根据页面名称动态路由到对应文件
- **模板选择**：根据页面配置选择合适的 HTML 模板
- **环境变量注入**：在 HTML 中注入页面级环境变量
- **热更新支持**：配置变更时自动重新加载

### 5. 构建模式工作流程

#### 5.1 构建配置生成 (config 钩子)

```typescript
config(config, { command }) {
  if (command === 'build') {
    // 1. 扫描页面文件
    const entryFiles = scanEntryFiles();

    // 2. 分组页面策略
    const strategyGroups = groupPagesByStrategy(entryFiles);

    // 3. 生成构建入口
    const buildInput = generateBuildInput(strategyGroups);

    // 4. 应用构建策略
    applyBuildStrategy(config, buildInput);
  }
}
```

#### 5.2 HTML 文件处理

**临时文件管理：**

```typescript
// 构建前：为每个页面创建临时 HTML 文件
entryFiles.forEach(({ name, file }) => {
  const tempHtmlPath = `temp-${name}.html`;
  const html = processTemplate(template, file, pageConfig);

  fs.writeFileSync(tempHtmlPath, html);
  tempFiles.push(tempHtmlPath);
  pageMapping.set(tempHtmlPath, `${name}.html`);
});

// 构建后：重命名临时文件为最终文件名
writeBundle(options) {
  pageMapping.forEach((targetName, tempName) => {
    const tempPath = path.resolve(options.dir, tempName);
    const targetPath = path.resolve(options.dir, targetName);
    fs.renameSync(tempPath, targetPath);
  });
}

// 清理：删除临时文件
closeBundle() {
  tempFiles.forEach(file => fs.unlinkSync(file));
}
```

## 🔧 关键技术实现

### 1. 模式匹配算法

```typescript
function simpleMatch(pattern: string, text: string): boolean {
  const regexPattern = pattern
    .replace(/\*\*/g, '__DOUBLE_STAR__') // 保护 **
    .replace(/\*/g, '[^/]*') // * 匹配非路径分隔符
    .replace(/__DOUBLE_STAR__/g, '.*'); // ** 匹配任意字符

  return new RegExp(`^${regexPattern}$`).test(text);
}
```

**支持的模式：**

- `admin*` → 匹配 `admin`, `admin-dashboard`
- `**/mobile/**` → 匹配 `src/pages/mobile/app.ts`
- `mobile-*` → 匹配 `mobile-app`, `mobile-web`

### 2. 配置合并策略

```typescript
function applyBuildStrategy(config: any, strategy: BuildStrategy) {
  // 1. 深度合并 viteConfig
  if (strategy.viteConfig) {
    const { build, ...viteConfig } = strategy.viteConfig;
    mergeConfig(config, viteConfig);

    if (build) {
      config.build = { ...config.build, ...build };
    }
  }

  // 2. 应用专用配置
  if (strategy.define) {
    config.define = { ...config.define, ...strategy.define };
  }

  // 3. 应用输出配置
  if (strategy.output) {
    config.build.rollupOptions.output = {
      ...config.build.rollupOptions.output,
      ...strategy.output,
    };
  }
}
```

### 3. 开发与构建一致性保证

#### 配置统一性

```typescript
// 开发模式
const devStrategy = getPageStrategy(pageName, 'dev');
applyDevStrategy(config, devStrategy);

// 构建模式
const buildStrategy = getPageStrategy(pageName, 'build');
applyBuildStrategy(config, buildStrategy);
```

#### 环境变量同步

```typescript
// 构建时：注入到 Vite 配置
config.define = { ...config.define, ...pageDefine };

// 开发时：注入到 HTML
const defineScript = Object.entries(pageDefine)
  .map(([key, value]) => `window.${key} = ${JSON.stringify(value)};`)
  .join('\n');

html = html.replace('</head>', `<script>${defineScript}</script>\n</head>`);
```

## 🎨 使用场景与最佳实践

### 1. 企业级应用

```typescript
// 不同角色使用不同构建策略
pageConfigs: context => {
  if (context.relativePath.includes('/admin/')) {
    return {
      strategy: 'admin',
      template: 'admin.html',
      define: {
        'process.env.USER_ROLE': '"admin"',
        'process.env.API_BASE': '"https://admin-api.com"',
      },
    };
  }

  if (context.relativePath.includes('/customer/')) {
    return {
      strategy: 'customer',
      template: 'customer.html',
      define: {
        'process.env.USER_ROLE': '"customer"',
        'process.env.API_BASE': '"https://api.com"',
      },
    };
  }
};
```

### 2. 移动端适配

```typescript
buildStrategies: {
  mobile: {
    viteConfig: {
      css: {
        postcss: {
          plugins: [
            require('postcss-pxtorem')({
              rootValue: 37.5,
              propList: ['*']
            })
          ]
        }
      }
    },
    build: {
      target: 'es2018',
      chunkSizeWarningLimit: 300
    }
  }
}
```

### 3. 渐进式 Web 应用

```typescript
buildStrategies: {
  pwa: {
    viteConfig: {
      define: {
        'process.env.SW_ENABLED': 'true'
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'sw-runtime': ['workbox-runtime', 'workbox-precaching']
          }
        }
      }
    }
  }
}
```

## 🔄 扩展性设计

### 1. 插件系统

- **钩子机制**：支持在关键节点注入自定义逻辑
- **中间件支持**：开发服务器支持自定义中间件
- **配置转换**：支持配置预处理和后处理

### 2. 社区生态

- **预设策略**：提供常用场景的预设配置
- **插件集合**：与其他 Vite 插件的集成方案
- **脚手架工具**：快速创建多页面项目模板

## 🛠️ 性能优化

### 1. 构建性能

- **并行构建**：多策略分组并行处理
- **缓存机制**：文件扫描结果缓存
- **增量构建**：只重新构建变更的页面

### 2. 开发体验

- **快速热更新**：精确的模块依赖跟踪
- **智能错误提示**：配置错误的友好提示
- **调试工具**：详细的构建日志和分析

## 📈 未来规划

### 1. 功能增强

- **可视化配置**：图形化的配置管理界面
- **性能分析**：构建产物的详细分析报告
- **自动优化**：基于使用模式的自动配置优化

### 2. 生态集成

- **框架集成**：Vue、React、Svelte 的深度集成
- **工具链支持**：与主流工具链的无缝集成
- **云原生部署**：支持云平台的自动化部署

---

## 🎯 总结

`vite-plugin-multi-page` 通过以下核心原理实现了高效的多页面应用开发：

1. **智能文件发现**：自动扫描和识别页面入口
2. **灵活配置系统**：支持函数、对象、模式三种配置方式
3. **策略化构建**：预定义可复用的构建策略
4. **开发构建一致性**：确保开发和生产环境的配置一致
5. **渐进式增强**：从零配置到复杂定制的平滑过渡

这种设计让开发者能够：

- **快速上手**：零配置即可启动多页面开发
- **灵活定制**：根据实际需求精细化配置每个页面
- **高效维护**：通过策略复用减少配置冗余
- **平滑扩展**：随着项目复杂度增长逐步增强配置

插件的核心价值在于**简化复杂性**，让多页面应用的开发变得简单而高效。
