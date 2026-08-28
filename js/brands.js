// 品牌资产与品牌套图预设。
// logo 文件使用真正的 RGBA PNG；套图只保存品牌级默认值，具体模板字段仍可继续微调。

export const BRAND_PROFILES = [
  {
    id: "guanghe",
    name: "和光",
    nameEn: "HEGUANG",
    logo: "assets/brands/guanghe.png",
    description: "彩色轨迹与和光字标，适合深色、照片或高对比画面。",
    color: "#ffb84d",
  },
  {
    id: "leavebox",
    name: "LeaveBox",
    nameEn: "LEAVEBOX",
    logo: "assets/brands/leavebox.png",
    description: "黑蓝双色字标，适合浅色纸张、网格和编辑类版式。",
    color: "#3dafe1",
  },
];

export const BRAND_PROFILE_MAP = Object.fromEntries(BRAND_PROFILES.map((brand) => [brand.id, brand]));

export const BRAND_SETS = [
  {
    id: "guanghe-event",
    brandId: "guanghe",
    name: "和光 · 活动主视觉",
    desc: "彩色轨迹 logo 右下叠放，保持照片与标题的视觉焦点。",
    options: {
      brandId: "guanghe",
      enabled: true,
      position: "bottom-right",
      blendMode: "screen",
      scale: 21,
      opacity: 0.94,
      margin: 28,
    },
    // 这些是“套图”层面的安全默认值；模板有同名字段时才会应用。
    fields: {
      accent: "#ff9b3d",
      stripe: "#ff9b3d",
      icon: "#4f73ff",
      bg: "#11131b",
    },
  },
  {
    id: "leavebox-event",
    brandId: "leavebox",
    name: "LeaveBox · 活动套图",
    desc: "黑蓝字标左上叠放，适合浅色纸张与理性网格版式。",
    options: {
      brandId: "leavebox",
      enabled: true,
      position: "top-left",
      blendMode: "normal",
      scale: 22,
      opacity: 0.96,
      margin: 30,
    },
    fields: {
      accent: "#3dafe1",
      stripe: "#3dafe1",
      icon: "#1f2732",
      bg: "#f4f5f4",
    },
  },
];

export const BRAND_SET_MAP = Object.fromEntries(BRAND_SETS.map((set) => [set.id, set]));
