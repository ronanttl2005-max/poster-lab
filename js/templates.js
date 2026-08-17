// ============================================================
// 模板工坊 · Editable Poster Templates
// 每个模板 = { id, name, styleId, desc, fields, render(values) => HTML }
// 画布固定 750 x 1000（3:4）。新增模板：仿照任意一个对象追加即可。
// field.type: text | textarea | color | image | select | range
// ============================================================

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 支持 *斜体* 标记
const rich = (s = "") => esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>");

// SVG 噪点贴图（用于热感风格）
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='300' height='300' filter='url(#n)' opacity='0.5'/></svg>`
  );

export const TEMPLATES = [
  // ------------------------------------------------------------------
  {
    id: "editorial-interview",
    name: "极简访谈页",
    styleId: "minimal-editorial",
    desc: "ABCD 式大留白访谈排版：描边大数字 + 双色文字层级",
    fields: [
      { key: "num", label: "编号（如 Q1）", type: "text", default: "Q2" },
      {
        key: "question", label: "问题（右上）", type: "textarea",
        default: "很多人对『从事亚文化领域的平面设计师与艺术实践』这一定位感到好奇。你如何理解这一身份？",
      },
      {
        key: "answer", label: "回答（中部偏右）", type: "textarea",
        default:
          "在德国的许多大城市，都有自发的青年文化中心，年轻人可以在这里独立组织、策划活动并进行实验。\n\n在这些环境下，角色往往是模糊的，我不只是设计师，也是项目的一份子——策划项目、撰写资金申请、塑造视觉形象。",
      },
      { key: "meta", label: "页脚小字", type: "text", default: "POSTER LAB · INTERVIEW 2026" },
      { key: "accent", label: "编号描边色", type: "color", default: "#F2A0C8" },
      { key: "textColor", label: "正文颜色", type: "color", default: "#3B4CC0" },
      { key: "bg", label: "背景色", type: "color", default: "#FFFFFF" },
    ],
    render: (v) => `
      <div style="position:absolute;inset:0;background:${v.bg};">
        <div style="position:absolute;top:8px;left:44px;font-size:200px;font-weight:200;line-height:1;color:transparent;-webkit-text-stroke:3px ${v.accent};font-family:Helvetica,Arial,sans-serif;">${esc(v.num)}</div>
        <div style="position:absolute;top:64px;right:56px;width:54%;color:${v.textColor};font-size:25px;line-height:1.85;letter-spacing:.5px;">${rich(v.question)}</div>
        <div style="position:absolute;top:46%;right:56px;width:52%;color:${v.textColor};font-size:16.5px;line-height:2.1;white-space:pre-wrap;">${rich(v.answer)}</div>
        <div style="position:absolute;bottom:30px;right:56px;font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#B9B9C2;letter-spacing:2px;">${esc(v.meta)}</div>
      </div>`,
  },

  // ------------------------------------------------------------------
  {
    id: "swiss-event",
    name: "瑞士网格主视觉",
    styleId: "swiss-grid",
    desc: "IBM 式几何图形 + 模块信息区：条纹阵列与几何眼睛",
    fields: [
      { key: "brand", label: "品牌名", type: "text", default: "POSTER LAB" },
      { key: "title", label: "标题（粗体）", type: "text", default: "TechXchange" },
      { key: "year", label: "年份", type: "text", default: "2026" },
      { key: "dateLine", label: "日期地点（左下）", type: "textarea", default: "October 6 – 9, 2026\nShanghai, China" },
      { key: "tagline", label: "标语（右下）", type: "textarea", default: "The learning event for designers\nand technologists on a mission" },
      { key: "stripe", label: "条纹色", type: "color", default: "#42BE65" },
      { key: "icon", label: "图形色", type: "color", default: "#0F2ED9" },
      { key: "bg", label: "背景色", type: "color", default: "#F4F4F4" },
    ],
    render: (v) => {
      const stripes = Array.from({ length: 7 })
        .map(() => `<div style="height:26px;background:${v.stripe};margin-bottom:26px;"></div>`)
        .join("");
      return `
      <div style="position:absolute;inset:0;background:${v.bg};padding:70px 60px;font-family:Helvetica,Arial,sans-serif;">
        <div style="display:flex;gap:40px;height:420px;">
          <div style="flex:1;padding-top:10px;">${stripes}</div>
          <div style="flex:1.15;display:flex;align-items:center;justify-content:center;">
            <div style="width:100%;aspect-ratio:1.55;background:${v.icon};border-radius:50%/50%;display:flex;align-items:center;justify-content:center;">
              <div style="width:62%;aspect-ratio:1.4;background:${v.bg};border-radius:50%/50%;display:flex;align-items:center;justify-content:center;">
                <div style="width:42%;aspect-ratio:1;background:${v.icon};border-radius:50%;"></div>
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top:90px;color:#161616;">
          <div style="font-size:26px;">${esc(v.brand)}</div>
          <div style="font-size:34px;font-weight:800;letter-spacing:-.5px;">${esc(v.title)}</div>
          <div style="font-size:30px;">${esc(v.year)}</div>
        </div>
        <div style="position:absolute;bottom:70px;left:60px;right:60px;display:flex;justify-content:space-between;color:#161616;">
          <div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.8;white-space:pre-wrap;">${esc(v.dateLine)}</div>
          <div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.8;white-space:pre-wrap;text-align:left;width:40%;">${esc(v.tagline)}</div>
        </div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "pop-deadline",
    name: "波普撞色征集",
    styleId: "pop-clash",
    desc: "Hiiibrand 式纯色大底 + 瓶盖物件 + 双语清单",
    fields: [
      { key: "bg", label: "底色", type: "color", default: "#37C0F0" },
      { key: "capColor", label: "瓶盖色", type: "color", default: "#C9702F" },
      { key: "titleCn", label: "中文标题", type: "text", default: "海报实验室 · 征集中" },
      { key: "titleEn", label: "英文标题", type: "text", default: "POSTER LAB OPEN CALL" },
      {
        key: "lines", label: "清单（每行：中文|英文）", type: "textarea",
        default: "超级早鸟 2026.8.31|Super-Early-Bird Deadline\n早鸟提交 2026.9.30|Early-Bird Deadline\n常规提交 2026.10.31|Regular Deadline",
      },
      { key: "ink", label: "文字色", type: "color", default: "#FFFFFF" },
    ],
    render: (v) => {
      const rows = (v.lines || "")
        .split("\n").filter(Boolean)
        .map((l) => {
          const [cn, en] = l.split("|");
          return `<div style="margin-bottom:26px;">
            <div style="font-size:36px;font-weight:800;color:${v.ink};letter-spacing:1px;">${esc(cn || "")}</div>
            <div style="font-family:ui-monospace,Menlo,monospace;font-size:14px;color:${v.ink};opacity:.85;">${esc(en || "")}</div>
          </div>`;
        }).join("");
      return `
      <div style="position:absolute;inset:0;background:${v.bg};">
        <div style="position:absolute;top:95px;left:50%;transform:translateX(-50%) rotate(-8deg);width:300px;height:300px;border-radius:50%;background:${v.capColor};border:16px dotted rgba(0,0,0,.28);box-shadow:0 22px 0 rgba(0,0,0,.18);"></div>
        <div style="position:absolute;top:170px;left:50%;transform:translateX(-50%) rotate(-8deg);width:150px;height:44px;border-radius:50%;background:rgba(255,255,255,.30);"></div>
        <div style="position:absolute;top:490px;left:64px;right:64px;">
          <div style="font-size:44px;font-weight:900;color:${v.ink};margin-bottom:4px;">${esc(v.titleCn)}</div>
          <div style="font-family:ui-monospace,Menlo,monospace;font-size:16px;color:${v.ink};letter-spacing:3px;margin-bottom:44px;">${esc(v.titleEn)}</div>
          ${rows}
        </div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "brutalist-club",
    name: "新丑俱乐部告示",
    styleId: "brutalist-type",
    desc: "Public Records 式：图形区 + 跑马灯地址条 + 等宽字信息表",
    fields: [
      { key: "image", label: "顶部图像（可选，建议黑白）", type: "image", default: "" },
      { key: "accent", label: "色块窗颜色", type: "color", default: "#FFE600" },
      { key: "paper", label: "信息区底色", type: "color", default: "#F2EDE2" },
      { key: "date", label: "日期", type: "text", default: "SAT 5.9" },
      {
        key: "rows", label: "阵容（每行：场地|名字）", type: "textarea",
        default: "SOUND ROOM|Moxie\n|Louise Chen\nTHE ATRIUM|Make A Dance",
      },
      { key: "ticker", label: "地址跑马灯文字", type: "text", default: "POSTER LAB / 233 BUTLER ST, BROOKLYN, NY 11217 / CLUB PROGRAM, MAY 2026 / " },
      { key: "footL", label: "左下信息", type: "textarea", default: "POSTER LAB\n233 BUTLER ST. NY" },
      { key: "footR", label: "右下信息", type: "text", default: "DOORS 11:00" },
    ],
    render: (v) => {
      const rows = (v.rows || "")
        .split("\n").filter(Boolean)
        .map((l) => {
          const [venue, name] = l.split("|");
          return `<div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-family:'Courier New',ui-monospace,monospace;font-size:27px;">${esc(venue || "")}</span>
            <span style="font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:29px;">${esc(name || "")}</span>
          </div>`;
        }).join("");
      const art = v.image
        ? `<img src="${v.image}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.5);" />`
        : `<div style="position:absolute;inset:0;background:#0c0c0c;">
             <div style="position:absolute;top:-40px;left:-60px;width:420px;height:330px;background:#f5f2ea;border-radius:47% 53% 62% 38% / 55% 44% 56% 45%;transform:rotate(-14deg);"></div>
             <div style="position:absolute;bottom:-70px;right:-40px;width:390px;height:300px;background:#f5f2ea;border-radius:63% 37% 42% 58% / 46% 62% 38% 54%;transform:rotate(11deg);"></div>
             <div style="position:absolute;top:120px;right:120px;width:150px;height:110px;background:#f5f2ea;border-radius:58% 42% 55% 45% / 60% 40% 60% 40%;transform:rotate(24deg);"></div>
           </div>`;
      return `
      <div style="position:absolute;inset:0;background:#000;padding:26px 28px;">
        <div style="position:relative;height:440px;overflow:hidden;">
          ${art}
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);width:210px;height:210px;background:${v.accent};display:flex;align-items:center;justify-content:center;">
            <div style="width:96px;height:118px;background:#0c0c0c;border-radius:64% 36% 55% 45% / 40% 66% 34% 60%;transform:rotate(-16deg);"></div>
          </div>
        </div>
        <div style="height:34px;background:#9c9c96;display:flex;align-items:center;overflow:hidden;">
          <div style="font-family:'Courier New',monospace;font-size:15px;color:#111;white-space:nowrap;">${esc((v.ticker || "").repeat(4))}</div>
        </div>
        <div style="position:relative;height:calc(100% - 474px);background:${v.paper};color:#0c0c0c;padding:64px 46px 42px;">
          <div style="font-family:'Courier New',monospace;font-size:29px;margin-left:96px;margin-bottom:8px;">${esc(v.date)}</div>
          ${rows}
          <div style="position:absolute;bottom:38px;left:46px;right:46px;display:flex;justify-content:space-between;align-items:flex-end;">
            <div style="font-family:'Courier New',monospace;font-size:24px;line-height:1.35;white-space:pre-wrap;">${esc(v.footL)}</div>
            <div style="font-family:'Courier New',monospace;font-size:24px;">${esc(v.footR)}</div>
          </div>
        </div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "thermal-portrait",
    name: "热感光效人像",
    styleId: "thermal-glow",
    desc: "Thermal Vision 式：热成像模糊主体 + 色谱图例 + 三栏小字",
    fields: [
      { key: "title", label: "标题（衬线）", type: "text", default: "Thermal Vision" },
      {
        key: "captions", label: "三栏小字（每行一栏，| 换行）", type: "textarea",
        default: "SIMPLE|FORM\nMAGIC TONE GRADIENT|OVERLAY\nFINAL NOISE|TOUCH",
      },
      { key: "bg", label: "背景色", type: "color", default: "#1E90FF" },
      { key: "bodyColor", label: "主体色", type: "color", default: "#FF3FA0" },
      { key: "coreColor", label: "高温核心色", type: "color", default: "#FF2200" },
      { key: "hotColor", label: "热点色", type: "color", default: "#9BE800" },
      { key: "blur", label: "模糊强度", type: "range", default: "26", min: 8, max: 60 },
    ],
    render: (v) => {
      const cols = (v.captions || "")
        .split("\n").filter(Boolean)
        .map((c) => `<div style="flex:1;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:1.5px;color:#fff;line-height:1.7;">${esc(c).replace(/\|/g, "<br/>")}</div>`)
        .join("");
      return `
      <div style="position:absolute;inset:0;background:${v.bg};overflow:hidden;">
        <div style="position:absolute;top:140px;left:50%;transform:translateX(-50%);width:560px;height:880px;filter:blur(${v.blur}px);">
          <!-- 头 -->
          <div style="position:absolute;top:0;left:200px;width:185px;height:215px;background:${v.bodyColor};border-radius:46% 54% 52% 48%/58% 58% 42% 42%;"></div>
          <div style="position:absolute;top:-14px;left:250px;width:115px;height:95px;background:${v.hotColor};border-radius:50%;"></div>
          <div style="position:absolute;top:78px;left:188px;width:120px;height:120px;background:${v.coreColor};border-radius:42% 58% 50% 50%;"></div>
          <!-- 颈 -->
          <div style="position:absolute;top:190px;left:245px;width:95px;height:110px;background:${v.bodyColor};border-radius:40%;"></div>
          <!-- 肩与躯干 -->
          <div style="position:absolute;top:265px;left:95px;width:390px;height:590px;background:${v.bodyColor};border-radius:46% 54% 42% 58%/14% 16% 70% 62%;"></div>
          <div style="position:absolute;top:330px;left:170px;width:145px;height:190px;background:${v.coreColor};border-radius:48% 52% 55% 45%;"></div>
          <div style="position:absolute;top:600px;left:355px;width:105px;height:125px;background:${v.hotColor};border-radius:50%;"></div>
        </div>
        <div style="position:absolute;inset:0;background:url('${NOISE}');opacity:.35;mix-blend-mode:overlay;"></div>
        <div style="position:absolute;top:46px;left:0;right:0;text-align:center;font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:72px;color:#fff;letter-spacing:-1px;">${esc(v.title)}</div>
        <div style="position:absolute;top:56%;left:0;right:0;height:9px;background:linear-gradient(90deg,#59d666,#2b6bd8,#0a0a12,#e0409a,#ff2200,#3a0505);"></div>
        <div style="position:absolute;top:calc(56% + 30px);left:56px;right:56px;display:flex;gap:24px;">${cols}</div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "photo-serif",
    name: "文字即海报",
    styleId: "photo-text",
    desc: "We removed the heart 式：失焦照片 + 白色衬线逐行推进",
    fields: [
      { key: "image", label: "背景照片（建议模糊/情绪化）", type: "image", default: "" },
      {
        key: "lines", label: "文字（每行 1-3 词，*词* 为斜体）", type: "textarea",
        default: "We\nremoved\n*the heart.*\nAnd\neverything\nchanged.",
      },
      { key: "font", label: "字体", type: "select", default: "serif", options: [
        { value: "serif", label: "衬线（文艺）" },
        { value: "sans", label: "无衬线（冷静）" },
      ] },
      { key: "textColor", label: "文字颜色", type: "color", default: "#FFFFFF" },
      { key: "size", label: "字号", type: "range", default: "68", min: 36, max: 100 },
      { key: "bgBlur", label: "背景模糊", type: "range", default: "0", min: 0, max: 30 },
    ],
    render: (v) => {
      const ff = v.font === "sans" ? "Helvetica,Arial,sans-serif" : "Georgia,'Times New Roman',serif";
      const bgNode = v.image
        ? `<img src="${v.image}" style="position:absolute;inset:-30px;width:calc(100% + 60px);height:calc(100% + 60px);object-fit:cover;filter:blur(${v.bgBlur}px);" />`
        : `<div style="position:absolute;inset:0;background:
             radial-gradient(420px 620px at 78% 30%, #e8a56b, transparent 60%),
             radial-gradient(700px 700px at 20% 70%, #27538f, transparent 65%),
             radial-gradient(500px 400px at 60% 85%, #17233c, transparent 70%),
             linear-gradient(160deg,#3f6cae,#1a2c4e);filter:blur(${Math.max(6, v.bgBlur)}px) saturate(1.2);transform:scale(1.1);"></div>`;
      const lines = (v.lines || "")
        .split("\n").filter((l) => l.trim())
        .map((l) => `<div>${rich(l)}</div>`)
        .join("");
      return `
      <div style="position:absolute;inset:0;background:#111;overflow:hidden;">
        ${bgNode}
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <div style="font-family:${ff};font-size:${v.size}px;line-height:1.28;color:${v.textColor};text-align:center;font-weight:600;letter-spacing:-.5px;text-shadow:0 2px 30px rgba(0,0,0,.25);">${lines}</div>
        </div>
      </div>`;
    },
  },
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
