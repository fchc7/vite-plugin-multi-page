#!/usr/bin/env node

// 自动化发布脚本
// 支持 patch, minor, major, beta, alpha 版本类型

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色代码
const colors = {
  yellow: '\x1b[1;33m',
  green: '\x1b[0;32m',
  red: '\x1b[0;31m',
  blue: '\x1b[0;34m',
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
  console.log('  npm run release:patch   # 发布补丁版本 (1.0.0 -> 1.0.1)');
  console.log('  npm run release:minor   # 发布次要版本 (1.0.0 -> 1.1.0)');
  console.log('  npm run release:major   # 发布主要版本 (1.0.0 -> 2.0.0)');
  console.log('  npm run release:beta    # 发布beta版本 (1.0.0 -> 1.0.1-beta.0)');
  console.log('  npm run release:alpha   # 发布alpha版本 (1.0.0 -> 1.0.1-alpha.0)');
  console.log('');
  console.log('示例:');
  console.log('  npm run release:patch');
  console.log('  npm run release:minor');
}

function checkGitStatus() {
  // 检查当前分支
  const currentBranch = execSilent('git branch --show-current');
  if (currentBranch !== 'main' && currentBranch !== 'master') {
    log(`❌ 错误: 只能在 main/master 分支发布，当前分支: ${currentBranch}`, colors.red);
    process.exit(1);
  }

  // 检查工作区是否干净
  const gitStatus = execSilent('git status --porcelain');
  if (gitStatus) {
    log('❌ 错误: 工作区不干净，请提交或暂存所有更改', colors.red);
    exec('git status --short');
    process.exit(1);
  }

  // 检查远程同步
  exec('git fetch origin');
  const localCommit = execSilent('git rev-parse HEAD');
  const remoteCommit =
    execSilent('git rev-parse origin/main') || execSilent('git rev-parse origin/master');

  if (localCommit !== remoteCommit) {
    log('❌ 错误: 本地分支与远程不同步', colors.red);
    log('请运行: git pull origin main', colors.yellow);
    process.exit(1);
  }

  log('✅ Git状态检查通过', colors.green);
}

function runChecks() {
  log('🧪 运行代码检查...', colors.yellow);

  // 代码检查
  log('  - ESLint 检查...', colors.yellow);
  exec('npm run lint');

  log('  - Prettier 格式检查...', colors.yellow);
  exec('npm run format:check');

  log('  - TypeScript 类型检查...', colors.yellow);
  exec('npm run type-check');

  log('✅ 代码检查通过', colors.green);
}

function build() {
  log('🔨 构建项目...', colors.yellow);
  exec('npm run build');
  log('✅ 构建完成', colors.green);
}

function updateVersion(versionType) {
  log(`📝 更新版本号 (${versionType})...`, colors.yellow);

  let versionCommand;
  switch (versionType) {
    case 'patch':
      versionCommand = 'npm version patch --no-git-tag-version';
      break;
    case 'minor':
      versionCommand = 'npm version minor --no-git-tag-version';
      break;
    case 'major':
      versionCommand = 'npm version major --no-git-tag-version';
      break;
    case 'beta':
      versionCommand = 'npm version prerelease --preid=beta --no-git-tag-version';
      break;
    case 'alpha':
      versionCommand = 'npm version prerelease --preid=alpha --no-git-tag-version';
      break;
    default:
      throw new Error(`不支持的版本类型: ${versionType}`);
  }

  exec(versionCommand);

  // 读取新版本号
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const newVersion = packageJson.version;

  log(`✅ 版本号更新为: ${newVersion}`, colors.green);
  return newVersion;
}

function commitAndTag(version) {
  log('📝 提交更改...', colors.yellow);

  // 添加所有更改
  exec('git add .');

  // 提交
  exec(`git commit -m "chore: release v${version}"`);

  // 创建标签
  log('🏷️ 创建Git标签...', colors.yellow);
  exec(`git tag -a "v${version}" -m "Release v${version}"`);

  log('✅ 提交和标签创建完成', colors.green);
}

function push() {
  log('🚀 推送到远程仓库...', colors.yellow);

  // 推送提交
  exec('git push origin main');

  // 推送标签
  exec('git push origin --tags');

  log('✅ 推送完成', colors.green);
}

function publish(versionType, version) {
  log('📦 准备发布到npm...', colors.yellow);
  log('💡 提示: npm发布将由GitHub Actions自动完成', colors.blue);
  log(`📋 发布信息:`, colors.blue);
  log(`  版本: v${version}`, colors.yellow);
  log(`  类型: ${versionType}`, colors.yellow);
  log(
    `  标签: ${versionType === 'beta' ? 'beta' : versionType === 'alpha' ? 'alpha' : 'latest'}`,
    colors.yellow
  );
}

function main() {
  const versionType = process.argv[2];

  if (!versionType) {
    log('❌ 错误: 请指定版本类型', colors.red);
    printUsage();
    process.exit(1);
  }

  const validTypes = ['patch', 'minor', 'major', 'beta', 'alpha'];
  if (!validTypes.includes(versionType)) {
    log(`❌ 错误: 不支持的版本类型 '${versionType}'`, colors.red);
    printUsage();
    process.exit(1);
  }

  log(`🚀 开始发布流程 (${versionType})...`, colors.blue);

  try {
    // 1. 检查Git状态
    checkGitStatus();

    // 2. 运行代码检查
    runChecks();

    // 3. 构建项目
    build();

    // 4. 更新版本号
    const newVersion = updateVersion(versionType);

    // 5. 提交更改并创建标签
    commitAndTag(newVersion);

    // 6. 推送到远程
    push();

    // 7. 发布到npm
    publish(versionType, newVersion);

    log('🎉 本地发布流程完成！', colors.green);
    log(`📦 版本: v${newVersion}`, colors.yellow);
    log('🚀 推送tag后，GitHub Actions将自动发布到npm', colors.blue);
  } catch (error) {
    log(`❌ 发布失败: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();
