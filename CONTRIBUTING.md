# 贡献指南

感谢您对 `vite-plugin-multi-page` 的关注！我们欢迎任何形式的贡献。

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/vite-plugin-multi-page.git
cd vite-plugin-multi-page

# 安装依赖
npm install

# 构建插件
npm run build

# 运行示例项目
npm run example:dev
```

## 📋 开发流程

我们使用 **Git Flow** 工作流程进行开发：

### 1. 功能开发

```bash
# 开始新功能
npm run git:feature start mobile-support

# 开发完成后
npm run git:feature finish mobile-support
```

### 2. 发布流程

```bash
# 开始发布准备
npm run git:release start 1.1.0

# 完成发布
npm run git:release finish 1.1.0

# 发布到 npm
npm run git:release publish minor
```

### 3. 紧急修复

```bash
# 开始紧急修复
npm run git:hotfix start 1.0.1

# 完成修复
npm run git:hotfix finish 1.0.1
```

## 🔧 代码规范

### 代码风格

我们使用 ESLint + Prettier 确保代码质量：

```bash
# 检查代码风格
npm run lint

# 自动格式化
npm run format

# 检查格式
npm run format:check

# 类型检查
npm run type-check
```

### 提交信息

请使用 [约定式提交](https://www.conventionalcommits.org/zh-hans/) 格式：

```
feat: 添加移动端支持
fix: 修复构建路径问题
docs: 更新README文档
style: 修复代码格式
refactor: 重构配置系统
test: 添加单元测试
chore: 更新依赖版本
```

## 📁 项目结构

```
vite-plugin-multi-page/
├── src/                    # 插件源码
│   ├── index.ts           # 插件入口
│   ├── types.ts           # 类型定义
│   ├── build-config.ts    # 构建配置
│   ├── dev-server.ts      # 开发服务器
│   ├── file-filter.ts     # 文件过滤
│   └── utils.ts           # 工具函数
├── example/               # 示例项目
├── scripts/               # 发布脚本
├── .github/workflows/     # CI/CD 配置
└── docs/                  # 文档
```

## 🧪 测试

目前我们使用示例项目进行测试：

```bash
# 测试开发模式
npm run example:dev

# 测试构建
npm run example:build

# 测试预览
npm run example:preview
```

## 🎯 贡献类型

### Bug 修复

1. 在 Issues 中描述问题
2. 创建 hotfix 分支
3. 修复问题并添加测试
4. 提交 PR

### 新功能

1. 在 Issues 中讨论功能需求
2. 创建 feature 分支
3. 实现功能并添加示例
4. 更新文档
5. 提交 PR

### 文档改进

1. 直接在 main 分支提交
2. 或创建 docs 分支

## 📝 PR 检查清单

提交 PR 前请确保：

- [ ] 代码通过所有检查 (`npm run lint`)
- [ ] 格式正确 (`npm run format:check`)
- [ ] 类型检查通过 (`npm run type-check`)
- [ ] 构建成功 (`npm run build`)
- [ ] 示例项目正常工作
- [ ] 更新了相关文档
- [ ] 添加了必要的测试
- [ ] 更新了 CHANGELOG.md

## 🏷️ 版本管理

我们遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **补丁版本** (1.0.1): Bug 修复
- **次要版本** (1.1.0): 新功能，向后兼容
- **主要版本** (2.0.0): 破坏性变更

## 📄 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。
