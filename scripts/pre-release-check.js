#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

log('🔍 开始发布前检查...', colors.blue);

// 检查当前分支
const currentBranch = execSilent('git branch --show-current');
if (currentBranch !== 'main') {
  log(`❌ 错误: 只能在 main 分支发布`, colors.red);
  log(`当前分支: ${currentBranch}`, colors.yellow);
  process.exit(1);
}

log('✅ 分支检查通过 (main)', colors.green);

// 检查工作区是否干净
const gitStatus = execSilent('git status --porcelain');
if (gitStatus) {
  log('❌ 错误: 工作区不干净，请提交或暂存所有更改', colors.red);
  exec('git status --short');
  process.exit(1);
}

log('✅ 工作区检查通过', colors.green);

// 检查远程同步
exec('git fetch origin');
const localCommit = execSilent('git rev-parse HEAD');
const remoteCommit = execSilent('git rev-parse origin/main');

if (localCommit !== remoteCommit) {
  log('❌ 错误: 本地分支与远程不同步', colors.red);
  log('请运行: git pull origin main', colors.yellow);
  process.exit(1);
}

log('✅ 远程同步检查通过', colors.green);

// 安装依赖
log('📦 安装依赖...', colors.yellow);
if (fs.existsSync('pnpm-lock.yaml')) {
  log('  使用 pnpm...', colors.yellow);
  exec('pnpm install');
} else {
  exec('npm ci');
}

// 代码检查
log('🧪 运行代码检查...', colors.yellow);

log('  - ESLint 检查...', colors.yellow);
exec('npm run lint');

log('  - Prettier 格式检查...', colors.yellow);
exec('npm run format:check');

log('  - TypeScript 类型检查...', colors.yellow);
exec('npm run type-check');

log('✅ 代码检查通过', colors.green);

// 构建测试
log('🔨 构建测试...', colors.yellow);
exec('npm run build');

log('✅ 构建测试通过', colors.green);

// 示例项目测试
log('🎯 示例项目测试...', colors.yellow);
process.chdir('example');
if (fs.existsSync('pnpm-lock.yaml')) {
  log('  示例项目使用 pnpm...', colors.yellow);
  exec('pnpm install');
  exec('pnpm run build');
} else {
  exec('npm install');
  exec('npm run build');
}
process.chdir('..');

log('✅ 示例项目测试通过', colors.green);

// 检查 package.json 字段
log('📝 检查 package.json...', colors.yellow);

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// 检查必要字段
const requiredFields = [
  'name',
  'version',
  'description',
  'main',
  'module',
  'types',
  'author',
  'license',
  'repository',
];
for (const field of requiredFields) {
  if (!packageJson[field]) {
    log(`❌ 错误: package.json 缺少必要字段: ${field}`, colors.red);
    process.exit(1);
  }
}

log('✅ package.json 检查通过', colors.green);

// 检查版本号格式
const version = packageJson.version;
const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$/;
if (!versionRegex.test(version)) {
  log(`❌ 错误: 版本号格式不正确: ${version}`, colors.red);
  process.exit(1);
}

log(`✅ 版本号格式检查通过: ${version}`, colors.green);

// 检查 CHANGELOG.md
if (!fs.existsSync('CHANGELOG.md')) {
  log('❌ 错误: 缺少 CHANGELOG.md 文件', colors.red);
  process.exit(1);
}

log('✅ CHANGELOG.md 检查通过', colors.green);

// 显示即将发布的信息
log('📋 发布信息:', colors.blue);
log(`  版本: ${version}`, colors.yellow);
log(`  分支: ${currentBranch}`, colors.yellow);
log(`  提交: ${execSilent('git rev-parse --short HEAD')}`, colors.yellow);

log('🎉 所有检查通过，可以发布！', colors.green);
log('💡 运行以下命令发布:', colors.yellow);
log('   npm run release:patch   # 补丁版本', colors.yellow);
log('   npm run release:minor   # 次要版本', colors.yellow);
log('   npm run release:major   # 主要版本', colors.yellow);
