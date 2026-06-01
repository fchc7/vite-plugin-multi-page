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
function parseArgs(): {
  viteBuildArgs: string[];
  debug: boolean;
  cwd?: string;
  strategies?: string[];
  concurrency: number;
  flatten: boolean;
} {
  const args = process.argv.slice(2);
  const viteBuildArgs: string[] = [];
  let debug = false;
  let cwd: string | undefined;
  let strategies: string[] | undefined;
  let concurrency = 3;
  let flatten = true; // 默认启用扁平化模式

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--debug') {
      debug = true;
    } else if (arg === '--cwd') {
      cwd = args[++i]; // 获取下一个参数作为目录
    } else if (arg === '--strategy') {
      const strategyArg = args[++i]; // 获取策略参数
      strategies = strategyArg.split(',').map(s => s.trim()); // 支持逗号分隔的多策略
    } else if (arg === '--concurrency') {
      const concurrencyArg = args[++i]; // 获取并发数参数
      concurrency = parseInt(concurrencyArg, 10);
      if (isNaN(concurrency) || concurrency < 1) {
        console.error('❌ 并发数必须是大于0的整数');
        process.exit(1);
      }
    } else if (arg === '--flatten') {
      flatten = true;
    } else if (arg === '--no-flatten') {
      flatten = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
使用方法: vite-mp [选项]

选项:
  --debug              启用调试模式
  --cwd <dir>          指定工作目录
  --strategy <list>    指定构建策略，支持逗号分隔多个策略
  --concurrency <num>  并发构建数（默认：3）
  --flatten            扁平化输出结构（默认启用）
  --no-flatten         禁用扁平化输出结构
  --help, -h           显示帮助信息
  
其他所有参数将传递给 vite build 命令

示例:
  vite-mp                              # 构建所有策略（默认扁平化）
  vite-mp --strategy mobile            # 只构建mobile策略
  vite-mp --strategy mobile,tablet     # 构建mobile和tablet策略
  vite-mp --no-flatten                 # 禁用扁平化输出结构
  vite-mp --concurrency 2              # 设置并发数为2
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

  return { viteBuildArgs, debug, cwd, strategies, concurrency, flatten };
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
    if (!userConfig) {
      console.log('❌ 配置文件加载失败');
    }
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

    // 设置环境变量来指定构建策略
    const env = {
      ...process.env,
      VITE_MULTI_PAGE_STRATEGY: strategy,
    };

    // 构建命令
    const args = ['build', ...viteBuildArgs];

    // 在Windows环境下，使用shell选项来确保npx命令能够正确执行
    const child = spawn('npx', ['vite', ...args], {
      stdio: debug ? 'inherit' : 'pipe',
      env,
      cwd: process.cwd(),
      shell: process.platform === 'win32', // Windows下使用shell
    });

    let errorOutput = '';

    if (!debug) {
      child.stderr?.on('data', data => {
        errorOutput += data.toString();
      });
    }

    child.on('close', code => {
      const success = code === 0;

      // 获取实际的输出目录（策略目录）
      const actualOutputDir = path.resolve(process.cwd(), 'dist', strategy);

      if (success) {
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
              }
            }
          }
        } catch (error) {
          log(`重命名HTML文件失败:`, error);
        }
      } else {
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
 * 清理临时HTML文件
 */
async function cleanupTempFiles(_debug: boolean): Promise<void> {
  // 使用glob查找新命名规则的临时HTML文件
  const tempHtmlFiles = glob.sync('.temp.mp.*.html', { cwd: process.cwd() });

  for (const tempFile of tempHtmlFiles) {
    const tempPath = path.resolve(process.cwd(), tempFile);
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // 静默处理删除失败
    }
  }
}

/**
 * 扁平化输出结构
 */
async function flattenOutput(strategies: string[], debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[flatten]') : () => {};
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(distDir)) {
    return;
  }

  log('开始扁平化输出结构...');

  // 1. 收集所有HTML文件并移动到根目录
  const htmlFiles: string[] = [];
  for (const strategy of strategies) {
    const strategyDir = path.resolve(distDir, strategy);
    if (fs.existsSync(strategyDir)) {
      const files = fs.readdirSync(strategyDir);
      for (const file of files) {
        if (file.endsWith('.html')) {
          const sourcePath = path.resolve(strategyDir, file);
          const targetPath = path.resolve(distDir, file);

          // 如果目标文件已存在，添加策略前缀
          const finalTargetPath = fs.existsSync(targetPath)
            ? path.resolve(distDir, `${strategy}-${file}`)
            : targetPath;

          fs.renameSync(sourcePath, finalTargetPath);
          htmlFiles.push(path.basename(finalTargetPath));
          log(`移动HTML: ${strategy}/${file} -> ${path.basename(finalTargetPath)}`);
        }
      }
    }
  }

  // 2. 合并所有策略的assets文件到统一目录
  const assetsDir = path.resolve(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    // 如果assets目录已存在，先备份
    const backupDir = path.resolve(distDir, 'assets-backup');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true });
    }
    fs.renameSync(assetsDir, backupDir);
  }

  // 创建统一的assets目录
  fs.mkdirSync(assetsDir, { recursive: true });
  const processedAssets = new Set<string>();

  // 3. 收集并合并所有策略的assets文件
  for (const strategy of strategies) {
    const strategyDir = path.resolve(distDir, strategy);
    if (fs.existsSync(strategyDir)) {
      const strategyAssetsDir = path.resolve(strategyDir, 'assets');
      if (fs.existsSync(strategyAssetsDir)) {
        const files = fs.readdirSync(strategyAssetsDir);
        for (const file of files) {
          const sourcePath = path.resolve(strategyAssetsDir, file);
          const targetPath = path.resolve(assetsDir, file);

          if (!processedAssets.has(file)) {
            // 文件不存在，直接移动
            fs.renameSync(sourcePath, targetPath);
            processedAssets.add(file);
            log(`移动资源: ${strategy}/assets/${file} -> assets/${file}`);
          } else {
            // 文件已存在，比较文件内容决定是否替换
            const sourceContent = fs.readFileSync(sourcePath);
            const targetContent = fs.readFileSync(targetPath);

            if (sourceContent.equals(targetContent)) {
              // 内容相同，删除重复文件
              fs.unlinkSync(sourcePath);
              log(`删除重复资源: ${strategy}/assets/${file} (内容相同)`);
            } else {
              // 内容不同，添加策略前缀
              const fileName = path.parse(file).name;
              const fileExt = path.parse(file).ext;
              const newFileName = `${fileName}-${strategy}${fileExt}`;
              const newTargetPath = path.resolve(assetsDir, newFileName);
              fs.renameSync(sourcePath, newTargetPath);
              log(`移动资源: ${strategy}/assets/${file} -> assets/${newFileName} (内容不同)`);
            }
          }
        }
      }
    }
  }

  // 4. 处理公共文件（只保留第一个，删除重复的）
  const processedFiles = new Set<string>();
  for (const strategy of strategies) {
    const strategyDir = path.resolve(distDir, strategy);
    if (fs.existsSync(strategyDir)) {
      const files = fs.readdirSync(strategyDir);
      for (const file of files) {
        if (!file.endsWith('.html') && file !== 'assets') {
          const sourcePath = path.resolve(strategyDir, file);
          const targetPath = path.resolve(distDir, file);

          if (fs.statSync(sourcePath).isDirectory()) {
            // 处理目录
            if (!processedFiles.has(file)) {
              if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true });
              }
              fs.renameSync(sourcePath, targetPath);
              processedFiles.add(file);
              log(`移动目录: ${strategy}/${file} -> ${file}`);
            } else {
              // 删除重复目录
              fs.rmSync(sourcePath, { recursive: true });
              log(`删除重复目录: ${strategy}/${file}`);
            }
          } else {
            // 处理文件
            if (!processedFiles.has(file)) {
              fs.renameSync(sourcePath, targetPath);
              processedFiles.add(file);
              log(`移动文件: ${strategy}/${file} -> ${file}`);
            } else {
              // 删除重复文件
              fs.unlinkSync(sourcePath);
              log(`删除重复文件: ${strategy}/${file}`);
            }
          }
        }
      }
    }
  }

  // 5. 更新HTML文件中的资源路径（现在所有资源都在统一的assets目录中）
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.resolve(distDir, htmlFile);
    if (fs.existsSync(htmlPath)) {
      let content = fs.readFileSync(htmlPath, 'utf-8');

      // 根据HTML文件名确定策略，用于处理重命名后的资源文件
      let strategy = 'default';
      if (htmlFile === 'mobile.html') {
        strategy = 'mobile';
      } else if (htmlFile === 'tablet.html') {
        strategy = 'tablet';
      } else if (htmlFile.startsWith('mobile-')) {
        strategy = 'mobile';
      } else if (htmlFile.startsWith('tablet-')) {
        strategy = 'tablet';
      }

      // 对于重命名后的资源文件，需要更新为带策略前缀的文件名
      const strategyAssetsDir = path.resolve(distDir, 'assets');
      if (fs.existsSync(strategyAssetsDir)) {
        const assetsFiles = fs.readdirSync(strategyAssetsDir);
        for (const assetFile of assetsFiles) {
          if (assetFile.includes(`-${strategy}`)) {
            const originalName = assetFile.replace(`-${strategy}`, '');
            // 更安全的正则表达式替换，只匹配完整的文件名
            const escapedName = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\./assets/${escapedName}(?=\\s|>|"|')`, 'g');
            content = content.replace(regex, `./assets/${assetFile}`);
          }
        }
      }

      fs.writeFileSync(htmlPath, content);
      log(`更新资源路径: ${htmlFile} -> assets/`);
    }
  }

  // 6. 清理所有策略目录（扁平化后不再需要）
  for (const strategy of strategies) {
    const strategyDir = path.resolve(distDir, strategy);
    if (fs.existsSync(strategyDir)) {
      try {
        fs.rmSync(strategyDir, { recursive: true });
        log(`删除策略目录: ${strategy}`);
      } catch (error) {
        log(`删除策略目录失败: ${strategy}`, error);
      }
    }
  }

  log('扁平化完成');
}

/**
 * 清理临时文件
 */
async function cleanup(strategies: string[], debug: boolean): Promise<void> {
  const log = debug ? console.log.bind(console, '[cleanup]') : () => {};

  // 1. 清理项目根目录中的临时HTML文件
  const rootTempFiles = glob.sync('.temp.mp.*.html', { cwd: process.cwd() });
  for (const tempFile of rootTempFiles) {
    const tempPath = path.resolve(process.cwd(), tempFile);
    try {
      fs.unlinkSync(tempPath);
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
        } catch (error) {
          log(`删除策略目录临时文件失败: ${strategy}/${tempFile}`, error);
        }
      }
    }
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const {
    viteBuildArgs,
    debug,
    cwd,
    strategies: specifiedStrategies,
    concurrency,
    flatten,
  } = parseArgs();
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
    const options = await loadViteConfig();

    // 2. 清理输出目录
    const { cleanViteOutputDirectory } = await import('./build-config');
    cleanViteOutputDirectory(viteBuildArgs);

    // 只使用策略模式构建
    await buildStrategiesMode(
      options,
      viteBuildArgs,
      debug,
      specifiedStrategies,
      concurrency,
      flatten
    );
  } catch (error) {
    console.error('❌ 构建失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * 策略模式构建
 */
async function buildStrategiesMode(
  options: any,
  viteBuildArgs: string[],
  debug: boolean,
  specifiedStrategies?: string[],
  concurrency: number = 3,
  flatten: boolean = false
): Promise<void> {
  const log = debug ? console.log.bind(console, '[strategy-mode]') : () => {};

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
  } else {
    strategies = availableStrategies;
  }

  log(`🚀 开始构建策略: ${strategies.join(', ')} (并发数: ${concurrency})`);

  // 3. 分批并发构建策略
  const results: BuildResult[] = [];
  for (let i = 0; i < strategies.length; i += concurrency) {
    const batch = strategies.slice(i, i + concurrency);
    const batchPromises = batch.map(strategy => buildStrategy(strategy, viteBuildArgs, debug));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (debug) {
      log(`批次 ${Math.floor(i / concurrency) + 1} 完成: ${batch.join(', ')}`);
    }
  }

  // 4. 检查构建结果
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  if (failureCount > 0) {
    console.log(`\n❌ 构建失败:`);
    results
      .filter(r => !r.success)
      .forEach(result => {
        console.log(`  - ${result.strategy}: ${result.error}`);
      });

    // 只清理临时HTML文件，不删除策略目录（因为可能有部分成功）
    await cleanupTempFiles(debug);
    process.exit(1);
  }

  // 5. 扁平化处理（如果启用）
  if (flatten) {
    await flattenOutput(strategies, debug);
  }

  // 6. 清理临时文件
  await cleanup(strategies, debug);

  // 收集构建结果信息
  const successfulResults = results.filter(r => r.success);

  console.log(`\n🎉 构建成功！`);
  console.log(`📦 策略: ${successfulResults.map(r => r.strategy).join(', ')}`);

  if (flatten) {
    console.log(`📁 输出结构: 扁平化`);
    // 显示扁平化后的HTML文件
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      const htmlFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.html'));
      console.log(`  - HTML文件: ${htmlFiles.join(', ')}`);
    }
  } else {
    // 显示每个策略的输出目录
    for (const result of successfulResults) {
      const strategyDir = path.resolve(process.cwd(), 'dist', result.strategy);
      if (fs.existsSync(strategyDir)) {
        const htmlFiles = fs.readdirSync(strategyDir).filter(file => file.endsWith('.html'));
        console.log(`  - ${result.strategy}: ${htmlFiles.join(', ')}`);
      }
    }
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
