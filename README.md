<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/32c8b6ba-d1ea-46a9-abaf-04782b5e7973

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Desktop Build

Windows:
`build.bat`

macOS:
`bash build.command`

What the build script does:
- installs dependencies
- builds the desktop app with Electron
- creates a version-independent local data directory
- creates the provider config only if it does not already exist
- launches the unpacked desktop app after the build finishes

Persistent local data:
- Windows: `%APPDATA%\\ScholarSync`
- macOS: `~/Library/Application Support/ScholarSync`

Important:
- customer data, mentor library data, and provider config are stored outside the code directory
- rebuilding or replacing the code folder will not overwrite existing local data
- if `config/providers.json` already exists, the build script keeps the existing keys and models untouched
