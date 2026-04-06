# Video2Sprite
instant use access：https://video2sprite.cc.cd/
一个纯浏览器端的 2D 游戏精灵图处理工具，无需后端，完全本地运行。

## 功能
- 视频帧提取：从视频中提取序列帧，精选有效画面
- Sprite Sheet 生成：将帧图片按点击顺序拼合为网格精灵图
- AI 背景去除：本地 AI 模型一键去除图片背景，无需联网

## 技术栈
TypeScript + React + Vite + Canvas 2D API + Web Worker + IndexedDB + ONNX Runtime Web

## 安装与运行

### 1. 克隆仓库
git clone `https://github.com/你的用户名/video2sprite.git`
cd video2sprite

### 2. 安装依赖
npm install

### 3. 启动开发服务器
npm run dev

浏览器打开 http://localhost:5173 即可使用。
AI 模型已内置，无需额外下载。

## 使用要求
- Chrome 或 Edge 最新版浏览器
- 支持 WebAssembly

## 联系方式
- 抖音：90758318785
- Discord： `https://discord.gg/cr4EJqEjw6`
- QQ 群：643936282

## License
MIT
