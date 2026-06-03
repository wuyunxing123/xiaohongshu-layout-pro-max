# 小红书排版 Pro (Xiaohongshu Layout Pro)

上传 PPT 截图，按 5 套模板自动拼成 1200×1600（小红书标准 3:4）的图集，支持封面/副标题自定义、拖拽定位、AI 生成爆款标题、一键打包导出。

## 本地运行

**前置条件：** Node.js 18+

1. 安装依赖：`npm install`
2. 在 [.env.local](.env.local) 中填入 `VITE_GEMINI_API_KEY`（没有 AI 功能也能用，标题/排版照常工作）
3. 启动：`npm run dev`

## 测试

```bash
npm test        # 跑 calcLayoutInfo 的分页逻辑单测
```

## 部署到 Vercel

1. 把代码推到 GitHub 仓库
2. 在 [vercel.com](https://vercel.com) 选 **Add New Project → Import Git Repository**
3. 框架自动识别为 Vite，保持默认即可
   - Build Command: `npm run build`
   - Output: `dist`
4. **Settings → Environment Variables** 添加：
   - `VITE_GEMINI_API_KEY` = 你的 Gemini API key
5. 点 Deploy，首次部署约 1 分钟

之后每次 push 到 GitHub，Vercel 会自动重新部署。

## 项目结构

```
├── components/         React 组件（EditorPanel / PreviewGrid / TextHandles / ZoomModal / ErrorBoundary）
├── hooks/              自定义 hooks（usePersistedState / useLruImageCache）
├── lib/                纯函数库（canvasRenderer / layoutCalc / exportPng / constants）
├── services/           外部 API（geminiService）
├── tests/              vitest 单测
├── types.ts            全局类型
├── App.tsx             顶层协调层
└── vercel.json         Vercel 部署配置
```

## 特性

- 5 套小红书风格模板（首页五图流 / 精简目录流 / 单页纯享流 / 纯享画报流 / 双图大标题流）
- 实时拖拽调整封面标题/副标题位置
- LRU 图片缓存（避免大量截图时内存爆炸）
- localStorage 持久化配置（刷新不丢排版）
- AI 自动生成爆款标题（基于上传图片多模态理解）
- 拖拽中缩略图秒级响应，松手后恢复高清
- 一键打包为 zip 导出
- ErrorBoundary 兜底防白屏
