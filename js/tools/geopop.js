import {
  makeCanvas, loadImageUrl, imageToCanvas, segmentSubjects, subjectCutout,
  buildControls, panelSection, injectStyle, enableDrag, downloadCanvasPNG, clamp,
} from './shared.js';
import { PALETTES, allocateCounts, createLayout, copyFromCaption } from './geopop-layout.js';

const W = 750, H = 1000;

function drawShape(ctx, item, colors, stroke) {
  const s = item.w;
  ctx.save();
  ctx.translate(item.x + s / 2, item.y + s / 2);
  ctx.rotate(item.rotation);
  ctx.translate(-s / 2, -s / 2);
  ctx.fillStyle = colors[item.color % colors.length];
  ctx.strokeStyle = '#121212'; ctx.lineWidth = stroke; ctx.lineJoin = 'miter';
  ctx.beginPath();
  switch (item.kind) {
    case 'circle': ctx.arc(s/2, s/2, s/2, 0, Math.PI*2); break;
    case 'ring':
      ctx.arc(s/2, s/2, s/2, 0, Math.PI*2);
      ctx.moveTo(s*.75, s/2); ctx.arc(s/2, s/2, s*.25, 0, Math.PI*2, true); break;
    case 'semi': ctx.arc(s/2, s*.72, s/2, Math.PI, Math.PI*2); ctx.closePath(); break;
    case 'triangle': ctx.moveTo(s/2, 0); ctx.lineTo(s, s); ctx.lineTo(0, s); ctx.closePath(); break;
    case 'zigzag':
      [[0,.15],[.70,0],[.50,.43],[1,.27],[.46,1],[.60,.58],[.08,.78],[.34,.32]].forEach(([x,y], i) =>
        i ? ctx.lineTo(x*s,y*s) : ctx.moveTo(x*s,y*s)); ctx.closePath(); break;
    case 'star':
      for (let i = 0; i < 24; i++) { const a = i*Math.PI/12, r = s*(i%2 ? .26 : .5);
        const x=s/2+Math.cos(a)*r,y=s/2+Math.sin(a)*r; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
      ctx.closePath(); break;
    case 'dots':
      for (let y=0;y<5;y++) for (let x=0;x<5;x++) { ctx.moveTo(x*s/5+s*.038,y*s/5); ctx.arc(x*s/5,y*s/5,s*.038,0,Math.PI*2); }
      ctx.fill(); ctx.restore(); return;
    default: ctx.rect(0,0,s,s);
  }
  ctx.fill(); if (stroke) ctx.stroke();
  if (item.kind === 'grid') {
    ctx.lineWidth = Math.max(1, stroke*.5);
    ctx.beginPath();
    for(let i=1;i<5;i++) { ctx.moveTo(s*i/5,0);ctx.lineTo(s*i/5,s);ctx.moveTo(0,s*i/5);ctx.lineTo(s,s*i/5); }
    ctx.stroke();
  }
  if (item.kind === 'checker') {
    for(let y=0;y<4;y++) for(let x=0;x<4;x++) { ctx.fillStyle = (x+y)%2 ? '#fff' : '#111';ctx.fillRect(x*s/4,y*s/4,s/4,s/4); }
    if (stroke) ctx.strokeRect(0,0,s,s);
  }
  ctx.restore();
}

// Code-native illustration with a known alpha layer, so the first render needs
// neither downloads nor an invented model result. Photos always use inference.
function demoImage() {
  const foreground = makeCanvas(W,H), c = foreground.getContext('2d');
  const body = new Path2D('M330 859 C240 798 253 627 306 493 C340 402 350 249 360 161 C365 102 392 94 414 123 C441 158 416 207 407 265 C398 374 420 456 450 548 C510 691 500 814 427 867 Z');
  const gradient = c.createLinearGradient(260,0,477,0);
  gradient.addColorStop(0,'#babbb1');gradient.addColorStop(.46,'#fffef3');gradient.addColorStop(1,'#d7d9cd');
  c.fillStyle=gradient;c.fill(body);c.strokeStyle='#b8bcb0';c.lineWidth=2;c.stroke(body);
  c.fillStyle='#d98221';
  for (const path of ['M364 164 Q403 160 424 181 L408 206 Q389 210 364 199 Z',
    'M333 841 L355 902 L304 927 L377 923 L365 846 Z','M409 842 L414 907 L469 925 L396 924 L389 850 Z']) c.fill(new Path2D(path));
  c.fillStyle='#151a18';c.beginPath();c.ellipse(398,144,4,6,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#b7baae';c.lineWidth=2;
  c.stroke(new Path2D('M310 535 C283 666 296 760 335 797 M447 574 C473 691 454 766 427 804'));
  const source=makeCanvas(W,H),ctx=source.getContext('2d');
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#d4d5cf');bg.addColorStop(1,'#aeb4b0');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#c3c8c2';ctx.fillRect(0,750,W,250);
  ctx.save();ctx.filter='blur(22px)';ctx.fillStyle='#69736b88';ctx.beginPath();ctx.ellipse(374,918,150,21,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.drawImage(foreground,0,0);
  return { source, foreground };
}

function wrapLines(ctx, text, width) {
  const lines=[];
  for (const para of String(text).split('\n')) {
    let line='';
    for(const word of para.match(/[A-Za-z0-9'’.,!?-]+\s*|[^\x00-\x7F]|\s+|./g)||[]) {
      if(line && ctx.measureText(line+word).width>width) { lines.push(line.trim());line=''; }
      for(const ch of word) {
        if(line && ctx.measureText(line+ch).width>width) {lines.push(line.trim());line='';}
        line+=ch;
      }
    }
    lines.push(line.trim());
  }
  return lines;
}

export default {
  id:'geopop', name:'几何撞色', nameEn:'Geometry Pop',
  desc:'自动抠出前景，把撞色几何放到主体背后。调节大中小占比，随机配色与布局，识图生成标题文案。',
  tags:['自动抠图','大小对比','随机布局','识图文案'],
  cover:`<svg viewBox="0 0 120 84" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="84" fill="#e5e6e9"/><rect x="22" y="8" width="77" height="71" fill="#b9bdb9"/><circle cx="36" cy="25" r="20" fill="#02eb61" stroke="#111"/><circle cx="36" cy="25" r="10" fill="#b9bdb9" stroke="#111"/><path d="M72 8 112 26 96 41 84 32 89 65 68 60Z" fill="#ff551d" stroke="#111"/><rect x="11" y="47" width="35" height="19" fill="#0347ff" stroke="#111"/><text x="14" y="61" font-size="12" font-weight="900" fill="#fff044">POP</text><path d="M54 72Q41 62 51 40L57 12Q63 5 67 14L64 38Q78 64 67 72Z" fill="#fffdec" stroke="#a4ab9f"/><path d="M60 17 71 19 65 23 60 22Z" fill="#e48522"/><circle cx="64" cy="14" r="1.2" fill="#111"/></svg>`,

  mount(container, options={}) {
    injectStyle('geopop', `
      .gp-stage {flex-direction:column;align-items:center;gap:12px;position:sticky;top:76px;}
      .gp-stage canvas {width:auto;max-width:100%;max-height:calc(100vh - 180px);touch-action:none;cursor:grab;box-shadow:0 6px 28px #0002;}
      .gp-stage canvas.gp-brush {cursor:crosshair;}
      .gp-caption {font:11px/1.5 var(--mono);color:var(--text-3);text-align:center;}
      .gp-status {font-size:12px;line-height:1.6;padding:8px 10px;background:var(--bg-3);border-radius:8px;margin:8px 0;overflow-wrap:anywhere;}
      .gp-status[data-error=true] {color:#ac381c;background:#fff0e8;}
      .gp-ratios {font-size:12px;line-height:1.7;color:var(--accent);margin-bottom:12px;}
      .gp-colors {display:flex;gap:5px;margin-bottom:12px;}
      .gp-colors span {height:19px;flex:1;border:1px solid #1112;}
      .gp-panel .tc-btn:disabled {opacity:.5;cursor:wait;}
      @media(max-width:900px){.gp-stage{position:static;grid-row:1}.gp-panel{position:static;max-height:none}.gp-stage canvas{max-height:65vh}}
    `);
    container.innerHTML='<div class="gp-panel"></div><div class="tool-stage gp-stage"></div>';
    const panel=container.querySelector('.gp-panel'),stage=container.querySelector('.gp-stage');
    const canvas=makeCanvas(W,H);
    canvas.setAttribute('aria-label','几何撞色海报预览，可拖动几何元素');
    const foot=document.createElement('div');foot.className='gp-caption';foot.textContent='750 × 1000 · 拖动几何元素微调位置';stage.append(canvas,foot);
    const v={seed:42,count:9,large:25,medium:45,small:30,family:'mixed',margin:7,photo:true,
      paper:'#e6e7ea',stroke:3,title:'GOOSE\nPOISE',body:'A study in quiet poise. Sculptural curves meet electric colour, turning an everyday silhouette into a graphic moment.',
      textX:8,textY:68,textSize:44,textWidth:44,textFront:false,showText:true,brush:'off',brushSize:22,view:'poster'};
    let {source,foreground}=demoImage();
    let colors=[...PALETTES[0]],items=[],worker=null,timer=null,destroyed=false,version=0,copyVersion=0;
    let maskBackup=null,painting=false,lastPoint=null,loadUrl=null;
    const mask=makeCanvas(source.width,source.height);
    function setMaskFromCutout(cutout) {mask.width=source.width;mask.height=source.height;const m=mask.getContext('2d');m.drawImage(cutout,0,0,mask.width,mask.height);m.globalCompositeOperation='source-in';m.fillStyle='#fff';m.fillRect(0,0,mask.width,mask.height);m.globalCompositeOperation='source-over';}
    setMaskFromCutout(foreground);
    function updateForeground() {
      foreground=makeCanvas(source.width,source.height);const f=foreground.getContext('2d');
      const pixels=source.getContext('2d').getImageData(0,0,source.width,source.height);
      const alpha=mask.getContext('2d').getImageData(0,0,mask.width,mask.height).data;
      for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=Math.min(pixels.data[i],alpha[i]);
      f.putImageData(pixels,0,0);
    }
    const rect=()=>{const pad=W*v.margin/100,scale=Math.min((W-pad*2)/source.width,(H-pad*2)/source.height);return{x:(W-source.width*scale)/2,y:(H-source.height*scale)/2,w:source.width*scale,h:source.height*scale};};
    function titleBlock(ctx) {
      if(!v.showText)return;
      const x=W*v.textX/100,y=H*v.textY/100,width=Math.min(W*v.textWidth/100,W-x-12);
      let fs=v.textSize;
      const lines=v.title.split('\n').slice(0,3);
      ctx.font=`900 ${fs}px Arial, "PingFang SC", sans-serif`;
      const longest=Math.max(1,...lines.map(t=>ctx.measureText(t).width));
      fs=Math.min(fs,(width-16)/longest*fs,(H-y-20)/Math.max(1,lines.length)/1.12);
      ctx.font=`900 ${fs}px Arial, "PingFang SC", sans-serif`;ctx.textBaseline='top';
      const lh=fs*1.12;
      const brightness=color=>{const n=parseInt(color.slice(1),16);return ((n>>16)&255)*.2126+((n>>8)&255)*.7152+(n&255)*.0722;};
      const sorted=[...colors].sort((a,b)=>brightness(a)-brightness(b));
      lines.forEach((line,i)=>{const w=ctx.measureText(line).width+16;ctx.fillStyle=sorted[0];ctx.fillRect(x,y+i*lh,w,lh);ctx.strokeStyle='#111';ctx.lineWidth=v.stroke; if(v.stroke)ctx.strokeRect(x,y+i*lh,w,lh);ctx.fillStyle=sorted.at(-1);ctx.fillText(line,x+8,y+i*lh+2);});
      ctx.font='12px Arial, "PingFang SC", sans-serif';
      const bodyLines=wrapLines(ctx,v.body,width-14);const by=y+lines.length*lh+10;
      const visible=bodyLines.slice(0,Math.max(0,Math.min(7,Math.floor((H-by-15)/16))));
      if(visible.length<bodyLines.length && visible.length) visible[visible.length-1]=visible.at(-1).slice(0,-2)+'…';
      if(visible.length) {ctx.fillStyle='#e6e7eaed';ctx.fillRect(x-4,by-4,width+4,visible.length*16+8);ctx.fillStyle='#111';visible.forEach((line,i)=>ctx.fillText(line,x+3,by+i*16));}
    }
    function renderTo(target) {
      if(destroyed)return;
      const ctx=target.getContext('2d');ctx.setTransform(target.width/W,0,0,target.height/H,0,0);
      ctx.clearRect(0,0,W,H);ctx.fillStyle=v.paper;ctx.fillRect(0,0,W,H);
      const r=rect();
      if(v.view==='mask') {ctx.fillStyle='#202126';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.drawImage(mask,r.x,r.y,r.w,r.h);return;}
      if(v.photo)ctx.drawImage(source,r.x,r.y,r.w,r.h);
      items.forEach(it=>drawShape(ctx,it,colors,v.stroke));
      if(!v.textFront)titleBlock(ctx);
      if(foreground)ctx.drawImage(foreground,r.x,r.y,r.w,r.h);
      if(v.textFront)titleBlock(ctx);
    }
    function draw() {renderTo(canvas);}
    function layout() {
      items=createLayout(v).map(it=>({...it,x:it.x*W-it.w*W/2,y:it.y*H-it.w*W/2,w:it.w*W,h:it.w*W}));
      const counts=allocateCounts(v.count,[v.large,v.medium,v.small]);
      const sum=v.large+v.medium+v.small;
      ratios.textContent=sum ? `实际分配：大 ${counts[0]} · 中 ${counts[1]} · 小 ${counts[2]}（共 ${items.length} 个）` : '三个权重都为 0：暂不显示几何元素';
      draw();
    }
    function palette() {
      colors=[...PALETTES[Math.floor(Math.random()*PALETTES.length)]];
      const offset=1+Math.floor(Math.random()*6);colors=colors.slice(offset).concat(colors.slice(0,offset));
      swatches.replaceChildren(...colors.map(color=>{const s=document.createElement('span');s.style.background=color;return s;}));draw();
    }
    function status(el,text,error=false) {if(destroyed)return;el.textContent=text;el.dataset.error=String(error);}
    function stop() {worker?.terminate();worker=null;clearTimeout(timer);timer=null;buttons.cancel.disabled=true;}
    function fail(task,message) {
      if(task==='cutout'||task==='all')status(cutStatus,`抠图未完成：${message}。可重试、用简洁背景分离，或在轮廓视图手动修补。`,true);
      if(task==='caption'||task==='all')status(copyStatus,`内容识别未完成：${message}。可重试或填写标题文案。`,true);
    }
    function analyze(tasks=['cutout','caption']) {
      if(worker&&tasks.length===1) {
        if(tasks[0]==='caption')status(cutStatus,foreground?'已保留当前前景':'抠图已停止，可重新自动抠图');
        else status(copyStatus,'已保留当前文案，可重新识图生成');
      }
      stop();
      const current=version,copyAtStart=copyVersion;
      let completed=new Set();
      try {worker=new Worker(new URL('./geopop-ai.worker.js',import.meta.url),{type:'module'});}
      catch(error){fail('all',error.message);return;}
      buttons.cancel.disabled=false;
      tasks.forEach(task=>status(task==='cutout'?cutStatus:copyStatus,task==='cutout'?'等待自动抠图…':'等待画面识别…'));
      const jobWorker=worker;
      const resetTimeout=()=>{clearTimeout(timer);timer=setTimeout(()=>{stop();tasks.filter(t=>!completed.has(t)).forEach(t=>fail(t,'模型加载或计算超时'));},180000);};
      resetTimeout();
      worker.onmessage=({data})=>{
        if(destroyed||version!==current||worker!==jobWorker)return;
        resetTimeout();
        if(data.type==='progress')status(data.task==='cutout'?cutStatus:copyStatus,data.text);
        if(data.type==='cutout') {
          const cut=makeCanvas(data.width,data.height);cut.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.pixels),data.width,data.height),0,0);
          setMaskFromCutout(cut);maskBackup=null;updateForeground();status(cutStatus,'前景已抠出 · 可用轮廓修补补回或擦除细节');completed.add('cutout');draw();
        }
        if(data.type==='caption') {
          completed.add('caption');status(copyStatus,`识别结果：${data.caption}`);
          if(copyAtStart===copyVersion){const copy=copyFromCaption(data.caption);v.title=copy.title;v.body=copy.body;textInputs.title.value=v.title;textInputs.body.value=v.body;draw();}
          else status(copyStatus,`识别结果：${data.caption}（已保留你正在编辑的文案）`);
        }
        if(data.type==='error'){completed.add(data.task);fail(data.task,data.message);}
        if(data.type==='done')stop();
      };
      worker.onerror=()=>{stop();tasks.filter(t=>!completed.has(t)).forEach(t=>fail(t,'无法加载识别组件，请检查网络后重试'));};
      const pixels=source.getContext('2d').getImageData(0,0,source.width,source.height).data;
      worker.postMessage({pixels,width:source.width,height:source.height,tasks},[pixels.buffer]);
    }
    async function load(url) {
      stop();const current=++version;
      status(cutStatus,'正在读取图片…');
      try {
        const img=await loadImageUrl(url);
        if(destroyed||current!==version)return;
        source=imageToCanvas(img,1400);foreground=null;mask.width=source.width;mask.height=source.height;maskBackup=null;
        v.title='';v.body='';textInputs.title.value='';textInputs.body.value='';copyVersion++;
        const alpha=source.getContext('2d').getImageData(0,0,source.width,source.height).data;
        let transparent=0;for(let i=3;i<alpha.length;i+=4)if(alpha[i]<245)transparent++;
        if(transparent>source.width*source.height*.01){setMaskFromCutout(source);updateForeground();status(cutStatus,'已使用图片自带的透明前景');analyze(['caption']);}
        else analyze();
        draw();
      }catch(error){if(current===version)status(cutStatus,`图片读取失败：${error.message}`,true);}
    }

    panelSection(panel,'01 / 素材与前景');
    buildControls(panel,[{type:'file',key:'upload',label:'上传照片',accept:'image/*'},
      {type:'info',label:'上传后自动抠图并生成英文文案。图片留在浏览器内；首次使用需联网下载模型，可能需要几分钟。'}],v,(key,files)=>{
      if(key==='upload'&&files?.[0]) {if(loadUrl)URL.revokeObjectURL(loadUrl);loadUrl=URL.createObjectURL(files[0]);load(loadUrl);}
    });
    const cutStatus=document.createElement('div'),copyStatus=document.createElement('div');
    [cutStatus,copyStatus].forEach(el=>{el.className='gp-status';el.setAttribute('role','status');});panel.append(cutStatus);
    status(cutStatus,'内置插画演示 · 前景已分层，上传照片体验自动抠图');
    const buttons=buildControls(panel,[
      {type:'button',key:'retry',label:'重新自动抠图',onClick:()=>analyze(['cutout'])},
      {type:'button',key:'cancel',label:'停止识别',onClick:()=>{stop();status(cutStatus,foreground?'已保留当前前景':'自动抠图已停止',!foreground);status(copyStatus,'识别已停止，可重试或手动编辑');}},
      {type:'button',label:'简洁背景快速分离',onClick:()=>{
        stop();const {subjects}=segmentSubjects(source,{threshold:55,minAreaRatio:.002,maxSubjects:20});
        const cut=makeCanvas(source.width,source.height),c=cut.getContext('2d');subjects.forEach(s=>c.drawImage(subjectCutout(source,s),s.x,s.y));setMaskFromCutout(cut);updateForeground();
        status(cutStatus,subjects.length?'已按背景色分离 · 适合纯色背景，请检查轮廓':'未找到前景，请使用自动抠图或手动修补',!subjects.length);draw();}},
    ],v,()=>{});buttons.cancel.disabled=true;
    buildControls(panel,[
      {type:'select',key:'view',label:'预览',options:[{value:'poster',label:'成品海报'},{value:'mask',label:'前景轮廓（白色保留）'}]},
      {type:'select',key:'brush',label:'轮廓修补',options:[{value:'off',label:'关闭 · 拖动几何元素'},{value:'add',label:'画笔 · 补回前景'},{value:'erase',label:'橡皮 · 擦除背景'}]},
      {type:'range',key:'brushSize',label:'画笔大小',min:4,max:100},
      {type:'button',label:'撤销上一笔',onClick:()=>{if(maskBackup){mask.getContext('2d').putImageData(maskBackup,0,0);maskBackup=null;updateForeground();draw();}}},
    ],v,()=>{canvas.classList.toggle('gp-brush',v.brush!=='off');draw();});

    panelSection(panel,'02 / 几何对比');
    buildControls(panel,[
      {type:'range',key:'count',label:'元素总数',min:1,max:24},
      {type:'range',key:'large',label:'大元素权重',min:0,max:100},
      {type:'range',key:'medium',label:'中元素权重',min:0,max:100},
      {type:'range',key:'small',label:'小元素权重',min:0,max:100},
      {type:'info',label:'按数量分配占比，三个权重自动归一。大元素约占画布宽 39–57%，中元素 19–29%，小元素 6.5–13%。'},
      {type:'select',key:'family',label:'几何元素',options:[{value:'mixed',label:'混合 · 波普拼贴'},{value:'round',label:'圆形 · 圆环与放射星'},{value:'angular',label:'折线 · 棋盘与网格'}]},
      {type:'range',key:'stroke',label:'黑色描边',min:0,max:8},
    ],v,(key)=>key==='stroke'?draw():layout());
    const ratios=document.createElement('div');ratios.className='gp-ratios';ratios.setAttribute('role','status');panel.append(ratios);
    buildControls(panel,[{type:'button',label:'↻ 随机布局',primary:true,onClick:()=>{v.seed=Math.floor(Math.random()*0xffffffff);layout();}},
      {type:'button',label:'↻ 随机配色',onClick:palette},
      {type:'button',label:'↻ 全部随机',onClick:()=>{v.seed=Math.floor(Math.random()*0xffffffff);palette();layout();}},
    ],v,()=>{});
    const swatches=document.createElement('div');swatches.className='gp-colors';panel.append(swatches);
    colors.forEach(color=>{const s=document.createElement('span');s.style.background=color;swatches.append(s);});

    panelSection(panel,'03 / 照片与画布');
    buildControls(panel,[{type:'checkbox',key:'photo',label:'保留原照片背景'},
      {type:'range',key:'margin',label:'照片留白',min:0,max:18},
      {type:'color',key:'paper',label:'画布底色'},
    ],v,draw);
    panelSection(panel,'04 / 标题与文案');panel.append(copyStatus);
    status(copyStatus,'演示文案 · 上传照片后根据画面自动生成，文字可直接修改');
    const textInputs=buildControls(panel,[
      {type:'button',label:'重新识图生成文案',onClick:()=>analyze(['caption'])},
      {type:'textarea',key:'title',label:'标题（最多三行）',rows:2},
      {type:'textarea',key:'body',label:'文案',rows:4},
      {type:'range',key:'textSize',label:'标题字号',min:20,max:76},
      {type:'range',key:'textWidth',label:'文字块宽度 %',min:25,max:80},
      {type:'range',key:'textX',label:'文字水平位置 %',min:3,max:55},
      {type:'range',key:'textY',label:'文字垂直位置 %',min:5,max:76},
      {type:'checkbox',key:'textFront',label:'文字置于主体前方'},
      {type:'checkbox',key:'showText',label:'显示标题和文案'},
    ],v,(key)=>{if(key==='title'||key==='body')copyVersion++;draw();});
    textInputs.title.maxLength=120;textInputs.body.maxLength=800;
    panelSection(panel,'05 / 导出');
    const exportStatus=document.createElement('div');exportStatus.className='gp-status';exportStatus.hidden=true;
    buildControls(panel,[{type:'button',primary:true,label:'导出高清 PNG · 1500 × 2000',onClick:async()=>{
      const view=v.view;v.view='poster';const output=makeCanvas(W*2,H*2);renderTo(output);v.view=view;
      try{await downloadCanvasPNG(output,'poster-lab-geometry-pop.png',1);exportStatus.hidden=false;status(exportStatus,foreground?'高清 PNG 已导出':'已导出当前画面（前景尚未抠出）');}
      catch(error){exportStatus.hidden=false;status(exportStatus,`导出失败：${error.message}`,true);}
      finally{draw();}
    }}],v,()=>{});panel.append(exportStatus);
    const offDrag=enableDrag(canvas,()=>v.brush==='off'&&v.view==='poster'?items:[],{
      onMove:(i,x,y)=>{if(!items[i])return;items[i].x=clamp(x,-items[i].w/2,W-items[i].w/2);items[i].y=clamp(y,-items[i].h/2,H-items[i].h/2);draw();},
    });
    function brushPoint(event) {
      const b=canvas.getBoundingClientRect(),r=rect();
      return {x:((event.clientX-b.left)*W/b.width-r.x)/r.w*source.width,y:((event.clientY-b.top)*H/b.height-r.y)/r.h*source.height};
    }
    function paint(event) {
      if(!painting)return;
      const p=brushPoint(event),m=mask.getContext('2d');m.save();m.globalCompositeOperation=v.brush==='erase'?'destination-out':'source-over';m.strokeStyle='#fff';m.lineWidth=v.brushSize*source.width/rect().w;m.lineCap='round';m.lineJoin='round';
      m.beginPath();m.moveTo(lastPoint?.x??p.x,lastPoint?.y??p.y);m.lineTo(p.x+.01,p.y+.01);m.stroke();m.restore();lastPoint=p;updateForeground();draw();
    }
    function down(e){if(v.brush==='off')return;if(worker){stop();status(cutStatus,'已停止自动识别，正在手动修补');status(copyStatus,'自动识别已停止，可重新生成文案');}maskBackup=mask.getContext('2d').getImageData(0,0,mask.width,mask.height);painting=true;lastPoint=null;canvas.setPointerCapture(e.pointerId);paint(e);e.preventDefault();}
    function up(){painting=false;lastPoint=null;}
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',paint);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    panel.querySelectorAll('.tc-field').forEach((field,i)=>{
      const label=field.querySelector('label'),input=field.querySelector('input,select,textarea');
      if(label&&input){input.id=`gp-control-${i}`;label.htmlFor=input.id;input.setAttribute('aria-label',label.querySelector('span')?.textContent||label.textContent);}
    });
    layout();
    if(options.sourceImageUrl)load(options.sourceImageUrl);
    return()=>{destroyed=true;version++;stop();offDrag();if(loadUrl)URL.revokeObjectURL(loadUrl);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',paint);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
  },
};
