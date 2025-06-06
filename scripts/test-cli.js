#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, options = {}) {
  log(`\n${colors.bright}${colors.cyan}> ${command}${colors.reset}\n`);
  try {
    const output = execSync(command, {
      stdio: 'inherit',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error };
  }
}

// 确保构建最新版本
function buildProject() {
  log('构建项目...', colors.yellow);
  const result = runCommand('npm run build');
  if (!result.success) {
    log('构建失败！', colors.red);
    process.exit(1);
  }
  log('构建成功！', colors.green);
}

// 运行 CLI 帮助命令
function testCliHelp() {
  log('测试 CLI 帮助命令...', colors.yellow);
  const result = runCommand('node dist/cli.js --help');
  return result.success;
}

// 使用示例配置测试 CLI
function testWithExampleConfig() {
  log('测试使用示例配置...', colors.yellow);

  // 检查示例目录是否存在
  if (!fs.existsSync('example')) {
    log('示例目录不存在，跳过此测试', colors.red);
    return false;
  }

  // 检查示例配置是否存在
  const exampleConfigPath = path.join('example', 'vite.config.ts');
  if (!fs.existsSync(exampleConfigPath)) {
    log(`示例配置 ${exampleConfigPath} 不存在，跳过此测试`, colors.red);
    return false;
  }

  // 运行构建命令
  const result = runCommand(`node dist/cli.js --config ${exampleConfigPath} --debug`);
  return result.success;
}

// 主函数
function main() {
  log('开始测试 CLI 工具...', colors.bright + colors.green);

  // 构建项目
  buildProject();

  // 运行测试
  const tests = [
    { name: 'CLI 帮助命令', fn: testCliHelp },
    { name: '使用示例配置', fn: testWithExampleConfig },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    log(`\n${colors.bright}测试: ${test.name}${colors.reset}`);
    const success = test.fn();
    if (success) {
      passed++;
      log(`✅ ${test.name} 通过！`, colors.green);
    } else {
      failed++;
      log(`❌ ${test.name} 失败！`, colors.red);
    }
  }

  // 显示结果
  log('\n测试结果：', colors.bright);
  log(`通过: ${passed}`, colors.green);
  log(`失败: ${failed}`, colors.red);

  if (failed > 0) {
    log('\n有测试失败，请检查上面的输出！', colors.red);
    process.exit(1);
  } else {
    log('\n所有测试通过！🎉', colors.bright + colors.green);
  }
}

// 运行主函数
main();
