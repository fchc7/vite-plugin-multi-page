#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🔍 验证插件导出...\n');

// 1. 测试 CommonJS 导入
console.log('1️⃣ 测试 CommonJS 导入:');
try {
  // 直接 require
  const plugin1 = require('../dist/index.js');
  console.log(
    `   ✅ require('../dist/index.js'): ${typeof plugin1} (${plugin1.name || 'function'})`
  );

  // 解构导入
  const { viteMultiPage, defineConfig } = require('../dist/index.js');
  console.log(
    `   ✅ { viteMultiPage }: ${typeof viteMultiPage} (${viteMultiPage.name || 'function'})`
  );
  console.log(
    `   ✅ { defineConfig }: ${typeof defineConfig} (${defineConfig.name || 'function'})`
  );

  // default 属性
  const { default: defaultExport } = require('../dist/index.js');
  console.log(`   ✅ { default }: ${typeof defaultExport} (${defaultExport?.name || 'function'})`);
} catch (error) {
  console.log(`   ❌ CommonJS 导入失败: ${error.message}`);
}

console.log();

// 2. 测试 ES 模块导入（模拟）
console.log('2️⃣ 测试 ES 模块导入:');
try {
  const esmContent = fs.readFileSync(path.join(__dirname, '../dist/index.mjs'), 'utf-8');

  // 检查导出语句
  const hasDefaultExport = esmContent.includes('src_default as default');
  const hasNamedExports = esmContent.includes('viteMultiPage');

  console.log(`   ✅ 默认导出: ${hasDefaultExport ? '存在' : '❌ 缺失'}`);
  console.log(`   ✅ 具名导出 viteMultiPage: ${hasNamedExports ? '存在' : '❌ 缺失'}`);

  // 提取导出列表
  const exportMatch = esmContent.match(/export \{([\s\S]*?)\}/);
  if (exportMatch) {
    const exports = exportMatch[1]
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    console.log(`   ✅ 导出列表: ${exports.join(', ')}`);
  }
} catch (error) {
  console.log(`   ❌ ES 模块分析失败: ${error.message}`);
}

console.log();

// 3. 测试插件实例化
console.log('3️⃣ 测试插件实例化:');
try {
  const plugin = require('../dist/index.js');

  // 测试默认导入调用
  const instance1 = plugin();
  console.log(`   ✅ plugin(): ${instance1.name} (${typeof instance1})`);

  // 测试具名导入调用
  const { viteMultiPage } = require('../dist/index.js');
  const instance2 = viteMultiPage();
  console.log(`   ✅ viteMultiPage(): ${instance2.name} (${typeof instance2})`);

  // 测试 default 属性调用
  const instance3 = plugin.default();
  console.log(`   ✅ plugin.default(): ${instance3.name} (${typeof instance3})`);

  // 验证返回的是 Vite 插件对象
  const isValidPlugin =
    instance1 &&
    typeof instance1.name === 'string' &&
    typeof instance1.configResolved === 'function';

  console.log(`   ✅ 插件对象有效性: ${isValidPlugin ? '有效' : '❌ 无效'}`);
} catch (error) {
  console.log(`   ❌ 插件实例化失败: ${error.message}`);
}

console.log();

// 4. 测试类型定义
console.log('4️⃣ 测试类型定义:');
try {
  const dtsContent = fs.readFileSync(path.join(__dirname, '../dist/index.d.ts'), 'utf-8');

  const hasDefaultExport = dtsContent.includes('declare const _default:');
  const hasViteMultiPageExport = dtsContent.includes('declare function viteMultiPage');
  const hasTypeExports = dtsContent.includes('export type');

  console.log(`   ✅ 默认导出声明: ${hasDefaultExport ? '存在' : '❌ 缺失'}`);
  console.log(`   ✅ viteMultiPage 函数声明: ${hasViteMultiPageExport ? '存在' : '❌ 缺失'}`);
  console.log(`   ✅ 类型导出: ${hasTypeExports ? '存在' : '❌ 缺失'}`);
} catch (error) {
  console.log(`   ❌ 类型定义检查失败: ${error.message}`);
}

console.log();

// 5. 总结
console.log('📋 验证总结:');
console.log('   如果以上所有检查都通过，说明插件导出正确。');
console.log('   如果有 ❌ 标记，请重新构建或检查配置。');
console.log();
console.log('💡 常见用法:');
console.log('   // CommonJS');
console.log('   const viteMultiPage = require("@fchc8/vite-plugin-multi-page");');
console.log('   const { viteMultiPage } = require("@fchc8/vite-plugin-multi-page");');
console.log('');
console.log('   // ES Modules');
console.log('   import viteMultiPage from "@fchc8/vite-plugin-multi-page";');
console.log('   import { viteMultiPage } from "@fchc8/vite-plugin-multi-page";');
