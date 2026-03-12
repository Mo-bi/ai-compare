@echo off
echo 🔀 AI Compare - 多模型 AI 聊天并排对比工具
echo ================================================

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到 Node.js，请先安装 Node.js 18+
    echo 下载地址：https://nodejs.org
    pause
    exit /b 1
)

:: 安装依赖（如果需要）
if not exist "node_modules" (
    echo 首次运行，正在安装依赖（可能需要几分钟）...
    npm install --legacy-peer-deps
)

:: 构建并启动
echo 构建中...
npm run build

echo 启动应用...
npm run electron

pause
