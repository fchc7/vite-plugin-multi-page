# 发布前检查清单

## 📋 代码质量检查

- [ ] 运行 `npm run type-check` - TypeScript 类型检查通过
- [ ] 运行 `npm run lint` - ESLint 检查通过
- [ ] 运行 `npm run format:check` - Prettier 格式检查通过
- [ ] 运行 `npm run build` - 构建成功

## 🧪 功能测试

- [ ] 基础功能测试
  - [ ] 插件能正确扫描入口文件
  - [ ] HTML 模板替换正常工作
  - [ ] 开发服务器路由正确

- [ ] 多构建策略测试
  - [ ] 默认策略构建正常
  - [ ] Legacy 策略生成 ES5 代码
  - [ ] Mobile 策略优化配置生效
  - [ ] Library 策略库模式工作

- [ ] 配置功能测试
  - [ ] 对象配置正常工作
  - [ ] 函数配置动态匹配
  - [ ] 模式匹配功能正确
  - [ ] 环境变量注入成功

## 📱 示例项目测试

- [ ] 运行 `./setup-example.sh` 设置成功
- [ ] 运行 `npm run example:dev` 开发服务器启动
- [ ] 运行 `npm run example:build` 构建成功
- [ ] 检查构建产物：
  - [ ] `/home.html` 页面正常
  - [ ] `/about.html` 页面正常  
  - [ ] `/dashboard.html` 管理后台样式正确
  - [ ] `/app.html` 移动端样式正确
  - [ ] `/index.html` 组件库文档正确

## 📚 文档检查

- [ ] README.md 中文文档完整
- [ ] README-EN.md 英文文档完整
- [ ] 示例代码可以正常运行
- [ ] API 文档准确无误
- [ ] 安装说明正确

## 📦 包配置检查

- [ ] package.json 信息正确
  - [ ] 版本号更新
  - [ ] 描述信息准确
  - [ ] 关键词合适
  - [ ] 作者信息更新
  - [ ] 仓库链接正确
- [ ] files 字段包含必要文件
- [ ] 依赖版本合理
- [ ] scripts 脚本正确

## 🚀 发布准备

- [ ] 确认要发布的版本号
- [ ] 更新 CHANGELOG（如有）
- [ ] 确认 LICENSE 文件存在
- [ ] 确认没有敏感信息
- [ ] Git 仓库状态干净
- [ ] 准备发布到 npm

## ✅ 发布命令

```bash
# 最终检查
npm run prepublishOnly

# 发布（首次发布）
npm publish

# 发布（更新版本）
npm version patch|minor|major
npm publish
``` 