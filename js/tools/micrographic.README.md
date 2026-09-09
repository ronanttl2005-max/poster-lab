# Micro-graphic 标签

入口：`#/tools/micrographic`。零构建，无新增 npm 依赖，无新增后端写接口。

- 形状：长方形、正方形、三角形、横椭圆、竖椭圆、菱形、六边形。
- 上传 JPG / PNG / WebP 后立即显示照片，手动填写短标题、画面文案、最多四个排版关键词和三个图标搜索词。上传新图会清空上一张图的文案。照片在浏览器本地处理。
- 按填写的搜索词用 Iconify 搜索 MDI 图标；编辑关键词会重新搜索，也能单独修改图标搜索词或换一组候选。在线路径经过 SVG 几何白名单清理再内嵌；失败时显示几何占位符和重试提示。界面与导出的 SVG 都保留来源/许可信息。
- 可变网格按形状的安全水平区间分配行高、列宽、文字层级与对齐方式。相同种子和参数得到相同排版。边界不是裁切遮罩，文字会测量换行/缩小后完整放进安全区域。
- 导出 1500 × 2000 PNG、包含嵌入图片和可编辑文字/图标的 SVG，以及同尺寸透明标签 PNG。辅助线不会导出。文字较长或标签很小时字号会自动缩小，建议使用短标题。
- 首次打开使用原创 SVG 街景和明确标注的内置示例文案/图标，无需网络即可看到完整效果。

实现文件：`micrographic.js`（界面/状态/导出），`micrographic-layout.js`（安全网格与文字测量），`micrographic-render.js`（SVG），`micrographic-services.js`（图标搜索与清理）。

自动测试：`npm test`，其中 `server/micrographic.test.js` 覆盖所有形状的安全边界、无重叠、种子复现、文字完整性和 SVG 转义。浏览器验收应检查上传、手动编辑、图标网络失败、快速换图或离开页面、七种形状与三个导出入口。

接口依据：[Iconify 搜索](https://iconify.design/docs/api/search.html)、[SVG 接口](https://iconify.design/docs/api/svg.html)。在线 MDI 图标来自 Pictogrammers，许可为 [Apache 2.0](https://github.com/Templarian/MaterialDesign/blob/master/LICENSE)。
