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

// 对照片、成品海报或多页拼图类参考，preset 可直接携带原始素材。
// 这样「一键复刻」先保证构图与视觉信息 1:1 接近参考；用户再切到可编辑重绘模式改字、换图。
const referenceCanvas = (src, bg = "#FFFFFF", fit = "contain") => `
  <div style="position:absolute;inset:0;background:${bg};overflow:hidden;">
    <img src="${esc(src)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};object-position:center;display:block;" />
  </div>`;

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
    presets: [
      {
        id: "q2-pink-blue-full", name: "复刻 · Q2 访谈页", ref: "17-interview-q2-editorial.png",
        values: {
          num: "Q2",
          question: "很多人对『从事亚文化领域的平面设计师与艺术实践』这一定位感到好奇。你如何理解这一身份？它是否意味着你的工作更关注于某些特定的群体或文化圈层？",
          answer: "在德国的许多大城市，都有自发的青年文化中心，年轻人可以在这里独立组织、策划活动并进行实验。这些机构在政治和项目规划上是属于自我管理的，通常依靠志愿服务维持，从这个意义上说，它们是一种“替代性基础设施”。\n\n我们这代人中，许多活跃于此类环境的人后来创办了音乐活动团体、厂牌或俱乐部，将这些自组织原则带入了更正式的结构中。\n\n在这些环境下，角色往往是模糊的，我不只是设计师，也是项目的一份子——策划项目、撰写资金申请、塑造视觉形象。",
          meta: "INTERVIEW · 2026",
        },
      },
      {
        id: "q1-short-answer", name: "复刻 · Q1 访谈页", ref: "25-interview-q1-editorial.png",
        values: {
          num: "Q1",
          question: "能和我们简单介绍下你的背景吗？是什么契机让你决定投身于设计行业？",
          answer: "我很早就对音乐杂志产生了痴迷，无论是其中的内容还是设计，我甚至对杂志进行了大量的收集。16 岁左右，我开始筹备音乐会和俱乐部之夜。因为这些经历，我开始尝试海报设计，并最终引导我攻读了设计学位。",
          meta: "INTERVIEW · 2026",
        },
      },
    ],
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
    presets: [
      {
        id: "ibm-techxchange-green-eye", name: "复刻 · IBM 绿纹蓝眼", ref: "06-ibm-techxchange-swiss-grid.png",
        values: {
          brand: "IBM",
          title: "TechXchange",
          year: "2025",
          dateLine: "October 6 – 9, 2025\nOrlando, Florida",
          tagline: "The learning event for developers\nand technologists on a mission",
          stripe: "#42BE65",
          icon: "#0F62FE",
          bg: "#F2F2F0",
        },
      },
    ],
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
    desc: "高饱和纯色大底 + 主体物件 + 双语清单。主体形状可选，也可以直接上传任意物体",
    recommend: "小红书 3:4 / 朋友圈海报 · 高饱和底色在手机小图下依然醒目",
    presets: [
      {
        id: "hiiibrand-blue-deadlines", name: "复刻 · 蓝底瓶盖清单", ref: "07-hiiibrand-caps-blue-orange.png",
        values: {
          bg: "#55C3F0",
          barColor: "#C9702F",
          barText: "HIIIBRAND AWARDS 2025 · CALL FOR ENTRIES",
          shape: "cap",
          objColor: "#C9702F",
          titleCn: "Hiiibrand 国际设计奖 · 征集中",
          titleEn: "HIIIBRAND AWARDS OPEN CALL",
          lines: "超级早鸟 2025.8.31|Super-Early-Bird Entry Deadline\n早鸟提交 2025.9.30|Early-Bird Entry Deadline\n常规提交 2025.10.31|Regular Entry Deadline",
          body: "面向全球华人设计师与设计机构，征集品牌、包装、字体与数字媒体作品。所有入围作品收录于年鉴并参与巡回展出。",
          foot: "hiiibrand.com|投稿邮箱 award@hiiibrand.com",
          ink: "#FFFFFF",
          layout: "single",
        },
      },
      {
        id: "hiiibrand-orange-jury", name: "复刻 · 橙底评审页", ref: "07-hiiibrand-caps-blue-orange.png",
        values: {
          bg: "#F8A303",
          barColor: "#231A0E",
          barText: "JURY 2025 · WHY DESIGN MATTERS",
          shape: "circle",
          objColor: "#6C86D6",
          titleCn: "黛比 · 米尔曼",
          titleEn: "DEBBIE MILLMAN",
          lines: "评审委员会主席|Jury President\n设计为何重要|Why Design Matters\nAIGA 终身成就奖|AIGA Lifetime Achievement",
          body: "《Design Matters》主播，全球最早的设计播客之一。她与超过五百位创作者对谈，把设计从职业话题谈成生活方式。",
          foot: "评审名单陆续公布|Jury announced in waves",
          ink: "#231A0E",
          layout: "two",
        },
      },
    ],
    fields: [
      { key: "bg", label: "底色", type: "color", default: "#37C0F0" },
      { key: "ink", label: "文字色", type: "color", default: "#FFFFFF" },
      { key: "barColor", label: "顶部色条颜色", type: "color", default: "#C9702F" },
      { key: "barText", label: "顶部色条文字", type: "text", default: "POSTER LAB 2026 · CALL FOR ENTRIES" },
      { key: "barH", label: "色条高度", type: "range", default: "34", min: 0, max: 90 },
      {
        key: "shape", label: "主体形状", type: "select", default: "cap",
        options: [
          { value: "cap", label: "瓶盖（点线圈）" },
          { value: "circle", label: "纯圆色块" },
          { value: "blob", label: "有机形" },
          { value: "image", label: "上传图片主体" },
        ],
      },
      { key: "objColor", label: "主体色（形状为图片时不生效）", type: "color", default: "#C9702F" },
      // 形状选「上传图片主体」时才用得上。深度模式走 pop-sticker：抠主体 + 提饱和 + 多层描边
      { key: "objImage", label: "主体图片（形状选「上传图片主体」时生效）", type: "image", default: "", fx: "pop-sticker" },
      { key: "fxLayers", label: "描边层数（深度模式）", type: "range", default: "3", min: 1, max: 5 },
      { key: "fxGap", label: "描边间距（深度模式）", type: "range", default: "10", min: 3, max: 40 },
      { key: "objSize", label: "主体大小", type: "range", default: "300", min: 140, max: 440 },
      { key: "objRotate", label: "主体旋转", type: "range", default: "-8", min: -30, max: 30 },
      { key: "titleCn", label: "中文标题", type: "text", default: "海报实验室 · 征集中" },
      { key: "titleEn", label: "英文标题", type: "text", default: "POSTER LAB OPEN CALL" },
      {
        key: "lines", label: "清单（每行：中文|英文）", type: "textarea",
        default: "超级早鸟 2026.8.31|Super-Early-Bird Deadline\n早鸟提交 2026.9.30|Early-Bird Deadline\n常规提交 2026.10.31|Regular Deadline",
      },
      {
        key: "layout", label: "版式", type: "select", default: "single",
        options: [
          { value: "single", label: "单栏（清单撑满）" },
          { value: "two", label: "左右双栏（清单 + 正文）" },
        ],
      },
      {
        key: "body", label: "正文段落", type: "textarea",
        default: "面向全球创作者征集平面、影像与实验性作品。所有入围作品收录于线上年鉴，并参与年度巡回展出。",
      },
      { key: "photo", label: "附图（双栏版式下显示在右栏）", type: "image", default: "" },
      { key: "foot", label: "脚注（用 | 分左右）", type: "text", default: "posterlab.studio|投稿邮箱 open@posterlab.studio" },
    ],
    render: (v) => {
      const num = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
      const lim = (val, lo, hi) => Math.min(Math.max(val, lo), hi);
      const barH = lim(num(v.barH, 34), 0, 90);
      const rot = lim(num(v.objRotate, -8), -30, 30);
      const two = v.layout === "two";
      const deep = v.imgMode === "deep";
      const objTop = barH + 46;

      // 主体尺寸让位给下面的文字栏：色条 + 主体 + 标题组 + 清单 + 正文 + 脚注
      // 必须塞进 1000px。行数多或者色条拉高时，主体自动缩小而不是把文字顶出画布。
      const rowCount = (v.lines || "").split("\n").filter(Boolean).length;
      const textH = 48 + 4 + 22 + (two ? 26 : 36)
        + rowCount * (two ? 66 : 76)
        + (two ? 0 : 60)
        + 54; // 脚注区
      const size = lim(num(v.objSize, 300), 140, Math.max(140, 1000 - objTop - 44 - textH));

      // 形状选了图片但还没上传，退回瓶盖，免得预览开个天窗
      const shape = v.shape === "image" && !v.objImage ? "cap" : v.shape || "cap";
      const spin = `position:absolute;top:${objTop}px;left:50%;transform:translateX(-50%) rotate(${rot}deg);width:${size}px;height:${size}px;`;

      let object = "";
      if (shape === "cap") {
        object = `
          <div style="${spin}border-radius:50%;background:${v.objColor};border:${Math.round(size * 0.053)}px dotted rgba(0,0,0,.28);box-shadow:0 22px 0 rgba(0,0,0,.18);"></div>
          <div style="position:absolute;top:${objTop + Math.round(size * 0.25)}px;left:50%;transform:translateX(-50%) rotate(${rot}deg);width:${Math.round(size * 0.5)}px;height:${Math.round(size * 0.15)}px;border-radius:50%;background:rgba(255,255,255,.30);"></div>`;
      } else if (shape === "circle") {
        object = `<div style="${spin}border-radius:50%;background:${v.objColor};box-shadow:0 22px 0 rgba(0,0,0,.16);"></div>`;
      } else if (shape === "blob") {
        object = `<div style="${spin}background:${v.objColor};border-radius:58% 42% 47% 53% / 46% 55% 45% 54%;box-shadow:0 20px 0 rgba(0,0,0,.16);"></div>`;
      } else {
        // 简单模式用 CSS 近似波普描边（多层 drop-shadow）；深度模式的图已经带描边了
        const fake = "filter:saturate(160%) contrast(120%) drop-shadow(0 0 6px #fff) drop-shadow(0 0 12px #111);";
        object = `<img src="${v.objImage}" style="${spin}object-fit:contain;${deep ? "" : fake}" />`;
      }

      const rows = (v.lines || "")
        .split("\n").filter(Boolean)
        .map((l) => {
          const [cn, en] = l.split("|");
          return `<div style="margin-bottom:${two ? 18 : 26}px;">
            <div style="font-size:${two ? 27 : 36}px;font-weight:800;color:${v.ink};letter-spacing:1px;line-height:1.15;">${esc(cn || "")}</div>
            <div style="font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:${two ? 12 : 14}px;color:${v.ink};opacity:.85;">${esc(en || "")}</div>
          </div>`;
        }).join("");

      const rightCol = two
        ? `<div style="flex:0 0 34%;">
            ${v.photo ? `<img src="${v.photo}" style="width:100%;height:150px;object-fit:cover;display:block;margin-bottom:14px;border:3px solid ${v.ink};" />` : ""}
            <div style="font-size:13px;line-height:1.75;color:${v.ink};opacity:.92;white-space:pre-wrap;">${esc(v.body)}</div>
          </div>`
        : "";

      const bodyBelow = two
        ? ""
        : `<div style="margin-top:8px;font-size:14px;line-height:1.8;color:${v.ink};opacity:.9;max-width:560px;white-space:pre-wrap;">${esc(v.body)}</div>`;

      const [footL, footR] = String(v.foot || "").split("|");

      return `
      <div style="position:absolute;inset:0;background:${v.bg};overflow:hidden;">
        ${barH > 0
          ? `<div style="position:absolute;left:0;right:0;top:0;height:${barH}px;background:${v.barColor};display:flex;align-items:center;padding:0 64px;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2.5px;color:${v.bg};">${esc(v.barText)}</div>`
          : ""}
        ${object}
        <div style="position:absolute;top:${objTop + size + 44}px;left:64px;right:64px;">
          <div style="font-size:44px;font-weight:900;color:${v.ink};margin-bottom:4px;line-height:1.1;">${esc(v.titleCn)}</div>
          <div style="font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:16px;color:${v.ink};letter-spacing:3px;margin-bottom:${two ? 26 : 36}px;">${esc(v.titleEn)}</div>
          <div style="display:flex;gap:28px;align-items:flex-start;">
            <div style="flex:1;">${rows}${bodyBelow}</div>
            ${rightCol}
          </div>
        </div>
        <div style="position:absolute;bottom:40px;left:64px;right:64px;display:flex;justify-content:space-between;gap:20px;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:1.5px;color:${v.ink};opacity:.9;">
          <span>${esc(footL || "")}</span><span style="text-align:right;">${esc(footR || "")}</span>
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
    presets: [
      {
        id: "pr-sat59-green-sparse", name: "复刻 · 绿窗留白版", ref: "15-public-records-sat59-green.png",
        values: {
          accent: "#2ADB4E",
          paper: "#F0EBDF",
          date: "SAT 5.9",
          rows: "SOUND ROOM|Moxie\n|Louise Chen\nTHE ATRIUM|Make A Dance",
          ticker: "PUBLIC RECORDS / 233 BUTLER ST, BROOKLYN, NY 11217 / CLUB PROGRAM, MAY 2026 / ",
          footL: "PUBLIC RECORDS\n233 BUTLER ST. NY",
          footR: "DOORS 11:00",
        },
      },
      {
        id: "pr-fri529-yellow-dense", name: "复刻 · 黄窗灰底版", ref: "13-public-records-fri529-yellow.png",
        values: {
          accent: "#F2F600",
          paper: "#C7C7C2",
          date: "FRI 5.29",
          rows: "SOUND ROOM|Rrose\n|Decoder\nTHE ATRIUM|Claudio PRC\n|Julia Govor\nUPSTAIRS|Millie McKee",
          ticker: "PUBLIC RECORDS / 233 BUTLER ST, BROOKLYN, NY 11217 / CLUB PROGRAM, MAY 2026 / ",
          footL: "PUBLIC RECORDS\n233 BUTLER ST. NY",
          footR: "DOORS 11:00",
        },
      },
      {
        id: "pr-sat52-orange-yellow", name: "复刻 · 橙窗黄底版", ref: "26-public-records-sat52-orange.png",
        values: {
          accent: "#E8501F",
          paper: "#F5F500",
          date: "SAT 5.2",
          rows: "SOUND ROOM|Matisa\nTHE ATRIUM|Lovefingers\n|Gee Dee\nUPSTAIRS|Zotos",
          ticker: "PUBLIC RECORDS / 233 BUTLER ST, BROOKLYN, NY 11217 / CLUB PROGRAM, MAY 2026 / ",
          footL: "PUBLIC RECORDS\n233 BUTLER ST. NY",
          footR: "DOORS 11:00",
        },
      },
    ],
    fields: [
      { key: "image", label: "顶部图像（可选，建议黑白）", type: "image", default: "" },
      { key: "logo", label: "色块中央 Logo / 图案（可选）", type: "image", default: "" },
      { key: "accent", label: "色块窗颜色", type: "color", default: "#FFE600" },
      { key: "accentSize", label: "色块窗大小", type: "range", default: "210", min: 100, max: 330 },
      { key: "accentOpacity", label: "色块窗透明度", type: "range", default: "100", min: 0, max: 100 },
      { key: "logoSize", label: "中央 Logo / 图案大小", type: "range", default: "72", min: 20, max: 140 },
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
      const logo = v.logo
        ? `<img src="${v.logo}" alt="中央 Logo / 图案" style="display:block;width:${Math.min(Math.max(Number(v.logoSize) || 72, 20), 140)}%;height:${Math.min(Math.max(Number(v.logoSize) || 72, 20), 140)}%;object-fit:contain;" />`
        : `<div style="width:96px;height:118px;background:#0c0c0c;border-radius:64% 36% 55% 45% / 40% 66% 34% 60%;transform:rotate(-16deg);"></div>`;
      const accentSize = Math.min(Math.max(Number(v.accentSize) || 210, 100), 330);
      const rawAccentOpacity = Number(v.accentOpacity);
      const accentOpacity = Math.min(Math.max(Number.isFinite(rawAccentOpacity) ? rawAccentOpacity : 100, 0), 100) / 100;
      const accentHex = String(v.accent || "#FFE600").replace(/^#/, "");
      const accentRgb = /^[0-9a-f]{6}$/i.test(accentHex)
        ? [accentHex.slice(0, 2), accentHex.slice(2, 4), accentHex.slice(4, 6)].map((part) => parseInt(part, 16))
        : [255, 230, 0];
      const accentBg = `rgba(${accentRgb.join(",")},${accentOpacity})`;
      return `
      <div style="position:absolute;inset:0;background:${v.paper};">
        <div style="position:relative;height:440px;overflow:hidden;">
          ${art}
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);width:${accentSize}px;height:${accentSize}px;background:${accentBg};display:flex;align-items:center;justify-content:center;">
            ${logo}
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
    presets: [
      {
        id: "thermal-vision-blue", name: "复刻 · 蓝底热感人像", ref: "48-thermal-vision-portrait.png",
        values: { blur: "32" },
      },
      {
        id: "space-race-red", name: "复刻 · 红底太空竞赛", ref: "24-space-race-red-thermal.png",
        values: {
          title: "Space Race",
          captions: "MISSION TO|THE RED PLANET\nWHO WILL|GET THERE FIRST\nSPACEX × NASA|2026",
          bg: "#E8401C",
          bodyColor: "#6C5BE0",
          coreColor: "#1A1038",
          hotColor: "#FFD3E0",
          blur: "14",
        },
      },
    ],
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
    desc: "We removed the heart 式：斜向拉丝背景 + 白色大衬线逐行推进",
    recommend: "小红书 3:4 图文封面 · 不传图也有拉丝底；传图会做双色调，白字才有对比",
    presets: [
      {
        id: "removed-heart-blue-blur", name: "复刻 · 失焦衬线独白", ref: "47-we-removed-the-heart-serif.png",
        values: {
          size: "92", lineHeight: "105", align: "center", bgBlur: "16",
          streakAngle: "158", streakBlur: "34",
          streakA: "#1A2C4E", streakB: "#3F6CAE", streakC: "#E8A56B",
          duoShadow: "#16233E", duoLight: "#E8A56B",
        },
      },
    ],
    fields: [
      // fx 让「深度」模式把上传图重做成双色调印刷质感，而不是纯替换
      { key: "image", label: "背景照片（留空则用拉丝底）", type: "image", default: "", fx: "duotone-print" },
      {
        key: "lines", label: "文字（每行 1-3 词，*词* 为斜体）", type: "textarea",
        default: "We\nremoved\n*the heart.*\nAnd\neverything\nchanged.",
      },
      { key: "font", label: "字体", type: "select", default: "serif", options: [
        { value: "serif", label: "Playfair 衬线（文艺）" },
        { value: "sans", label: "无衬线（冷静）" },
      ] },
      { key: "textColor", label: "文字颜色", type: "color", default: "#FFFFFF" },
      { key: "size", label: "字号", type: "range", default: "92", min: 36, max: 128 },
      { key: "lineHeight", label: "行高（%）", type: "range", default: "105", min: 82, max: 160 },
      { key: "align", label: "对齐", type: "select", default: "center", options: [
        { value: "center", label: "居中" },
        { value: "left", label: "左对齐" },
        { value: "right", label: "右对齐" },
      ] },
      { key: "streakAngle", label: "拉丝角度", type: "range", default: "158", min: 0, max: 180 },
      { key: "streakBlur", label: "拉丝柔化", type: "range", default: "34", min: 0, max: 80 },
      { key: "streakA", label: "拉丝色 · 暗", type: "color", default: "#1A2C4E" },
      { key: "streakB", label: "拉丝色 · 中", type: "color", default: "#3F6CAE" },
      { key: "streakC", label: "拉丝色 · 亮", type: "color", default: "#E8A56B" },
      { key: "duoShadow", label: "双色调 · 暗部", type: "color", default: "#16233E" },
      { key: "duoLight", label: "双色调 · 亮部", type: "color", default: "#E8A56B" },
      { key: "bgBlur", label: "照片模糊", type: "range", default: "16", min: 0, max: 40 },
    ],
    render: (v) => {
      const ff = v.font === "sans"
        ? "'Helvetica Neue',Helvetica,Arial,sans-serif"
        : "'Playfair Display',Didot,'Bodoni MT','Times New Roman',Georgia,serif";
      const align = v.align === "left" ? "left" : v.align === "right" ? "right" : "center";
      const lh = (Number(v.lineHeight) || 105) / 100;
      const deep = v.imgMode === "deep";

      // 拉丝底：两组不同周期的斜向重复渐变叠在一起再整体模糊，
      // 出来的是「照片被横向甩糊」那种连续色带，而不是规整条纹。
      const streaks = `
        repeating-linear-gradient(${v.streakAngle}deg,
          ${v.streakA} 0px, ${v.streakB} 46px, ${v.streakC} 88px, ${v.streakB} 132px, ${v.streakA} 190px),
        repeating-linear-gradient(${v.streakAngle}deg,
          rgba(0,0,0,.34) 0px, rgba(0,0,0,0) 70px, rgba(255,255,255,.14) 150px, rgba(0,0,0,0) 240px)`;
      const streakNode = `<div style="position:absolute;inset:0;background:${streaks};background-blend-mode:overlay;filter:blur(${v.streakBlur}px) saturate(1.15);transform:scale(1.22);"></div>`;

      // 简单模式：CSS 现场近似双色调（去色后用渐变 color 混合）。
      // 深度模式：poster-fx 已经把双色调和颗粒烧进图里了，这里不要再叠一层。
      const photoNode = `
        <img src="${v.image}" style="position:absolute;inset:-40px;width:calc(100% + 80px);height:calc(100% + 80px);object-fit:cover;filter:blur(${v.bgBlur}px)${deep ? "" : " grayscale(100%) contrast(112%) brightness(104%)"};" />
        ${deep ? "" : `<div style="position:absolute;inset:0;background:linear-gradient(${v.streakAngle}deg,${v.duoShadow},${v.duoLight});mix-blend-mode:color;"></div>`}`;

      const lines = (v.lines || "")
        .split("\n").filter((l) => l.trim())
        .map((l) => `<div>${rich(l)}</div>`)
        .join("");
      return `
      <div style="position:absolute;inset:0;background:${v.streakA};overflow:hidden;">
        ${v.image ? photoNode : streakNode}
        <div style="position:absolute;inset:0;background:radial-gradient(680px 760px at 50% 46%, rgba(0,0,0,.14), rgba(0,0,0,.42));"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 62px;">
          <div style="width:100%;font-family:${ff};font-size:${v.size}px;line-height:${lh};color:${v.textColor};text-align:${align};font-weight:700;letter-spacing:-1.5px;text-shadow:0 2px 34px rgba(0,0,0,.3);">${lines}</div>
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
    presets: [
      {
        id: "interview-q2-pink-blue", name: "复刻 · 访谈Q2", ref: "17-interview-q2-editorial.png",
        values: {
          eyebrow: "INTERVIEW / Q2",
          title: "Q2",
          dek: "很多人对‘从事亚文化领域的平面设计师与艺术实践’这一定位感到好奇。你如何理解这一身份？",
          body: "在德国的许多大城市，都有自发的青年文化中心，年轻人可以在这里独立组织、策划活动并进行实验。这些机构在政治和项目规划上是属于自我管理的，通常依靠志愿服务维持，从这个意义上说，它们是一种“替代性基础设施”。",
          meta: "POSTER LAB · INTERVIEW 2026",
          size: "110",
          bg: "#FFFFFF",
          ink: "#3A3FD8",
          accent: "#F5A8CF",
        },
      },
      {
        id: "adventures-dark-serif", name: "复刻 · 暗色探险", ref: "30-adventures-first-dark-halftone.png",
        values: {
          eyebrow: "OCTOBER 11TH / 22 PM MONDAY",
          title: "THE\n*ADVENTURES*\nFIRST",
          dek: "explanations take\nsuch a dreadful time",
          body: "Persons attempting to find a motive in this narrative will be prosecuted; persons attempting to find a moral in it will be banished.\n— Mark Twain, The Adventures of Huckleberry Finn",
          meta: "(C) «ALICE IN WONDERLAND» / LEWIS CARROLL",
          size: "78",
          bg: "#0B0B0D",
          ink: "#F4F4F2",
          accent: "#D8D8D4",
        },
      },
    ],
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
    id: "moire-title-field",
    name: "莫尔标题场",
    styleId: "moire-pattern",
    desc: "干涉波纹背景板 + 顶部色条标题 + 椭圆环：波纹、色板、环形和三栏参数全可调",
    recommend: "视觉实验类分享 · 背景板可传图（深度模式会转成单色网点）；波纹密度在手机上比电脑上更密，导出前缩小检查",
    presets: [
      {
        id: "moire-black-wave", name: "复刻 · 黑波蓝字", ref: "51-moire-black-wave.svg",
        values: {
          title: "MOIRÉ",
          bigTitle: "MOIRÉ",
          caption: "FREQUENCY 24/25 · ANGLE +07° / -03°\nOPTICAL INTERFERENCE · STUDY 051",
          wave: "#111318",
          ink: "#111318",
          bg: "#F5F3ED",
          boardColor: "#F5F3ED",
          blockColor: "#1747D1",
          titleColor: "#FFFFFF",
          ringColor: "#1747D1",
          ringWidth: "10",
          ringRx: "196",
          ringRy: "196",
          waveGap: "16",
          angle: "7",
          spec1: "FREQ 24/25",
          spec2: "ANGLE +07/-03",
          spec3: "STUDY 051",
          footNote: "OPTICAL INTERFERENCE",
        },
      },
      {
        id: "moire-color-orbit", name: "复刻 · 彩色轨道", ref: "52-moire-color-orbit.svg",
        values: {
          title: "ORBIT",
          bigTitle: "ORBIT",
          caption: "COLOR INTERFERENCE / 052\nAn optical field that moves while standing still.",
          wave: "#1CC5EA",
          ink: "#104BD5",
          bg: "#F7F9FB",
          boardColor: "#EAF4FA",
          blockColor: "#104BD5",
          titleColor: "#FFFFFF",
          ringColor: "#104BD5",
          ringWidth: "14",
          ringRx: "232",
          ringRy: "168",
          waveGap: "22",
          angle: "15",
          spec1: "COLOR / 052",
          spec2: "ANGLE +15°",
          spec3: "ORBIT FIELD",
          footNote: "MOVES WHILE STANDING STILL",
        },
      },
    ],
    fields: [
      // 顶部色条 + 标题
      { key: "title", label: "顶条标题", type: "text", default: "MOIRÉ FIELD" },
      { key: "blockColor", label: "顶条颜色", type: "color", default: "#1747D1" },
      { key: "titleColor", label: "顶条文字色", type: "color", default: "#FFFFFF" },
      { key: "blockH", label: "顶条高度", type: "range", default: "128", min: 70, max: 260 },
      // 背景板（可传图；深度模式转单色网点）
      { key: "board", label: "背景板图片（留空则用纯色板）", type: "image", default: "", fx: "halftone-mono" },
      // 这两个只在「深度」模式下生效：halftone-mono 靠它们决定网点颜色和粗细
      { key: "dotColor", label: "网点颜色（深度模式）", type: "color", default: "#111318" },
      { key: "dotSize", label: "网点大小（深度模式）", type: "range", default: "7", min: 3, max: 20 },
      { key: "boardColor", label: "背景板底色", type: "color", default: "#F1EFE8" },
      { key: "boardTop", label: "背景板上边", type: "range", default: "186", min: 120, max: 420 },
      { key: "boardH", label: "背景板高度", type: "range", default: "470", min: 200, max: 640 },
      // 干涉波纹
      { key: "wave", label: "波纹色", type: "color", default: "#111318" },
      { key: "waveGap", label: "波纹间距", type: "range", default: "16", min: 8, max: 40 },
      { key: "waveWidth", label: "波纹线宽", type: "range", default: "2", min: 1, max: 6 },
      { key: "angle", label: "第二层旋转角度", type: "range", default: "7", min: -18, max: 18 },
      // 椭圆环
      { key: "ringColor", label: "圆环颜色", type: "color", default: "#1747D1" },
      { key: "ringWidth", label: "圆环线宽", type: "range", default: "10", min: 0, max: 40 },
      { key: "ringRx", label: "圆环横半径", type: "range", default: "196", min: 60, max: 340 },
      { key: "ringRy", label: "圆环纵半径", type: "range", default: "196", min: 60, max: 300 },
      // 底部信息区
      { key: "spec1", label: "参数栏 · 左", type: "text", default: "FREQ 24/25" },
      { key: "spec2", label: "参数栏 · 中", type: "text", default: "ANGLE +07/-03" },
      { key: "spec3", label: "参数栏 · 右", type: "text", default: "STUDY 051" },
      { key: "bigTitle", label: "底部大标题", type: "text", default: "MOIRÉ" },
      { key: "bigSize", label: "大标题字号", type: "range", default: "96", min: 40, max: 150 },
      { key: "caption", label: "说明文字", type: "textarea", default: "Two grids. One moving image.\nOptical study no. 04." },
      { key: "footNote", label: "右下小字", type: "text", default: "OPTICAL INTERFERENCE" },
      { key: "ink", label: "文字色", type: "color", default: "#111318" },
      { key: "bg", label: "画布底色", type: "color", default: "#F7F8FA" },
    ],
    render: (v) => {
      const num = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
      const angle = num(v.angle, 7);
      const gap = num(v.waveGap, 16);
      const lw = num(v.waveWidth, 2);
      const boardTop = num(v.boardTop, 186);
      const blockH = num(v.blockH, 128);
      const bigSize = num(v.bigSize, 96);
      const deep = v.imgMode === "deep";

      // 底部要塞：参数栏(26) + 分隔线(48) + 大标题(60 起，占 bigSize*.94)
      // + 说明文字（钉在 bottom:56，两行约 70）。板子高度让位给它们，
      // 否则拉到 640 + 150 号大标题就会直接压在说明文字上。
      const bottomReserve = 60 + bigSize * 0.94 + 70 + 56;
      const boardMax = Math.max(200, 1000 - boardTop - bottomReserve);
      const boardH = Math.min(Math.max(num(v.boardH, 470), 200), boardMax);

      // 波纹用 SVG <pattern> 画：一格里一条正弦曲线，靠 patternUnits 平铺。
      // 振幅压在 gap/2 之内，否则曲线会被格子裁断，接缝很明显。
      const amp = Math.max(1, gap * 0.32);
      const mid = gap / 2;
      const wavePattern = (id, transform) => `
        <pattern id="${id}" width="140" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="${transform}">
          <path d="M0 ${mid} Q 35 ${mid - amp} 70 ${mid} T 140 ${mid}" fill="none" stroke="${v.wave}" stroke-width="${lw}" />
        </pattern>`;
      // 两层同频波纹，只差一个小角度 —— 干涉条纹就是这么来的。
      const moire = `
        <svg width="750" height="${boardH}" viewBox="0 0 750 ${boardH}" style="position:absolute;left:0;top:0;">
          <defs>
            ${wavePattern("mf-w1", "rotate(-4)")}
            ${wavePattern("mf-w2", `rotate(${angle}) scale(1.04)`)}
          </defs>
          <rect width="750" height="${boardH}" fill="url(#mf-w1)" opacity="0.92" />
          <rect width="750" height="${boardH}" fill="url(#mf-w2)" opacity="0.6" style="mix-blend-mode:multiply;" />
        </svg>`;

      // 简单模式下靠 CSS 近似单色网点观感；深度模式的图已经是网点图，不要再压滤镜。
      const boardImg = v.board
        ? `<img src="${v.board}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${deep ? "" : "filter:grayscale(100%) contrast(150%) brightness(96%);mix-blend-mode:multiply;"}" />`
        : "";

      const ringRx = num(v.ringRx, 196);
      const ringRy = num(v.ringRy, 196);
      const ringW = num(v.ringWidth, 10);
      const ring = ringW > 0
        ? `<svg width="750" height="${boardH}" viewBox="0 0 750 ${boardH}" style="position:absolute;left:0;top:0;">
             <ellipse cx="375" cy="${boardH / 2}" rx="${ringRx}" ry="${ringRy}" fill="none" stroke="${v.ringColor}" stroke-width="${ringW}" />
           </svg>`
        : "";

      const specCell = (text, align) =>
        `<span style="flex:1;text-align:${align};">${esc(text)}</span>`;

      return `
      <div style="position:absolute;inset:0;background:${v.bg};color:${v.ink};font-family:Helvetica,Arial,sans-serif;overflow:hidden;">
        <div style="position:absolute;left:0;right:0;top:0;height:${blockH}px;background:${v.blockColor};display:flex;align-items:center;padding:0 52px;">
          <div style="font-family:Anton,'Arial Black',Impact,Arial,sans-serif;font-size:${Math.round(blockH * 0.52)}px;line-height:1;letter-spacing:-2px;color:${v.titleColor};">${esc(v.title)}</div>
        </div>

        <div style="position:absolute;left:0;right:0;top:${boardTop}px;height:${boardH}px;background:${v.boardColor};overflow:hidden;">
          ${boardImg}
          ${moire}
          ${ring}
        </div>

        <div style="position:absolute;left:52px;right:52px;top:${boardTop + boardH + 26}px;display:flex;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:1.5px;color:${v.ink};">
          ${specCell(v.spec1, "left")}${specCell(v.spec2, "center")}${specCell(v.spec3, "right")}
        </div>
        <div style="position:absolute;left:52px;right:52px;top:${boardTop + boardH + 48}px;height:2px;background:${v.wave};"></div>
        <div style="position:absolute;left:52px;right:52px;top:${boardTop + boardH + 60}px;font-family:Anton,'Arial Black',Impact,Arial,sans-serif;font-size:${num(v.bigSize, 96)}px;line-height:.94;letter-spacing:-4px;color:${v.ink};">${esc(v.bigTitle)}</div>

        <div style="position:absolute;bottom:56px;left:52px;right:52px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;line-height:1.7;color:${v.ink};">
          <span style="white-space:pre-wrap;">${esc(v.caption)}</span>
          <span style="text-align:right;letter-spacing:1.5px;">${esc(v.footNote)}</span>
        </div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "photo-diary",
    name: "白底摄影札记",
    styleId: "photo-text",
    desc: "小红书式白底照片拼图：克制留白 + 上下/双联构图 + 可调滤镜，传两张照片即可成组",
    recommend: "小红书竖版 3:4 · 导出 1500×2000 可直接发布；同组多张请保持同一滤镜",
    presets: [
      {
        id: "banners-diptych", name: "复刻 · 红幡×紫幡", ref: "57-red-banners-purple-canopy-diptych.png",
        values: { layout: "side-by-side", margin: "110", gap: "8", saturate: "112", contrast: "104", caption: "" },
      },
      {
        id: "street-repair", name: "复刻 · 修车铺", ref: "58-street-repair-tires-diptych.png",
        values: { layout: "stack-sm-lg", margin: "96", gap: "48", warmth: "6", saturate: "104" },
      },
      {
        id: "treework-mirror", name: "复刻 · 呼应双图", ref: "59-treework-mirror-diptych.png",
        values: { layout: "stack-equal", margin: "104", gap: "52", saturate: "106", contrast: "102" },
      },
      {
        id: "bw-street", name: "复刻 · 黑白街拍", ref: "60-bw-train-street-diptych.png",
        values: { layout: "stack-equal", margin: "96", gap: "48", preset: "bw", contrast: "112" },
      },
      {
        id: "balloon-muted", name: "复刻 · 低饱和灰调", ref: "61-balloon-orange-wall-diptych.png",
        values: { layout: "stack-sm-lg", margin: "100", gap: "52", preset: "muted", brightness: "103" },
      },
    ],
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
  // ------------------------------------------------------------------
  {
    id: "halftone-editorial",
    name: "暗调半调大标题",
    styleId: "minimal-editorial",
    desc: "深色底 + 单色网点图 + 超大衬线标题。深度模式下上传图会被压成网点，和底色融成一片",
    recommend: "杂志封面 / 专题首图 · 暗调在手机深色列表里最抢眼",
    presets: [
      {
        id: "adventures-first",
        name: "复刻 · THE ADVENTURES FIRST",
        ref: "30-adventures-first-dark-halftone.png",
        values: {
          bg: "#0E0F12",
          ink: "#F2EFE6",
          dotColor: "#F2EFE6",
          dotSize: "7",
          glow: "#3A4B6B",
          glowSize: "62",
          kicker: "ISSUE 04 · NIGHT NOTES",
          title: "THE\nADVENTURES\nFIRST",
          bigSize: "92",
          imgH: "380",
          sub: "写给所有还没出发的人：先上路，路会自己长出来。",
          meta: "POSTER LAB|2026 AUTUMN",
        },
      },
    ],
    fields: [
      { key: "bg", label: "底色", type: "color", default: "#0E0F12" },
      { key: "ink", label: "文字色", type: "color", default: "#F2EFE6" },
      { key: "kicker", label: "顶部小标（栏目号）", type: "text", default: "ISSUE 04 · NIGHT NOTES" },
      // fx 走 halftone-mono：整幅反相后打点，底色直接取 bg，输出贴回来看不出接缝
      { key: "image", label: "主图（深度模式转网点）", type: "image", default: "", fx: "halftone-mono" },
      { key: "imgH", label: "主图高度", type: "range", default: "380", min: 200, max: 560 },
      { key: "dotColor", label: "网点颜色（深度模式）", type: "color", default: "#F2EFE6" },
      { key: "dotSize", label: "网点大小（深度模式）", type: "range", default: "7", min: 3, max: 20 },
      { key: "glow", label: "光晕颜色", type: "color", default: "#3A4B6B" },
      { key: "glowSize", label: "光晕强度", type: "range", default: "62", min: 0, max: 100 },
      { key: "title", label: "大标题（换行分行）", type: "textarea", default: "THE\nADVENTURES\nFIRST" },
      { key: "bigSize", label: "大标题字号", type: "range", default: "92", min: 48, max: 140 },
      { key: "sub", label: "副文案", type: "textarea", default: "写给所有还没出发的人：先上路，路会自己长出来。" },
      { key: "meta", label: "页脚（用 | 分左右）", type: "text", default: "POSTER LAB|2026 AUTUMN" },
    ],
    render: (v) => {
      const num = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
      const lim = (val, lo, hi) => Math.min(Math.max(val, lo), hi);
      const deep = v.imgMode === "deep";
      const bigSize = lim(num(v.bigSize, 92), 48, 140);
      const glowSize = lim(num(v.glowSize, 62), 0, 100);
      const imgTop = 116;

      const titleLines = String(v.title || "").split("\n").filter(Boolean);
      // 标题 + 副文案 + 页脚要占的高度先算出来，主图只能用剩下的空间，
      // 否则 140 号标题配 560 高的图会把页脚顶出画布。
      const textH = Math.max(1, titleLines.length) * bigSize * 1.0
        + (v.sub ? 62 : 0)
        + 92;
      const imgH = lim(num(v.imgH, 380), 180, Math.max(180, 1000 - imgTop - textH - 24));

      // 简单模式靠 CSS 近似：灰度 + 硬对比，混色模式让暗部吃掉底色
      const fake = "filter:grayscale(100%) contrast(150%) brightness(94%);mix-blend-mode:screen;opacity:.86;";
      const [metaL, metaR] = String(v.meta || "").split("|");

      return `
      <div style="position:absolute;inset:0;background:${v.bg};overflow:hidden;">
        ${glowSize > 0
          ? `<div style="position:absolute;left:50%;top:${imgTop + imgH * 0.35}px;transform:translate(-50%,-50%);width:${620}px;height:${620}px;border-radius:50%;background:radial-gradient(circle,${v.glow} 0%,rgba(0,0,0,0) 70%);opacity:${(glowSize / 100).toFixed(2)};"></div>`
          : ""}
        <div style="position:absolute;top:52px;left:64px;right:64px;display:flex;justify-content:space-between;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:3px;color:${v.ink};opacity:.7;">
          <span>${esc(v.kicker)}</span><span>3 : 4</span>
        </div>
        ${v.image
          ? `<img src="${v.image}" style="position:absolute;left:64px;top:${imgTop}px;width:622px;height:${imgH}px;object-fit:cover;${deep ? "" : fake}" />`
          : `<div style="position:absolute;left:64px;top:${imgTop}px;width:622px;height:${imgH}px;border:1px dashed ${v.ink};opacity:.28;"></div>`}
        <div style="position:absolute;left:64px;right:64px;top:${imgTop + imgH + 26}px;">
          <div style="font-family:'Playfair Display',Georgia,'Songti SC',serif;font-size:${bigSize}px;font-weight:700;line-height:1.0;letter-spacing:-1px;color:${v.ink};">${titleLines
            .map((l) => `<div>${rich(l)}</div>`)
            .join("")}</div>
          ${v.sub
            ? `<div style="margin-top:18px;font-size:15px;line-height:1.8;color:${v.ink};opacity:.72;max-width:520px;white-space:pre-wrap;">${esc(v.sub)}</div>`
            : ""}
        </div>
        <div style="position:absolute;bottom:44px;left:64px;right:64px;display:flex;justify-content:space-between;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;color:${v.ink};opacity:.6;">
          <span>${esc(metaL || "")}</span><span>${esc(metaR || "")}</span>
        </div>
      </div>`;
    },
  },
  // ------------------------------------------------------------------
  {
    id: "blueprint-spec",
    name: "工业蓝图参数页",
    styleId: "swiss-grid",
    desc: "原图素材模式完整保留 SHUTOFF 拼贴与蓝图页；切到可编辑重绘后，可替换主体、网格、标题和参数信息",
    recommend: "工业产品 / 设计研究页 · 一键复刻优先保证参考原图的整体构图与比例",
    fieldGroups: {
      "① 编辑方式与参考": ["replicaMode", "referenceImage"],
      "② 画布与网格": ["bg", "gridColor", "gridSize", "ink", "accent"],
      "③ 页眉与标题": ["code", "title", "titleEn"],
      "④ 主体图片": ["image", "imgH"],
      "⑤ 参数区": ["specs", "showSpecCards"],
      "⑥ 页脚信息": ["foot"],
    },
    presets: [
      {
        id: "shutoff-industrial",
        name: "复刻 · SHUTOFF 工业页",
        ref: "28-shutoff-industrial-01.png",
        values: {
          replicaMode: "editable",
          referenceImage: "assets/inspirations/28-shutoff-industrial-01.png",
          bg: "#F7F8F8",
          gridColor: "#8ECFE7",
          ink: "#111111",
          accent: "#14A7DD",
          gridSize: "28",
          code: "DESIGN BEYOND FORM",
          title: "Finding balance between",
          titleEn: "FUNCTION, EMOTION AND VISUAL LANGUAGE",
          specs: "41|08.15\n48|—\nR7|10.30",
          showSpecCards: "yes",
          foot: "SHUTOFF / INDUSTRIAL STUDY|PURPOSE %79",
        },
      },
      {
        id: "shutoff-blueprint-grid",
        name: "复刻 · 蓝图网格页",
        ref: "31-shutoff-blueprint-grid-02.png",
        values: {
          replicaMode: "editable",
          referenceImage: "assets/inspirations/31-shutoff-blueprint-grid-02.png",
          bg: "#F3F5F7",
          gridColor: "#62BDE3",
          ink: "#111111",
          accent: "#009EE3",
          gridSize: "36",
          code: "SHUTOFF / GRID STUDY",
          title: "Finding balance between",
          titleEn: "FUNCTION, EMOTION AND VISUAL LANGUAGE",
          specs: "PURPOSE|%79\nSYSTEM|SHUTOFF\nGRID|12 × 16\nEDITION|02",
          showSpecCards: "yes",
          foot: "DESIGN BEYOND FORM|VISUAL LANGUAGE",
        },
      },
    ],
    fields: [
      { key: "replicaMode", label: "编辑方式", type: "select", default: "editable", options: [{ value: "editable", label: "可编辑模板（推荐）" }, { value: "reference", label: "参考原图对照" }] },
      { key: "referenceImage", label: "原图素材（可替换）", type: "image", default: "assets/inspirations/28-shutoff-industrial-01.png" },
      { key: "bg", label: "底色", type: "color", default: "#F7F8F8" },
      { key: "gridColor", label: "网格颜色（也是深度模式染色）", type: "color", default: "#8ECFE7" },
      { key: "gridSize", label: "网格密度", type: "range", default: "28", min: 12, max: 90 },
      { key: "ink", label: "文字色", type: "color", default: "#111111" },
      { key: "accent", label: "强调色", type: "color", default: "#14A7DD" },
      { key: "code", label: "顶部编号行", type: "text", default: "DESIGN BEYOND FORM" },
      // fx 走 blueprint-ghost：抠主体 + 提亮压饱和 + 用 gridColor 淡淡染一层
      { key: "image", label: "主体图（深度模式转蓝图幽灵）", type: "image", default: "", fx: "blueprint-ghost" },
      { key: "imgH", label: "主体高度", type: "range", default: "360", min: 180, max: 520 },
      { key: "title", label: "大标题", type: "text", default: "Finding balance between" },
      { key: "titleEn", label: "副标题", type: "text", default: "FUNCTION, EMOTION AND VISUAL LANGUAGE" },
      { key: "specs", label: "参数（每行：名称|数值）", type: "textarea", default: "41|08.15\n48|—\nR7|10.30" },
      {
        key: "showSpecCards",
        label: "参数显示方式",
        type: "select",
        default: "yes",
        options: [
          { value: "yes", label: "卡片网格" },
          { value: "no", label: "紧凑列表" },
        ],
      },
      { key: "foot", label: "页脚（用 | 分左右）", type: "text", default: "SHUTOFF / INDUSTRIAL STUDY|PURPOSE %79" },
    ],
    render: (v) => {
      if (v.replicaMode !== "editable" && v.referenceImage) return referenceCanvas(v.referenceImage, "#FFFFFF");
      const num = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
      const lim = (val, lo, hi) => Math.min(Math.max(val, lo), hi);
      const deep = v.imgMode === "deep";
      const g = lim(num(v.gridSize, 36), 12, 90);
      const cards = v.showSpecCards !== "no";
      const rows = String(v.specs || "").split("\n").filter(Boolean).map((l) => l.split("|"));

      const imgTop = 208;
      // 参数区高度：卡片是两列，列表是单列
      const specH = cards ? Math.ceil(rows.length / 2) * 78 : rows.length * 34;
      const imgH = lim(num(v.imgH, 360), 160, Math.max(160, 1000 - imgTop - specH - 130));

      const fake = "filter:grayscale(100%) brightness(128%) contrast(112%);opacity:.72;";
      const [footL, footR] = String(v.foot || "").split("|");

      const specBlock = cards
        ? `<div style="display:flex;flex-wrap:wrap;gap:14px;">${rows
            .map(
              ([k, val]) => `<div style="flex:1 1 calc(50% - 14px);min-width:0;border:1px solid ${v.gridColor};padding:14px 16px;background:rgba(255,255,255,.03);">
                <div style="font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:2px;color:${v.accent};margin-bottom:6px;">${esc(k || "")}</div>
                <div style="font-size:20px;font-weight:700;color:${v.ink};">${esc(val || "")}</div>
              </div>`
            )
            .join("")}</div>`
        : `<div>${rows
            .map(
              ([k, val]) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid ${v.gridColor};padding:7px 0;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:13px;color:${v.ink};">
                <span style="opacity:.7;">${esc(k || "")}</span><span style="font-weight:700;">${esc(val || "")}</span>
              </div>`
            )
            .join("")}</div>`;

      return `
      <div style="position:absolute;inset:0;background:${v.bg};overflow:hidden;">
        <div style="position:absolute;inset:0;background-image:linear-gradient(${v.gridColor} 1px,transparent 1px),linear-gradient(90deg,${v.gridColor} 1px,transparent 1px);background-size:${g}px ${g}px;opacity:.55;"></div>
        <div style="position:absolute;left:56px;right:56px;top:52px;display:flex;justify-content:space-between;align-items:center;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2.5px;color:${v.accent};">
          <span>${esc(v.code)}</span><span style="border:1px solid ${v.accent};padding:3px 8px;">750 × 1000</span>
        </div>
        <div style="position:absolute;left:56px;right:56px;top:96px;">
          <div style="font-family:'Anton',Impact,'Arial Narrow',sans-serif;font-size:76px;line-height:.92;letter-spacing:1px;color:${v.ink};">${esc(v.title)}</div>
          <div style="font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:4px;color:${v.accent};margin-top:8px;">${esc(v.titleEn)}</div>
        </div>
        ${v.image
          ? `<img src="${v.image}" style="position:absolute;left:50%;transform:translateX(-50%);top:${imgTop}px;width:520px;height:${imgH}px;object-fit:contain;${deep ? "" : fake}" />`
          : `<div style="position:absolute;left:50%;transform:translateX(-50%);top:${imgTop}px;width:520px;height:${imgH}px;border:1px dashed ${v.accent};opacity:.35;"></div>`}
        <div style="position:absolute;left:56px;right:56px;top:${imgTop + imgH + 22}px;">${specBlock}</div>
        <div style="position:absolute;bottom:40px;left:56px;right:56px;display:flex;justify-content:space-between;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:2px;color:${v.ink};opacity:.6;">
          <span>${esc(footL || "")}</span><span>${esc(footR || "")}</span>
        </div>
      </div>`;
    },
  },
  // ------------------------------------------------------------------
  {
    id: "road-slogan",
    name: "公路标语大字",
    styleId: "brutalist-type",
    desc: "原图素材模式保留 Node 66 双联成品；可编辑重绘忠实采用左幅的雾蓝公路照片、红色叠字与红底黑字对角结构",
    recommend: "品牌宣言 / 公路摄影 · 先复刻原图，再切换重绘模式替换照片与两组大字",
    fieldGroups: {
      "① 编辑方式与参考": ["replicaMode", "referenceImage"],
      "② 色板": ["bg", "ink", "topInk"],
      "③ 上半照片与分割": ["photo", "splitRatio"],
      "④ 上半标语与标签": ["tag", "slogan", "sloganSize"],
      "⑤ 下半标语": ["sub"],
      "⑥ 资料脚注": ["foot"],
    },
    presets: [
      {
        id: "node66-road-red",
        name: "复刻 · 66 号公路红",
        ref: "37-node66-road-red-pair.png",
        values: {
          replicaMode: "editable",
          referenceImage: "assets/inspirations/37-node66-road-red-pair.png",
          bg: "#C8102E",
          ink: "#111111",
          topInk: "#E10E12",
          splitRatio: "60",
          tag: "BM / 604 / MOVE / NOW",
          slogan: "THE\nROAD\nIS\nLONG",
          sloganSize: "94",
          sub: "THE\nTIME\nIS\nSHORT",
          foot: "08 / RIVER / PHOTOGRAPHY|AZAM SAM",
        },
      },
    ],
    fields: [
      { key: "replicaMode", label: "编辑方式", type: "select", default: "editable", options: [{ value: "editable", label: "可编辑模板（推荐）" }, { value: "reference", label: "参考原图对照" }] },
      { key: "referenceImage", label: "原图素材（可替换）", type: "image", default: "assets/inspirations/37-node66-road-red-pair.png" },
      { key: "bg", label: "色块底色", type: "color", default: "#C8102E" },
      { key: "ink", label: "下半大字色", type: "color", default: "#111111" },
      { key: "topInk", label: "上半大字色", type: "color", default: "#E10E12" },
      { key: "photo", label: "上方照片", type: "image", default: "" },
      { key: "splitRatio", label: "照片占比 %", type: "range", default: "60", min: 45, max: 72 },
      { key: "tag", label: "右侧微型标记（用 / 分行）", type: "text", default: "BM / 604 / MOVE / NOW" },
      { key: "slogan", label: "上半标语（换行分行）", type: "textarea", default: "THE\nROAD\nIS\nLONG" },
      { key: "sloganSize", label: "标语字号", type: "range", default: "94", min: 60, max: 124 },
      { key: "sub", label: "下半标语（换行分行）", type: "textarea", default: "THE\nTIME\nIS\nSHORT" },
      { key: "foot", label: "左下资料（用 | 分组）", type: "text", default: "08 / RIVER / PHOTOGRAPHY|AZAM SAM" },
    ],
    render: (v) => {
      if (v.replicaMode !== "editable" && v.referenceImage) return referenceCanvas(v.referenceImage, "#222222");
      const num = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
      const lim = (val, lo, hi) => Math.min(Math.max(val, lo), hi);
      const lines = String(v.slogan || "").split("\n").filter(Boolean);
      const lowerLines = String(v.sub || "").split("\n").filter(Boolean);
      const size = lim(num(v.sloganSize, 94), 60, 124);
      const lowerSize = lim(size * 1.02, 60, 126);
      const ratio = lim(num(v.splitRatio, 60), 45, 72);
      const photoH = Math.round((ratio / 100) * 1000);
      const [footL, footR] = String(v.foot || "").split("|");
      const tags = String(v.tag || "").split("/").map((item) => item.trim()).filter(Boolean);

      return `
      <div style="position:absolute;inset:0;background:${v.bg};overflow:hidden;">
        ${v.photo
          ? `<img src="${v.photo}" style="position:absolute;left:0;top:0;width:750px;height:${photoH}px;object-fit:cover;display:block;" />`
          : `<div style="position:absolute;left:0;top:0;width:750px;height:${photoH}px;background:linear-gradient(180deg,#B7D7DB 0%,#9EC2C6 58%,#6D8F91 100%);"><div style="position:absolute;left:0;right:0;bottom:44px;height:28px;background:#496C6E;opacity:.6;"></div><div style="position:absolute;left:286px;bottom:42px;width:110px;height:42px;background:#26383B;clip-path:polygon(16% 24%,82% 16%,100% 58%,91% 100%,7% 100%,0 60%);"></div></div>`}
        <div style="position:absolute;left:18px;top:14px;font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;font-size:${size}px;font-weight:900;line-height:.78;letter-spacing:-7px;color:${v.topInk};">${lines
            .map((l) => `<div>${rich(l)}</div>`)
            .join("")}</div>
        <div style="position:absolute;right:12px;top:42px;display:grid;gap:74px;text-align:right;font:700 8px/1 'Space Mono',ui-monospace,monospace;color:${v.topInk};text-transform:uppercase;">${tags.map((item) => `<span>${esc(item)}</span>`).join("")}</div>
        <div style="position:absolute;right:12px;bottom:10px;text-align:right;font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;font-size:${lowerSize}px;font-weight:900;line-height:.76;letter-spacing:-8px;color:${v.ink};">${lowerLines.map((l) => `<div>${rich(l)}</div>`).join("")}</div>
        <div style="position:absolute;left:14px;top:${photoH + 48}px;width:116px;font:700 9px/4.8 'Space Mono',ui-monospace,monospace;color:${v.ink};text-transform:uppercase;">
          <div>${esc(footL || "")}</div><div>${esc(footR || "")}</div>
        </div>
      </div>`;
    },
  },
  // ------------------------------------------------------------------
  {
    id: "data-bar-photo",
    name: "满幅照片数据条",
    styleId: "brutalist-type",
    desc: "原图素材模式保留 Node 66 山景成品；可编辑重绘还原亮黄仪表条、底部 ABOUT US 文案与右下品牌字标",
    recommend: "户外品牌 / 团队介绍 · 原图模式用于高相似复刻，重绘模式可换成自己的山景和数据",
    fieldGroups: {
      "① 编辑方式与参考": ["replicaMode", "referenceImage"],
      "② 照片与压暗": ["bg", "photo", "shade"],
      "③ 黄色数据条": ["barY", "barColor", "stats", "timeWord"],
      "④ 标题与正文": ["title", "titleSize", "body"],
      "⑤ 页眉与页脚": ["ink", "kicker", "foot"],
    },
    presets: [
      {
        id: "node66-about-us",
        name: "复刻 · ABOUT US 山景",
        ref: "40-node66-about-us-mountain.png",
        values: {
          replicaMode: "editable",
          referenceImage: "assets/inspirations/40-node66-about-us-mountain.png",
          bg: "#101418",
          barY: "455",
          barColor: "#FFE500",
          ink: "#FFE500",
          timeWord: "TIME",
          shade: "18",
          kicker: "",
          title: "ABOUT US",
          titleSize: "66",
          stats: "DISTANCE 10KM|ELEVATION GAIN 890M\nHIKE TIME 02:23:55|FUEL UP. KEEP MOVING.\nTEMPERATURE +10C|WWW.NODE66.COM",
          body: "Node 66 is built at intersections — of people, of places, of paths crossed for the first time. The road is the promise that something worth finding is always just ahead. Two shapes. One mark. Endless roads.",
          foot: "WWW.NODE66.COM|node⁶⁶",
        },
      },
    ],
    fields: [
      { key: "replicaMode", label: "编辑方式", type: "select", default: "editable", options: [{ value: "editable", label: "可编辑模板（推荐）" }, { value: "reference", label: "参考原图对照" }] },
      { key: "referenceImage", label: "原图素材（可替换）", type: "image", default: "assets/inspirations/40-node66-about-us-mountain.png" },
      { key: "bg", label: "兜底底色", type: "color", default: "#101418" },
      { key: "photo", label: "满幅照片", type: "image", default: "" },
      { key: "shade", label: "照片压暗程度", type: "range", default: "18", min: 0, max: 80 },
      { key: "barY", label: "数据条位置", type: "range", default: "455", min: 300, max: 650 },
      { key: "barColor", label: "数据条颜色", type: "color", default: "#FFE500" },
      { key: "ink", label: "文字色", type: "color", default: "#FFE500" },
      { key: "timeWord", label: "数据条右侧大字", type: "text", default: "TIME" },
      { key: "kicker", label: "顶部小标（可留空）", type: "text", default: "" },
      { key: "title", label: "底部标题", type: "textarea", default: "ABOUT US" },
      { key: "titleSize", label: "标题字号", type: "range", default: "66", min: 42, max: 92 },
      { key: "stats", label: "数据条（三行：左|右）", type: "textarea", default: "DISTANCE 10KM|ELEVATION GAIN 890M\nHIKE TIME 02:23:55|FUEL UP. KEEP MOVING.\nTEMPERATURE +10C|WWW.NODE66.COM" },
      { key: "body", label: "底部正文", type: "textarea", default: "Node 66 is built at intersections — of people, of places, of paths crossed for the first time. The road is the promise that something worth finding is always just ahead. Two shapes. One mark. Endless roads." },
      { key: "foot", label: "网址与右下字标（用 | 分左右）", type: "text", default: "WWW.NODE66.COM|node⁶⁶" },
    ],
    render: (v) => {
      if (v.replicaMode !== "editable" && v.referenceImage) return referenceCanvas(v.referenceImage, "#101418");
      const num = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
      const lim = (val, lo, hi) => Math.min(Math.max(val, lo), hi);
      const titleSize = lim(num(v.titleSize, 66), 42, 92);
      const titleLines = String(v.title || "").split("\n").filter(Boolean);
      const shade = lim(num(v.shade, 18), 0, 80) / 100;
      const barH = 104;
      const barY = lim(num(v.barY, 455), 300, 650);
      const stats = String(v.stats || "").split("\n").filter(Boolean).map((l) => l.split("|"));
      const [footL, footR] = String(v.foot || "").split("|");

      return `
      <div style="position:absolute;inset:0;background:${v.bg};overflow:hidden;">
        ${v.photo ? `<img src="${v.photo}" style="position:absolute;inset:0;width:750px;height:1000px;object-fit:cover;display:block;" />` : `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#D7E4DF 0%,#BFC9BD 28%,#4F5B45 45%,#151B14 78%,#0B0E0B 100%);"><div style="position:absolute;left:-80px;right:-70px;top:235px;height:340px;background:#273326;clip-path:polygon(0 74%,18% 44%,37% 53%,52% 18%,67% 48%,80% 31%,100% 70%,100% 100%,0 100%);"></div></div>`}
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,${(shade * .4).toFixed(2)}) 0%,rgba(0,0,0,${(shade * .15).toFixed(2)}) 46%,rgba(0,0,0,${(shade * 1.65).toFixed(2)}) 100%);"></div>
        <div style="position:absolute;top:52px;left:52px;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:5px;color:${v.ink};opacity:.85;">${esc(v.kicker)}</div>
        <div style="position:absolute;left:0;right:0;top:${barY}px;height:${barH}px;background:${v.barColor};display:grid;grid-template-columns:1fr 1fr 1.15fr;align-items:center;gap:24px;padding:0 20px;color:#111;overflow:hidden;">
          ${stats
            .map(
              ([n, unit]) => `<div style="font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:10px;font-weight:700;line-height:1.16;text-transform:uppercase;"><div>${esc(n || "")}</div><div>${esc(unit || "")}</div></div>`
            )
            .join("")}
          ${v.timeWord ? `<div style="position:absolute;right:-28px;bottom:-32px;font-family:'Arial Black',Impact,sans-serif;font-size:116px;line-height:1;color:${v.barColor === v.ink ? "#FFF" : v.ink};opacity:.9;">${esc(v.timeWord)}</div>` : ""}
        </div>
        <div style="position:absolute;left:34px;right:34px;bottom:68px;">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:${titleSize}px;font-weight:400;line-height:1;color:${v.ink};letter-spacing:2px;">${titleLines
            .map((l) => `<div>${rich(l)}</div>`)
            .join("")}</div>
          ${v.body
            ? `<div style="margin-top:14px;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:9px;font-weight:700;line-height:1.2;color:${v.ink};max-width:520px;white-space:pre-wrap;">${esc(v.body)}</div>`
            : ""}
        </div>
        <div style="position:absolute;bottom:18px;left:34px;right:26px;display:flex;justify-content:space-between;align-items:flex-end;color:${v.ink};">
          <span style="font:700 9px/1 'Space Mono',ui-monospace,monospace;">${esc(footL || "")}</span><span style="font:900 44px/.8 'Arial Black',Arial,sans-serif;letter-spacing:-4px;">${esc(footR || "")}</span>
        </div>
      </div>`;
    },
  },
  // ------------------------------------------------------------------
  {
    id: "diptych-pair",
    name: "双联并置展示",
    styleId: "brutalist-type",
    desc: "原图素材模式完整保留 Node 66 黑底双联展示；可编辑重绘把左右海报拆成独立模块，可分别替换照片、标题、标签与配色",
    recommend: "作品集内页 / 系列稿提案 · 左右两张既可上传成品，也可按同一版式骨架分别重做",
    fieldGroups: {
      "① 编辑方式与参考": ["replicaMode", "referenceImage"],
      "② 衬底与构图": ["matColor", "gap", "scale"],
      "③ 左幅海报模块": ["leftMode", "posterLeft", "leftBg", "leftPhoto", "leftTag", "leftTitle", "leftSub", "leftInk"],
      "④ 右幅海报模块": ["rightMode", "posterRight", "rightBg", "rightPhoto", "rightTag", "rightTitle", "rightSub", "rightInk"],
      "⑤ 圆角、投影与说明": ["radius", "shadow", "caption", "captionColor"],
    },
    presets: [
      {
        id: "node66-road-pair",
        name: "复刻 · 66 号公路双联",
        ref: "37-node66-road-red-pair.png",
        values: {
          replicaMode: "editable",
          referenceImage: "assets/inspirations/37-node66-road-red-pair.png",
          matColor: "#222222",
          gap: "18",
          scale: "72",
          leftMode: "redraw",
          leftBg: "#C8102E",
          leftTag: "BM / 604",
          leftTitle: "THE\nROAD",
          leftSub: "IS LONG",
          leftInk: "#111111",
          rightMode: "redraw",
          rightBg: "#F1F0EA",
          rightTag: "NODE 66",
          rightTitle: "THE\nTIME",
          rightSub: "IS SHORT",
          rightInk: "#111111",
          radius: "0",
          shadow: "none",
          caption: "",
          captionColor: "#D8D8D4",
        },
      },
    ],
    fields: [
      { key: "replicaMode", label: "编辑方式", type: "select", default: "editable", options: [{ value: "editable", label: "可编辑模板（推荐）" }, { value: "reference", label: "参考原图对照" }] },
      { key: "referenceImage", label: "原图素材（可替换）", type: "image", default: "assets/inspirations/37-node66-road-red-pair.png" },
      { key: "matColor", label: "衬纸颜色", type: "color", default: "#222222" },
      { key: "gap", label: "两幅间距", type: "range", default: "18", min: 0, max: 80 },
      { key: "scale", label: "整体缩放 %", type: "range", default: "72", min: 55, max: 100 },
      { key: "leftMode", label: "左幅内容模式", type: "select", default: "redraw", options: [{ value: "redraw", label: "参数化重绘（推荐）" }, { value: "original", label: "原始成品素材" }] },
      { key: "posterLeft", label: "左幅原始成品（可替换）", type: "image", default: "" },
      { key: "leftBg", label: "左幅背景色", type: "color", default: "#C8102E" },
      { key: "leftPhoto", label: "左幅照片（可选）", type: "image", default: "" },
      { key: "leftTag", label: "左幅标签", type: "text", default: "BM / 604" },
      { key: "leftTitle", label: "左幅标题（换行）", type: "textarea", default: "THE\nROAD" },
      { key: "leftSub", label: "左幅副标题", type: "text", default: "IS LONG" },
      { key: "leftInk", label: "左幅文字色", type: "color", default: "#111111" },
      { key: "rightMode", label: "右幅内容模式", type: "select", default: "redraw", options: [{ value: "redraw", label: "参数化重绘（推荐）" }, { value: "original", label: "原始成品素材" }] },
      { key: "posterRight", label: "右幅原始成品（可替换）", type: "image", default: "" },
      { key: "rightBg", label: "右幅背景色", type: "color", default: "#F1F0EA" },
      { key: "rightPhoto", label: "右幅照片（可选）", type: "image", default: "" },
      { key: "rightTag", label: "右幅标签", type: "text", default: "NODE 66" },
      { key: "rightTitle", label: "右幅标题（换行）", type: "textarea", default: "THE\nTIME" },
      { key: "rightSub", label: "右幅副标题", type: "text", default: "IS SHORT" },
      { key: "rightInk", label: "右幅文字色", type: "color", default: "#111111" },
      { key: "radius", label: "圆角", type: "range", default: "0", min: 0, max: 24 },
      {
        key: "shadow",
        label: "投影",
        type: "select",
        default: "none",
        options: [
          { value: "none", label: "无" },
          { value: "soft", label: "柔和" },
          { value: "hard", label: "硬边（错位色块）" },
        ],
      },
      { key: "caption", label: "底部说明（原图留空）", type: "text", default: "" },
      { key: "captionColor", label: "说明文字色", type: "color", default: "#D8D8D4" },
    ],
    render: (v) => {
      if (v.replicaMode !== "editable" && v.referenceImage) return referenceCanvas(v.referenceImage, "#222222");
      const num = (val, fallback) => (Number.isFinite(Number(val)) ? Number(val) : fallback);
      const lim = (val, lo, hi) => Math.min(Math.max(val, lo), hi);
      const gap = lim(num(v.gap, 26), 0, 80);
      const scale = lim(num(v.scale, 82), 55, 100) / 100;
      const radius = lim(num(v.radius, 0), 0, 24);

      // 每幅保持 3:4。先按宽度算，若高度超出可用区就按高度反算，保证两种极端都不溢出
      const margin = 46;
      const captionH = v.caption ? 52 : 0;
      const availW = (750 - margin * 2 - gap) * scale;
      const availH = (1000 - margin * 2 - captionH) * scale;
      let panelW = availW / 2;
      let panelH = panelW * (4 / 3);
      if (panelH > availH) {
        panelH = availH;
        panelW = panelH * (3 / 4);
      }
      const totalW = panelW * 2 + gap;
      const left = (750 - totalW) / 2;
      const top = (1000 - captionH - panelH) / 2;

      const shadowCss =
        v.shadow === "soft"
          ? "box-shadow:0 18px 40px rgba(0,0,0,.22);"
          : v.shadow === "hard"
            ? "box-shadow:14px 14px 0 rgba(0,0,0,.30);"
            : "";

      const panel = (side, label, x) => {
        const sourceKey = side === "left" ? "posterLeft" : "posterRight";
        const modeKey = side === "left" ? "leftMode" : "rightMode";
        const bgKey = side === "left" ? "leftBg" : "rightBg";
        const photoKey = side === "left" ? "leftPhoto" : "rightPhoto";
        const tagKey = side === "left" ? "leftTag" : "rightTag";
        const titleKey = side === "left" ? "leftTitle" : "rightTitle";
        const subKey = side === "left" ? "leftSub" : "rightSub";
        const inkKey = side === "left" ? "leftInk" : "rightInk";
        const source = v[sourceKey];
        if (v[modeKey] === "original" && source) {
          return `<div style="position:absolute;left:${x}px;top:${top}px;width:${panelW}px;height:${panelH}px;border-radius:${radius}px;overflow:hidden;background:#15181C;${shadowCss}">
            <img src="${source}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />
          </div>`;
        }
        const titleLines = String(v[titleKey] || "").split("\n").filter(Boolean).map((line) => `<div>${rich(line)}</div>`).join("");
        return `<div style="position:absolute;left:${x}px;top:${top}px;width:${panelW}px;height:${panelH}px;border-radius:${radius}px;overflow:hidden;background:${v[bgKey] || "#F1F0EA"};${shadowCss};color:${v[inkKey] || "#111"};">
          ${v[photoKey]
            ? `<img src="${v[photoKey]}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;filter:saturate(80%) contrast(110%);" />
               <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.52));"></div>`
            : ""}
          <div style="position:absolute;left:14px;right:12px;top:14px;font:700 8px/1.2 'Space Mono',ui-monospace,monospace;letter-spacing:1.5px;text-transform:uppercase;">${esc(v[tagKey])}</div>
          <div style="position:absolute;left:14px;right:12px;top:50px;font:900 ${Math.max(24, Math.min(48, panelW * .18))}px/.82 'Arial Black','Helvetica Neue',Arial,sans-serif;letter-spacing:-2px;text-transform:uppercase;">${titleLines}</div>
          <div style="position:absolute;left:14px;right:12px;bottom:16px;font:700 9px/1.1 'Space Mono',ui-monospace,monospace;letter-spacing:1.5px;text-transform:uppercase;">${esc(v[subKey])}</div>
        </div>`;
      };

      return `
      <div style="position:absolute;inset:0;background:${v.matColor};overflow:hidden;">
        ${panel("left", "LEFT", left)}
        ${panel("right", "RIGHT", left + panelW + gap)}
        ${v.caption
          ? `<div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;font-family:'Space Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:4px;color:${v.captionColor};">${esc(v.caption)}</div>`
          : ""}
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "line-event-quartet",
    name: "线稿活动四联",
    styleId: "playful-craft",
    desc: "原图素材模式完整保留四联总览；可编辑模式既能直接使用四张原始单页，也能切换为文字与插画参数化重绘",
    recommend: "系列海报总览 / 活动视觉提案 · 参考原图和四张单页都作为内置素材保留",
    fieldGroups: {
      "① 编辑方式与总览": ["replicaMode", "referenceImage", "panelMode", "bg", "gap", "ink", "meta"],
      "② 单页 1 · Design MORO": ["p1Mode", "p1Poster", "p1Bg", "p1Tag", "p1Title", "p1Sub", "p1Caption", "p1Shape", "p1Color", "p1Art"],
      "③ 单页 2 · Street Party": ["p2Mode", "p2Poster", "p2Bg", "p2Tag", "p2Title", "p2Sub", "p2Caption", "p2Shape", "p2Color", "p2Art"],
      "④ 单页 3 · Recharge": ["p3Mode", "p3Poster", "p3Bg", "p3Tag", "p3Title", "p3Sub", "p3Caption", "p3Shape", "p3Color", "p3Art"],
      "⑤ 单页 4 · Lake Fair": ["p4Mode", "p4Poster", "p4Bg", "p4Tag", "p4Title", "p4Sub", "p4Caption", "p4Shape", "p4Color", "p4Art"],
    },
    presets: [
      {
        id: "design-moro-quartet",
        name: "复刻 · Design MORO 四联",
        ref: "66-line-event-quartet.png",
        values: {
          replicaMode: "editable",
          referenceImage: "assets/inspirations/66-line-event-quartet.png",
          panelMode: "redraw",
          p1Poster: "assets/inspirations/62-design-moro-lineart.png",
          p1Mode: "redraw",
          p2Poster: "assets/inspirations/63-street-party-blur.png",
          p2Mode: "redraw",
          p3Poster: "assets/inspirations/64-recharge-playful-type.png",
          p3Mode: "redraw",
          p4Poster: "assets/inspirations/65-lake-fair-lineart.png",
          p4Mode: "redraw",
          bg: "#D9D9D6",
          gap: "12",
          ink: "#111111",
          p1Bg: "#FFFFFF",
          p1Tag: "DESIGN MORO",
          p1Title: "What should we design?",
          p1Sub: "Branding  Poster  Editorial",
          p1Caption: "since 2021.03.03",
          p1Shape: "tent",
          p1Color: "#E8624B",
          p2Bg: "#F7F7F4",
          p2Tag: "53 STREET PARTY",
          p2Title: "100 Possibilities",
          p2Sub: "in the Vicinity",
          p2Caption: "街区市集 · slowtalk · 工作坊",
          p2Shape: "people",
          p2Color: "#1F9DE4",
          p3Bg: "#F8F8F6",
          p3Tag: "PLAN : POOOD",
          p3Title: "Time to 按需\nplay, 嬉戏, recharge",
          p3Sub: "the 呼吸. day.",
          p3Caption: "市集 · 分享会 · workshop",
          p3Shape: "chairs",
          p3Color: "#E48AB7",
          p4Bg: "#F3F3F0",
          p4Tag: "湖集 HU FAIR",
          p4Title: "在湖集\n划个水",
          p4Sub: "At the lake\ndraw a water",
          p4Caption: "Lake water · music · alcohol",
          p4Shape: "swimmer",
          p4Color: "#18A7DD",
          meta: "POSTER LAB / LINE EVENT SERIES / 2026",
        },
      },
    ],
    fields: [
      { key: "replicaMode", label: "编辑方式", type: "select", default: "editable", options: [{ value: "editable", label: "可编辑四联（推荐）" }, { value: "reference", label: "总览原图对照" }] },
      { key: "referenceImage", label: "四联总览原图（可替换）", type: "image", default: "assets/inspirations/66-line-event-quartet.png" },
      { key: "panelMode", label: "四联内容模式", type: "select", default: "redraw", options: [{ value: "redraw", label: "参数化重绘（推荐）" }, { value: "originals", label: "四张原始单页" }] },
      { key: "bg", label: "总览衬底", type: "color", default: "#D9D9D6" },
      { key: "gap", label: "四联间距", type: "range", default: "12", min: 0, max: 28 },
      { key: "ink", label: "默认文字色", type: "color", default: "#111111" },
      { key: "p1Bg", label: "① Design MORO 背景", type: "color", default: "#FFFFFF" },
      { key: "p1Mode", label: "① 内容模式", type: "select", default: "redraw", options: [{ value: "redraw", label: "参数化重绘（推荐）" }, { value: "originals", label: "原始单页素材" }] },
      { key: "p1Tag", label: "① 眉题", type: "text", default: "DESIGN MORO" },
      { key: "p1Title", label: "① 标题", type: "textarea", default: "What should we design?" },
      { key: "p1Sub", label: "① 分类小字", type: "textarea", default: "Branding  Poster  Editorial" },
      { key: "p1Caption", label: "① 底部说明", type: "text", default: "since 2021.03.03" },
      { key: "p1Shape", label: "① 插画形状", type: "select", default: "tent", options: [{ value: "tent", label: "帐篷" }, { value: "slide", label: "滑梯" }, { value: "people", label: "人物" }, { value: "swimmer", label: "湖水人物" }] },
      { key: "p1Color", label: "① 插画主色", type: "color", default: "#E8624B" },
      { key: "p1Poster", label: "① 原始单页（可替换）", type: "image", default: "assets/inspirations/62-design-moro-lineart.png" },
      { key: "p1Art", label: "① 插画图片（可选）", type: "image", default: "", fx: "pop-sticker" },
      { key: "p2Bg", label: "② Street Party 背景", type: "color", default: "#F7F7F4" },
      { key: "p2Mode", label: "② 内容模式", type: "select", default: "redraw", options: [{ value: "redraw", label: "参数化重绘（推荐）" }, { value: "originals", label: "原始单页素材" }] },
      { key: "p2Tag", label: "② 眉题", type: "text", default: "53 STREET PARTY" },
      { key: "p2Title", label: "② 标题", type: "textarea", default: "100 Possibilities" },
      { key: "p2Sub", label: "② 副标题", type: "textarea", default: "in the Vicinity" },
      { key: "p2Caption", label: "② 活动信息", type: "textarea", default: "街区市集 · slowtalk · 工作坊" },
      { key: "p2Shape", label: "② 插画形状", type: "select", default: "people", options: [{ value: "people", label: "模糊人物" }, { value: "slide", label: "滑梯" }, { value: "swimmer", label: "运动人物" }, { value: "tent", label: "帐篷" }] },
      { key: "p2Color", label: "② 插画主色", type: "color", default: "#1F9DE4" },
      { key: "p2Poster", label: "② 原始单页（可替换）", type: "image", default: "assets/inspirations/63-street-party-blur.png" },
      { key: "p2Art", label: "② 插画图片（可选）", type: "image", default: "", fx: "pop-sticker" },
      { key: "p3Bg", label: "③ Recharge 背景", type: "color", default: "#F8F8F6" },
      { key: "p3Mode", label: "③ 内容模式", type: "select", default: "redraw", options: [{ value: "redraw", label: "参数化重绘（推荐）" }, { value: "originals", label: "原始单页素材" }] },
      { key: "p3Tag", label: "③ 眉题", type: "text", default: "PLAN : POOOD" },
      { key: "p3Title", label: "③ 标题", type: "textarea", default: "Time to 按需\nplay, 嬉戏, recharge" },
      { key: "p3Sub", label: "③ 副标题", type: "textarea", default: "the 呼吸. day." },
      { key: "p3Caption", label: "③ 活动信息", type: "textarea", default: "市集 · 分享会 · workshop" },
      { key: "p3Shape", label: "③ 插画形状", type: "select", default: "chairs", options: [{ value: "chairs", label: "椅子组" }, { value: "people", label: "人物组" }, { value: "tent", label: "帐篷" }, { value: "slide", label: "滑梯" }] },
      { key: "p3Color", label: "③ 插画主色", type: "color", default: "#E48AB7" },
      { key: "p3Poster", label: "③ 原始单页（可替换）", type: "image", default: "assets/inspirations/64-recharge-playful-type.png" },
      { key: "p3Art", label: "③ 插画图片（可选）", type: "image", default: "", fx: "pop-sticker" },
      { key: "p4Bg", label: "④ 湖集背景", type: "color", default: "#F3F3F0" },
      { key: "p4Mode", label: "④ 内容模式", type: "select", default: "redraw", options: [{ value: "redraw", label: "参数化重绘（推荐）" }, { value: "originals", label: "原始单页素材" }] },
      { key: "p4Tag", label: "④ 眉题", type: "text", default: "湖集 HU FAIR" },
      { key: "p4Title", label: "④ 标题", type: "textarea", default: "在湖集\n划个水" },
      { key: "p4Sub", label: "④ 副标题", type: "textarea", default: "At the lake\ndraw a water" },
      { key: "p4Caption", label: "④ 活动信息", type: "textarea", default: "Lake water · music · alcohol" },
      { key: "p4Shape", label: "④ 插画形状", type: "select", default: "swimmer", options: [{ value: "swimmer", label: "游泳人物" }, { value: "people", label: "人物组" }, { value: "slide", label: "滑板" }, { value: "tent", label: "帐篷" }] },
      { key: "p4Color", label: "④ 插画主色", type: "color", default: "#18A7DD" },
      { key: "p4Poster", label: "④ 原始单页（可替换）", type: "image", default: "assets/inspirations/65-lake-fair-lineart.png" },
      { key: "p4Art", label: "④ 插画图片（可选）", type: "image", default: "", fx: "pop-sticker" },
      { key: "meta", label: "总览脚注", type: "text", default: "POSTER LAB / LINE EVENT SERIES / 2026" },
    ],
    render: (v) => {
      if (v.replicaMode !== "editable" && v.referenceImage) return referenceCanvas(v.referenceImage, "#BDBDBD");
      const n = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
      const gap = Math.min(Math.max(n(v.gap, 12), 0), 28);
      const panelW = (750 - gap * 3) / 2;
      const panelH = (1000 - gap * 3 - 28) / 2;
      const artSvg = (shape, color) => {
        const common = `stroke="#111" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
        if (shape === "tent") return `<svg viewBox="0 0 220 170" aria-hidden="true"><polygon points="18,142 104,18 205,142" fill="${color}" ${common}/><path d="M104 18 L120 142 M62 83 L155 102 M98 69 L134 88" fill="none" ${common}/></svg>`;
        if (shape === "slide") return `<svg viewBox="0 0 220 170" aria-hidden="true"><path d="M38 135h150L151 36h-36c-20 64-35 88-77 99Z" fill="${color}" ${common}/><path d="M77 92c39-7 54-31 62-56M151 36v99" fill="none" ${common}/></svg>`;
        if (shape === "chairs") return `<svg viewBox="0 0 220 170" aria-hidden="true"><g fill="${color}" ${common}><path d="M16 64h37v64H16zM26 32h25v32H26zM65 78h36v50H65zM73 45h22v33H73zM118 61h38v67h-38zM127 28h22v33h-22zM166 76h38v52h-38zM175 42h21v34h-21z"/></g></svg>`;
        if (shape === "swimmer") return `<svg viewBox="0 0 220 170" aria-hidden="true"><circle cx="146" cy="62" r="21" fill="${color}" ${common}/><path d="M128 78c-35 7-60 27-78 48m79-42c-20 31-31 50-53 65m66-67c18 12 28 21 50 26" fill="none" ${common}/><ellipse cx="135" cy="116" rx="73" ry="35" fill="${color}" opacity=".55" ${common}/></svg>`;
        return `<svg viewBox="0 0 220 170" aria-hidden="true"><g fill="${color}" ${common}><circle cx="70" cy="55" r="18"/><circle cx="136" cy="45" r="18"/><path d="M55 78l-20 60h44l-4-43 32 43h39l-22-60z"/><path d="M122 67l-18 74h45l2-73z"/></g></svg>`;
      };
      const panel = (index, x, y) => {
        const bg = v[`p${index}Bg`] || "#fff";
        const poster = v[`p${index}Poster`];
        const panelMode = v[`p${index}Mode`] || v.panelMode || "redraw";
        if (panelMode !== "redraw" && poster) {
          return `<section style="position:absolute;left:${x}px;top:${y}px;width:${panelW}px;height:${panelH}px;background:#F7F7F4;overflow:hidden;">
            <img src="${poster}" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" />
          </section>`;
        }
        const title = String(v[`p${index}Title`] || "").split("\n").map((line) => `<div>${rich(line)}</div>`).join("");
        const sub = String(v[`p${index}Sub`] || "").split("\n").map((line) => `<div>${rich(line)}</div>`).join("");
        const art = v[`p${index}Art`]
          ? `<img src="${v[`p${index}Art`]}" style="position:absolute;left:8%;top:27%;width:84%;height:42%;object-fit:contain;filter:saturate(135%) contrast(112%);" />`
          : `<div style="position:absolute;left:8%;top:28%;width:84%;height:39%;display:flex;align-items:center;justify-content:center;">${artSvg(v[`p${index}Shape`], v[`p${index}Color`])}</div>`;
        return `<section style="position:absolute;left:${x}px;top:${y}px;width:${panelW}px;height:${panelH}px;background:${bg};overflow:hidden;color:${v.ink || "#111"};font-family:Helvetica,Arial,sans-serif;">
          <div style="position:absolute;top:16px;left:18px;right:18px;font-size:10px;letter-spacing:1.7px;font-weight:700;">${esc(v[`p${index}Tag`])}</div>
          <div style="position:absolute;top:42px;left:18px;right:16px;font-size:${index === 2 ? 22 : 25}px;font-weight:700;line-height:1.02;letter-spacing:-.5px;">${title}</div>
          ${art}
          <div style="position:absolute;left:18px;right:18px;bottom:52px;font-size:10px;line-height:1.35;white-space:pre-wrap;">${esc(v[`p${index}Caption`])}</div>
          <div style="position:absolute;left:18px;right:18px;bottom:16px;font-size:13px;line-height:1.04;font-weight:700;white-space:pre-wrap;">${sub}</div>
          <div style="position:absolute;right:12px;bottom:10px;font-size:8px;letter-spacing:1px;opacity:.55;">0${index}</div>
        </section>`;
      };
      return `<div style="position:absolute;inset:0;background:${v.bg || "#ddd"};overflow:hidden;">
        ${panel(1, gap, gap)}
        ${panel(2, gap * 2 + panelW, gap)}
        ${panel(3, gap, gap * 2 + panelH)}
        ${panel(4, gap * 2 + panelW, gap * 2 + panelH)}
        <div style="position:absolute;left:0;right:0;bottom:0;height:28px;display:flex;align-items:center;justify-content:center;font:9px/1 'Space Mono',ui-monospace,monospace;letter-spacing:2px;color:#555;">${esc(v.meta)}</div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "crossover-variant-poster",
    name: "CROSS OVER 配色海报",
    styleId: "minimal-editorial",
    desc: "固定构图 + 多色预设：右上图形卡、左下细体标题、下半几何酒杯；所有文字、图像和色彩均可编辑",
    recommend: "音乐/展览系列海报 · 一套骨架快速生成多张配色变体",
    presets: [
      { id: "crossover-white", name: "复刻 · 白棕版", ref: "67-crossover-spring-white.png", values: { bg: "#FBFBF9", lowerBg: "#4A382C", titleColor: "#9AA9D2", cardBg: "#A7B4D8", cardColor: "#BE163A", lowerInk: "#C7BFE5", drinkColor: "#9AA9D2", accent: "#F49CAF", layout: "top-right" } },
      { id: "crossover-blue", name: "复刻 · 蓝靛版", ref: "68-crossover-spring-blue.png", values: { bg: "#2098DF", lowerBg: "#0E1426", titleColor: "#F5F1D9", cardBg: "#F0EEDC", cardColor: "#8F8F96", lowerInk: "#F5F1D9", drinkColor: "#F5F1D9", accent: "#FF1838", layout: "top-right" } },
      { id: "crossover-cyan", name: "复刻 · 青粉版", ref: "69-crossover-spring-cyan.png", values: { bg: "#7DBFC9", lowerBg: "#33231F", titleColor: "#F7B8E1", cardBg: "#F5BDE5", cardColor: "#4C786C", lowerInk: "#F7B8E1", drinkColor: "#F7B8E1", accent: "#F50E37", layout: "top-right" } },
      { id: "crossover-pink", name: "复刻 · 粉绿版", ref: "70-crossover-spring-pink.png", values: { bg: "#F7D6DE", lowerBg: "#2B211F", titleColor: "#71865B", cardBg: "#71865B", cardColor: "#91A9B7", lowerInk: "#71865B", drinkColor: "#71865B", accent: "#FF1A39", layout: "top-right" } },
    ],
    fields: [
      { key: "bg", label: "上半背景色", type: "color", default: "#FBFBF9" },
      { key: "lowerBg", label: "下半背景色", type: "color", default: "#4A382C" },
      { key: "upperH", label: "上半高度", type: "range", default: "650", min: 520, max: 760 },
      { key: "topline", label: "顶部小标题", type: "text", default: "CROSS OVER" },
      { key: "title", label: "主标题（换行）", type: "textarea", default: "SPRING\nIS NOT FAR AWAY" },
      { key: "titleColor", label: "主标题色", type: "color", default: "#9AA9D2" },
      { key: "titleSize", label: "主标题字号", type: "range", default: "58", min: 34, max: 84 },
      { key: "cardBg", label: "右上卡片底色", type: "color", default: "#A7B4D8" },
      { key: "cardColor", label: "右上图形色", type: "color", default: "#BE163A" },
      { key: "cardShape", label: "右上图形", type: "select", default: "blob-clock", options: [{ value: "blob-clock", label: "有机时钟" }, { value: "circle", label: "圆形图案" }, { value: "square", label: "几何方块" }] },
      { key: "heroImage", label: "右上图形图片（可选）", type: "image", default: "", fx: "pop-sticker" },
      { key: "lowerInk", label: "下半小字色", type: "color", default: "#C7BFE5" },
      { key: "drinkColor", label: "酒杯几何色", type: "color", default: "#9AA9D2" },
      { key: "drinkAccent", label: "酒杯圆点色", type: "color", default: "#F49CAF" },
      { key: "lowerQuote", label: "下半左侧短句", type: "textarea", default: "If I must fall then let me fall\nThe person I'm meant to become\nwill surely catch me" },
      { key: "lowerLeft", label: "下半左下小字", type: "text", default: "Tomorrow Will Be Alright" },
      { key: "lowerRight", label: "下半右侧小字", type: "text", default: "一定会接住我" },
      { key: "lowerBottom", label: "下半右下小字", type: "text", default: "我会成为的那个人" },
      { key: "accent", label: "星号/点缀色", type: "color", default: "#F49CAF" },
      { key: "detailImage", label: "下半附加图（可选）", type: "image", default: "", fx: "duotone-print" },
      { key: "layout", label: "构图方向", type: "select", default: "top-right", options: [{ value: "top-right", label: "右上卡片" }, { value: "top-left", label: "左上卡片" }] },
    ],
    render: (v) => {
      const upperH = Math.min(Math.max(Number(v.upperH) || 650, 520), 760);
      const titleLines = String(v.title || "").split("\n").map((line) => `<div>${rich(line)}</div>`).join("");
      const quoteLines = String(v.lowerQuote || "").split("\n").map((line) => `<div>${rich(line)}</div>`).join("");
      const cardX = v.layout === "top-left" ? 52 : 556;
      const card = v.heroImage
        ? `<img src="${v.heroImage}" style="width:100%;height:100%;object-fit:cover;filter:saturate(130%) contrast(112%);" />`
        : `<svg viewBox="0 0 160 200" width="100%" height="100%"><path d="M82 20c45-3 67 33 59 72-8 40-37 85-78 85-33 0-58-29-53-65 4-29 36-89 72-92Z" fill="${v.cardColor}"/><g fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"><path d="M80 63v65M59 98h48M43 68l20 8M119 70l-18 9M51 133l14-11M113 135l-14-12"/><path d="M53 52l8 12M110 48l-8 14"/></g><circle cx="53" cy="88" r="11" fill="${v.accent}"/><circle cx="115" cy="88" r="11" fill="${v.accent}"/></svg>`;
      const drink = `<svg viewBox="0 0 750 260" width="100%" height="260" preserveAspectRatio="none"><path d="M65 35h620L470 107 393 150v74h-36v-74l-77-43Z" fill="none" stroke="${v.drinkColor}" stroke-width="16" stroke-linejoin="round"/><ellipse cx="375" cy="89" rx="186" ry="27" fill="${v.drinkColor}" opacity=".25"/><circle cx="302" cy="77" r="25" fill="${v.drinkAccent}"/><circle cx="375" cy="211" r="24" fill="${v.drinkColor}"/></svg>`;
      return `<div style="position:absolute;inset:0;background:${v.bg};overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
        <div style="position:absolute;left:0;right:0;top:0;height:${upperH}px;background:${v.bg};">
          <div style="position:absolute;top:22px;left:0;right:0;text-align:center;font-size:24px;line-height:1;color:${v.titleColor};font-weight:300;letter-spacing:-1px;">${esc(v.topline)}</div>
          <div style="position:absolute;left:${v.layout === "top-left" ? 270 : 36}px;bottom:48px;color:${v.titleColor};font-size:${Number(v.titleSize) || 58}px;font-weight:300;line-height:.88;letter-spacing:-3px;">${titleLines}</div>
          <div style="position:absolute;left:${cardX}px;top:26px;width:142px;height:184px;background:${v.cardBg};padding:13px;box-sizing:border-box;">${card}</div>
          <div style="position:absolute;left:${v.layout === "top-left" ? 556 : 38}px;bottom:238px;font-size:22px;color:${v.accent};letter-spacing:8px;">✳</div>
        </div>
        <div style="position:absolute;left:0;right:0;top:${upperH}px;bottom:0;background:${v.lowerBg};color:${v.lowerInk};overflow:hidden;">
          ${drink}
          ${v.detailImage ? `<img src="${v.detailImage}" style="position:absolute;left:46%;top:28px;width:112px;height:112px;object-fit:contain;mix-blend-mode:screen;" />` : ""}
          <div style="position:absolute;left:26px;top:130px;font-size:13px;line-height:1.22;">${quoteLines}</div>
          <div style="position:absolute;left:26px;bottom:28px;font-size:13px;">${esc(v.lowerLeft)}</div>
          <div style="position:absolute;right:26px;top:148px;font-size:14px;">${esc(v.lowerRight)}</div>
          <div style="position:absolute;right:42px;bottom:28px;font-size:13px;">${esc(v.lowerBottom)} <span style="color:${v.accent};font-size:24px;">✳</span></div>
        </div>
      </div>`;
    },
  },

  // ------------------------------------------------------------------
  {
    id: "photo-callout-zoom",
    name: "照片荧光放大标注",
    styleId: "photo-text",
    desc: "失焦照片 + 局部双色处理 + 荧光连线。背景图、放大图、位置、比例、模糊和颗粒都可调",
    recommend: "摄影观察海报 / 展览研究卡 · 适合把一个细节从环境里拉出来",
    presets: [
      { id: "callout-skeleton", name: "复刻 · 骨骼粉卡", ref: "72-photo-callout-skeleton.png", values: { layout: "top-right", bg: "#F6F4F0", accent: "#FFF000", cardBg: "#F36BC8", photoTint: "#6F6C60", detailTint: "#FFF000", blur: "10", grain: "22", lineWidth: "3", title: "SPECIMEN / SKELETON" } },
      { id: "callout-fish", name: "复刻 · 鱼群黄卡", ref: "73-photo-callout-fish.png", values: { layout: "bottom-left", bg: "#F6F4F0", accent: "#FFF000", cardBg: "#FFD500", photoTint: "#6F6C60", detailTint: "#FF63D1", blur: "10", grain: "22", lineWidth: "3", title: "SPECIMEN / FISH" } },
    ],
    fields: [
      { key: "photo", label: "背景照片", type: "image", default: "", fx: "duotone-print" },
      { key: "detailImage", label: "局部放大图", type: "image", default: "", fx: "duotone-print" },
      { key: "bg", label: "外圈纸张色", type: "color", default: "#F6F4F0" },
      { key: "photoTint", label: "背景双色暗部", type: "color", default: "#6F6C60" },
      { key: "detailTint", label: "放大图双色亮部", type: "color", default: "#FFF000" },
      { key: "cardBg", label: "放大卡底色", type: "color", default: "#F36BC8" },
      { key: "accent", label: "连线/框线颜色", type: "color", default: "#FFF000" },
      { key: "layout", label: "放大卡位置", type: "select", default: "top-right", options: [{ value: "top-right", label: "右上" }, { value: "bottom-left", label: "左下" }] },
      { key: "cardSize", label: "放大卡尺寸", type: "range", default: "210", min: 130, max: 300 },
      { key: "sourceX", label: "原图取景点 X", type: "range", default: "64", min: 10, max: 90 },
      { key: "sourceY", label: "原图取景点 Y", type: "range", default: "56", min: 10, max: 90 },
      { key: "blur", label: "背景模糊", type: "range", default: "10", min: 0, max: 28 },
      { key: "grain", label: "照片颗粒", type: "range", default: "22", min: 0, max: 70 },
      { key: "lineWidth", label: "连线宽度", type: "range", default: "3", min: 1, max: 8 },
      { key: "title", label: "顶部小标题", type: "text", default: "SPECIMEN / DETAIL STUDY" },
      { key: "caption", label: "底部说明", type: "text", default: "OBSERVATION 01 · 2026" },
    ],
    render: (v) => {
      const cardSize = Math.min(Math.max(Number(v.cardSize) || 210, 130), 300);
      const topRight = v.layout !== "bottom-left";
      // 照片内框实际是 530×760，所有标注坐标都在这个局部坐标系中计算，
      // 避免把放大卡按外层 750×1000 坐标推到照片区域之外。
      const innerW = 530;
      const innerH = 760;
      const cardX = topRight ? innerW - cardSize - 34 : 34;
      const cardY = topRight ? 54 : innerH - cardSize - 74;
      const srcX = Math.round(((Number(v.sourceX) || 64) / 100) * innerW);
      const srcY = Math.round(((Number(v.sourceY) || 56) / 100) * innerH);
      const lineEndX = topRight ? cardX : cardX + cardSize;
      const lineEndY = topRight ? cardY + cardSize : cardY;
      const bgImg = v.photo
        ? `<img src="${v.photo}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(${Number(v.blur) || 0}px) saturate(62%) contrast(92%);transform:scale(1.04);" />`
        : `<div style="position:absolute;inset:0;background:radial-gradient(circle at 72% 38%,${v.photoTint || "#B4B1A3"} 0 18%,transparent 19%),linear-gradient(115deg,#D17EA4 0 27%,${v.photoTint || "#8D897C"} 28% 64%,#506C4D 65%);filter:blur(${Number(v.blur) || 0}px);transform:scale(1.04);"></div>`;
      const detail = v.detailImage
        ? `<img src="${v.detailImage}" style="width:100%;height:100%;object-fit:contain;filter:saturate(145%) contrast(118%);mix-blend-mode:multiply;" />`
        : `<div style="width:76%;height:76%;margin:12%;border:4px solid ${v.detailTint};border-radius:35% 45% 38% 42%;transform:rotate(-8deg);"></div>`;
      return `<div style="position:absolute;inset:0;background:${v.bg};font-family:Helvetica,Arial,sans-serif;overflow:hidden;">
        <div style="position:absolute;left:110px;top:78px;width:530px;height:760px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.25);">
          ${bgImg}
          <div style="position:absolute;inset:0;background:${v.photoTint || "#6F6C60"};opacity:.12;mix-blend-mode:color;"></div>
          <div style="position:absolute;inset:0;background:radial-gradient(rgba(255,255,255,.18) 1px,transparent 1px);background-size:5px 5px;opacity:${(Number(v.grain) || 0) / 100};mix-blend-mode:screen;"></div>
          <svg viewBox="0 0 ${innerW} ${innerH}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"><rect x="${srcX - 12}" y="${srcY - 12}" width="24" height="24" fill="none" stroke="${v.accent}" stroke-width="${Number(v.lineWidth) || 3}"/><path d="M${srcX} ${srcY} L${lineEndX} ${lineEndY} M${srcX + 24} ${srcY + 22} L${lineEndX + (topRight ? 0 : -cardSize)} ${lineEndY + (topRight ? cardSize : 0)}" fill="none" stroke="${v.accent}" stroke-width="${Number(v.lineWidth) || 3}"/></svg>
          <div style="position:absolute;left:${topRight ? 355 : 18}px;top:${topRight ? 26 : 708}px;color:${v.accent};font-size:11px;letter-spacing:2px;">${esc(v.title)}</div>
          <div style="position:absolute;left:${topRight ? Math.max(18, cardX - 110) : 18}px;top:${topRight ? cardY + cardSize + 24 : cardY + cardSize + 14}px;color:${v.accent};font:10px/1.4 'Space Mono',ui-monospace,monospace;">${esc(v.caption)}</div>
          <div style="position:absolute;left:${cardX}px;top:${cardY}px;width:${cardSize}px;height:${cardSize}px;background:${v.cardBg};overflow:hidden;">${detail}</div>
        </div>
      </div>`;
    },
  },
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
