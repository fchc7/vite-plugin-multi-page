#!/bin/bash

# 发布前检查脚本

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 开始发布前检查...${NC}"

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ 错误: 只能在 main 分支发布${NC}"
    echo -e "${YELLOW}当前分支: $CURRENT_BRANCH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 分支检查通过 (main)${NC}"

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ 错误: 工作区不干净，请提交或暂存所有更改${NC}"
    git status --short
    exit 1
fi

echo -e "${GREEN}✅ 工作区检查通过${NC}"

# 检查远程同步
git fetch origin
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
    echo -e "${RED}❌ 错误: 本地分支与远程不同步${NC}"
    echo -e "${YELLOW}请运行: git pull origin main${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 远程同步检查通过${NC}"

# 安装依赖
echo -e "${YELLOW}📦 安装依赖...${NC}"
if [ -f "pnpm-lock.yaml" ]; then
    echo -e "${YELLOW}  使用 pnpm...${NC}"
    pnpm install --frozen-lockfile
else
    npm ci
fi

# 代码检查
echo -e "${YELLOW}🧪 运行代码检查...${NC}"

echo -e "${YELLOW}  - ESLint 检查...${NC}"
npm run lint

echo -e "${YELLOW}  - Prettier 格式检查...${NC}"
npm run format:check

echo -e "${YELLOW}  - TypeScript 类型检查...${NC}"
npm run type-check

echo -e "${GREEN}✅ 代码检查通过${NC}"

# 构建测试
echo -e "${YELLOW}🔨 构建测试...${NC}"
npm run build

echo -e "${GREEN}✅ 构建测试通过${NC}"

# 示例项目测试
echo -e "${YELLOW}🎯 示例项目测试...${NC}"
cd example
if [ -f "pnpm-lock.yaml" ]; then
    echo -e "${YELLOW}  示例项目使用 pnpm...${NC}"
    pnpm install
    pnpm run build
else
    npm install
    npm run build
fi
cd ..

echo -e "${GREEN}✅ 示例项目测试通过${NC}"

# 检查 package.json 字段
echo -e "${YELLOW}📝 检查 package.json...${NC}"

# 检查必要字段
REQUIRED_FIELDS=("name" "version" "description" "main" "module" "types" "author" "license" "repository")

for field in "${REQUIRED_FIELDS[@]}"; do
    if ! node -e "const pkg = require('./package.json'); if (!pkg.$field) process.exit(1);" 2>/dev/null; then
        echo -e "${RED}❌ 错误: package.json 缺少必要字段: $field${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ package.json 检查通过${NC}"

# 检查版本号格式
VERSION=$(node -e "console.log(require('./package.json').version)")
if ! echo "$VERSION" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$' > /dev/null; then
    echo -e "${RED}❌ 错误: 版本号格式不正确: $VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 版本号格式检查通过: $VERSION${NC}"

# 检查 CHANGELOG.md
if [ ! -f "CHANGELOG.md" ]; then
    echo -e "${RED}❌ 错误: 缺少 CHANGELOG.md 文件${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CHANGELOG.md 检查通过${NC}"

# 显示即将发布的信息
echo -e "${BLUE}📋 发布信息:${NC}"
echo -e "${YELLOW}  版本: $VERSION${NC}"
echo -e "${YELLOW}  分支: $CURRENT_BRANCH${NC}"
echo -e "${YELLOW}  提交: $(git rev-parse --short HEAD)${NC}"

echo -e "${GREEN}🎉 所有检查通过，可以发布！${NC}"
echo -e "${YELLOW}💡 运行以下命令发布:${NC}"
echo -e "${YELLOW}   npm run release:patch   # 补丁版本${NC}"
echo -e "${YELLOW}   npm run release:minor   # 次要版本${NC}"
echo -e "${YELLOW}   npm run release:major   # 主要版本${NC}" 