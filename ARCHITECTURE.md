# vite-plugin-multi-page 架构设计

本文档详细介绍 vite-plugin-multi-page 插件的架构设计、工作原理和实现细节。

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    vite-plugin-multi-page                   │
├─────────────────────────────────────────────────────────────┤
│  配置加载器                 核心引擎                CLI工具   │
│  ┌─────────────────┐      ┌─────────────────┐   ┌─────────┐  │
│  │ config-loader   │─────▶│ index.ts        │   │ cli.ts  │  │
│  │ - TypeScript    │      │ - Vite 插件     │   │ - 批量  │  │
│  │ - JavaScript    │      │ - 钩子管理      │   │   构建  │  │
│  │ - esbuild 转译  │      │ - 配置合并      │   │ - 结果  │  │
│  └─────────────────┘      └─────────────────┘   │   合并  │  │
│                                   │              └─────────┘  │
│  ┌─────────────────┐              │                          │
│  │ 页面发现        │              │                          │
│  │ file-filter.ts  │◀─────────────┤                          │
│  │ - glob 匹配     │              │                          │
│  │ - 优先级规则    │              │                          │
│  └─────────────────┘              │                          │
│                                   │                          │
│  ┌─────────────────┐              │                          │
│  │ 构建配置生成    │              │                          │
│  │ build-config.ts │◀─────────────┤                          │
│  │ - 多策略配置    │              │                          │
│  │ - 页面分组      │              │                          │
│  └─────────────────┘              │                          │
│                                   │                          │
│  ┌─────────────────┐              │                          │
│  │ 开发服务器      │              │                          │
│  │ dev-server.ts   │◀─────────────┘                          │
│  │ - 中间件注册    │                                         │
│  │ - 页面路由      │                                         │
│  └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. 配置加载器 (config-loader.ts)

#### 设计原理

配置加载器负责处理多种格式的配置文件，支持 TypeScript 和 JavaScript。核心挑战是如何在运行时加载和执行 TypeScript 配置文件。

#### 实现方案

1. **文件类型检测**：按优先级检测配置文件

   ```
   multipage.config.js > multipage.config.mjs > multipage.config.ts
   ```

2. **TypeScript 处理**：使用 esbuild 进行实时转译

   ```typescript
   // 主要实现
   async function loadConfigFile(filePath: string) {
     if (filePath.endsWith('.ts')) {
       const code = await fs.promises.readFile(filePath, 'utf-8');
       const esbuild = await import('esbuild');
       const result = await esbuild.transform(code, {
         loader: 'ts',
         format: 'cjs',
         target: 'node16',
       });

       const tempModule = new Module(filePath);
       tempModule._compile(result.code, filePath);
       return tempModule.exports;
     }
   }
   ```

3. **备选方案**：简单文本替换作为降级处理
   ```typescript
   const jsCode = code
     .replace(/export\s+default\s+/, 'module.exports = ')
     .replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*/g, '')
     .replace(/:\s*[^=,})\]]+/g, '');
   ```

#### 技术选型

- **esbuild vs tsx vs ts-node**：
  - esbuild：速度最快，API 简单
  - tsx：依赖外部工具，可能不可用
  - ts-node：重量级，启动慢

### 2. 页面发现引擎 (file-filter.ts)

#### 发现规则

插件按照以下优先级发现页面入口：

1. **第一级文件** (优先级 1)

   ```
   src/pages/home.js → /home.html
   src/pages/about.js → /about.html
   ```

2. **目录 main 文件** (优先级 2)
   ```
   src/pages/mobile/main.ts → /mobile.html
   src/pages/admin/main.ts → /admin.html
   ```

#### 优先级处理

```typescript
interface CandidateFile extends EntryFile {
  priority: number; // 数字越大优先级越高
}

// 去重逻辑：同名页面保留高优先级的文件
const finalEntries = new Map<string, CandidateFile>();
candidates.forEach(candidate => {
  const existing = finalEntries.get(candidate.name);
  if (!existing || candidate.priority > existing.priority) {
    finalEntries.set(candidate.name, candidate);
  }
});
```

#### 路径处理算法

```typescript
function getPageNameFromPath(relativePath: string, entry: string): string {
  // 1. 提取相对于 entry 基础目录的路径
  const baseDir = getBaseDirectory(entry);
  const pathWithoutBase = path.relative(baseDir, relativePath);

  // 2. 解析路径组件
  const pathParts = pathWithoutBase.split(path.sep);

  // 3. 应用命名规则
  if (pathParts.length === 1) {
    // 第一级文件：home.js → home
    return path.basename(pathParts[0], path.extname(pathParts[0]));
  } else if (pathParts.length === 2 && pathParts[1].startsWith('main.')) {
    // 目录 main 文件：mobile/main.ts → mobile
    return pathParts[0];
  }
}
```

### 3. 构建配置生成器 (build-config.ts)

#### 多策略处理

构建配置生成器的核心职责是根据页面策略生成对应的 Vite 配置：

```typescript
function generateBuildConfig(options: BuildConfigOptions): Record<string, UserConfig> {
  // 1. 发现所有页面
  const entryFiles = filterEntryFiles(allFiles, entry, exclude);

  // 2. 分析页面策略
  const pageStrategies = new Map<string, string>();
  entryFiles.forEach(entryFile => {
    const pageConfig = getPageConfig(pageConfigs, pageContext);
    const strategyName = pageConfig?.strategy || 'default';
    pageStrategies.set(entryFile.name, strategyName);
  });

  // 3. 按策略分组页面
  const strategyPages = new Map<string, string[]>();
  pageStrategies.forEach((strategy, page) => {
    if (!strategyPages.has(strategy)) {
      strategyPages.set(strategy, []);
    }
    strategyPages.get(strategy)?.push(page);
  });

  // 4. 为每个策略生成配置
  const buildConfigs: Record<string, UserConfig> = {};
  strategyPages.forEach((pages, strategyName) => {
    buildConfigs[strategyName] = generateStrategyConfig(
      strategyName,
      pages,
      entryFiles,
      strategies[strategyName]
    );
  });

  return buildConfigs;
}
```

#### 配置合并策略

使用 Vite 的 `mergeConfig` 进行智能深度合并：

```typescript
function generateStrategyConfig(
  strategyName: string,
  pages: string[],
  entryFiles: EntryFile[],
  strategy: ConfigStrategy
): UserConfig {
  // 1. 基础配置
  const baseConfig: UserConfig = {
    build: {
      rollupOptions: {
        input: generateInputConfig(pages, entryFiles),
      },
    },
  };

  // 2. 策略配置
  const strategyConfig = { ...strategy };

  // 3. 页面级配置
  const pageDefines = collectPageDefines(pages, entryFiles, pageConfigs);

  // 4. 深度合并
  return mergeConfig(mergeConfig(baseConfig, strategyConfig), { define: pageDefines });
}
```

### 4. 开发服务器 (dev-server.ts)

#### 中间件架构

开发服务器通过 Vite 的中间件系统提供页面列表和路由功能：

```typescript
function setupDevMiddleware(server: ViteDevServer, options: DevServerOptions, log: Logger) {
  server.middlewares.use('/', (req, res, next) => {
    const url = req.url || '';

    // 根路径：显示页面列表
    if (url === '/') {
      return servePageList(req, res, entryFiles);
    }

    // 页面路径：提供对应的 HTML
    const pageName = extractPageName(url);
    if (entryFiles.some(f => f.name === pageName)) {
      return servePageHtml(req, res, pageName, options);
    }

    next();
  });
}
```

#### 策略过滤

支持在开发模式下只显示特定策略的页面：

```typescript
// 通过命令行参数过滤页面
if (cliStrategy) {
  entryFiles = entryFiles.filter(file => {
    const pageStrategy = appliedStrategies?.get(file.name);
    return !pageStrategy || pageStrategy === cliStrategy;
  });
}
```

### 5. CLI 工具 (cli.ts)

#### 并行构建架构

CLI 工具采用并行构建 + 结果合并的架构：

```typescript
async function main() {
  // 1. 加载配置，获取所有策略
  const options = await loadViteConfig();
  const strategies = getAvailableStrategies(options);

  // 2. 并行构建所有策略
  const buildPromises = strategies.map(strategy => buildStrategy(strategy, viteBuildArgs, debug));
  const results = await Promise.all(buildPromises);

  // 3. 合并构建结果
  await mergeResults(results, debug);

  // 4. 清理临时文件
  await cleanup(strategies, debug);
}
```

#### 结果合并算法

```typescript
async function mergeResults(results: BuildResult[], debug: boolean) {
  const finalDist = 'dist';
  const finalAssets = path.join(finalDist, 'assets');

  for (const result of results) {
    const strategyDist = `dist/${result.strategy}`;

    // 1. 处理 HTML 文件
    const htmlFiles = await glob('**/*.html', { cwd: strategyDist });
    for (const htmlFile of htmlFiles) {
      const targetPath = path.join(finalDist, path.basename(htmlFile));
      await fs.copy(path.join(strategyDist, htmlFile), targetPath);
    }

    // 2. 合并 assets
    const assetsDir = path.join(strategyDist, 'assets');
    if (await fs.pathExists(assetsDir)) {
      await mergeAssets(assetsDir, finalAssets, result.strategy);
    }
  }
}
```

#### 文件冲突处理

```typescript
async function mergeAssets(sourceDir: string, targetDir: string, strategy: string) {
  const files = await fs.readdir(sourceDir);

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    if (await fs.pathExists(targetPath)) {
      // 文件已存在，检查内容是否相同
      const sourceContent = await fs.readFile(sourcePath);
      const targetContent = await fs.readFile(targetPath);

      if (!sourceContent.equals(targetContent)) {
        // 内容不同，添加策略后缀
        const ext = path.extname(file);
        const name = path.basename(file, ext);
        const newName = `${name}-${strategy}${ext}`;
        const newTargetPath = path.join(targetDir, newName);
        await fs.copy(sourcePath, newTargetPath);
      }
      // 内容相同，跳过
    } else {
      // 文件不存在，直接复制
      await fs.copy(sourcePath, targetPath);
    }
  }
}
```

## 关键设计决策

### 1. 为什么选择 esbuild 而不是 tsx？

- **可靠性**：esbuild 是 npm 包，不依赖全局安装
- **性能**：esbuild 转译速度极快
- **兼容性**：不需要用户额外安装工具

### 2. 为什么使用 Module.\_compile 而不是 eval？

- **安全性**：Module.\_compile 在正确的模块上下文中执行
- **功能完整性**：支持 require、exports 等 Node.js 特性
- **调试友好**：保留原始文件路径信息

### 3. 为什么采用策略-页面的二级映射？

```
策略 → 页面组 → 构建配置
```

这种设计允许：

- 同一策略复用于多个页面
- 页面级别的配置覆盖
- 灵活的策略分配规则

### 4. 为什么选择并行构建而不是单次构建？

- **隔离性**：每个策略独立构建，避免配置污染
- **可靠性**：单个策略失败不影响其他策略
- **可扩展性**：容易添加新的策略处理逻辑

## 性能优化

### 1. 配置缓存

```typescript
const configCache = new Map<string, ConfigFunction>();

async function loadCustomConfig(): Promise<ConfigFunction | null> {
  const cacheKey = getCacheKey();
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)!;
  }

  const config = await actualLoadConfig();
  configCache.set(cacheKey, config);
  return config;
}
```

### 2. 增量页面发现

```typescript
// 只在文件系统变化时重新扫描
let cachedEntryFiles: EntryFile[] | null = null;
let lastScanTime = 0;

function filterEntryFiles(files: string[], entry: string, exclude: string[]) {
  const currentTime = Date.now();
  if (cachedEntryFiles && currentTime - lastScanTime < 1000) {
    return cachedEntryFiles;
  }

  cachedEntryFiles = actualFilterEntryFiles(files, entry, exclude);
  lastScanTime = currentTime;
  return cachedEntryFiles;
}
```

### 3. 并行资源处理

```typescript
// 并行处理多个策略的资源合并
const mergePromises = results.map(result => mergeStrategyAssets(result.strategy));
await Promise.all(mergePromises);
```

## 错误处理

### 1. 配置加载错误

- TypeScript 转译失败 → 降级到简单文本替换
- 简单替换失败 → 提示用户使用 JavaScript 配置
- 配置执行错误 → 显示详细错误信息和修复建议

### 2. 构建错误

- 单个策略构建失败 → 继续其他策略，最后汇总错误
- 所有策略失败 → 显示所有错误信息
- 部分策略成功 → 合并成功的结果，报告失败的策略

### 3. 资源合并错误

- 文件访问权限错误 → 显示权限修复建议
- 磁盘空间不足 → 提示清理空间
- 路径过长 → 建议缩短路径或使用软链接

## 扩展性设计

### 1. 插件系统

```typescript
interface MultiPagePlugin {
  name: string;
  configTransform?: (config: Options) => Options;
  pageFilter?: (pages: EntryFile[]) => EntryFile[];
  buildHook?: (strategy: string, config: UserConfig) => UserConfig;
}

// 支持注册插件
viteMultiPage({
  plugins: [customPlugin],
});
```

### 2. 自定义策略处理器

```typescript
interface StrategyHandler {
  name: string;
  shouldHandle: (strategy: string) => boolean;
  generateConfig: (strategy: string, pages: string[]) => UserConfig;
}

// 允许自定义策略处理逻辑
viteMultiPage({
  strategyHandlers: [customHandler],
});
```

### 3. 页面发现规则扩展

```typescript
interface PageDiscoveryRule {
  pattern: string;
  priority: number;
  nameExtractor: (filePath: string) => string;
}

// 支持自定义页面发现规则
viteMultiPage({
  discoveryRules: [customRule],
});
```

这种架构设计确保了插件的高性能、可扩展性和可维护性，同时提供了丰富的功能和良好的用户体验。
