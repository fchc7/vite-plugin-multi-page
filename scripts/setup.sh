#!/bin/bash

# 项目初始化设置脚本

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 vite-plugin-multi-page 项目初始化${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js 未安装，请先安装 Node.js >= 16${NC}"
    echo "   macOS: brew install node"
    echo "   其他系统: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${YELLOW}⚠️  Node.js 版本过低 (当前: $(node --version))，需要 >= 16${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本检查通过: $(node --version)${NC}"

# 安装依赖
echo -e "${YELLOW}📦 安装项目依赖...${NC}"
npm install

# 构建插件
echo -e "${YELLOW}🔨 构建插件...${NC}"
npm run build

# 设置示例项目
echo -e "${YELLOW}🎯 设置示例项目...${NC}"
cd example
npm install
cd ..

echo -e "${GREEN}✅ 项目初始化完成！${NC}"

echo -e "${BLUE}🎉 下一步操作:${NC}"
echo -e "${YELLOW}  开发模式: npm run example:dev${NC}"
echo -e "${YELLOW}  构建测试: npm run example:build${NC}"
echo -e "${YELLOW}  代码检查: npm run lint${NC}"
echo -e "${YELLOW}  格式化代码: npm run format${NC}"

echo -e "${BLUE}📚 Git Flow 命令:${NC}"
echo -e "${YELLOW}  新功能: npm run git:feature start <name>${NC}"
echo -e "${YELLOW}  发布: npm run git:release start <version>${NC}"
echo -e "${YELLOW}  紧急修复: npm run git:hotfix start <version>${NC}"

echo -e "${BLUE}🚢 发布命令:${NC}"
echo -e "${YELLOW}  发布前检查: npm run pre-release${NC}"
echo -e "${YELLOW}  补丁版本: npm run release:patch${NC}"
echo -e "${YELLOW}  次要版本: npm run release:minor${NC}"
echo -e "${YELLOW}  主要版本: npm run release:major${NC}" 