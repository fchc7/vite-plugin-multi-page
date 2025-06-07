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

/**
 * 解析命令行参数
 */
function parseArgs(): { viteBuildArgs: string[]; debug: boolean; cwd?: string } {
  const args = process.argv.slice(2);
  const viteBuildArgs: string[] = [];
  let debug = false;
  let cwd: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--debug') {
      debug = true;
    } else if (arg === '--cwd') {
      cwd = args[++i]; // 获取下一个参数作为目录
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
使用方法: vite-multi-page-build [选项]

选项:
  --debug          启用调试模式
  --cwd <dir>      指定工作目录
  --help, -h       显示帮助信息
  
其他所有参数将传递给 vite build 命令

示例:
  vite-mp
  vite-mp --debug
  vite-mp --cwd example
  vite-mp --mode production --debug
`);
      process.exit(0);
    } else if (arg !== 'build') {
      // 跳过 'build' 命令，因为我们会自动添加
      viteBuildArgs.push(arg);
    }
  }

  return { viteBuildArgs, debug, cwd };
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
      VITE_BUILD_STRATEGY: strategy,
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
 * 合并构建结果
 */
async function mergeResults(results: BuildResult[], debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[merge]') : () => {};

  log('开始合并构建结果...');

  const distDir = path.resolve(process.cwd(), 'dist');
  const assetsDir = path.resolve(distDir, 'assets');

  // 确保assets目录存在
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const htmlFiles: string[] = [];
  const strategyInfo: Array<{ strategy: string; success: boolean; error?: string }> = [];

  // 处理每个策略的构建结果
  for (const result of results) {
    strategyInfo.push({
      strategy: result.strategy,
      success: result.success,
      error: result.error,
    });

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
async function cleanup(strategies: string[], debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[cleanup]') : () => {};

  log('清理临时文件...');

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

  // 3. 清理策略目录（在合并完成后）
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

  log('✅ 清理完成');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const { viteBuildArgs, debug, cwd } = parseArgs();
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
    log('🚀 开始多策略构建...');

    // 1. 加载配置并获取所有策略
    log('📋 加载配置...');
    const options = await loadViteConfig();
    const { getAvailableStrategies } = await import('./build-config');
    const strategies = getAvailableStrategies({
      entry: options.entry || 'src/pages/*/main.{ts,js}',
      exclude: options.exclude || [],
      template: options.template || 'index.html',
      placeholder: options.placeholder || '{{ENTRY_FILE}}',
      pageConfigs: options.pageConfigs || {},
      strategies: options.strategies || {},
    });

    if (strategies.length === 0) {
      throw new Error('未找到任何构建策略');
    }

    log(`发现 ${strategies.length} 个策略: ${strategies.join(', ')}`);

    // 2. 清理输出目录
    log('🧹 清理输出目录...');
    const { cleanViteOutputDirectory } = await import('./build-config');
    cleanViteOutputDirectory(viteBuildArgs);

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
    await mergeResults(results, debug);

    // 6. 清理临时文件和策略目录
    await cleanup(strategies, debug);

    // 收集构建结果信息
    const successfulResults = results.filter(r => r.success);
    const htmlFiles = fs
      .readdirSync(path.resolve(process.cwd(), 'dist'))
      .filter(file => file.endsWith('.html'));

    console.log(`\n🎉 所有策略构建成功！`);
    console.log(`📁 构建结果位于: dist/`);
    console.log(`🌐 生成的页面: ${htmlFiles.join(', ')}`);
    console.log(`📦 构建策略: ${successfulResults.map(r => r.strategy).join(', ')}`);
  } catch (error) {
    console.error('❌ 构建失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
}

export { main as buildAll };
