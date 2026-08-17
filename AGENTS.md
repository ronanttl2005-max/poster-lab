# Poster Lab · Agent 操作手册

本仓库是一个**个人海报设计系统**：灵感分类库 + 风格体系 + 可编辑海报模板，纯静态网页（无构建步骤，直接开 `index.html` 或任意静态服务器即可运行）。

作为 Agent，你最常被要求执行以下三类任务。**严格按流程执行，保持数据文件格式一致。**

---

## 任务一：新灵感入库（最高频）

用户会把新的灵感截图丢进 `inbox/` 文件夹，或直接在对话中发图，然后说"入库"之类的话。

流程：

1. **看图分析**：用 Read 工具查看图片，总结它的版式、用色、字体、效果。
2. **判断风格归属**：对照 `data/styles.js` 中已有风格的 `keywords` 和描述：
   - 能归入现有风格 → 用该 `styleId`；
   - 明显是新风格（与现有 8 类都不像）→ 先在 `data/styles.js` 末尾新增一个完整风格对象（含 aiPrompt），再入库。
3. **重命名并移动图片**：命名格式 `NN-语义化-slug.png`（NN 为当前最大编号 +1），移入 `assets/inspirations/`，并清空 `inbox/` 中的原图。
4. **追加数据记录**：在 `data/inspirations.js` 数组末尾追加：

```js
{
  file: "49-xxx.png",
  title: "简短中文标题",
  styleId: "已有或新建的风格 id",
  tags: ["3-5 个版式/用色/效果标签"],
  note: "这张图值得学习的点：具体到构图、字号关系、用色策略，一两句话，要能帮用户下次复刻。",
},
```

5. **（可选）沉淀为模板**：如果用户说"我想以后复用这个版式"，在 `js/templates.js` 中仿照现有模板新增一个可编辑模板（750×1000 画布，字段用 text/textarea/color/image/select/range）。
6. **提交**：`git add -A && git commit -m "add inspiration: <标题>" && git push`（若已配置远程）。

## 任务二：新增/修改海报模板

- 模板都在 `js/templates.js`，每个模板是 `{ id, name, styleId, desc, fields, render }`。
- `render(v)` 返回内联样式的 HTML 字符串，画布 750×1000，绝对定位布局。
- 文字一律经过 `esc()`/`rich()` 处理；`rich` 支持 `*斜体*` 标记。
- 新模板的 `styleId` 必须存在于 `data/styles.js`。

## 任务三：维护风格体系

- 风格定义在 `data/styles.js`。修改时保持字段完整：`id/name/nameEn/tagline/description/keywords/palette/typography/layout/effects/aiPrompt/refs`。
- `aiPrompt` 是给生图 AI 的中文提示词，要具体到构图、色彩、字体气质，一段话不分行。
- 合并或重命名风格时，同步更新 `data/inspirations.js` 中所有对应的 `styleId`。

---

## 校验

改完后本地起服务快速自检（四个页面都点一遍，控制台无报错）：

```bash
python3 -m http.server 4173
# 打开 http://localhost:4173
```

## 部署

- **GitHub Pages**：Settings → Pages → Deploy from branch → `main` / root。
- **Vercel**：Import 仓库，Framework 选 **Other**，无构建命令，输出目录留空，直接 Deploy。

## 禁止事项

- 不要引入构建工具（保持零构建，双击 index.html 也能跑）。
- 不要改动已有 `data/*.js` 记录的字段结构。
- 不要删除用户已入库的灵感图。
