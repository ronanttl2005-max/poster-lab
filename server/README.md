# Poster Lab 本地 API

这个服务把现有静态网站和一个无需第三方依赖的 Node.js REST API 放在同一个进程中。数据以 `data/styles.js`、`data/inspirations.js` 和 `js/templates.js` 为初始种子；第一次写入时会在 `server/data.json` 生成本地覆盖层，后续重启会保留新增/修改的数据。

## 启动

需要 Node.js 18 或更新版本：

```bash
npm start
# 浏览器打开 http://127.0.0.1:4173
```

开发时可使用 `npm run dev`（Node 的 watch 模式）。端口和监听地址可以通过 `PORT`、`HOST` 环境变量修改，例如 `PORT=8080 npm start`。

本机默认只监听 `127.0.0.1`。如果部署到 Render、Railway 等平台，通常需要设置：

```bash
HOST=0.0.0.0
POSTER_LAB_ADMIN_TOKEN=请生成一个足够长的随机字符串
POSTER_LAB_DATA_FILE=/平台持久磁盘/poster-lab-data.json
```

平台一般会自动注入 `PORT`。`POSTER_LAB_DATA_FILE` 必须指向平台配置的持久磁盘，否则重新部署后写入内容可能丢失。

## API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/bootstrap` | 一次获取 `{ inspirations, styles, templates }` 三个数组 |
| GET | `/api/styles` | 风格列表 |
| GET | `/api/styles/:id` | 单个风格 |
| GET | `/api/inspirations` | 灵感列表 |
| GET | `/api/inspirations/:id` | 按 `id` 或文件名查找灵感 |
| GET | `/api/templates` | 模板元数据和编辑字段 |
| GET | `/api/templates/:id` | 单个模板元数据 |
| POST | `/api/styles`、`/api/inspirations`、`/api/templates` | 新增记录 |
| PATCH/PUT | `/api/styles/:id`、`/api/inspirations/:id`、`/api/templates/:id` | 修改记录 |

列表支持 `styleId`、`q`（全文搜索）、`page`、`pageSize` 查询参数。响应格式为 `{ data, meta }`；单个记录和写入响应为 `{ data }`。

模板 API 只返回字段定义，不返回 `render` 函数。实际海报渲染仍由浏览器中的 `js/templates.js` 完成。

### 写入鉴权与跨域

- 配置 `POSTER_LAB_ADMIN_TOKEN` 后，所有 `POST`、`PUT`、`PATCH` 请求必须发送 `Authorization: Bearer <token>`。
- 未配置 token 时，写接口只允许本机回环地址访问；远程请求返回 503。公开部署务必配置 token。
- 默认不发送跨域响应头，也就是浏览器按同源策略访问。确实需要分离部署前后端时，可以把 `CORS_ORIGIN` 设置成唯一允许的前端来源，例如 `https://example.github.io`；不要把公网环境设成 `*`。
- 静态服务使用白名单，只发布 `index.html` 以及 `css/`、`js/`、`data/`、`assets/`、`vendor/` 下的前端资源，不会发布 `.git`、`server/`、`.env` 或包配置。

## 本地存储与部署限制

`server/data.json`（或 `POSTER_LAB_DATA_FILE` 指向的文件）是适合单机/个人开发的 JSON 文件存储，不适合多进程并发、多人协作或云平台的无持久磁盘环境。生产部署应把数据层替换为数据库（例如 PostgreSQL/Supabase），并补充更严格的字段校验、速率限制和 HTTPS。静态前端可以继续独立部署到 GitHub Pages；需要使用 API 写入时，应部署此 Node 服务并把请求地址配置到前端。

## 测试

```bash
npm test
```
