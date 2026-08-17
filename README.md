# Poster Lab · 海报灵感系统

把散落在相册里的设计灵感，沉淀成**可复用的设计系统**：

- **灵感库** — 所有收藏的参考图按风格归档，每张标注「值得学习的点」
- **风格体系** — 8 套设计语言（色板 / 字体 / 版式 / 效果 / AI 复刻提示词），给甲方定方向、给 AI 喂提示词
- **模板工坊** — 每套风格一个可编辑海报模板：改字、换色、传图、导出 2x PNG
- **工作流** — 新灵感丢给 AI 自动入库，系统随时间越养越厚

灵感来源：[tooooools.app](https://www.tooooools.app/)（文字工具）与 [effect.app](https://effect.app/)（图片效果）——本项目把两者的思路合并到「海报排版」场景。

## 本地运行

纯静态站，零构建、零依赖：

```bash
python3 -m http.server 4173
# 打开 http://localhost:4173
```

或直接双击 `index.html`（部分浏览器对 ES Module 的 file:// 有限制，推荐起服务）。

## 部署

**GitHub Pages**（推荐，零配置）

1. 推送本仓库到 GitHub
2. 仓库 Settings → Pages → Source 选 `Deploy from a branch` → `main` / `/ (root)`
3. 访问 `https://<用户名>.github.io/poster-lab/`

**Vercel**

1. vercel.com → Add New Project → Import 本仓库
2. Framework Preset 选 **Other**，Build Command 留空，直接 Deploy

## 目录结构

```
├── index.html            # 单页应用入口
├── css/style.css         # UI 样式
├── js/app.js             # 路由 + 灵感库 + 风格页 + 工作流页
├── js/editor.js          # 模板编辑器（实时预览 / 导出 PNG）
├── js/templates.js       # 可编辑海报模板（在此新增模板）
├── data/styles.js        # ★ 风格体系定义
├── data/inspirations.js  # ★ 灵感库数据（每图一条记录）
├── assets/inspirations/  # 灵感图片
├── inbox/                # 新灵感投放处（丢图进来 → 让 AI 入库）
├── vendor/               # html-to-image（PNG 导出）
└── AGENTS.md             # ★ AI 操作手册（入库/建模板/维护风格的标准流程）
```

## 日常使用

**收藏新灵感**：把截图丢进 `inbox/`，对 AI 说「按 AGENTS.md 把 inbox 里的新灵感入库」。AI 会自动分析、归类、写入数据文件并提交。

**快速出海报**：打开「模板工坊」→ 选模板 → 改文字/换色/传照片 → 导出 PNG。

**跟甲方对齐风格**：直接把「风格体系」页给对方翻一遍，选中哪套就用哪套的规则和提示词开工。
