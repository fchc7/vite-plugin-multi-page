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
  console.log('  npm run git:hotfix start <hotfix-name>  # 开始热修复');
  console.log('  npm run git:hotfix finish <hotfix-name> # 完成热修复');
  console.log('  npm run git:hotfix list                 # 列出所有热修复分支');
  console.log('');
  console.log('示例:');
  console.log('  npm run git:hotfix start critical-bug-fix');
  console.log('  npm run git:hotfix finish critical-bug-fix');
}

const command = process.argv[2];
const hotfixName = process.argv[3];

switch (command) {
  case 'start':
    if (!hotfixName) {
      log('错误: 请提供热修复名称', colors.red);
      printUsage();
      process.exit(1);
    }

    log(`🚀 开始热修复: ${hotfixName}`, colors.yellow);

    // 确保在 main 分支
    exec('git checkout main');
    exec('git pull origin main');

    // 创建并切换到 hotfix 分支
    exec(`git checkout -b "hotfix/${hotfixName}"`);

    log(`✅ 热修复分支 hotfix/${hotfixName} 已创建`, colors.green);
    log(`💡 提示: 修复完成后运行 'npm run git:hotfix finish ${hotfixName}'`, colors.yellow);
    break;

  case 'finish':
    if (!hotfixName) {
      log('错误: 请提供热修复名称', colors.red);
      printUsage();
      process.exit(1);
    }

    const hotfixBranch = `hotfix/${hotfixName}`;

    log(`🔄 完成热修复: ${hotfixName}`, colors.yellow);

    // 检查是否在正确的分支
    const currentBranch = execSilent('git branch --show-current');
    if (currentBranch !== hotfixBranch) {
      log(`切换到热修复分支: ${hotfixBranch}`, colors.yellow);
      exec(`git checkout "${hotfixBranch}"`);
    }

    // 运行测试和检查
    log('🧪 运行代码检查...', colors.yellow);
    exec('pnpm run lint');
    exec('pnpm run format:check');
    exec('pnpm run type-check');

    // 切换到 main 并合并
    exec('git checkout main');
    exec('git pull origin main');
    exec(`git merge --no-ff "${hotfixBranch}" -m "完成热修复: ${hotfixName}"`);

    // 切换到 develop 并合并
    exec('git checkout develop');
    exec('git pull origin develop');
    exec(`git merge --no-ff "${hotfixBranch}" -m "合并热修复到develop: ${hotfixName}"`);

    // 删除本地热修复分支
    exec(`git branch -d "${hotfixBranch}"`);

    // 推送所有分支
    exec('git push origin main');
    exec('git push origin develop');

    log(`✅ 热修复 ${hotfixName} 已完成并合并到 main 和 develop`, colors.green);
    log(
      `💡 提示: 可以运行 'git push origin --delete hotfix/${hotfixName}' 删除远程分支`,
      colors.yellow
    );
    break;

  case 'list':
    log('📋 当前热修复分支:', colors.yellow);
    try {
      const branches = execSync('git branch', { encoding: 'utf8' });
      const hotfixBranches = branches
        .split('\n')
        .filter(line => line.includes('hotfix/'))
        .map(line => line.trim());

      if (hotfixBranches.length > 0) {
        hotfixBranches.forEach(branch => console.log(branch));
      } else {
        console.log('暂无热修复分支');
      }
    } catch (error) {
      console.log('暂无热修复分支');
    }
    break;

  default:
    log(`错误: 未知命令 '${command}'`, colors.red);
    printUsage();
    process.exit(1);
}
