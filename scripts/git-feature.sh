#!/bin/bash

# Git Flow Feature 分支管理脚本

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_usage() {
    echo "使用方法:"
    echo "  npm run git:feature start <feature-name>  # 开始新功能"
    echo "  npm run git:feature finish <feature-name> # 完成功能开发"
    echo "  npm run git:feature list                  # 列出所有功能分支"
    echo ""
    echo "示例:"
    echo "  npm run git:feature start mobile-support"
    echo "  npm run git:feature finish mobile-support"
}

case "$1" in
    "start")
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请提供功能名称${NC}"
            print_usage
            exit 1
        fi
        
        FEATURE_NAME="$2"
        echo -e "${YELLOW}🚀 开始新功能: $FEATURE_NAME${NC}"
        
        # 确保在 develop 分支
        git checkout develop
        git pull origin develop
        
        # 创建并切换到 feature 分支
        git checkout -b "feature/$FEATURE_NAME"
        
        echo -e "${GREEN}✅ 功能分支 feature/$FEATURE_NAME 已创建${NC}"
        echo -e "${YELLOW}💡 提示: 开发完成后运行 'npm run git:feature finish $FEATURE_NAME'${NC}"
        ;;
        
    "finish")
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请提供功能名称${NC}"
            print_usage
            exit 1
        fi
        
        FEATURE_NAME="$2"
        FEATURE_BRANCH="feature/$FEATURE_NAME"
        
        echo -e "${YELLOW}🔄 完成功能: $FEATURE_NAME${NC}"
        
        # 检查是否在正确的分支
        CURRENT_BRANCH=$(git branch --show-current)
        if [ "$CURRENT_BRANCH" != "$FEATURE_BRANCH" ]; then
            echo -e "${YELLOW}切换到功能分支: $FEATURE_BRANCH${NC}"
            git checkout "$FEATURE_BRANCH"
        fi
        
        # 运行测试和检查
        echo -e "${YELLOW}🧪 运行代码检查...${NC}"
        pnpm run lint
        pnpm run format:check
        pnpm run type-check
        
        # 切换到 develop 并合并
        git checkout develop
        git pull origin develop
        git merge --no-ff "$FEATURE_BRANCH" -m "完成功能: $FEATURE_NAME"
        
        # 删除本地功能分支
        git branch -d "$FEATURE_BRANCH"
        
        # 推送到远程
        git push origin develop
        
        echo -e "${GREEN}✅ 功能 $FEATURE_NAME 已完成并合并到 develop${NC}"
        echo -e "${YELLOW}💡 提示: 可以运行 'git push origin --delete feature/$FEATURE_NAME' 删除远程分支${NC}"
        ;;
        
    "list")
        echo -e "${YELLOW}📋 当前功能分支:${NC}"
        git branch | grep "feature/" || echo "暂无功能分支"
        ;;
        
    *)
        echo -e "${RED}错误: 未知命令 '$1'${NC}"
        print_usage
        exit 1
        ;;
esac 