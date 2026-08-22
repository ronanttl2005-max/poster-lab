// 预置收藏夹。线上 API 首次启动时会把这些作为 folders 种子，
// 静态模式也会通过前端 fallback 保留同样的系列归档。
export const FOLDERS = [
  {
    id: "folder-line-event-series",
    name: "线稿活动海报 · Design MORO / 湖集",
    kind: "theme",
    parentId: null,
    note: "四张单页与一张四联总览：黑线手绘图形、蓝黄红绿平面色块、活动信息排版。",
  },
  {
    id: "folder-crossover-series",
    name: "CROSS OVER · SPRING 配色系列",
    kind: "theme",
    parentId: null,
    note: "同一构图的白、蓝、青、粉四个配色变体，以及四联展示图。",
  },
  {
    id: "folder-photo-callout-series",
    name: "照片局部放大 · 荧光标注",
    kind: "theme",
    parentId: null,
    note: "同一张失焦照片上的局部放大、连线与双色图像处理。",
  },
];
