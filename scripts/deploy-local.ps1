
# ScholarSync Local Deployment Script (Windows)

Write-Host "Starting ScholarSync Local Deployment..." -ForegroundColor Cyan

# 1. Check for Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install it from https://nodejs.org/"
    exit
}

# 2. Install Dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# 3. Create Data Directory
if (!(Test-Path "data")) {
    New-Item -ItemType Directory -Path "data"
    Write-Host "Created data directory." -ForegroundColor Green
}

# 4. Check for .env.local
if (!(Test-Path ".env.local")) {
    Write-Host "Creating .env.local template..." -ForegroundColor Yellow
    "GEMINI_API_KEY=your_api_key_here" | Out-File -FilePath ".env.local" -Encoding utf8
    Write-Host "Please edit .env.local and add your GEMINI_API_KEY." -ForegroundColor Red
}

# 5. Start the application
Write-Host "Starting application (Backend + Frontend)..." -ForegroundColor Green
Write-Host "The app will be available at http://localhost:3000" -ForegroundColor Cyan
npm run dev
