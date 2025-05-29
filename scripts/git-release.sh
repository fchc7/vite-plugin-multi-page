#!/bin/bash

# Git Flow Release 分支管理脚本

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "使用方法:"
    echo "  npm run git:release start <version>    # 开始发布准备"
    echo "  npm run git:release finish <version>   # 完成发布"
    echo "  npm run git:release publish <type>     # 发布到 npm"
    echo ""
    echo "版本类型 (publish):"
    echo "  patch  - 修复版本 (1.0.0 -> 1.0.1)"
    echo "  minor  - 功能版本 (1.0.0 -> 1.1.0)"
    echo "  major  - 主要版本 (1.0.0 -> 2.0.0)"
    echo "  beta   - 测试版本 (1.0.0 -> 1.0.1-beta.0)"
    echo "  alpha  - 内测版本 (1.0.0 -> 1.0.1-alpha.0)"
    echo ""
    echo "示例:"
    echo "  npm run git:release start 1.1.0"
    echo "  npm run git:release finish 1.1.0"
    echo "  npm run git:release publish minor"
}

case "$1" in
    "start")
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请提供版本号${NC}"
            print_usage
            exit 1
        fi
        
        VERSION="$2"
        RELEASE_BRANCH="release/$VERSION"
        
        echo -e "${YELLOW}🚀 开始发布准备: v$VERSION${NC}"
        
        # 确保在 develop 分支
        git checkout develop
        git pull origin develop
        
        # 创建 release 分支
        git checkout -b "$RELEASE_BRANCH"
        
        # 更新版本号
        echo -e "${YELLOW}📝 更新版本号到 $VERSION${NC}"
        npm version "$VERSION" --no-git-tag-version
        
        # 运行构建和测试
        echo -e "${YELLOW}🧪 运行测试和构建...${NC}"
        npm run lint
        npm run format:check
        npm run type-check
        npm run build
        
        # 提交版本更改
        git add package.json
        git commit -m "chore: bump version to $VERSION"
        
        echo -e "${GREEN}✅ 发布分支 $RELEASE_BRANCH 已创建${NC}"
        echo -e "${YELLOW}💡 提示: 完成测试后运行 'npm run git:release finish $VERSION'${NC}"
        ;;
        
    "finish")
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请提供版本号${NC}"
            print_usage
            exit 1
        fi
        
        VERSION="$2"
        RELEASE_BRANCH="release/$VERSION"
        
        echo -e "${YELLOW}🔄 完成发布: v$VERSION${NC}"
        
        # 检查是否在正确的分支
        CURRENT_BRANCH=$(git branch --show-current)
        if [ "$CURRENT_BRANCH" != "$RELEASE_BRANCH" ]; then
            echo -e "${YELLOW}切换到发布分支: $RELEASE_BRANCH${NC}"
            git checkout "$RELEASE_BRANCH"
        fi
        
        # 最后一次检查
        echo -e "${YELLOW}🧪 最终检查...${NC}"
        npm run lint
        npm run format:check
        npm run type-check
        npm run build
        
        # 合并到 main 分支
        echo -e "${YELLOW}🔀 合并到 main 分支...${NC}"
        git checkout main
        git pull origin main
        git merge --no-ff "$RELEASE_BRANCH" -m "release: v$VERSION"
        
        # 创建标签
        git tag -a "v$VERSION" -m "release: v$VERSION"
        
        # 合并回 develop 分支
        echo -e "${YELLOW}🔀 合并回 develop 分支...${NC}"
        git checkout develop
        git pull origin develop
        git merge --no-ff "$RELEASE_BRANCH" -m "release: merge v$VERSION back to develop"
        
        # 删除 release 分支
        git branch -d "$RELEASE_BRANCH"
        
        # 推送所有更改
        git push origin main
        git push origin develop
        git push origin "v$VERSION"
        
        echo -e "${GREEN}✅ 发布 v$VERSION 已完成${NC}"
        echo -e "${YELLOW}💡 提示: 运行 'npm run git:release publish <type>' 发布到 npm${NC}"
        ;;
        
    "publish")
        if [ -z "$2" ]; then
            echo -e "${RED}错误: 请提供发布类型${NC}"
            print_usage
            exit 1
        fi
        
        RELEASE_TYPE="$2"
        
        # 确保在 main 分支
        git checkout main
        git pull origin main
        
        echo -e "${BLUE}📦 准备发布到 npm ($RELEASE_TYPE)...${NC}"
        
        case "$RELEASE_TYPE" in
            "patch"|"minor"|"major")
                npm run "release:$RELEASE_TYPE"
                ;;
            "beta")
                npm run release:beta
                ;;
            "alpha")
                npm run release:alpha
                ;;
            *)
                echo -e "${RED}错误: 不支持的发布类型 '$RELEASE_TYPE'${NC}"
                print_usage
                exit 1
                ;;
        esac
        
        echo -e "${GREEN}✅ 已发布到 npm${NC}"
        ;;
        
    *)
        echo -e "${RED}错误: 未知命令 '$1'${NC}"
        print_usage
        exit 1
        ;;
esac 