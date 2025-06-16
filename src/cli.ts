import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as glob from 'glob';
import type { Options } from './types';
import { getViteOutputDirectory } from './build-config';

interface BuildResult {
  strategy: string;
  success: boolean;
  error?: string;
  outputDir: string;
}

interface PageBuildResult {
  pageName: string;
  success: boolean;
  error?: string;
  outputDir: string;
}

/**
 * 解析命令行参数
 */
function parseArgs(): {
  viteBuildArgs: string[];
  debug: boolean;
  cwd?: string;
  strategies?: string[];
} {
  const args = process.argv.slice(2);
  const viteBuildArgs: string[] = [];
  let debug = false;
  let cwd: string | undefined;
  let strategies: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--debug') {
      debug = true;
    } else if (arg === '--cwd') {
      cwd = args[++i]; // 获取下一个参数作为目录
    } else if (arg === '--strategy') {
      const strategyArg = args[++i]; // 获取策略参数
      strategies = strategyArg.split(',').map(s => s.trim()); // 支持逗号分隔的多策略
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
使用方法: vite-mp [选项]

选项:
  --debug              启用调试模式
  --cwd <dir>          指定工作目录
  --strategy <list>    指定构建策略，支持逗号分隔多个策略
  --help, -h           显示帮助信息
  
其他所有参数将传递给 vite build 命令

示例:
  vite-mp                              # 构建所有策略
  vite-mp --strategy mobile            # 只构建mobile策略
  vite-mp --strategy mobile,tablet     # 构建mobile和tablet策略
  vite-mp --debug                      # 启用调试模式
  vite-mp --cwd example                # 在example目录运行
  vite-mp --mode production --debug    # 传递额外参数给vite
`);
      process.exit(0);
    } else if (arg !== 'build') {
      // 跳过 'build' 命令，因为我们会自动添加
      viteBuildArgs.push(arg);
    }
  }

  return { viteBuildArgs, debug, cwd, strategies };
}

/**
 * 加载多页面配置
 */
async function loadViteConfig(): Promise<Options> {
  const { loadUserConfig, hasCustomConfig } = await import('./config-loader');
  const { mergeWithDefaults } = await import('./defaults');

  // 加载用户配置（如果存在）
  let userConfig: Options | null = null;

  if (hasCustomConfig()) {
    userConfig = await loadUserConfig({
      mode: 'production',
      command: 'build',
      isCLI: true,
    });
  } else {
    console.log('ℹ️  未找到配置文件，使用默认配置');
  }

  // 合并用户配置和默认配置
  const finalConfig = mergeWithDefaults(userConfig);

  return finalConfig;
}

/**
 * 执行单个策略的构建
 */
function buildStrategy(
  strategy: string,
  viteBuildArgs: string[],
  debug: boolean
): Promise<BuildResult> {
  return new Promise(resolve => {
    const log = debug ? console.log.bind(console, `[${strategy}]`) : () => {};

    log(`开始构建策略: ${strategy}`);

    // 设置环境变量来指定构建策略
    const env = {
      ...process.env,
      VITE_MULTI_PAGE_STRATEGY: strategy,
    };

    // 构建命令
    const args = ['build', ...viteBuildArgs];

    log(`执行命令: npx vite ${args.join(' ')}`);

    const child = spawn('npx', ['vite', ...args], {
      stdio: debug ? 'inherit' : 'pipe',
      env,
      cwd: process.cwd(),
    });

    let errorOutput = '';

    if (!debug) {
      child.stderr?.on('data', data => {
        errorOutput += data.toString();
      });
    }

    child.on('close', code => {
      const success = code === 0;

      // 获取实际的输出目录
      const actualOutputDir = getViteOutputDirectory(viteBuildArgs);

      if (success) {
        log(`✅ 策略 ${strategy} 构建成功`);

        // 重命名HTML文件：.temp.mp.[name].html -> [name].html
        try {
          if (fs.existsSync(actualOutputDir)) {
            const files = fs.readdirSync(actualOutputDir);
            for (const file of files) {
              if (file.startsWith('.temp.mp.') && file.endsWith('.html')) {
                const oldPath = path.resolve(actualOutputDir, file);
                // 从 .temp.mp.[name].html 提取 [name]
                const name = file.replace(/^\.temp\.mp\./, '').replace(/\.html$/, '');
                const newName = `${name}.html`;
                const newPath = path.resolve(actualOutputDir, newName);
                fs.renameSync(oldPath, newPath);
                log(`重命名HTML: ${file} -> ${newName}`);
              }
            }
          }
        } catch (error) {
          log(`重命名HTML文件失败:`, error);
        }
      } else {
        log(`❌ 策略 ${strategy} 构建失败 (退出码: ${code})`);
        if (!debug && errorOutput) {
          console.error(`策略 ${strategy} 错误输出:`, errorOutput);
        }
      }

      resolve({
        strategy,
        success,
        error: success ? undefined : errorOutput || `构建失败，退出码: ${code}`,
        outputDir: actualOutputDir,
      });
    });

    child.on('error', error => {
      log(`❌ 策略 ${strategy} 构建出错:`, error.message);
      const actualOutputDir = getViteOutputDirectory(viteBuildArgs);
      resolve({
        strategy,
        success: false,
        error: error.message,
        outputDir: actualOutputDir,
      });
    });
  });
}

/**
 * 执行单个页面的构建（用于page模式）
 */
function buildSinglePage(
  pageName: string,
  viteBuildArgs: string[],
  debug: boolean
): Promise<PageBuildResult> {
  return new Promise(resolve => {
    const log = debug ? console.log.bind(console, `[${pageName}]`) : () => {};

    log(`开始构建页面: ${pageName}`);

    // 每个页面使用独立的临时输出目录
    const tempOutputDir = path.resolve(process.cwd(), `dist-temp-${pageName}`);

    // 设置环境变量来指定构建页面和输出目录
    const env = {
      ...process.env,
      VITE_MULTI_PAGE_BUILD_SINGLE_PAGE: pageName,
      VITE_MULTI_PAGE_TEMP_OUTPUT_DIR: tempOutputDir,
    };

    // 构建命令，添加 --outDir 参数
    const args = ['build', '--outDir', tempOutputDir, ...viteBuildArgs];

    log(`执行命令: npx vite ${args.join(' ')}`);

    const child = spawn('npx', ['vite', ...args], {
      stdio: debug ? 'inherit' : 'pipe',
      env,
      cwd: process.cwd(),
    });

    let errorOutput = '';

    if (!debug) {
      child.stderr?.on('data', data => {
        errorOutput += data.toString();
      });
    }

    child.on('close', code => {
      const success = code === 0;

      if (success) {
        log(`✅ 页面 ${pageName} 构建成功`);
      } else {
        log(`❌ 页面 ${pageName} 构建失败 (退出码: ${code})`);
        if (!debug && errorOutput) {
          console.error(`页面 ${pageName} 错误输出:`, errorOutput);
        }
      }

      resolve({
        pageName,
        success,
        error: success ? undefined : errorOutput || `构建失败，退出码: ${code}`,
        outputDir: tempOutputDir,
      });
    });

    child.on('error', error => {
      log(`❌ 页面 ${pageName} 构建出错:`, error.message);
      resolve({
        pageName,
        success: false,
        error: error.message,
        outputDir: tempOutputDir,
      });
    });
  });
}

/**
 * 合并构建结果
 */
async function mergeResults(results: BuildResult[], options: any, debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[merge]') : () => {};

  log('开始合并构建结果...');

  const mergeMode = options.merge || 'all';
  log(`使用合并模式: ${mergeMode}`);

  if (mergeMode === 'all') {
    // 默认模式：所有HTML文件放在根目录，assets合并
    await mergeResultsAll(results, debug);
  } else if (mergeMode === 'page') {
    // page 模式：使用插件的资源重组逻辑
    await mergeResultsWithReorganization(results, options, debug);
  }
}

/**
 * 合并页面构建结果（用于page模式）
 */
async function mergePageResults(
  results: PageBuildResult[],
  options: any,
  debug: boolean
): Promise<void> {
  const log = debug ? console.log.bind(console, '[merge]') : () => {};

  log('开始合并页面构建结果...');
  log('page模式：每个页面独立存放在自己的目录中');

  const distDir = path.resolve(process.cwd(), 'dist');

  // 创建临时目录用于重组（在当前目录而不是在dist目录下）
  const tempMergeDir = path.resolve(process.cwd(), '.temp-merge');
  if (fs.existsSync(tempMergeDir)) {
    fs.rmSync(tempMergeDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempMergeDir, { recursive: true });

  // 处理每个页面的构建结果
  for (const result of results) {
    if (!result.success) continue;

    const sourceDir = result.outputDir;

    if (!fs.existsSync(sourceDir)) {
      log(`警告: 页面构建目录不存在: ${sourceDir}`);
      continue;
    }

    log(`处理页面: ${result.pageName}`);

    // 创建页面临时目录
    const tempPageDir = path.resolve(tempMergeDir, result.pageName);
    fs.mkdirSync(tempPageDir, { recursive: true });

    // 复制所有文件到临时页面目录
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.resolve(sourceDir, entry.name);

      if (entry.isFile()) {
        if (entry.name.endsWith('.html')) {
          // HTML文件重命名为index.html
          const finalTargetPath = path.resolve(tempPageDir, 'index.html');
          fs.copyFileSync(sourcePath, finalTargetPath);
          log(`复制HTML: ${entry.name} -> ${result.pageName}/index.html`);
        } else {
          // 其他文件直接复制
          const targetPath = path.resolve(tempPageDir, entry.name);
          fs.copyFileSync(sourcePath, targetPath);
          log(`复制文件: ${entry.name} -> ${result.pageName}/${entry.name}`);
        }
      } else if (entry.isDirectory()) {
        // 目录递归复制，但不包含以页面名命名的子目录
        if (entry.name === result.pageName) {
          // 如果是同名子目录，复制其内容而非目录本身
          const subEntries = fs.readdirSync(sourcePath, { withFileTypes: true });
          for (const subEntry of subEntries) {
            const subSourcePath = path.resolve(sourcePath, subEntry.name);
            const subTargetPath = path.resolve(tempPageDir, subEntry.name);
            if (subEntry.isFile()) {
              fs.copyFileSync(subSourcePath, subTargetPath);
            } else if (subEntry.isDirectory()) {
              fs.cpSync(subSourcePath, subTargetPath, { recursive: true });
            }
          }
          log(`复制目录内容: ${entry.name}/* -> ${result.pageName}/`);
        } else {
          // 普通目录递归复制
          const targetPath = path.resolve(tempPageDir, entry.name);
          fs.cpSync(sourcePath, targetPath, { recursive: true });
          log(`复制目录: ${entry.name} -> ${result.pageName}/${entry.name}`);
        }
      }
    }
  }

  // 清理原dist目录并重命名临时目录
  const distBackup = path.resolve(path.dirname(distDir), '.dist-backup');

  // 清理可能存在的旧备份目录
  if (fs.existsSync(distBackup)) {
    fs.rmSync(distBackup, { recursive: true, force: true });
  }

  // 如果dist目录存在，备份它
  if (fs.existsSync(distDir)) {
    fs.renameSync(distDir, distBackup);
  }

  // 将临时目录重命名为最终目录
  try {
    fs.renameSync(tempMergeDir, distDir);
    log(`成功重命名临时目录到最终目录: ${tempMergeDir} -> ${distDir}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`重命名失败，尝试复制方式: ${errorMessage}`);
    // 如果重命名失败，使用复制方式
    fs.cpSync(tempMergeDir, distDir, { recursive: true });
    fs.rmSync(tempMergeDir, { recursive: true, force: true });
    log(`使用复制方式成功创建最终目录: ${distDir}`);
  }

  // 清理备份目录
  if (fs.existsSync(distBackup)) {
    fs.rmSync(distBackup, { recursive: true, force: true });
    log(`清理备份目录: ${distBackup}`);
  }

  // 清理各页面的临时构建目录
  for (const result of results) {
    if (result.outputDir && fs.existsSync(result.outputDir)) {
      fs.rmSync(result.outputDir, { recursive: true, force: true });
      log(`清理临时目录: ${result.outputDir}`);
    }
  }

  log('✅ 页面构建结果合并完成');
}

/**
 * 默认合并模式：所有HTML文件放在根目录
 */
async function mergeResultsAll(results: BuildResult[], debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[merge]') : () => {};

  const distDir = path.resolve(process.cwd(), 'dist');
  const assetsDir = path.resolve(distDir, 'assets');

  // 确保assets目录存在
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const htmlFiles: string[] = [];

  // 处理每个策略的构建结果
  for (const result of results) {
    if (!result.success) continue;

    const sourceDir = path.resolve(distDir, result.strategy);
    if (!fs.existsSync(sourceDir)) {
      log(`警告: 策略目录不存在: ${sourceDir}`);
      continue;
    }

    log(`处理策略: ${result.strategy}`);

    // 遍历策略目录中的所有文件
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.resolve(sourceDir, entry.name);

      if (entry.isFile()) {
        if (entry.name.endsWith('.html')) {
          // HTML文件直接复制到dist根目录
          const targetPath = path.resolve(distDir, entry.name);
          fs.copyFileSync(sourcePath, targetPath);
          htmlFiles.push(entry.name);
          log(`复制HTML: ${entry.name} -> dist/${entry.name}`);
        } else {
          // 其他文件复制到对应位置
          const targetPath = path.resolve(distDir, entry.name);
          fs.copyFileSync(sourcePath, targetPath);
          log(`复制文件: ${entry.name} -> dist/${entry.name}`);
        }
      } else if (entry.isDirectory() && entry.name === 'assets') {
        // assets目录需要合并
        const sourceAssetsDir = sourcePath;
        const assetEntries = fs.readdirSync(sourceAssetsDir, { withFileTypes: true });

        for (const assetEntry of assetEntries) {
          const assetSourcePath = path.resolve(sourceAssetsDir, assetEntry.name);
          const assetTargetPath = path.resolve(assetsDir, assetEntry.name);

          if (assetEntry.isFile()) {
            // 检查文件是否已存在，如果存在且内容不同，需要重命名
            if (fs.existsSync(assetTargetPath)) {
              const sourceContent = fs.readFileSync(assetSourcePath);
              const targetContent = fs.readFileSync(assetTargetPath);

              if (!sourceContent.equals(targetContent as any)) {
                // 文件内容不同，添加策略前缀
                const ext = path.extname(assetEntry.name);
                const baseName = path.basename(assetEntry.name, ext);
                const newName = `${baseName}-${result.strategy}${ext}`;
                const newTargetPath = path.resolve(assetsDir, newName);
                fs.copyFileSync(assetSourcePath, newTargetPath);
                log(`复制资源(重命名): ${assetEntry.name} -> assets/${newName}`);
              } else {
                log(`跳过重复资源: ${assetEntry.name}`);
              }
            } else {
              fs.copyFileSync(assetSourcePath, assetTargetPath);
              log(`复制资源: ${assetEntry.name} -> assets/${assetEntry.name}`);
            }
          } else if (assetEntry.isDirectory()) {
            // 递归复制子目录
            const subTargetDir = path.resolve(assetsDir, assetEntry.name);
            if (!fs.existsSync(subTargetDir)) {
              fs.mkdirSync(subTargetDir, { recursive: true });
            }
            fs.cpSync(assetSourcePath, subTargetDir, { recursive: true });
            log(`复制资源目录: ${assetEntry.name} -> assets/${assetEntry.name}`);
          }
        }
      } else if (entry.isDirectory()) {
        // 其他目录直接复制
        const targetDir = path.resolve(distDir, entry.name);
        fs.cpSync(sourcePath, targetDir, { recursive: true });
        log(`复制目录: ${entry.name} -> dist/${entry.name}`);
      }
    }
  }

  log('✅ 构建结果合并完成');
  log(`📁 生成页面: ${htmlFiles.join(', ')}`);
  log(`📦 资源目录: dist/assets/`);
  log(
    `🔧 处理策略: ${results
      .filter(r => r.success)
      .map(r => r.strategy)
      .join(', ')}`
  );
}

/**
 * 高级合并模式：使用资源重组逻辑
 */
async function mergeResultsWithReorganization(
  results: BuildResult[],
  options: any,
  debug: boolean
): Promise<void> {
  const log = debug ? console.log.bind(console, '[merge]') : () => {};

  // 首先使用默认方式合并到根目录
  await mergeResultsAll(results, debug);

  // 然后应用重组逻辑
  const distDir = path.resolve(process.cwd(), 'dist');
  const mergeMode = options.merge as 'strategy' | 'page';

  log(`应用${mergeMode}模式的资源重组...`);

  try {
    // 引入重组函数
    const { reorganizeAssetsInCLI } = await import('./index');
    await reorganizeAssetsInCLI(distDir, mergeMode, options, log);
    log(`✅ ${mergeMode}模式资源重组完成`);
  } catch (error) {
    log('资源重组失败:', error);
    throw error;
  }
}

/**
 * 清理临时HTML文件
 */
async function cleanupTempFiles(debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[cleanup]') : () => {};

  log('清理临时HTML文件...');

  // 使用glob查找新命名规则的临时HTML文件
  const tempHtmlFiles = glob.sync('.temp.mp.*.html', { cwd: process.cwd() });

  for (const tempFile of tempHtmlFiles) {
    const tempPath = path.resolve(process.cwd(), tempFile);
    try {
      fs.unlinkSync(tempPath);
      log(`删除临时文件: ${tempFile}`);
    } catch (error) {
      log(`删除临时文件失败: ${tempFile}`, error);
    }
  }

  if (tempHtmlFiles.length === 0) {
    log('没有找到临时文件');
  } else {
    log(`✅ 清理了 ${tempHtmlFiles.length} 个临时文件`);
  }
}

/**
 * 清理临时文件
 */
async function cleanup(strategies: string[], options: any, debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[cleanup]') : () => {};

  log('清理临时文件...');

  const mergeMode = options.merge || 'all';

  // 1. 清理项目根目录中的临时HTML文件
  const rootTempFiles = glob.sync('.temp.mp.*.html', { cwd: process.cwd() });
  for (const tempFile of rootTempFiles) {
    const tempPath = path.resolve(process.cwd(), tempFile);
    try {
      fs.unlinkSync(tempPath);
      log(`删除根目录临时文件: ${tempFile}`);
    } catch (error) {
      log(`删除根目录临时文件失败: ${tempFile}`, error);
    }
  }

  // 2. 清理各个策略目录中的临时HTML文件
  for (const strategy of strategies) {
    const strategyDir = path.resolve(process.cwd(), 'dist', strategy);
    if (fs.existsSync(strategyDir)) {
      const strategyTempFiles = glob.sync('*.mp.temp.html', { cwd: strategyDir });
      for (const tempFile of strategyTempFiles) {
        const tempPath = path.resolve(strategyDir, tempFile);
        try {
          fs.unlinkSync(tempPath);
          log(`删除策略目录临时文件: ${strategy}/${tempFile}`);
        } catch (error) {
          log(`删除策略目录临时文件失败: ${strategy}/${tempFile}`, error);
        }
      }
    }
  }

  // 3. 清理策略目录（在 merge='all' 模式下才删除）
  if (mergeMode === 'all') {
    const distDir = path.resolve(process.cwd(), 'dist');
    for (const strategy of strategies) {
      const strategyDir = path.resolve(distDir, strategy);
      if (fs.existsSync(strategyDir)) {
        try {
          fs.rmSync(strategyDir, { recursive: true, force: true });
          log(`删除策略目录: ${strategy}`);
        } catch (error) {
          log(`删除策略目录失败: ${strategy}`, error);
        }
      }
    }
  } else {
    log(`保留策略目录 (merge模式: ${mergeMode})`);
  }

  log('✅ 清理完成');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const { viteBuildArgs, debug, cwd, strategies: specifiedStrategies } = parseArgs();
  const log = debug ? console.log.bind(console, '[main]') : () => {};

  // 如果指定了工作目录，切换到该目录
  if (cwd) {
    const targetDir = path.resolve(process.cwd(), cwd);
    if (!fs.existsSync(targetDir)) {
      console.error(`❌ 指定的目录不存在: ${targetDir}`);
      process.exit(1);
    }
    process.chdir(targetDir);
    log(`切换工作目录到: ${targetDir}`);
  }

  try {
    // 1. 加载配置
    log('📋 加载配置...');
    const options = await loadViteConfig();
    const mergeMode = options.merge || 'all';

    log(`加载的配置:`, options);
    log(`mergeMode: ${mergeMode}`);

    // 2. 清理输出目录
    log('🧹 清理输出目录...');
    const { cleanViteOutputDirectory } = await import('./build-config');
    cleanViteOutputDirectory(viteBuildArgs);

    if (mergeMode === 'page') {
      // Page模式：独立构建每个页面
      await buildPagesMode(options, viteBuildArgs, debug);
    } else {
      // All模式：按策略构建
      await buildStrategiesMode(options, viteBuildArgs, debug, specifiedStrategies);
    }
  } catch (error) {
    console.error('❌ 构建失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Page模式构建
 */
async function buildPagesMode(
  options: any,
  viteBuildArgs: string[],
  debug: boolean
): Promise<void> {
  const log = debug ? console.log.bind(console, '[page-mode]') : () => {};

  log('🚀 开始Page模式构建...');

  // 1. 获取所有页面
  const { discoverPages } = await import('./build-config');
  const pages = discoverPages({
    entry: options.entry || 'src/pages/*/main.{ts,js}',
    exclude: options.exclude || [],
    template: options.template || 'index.html',
    placeholder: options.placeholder || '{{ENTRY_FILE}}',
    pageConfigs: options.pageConfigs || {},
    strategies: options.strategies || {},
  });

  if (pages.length === 0) {
    throw new Error('未找到任何页面');
  }

  log(`发现页面: ${pages.map(p => p.name).join(', ')}`);

  // 2. 并行构建所有页面
  log('🔨 开始并行构建页面...');
  const buildPromises = pages.map(page => buildSinglePage(page.name, viteBuildArgs, debug));
  const results = await Promise.all(buildPromises);

  // 3. 检查构建结果
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  console.log(`\n📊 页面构建结果统计:`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failureCount}`);

  if (failureCount > 0) {
    console.log(`\n❌ 失败的页面:`);
    results
      .filter(r => !r.success)
      .forEach(result => {
        console.log(`  - ${result.pageName}: ${result.error}`);
      });

    await cleanupTempFiles(debug);
    process.exit(1);
  }

  // 4. 合并页面构建结果
  log('📦 合并页面构建结果...');
  await mergePageResults(results, options, debug);

  // 5. 清理临时文件
  await cleanupTempFiles(debug);

  // 收集构建结果信息
  const successfulResults = results.filter(r => r.success);
  console.log(`\n🎉 所有页面构建成功！`);
  console.log(`📁 构建结果位于: dist/`);
  console.log(`📦 构建页面: ${successfulResults.map(r => r.pageName).join(', ')}`);
}

/**
 * 策略模式构建
 */
async function buildStrategiesMode(
  options: any,
  viteBuildArgs: string[],
  debug: boolean,
  specifiedStrategies?: string[]
): Promise<void> {
  const log = debug ? console.log.bind(console, '[strategy-mode]') : () => {};

  log('🚀 开始策略模式构建...');

  // 1. 获取所有策略
  const { getAvailableStrategies } = await import('./build-config');
  const availableStrategies = getAvailableStrategies({
    entry: options.entry || 'src/pages/*/main.{ts,js}',
    exclude: options.exclude || [],
    template: options.template || 'index.html',
    placeholder: options.placeholder || '{{ENTRY_FILE}}',
    pageConfigs: options.pageConfigs || {},
    strategies: options.strategies || {},
  });

  if (availableStrategies.length === 0) {
    throw new Error('未找到任何构建策略');
  }

  // 2. 确定要构建的策略
  let strategies: string[];
  if (specifiedStrategies && specifiedStrategies.length > 0) {
    // 验证指定的策略是否存在
    const invalidStrategies = specifiedStrategies.filter(s => !availableStrategies.includes(s));
    if (invalidStrategies.length > 0) {
      throw new Error(
        `指定的策略不存在: ${invalidStrategies.join(', ')}\n可用策略: ${availableStrategies.join(
          ', '
        )}`
      );
    }
    strategies = specifiedStrategies;
    log(`使用指定的策略: ${strategies.join(', ')}`);
  } else {
    strategies = availableStrategies;
    log(`构建所有可用策略: ${strategies.join(', ')}`);
  }

  // 3. 并行构建所有策略
  log('🔨 开始并行构建...');
  const buildPromises = strategies.map(strategy => buildStrategy(strategy, viteBuildArgs, debug));
  const results = await Promise.all(buildPromises);

  // 4. 检查构建结果
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  console.log(`\n📊 构建结果统计:`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failureCount}`);

  if (failureCount > 0) {
    console.log(`\n❌ 失败的策略:`);
    results
      .filter(r => !r.success)
      .forEach(result => {
        console.log(`  - ${result.strategy}: ${result.error}`);
      });

    // 只清理临时HTML文件，不删除策略目录（因为可能有部分成功）
    await cleanupTempFiles(debug);
    process.exit(1);
  }

  // 5. 合并构建结果
  log('📦 合并构建结果...');
  await mergeResults(results, options, debug);

  // 6. 清理临时文件和策略目录
  await cleanup(strategies, options, debug);

  // 收集构建结果信息
  const successfulResults = results.filter(r => r.success);
  const htmlFiles = fs
    .readdirSync(path.resolve(process.cwd(), 'dist'))
    .filter(file => file.endsWith('.html'));

  console.log(`\n🎉 所有策略构建成功！`);
  console.log(`📁 构建结果位于: dist/`);
  console.log(`🌐 生成的页面: ${htmlFiles.join(', ')}`);
  console.log(`📦 构建策略: ${successfulResults.map(r => r.strategy).join(', ')}`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
}

export { main as buildAll };
