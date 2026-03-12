#!/bin/bash
# AI Compare 一键启动脚本

echo "🔀 AI Compare - 多模型 AI 聊天并排对比工具"
echo "================================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误：Node.js 版本过低（当前 $(node --version)），需要 18+"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖（可能需要几分钟）..."
    npm install --legacy-peer-deps
fi

# 构建并启动
echo "🔨 构建中..."
npm run build

echo "🚀 启动应用..."
npm run electron
