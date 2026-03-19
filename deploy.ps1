# ScholarSync 本地部署脚本 (Windows PowerShell)
# 运行此脚本前，请确保已安装 Node.js (https://nodejs.org/)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ScholarSync 本地部署脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否已安装
Write-Host "[1/4] 检查 Node.js 安装..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ 未检测到 Node.js" -ForegroundColor Red
    Write-Host "请先安装 Node.js: https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js 已安装: $nodeVersion" -ForegroundColor Green

# 检查 npm 是否可用
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "❌ npm 不可用" -ForegroundColor Red
    exit 1
}
Write-Host "✓ npm 已安装: v$npmVersion" -ForegroundColor Green
Write-Host ""

# 安装项目依赖
Write-Host "[2/4] 安装项目依赖..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 依赖安装完成" -ForegroundColor Green
Write-Host ""

# 检查环境变量文件
Write-Host "[3/4] 检查环境变量配置..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  未找到 .env.local 文件" -ForegroundColor Yellow
    
    if (Test-Path ".env.local.template") {
        Write-Host "发现 .env.local.template 模板文件" -ForegroundColor Cyan
        
        # 询问是否从模板创建
        $response = Read-Host "是否从模板创建 .env.local 文件? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Copy-Item ".env.local.template" ".env.local"
            Write-Host "✓ 已创建 .env.local 文件" -ForegroundColor Green
            Write-Host "⚠️  请编辑 .env.local 文件并填入你的 Gemini API Key" -ForegroundColor Yellow
        } else {
            Write-Host "❌ 需要手动创建 .env.local 文件" -ForegroundColor Red
            Write-Host "请执行: copy .env.local.template .env.local" -ForegroundColor Cyan
            exit 1
        }
    } else {
        Write-Host "❌ 未找到 .env.local.template 模板文件" -ForegroundColor Red
        Write-Host "请手动创建 .env.local 文件并添加 GEMINI_API_KEY" -ForegroundColor Red
        exit 1
    }
} else {
    # 检查是否已配置 API Key
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "VITE_GEMINI_API_KEY=your_api_key_here" -or -not ($envContent -match "VITE_GEMINI_API_KEY=.+")) {
        Write-Host "⚠️  检测到 .env.local 文件，但 API Key 未配置" -ForegroundColor Yellow
        Write-Host "请编辑 .env.local 文件并填入你的 Gemini API Key" -ForegroundColor Yellow
        Write-Host "获取 API Key: https://ai.google.dev/" -ForegroundColor Cyan
        exit 1
    }
    Write-Host "✓ 环境变量文件已配置" -ForegroundColor Green
}
Write-Host ""

# 启动应用
Write-Host "[4/4] 启动应用..." -ForegroundColor Yellow
Write-Host "正在运行: npm run dev" -ForegroundColor Gray
Write-Host "应用启动后，请打开浏览器访问显示的地址" -ForegroundColor Cyan
Write-Host "通常默认为: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "部署完成！享受使用 ScholarSync" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# 启动开发服务器
npm run dev
