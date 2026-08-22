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
//   model     直接图像编辑的模型（默认 gpt-image-2；兼容模式会自动尝试后备模型）
//   reasoningModel  Responses API 用于理解场景并调用图像编辑工具的主模型
//   size/quality    输出尺寸与质量
//   prompt    效果定义；主模型会结合上传图片理解具体主体和动作
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
    name: "照片拟人涂鸦",
    nameEn: "Photo Character Doodle",
    type: "image",
    desc: "识别照片里的山、建筑、地标或物体，把主体本身变成有表情和动作的手绘角色，同时保留真实照片与现场氛围。",
    tags: ["图生图", "拟人涂鸦", "混合媒介"],
    cover: COVER_DOODLE,
    coverImage: "",
    model: "gpt-image-2",
    reasoningModel: "gpt-5.6",
    // auto 会尽量保留原图比例；固定正方形容易让照片被裁切或重构。
    size: "auto",
    quality: "high",
    prompt:
      "First identify the single most visually dominant mountain, building, landmark, or object in the photo. Edit this same photo so that the subject itself becomes a whimsical anthropomorphic character, using its real shape and texture as the character's body. Preserve the original background, framing, lighting, colors, and photographic detail. Add expressive hand-drawn eyes, a small mouth, simple ink arms and hands, plus one scene-appropriate colorful illustrated prop, clothing item, or action. Make the added details respond to the subject and environment, like playful editorial mixed media. Do not add generic stars, glasses, speech bubbles, text, or random stickers. Do not repaint the whole photo or replace the subject.",
    inputHint: "上传主体明确的风景、建筑、地标或物体照片；主体轮廓越清楚，拟人效果越自然。",
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
