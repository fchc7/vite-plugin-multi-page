#!/bin/bash

echo "🚀 启动 Vue 移动端多页面应用演示"
echo "=================================="

# 检查是否在 example 目录
if [[ ! -f "package.json" ]]; then
    echo "❌ 请在 example 目录下运行此脚本"
    echo "   cd example && ./start-demo.sh"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装:"
    echo "   macOS: brew install node"
    echo "   其他: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js: $(node --version)"

# 检查依赖
if [[ ! -d "node_modules" ]]; then
    echo "📦 安装依赖..."
    npm install
    
    if [[ $? -ne 0 ]]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

echo "✅ 依赖已安装"

# 显示页面列表
echo ""
echo "📱 可用的演示页面:"
echo "1. Vue 移动端应用 - /vue-app.html"
echo "2. 原生移动端应用 - /app.html" 
echo "3. 管理后台 - /dashboard.html"
echo "4. 首页 - /home.html"
echo "5. 关于页面 - /about.html"

echo ""
echo "🎯 选择启动模式:"
echo "1) 开发模式 (推荐)"
echo "2) 构建并预览"
echo "3) 仅构建"

read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo "🔥 启动开发服务器..."
        echo "访问: http://localhost:5173/vue-app.html"
        npm run dev
        ;;
    2)
        echo "🔨 构建项目..."
        npm run build
        
        if [[ $? -eq 0 ]]; then
            echo "🌐 启动预览服务器..."
            echo "访问: http://localhost:3000"
            npm run serve
        else
            echo "❌ 构建失败"
            exit 1
        fi
        ;;
    3)
        echo "🔨 仅构建项目..."
        npm run build
        
        if [[ $? -eq 0 ]]; then
            echo "✅ 构建完成！"
            echo "构建产物位于: dist/"
            ls -la dist/
        else
            echo "❌ 构建失败"
            exit 1
        fi
        ;;
    *)
        echo "❌ 无效选择，默认启动开发模式"
        echo "🔥 启动开发服务器..."
        npm run dev
        ;;
esac 