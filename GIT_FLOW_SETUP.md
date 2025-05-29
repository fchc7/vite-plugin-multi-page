# 🔄 Git Flow 和 NPM 发布流程设置

本文档总结了为 `vite-plugin-multi-page` 项目添加的完整 Git Flow 工作流和 npm 发布流程。

## 📋 已添加的功能

### 1. Git Flow 脚本

#### Feature 分支管理 (`scripts/git-feature.sh`)

```bash
# 开始新功能
npm run git:feature start <feature-name>

# 完成功能开发
npm run git:feature finish <feature-name>

# 列出所有功能分支
npm run git:feature list
```

#### Release 分支管理 (`scripts/git-release.sh`)

```bash
# 开始发布准备
npm run git:release start <version>

# 完成发布
npm run git:release finish <version>

# 发布到 npm
npm run git:release publish <type>
```

#### Hotfix 分支管理 (`scripts/git-hotfix.sh`)

```bash
# 开始紧急修复
npm run git:hotfix start <version>

# 完成紧急修复
npm run git:hotfix finish <version>
```

### 2. NPM 发布脚本

#### 版本管理

```bash
# 自动更新版本号
npm run version:patch  # 1.0.0 -> 1.0.1
npm run version:minor  # 1.0.0 -> 1.1.0
npm run version:major  # 1.0.0 -> 2.0.0
```

#### 直接发布

```bash
# 发布新版本（包含版本更新）
npm run release:patch  # 补丁版本
npm run release:minor  # 次要版本
npm run release:major  # 主要版本
npm run release:beta   # Beta 版本
npm run release:alpha  # Alpha 版本
```

#### 发布前检查

```bash
# 运行完整的发布前检查
npm run pre-release
```

### 3. GitHub Actions 自动化

#### CI 工作流 (`.github/workflows/ci.yml`)

- 在 `main` 和 `develop` 分支推送时触发
- 多 Node.js 版本测试 (16.x, 18.x, 20.x)
- 自动运行 lint、格式检查、类型检查、构建
- 测试示例项目构建

#### 自动发布工作流 (`.github/workflows/release.yml`)

- 推送标签时自动触发
- 自动发布到 npm
- 创建 GitHub Release

### 4. 项目文档

#### 新增文档

- `CONTRIBUTING.md` - 贡献指南
- `CHANGELOG.md` - 变更日志
- `RELEASE.md` - 发布指南
- `GIT_FLOW_SETUP.md` - 本文档

#### 更新文档

- `README.md` - 添加 Git Flow 和发布流程说明
- `package.json` - 添加所有相关脚本

### 5. 配置文件增强

#### `.gitignore`

- 扩展忽略规则
- 添加构建、缓存、临时文件等

#### `package.json`

- 添加 `publishConfig` 配置
- 完善 `prepack`、`prepublishOnly`、`postpublish` 钩子
- 添加所有 Git Flow 和发布相关脚本

## 🚀 使用示例

### 标准功能开发流程

```bash
# 1. 开始新功能
npm run git:feature start vue-support

# 2. 开发功能...
# ... 编写代码 ...

# 3. 完成功能
npm run git:feature finish vue-support
```

### 标准发布流程

```bash
# 1. 开始发布准备
npm run git:release start 1.1.0

# 2. 测试和调整
npm run example:dev
npm run example:build

# 3. 完成发布
npm run git:release finish 1.1.0

# 4. 发布到 npm
npm run git:release publish minor
```

### 紧急修复流程

```bash
# 1. 开始紧急修复
npm run git:hotfix start 1.0.1

# 2. 修复问题...
# ... 修复代码 ...

# 3. 完成修复
npm run git:hotfix finish 1.0.1

# 4. 发布修复版本
npm run release:patch
```

### 自动化发布

```bash
# 推送标签自动触发 GitHub Actions 发布
git tag v1.1.0
git push origin v1.1.0
```

## 🔧 配置说明

### GitHub Secrets 配置

为了使自动发布正常工作，需要在 GitHub 仓库设置中添加：

1. **NPM_TOKEN**: npm 发布令牌

   - 访问 https://npmjs.com
   - 生成 Automation 类型的 Access Token
   - 在 GitHub 仓库 Settings → Secrets → Actions 中添加

2. **GITHUB_TOKEN**: GitHub 令牌（自动提供）
   - 用于创建 GitHub Release
   - 无需手动配置

### 分支策略

- `main`: 生产分支，只接受来自 `release` 和 `hotfix` 的合并
- `develop`: 开发分支，功能开发完成后合并到此分支
- `feature/*`: 功能分支，从 `develop` 创建
- `release/*`: 发布分支，从 `develop` 创建，完成后合并到 `main` 和 `develop`
- `hotfix/*`: 紧急修复分支，从 `main` 创建，完成后合并到 `main` 和 `develop`

## 📊 工作流程图

```
develop ──┬── feature/new-feature ──┐
          │                         │
          └─────────────────────────┴── (合并)
          │
          └── release/1.1.0 ──┬── main ── v1.1.0 (发布)
                               │
                               └── develop (合并回)

main ─── hotfix/1.0.1 ──┬── main ── v1.0.1 (紧急发布)
                        │
                        └── develop (合并)
```

## ✅ 验证清单

安装完成后，验证以下功能：

- [ ] `npm run git:feature` 显示帮助信息
- [ ] `npm run git:release` 显示帮助信息
- [ ] `npm run git:hotfix` 显示帮助信息
- [ ] `npm run pre-release` 能正常运行检查
- [ ] 所有脚本具有执行权限
- [ ] GitHub Actions 工作流配置正确
- [ ] 文档完整且准确

## 🎯 后续改进

可以考虑的后续改进：

1. **单元测试**: 添加自动化测试
2. **代码覆盖率**: 集成覆盖率报告
3. **性能测试**: 添加性能基准测试
4. **文档生成**: 自动生成 API 文档
5. **依赖更新**: 自动化依赖更新流程

---

通过这套完整的 Git Flow 和发布流程，项目现在具备了：

- 规范化的开发流程
- 自动化的质量检查
- 可靠的版本管理
- 便捷的发布机制
- 完善的文档体系

这将大大提高项目的开发效率和发布质量！
