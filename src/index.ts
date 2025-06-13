import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin } from 'vite';
import { mergeConfig } from 'vite';
import { setupDevMiddleware } from './dev-server';
import { generateBuildConfig } from './build-config';
import { loadUserConfig, hasCustomConfig } from './config-loader';
import { mergeWithDefaults } from './defaults';
import type { Options, ConfigTransformFunction } from './types';
import * as glob from 'glob';

// 导出类型和工具函数
export { defineConfig, defineConfigTransform } from './types';
export type {
  ConfigFunction,
  ConfigTransformFunction,
  PluginContext,
  PageContext,
  PageConfig,
} from './types';

/**
 * 重组构建产物，实现不同的merge模式
 */
function reorganizeAssets(
  distDir: string,
  mode: 'strategy' | 'page',
  options: Options,
  log: (...args: any[]) => void
) {
  const assetsDir = path.resolve(distDir, 'assets');

  if (!fs.existsSync(assetsDir)) {
    log('assets目录不存在，跳过重组');
    return;
  }

  // 分析所有HTML文件和它们的资源依赖
  const htmlFiles = fs
    .readdirSync(distDir)
    .filter(file => file.endsWith('.html'))
    .map(file => path.resolve(distDir, file));

  if (htmlFiles.length === 0) {
    log('未找到HTML文件，但仍需清理assets目录');

    // 即使没有HTML文件，在strategy/page模式下也要清理空的assets目录
    if ((mode === 'strategy' || mode === 'page') && fs.existsSync(assetsDir)) {
      try {
        fs.rmSync(assetsDir, { recursive: true, force: true });
        log('强制清理整个根目录assets目录 (strategy/page模式)');
      } catch (error) {
        log('清理根目录assets失败:', error);
      }
    }

    return;
  }

  const bundleInfo = new Map<string, { assets: string[]; targetDir: string; strategy?: string }>();
  const allAssetUsage = new Map<string, string[]>(); // 记录每个资源被哪些页面使用

  // 第一阶段：分析每个页面的资源依赖
  htmlFiles.forEach(htmlFile => {
    let fileName = path.basename(htmlFile, '.html');

    // 如果是临时文件名，提取真实的页面名
    if (fileName.startsWith('.temp.mp.')) {
      fileName = fileName.replace('.temp.mp.', '');
    }

    const htmlContent = fs.readFileSync(htmlFile, 'utf-8');
    const assets: string[] = [];

    // 匹配 src 和 href 属性中的 /assets/ 路径
    const assetRegex = /(?:src|href)="\/assets\/([^"]+)"/g;
    let match;

    while ((match = assetRegex.exec(htmlContent)) !== null) {
      const assetFile = match[1];
      assets.push(assetFile);

      // 记录这个资源被哪些页面使用
      if (!allAssetUsage.has(assetFile)) {
        allAssetUsage.set(assetFile, []);
      }
      allAssetUsage.get(assetFile)?.push(fileName);
    }

    // 确定目标目录
    let targetSubDir = '';
    if (mode === 'strategy') {
      // 这里需要从配置中推断策略，暂时使用页面名
      targetSubDir = 'default'; // 可以基于页面配置推断
    } else if (mode === 'page') {
      targetSubDir = fileName;
    }

    const targetDir = path.resolve(distDir, targetSubDir);
    bundleInfo.set(fileName, { assets, targetDir });
    log(`页面 ${fileName} 依赖资源:`, assets);
  });

  // 添加public目录资源处理
  log('第一阶段补充：分析public目录资源');
  const publicAssets = new Set<string>();
  const publicDir = path.resolve(process.cwd(), 'public');

  if (fs.existsSync(publicDir)) {
    const publicFiles = glob.sync('**/*', { cwd: publicDir, nodir: true });
    for (const file of publicFiles) {
      publicAssets.add(file);
      log(`发现public资源: ${file}`);
    }
  }

  // 第二阶段：识别共享资源
  allAssetUsage.forEach((users, assetFile) => {
    if (users.length > 1) {
      log(`共享资源 ${assetFile} 被页面使用:`, users);
    } else {
      log(`独占资源 ${assetFile} 仅被页面 ${users[0]} 使用`);
    }
  });

  // 第三阶段：智能匹配带前缀的资源文件并复制到对应的页面目录
  bundleInfo.forEach(({ assets, targetDir }, pageName) => {
    // 创建目标目录和assets子目录
    const pageAssetsDir = path.resolve(targetDir, 'assets');
    if (!fs.existsSync(pageAssetsDir)) {
      fs.mkdirSync(pageAssetsDir, { recursive: true });
    }

    // 复制该页面需要的所有资源文件
    assets.forEach(assetFile => {
      const sourcePath = path.resolve(assetsDir, assetFile);
      const targetPath = path.resolve(pageAssetsDir, assetFile);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        log(
          `复制资源文件到 ${pageName}: assets/${assetFile} -> ${path.relative(distDir, targetPath)}`
        );
      } else {
        log(`警告: 资源文件不存在: ${sourcePath}`);
      }
    });

    // 第三阶段补充：查找带有页面前缀的资源文件
    if (fs.existsSync(assetsDir)) {
      const allAssetFiles = fs.readdirSync(assetsDir);
      const pagePrefix = `mp${pageName}-`;

      // 查找属于这个页面的带前缀的文件
      const prefixedFiles = allAssetFiles.filter(file => file.startsWith(pagePrefix));

      prefixedFiles.forEach(prefixedFile => {
        // 检查该文件是否已经在assets列表中
        if (!assets.includes(prefixedFile)) {
          const sourcePath = path.resolve(assetsDir, prefixedFile);
          const targetPath = path.resolve(pageAssetsDir, prefixedFile);

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            log(
              `复制前缀匹配的资源文件到 ${pageName}: assets/${prefixedFile} -> ${path.relative(distDir, targetPath)}`
            );
          }
        }
      });
    }
  });

  log('第三阶段补充：处理public目录资源');
  // 在每个策略/页面目录中创建public资源的副本
  const uniqueTargetDirs = new Set<string>();
  bundleInfo.forEach(({ targetDir }) => {
    uniqueTargetDirs.add(targetDir);
  });

  for (const targetDir of uniqueTargetDirs) {
    for (const publicAsset of publicAssets) {
      const sourceFile = path.resolve(distDir, publicAsset);
      const targetFile = path.resolve(targetDir, publicAsset);

      if (fs.existsSync(sourceFile)) {
        const targetAssetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetAssetDir)) {
          fs.mkdirSync(targetAssetDir, { recursive: true });
        }

        fs.copyFileSync(sourceFile, targetFile);
        log(`复制public资源: ${publicAsset} -> ${path.relative(distDir, targetFile)}`);
      }
    }
  }

  // 第四阶段：移动HTML文件并更新资源引用
  bundleInfo.forEach(({ targetDir }, pageName) => {
    // 查找实际的HTML文件（可能是临时文件名或正常文件名）
    let originalHtmlPath = path.resolve(distDir, `${pageName}.html`);
    let actualPageName = pageName;

    // 如果正常文件名不存在，尝试临时文件名
    if (!fs.existsSync(originalHtmlPath)) {
      originalHtmlPath = path.resolve(distDir, `.temp.mp.${pageName}.html`);
      // 从临时文件名中提取页面名
      if (fs.existsSync(originalHtmlPath)) {
        actualPageName = pageName; // 保持原页面名
      }
    }

    if (fs.existsSync(originalHtmlPath)) {
      let htmlContent = fs.readFileSync(originalHtmlPath, 'utf-8');

      // 更新资源引用路径：/assets/ -> ./assets/
      htmlContent = htmlContent.replace(/(?:src|href)="\/assets\//g, match => {
        return match.replace('/assets/', './assets/');
      });

      // 确定最终的HTML文件路径（使用正常的文件名）
      let finalHtmlPath: string;
      if (mode === 'strategy') {
        finalHtmlPath = path.resolve(targetDir, `${actualPageName}.html`);
      } else if (mode === 'page') {
        finalHtmlPath = path.resolve(targetDir, 'index.html');
      } else {
        finalHtmlPath = originalHtmlPath;
      }

      // 写入更新后的HTML文件
      fs.writeFileSync(finalHtmlPath, htmlContent);

      // 删除原始文件（如果位置发生了变化）
      if (finalHtmlPath !== originalHtmlPath) {
        fs.unlinkSync(originalHtmlPath);
      }

      const relativePath = path.relative(distDir, finalHtmlPath);
      log(`按${mode}分组移动HTML文件: ${actualPageName}.html -> ${relativePath}`);
    } else {
      log(`警告: 未找到HTML文件: ${pageName}.html 或 .temp.mp.${pageName}.html`);
    }
  });

  // 第五阶段：清理原始assets目录
  if (fs.existsSync(assetsDir)) {
    // 在strategy或page模式下，强制清理整个根目录assets（因为资源已经复制到各个策略目录）
    if (mode === 'strategy' || mode === 'page') {
      try {
        fs.rmSync(assetsDir, { recursive: true, force: true });
        log('强制清理整个根目录assets目录 (strategy/page模式)');
      } catch (error) {
        log('清理根目录assets失败:', error);
      }
    } else {
      // 默认模式：只删除已处理的资源文件
      allAssetUsage.forEach((users, assetFile) => {
        const originalPath = path.resolve(assetsDir, assetFile);
        if (fs.existsSync(originalPath)) {
          fs.unlinkSync(originalPath);
          log(`清理原始资源文件: assets/${assetFile}`);
        }
      });

      // 如果assets目录为空则删除
      const finalRemainingFiles = fs.readdirSync(assetsDir);
      if (finalRemainingFiles.length === 0) {
        fs.rmdirSync(assetsDir);
        log('清理空的assets目录');
      } else {
        log('assets目录中还有未处理的文件:', finalRemainingFiles);
      }
    }
  }

  // 第五阶段补充：清理根目录的public资源（在strategy/page模式下）
  if ((mode === 'strategy' || mode === 'page') && publicAssets.size > 0) {
    log('第五阶段补充：清理根目录的public资源');
    publicAssets.forEach(publicAsset => {
      const rootPublicFile = path.resolve(distDir, publicAsset);
      if (fs.existsSync(rootPublicFile)) {
        try {
          fs.unlinkSync(rootPublicFile);
          log(`删除根目录public资源: ${publicAsset}`);
        } catch (error) {
          log(`删除根目录public资源失败: ${publicAsset}`, error);
        }
      }
    });

    // 尝试删除空的public相关目录结构
    publicAssets.forEach(publicAsset => {
      const rootPublicFile = path.resolve(distDir, publicAsset);
      let parentDir = path.dirname(rootPublicFile);

      // 逐级向上检查并删除空目录，直到dist根目录
      while (parentDir !== distDir && parentDir !== path.dirname(parentDir)) {
        try {
          if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
            fs.rmdirSync(parentDir);
            log(`删除空目录: ${path.relative(distDir, parentDir)}`);
            parentDir = path.dirname(parentDir);
          } else {
            break; // 目录不空或不存在，停止向上检查
          }
        } catch (error) {
          // 忽略删除目录失败的错误，可能是权限问题或目录不空
          break;
        }
      }
    });
  }
}

export function viteMultiPage(transform?: ConfigTransformFunction): Plugin {
  let resolvedOptions: Options;
  const tempFiles: string[] = [];
  let log: (...args: any[]) => void = () => {}; // 默认为空函数

  return {
    name: 'vite-multi-page',

    async configResolved(config) {
      // 加载用户配置文件（如果存在）
      let userConfig: Options | null = null;

      if (hasCustomConfig()) {
        userConfig = await loadUserConfig({
          mode: config.command === 'serve' ? 'development' : 'production',
          command: config.command,
          isCLI: false,
        });
      }

      // 合并用户配置和默认配置
      const mergedConfig = mergeWithDefaults(userConfig);

      // 应用配置变换函数（如果提供）
      resolvedOptions = transform
        ? transform(mergedConfig, {
            mode: config.command === 'serve' ? 'development' : 'production',
            command: config.command,
            isCLI: false,
          })
        : mergedConfig;

      // 设置debug日志
      const debug = resolvedOptions.debug ?? false;
      log = debug ? console.log.bind(console, '[vite-multi-page]') : () => {};

      log('Vite配置已解析, 使用配置:', {
        strategies: Object.keys(resolvedOptions.strategies || {}),
        entry: resolvedOptions.entry,
      });
    },

    async config(config, { command }) {
      // 处理开发模式下的策略参数
      if (command === 'serve') {
        // 检查命令行参数中的策略设置
        const args = process.argv;

        // 查找 --strategy=value 格式的参数
        const strategyArg = args.find(arg => arg.startsWith('--strategy='));
        if (strategyArg) {
          const strategy = strategyArg.split('=')[1];
          if (strategy) {
            process.env.VITE_MULTI_PAGE_STRATEGY = strategy;
          }
        }
        // 查找 --strategy value 格式的参数
        else {
          const strategyIndex = args.findIndex(arg => arg === '--strategy');
          if (strategyIndex !== -1 && strategyIndex + 1 < args.length) {
            const strategy = args[strategyIndex + 1];
            process.env.VITE_MULTI_PAGE_STRATEGY = strategy;
          }
        }

        // 确保有默认策略
        if (!process.env.VITE_MULTI_PAGE_STRATEGY) {
          process.env.VITE_MULTI_PAGE_STRATEGY = 'default';
        }
      }
      if (command === 'build') {
        // 在config钩子中临时加载配置，因为configResolved还没运行
        if (!resolvedOptions) {
          // 加载用户配置文件（如果存在）
          let userConfig: Options | null = null;

          if (hasCustomConfig()) {
            userConfig = await loadUserConfig({
              mode: 'production',
              command: 'build',
              isCLI: false,
            });
          }

          // 合并用户配置和默认配置
          const mergedConfig = mergeWithDefaults(userConfig);

          // 应用配置变换函数（如果提供）
          resolvedOptions = transform
            ? transform(mergedConfig, {
                mode: 'production',
                command: 'build',
                isCLI: false,
              })
            : mergedConfig;
          const debug = resolvedOptions.debug ?? false;
          log = debug ? console.log.bind(console, '[vite-multi-page]') : () => {};
        }

        log('配置构建模式');

        // 生成构建配置
        const forceBuildStrategy = process.env.VITE_MULTI_PAGE_STRATEGY;
        const buildConfigs = generateBuildConfig({
          entry: resolvedOptions.entry || 'src/pages/**/*.{ts,js}',
          exclude: resolvedOptions.exclude || [],
          template: resolvedOptions.template || 'index.html',
          placeholder: resolvedOptions.placeholder || '{{ENTRY_FILE}}',
          merge: resolvedOptions.merge || 'all',
          strategies: resolvedOptions.strategies || {},
          pageConfigs: resolvedOptions.pageConfigs || {},
          forceBuildStrategy,
        });

        // 应用构建配置中的策略（如果有forceBuildStrategy，buildConfigs只会包含该策略）
        const targetStrategy = Object.keys(buildConfigs)[0];

        if (targetStrategy && buildConfigs[targetStrategy]) {
          log(`应用构建策略: ${targetStrategy}`);
          const strategyConfig = buildConfigs[targetStrategy];

          // 使用Vite的mergeConfig进行智能深度合并
          const mergedConfig = mergeConfig(config, strategyConfig);

          // 将合并结果复制回config对象
          Object.assign(config, mergedConfig);

          log(`已应用策略 "${targetStrategy}" 的配置:`, {
            build: !!strategyConfig.build,
            define: !!strategyConfig.define,
            plugins: strategyConfig.plugins?.length || 0,
          });
        } else {
          log('未找到可用的构建策略，使用默认配置');

          throw new Error(
            '❌ 构建失败: 未找到任何构建策略\n\n' +
              '可能的原因：\n' +
              '  1. 配置文件返回空对象 {}\n' +
              '  2. 未找到匹配的入口文件\n' +
              '  3. 模板文件不存在\n' +
              '  4. 未配置 strategies 对象\n\n' +
              '最小配置示例：\n' +
              'export default () => ({\n' +
              '  entry: "src/pages/**/*.{ts,js}",\n' +
              '  template: "index.html",\n' +
              '  strategies: {\n' +
              '    default: {}\n' +
              '  }\n' +
              '});'
          );
        }
      }
    },

    configureServer(server) {
      if (server.config.command === 'serve') {
        log('配置开发服务器');

        // 处理开发模式下的策略参数
        // 从环境变量中获取策略，默认为 default
        const devStrategy = process.env.VITE_MULTI_PAGE_STRATEGY || 'default';

        log(`开发模式策略: ${devStrategy}`);

        setupDevMiddleware(
          server,
          {
            entry: resolvedOptions.entry || 'src/pages/**/*.{ts,js}',
            exclude: resolvedOptions.exclude || [],
            template: resolvedOptions.template || 'index.html',
            placeholder: resolvedOptions.placeholder || '{{ENTRY_FILE}}',
            strategies: resolvedOptions.strategies || {},
            pageConfigs: resolvedOptions.pageConfigs || {},
            devStrategy: devStrategy, // 传递策略给开发服务器
          },
          log
        );
      }
    },

    writeBundle(options: any) {
      // 只在构建模式下处理merge功能
      if (!resolvedOptions?.merge || resolvedOptions.merge === 'all') {
        // 默认模式：所有文件保持在根目录
        return;
      }

      const distDir = options.dir || 'dist';
      const merge = resolvedOptions.merge;

      log(`应用构建产物合并模式: ${merge}`);

      try {
        // 执行资源重组
        reorganizeAssets(distDir, merge, resolvedOptions, log);
      } catch (error) {
        log('资源重组失败:', error);
        throw error;
      }
    },

    buildEnd() {
      // 清理临时文件
      if (tempFiles.length > 0) {
        log(`清理 ${tempFiles.length} 个临时文件`);
        tempFiles.forEach(file => {
          try {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
              log(`删除临时文件: ${file}`);
            }
          } catch (error) {
            log(`删除临时文件失败: ${file}`, error);
          }
        });
        tempFiles.length = 0;
      }
    },
  };
}

/**
 * CLI工具专用的资源重组函数
 */
export function reorganizeAssetsInCLI(
  distDir: string,
  mode: 'strategy' | 'page',
  options: Options,
  log: (...args: any[]) => void
): void {
  return reorganizeAssets(distDir, mode, options, log);
}

export default viteMultiPage;
export type { Options } from './types';
export {
  generateBuildConfig,
  getAvailableStrategies,
  getViteOutputDirectory,
  cleanViteOutputDirectory,
} from './build-config';
export { mergeWithDefaults } from './defaults';
