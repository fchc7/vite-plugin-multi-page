#!/usr/bin/env node

const { execSync } = require('child_process');

// 颜色代码
const colors = {
  yellow: '\x1b[1;33m',
  green: '\x1b[0;32m',
  red: '\x1b[0;31m',
  reset: '\x1b[0m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`❌ 命令执行失败: ${command}`, colors.red);
    throw error;
  }
}

function execSilent(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

function printUsage() {
  console.log('使用方法:');
  console.log('  npm run git:feature start <feature-name>  # 开始新功能');
  console.log('  npm run git:feature finish <feature-name> # 完成功能开发');
  console.log('  npm run git:feature list                  # 列出所有功能分支');
  console.log('');
  console.log('示例:');
  console.log('  npm run git:feature start mobile-support');
  console.log('  npm run git:feature finish mobile-support');
}

const command = process.argv[2];
const featureName = process.argv[3];

switch (command) {
  case 'start':
    if (!featureName) {
      log('错误: 请提供功能名称', colors.red);
      printUsage();
      process.exit(1);
    }

    log(`🚀 开始新功能: ${featureName}`, colors.yellow);

    // 确保在 develop 分支
    exec('git checkout develop');
    exec('git pull origin develop');

    // 创建并切换到 feature 分支
    exec(`git checkout -b "feature/${featureName}"`);

    log(`✅ 功能分支 feature/${featureName} 已创建`, colors.green);
    log(`💡 提示: 开发完成后运行 'npm run git:feature finish ${featureName}'`, colors.yellow);
    break;

  case 'finish':
    if (!featureName) {
      log('错误: 请提供功能名称', colors.red);
      printUsage();
      process.exit(1);
    }

    const featureBranch = `feature/${featureName}`;

    log(`🔄 完成功能: ${featureName}`, colors.yellow);

    // 检查是否在正确的分支
    const currentBranch = execSilent('git branch --show-current');
    if (currentBranch !== featureBranch) {
      log(`切换到功能分支: ${featureBranch}`, colors.yellow);
      exec(`git checkout "${featureBranch}"`);
    }

    // 运行测试和检查
    log('🧪 运行代码检查...', colors.yellow);
    exec('pnpm run lint');
    exec('pnpm run format:check');
    exec('pnpm run type-check');

    // 切换到 develop 并合并
    exec('git checkout develop');
    exec('git pull origin develop');
    exec(`git merge --no-ff "${featureBranch}" -m "完成功能: ${featureName}"`);

    // 删除本地功能分支
    exec(`git branch -d "${featureBranch}"`);

    // 推送到远程
    exec('git push origin develop');

    log(`✅ 功能 ${featureName} 已完成并合并到 develop`, colors.green);
    log(
      `💡 提示: 可以运行 'git push origin --delete feature/${featureName}' 删除远程分支`,
      colors.yellow
    );
    break;

  case 'list':
    log('📋 当前功能分支:', colors.yellow);
    try {
      const branches = execSync('git branch', { encoding: 'utf8' });
      const featureBranches = branches
        .split('\n')
        .filter(line => line.includes('feature/'))
        .map(line => line.trim());

      if (featureBranches.length > 0) {
        featureBranches.forEach(branch => console.log(branch));
      } else {
        console.log('暂无功能分支');
      }
    } catch (error) {
      console.log('暂无功能分支');
    }
    break;

  default:
    log(`错误: 未知命令 '${command}'`, colors.red);
    printUsage();
    process.exit(1);
}
