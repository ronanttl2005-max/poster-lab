// ============================================================
// Skill 库 · 技能定义（种子数据）
// 每个 skill = 一张「效果卡」，访客点进去可一键复刻。
//
// 字段说明：
//   id        唯一标识（用于路由 #/skills/<id>）
//   name/nameEn/desc/tags  展示信息
//   type      "image" = 图生图（上传图 → AI 处理）；"text" = 文字生成（输入需求 → AI 出文案）
//   cover     卡片封面（内联 SVG 字符串；效果图就绪后可用 coverImage 覆盖）
//   coverImage  效果图 URL（放到 assets/skills/ 下，填相对路径即可，优先级高于 cover）
//   inputHint 输入区提示文案
//
//   —— image 类专用 ——
//   model     调用的模型（默认 gpt-image-2；网关不支持时自动尝试兼容模型）
//   size      输出尺寸（如 "1024x1024"）
//   prompt    传给 AI 的英文指令（决定效果）
//
//   —— text 类专用 ——
//   model     文本模型（默认 gpt-4o-mini）
//   system    系统提示词（决定 AI 扮演什么、输出什么格式）
//
// 加一个新 skill：往下面数组加一条即可，前端自动生成卡片和工作区。
// ============================================================

const COVER_DOODLE = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffd6e7"/><stop offset="1" stop-color="#c8e7ff"/></linearGradient></defs>
  <rect width="320" height="200" fill="url(#gd)"/>
  <circle cx="160" cy="96" r="46" fill="#fff" stroke="#1b1b1b" stroke-width="3"/>
  <circle cx="146" cy="90" r="5" fill="#1b1b1b"/><circle cx="174" cy="90" r="5" fill="#1b1b1b"/>
  <path d="M144 112 q16 14 32 0" stroke="#1b1b1b" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M110 60 l14 -18 M210 60 l-14 -18 M120 150 l-16 12 M200 150 l16 12" stroke="#ff477e" stroke-width="3" stroke-linecap="round"/>
  <path d="M60 40 l6 12 l12 -6 M250 150 l10 8 l-4 12" stroke="#1b6fff" stroke-width="3" fill="none" stroke-linecap="round"/>
  <text x="160" y="185" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1b1b1b" opacity="0.5">doodle</text>
</svg>`;

const COVER_COPY = `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1b1b1b"/><stop offset="1" stop-color="#333"/></linearGradient></defs>
  <rect width="320" height="200" fill="url(#gc)"/>
  <text x="28" y="70" font-family="sans-serif" font-size="34" font-weight="800" fill="#fff">大标题</text>
  <text x="28" y="104" font-family="sans-serif" font-size="15" fill="#ffd23f">SUBTITLE / 副标题</text>
  <rect x="28" y="128" width="180" height="3" fill="#ff477e"/>
  <text x="28" y="160" font-family="sans-serif" font-size="13" fill="#bbb">一句让人记住的 slogan</text>
</svg>`;

export const SKILLS = [
  {
    id: "photo-doodle-face",
    name: "照片涂鸦脸",
    nameEn: "Photo Doodle Face",
    type: "image",
    desc: "上传一张人像照片，AI 用黑色马克笔风格在脸上和画面里手绘涂鸦（星星、眼镜、小帽子、火花），保留原照片，叠加俏皮线条。",
    tags: ["图生图", "涂鸦", "人像"],
    cover: COVER_DOODLE,
    coverImage: "",
    model: "gpt-image-2",
    // auto 会尽量保留原图比例；固定正方形会让人像被裁切/重构。
    size: "auto",
    quality: "high",
    prompt:
      "Edit this exact input photo; do not generate a new scene. Preserve the original person, identity, face, pose, clothing, background, lighting, colors, framing, texture, and aspect ratio. Add only a transparent-looking overlay of black ink doodles, as if a person used a black felt-tip marker directly on the printed photograph: simple round hand-drawn glasses aligned with the eyes, a tiny imperfect crown or hat above the head, small stars and sparkles around the face, a few loose squiggles and a small speech bubble in empty space. Keep the doodles playful, thin-to-medium, slightly imperfect, and clearly black. Do not repaint, redraw, beautify, stylize, blur, crop, replace, or cover the photograph; do not add colored marks, realistic objects, extra people, or large text. The final image must look like the same original photo with black marker doodles drawn on top.",
    inputHint: "上传一张清晰的人像照片，效果最好。",
  },
  {
    id: "poster-copy",
    name: "海报文案生成",
    nameEn: "Poster Copywriter",
    type: "text",
    desc: "输入你的活动/主题信息，AI 一次生成可直接用在海报上的中文主标题、副标题和一句 slogan。",
    tags: ["文字生成", "文案", "标题"],
    cover: COVER_COPY,
    coverImage: "",
    model: "gpt-4o-mini",
    system:
      "你是资深海报文案。根据用户给的主题，输出一组可直接印在海报上的中文文案，格式如下：\n\n【主标题】给 3 个候选，每个不超过 8 字，要有冲击力\n【副标题】给 2 个候选，每个不超过 16 字\n【Slogan】给 1 句，朗朗上口\n\n只输出结果，不要解释，不要多余寒暄。",
    inputHint: "描述你的活动或主题，例如「校园音乐节，周五晚，草坪舞台，免费入场」。",
  },
];

if (window.PosterLab) {
  window.PosterLab.skills = SKILLS.map(({ id, name, type }) => ({ id, name, type }));
}
