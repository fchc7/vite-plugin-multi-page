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
  console.log('  npm run git:release start <version>  # 开始发布');
  console.log('  npm run git:release finish <version> # 完成发布');
  console.log('  npm run git:release list             # 列出所有发布分支');
  console.log('');
  console.log('示例:');
  console.log('  npm run git:release start 1.2.0');
  console.log('  npm run git:release finish 1.2.0');
}

const command = process.argv[2];
const version = process.argv[3];

switch (command) {
  case 'start':
    if (!version) {
      log('错误: 请提供版本号', colors.red);
      printUsage();
      process.exit(1);
    }

    log(`🚀 开始发布: ${version}`, colors.yellow);

    // 确保在 develop 分支
    exec('git checkout develop');
    exec('git pull origin develop');

    // 创建并切换到 release 分支
    exec(`git checkout -b "release/${version}"`);

    log(`✅ 发布分支 release/${version} 已创建`, colors.green);
    log(`💡 提示: 发布准备完成后运行 'npm run git:release finish ${version}'`, colors.yellow);
    break;

  case 'finish':
    if (!version) {
      log('错误: 请提供版本号', colors.red);
      printUsage();
      process.exit(1);
    }

    const releaseBranch = `release/${version}`;

    log(`🔄 完成发布: ${version}`, colors.yellow);

    // 检查是否在正确的分支
    const currentBranch = execSilent('git branch --show-current');
    if (currentBranch !== releaseBranch) {
      log(`切换到发布分支: ${releaseBranch}`, colors.yellow);
      exec(`git checkout "${releaseBranch}"`);
    }

    // 运行测试和检查
    log('🧪 运行代码检查...', colors.yellow);
    exec('pnpm run lint');
    exec('pnpm run format:check');
    exec('pnpm run type-check');
    exec('pnpm run build');

    // 切换到 main 并合并
    exec('git checkout main');
    exec('git pull origin main');
    exec(`git merge --no-ff "${releaseBranch}" -m "发布版本: ${version}"`);

    // 创建标签
    exec(`git tag -a "v${version}" -m "发布版本 ${version}"`);

    // 切换到 develop 并合并
    exec('git checkout develop');
    exec('git pull origin develop');
    exec(`git merge --no-ff "${releaseBranch}" -m "合并发布到develop: ${version}"`);

    // 删除本地发布分支
    exec(`git branch -d "${releaseBranch}"`);

    // 推送所有分支和标签
    exec('git push origin main');
    exec('git push origin develop');
    exec(`git push origin "v${version}"`);

    log(`✅ 发布 ${version} 已完成并合并到 main 和 develop`, colors.green);
    log(
      `💡 提示: 可以运行 'git push origin --delete release/${version}' 删除远程分支`,
      colors.yellow
    );
    break;

  case 'list':
    log('📋 当前发布分支:', colors.yellow);
    try {
      const branches = execSync('git branch', { encoding: 'utf8' });
      const releaseBranches = branches
        .split('\n')
        .filter(line => line.includes('release/'))
        .map(line => line.trim());

      if (releaseBranches.length > 0) {
        releaseBranches.forEach(branch => console.log(branch));
      } else {
        console.log('暂无发布分支');
      }
    } catch (error) {
      console.log('暂无发布分支');
    }
    break;

  default:
    log(`错误: 未知命令 '${command}'`, colors.red);
    printUsage();
    process.exit(1);
}
