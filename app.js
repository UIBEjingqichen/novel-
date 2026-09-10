(function(){
'use strict';
const canvas=document.getElementById('cityCanvas'),ctx=canvas.getContext('2d'),hover=document.getElementById('hoverCard');
const TAU=Math.PI*2, LEVELS=6;
const C={bg:'#071019',grid:'#142838',core:'#5d6f7b',home:'#4f8ca7',service:'#6da879',industry:'#9c6a60',outer:'#788c98',stable:'#d7b36b',traffic:'#263c4c',skeleton:'#9db6c7',void:'rgba(233,215,130,.20)'};
const cfg=[
 {base:157,p:.10,a1:15,a2:9,a3:5}, {base:169,p:1.08,a1:13,a2:10,a3:7}, {base:160,p:2.08,a1:18,a2:7,a3:8},
 {base:172,p:3.12,a1:11,a2:13,a3:6}, {base:162,p:4.18,a1:17,a2:8,a3:9}, {base:170,p:5.15,a1:12,a2:12,a3:7}
];
const stableAngles=[0.05,2.20,4.35], trafficOffset=.045;
const services=[{a:.55,span:.55,active:true},{a:1.62,span:.45},{a:2.83,span:.58},{a:4.13,span:.46},{a:5.35,span:.54}];
const industries=[{a:.88,span:.55},{a:2.08,span:.62},{a:3.35,span:.52},{a:4.78,span:.66},{a:5.88,span:.38}];
let W=0,H=0,dpr=1,playing=false,currentTime=7.5,last=performance.now(),drag=null;
let cam={yaw:-.68,pitch:.72,zoom:2.65,panX:-120,panY:5};
let drawables=[],hitItems=[];

function el(id){return document.getElementById(id)}
function homeAmp(){return +el('homeAmp').value} function serviceAmp(){return +el('serviceAmp').value*Math.PI/180}
function layerGap(){return +el('layerGap').value} function slabT(){return +el('slabThickness').value}
function selected(){return +el('levelSelect').value}
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function diff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function baseOuter(li,a){const q=cfg[li];return q.base+q.a1*Math.sin(a+q.p)+q.a2*Math.sin(2*a-q.p*.55)+q.a3*Math.cos(3*a+q.p*1.35)}
function stretch(li,a,t){return .68*Math.sin(t/24*TAU+li*.74+a*1.55)+.32*Math.sin(t/12*TAU+li*.21-a*.92)}
function homeOuter(li,a,t){return Math.max(120,baseOuter(li,a)-29+stretch(li,a,t)*homeAmp())}
function serviceInner(li,a,t){return homeOuter(li,a,t)+1.5}
function serviceOuter(li,a,t){return Math.min(baseOuter(li,a)-13,serviceInner(li,a,t)+16)}
function industryInner(li,a,t){return Math.max(serviceOuter(li,a,t)+1.5,baseOuter(li,a)-27)}
function industryOuter(li,a){return baseOuter(li,a)-5}
function activeServiceAngle(s,t){if(!s.active)return s.a;let f=0;if(t<6)f=0;else if(t<8.5)f=-1;else if(t<15.5)f=-1+2*(t-8.5)/7;else if(t<18.5)f=1;else if(t<21.5)f=1-(t-18.5)/3;return s.a+serviceAmp()*f}
function shade(hex,k){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;return `rgb(${Math.round(r*k)},${Math.round(g*k)},${Math.round(b*k)})`}
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`}

function rot(p){let x=p.x,y=p.y,z=p.z;const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);let x1=x*cy-z*sy,z1=x*sy+z*cy;const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);let y1=y*cp-z1*sp,z2=y*sp+z1*cp;return {x:x1,y:y1,z:z2}}
function project(p){const r=rot(p),pers=1/(1+r.z/900);return {x:(W-350)/2+cam.panX+(r.x*cam.zoom*pers),y:H*.52+cam.panY-(r.y*cam.zoom*pers),z:r.z}}
function worldPoint(r,a,y){return {x:Math.cos(a)*r,y,z:Math.sin(a)*r}}
function polyCenter(ps){let x=0,y=0,z=0;for(const p of ps){x+=p.x;y+=p.y;z+=p.z}return{x:x/ps.length,y:y/ps.length,z:z/ps.length}}
function addFace(points,color,alpha=1,stroke='rgba(255,255,255,.10)',meta=null,isTop=false){const c=rot(polyCenter(points));drawables.push({points,color,alpha,stroke,depth:c.z,meta,isTop})}
function prismFromLoops(top,bottom,color,alpha,meta){addFace(top,color,alpha,'rgba(255,255,255,.16)',meta,true);for(let i=0;i<top.length;i++){const j=(i+1)%top.length;addFace([bottom[i],bottom[j],top[j],top[i]],shade(color,.57),alpha,'rgba(255,255,255,.07)',meta,false)}}
function annularPrism(li,innerFn,outerFn,start,end,color,alpha,meta,steps=36){const y=li*layerGap(),th=slabT(),top=[],bot=[];for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;top.push(worldPoint(outerFn(a),a,y+th));bot.push(worldPoint(outerFn(a),a,y))}for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps;top.push(worldPoint(innerFn(a),a,y+th));bot.push(worldPoint(innerFn(a),a,y))}prismFromLoops(top,bot,color,alpha,meta)}
function radialStrip(li,a,width,r0,r1,color,alpha,meta){const y=li*layerGap(),th=slabT()+.7;const p=[worldPoint(r0,a-width/2,y+th),worldPoint(r1,a-width/2,y+th),worldPoint(r1,a+width/2,y+th),worldPoint(r0,a+width/2,y+th)];const b=p.map(q=>({...q,y:li*layerGap()+.3}));prismFromLoops(p,b,color,alpha,meta)}
function diskPrism(li,r,color,alpha,meta){annularPrism(li,()=>0,()=>r,0,TAU,color,alpha,meta,64)}
function ringWire(li,r,color,alpha=.55,width=.7){const y=li*layerGap()+slabT()+1;const pts=[];for(let i=0;i<72;i++)pts.push(project(worldPoint(r,i/72*TAU,y)));ctx.save();ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=width;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();ctx.restore()}
function line3D(a,b,color,width=1.2,alpha=.7,dash=[]){const p=project(a),q=project(b);ctx.save();ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.restore()}
function layerAlpha(li){const mode=el('viewMode').value;if(mode==='focus')return li===selected()?1:.12;if(mode==='sun')return li===selected()?1:.28;if(mode==='skeleton')return .05;return .80}
function buildLayer(li){const alpha=layerAlpha(li),mode=el('viewMode').value;if(mode==='skeleton')return;const metaBase={li};
  if(el('showHomes').checked)annularPrism(li,()=>30,a=>homeOuter(li,a,currentTime),0,TAU,C.home,alpha,{...metaBase,type:'home',name:`L${li+1} 普通生活区`,desc:'住宅、邻里商业、社区服务与小型公共设施组成的面积主体。'},96);
  if(el('showService').checked)services.forEach((s,k)=>{const center=activeServiceAngle(s,currentTime);annularPrism(li,a=>serviceInner(li,a,currentTime),a=>Math.max(serviceInner(li,a,currentTime)+7,serviceOuter(li,a,currentTime)),center-s.span/2,center+s.span/2,C.service,alpha,{...metaBase,type:'service',name:`L${li+1} 复合公共服务段 ${k+1}`,desc:'学校与较大型商业、片区医疗、体育训练、图书馆、公共办事等组合成较大运行段。'},24)});
  if(el('showIndustry').checked)industries.forEach((s,k)=>annularPrism(li,a=>Math.max(industryInner(li,a,currentTime),homeOuter(li,a,currentTime)+18),a=>industryOuter(li,a),s.a-s.span/2,s.a+s.span/2,C.industry,alpha,{...metaBase,type:'industry',name:`L${li+1} 生产物流段 ${k+1}`,desc:'中型工厂、装配、维修、普通仓储与货运接口，位于生活与公共服务结构更外侧。'},24));
  if(el('showOuter').checked){for(let k=0;k<11;k++){if(k%3===1)continue;const s=k/11*TAU+.02,e=(k+1)/11*TAU-.035;annularPrism(li,a=>baseOuter(li,a)-5,a=>baseOuter(li,a),s,e,C.outer,alpha,{...metaBase,type:'outer',name:`L${li+1} 外缘接口`,desc:'外缘交通、维护、城防与结构交换接口，不要求连续实体成环。'},16)}}
  diskPrism(li,28,C.core,Math.min(1,alpha+.15),{...metaBase,type:'core',name:`L${li+1} 稳定核心`,desc:'中央定轴接口与稳定核心设施所在的小尺度核心。'});
  if(el('showTraffic').checked)stableAngles.forEach(a=>radialStrip(li,a+trafficOffset,.022,28,baseOuter(li,a+trafficOffset)-2,C.traffic,alpha,{...metaBase,type:'traffic',name:'主干交通净空',desc:'普通居民与大型运输进入中央的重要净空通道，本身不布置连续住宅。'}));
  if(el('showStable').checked)stableAngles.forEach((a,k)=>radialStrip(li,a,.009,28,baseOuter(li,a)-1,C.stable,Math.min(1,alpha+.15),{...metaBase,type:'stable',name:k===0?'祝遥所在固定辐向住宅带':'固定辐向高稳定住宅带',desc:'只占极小比例的细长稳定街带，连续通向中央，不参加普通住宅的日常伸缩。'}));
}
function drawSkeleton(){if(!el('showSkeleton').checked)return;for(let li=0;li<LEVELS;li++){const y=li*layerGap()+slabT()+1;[30,92,132,160].forEach(r=>ringWire(li,r,C.skeleton,.38,.8));for(let i=0;i<10;i++){const a=i/10*TAU;line3D(worldPoint(28,a,y),worldPoint(baseOuter(li,a),a,y),C.skeleton,.7,.26)}}for(let i=0;i<8;i++){const a=i/8*TAU,r=54;line3D(worldPoint(r,a,0),worldPoint(r,a,(LEVELS-1)*layerGap()+slabT()+1),C.skeleton,.8,.35,[3,4])}}
function drawSunVoids(){if(el('viewMode').value!=='sun')return;for(const a of stableAngles){const r0=30,r1=184,w=.018;const y0=-4,y1=(LEVELS-1)*layerGap()+slabT()+11;const pts=[worldPoint(r0,a-w,y0),worldPoint(r1,a-w,y0),worldPoint(r1,a+w,y0),worldPoint(r0,a+w,y0),worldPoint(r0,a-w,y1),worldPoint(r1,a-w,y1),worldPoint(r1,a+w,y1),worldPoint(r0,a+w,y1)];const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];for(const f of faces)addFace(f.map(i=>pts[i]),'#e9d782',.11,'rgba(242,215,139,.22)',null,false)}}
function renderFaces(){drawables.sort((a,b)=>b.depth-a.depth);hitItems=[];for(const f of drawables){const pts=f.points.map(project);ctx.save();ctx.globalAlpha=f.alpha;ctx.fillStyle=f.color;ctx.strokeStyle=f.stroke;ctx.lineWidth=.75;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();if(f.meta&&f.isTop){const c=pts.reduce((o,p)=>({x:o.x+p.x/pts.length,y:o.y+p.y/pts.length}),{x:0,y:0});hitItems.push({x:c.x,y:c.y,meta:f.meta})}}}
function drawAxis(){const yTop=(LEVELS-1)*layerGap()+slabT()+18;const a=project({x:0,y:-7,z:0}),b=project({x:0,y:yTop,z:0});ctx.save();ctx.strokeStyle='rgba(210,226,236,.82)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
function drawLabels(){if(el('viewMode').value==='skeleton')return;const li=selected(),y=li*layerGap()+slabT()+4;const labels=[['普通生活区',86,3.45,'#d9f1fb'],['公共服务 / 大型商业',137,1.55,'#d9f1dd'],['生产物流',157,2.10,'#f1d5cf'],['稳定核心',16,.4,'#edf2f5']];ctx.save();ctx.font='12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';for(const [t,r,a,c] of labels){const p=project(worldPoint(r,a,y));ctx.fillStyle=c;ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(t,p.x,p.y)}ctx.restore()}
function drawGround(){const p=project({x:0,y:-8,z:0});const rx=215*cam.zoom,ry=rx*Math.sin(cam.pitch)*.50;ctx.save();ctx.fillStyle='rgba(18,31,40,.38)';ctx.strokeStyle='rgba(90,116,132,.22)';ctx.beginPath();ctx.ellipse(p.x,p.y,rx,Math.max(22,ry),0,0,TAU);ctx.fill();ctx.stroke();ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);drawGround();drawables=[];for(let li=0;li<LEVELS;li++)buildLayer(li);drawSunVoids();renderFaces();drawSkeleton();drawAxis();drawLabels()}
function updateMetrics(){const t=currentTime,m=.68*Math.sin(t/24*TAU)+.32*Math.sin(t/12*TAU);el('moveMetric').textContent=Math.round(Math.abs(m)*homeAmp())+' u';let f=0;if(t>=6&&t<8.5)f=-1;else if(t>=8.5&&t<15.5)f=-1+2*(t-8.5)/7;else if(t>=15.5&&t<18.5)f=1;else if(t>=18.5&&t<21.5)f=1-(t-18.5)/3;el('serviceMetric').textContent=(f*+el('serviceAmp').value).toFixed(0)+'°';const hh=Math.floor(t)%24,mm=Math.floor((t-hh)*60);el('timeLabel').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');el('homeAmpLabel').textContent=el('homeAmp').value;el('serviceAmpLabel').textContent=el('serviceAmp').value;el('gapLabel').textContent=el('layerGap').value;el('thickLabel').textContent=el('slabThickness').value}
function animate(now){if(playing){currentTime=(currentTime+(now-last)*.0015)%24;el('time').value=currentTime}last=now;updateMetrics();draw();requestAnimationFrame(animate)}
function setCam(kind){if(kind==='iso')cam={yaw:-.68,pitch:.72,zoom:2.65,panX:-120,panY:5};if(kind==='top')cam={yaw:-.12,pitch:1.50,zoom:2.55,panX:-120,panY:20};if(kind==='side')cam={yaw:-.05,pitch:.12,zoom:2.45,panX:-110,panY:55};if(kind==='zhuyao')cam={yaw:-.05,pitch:.62,zoom:3.55,panX:-215,panY:28}}
function nearestHit(x,y){let best=null,bd=28;for(const h of hitItems){const d=Math.hypot(x-h.x,y-h.y);if(d<bd){bd=d;best=h}}return best}
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:cam.yaw,pitch:cam.pitch,panX:cam.panX,panY:cam.panY,shift:e.shiftKey};canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.shift){cam.panX=drag.panX+dx;cam.panY=drag.panY+dy}else{cam.yaw=drag.yaw+dx*.006;cam.pitch=clamp(drag.pitch-dy*.005,.05,1.52)}hover.style.display='none';return}const h=nearestHit(e.clientX,e.clientY);if(!h){hover.style.display='none';return}hover.style.display='block';hover.style.left=(e.clientX+14)+'px';hover.style.top=(e.clientY+14)+'px';hover.innerHTML=`<b>${h.meta.name}</b><br>${h.meta.desc}<br><span class="tag">${h.meta.type}</span>`});
canvas.addEventListener('pointerup',()=>{drag=null;canvas.classList.remove('dragging')});canvas.addEventListener('pointercancel',()=>{drag=null;canvas.classList.remove('dragging')});
canvas.addEventListener('wheel',e=>{e.preventDefault();cam.zoom=clamp(cam.zoom*Math.exp(-e.deltaY*.001),1.25,5.5)},{passive:false});
el('time').addEventListener('input',e=>currentTime=+e.target.value);el('play').addEventListener('click',()=>{playing=!playing;el('play').textContent=playing?'❚❚ 暂停':'▶ 播放'});el('resetBtn').addEventListener('click',()=>setCam('iso'));document.querySelectorAll('[data-cam]').forEach(b=>b.addEventListener('click',()=>setCam(b.dataset.cam)));
for(let i=0;i<LEVELS;i++){const o=document.createElement('option');o.value=i;o.textContent='L'+(i+1);if(i===3)o.selected=true;el('levelSelect').appendChild(o)}
window.addEventListener('resize',resize);resize();setCam('iso');requestAnimationFrame(animate);
})();
