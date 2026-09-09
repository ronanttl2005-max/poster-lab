import { buildControls, panelSection, injectStyle, makeCanvas, loadImageUrl, loadImageFile, imageToCanvas, downloadCanvasPNG, enableDrag, clamp } from './shared.js';
import { PAPER, contentKit, makeLabels, arrangeLabels, validQuad, moveLabel, quadProject } from './labelmotion-layout.js';
import { renderPaper, drawOnSurface } from './labelmotion-render.js';

const REFERENCE = new URL('../../assets/tools/labelmotion-scene.png?v=clean-20260908', import.meta.url).href;
const REFERENCE_QUAD = [{x:215,y:244},{x:494,y:242},{x:494,y:638},{x:215,y:636}];
const copyQuad = q => q.map(p=>({...p}));
const cover = `<svg viewBox="0 0 480 280" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="280" fill="#dce1d7"/><path d="M0 200L480 90V280H0" fill="#b4bdb0"/><rect x="135" y="15" width="204" height="257" rx="2" fill="#303a32"/><rect x="145" y="25" width="184" height="237" fill="#f4f2e9"/><g fill="#152219" font-family="sans-serif" font-weight="800"><text x="158" y="79" font-size="37">瞬息</text><text x="160" y="125" font-size="12">URBAN ◇</text><text x="230" y="173" font-size="13">MOTION</text><text x="159" y="222" font-size="11">◉ TRANSIT</text></g><g fill="none" stroke="#152219" stroke-width="3"><circle cx="274" cy="111" r="11"/><path d="M273 105V112H280M185 151L196 162L185 173L174 162Z"/></g></svg>`;

export default {
  id: 'labelmotion', name: '标签自动排版', nameEn: 'Label Motion',
  desc: '把主题变成文字与图标标签，自动重排，贴进真实场景。',
  tags: ['内容生成', '自动排版', '实物贴合', '动态预览'], cover,
  mount(container, options = {}) {
    injectStyle('labelmotion', `
      .lm-stage{display:block;min-width:0}.lm-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center}.lm-toolbar button{border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--text);padding:8px 12px;cursor:pointer}.lm-toolbar button.active{background:var(--text);color:var(--bg)}.lm-toolbar .lm-play{margin-left:auto}.lm-canvas-wrap{background:#e6e8e2;display:flex;justify-content:center;padding:18px;border-radius:9px}.lm-canvas-wrap canvas{display:block;max-height:780px;width:auto;max-width:100%;object-fit:contain;touch-action:none;box-shadow:0 8px 32px #17271926}.lm-hint{font-size:12px;line-height:1.7;color:var(--text-2);margin:12px 0 0}.lm-status{font-size:12px;color:var(--text-2);min-height:20px;margin:9px 0}.lm-status[data-error=true]{color:#b73926}.lm-panel textarea{resize:vertical}.lm-corner-row{display:flex;gap:8px;align-items:center;font-size:12px;margin-bottom:10px}.lm-corner-row input{accent-color:var(--accent)}@media(max-width:900px){.lm-panel{position:static;max-height:none}.lm-canvas-wrap{padding:8px}.lm-toolbar .lm-play{margin-left:0}}
    `);
    container.innerHTML = `<div class="lm-panel"></div><div class="tool-stage lm-stage"><div class="lm-toolbar"><button type="button" data-view="scene" class="active">实物预览</button><button type="button" data-view="paper">平面排版</button><button type="button" class="lm-play">▶ 自动换版</button></div><label class="lm-corner-row"><input type="checkbox" class="lm-guides">调整贴合四角</label><div class="lm-canvas-wrap"><canvas aria-label="标签排版预览"></canvas></div><p class="lm-hint"></p><div class="lm-status" role="status" aria-live="polite"></div></div>`;
    const panel=container.querySelector('.lm-panel'), canvas=container.querySelector('canvas'), ctx=canvas.getContext('2d');
    const hint=container.querySelector('.lm-hint'), status=container.querySelector('.lm-status'), guides=container.querySelector('.lm-guides'), play=container.querySelector('.lm-play');
    const v={title:'瞬息',eyebrow:'URBAN OBSERVATIONS / 城市观察',description:'骑行者穿过街角，日常在此刻发生。\nA fleeting moment in the city.',labels:'URBAN\nMOTION\nVOID\nTRANSIT\n城市\n流动\n瞬间\nDAILY',layout:'scatter',labelStyle:'type',paper:'#f0f0e8',ink:'#111914',accent:'#d6ed7b',texture:32,light:24,shadow:20,blend:70,seed:1};
    let items=[], photo=null, photoPixels=null, quad=copyQuad(REFERENCE_QUAD), view='scene', alive=true, playing=false, timer=0, frame=0, loadVersion=0, dragCorner=-1, selected=-1, sceneName='视频参考街景';
    const abort=new AbortController();
    const message=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
    const draw=()=>{
      if(!alive)return;
      const paper=renderPaper(v,items,{material:view==='scene'});
      if(view==='scene'&&photo){
        const samples=[];
        for(let y=1;y<10;y++)for(let x=1;x<10;x++){
          const p=quadProject(quad,x/10,y/10),px=clamp(Math.round(p.x),0,photo.width-1),py=clamp(Math.round(p.y),0,photo.height-1),i=(py*photo.width+px)*4;
          const rgb=[photoPixels[i],photoPixels[i+1],photoPixels[i+2]];samples.push({rgb,l:rgb[0]*.299+rgb[1]*.587+rgb[2]*.114});
        }
        samples.sort((a,b)=>a.l-b.l);
        const clean=samples.slice(Math.floor(samples.length*.55),Math.floor(samples.length*.9));
        const tone=[0,1,2].map(i=>Math.round(clean.reduce((sum,p)=>sum+p.rgb[i],0)/clean.length));
        const pc=paper.getContext('2d');pc.save();pc.globalCompositeOperation='multiply';pc.globalAlpha=v.blend/100;pc.fillStyle=`rgb(${tone.join(',')})`;pc.fillRect(0,0,paper.width,paper.height);pc.restore();
        if(canvas.width!==photo.width||canvas.height!==photo.height){canvas.width=photo.width;canvas.height=photo.height;}
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(photo,0,0);
        ctx.save();ctx.beginPath();quad.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x,p.y));ctx.closePath();
        ctx.shadowColor=`rgba(0,0,0,${v.shadow/100})`;ctx.shadowBlur=12;ctx.shadowOffsetY=3;ctx.fillStyle=v.paper;ctx.fill();ctx.restore();
        drawOnSurface(ctx,paper,quad);
        if(guides.checked){
          ctx.save();ctx.strokeStyle='#cbff46';ctx.lineWidth=2;ctx.beginPath();quad.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x,p.y));ctx.closePath();ctx.stroke();
          quad.forEach((p,i)=>{ctx.fillStyle='#cbff46';ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17200c';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),p.x,p.y);});ctx.restore();
        }
      }else{
        if(canvas.width!==PAPER.width||canvas.height!==PAPER.height){canvas.width=PAPER.width;canvas.height=PAPER.height;}
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(paper,0,0);
        if(selected>=0&&items[selected]){const it=items[selected];ctx.save();ctx.strokeStyle='#809d38';ctx.setLineDash([5,4]);ctx.strokeRect(it.x-4,it.y-4,it.w+8,it.h+8);ctx.restore();}
      }
      hint.textContent=view==='scene'?`${sceneName} · 勾选「调整贴合四角」，按左上、右上、右下、左下贴合海报、包装或其他平面。导出不含辅助线。`:'拖动标签微调位置；左侧每行对应一个标签。自动换版会重新安排位置。';
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
    const regenerate=()=>{items=arrangeLabels(makeLabels(v.labels,v.title+' '+v.description),v.seed,v.layout);selected=-1;draw();};
    const stop=()=>{playing=false;clearInterval(timer);play.textContent='▶ 自动换版';};
    const reflow=()=>{v.seed++;regenerate();};
    panelSection(panel,'01 / 内容变成标签');
    const inputs=buildControls(panel,[
      {key:'title',label:'主题 / 主标题',type:'text'},
      {key:'description',label:'内容描述',type:'textarea',rows:3},
      {key:'generate',label:'根据内容生成一组标签',type:'button',primary:true,onClick:()=>{stop();const kit=contentKit(v.title,v.description);v.labels=kit.words.join('\n');inputs.labels.value=v.labels;v.seed++;regenerate();message('已根据关键词生成文字与图标；可在下面逐行修改。');}},
      {key:'labels',label:'标签文字 · 每行一个（最多 18 个）',type:'textarea',rows:6},
      {key:'eyebrow',label:'副标题 / 系列编号',type:'text'},
    ],v,(key)=>{stop();if(key==='labels'||key==='title'||key==='description')regenerate();else schedule();});
    inputs.title.maxLength=80;inputs.description.maxLength=1200;inputs.labels.maxLength=2400;inputs.eyebrow.maxLength=160;
    panelSection(panel,'02 / 排版与纸张');
    buildControls(panel,[
      {key:'layout',label:'排版方式',type:'select',options:[{value:'scatter',label:'自由散点'},{value:'diagonal',label:'对角流动'},{value:'grid',label:'整齐网格'}]},
      {key:'labelStyle',label:'标签样式',type:'select',options:[{value:'type',label:'文字 + 线条图标'},{value:'sticker',label:'彩色纸签'}]},
      {key:'shuffle',label:'↻ 换一个排版',type:'button',primary:true,onClick:()=>{stop();reflow();message('已更新排版。');}},
      {key:'paper',label:'纸张颜色',type:'color'},{key:'ink',label:'文字 / 图标',type:'color'},{key:'accent',label:'纸签底色',type:'color'},
    ],v,key=>{stop();key==='layout'?regenerate():schedule();});
    panelSection(panel,'03 / 贴到实物上');
    buildControls(panel,[
      {key:'photo',label:'上传实物照片',type:'file',accept:'image/*'},
      {key:'reference',label:'恢复视频参考街景',type:'button',onClick:()=>loadPhoto(REFERENCE,true)},
      {key:'resetQuad',label:'重置贴合区域',type:'button',onClick:()=>{quad=sceneName==='视频参考街景'?copyQuad(REFERENCE_QUAD):defaultQuad();schedule();}},
      {key:'blend',label:'环境光融合',type:'range',min:0,max:100},
      {key:'texture',label:'纸张颗粒',type:'range',min:0,max:100},
      {key:'light',label:'表面明暗',type:'range',min:0,max:100},
      {key:'shadow',label:'边缘阴影',type:'range',min:0,max:70},
    ],v,(key,files)=>{if(key==='photo'){if(files?.[0])loadPhoto(files[0],false);}else schedule();});
    panelSection(panel,'04 / 导出');
    buildControls(panel,[
      {key:'exportScene',label:'导出实物效果 PNG',type:'button',primary:true,onClick:()=>exportImage('scene')},
      {key:'exportPaper',label:'导出平面海报 PNG · 1500px',type:'button',onClick:()=>exportImage('paper')},
      {key:'exportLabels',label:'导出透明标签 PNG · 1500px',type:'button',onClick:()=>exportImage('transparent')},
      {type:'info',label:'标签按主题关键词在本地生成，可自行改写。实物贴合适用于平面；瓶身等曲面建议先拍正面照片。'},
    ],v,()=>{});
    // Give the shared controls accessible names without changing other tools.
    panel.querySelectorAll('.tc-field').forEach((row,i)=>{const input=row.querySelector('input,select,textarea'),label=row.querySelector('label');if(input&&label){input.id=`labelmotion-${i}`;label.htmlFor=input.id;}});
    function defaultQuad(){const w=photo?.width||750,h=photo?.height||1050;return[{x:w*.23,y:h*.18},{x:w*.77,y:h*.18},{x:w*.77,y:h*.82},{x:w*.23,y:h*.82}];}
    function setView(next){view=next;selected=-1;container.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));container.querySelector('.lm-corner-row').style.display=view==='scene'?'flex':'none';draw();}
    async function loadPhoto(source,reference){
      const version=++loadVersion;stop();message('正在载入场景…');
      try{
        if(typeof source!=='string'&&source.size>25*1024*1024)throw new Error('请选择小于 25 MB 的图片。');
        const image=typeof source==='string'?await loadImageUrl(source):await loadImageFile(source);
        let loaded;
        try{loaded=imageToCanvas(image,1800);}finally{if(image.src.startsWith('blob:'))URL.revokeObjectURL(image.src);}
        if(!alive||version!==loadVersion)return;
        // Verify exportability before replacing the current scene.
        photoPixels=loaded.getContext('2d').getImageData(0,0,loaded.width,loaded.height).data;
        photo=loaded;sceneName=reference?'视频参考街景':'自定义照片';quad=reference?copyQuad(REFERENCE_QUAD):defaultQuad();guides.checked=!reference;setView('scene');message(reference?'已载入你提供的视频场景。':'照片已载入，拖动四角对齐实物表面。');
      }catch(error){if(alive&&version===loadVersion){message(error.message||'照片读取失败，请换一张图片。',true);if(!photo)setView('paper');}}
    }
    async function exportImage(kind){
      stop();
      try{
        let result;
        if(kind==='scene'){
          if(!photo)throw new Error('场景尚未载入，请先上传照片。');
          const oldView=view,oldGuides=guides.checked;view='scene';guides.checked=false;draw();result=makeCanvas(canvas.width,canvas.height);result.getContext('2d').drawImage(canvas,0,0);view=oldView;guides.checked=oldGuides;draw();
        }else result=renderPaper(v,items,{transparent:kind==='transparent'});
        await downloadCanvasPNG(result,`poster-lab-labelmotion-${kind}-${v.seed}.png`,kind==='scene'?1:2);
        message('已导出 PNG。');
      }catch(error){message('导出失败：'+error.message,true);}
    }
    container.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view),{signal:abort.signal}));
    guides.addEventListener('change',()=>{stop();draw();},{signal:abort.signal});
    play.addEventListener('click',()=>{if(playing){stop();return;}guides.checked=false;playing=true;play.textContent='Ⅱ 暂停换版';reflow();timer=setInterval(()=>{if(!document.hidden)reflow();},1600);},{signal:abort.signal});
    const cleanupDrag=enableDrag(canvas,()=>view==='paper'?items:[],{onPick:i=>{stop();selected=i;schedule();},onMove:(i,x,y)=>{items[i]=moveLabel(items[i],x,y);schedule();}});
    const coords=e=>{const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*canvas.width/rect.width,y:(e.clientY-rect.top)*canvas.height/rect.height};};
    canvas.addEventListener('pointerdown',e=>{
      if(view!=='scene'||!guides.checked)return;
      const p=coords(e),radius=24*canvas.width/canvas.getBoundingClientRect().width;
      dragCorner=quad.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius);
      if(dragCorner>=0){stop();canvas.setPointerCapture(e.pointerId);e.preventDefault();}
    },{signal:abort.signal});
    canvas.addEventListener('pointermove',e=>{
      if(dragCorner<0)return;const p=coords(e),next=copyQuad(quad);next[dragCorner]={x:clamp(p.x,0,canvas.width),y:clamp(p.y,0,canvas.height)};
      if(validQuad(next)){quad=next;schedule();}
    },{signal:abort.signal});
    const endCorner=()=>{dragCorner=-1;};
    canvas.addEventListener('pointerup',endCorner,{signal:abort.signal});canvas.addEventListener('pointercancel',endCorner,{signal:abort.signal});
    regenerate();loadPhoto(options.sourceImageUrl||REFERENCE,!options.sourceImageUrl);
    return()=>{alive=false;loadVersion++;stop();cancelAnimationFrame(frame);abort.abort();cleanupDrag();};
  },
};
