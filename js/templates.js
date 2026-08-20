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
    recommend: "小红书 3:4 / 公众号内页 · 导出 1500×2000；文字多时保持小字号，靠留白撑住",
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
    recommend: "活动主视觉 / A4 印刷（3:4 接近 A 系纸张）· 导出 1500×2000 印刷可再放大",
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
    recommend: "小红书 3:4 / 朋友圈海报 · 高饱和底色在手机小图下依然醒目",
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
    recommend: "演出/活动宣传 · Instagram 4:5 裁切安全；信息表适合排期类内容",
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
    recommend: "音乐/视觉类封面 · 3:4 或裁成 1:1 都成立；深底在暗色模式 App 里更融合",
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
    recommend: "小红书 3:4 图文封面 · 照片选暗部多的，白字才有对比",
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

  // ------------------------------------------------------------------
  {
    id: "type-grid",
    name: "编辑网格文字页",
    styleId: "minimal-editorial",
    desc: "以文字为主角的纵向编辑网格：眉题、标题、正文和页码均可编辑",
    recommend: "长文分享 / 公众号次条封面 · 3:4 竖版；正文别超过三段",
    fields: [
      { key: "eyebrow", label: "眉题 / 编号", type: "text", default: "FIELD NOTE / 06" },
      { key: "title", label: "主标题", type: "textarea", default: "Make space\nfor a clear idea." },
      { key: "dek", label: "副标题", type: "textarea", default: "A small study on attention, rhythm and useful silence." },
      { key: "body", label: "正文（支持换行）", type: "textarea", default: "Good typography does not decorate information.\nIt gives information a pace, a place and a reason to stay.", },
      { key: "meta", label: "底部元信息", type: "text", default: "POSTER LAB / EDITION 01 / SHANGHAI" },
      { key: "align", label: "标题对齐", type: "select", default: "left", options: [{ value: "left", label: "左对齐" }, { value: "center", label: "居中" }, { value: "right", label: "右对齐" }] },
      { key: "size", label: "标题字号", type: "range", default: "74", min: 42, max: 110 },
      { key: "bg", label: "背景色", type: "color", default: "#F7F8FA" },
      { key: "ink", label: "文字色", type: "color", default: "#111318" },
      { key: "accent", label: "强调色", type: "color", default: "#1747D1" },
    ],
    render: (v) => `
      <div style="position:absolute;inset:0;background:${v.bg};color:${v.ink};font-family:Helvetica,Arial,sans-serif;padding:52px 58px;">
        <div style="display:grid;grid-template-columns:32px 1fr 1fr;gap:28px;height:100%;">
          <div style="border-right:1px solid ${v.accent};font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:2px;color:${v.accent};writing-mode:vertical-rl;transform:rotate(180deg);padding-right:12px;">${esc(v.eyebrow)}</div>
          <div style="display:flex;flex-direction:column;justify-content:space-between;min-width:0;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:${v.size}px;line-height:.98;letter-spacing:-2px;text-align:${v.align};white-space:pre-wrap;">${rich(v.title)}</div>
            <div style="font-size:19px;line-height:1.5;max-width:290px;color:${v.accent};white-space:pre-wrap;">${rich(v.dek)}</div>
            <div style="font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:1.4px;color:${v.accent};">${esc(v.meta)}</div>
          </div>
          <div style="border-left:1px solid rgba(23,71,209,.32);padding:18px 0 0 24px;display:flex;align-items:center;">
            <div style="font-size:16px;line-height:1.95;max-width:218px;white-space:pre-wrap;">${rich(v.body)}</div>
          </div>
        </div>
      </div>`,
  },

  // ------------------------------------------------------------------
  {
    id: "vertical-type-poster",
    name: "竖排文字海报",
    styleId: "brutalist-type",
    desc: "中文竖排 + 英文横排 + 侧边信息条，适合展览与活动标题",
    recommend: "展览海报 / 书法字体类内容 · 3:4 竖版最大化竖排优势",
    fields: [
      { key: "title", label: "中文主标题", type: "textarea", default: "把\n空白\n留给\n想法" },
      { key: "english", label: "英文副标题", type: "text", default: "A TYPOGRAPHIC STUDY" },
      { key: "date", label: "日期 / 地点", type: "textarea", default: "08.19—09.06\nPOSTER LAB / SHANGHAI" },
      { key: "note", label: "侧边说明", type: "textarea", default: "TYPE / SPACE / RHYTHM\nOPEN STUDIO 06\nFREE ENTRY" },
      { key: "writing", label: "标题方向", type: "select", default: "vertical-rl", options: [{ value: "vertical-rl", label: "从右到左" }, { value: "vertical-lr", label: "从左到右" }] },
      { key: "bg", label: "底色", type: "color", default: "#F4F1E8" },
      { key: "ink", label: "主文字色", type: "color", default: "#111318" },
      { key: "accent", label: "强调色", type: "color", default: "#E53B35" },
    ],
    render: (v) => `
      <div style="position:absolute;inset:0;background:${v.bg};color:${v.ink};padding:48px 54px;font-family:Helvetica,Arial,sans-serif;">
        <div style="position:absolute;top:48px;left:54px;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;color:${v.accent};">POSTER LAB / TYPE 02</div>
        <div style="position:absolute;top:48px;right:54px;writing-mode:${v.writing};height:450px;font-family:Georgia,'Songti SC',serif;font-size:92px;line-height:1.03;letter-spacing:8px;white-space:pre-wrap;">${esc(v.title)}</div>
        <div style="position:absolute;left:70px;top:345px;width:300px;color:${v.accent};font-family:Arial Black,Arial,sans-serif;font-size:31px;line-height:1.1;letter-spacing:-1px;">${esc(v.english)}</div>
        <div style="position:absolute;left:70px;bottom:92px;font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.8;white-space:pre-wrap;">${esc(v.date)}</div>
        <div style="position:absolute;right:54px;bottom:62px;width:240px;border-top:1px solid ${v.ink};padding-top:12px;font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.7;white-space:pre-wrap;">${esc(v.note)}</div>
        <div style="position:absolute;left:54px;bottom:48px;right:54px;height:3px;background:${v.accent};"></div>
      </div>`,
  },

  // ------------------------------------------------------------------
  {
    id: "cmyk-overprint-type",
    name: "CMYK 错位大字",
    styleId: "cmyk-halftone",
    desc: "四色分层、套印偏移和印刷参数全部可编辑的标题模板",
    recommend: "实验字体/自我介绍页 · 3:4；偏移量别超过 8px，否则小图上糊成一团",
    fields: [
      { key: "kicker", label: "顶部小标题", type: "text", default: "PRINT / PROCESS / 03" },
      { key: "title", label: "主标题", type: "text", default: "OVERPRINT" },
      { key: "subtitle", label: "副标题", type: "textarea", default: "The beautiful error\nof four colors becoming one." },
      { key: "spec", label: "底部印刷参数", type: "text", default: "C 75°  ·  M 15°  ·  Y 0°  ·  K 45°" },
      { key: "offset", label: "套印偏移", type: "range", default: "9", min: 1, max: 20 },
      { key: "cyan", label: "C 青色", type: "color", default: "#00AEEF" },
      { key: "magenta", label: "M 品红", type: "color", default: "#EC008C" },
      { key: "yellow", label: "Y 黄色", type: "color", default: "#FFF200" },
      { key: "black", label: "K 黑色", type: "color", default: "#111318" },
      { key: "paper", label: "纸张色", type: "color", default: "#F5F1E8" },
    ],
    render: (v) => {
      const o = Number(v.offset) || 8;
      return `
      <div style="position:absolute;inset:0;background:${v.paper};color:${v.black};padding:54px 56px;font-family:Arial,Helvetica,sans-serif;overflow:hidden;">
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:2px;">${esc(v.kicker)}</div>
        <div style="position:absolute;top:205px;left:49px;font-family:Arial Black,Arial,sans-serif;font-size:96px;font-weight:900;letter-spacing:-7px;white-space:nowrap;line-height:1;mix-blend-mode:multiply;">
          <span style="position:absolute;left:${-o}px;top:${-o}px;color:${v.cyan};">${esc(v.title)}</span>
          <span style="position:absolute;left:${o}px;top:${-o / 2}px;color:${v.magenta};">${esc(v.title)}</span>
          <span style="position:absolute;left:${-o / 2}px;top:${o}px;color:${v.yellow};">${esc(v.title)}</span>
          <span style="position:relative;color:${v.black};">${esc(v.title)}</span>
        </div>
        <div style="position:absolute;top:420px;left:60px;right:60px;height:2px;background:${v.black};"></div>
        <div style="position:absolute;top:470px;left:60px;max-width:420px;font-family:Georgia,serif;font-size:39px;line-height:1.08;white-space:pre-wrap;">${rich(v.subtitle)}</div>
        <div style="position:absolute;bottom:58px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:end;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:1.5px;">
          <span>${esc(v.spec)}</span><span>CMYK / 03</span>
        </div>
        <div style="position:absolute;top:740px;right:60px;display:flex;gap:5px;">${[v.cyan, v.magenta, v.yellow, v.black].map((c) => `<i style="display:block;width:32px;height:32px;background:${c};"></i>`).join("")}</div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "moire-title-field",
    name: "莫尔标题场",
    styleId: "moire-pattern",
    desc: "大标题与干涉波纹叠加：颜色、频率和说明文字可调整",
    recommend: "视觉实验类分享 · 3:4 / 1:1 均可；波纹密度在手机上看比电脑上更密，导出前缩小检查",
    fields: [
      { key: "title", label: "主标题", type: "text", default: "MOIRÉ FIELD" },
      { key: "caption", label: "说明文字", type: "textarea", default: "Two grids. One moving image.\nOptical study no. 04." },
      { key: "wave", label: "波纹色", type: "color", default: "#1747D1" },
      { key: "ink", label: "文字色", type: "color", default: "#111318" },
      { key: "bg", label: "背景色", type: "color", default: "#F7F8FA" },
      { key: "angle", label: "第二层旋转角度", type: "range", default: "7", min: -18, max: 18 },
    ],
    render: (v) => {
      const parsedAngle = Number(v.angle);
      const angle = Number.isFinite(parsedAngle) ? parsedAngle : 7;
      const lines = Array.from({ length: 27 }, (_, i) => `<span style="display:block;height:17px;border-top:1px solid ${v.wave};transform:skewY(${Math.sin(i / 2) * 7}deg);"></span>`).join("");
      return `
      <div style="position:absolute;inset:0;background:${v.bg};color:${v.ink};padding:50px 52px;font-family:Helvetica,Arial,sans-serif;overflow:hidden;">
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;color:${v.wave};">OPTICAL INTERFERENCE / 04</div>
        <div style="position:absolute;left:18px;right:18px;top:185px;height:490px;opacity:.9;transform:rotate(-4deg);">${lines}</div>
        <div style="position:absolute;left:18px;right:18px;top:185px;height:490px;opacity:.58;transform:rotate(${angle}deg) scale(1.03);mix-blend-mode:multiply;">${lines}</div>
        <div style="position:absolute;top:335px;left:50px;right:50px;background:${v.bg};padding:18px 12px 24px;border-top:2px solid ${v.wave};border-bottom:2px solid ${v.wave};">
          <div style="font-family:Arial Black,Arial,sans-serif;font-size:64px;line-height:.98;letter-spacing:-4px;color:${v.wave};">${esc(v.title)}</div>
        </div>
        <div style="position:absolute;bottom:62px;left:52px;right:52px;display:flex;justify-content:space-between;font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.7;white-space:pre-wrap;color:${v.ink};"><span>${esc(v.caption)}</span><span>08 / 19 / 2026</span></div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "cyanotype-archive",
    name: "蓝晒档案页",
    styleId: "cyanotype",
    desc: "负片图形占位 + 档案信息排版，适合植物、建筑和收藏记录",
    recommend: "收藏记录 / 系列内页 · 3:4 竖版；同系列多张时固定纸张色和蓝色，只换主体",
    fields: [
      { key: "title", label: "档案标题", type: "text", default: "SUN PRINT / SPECIMEN" },
      { key: "subject", label: "主体词", type: "text", default: "LEAF STUDY" },
      { key: "details", label: "档案信息（每行一条）", type: "textarea", default: "COLLECTED 08.19.2026\nEXPOSURE 18 MINUTES\nPAPER COTTON 300G\nLOCATION 39°54'N 116°23'E" },
      { key: "blue", label: "蓝晒色", type: "color", default: "#06477F" },
      { key: "paper", label: "纸张色", type: "color", default: "#F3EFE3" },
      { key: "negative", label: "负片色", type: "color", default: "#E7F0EC" },
    ],
    render: (v) => `
      <div style="position:absolute;inset:0;background:${v.paper};padding:48px 54px;color:${v.blue};font-family:Helvetica,Arial,sans-serif;">
        <div style="position:absolute;top:54px;left:54px;right:54px;bottom:150px;background:${v.blue};overflow:hidden;">
          <div style="position:absolute;inset:0;background:radial-gradient(circle at 60% 40%,rgba(255,255,255,.09),transparent 48%);"></div>
          <div style="position:absolute;left:50%;top:49%;width:470px;height:600px;transform:translate(-50%,-50%) rotate(-12deg);border-left:7px solid ${v.negative};border-radius:55% 45% 48% 52%;opacity:.92;"></div>
          <div style="position:absolute;left:47%;top:47%;width:220px;height:430px;transform:translate(-50%,-50%) rotate(-12deg);border-left:5px solid ${v.negative};border-radius:50%;opacity:.85;"></div>
          <div style="position:absolute;left:40%;top:40%;width:285px;height:300px;transform:rotate(-38deg);border-top:4px solid ${v.negative};border-radius:50%;box-shadow:90px 76px 0 -30px ${v.negative},140px 145px 0 -52px ${v.negative},205px 190px 0 -58px ${v.negative};opacity:.85;"></div>
          <div style="position:absolute;left:42px;top:42px;color:${v.negative};font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;">${esc(v.title)}</div>
          <div style="position:absolute;left:42px;bottom:40px;color:${v.negative};font-family:Georgia,serif;font-size:54px;line-height:.95;">${esc(v.subject)}</div>
        </div>
        <div style="position:absolute;left:54px;right:54px;bottom:34px;display:flex;justify-content:space-between;align-items:flex-end;font-family:ui-monospace,Menlo,monospace;font-size:10px;line-height:1.65;white-space:pre-wrap;"><span>${esc(v.details)}</span><span>ARCHIVE 055</span></div>
      </div>`,
  },

  // ------------------------------------------------------------------
  {
    id: "hydro-quote",
    name: "水核短句海报",
    styleId: "hydro-core",
    desc: "透明水滴、柔和焦散和短句文字，可编辑标题与信息层级",
    recommend: "短句/心情类内容 · 小红书 3:4；短句两行以内效果最好",
    fields: [
      { key: "quote", label: "主句（支持 *斜体*）", type: "textarea", default: "Water makes\nlight visible." },
      { key: "author", label: "署名 / 说明", type: "text", default: "HYDRO-CORE / TEXT REFRACTION" },
      { key: "meta", label: "底部元数据", type: "text", default: "CLEAR FORM · LIQUID LIGHT · 2026" },
      { key: "bg", label: "背景色", type: "color", default: "#D8F3FF" },
      { key: "ink", label: "文字色", type: "color", default: "#0B3D91" },
      { key: "bubble", label: "气泡色", type: "color", default: "#77D7F5" },
      { key: "size", label: "短句字号", type: "range", default: "82", min: 46, max: 120 },
    ],
    render: (v) => `
      <div style="position:absolute;inset:0;background:linear-gradient(145deg,#f8fdff,${v.bg});color:${v.ink};overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
        <div style="position:absolute;width:570px;height:570px;left:90px;top:205px;border-radius:54% 46% 52% 48%;background:radial-gradient(circle at 31% 20%,rgba(255,255,255,.96),rgba(255,255,255,.18) 25%,${v.bubble}55 58%,${v.ink}33 100%);box-shadow:inset 18px 10px 35px rgba(255,255,255,.6),inset -22px -30px 44px rgba(11,61,145,.15),0 32px 50px rgba(26,117,169,.18);transform:rotate(-11deg);"></div>
        <div style="position:absolute;width:116px;height:116px;left:82px;top:143px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff,${v.bubble}66 62%,${v.ink}33);box-shadow:0 14px 26px rgba(26,117,169,.16);"></div>
        <div style="position:absolute;width:70px;height:70px;right:92px;bottom:228px;border-radius:50%;background:radial-gradient(circle at 30% 22%,#fff,${v.bubble}66 62%,${v.ink}33);"></div>
        <div style="position:absolute;top:58px;left:58px;right:58px;display:flex;justify-content:space-between;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:1.7px;"><span>${esc(v.author)}</span><span>HYDRO / 06</span></div>
        <div style="position:absolute;top:365px;left:66px;right:66px;font-family:Georgia,serif;font-size:${v.size}px;line-height:1.03;letter-spacing:-3px;white-space:pre-wrap;text-shadow:0 2px 18px rgba(255,255,255,.55);">${rich(v.quote)}</div>
        <div style="position:absolute;bottom:52px;left:58px;right:58px;border-top:1px solid ${v.ink}66;padding-top:13px;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:1.6px;">${esc(v.meta)}</div>
      </div>`,
  },

  // ------------------------------------------------------------------
  {
    id: "photo-diary",
    name: "白底摄影札记",
    styleId: "photo-text",
    desc: "小红书式白底照片拼图：克制留白 + 上下/双联构图 + 可调滤镜，传两张照片即可成组",
    recommend: "小红书竖版 3:4 · 导出 1500×2000 可直接发布；同组多张请保持同一滤镜",
    fields: [
      { key: "layout", label: "构图", type: "select", default: "stack-sm-lg", options: [
        { value: "stack-sm-lg", label: "上下双图（上窄下宽）" },
        { value: "stack-equal", label: "上下双图（等宽）" },
        { value: "side-by-side", label: "左右双联" },
        { value: "single", label: "单图居中" },
      ] },
      { key: "photo1", label: "照片 1", type: "image", default: "" },
      { key: "photo2", label: "照片 2", type: "image", default: "" },
      { key: "margin", label: "画布边距", type: "range", default: "92", min: 40, max: 160 },
      { key: "gap", label: "图间距", type: "range", default: "56", min: 16, max: 120 },
      { key: "caption", label: "底部小字（可空）", type: "text", default: "PHOTO DIARY · 2026" },
      { key: "bg", label: "背景色", type: "color", default: "#FFFFFF" },
      { key: "preset", label: "滤镜预设", type: "select", default: "none", options: [
        { value: "none", label: "原图" },
        { value: "film-warm", label: "胶片暖调" },
        { value: "film-cool", label: "胶片冷调" },
        { value: "bw", label: "黑白高对比" },
        { value: "muted", label: "低饱和灰调" },
        { value: "vivid", label: "鲜艳增强" },
      ] },
      { key: "brightness", label: "亮度", type: "range", default: "100", min: 60, max: 140 },
      { key: "contrast", label: "对比度", type: "range", default: "100", min: 60, max: 150 },
      { key: "saturate", label: "饱和度", type: "range", default: "100", min: 0, max: 200 },
      { key: "warmth", label: "色温（左冷右暖）", type: "range", default: "0", min: -50, max: 50 },
      { key: "grain", label: "颗粒感", type: "range", default: "0", min: 0, max: 100 },
    ],
    render: (v) => {
      const PLACEHOLDER = (label) =>
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='700'><rect width='600' height='700' fill='#E8ECEF'/><rect x='250' y='285' width='100' height='74' rx='12' fill='none' stroke='#AAB4BC' stroke-width='5'/><circle cx='300' cy='322' r='22' fill='none' stroke='#AAB4BC' stroke-width='5'/><rect x='283' y='272' width='34' height='16' rx='5' fill='#AAB4BC'/><text x='300' y='420' font-family='monospace' font-size='20' fill='#8A959E' text-anchor='middle' letter-spacing='3'>${label}</text></svg>`
        );
      const m = Number(v.margin) || 92;
      const gap = Number(v.gap) || 56;
      const presets = {
        none: "",
        "film-warm": "sepia(28%) saturate(108%) contrast(103%)",
        "film-cool": "saturate(88%) hue-rotate(-8deg) brightness(103%)",
        bw: "grayscale(100%) contrast(118%)",
        muted: "saturate(62%) contrast(96%) brightness(104%)",
        vivid: "saturate(140%) contrast(108%)",
      };
      const warmth = Number(v.warmth) || 0;
      const warmthFilter = warmth > 0
        ? ` sepia(${Math.round(warmth * 0.8)}%)`
        : warmth < 0 ? ` hue-rotate(${Math.round(warmth * 0.35)}deg)` : "";
      const filter = `${presets[v.preset] || ""} brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%)${warmthFilter}`.trim();
      const grainOpacity = (Number(v.grain) || 0) / 100 * 0.45;
      const frame = (src, label, style) => `
        <div style="position:absolute;${style}overflow:hidden;background:#E8ECEF;">
          <img src="${src || PLACEHOLDER(label)}" style="width:100%;height:100%;object-fit:cover;display:block;filter:${filter};" />
          ${grainOpacity > 0 ? `<div style="position:absolute;inset:0;background:url(&quot;${NOISE}&quot;);opacity:${grainOpacity};pointer-events:none;"></div>` : ""}
        </div>`;
      const innerW = 750 - m * 2;
      const innerH = 1000 - m * 2 - 30;
      let photos = "";
      if (v.layout === "single") {
        photos = frame(v.photo1, "PHOTO 01", `left:${m}px;top:${m}px;width:${innerW}px;height:${innerH}px;`);
      } else if (v.layout === "side-by-side") {
        const cw = (innerW - gap) / 2;
        const ch = Math.min(innerH, cw * 1.35);
        const top = m + (innerH - ch) / 2;
        photos = frame(v.photo1, "PHOTO 01", `left:${m}px;top:${top}px;width:${cw}px;height:${ch}px;`)
          + frame(v.photo2, "PHOTO 02", `left:${m + cw + gap}px;top:${top}px;width:${cw}px;height:${ch}px;`);
      } else if (v.layout === "stack-equal") {
        const ch = (innerH - gap) / 2;
        photos = frame(v.photo1, "PHOTO 01", `left:${m}px;top:${m}px;width:${innerW}px;height:${ch}px;`)
          + frame(v.photo2, "PHOTO 02", `left:${m}px;top:${m + ch + gap}px;width:${innerW}px;height:${ch}px;`);
      } else {
        // stack-sm-lg：上窄下宽（参考街拍札记系列）
        const topW = Math.round(innerW * 0.58);
        const topH = Math.round(innerH * 0.46);
        const bottomH = innerH - topH - gap;
        photos = frame(v.photo1, "PHOTO 01", `left:${m + (innerW - topW) / 2}px;top:${m}px;width:${topW}px;height:${topH}px;`)
          + frame(v.photo2, "PHOTO 02", `left:${m}px;top:${m + topH + gap}px;width:${innerW}px;height:${bottomH}px;`);
      }
      return `
      <div style="position:absolute;inset:0;background:${v.bg};">
        ${photos}
        ${v.caption ? `<div style="position:absolute;bottom:26px;right:${m}px;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;color:#B9BFC6;">${esc(v.caption)}</div>` : ""}
      </div>`;
    },
  },
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
