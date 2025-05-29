# 🚀 Vue 移动端多页面应用演示

## 📱 演示页面

✅ **Vue 移动端应用** - Vue3 + PostCSS rem 适配  
✅ **原生移动端应用** - JavaScript + PostCSS  
✅ **管理后台** - 现代 ES 语法 + 仪表板  
✅ **首页** - 项目介绍和导航  
✅ **关于页面** - 技术栈说明

## 🏃‍♂️ 快速开始

### 1. 环境要求

```bash
# 安装 Node.js (macOS)
brew install node

# 验证
node --version  # v16+
```

### 2. 一键启动

```bash
./start-demo.sh
```

### 3. 手动启动

```bash
npm install
npm run dev     # 开发模式
npm run build   # 构建项目
npm run serve   # 预览构建结果
```

## 🌐 页面访问

**开发模式** (http://localhost:5173):

- 🌟 **Vue 移动端**: `/vue-app.html` (推荐)
- 📱 **原生移动端**: `/app.html`
- 🎛️ **管理后台**: `/dashboard.html`
- 🏠 **首页**: `/home.html`
- 📖 **关于**: `/about.html`

**构建模式** (http://localhost:3000):

- 所有页面 + 构建分析仪表板

## 🎯 核心特性

- **Vue3 + Composition API**: 现代响应式框架
- **PostCSS rem 适配**: 自动 px → rem 转换
- **多页面路由**: 自动扫描 `src/pages/**/*.{ts,js}`
- **灵活配置**: 根据页面路径动态选择模板
- **构建分析**: 可视化构建产物分析

## 💡 移动端适配

所有 `px` 值自动转换为 `rem`，基于 375px 设计稿:

```javascript
// 根字体大小动态调整
docEl.style.fontSize = (clientWidth / 375) * 37.5 + 'px';
```

## 🔍 如果遇到问题

1. **Node.js 未安装**: `brew install node`
2. **依赖安装失败**: `rm -rf node_modules && npm install`
3. **类型错误**: 不影响运行，已处理兼容性
4. **端口占用**: 自动选择可用端口

---

�� **享受现代多页面应用开发！**
