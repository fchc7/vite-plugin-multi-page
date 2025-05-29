# 🚀 发布指南

本文档描述了 `vite-plugin-multi-page` 的完整发布流程。

## 📋 发布前准备

### 1. 环境检查

```bash
# 确保 Node.js 版本
node --version  # >= 16

# 确保 npm 登录
npm whoami

# 确保有发布权限
npm access ls-packages
```

### 2. 代码准备

```bash
# 确保在 main 分支
git checkout main
git pull origin main

# 运行发布前检查
npm run pre-release
```

## 🔄 Git Flow 发布流程

### 标准发布流程

```bash
# 1. 开始发布（从 develop 分支）
npm run git:release start 1.1.0

# 2. 测试和调整（在 release/1.1.0 分支）
npm run example:dev
npm run example:build

# 3. 完成发布（合并到 main 和 develop）
npm run git:release finish 1.1.0

# 4. 发布到 npm
npm run git:release publish minor
```

### 紧急修复流程

```bash
# 1. 开始紧急修复（从 main 分支）
npm run git:hotfix start 1.0.1

# 2. 修复问题
# ... 修复代码 ...

# 3. 完成修复
npm run git:hotfix finish 1.0.1

# 4. 发布到 npm
npm run release:patch
```

## 📦 直接发布流程

如果不使用 Git Flow，可以直接发布：

### 补丁版本 (Bug 修复)

```bash
npm run pre-release
npm run release:patch
```

### 次要版本 (新功能)

```bash
npm run pre-release
npm run release:minor
```

### 主要版本 (破坏性变更)

```bash
npm run pre-release
npm run release:major
```

### 预发布版本

```bash
# Alpha 版本（内测）
npm run release:alpha

# Beta 版本（公测）
npm run release:beta
```

## 🎯 版本策略

我们遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

| 版本类型         | 何时使用           | 示例          |
| ---------------- | ------------------ | ------------- |
| **补丁** (Patch) | Bug 修复，向后兼容 | 1.0.0 → 1.0.1 |
| **次要** (Minor) | 新功能，向后兼容   | 1.0.0 → 1.1.0 |
| **主要** (Major) | 破坏性变更         | 1.0.0 → 2.0.0 |
| **Alpha**        | 内测版本           | 1.0.0-alpha.1 |
| **Beta**         | 公测版本           | 1.0.0-beta.1  |

## 🤖 自动化发布

### GitHub Actions

推送标签会自动触发发布：

```bash
git tag v1.1.0
git push origin v1.1.0
```

自动执行：

1. 运行所有检查
2. 构建项目
3. 发布到 npm
4. 创建 GitHub Release

### 配置 npm token

在 GitHub 仓库设置中添加：

1. `Settings` → `Secrets and variables` → `Actions`
2. 添加 `NPM_TOKEN`（从 npmjs.com 获取）

## 📝 发布检查清单

发布前确保：

- [ ] 所有功能已完成并测试
- [ ] 代码通过所有检查（lint, format, type-check）
- [ ] 示例项目正常工作
- [ ] 更新了 CHANGELOG.md
- [ ] 更新了版本号
- [ ] 文档是最新的
- [ ] 没有 TODO 或 FIXME 注释
- [ ] Git 工作区干净
- [ ] 与远程仓库同步

## 🚨 回滚发布

如果发布有问题：

### npm 回滚

```bash
# 废弃有问题的版本
npm deprecate vite-plugin-multi-page@1.1.0 "有重大 bug，请使用 1.0.9"

# 发布修复版本
npm run release:patch
```

### Git 回滚

```bash
# 删除有问题的标签
git tag -d v1.1.0
git push origin --delete v1.1.0

# 创建修复版本
npm run git:hotfix start 1.1.1
# ... 修复问题 ...
npm run git:hotfix finish 1.1.1
```

## 📊 发布后检查

发布成功后：

1. **验证 npm 包**：

   ```bash
   npm view vite-plugin-multi-page
   npm install vite-plugin-multi-page@latest
   ```

2. **检查 GitHub Release**：

   - 确认 Release 页面正确
   - 检查下载链接

3. **更新文档**：

   - 更新示例项目
   - 通知用户升级

4. **监控反馈**：
   - 关注 GitHub Issues
   - 查看下载量统计

## 🔗 相关链接

- [npm 包页面](https://www.npmjs.com/package/vite-plugin-multi-page)
- [GitHub Releases](https://github.com/your-username/vite-plugin-multi-page/releases)
- [CHANGELOG.md](./CHANGELOG.md)
- [贡献指南](./CONTRIBUTING.md)
