#!/bin/bash

# Git Flow Hotfix 分支管理脚本

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_usage() {
    echo "使用方法:"
    echo "  npm run git:hotfix start <version>   # 开始紧急修复"
    echo "  npm run git:hotfix finish <version>  # 完成紧急修复"
    echo ""
    echo "示例:"
    echo "  npm run git:hotfix start 1.0.1"
    echo "  npm run git:hotfix finish 1.0.1"
    echo ""
    echo "说明:"
    echo "  hotfix 分支从 main 分支创建，用于修复生产环境的紧急问题"
    echo "  完成后会同时合并到 main 和 develop 分支"
}

case "$1" in
    "start")
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请提供版本号${NC}"
            print_usage
            exit 1
        fi
        
        VERSION="$2"
        HOTFIX_BRANCH="hotfix/$VERSION"
        
        echo -e "${PURPLE}🚨 开始紧急修复: v$VERSION${NC}"
        
        # 确保在 main 分支
        git checkout main
        git pull origin main
        
        # 创建 hotfix 分支
        git checkout -b "$HOTFIX_BRANCH"
        
        # 更新版本号
        echo -e "${YELLOW}📝 更新版本号到 $VERSION${NC}"
        npm version "$VERSION" --no-git-tag-version
        
        # 提交版本更改
        git add package.json
        git commit -m "chore: bump version to $VERSION for hotfix"
        
        echo -e "${GREEN}✅ 紧急修复分支 $HOTFIX_BRANCH 已创建${NC}"
        echo -e "${YELLOW}💡 提示: 修复完成后运行 'npm run git:hotfix finish $VERSION'${NC}"
        echo -e "${PURPLE}⚠️  注意: 请只修复紧急问题，避免添加新功能${NC}"
        ;;
        
    "finish")
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请提供版本号${NC}"
            print_usage
            exit 1
        fi
        
        VERSION="$2"
        HOTFIX_BRANCH="hotfix/$VERSION"
        
        echo -e "${PURPLE}🔧 完成紧急修复: v$VERSION${NC}"
        
        # 检查是否在正确的分支
        CURRENT_BRANCH=$(git branch --show-current)
        if [ "$CURRENT_BRANCH" != "$HOTFIX_BRANCH" ]; then
            echo -e "${YELLOW}切换到紧急修复分支: $HOTFIX_BRANCH${NC}"
            git checkout "$HOTFIX_BRANCH"
        fi
        
        # 运行测试和检查
        echo -e "${YELLOW}🧪 运行代码检查...${NC}"
        pnpm run lint
        pnpm run format:check
        pnpm run type-check
        pnpm run build
        
        # 合并到 main 分支
        echo -e "${YELLOW}🔀 合并到 main 分支...${NC}"
        git checkout main
        git pull origin main
        git merge --no-ff "$HOTFIX_BRANCH" -m "hotfix: v$VERSION"
        
        # 创建标签
        git tag -a "v$VERSION" -m "hotfix: v$VERSION"
        
        # 合并到 develop 分支
        echo -e "${YELLOW}🔀 合并到 develop 分支...${NC}"
        git checkout develop
        git pull origin develop
        git merge --no-ff "$HOTFIX_BRANCH" -m "hotfix: merge v$VERSION to develop"
        
        # 删除 hotfix 分支
        git branch -d "$HOTFIX_BRANCH"
        
        # 推送所有更改
        git push origin main
        git push origin develop
        git push origin "v$VERSION"
        
        echo -e "${GREEN}✅ 紧急修复 v$VERSION 已完成${NC}"
        echo -e "${YELLOW}💡 提示: 运行 'npm run release:patch' 发布到 npm${NC}"
        ;;
        
    *)
        echo -e "${RED}错误: 未知命令 '$1'${NC}"
        print_usage
        exit 1
        ;;
esac 