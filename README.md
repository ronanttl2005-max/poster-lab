# Poster Lab · 海报灵感系统

Poster Lab 把散落的参考图沉淀成可浏览、可编辑、可继续扩展的个人海报设计系统。项目现在包含一个零构建前端和一个零第三方依赖的 Node.js 后端。

- **灵感库**：48 张参考图，按风格归档并记录值得学习的点
- **风格体系**：可复用的色板、字体、版式、效果与 AI 提示词
- **模板工坊**：编辑文字、颜色和图片，导出 2x PNG
- **REST API**：读取风格、灵感和模板，支持受保护的新增与修改
- **可靠回退**：API 不可用时，前端自动使用仓库内置数据

## 一键本地运行

需要 Node.js 18 或更新版本：

```bash
npm start
```

浏览器打开 <http://127.0.0.1:4173>。同一个 Node 进程会同时提供网页和 `/api`。

运行测试：

```bash
npm test
```

如果只想预览静态版本，也可以运行 `python3 -m http.server 4173`。静态模式不会启动后端，页面会自动使用 `data/*.js` 中的数据。

## API

常用只读接口：

- `GET /api/health`
- `GET /api/bootstrap`
- `GET /api/styles`
- `GET /api/inspirations`
- `GET /api/templates`

写接口使用 `POST`、`PUT` 或 `PATCH`。公开部署时必须配置 `POSTER_LAB_ADMIN_TOKEN`，并发送 `Authorization: Bearer <token>`。完整接口与存储说明见 [`server/README.md`](server/README.md)。

## 环境变量

复制 `.env.example` 中的示例值到部署平台的环境变量设置中。服务本身不会自动读取 `.env` 文件。

| 变量 | 用途 |
| --- | --- |
| `HOST` | 本机默认 `127.0.0.1`；云端使用 `0.0.0.0` |
| `PORT` | 默认 `4173`；托管平台通常自动提供 |
| `POSTER_LAB_ADMIN_TOKEN` | 保护所有写接口，公开部署必须设置 |
| `POSTER_LAB_DATA_FILE` | JSON 持久化文件路径 |
| `CORS_ORIGIN` | 分离部署时唯一允许的前端来源；同源部署留空 |

## GitHub 与部署

推荐流程：

1. 把源码推送到 GitHub 私有仓库。
2. 在 Render 或 Railway 导入该仓库。
3. 启动命令设为 `npm start`，健康检查使用 `/api/health`。
4. 设置 `HOST=0.0.0.0` 和随机生成的 `POSTER_LAB_ADMIN_TOKEN`。
5. 如需长期保存 API 写入内容，为 `POSTER_LAB_DATA_FILE` 配置持久磁盘路径。

仓库带有 `render.yaml`，可用于 Render Blueprint。免费/无持久磁盘部署仍能正常浏览网站和读取内置数据，但通过 API 新增的内容可能在重新部署后丢失。

GitHub Pages 只能托管静态前端，不能运行本项目的 Node 后端；静态页面仍可正常浏览和制作海报，因为前端有内置数据回退。

## 目录结构

```text
├── index.html
├── css/style.css
├── js/app.js              # 路由、页面和 API 数据接入
├── js/api.js              # API 客户端与静态回退
├── js/editor.js           # 模板编辑器
├── js/templates.js        # 可编辑海报模板
├── data/styles.js         # 风格体系种子数据
├── data/inspirations.js   # 灵感种子数据
├── assets/inspirations/   # 灵感图片
├── server/index.js        # 静态服务与 REST API
├── server/store.js        # JSON 持久化数据层
├── server/index.test.js   # 后端测试
├── inbox/                 # 新灵感投放处
├── render.yaml            # Render 部署配置
└── AGENTS.md              # AI 接手与维护规则
```

## 继续交给 Agent 开发

让新的 Agent 先完整阅读 `AGENTS.md` 和本文件，再检查 `git status`。新增灵感时不要删除已有图片；修改 API 时要保留写入鉴权和静态文件白名单。
