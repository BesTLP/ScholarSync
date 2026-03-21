#!/bin/bash

# ScholarSync Local Deployment Script (Linux/Mac)

echo -e "\033[0;36mStarting ScholarSync Local Deployment...\033[0m"

# 1. Check for Node.js
if ! command -v node &> /dev/null
then
    echo -e "\033[0;31mNode.js is not installed. Please install it from https://nodejs.org/\033[0m"
    exit
fi

# 2. Install Dependencies
echo -e "\033[0;33mInstalling dependencies...\033[0m"
npm install

# 3. Create Data Directory
if [ ! -d "data" ]; then
    mkdir data
    echo -e "\033[0;32mCreated data directory.\033[0m"
fi

# 4. Check for .env.local
if [ ! -f ".env.local" ]; then
    echo -e "\033[0;33mCreating .env.local template...\033[0m"
    echo "GEMINI_API_KEY=your_api_key_here" > .env.local
    echo -e "\033[0;31mPlease edit .env.local and add your GEMINI_API_KEY.\033[0m"
fi

# 5. Start the application
echo -e "\033[0;32mStarting application (Backend + Frontend)...\033[0m"
echo -e "\033[0;36mThe app will be available at http://localhost:3000\033[0m"
npm run dev
