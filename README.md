# ScholarSync - 智能留学导师库管理系统

ScholarSync 是一款专为留学咨询设计的智能导师库管理系统。它集成了 Gemini AI，能够自动从非结构化文本中提取导师信息，并进行智能分类、评分与匹配。

## 主要功能

- **智能导师库**: 自动分类、归档和检索导师信息。
- **分级过滤**: 支持 国家 -> 省/州 -> 城市 -> 大学 -> 院系 的多级联动筛选。
- **AI 智能匹配**: 根据学生背景和目标，自动计算导师匹配度并给出深度解析。
- **文书工作台**: 集成 PS, CV, LOR, Essay 等多种文书创作工具。
- **客户管理**: 完整的客户生命周期管理，支持文档归档和进度跟踪。

## 本地部署指南

### 环境要求

- [Node.js](https://nodejs.org/) (建议 v18+)
- npm (随 Node.js 一起安装)

### 快速启动 (Windows)

1.  下载或克隆本项目。
2.  右键点击 `scripts/deploy-local.ps1`，选择 "使用 PowerShell 运行"。
3.  脚本会自动安装依赖并创建 `data` 目录。
4.  根据提示编辑生成的 `.env.local` 文件，填入你的 `GEMINI_API_KEY`。
5.  应用启动后，访问 [http://localhost:3000](http://localhost:3000)。

### 快速启动 (Linux/Mac)

1.  打开终端。
2.  赋予脚本执行权限: `chmod +x scripts/deploy-local.sh`
3.  运行脚本: `./scripts/deploy-local.sh`
4.  根据提示编辑 `.env.local` 文件。
5.  访问 [http://localhost:3000](http://localhost:3000)。

### 数据持久化

所有数据（导师库、客户信息）均存储在项目根目录下的 `data/` 文件夹中。
- `data/faculty_db.json`: 导师库数据。
- `data/clients.json`: 客户及文档数据。

你可以随时备份这些 JSON 文件，或在不同环境间迁移。

## 开发说明

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Express (用于数据持久化和 Vite 开发服务器)
- **AI**: Google Gemini API
