@echo off
REM ScholarSync 本地部署脚本 (Windows Batch)
REM 运行此脚本前，请确保已安装 Node.js (https://nodejs.org/)

echo ==========================================
echo ScholarSync 本地部署脚本
echo ==========================================
echo.

REM 检查 Node.js 是否已安装
echo [1/4] 检查 Node.js 安装...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)
node --version

REM 检查 npm 是否可用
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm 不可用
    pause
    exit /b 1
)
echo ✓ Node.js 和 npm 已安装
echo.

REM 安装项目依赖
echo [2/4] 安装项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✓ 依赖安装完成
echo.

REM 检查环境变量文件
echo [3/4] 检查环境变量配置...
if not exist ".env.local" (
    echo ⚠️  未找到 .env.local 文件
    
    if exist ".env.local.template" (
        echo 发现 .env.local.template 模板文件
        echo 请手动执行: copy .env.local.template .env.local
        echo 然后编辑 .env.local 文件并填入你的 Gemini API Key
        echo 获取 API Key: https://ai.google.dev/
        pause
        exit /b 1
    ) else (
        echo ❌ 未找到 .env.local.template 模板文件
        echo 请手动创建 .env.local 文件并添加 GEMINI_API_KEY
        pause
        exit /b 1
    )
) else (
    echo ✓ 环境变量文件已存在
    echo 请确保已配置有效的 Gemini API Key
)
echo.

REM 启动应用
echo [4/4] 启动应用...
echo 正在运行: npm run dev
echo 应用启动后，请打开浏览器访问显示的地址
echo 通常默认为: http://localhost:5173
echo.
echo ==========================================
echo 准备启动应用...Good luck!
echo ==========================================
echo.

REM 启动开发服务器
call npm run dev

pause
