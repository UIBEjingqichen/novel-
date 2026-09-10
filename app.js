(function(){
'use strict';
const canvas=document.getElementById('cityCanvas');
const ctx=canvas.getContext('2d');
const profile=document.getElementById('profileCanvas');
const pctx=profile.getContext('2d');
const hover=document.getElementById('hoverCard');

const COLORS={bg:'#071019',grid:'#142838',core:'#566773',home:'#4f8ca7',home2:'#5f98ae',service:'#6da879',service2:'#7db08a',industry:'#9c6a60',outer:'#788c98',stable:'#d7b36b',traffic:'#263c4c',border:'#a9c5d7',upper:'rgba(3,8,13,.56)',upperLine:'rgba(188,213,229,.35)',lower:'rgba(126,173,201,.22)',sun:'#f2d78b'};
const TAU=Math.PI*2;
const LEVELS=6;
let dpr=Math.min(window.devicePixelRatio||1,2),W=0,H=0;
let view={cx:0,cy:0,scale:1};
let currentTime=7.5,playing=false,lastT=performance.now();
let hovered=null;

// 仅为验证器的几何参数。半径不表示米，也不定义正典层数。
const layerCfg=[
  {base:148,phase:0.15,a1:11,a2:7,a3:4},
  {base:158,phase:1.28,a1:15,a2:5,a3:8},
  {base:151,phase:2.31,a1:8,a2:13,a3:5},
  {base:164,phase:3.42,a1:13,a2:8,a3:7},
  {base:154,phase:4.37,a1:10,a2:12,a3:6},
  {base:161,phase:5.43,a1:16,a2:6,a3:5}
];
const stableAngles=[0.06,2.18,4.36]; // 稀少细辐带，祝遥所在为第0条
const trafficOffset=0.065;
const serviceSegments=[
  {a:0.62,span:0.62,active:true},
  {a:1.82,span:0.52},
  {a:3.10,span:0.66},
  {a:4.60,span:0.54},
  {a:5.52,span:0.48}
];
const industrySegments=[
  {a:0.98,span:0.52},{a:2.36,span:0.68},{a:3.78,span:0.56},{a:5.02,span:0.70}
];

function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  const r=profile.getBoundingClientRect();profile.width=Math.floor(r.width*dpr);profile.height=Math.floor(r.height*dpr);pctx.setTransform(dpr,0,0,dpr,0,0);
  if(!view.cx){resetView();}
}
function resetView(){view.cx=(W-330)/2;view.cy=H/2;view.scale=Math.min((W-380)/390,(H-60)/390);view.scale=Math.max(.75,view.scale)}
function worldToScreen(x,y){return [view.cx+x*view.scale,view.cy+y*view.scale]}
function screenToWorld(x,y){return [(x-view.cx)/view.scale,(y-view.cy)/view.scale]}
function normAngle(a){while(a<0)a+=TAU;while(a>=TAU)a-=TAU;return a}
function angleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function homeAmp(){return +document.getElementById('homeAmp').value}
function serviceAmp(){return (+document.getElementById('serviceAmp').value)*Math.PI/180}
function selectedLayer(){return +document.getElementById('levelSelect').value}

function baseOuter(li,a){
  const c=layerCfg[li];
  return c.base + c.a1*Math.sin(a+c.phase) + c.a2*Math.sin(2*a-c.phase*.7) + c.a3*Math.cos(3*a+c.phase*1.4);
}
function stretchFactor(li,a,t){
  // 各方向不同相位，形成局部凸出与内收，而非整层同涨同缩。
  return Math.sin((t/24)*TAU + li*.73 + a*1.65)*0.62 + Math.sin((t/12)*TAU + li*.31-a*.8)*0.38;
}
function residentialOuter(li,a,t){
  const envelope=baseOuter(li,a);
  return Math.max(102,envelope-34 + stretchFactor(li,a,t)*homeAmp());
}
function serviceInner(li,a,t){return residentialOuter(li,a,t)+3}
function serviceOuter(li,a,t){return Math.min(baseOuter(li,a)-14,serviceInner(li,a,t)+17)}
function industryInner(li,a,t){return serviceOuter(li,a,t)+2}
function industryOuter(li,a,t){return Math.min(baseOuter(li,a)-3,industryInner(li,a,t)+13)}
function outerInterfaceInner(li,a){return Math.max(130,baseOuter(li,a)-9)}

function activeServiceAngle(seg,t){
  if(!seg.active)return seg.a;
  let f=0;
  if(t<6)f=0; else if(t<8.5)f=-1; else if(t<15.5)f=-1+2*(t-8.5)/7; else if(t<18.5)f=1; else if(t<21.5)f=1-(t-18.5)/3; else f=0;
  return seg.a+serviceAmp()*f;
}
function serviceAtAngle(a,t){
  for(const seg of serviceSegments){const center=activeServiceAngle(seg,t);if(Math.abs(angleDiff(a,center))<=seg.span/2)return true}
  return false;
}
function industryAtAngle(a){for(const seg of industrySegments){if(Math.abs(angleDiff(a,seg.a))<=seg.span/2)return true}return false}
function isStableAngle(a){return stableAngles.some(sa=>Math.abs(angleDiff(a,sa))<0.020)}
function isTrafficAngle(a){return stableAngles.some(sa=>Math.abs(angleDiff(a,sa+trafficOffset))<0.030)}

function beginPoly(){ctx.beginPath()}
function ringShape(innerFn,outerFn,start=0,end=TAU,steps=220){
  const pts=[];for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;const r=outerFn(a);pts.push([Math.cos(a)*r,Math.sin(a)*r])}
  for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps;const r=innerFn(a);pts.push([Math.cos(a)*r,Math.sin(a)*r])}
  beginPoly();pts.forEach((p,i)=>{const s=worldToScreen(p[0],p[1]);if(i===0)ctx.moveTo(...s);else ctx.lineTo(...s)});ctx.closePath();
}
function fillStroke(fill,stroke,width=1){if(fill){ctx.fillStyle=fill;ctx.fill()}const borders=document.getElementById('showBorders');if(stroke&&(!borders||borders.checked)){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function drawGrid(){
  ctx.save();ctx.strokeStyle=COLORS.grid;ctx.lineWidth=1;ctx.globalAlpha=.45;
  for(let r=40;r<=180;r+=20){const s=worldToScreen(0,0);ctx.beginPath();ctx.arc(s[0],s[1],r*view.scale,0,TAU);ctx.stroke()}
  for(let i=0;i<16;i++){const a=i*TAU/16;const p1=worldToScreen(0,0),p2=worldToScreen(Math.cos(a)*190,Math.sin(a)*190);ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke()}
  ctx.restore();
}
function drawCore(li){
  const [x,y]=worldToScreen(0,0);ctx.beginPath();ctx.arc(x,y,27*view.scale,0,TAU);ctx.fillStyle=COLORS.core;ctx.fill();ctx.strokeStyle='#9fb4c0';ctx.lineWidth=1.2;ctx.stroke();
  ctx.fillStyle='#dfe9ef';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.max(10,11*view.scale)}px sans-serif`;ctx.fillText('稳定核心',x,y-3*view.scale);ctx.fillStyle='#a7bac6';ctx.font=`${Math.max(8,8.5*view.scale)}px sans-serif`;ctx.fillText('定轴接口',x,y+10*view.scale);
}
function drawResidential(li,t,outlineOnly=false){
  ringShape(()=>32, a=>residentialOuter(li,a,t));fillStroke(outlineOnly?null:COLORS.home,outlineOnly?'#78b2ca':'#689db2',outlineOnly?1.8:1);
  if(!outlineOnly){
    // 细分生活运行段，但不制造大块无用途空地。
    ctx.save();ctx.strokeStyle='rgba(205,232,242,.18)';ctx.lineWidth=1;
    for(let i=0;i<18;i++){const a=i*TAU/18+0.025;const r1=36,r2=residentialOuter(li,a,t)-2;const p1=worldToScreen(Math.cos(a)*r1,Math.sin(a)*r1),p2=worldToScreen(Math.cos(a)*r2,Math.sin(a)*r2);ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke()}
    ctx.restore();
  }
}
function drawArcBand(li,t,seg,type,outlineOnly=false){
  const center=type==='service'?activeServiceAngle(seg,t):seg.a;const start=center-seg.span/2,end=center+seg.span/2;
  let inner,outer,color,stroke;
  if(type==='service'){inner=a=>serviceInner(li,a,t);outer=a=>Math.max(inner(a)+8,serviceOuter(li,a,t));color=COLORS.service;stroke='#98c5a2'}
  else{inner=a=>Math.max(serviceOuter(li,a,t)+2,industryInner(li,a,t));outer=a=>Math.max(inner(a)+7,industryOuter(li,a,t));color=COLORS.industry;stroke='#bf8a80'}
  ringShape(inner,outer,start,end,64);fillStroke(outlineOnly?null:color,stroke,outlineOnly?1.8:1);
}
function drawOuterInterfaces(li,outlineOnly=false){
  const pieces=12;for(let i=0;i<pieces;i++){if(i%3===1)continue;const start=i*TAU/pieces+.02,end=(i+1)*TAU/pieces-.03;ringShape(a=>outerInterfaceInner(li,a),a=>baseOuter(li,a),start,end,28);fillStroke(outlineOnly?null:COLORS.outer,'#99aab4',outlineOnly?1.5:.8)}
}
function drawStableAndTraffic(li){
  const maxR=190;
  if(document.getElementById('showTraffic').checked){ctx.save();ctx.strokeStyle=COLORS.traffic;ctx.lineWidth=Math.max(5,7*view.scale);ctx.lineCap='butt';for(const a0 of stableAngles){const a=a0+trafficOffset,p1=worldToScreen(Math.cos(a)*30,Math.sin(a)*30),p2=worldToScreen(Math.cos(a)*maxR,Math.sin(a)*maxR);ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke()}ctx.restore()}
  if(document.getElementById('showStable').checked){ctx.save();ctx.strokeStyle=COLORS.stable;ctx.lineWidth=Math.max(2.5,3.5*view.scale);ctx.lineCap='round';for(let i=0;i<stableAngles.length;i++){const a=stableAngles[i],p1=worldToScreen(Math.cos(a)*28,Math.sin(a)*28),p2=worldToScreen(Math.cos(a)*182,Math.sin(a)*182);ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke();if(i===0){const lp=worldToScreen(Math.cos(a)*116,Math.sin(a)*116);ctx.fillStyle='#f4d77f';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('祝遥所在固定辐带',lp[0]+6,lp[1]-7)}}ctx.restore()}
}
function drawLayer(li,t,alpha=1,projection=false,outlineOnly=false){
  ctx.save();ctx.globalAlpha=alpha;
  if(projection){
    // 投影显示整个上层可能遮挡的主要结构，不画细功能颜色。
    ringShape(()=>28,a=>baseOuter(li,a));fillStroke(COLORS.upper,COLORS.upperLine,1);ctx.restore();return;
  }
  drawResidential(li,t,outlineOnly);
  serviceSegments.forEach(s=>drawArcBand(li,t,s,'service',outlineOnly));
  industrySegments.forEach(s=>drawArcBand(li,t,s,'industry',outlineOnly));
  drawOuterInterfaces(li,outlineOnly);
  if(!outlineOnly){drawStableAndTraffic(li);drawCore(li)}
  ctx.restore();
}
function drawLowerOutline(li,t){ctx.save();ctx.globalAlpha=.8;ringShape(()=>28,a=>baseOuter(li,a));fillStroke(null,COLORS.lower,2);ctx.restore()}
function drawSkyCorridors(){
  ctx.save();
  for(const a of stableAngles){
    const half=.032,start=a-half,end=a+half;
    ringShape(()=>28,()=>184,start,end,12);
    ctx.fillStyle='rgba(242,215,139,.18)';ctx.fill();
    ctx.strokeStyle='rgba(242,215,139,.72)';ctx.lineWidth=1;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawLabels(li,t){
  if(document.getElementById('viewMode').value==='outline')return;
  const labels=[
    {text:'普通生活区（面积主体）',a:3.62,r:79,color:'#d2edf7'},
    {text:'公共服务 / 较大商业',a:1.72,r:132,color:'#d9f1dd'},
    {text:'生产物流',a:2.42,r:149,color:'#f0d0ca'},
    {text:'外缘接口',a:4.00,r:163,color:'#d7e0e5'}
  ];
  ctx.save();ctx.font='12px sans-serif';ctx.textAlign='center';for(const l of labels){const p=worldToScreen(Math.cos(l.a)*l.r,Math.sin(l.a)*l.r);ctx.fillStyle=l.color;ctx.fillText(l.text,p[0],p[1])}ctx.restore();
}

function drawSunLegend(li){
  const mode=document.getElementById('viewMode').value;if(mode!=='sun')return;
  const x=18,y=84;ctx.save();ctx.fillStyle='rgba(5,12,18,.82)';ctx.fillRect(x,y,280,63);ctx.strokeStyle='#2f4b5d';ctx.strokeRect(x+.5,y+.5,279,62);
  ctx.fillStyle='#e9f1f6';ctx.font='12px sans-serif';ctx.fillText('日照检查',x+10,y+18);ctx.fillStyle='#aebfca';ctx.font='11px sans-serif';ctx.fillText('深色区域 = 上一高度层的平面投影',x+10,y+36);ctx.fillText('当前层伸出投影之外的部分更容易获得直接天空光',x+10,y+52);ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle=COLORS.bg;ctx.fillRect(0,0,W,H);drawGrid();
  const li=selectedLayer(),mode=document.getElementById('viewMode').value;
  if(document.getElementById('showLower').checked&&li>0)drawLowerOutline(li-1,currentTime);
  drawLayer(li,currentTime,1,false,mode==='outline');
  if(mode!=='outline'&&(mode==='sun'||document.getElementById('showUpper').checked)&&li<LEVELS-1)drawLayer(li+1,currentTime,1,true,false);
  if(mode==='sun')drawSkyCorridors();
  if(mode!=='outline'){drawStableAndTraffic(li);drawCore(li);drawLabels(li,currentTime);}
  drawSunLegend(li);drawProfile();
}

function drawProfile(){
  const r=profile.getBoundingClientRect(),pw=r.width,ph=r.height;pctx.clearRect(0,0,pw,ph);pctx.fillStyle='#08131c';pctx.fillRect(0,0,pw,ph);
  const ang=(+document.getElementById('sectionAngle').value)*Math.PI/180;const center=pw/2,maxR=190,scale=(pw*.43)/maxR;
  pctx.strokeStyle='#264052';pctx.lineWidth=1;pctx.beginPath();pctx.moveTo(center,8);pctx.lineTo(center,ph-8);pctx.stroke();
  for(let li=0;li<LEVELS;li++){
    const y=ph-18-li*((ph-32)/(LEVELS-1));const left=baseOuter(li,ang+Math.PI),right=baseOuter(li,ang);
    pctx.strokeStyle=li===selectedLayer()?'#e3eef4':'#6e8898';pctx.lineWidth=li===selectedLayer()?3:1.5;pctx.beginPath();pctx.moveTo(center-left*scale,y);pctx.lineTo(center+right*scale,y);pctx.stroke();
    pctx.fillStyle=li===selectedLayer()?'#f4d77f':'#9bb0bd';pctx.font='10px sans-serif';pctx.textAlign='left';pctx.fillText('L'+(li+1),6,y+3);
  }
  pctx.fillStyle='#7f95a3';pctx.font='9px sans-serif';pctx.textAlign='center';pctx.fillText('← 该方向背面伸出      中央      该方向伸出 →',center,12);
}

function updateUI(){
  const hh=Math.floor(currentTime)%24,mm=Math.floor((currentTime-hh)*60);document.getElementById('timeLabel').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  document.getElementById('homeAmpLabel').textContent=homeAmp();document.getElementById('serviceAmpLabel').textContent=document.getElementById('serviceAmp').value;document.getElementById('sectionAngleLabel').textContent=document.getElementById('sectionAngle').value;
  const li=selectedLayer(),probe=0.6;const mv=Math.round(stretchFactor(li,probe,currentTime)*homeAmp());document.getElementById('moveMetric').textContent=(mv>=0?'+':'')+mv+' u';
  const seg=serviceSegments[0],d=Math.round(angleDiff(activeServiceAngle(seg,currentTime),seg.a)*180/Math.PI);document.getElementById('serviceMetric').textContent=(d>=0?'+':'')+d+'°';
}
function tick(now){if(playing){const dt=(now-lastT)/1000;currentTime=(currentTime+dt*1.25)%24;document.getElementById('time').value=currentTime}lastT=now;updateUI();draw();requestAnimationFrame(tick)}

// hover 仅给出结构解释，不追求精准建筑拾取。
canvas.addEventListener('mousemove',e=>{
  const [x,y]=screenToWorld(e.clientX,e.clientY),r=Math.hypot(x,y),a=normAngle(Math.atan2(y,x)),li=selectedLayer();let info=null;
  if(r<28)info=['稳定核心区','大型医院、大学、城市级公共设施、交通与部分高稳定住宅依附中央定轴和固定骨架。','核心'];
  else if(isStableAngle(a))info=['固定辐向高稳定住宅带','面积占比很小，像一条从核心穿向外侧的细街带。长期不参与普通住宅伸缩，并保留稳定采光与连续道路。','高稳定住宅'];
  else if(isTrafficAngle(a))info=['主干交通带','普通居民进入中央的重要净空通道。承担通勤、疏散、消防、运输和模块迁位，不连续布置沿街住宅。','交通'];
  else if(r<=residentialOuter(li,a,currentTime))info=['普通生活区','城市面积与人口主体。住宅、邻里商业、社区服务集中在这里，并按运行段有限伸缩与迁位。','生活'];
  else if(serviceAtAngle(a,currentTime)&&r<=serviceOuter(li,a,currentTime)+3)info=['复合公共服务 / 较大型商业','学校与片区市场、医疗、体育、图书馆、公共办事等组合为较大的服务运行段，只在本地服务范围内调位。','公共服务'];
  else if(industryAtAngle(a)&&r<=industryOuter(li,a,currentTime)+4)info=['生产物流运行段','中型工厂、装配、维修、仓储、货运和工人服务。通常位于生活与公共服务之外或外缘运输更方便的位置。','生产物流'];
  else if(r<=baseOuter(li,a)+3)info=['外缘接口','城墙、维护、交通、生产和特殊接口的组合边界。不同方向不会形成完全相同的整齐圆环。','外缘'];
  hovered=info;if(info){hover.style.display='block';hover.style.left=Math.min(W-320,e.clientX+14)+'px';hover.style.top=Math.min(H-100,e.clientY+14)+'px';hover.innerHTML='<b>'+info[0]+'</b><br>'+info[1]+'<br><span class="tag">'+info[2]+'</span>'}else hover.style.display='none';
});
canvas.addEventListener('mouseleave',()=>hover.style.display='none');
let dragging=false,dragStart=null,viewStart=null;
canvas.addEventListener('mousedown',e=>{dragging=true;dragStart=[e.clientX,e.clientY];viewStart=[view.cx,view.cy]});
window.addEventListener('mouseup',()=>dragging=false);window.addEventListener('mousemove',e=>{if(dragging){view.cx=viewStart[0]+e.clientX-dragStart[0];view.cy=viewStart[1]+e.clientY-dragStart[1]}});
canvas.addEventListener('wheel',e=>{e.preventDefault();const before=screenToWorld(e.clientX,e.clientY);view.scale=Math.max(.45,Math.min(3,view.scale*Math.exp(-e.deltaY*.001)));const after=screenToWorld(e.clientX,e.clientY);view.cx+=(after[0]-before[0])*view.scale;view.cy+=(after[1]-before[1])*view.scale},{passive:false});

document.getElementById('fitBtn').onclick=resetView;
document.getElementById('focusZhuyao').onclick=()=>{view.cx=(W-330)/2-55;view.cy=H/2;view.scale=Math.min(2,Math.max(1.25,view.scale*1.45))};
document.getElementById('play').onclick=function(){playing=!playing;this.textContent=playing?'❚❚ 暂停':'▶ 播放'};
document.getElementById('time').addEventListener('input',e=>{currentTime=+e.target.value});
['levelSelect','viewMode','showUpper','showLower','showStable','showTraffic','showBorders','homeAmp','serviceAmp','sectionAngle'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{updateUI();draw()}));

const levelSelect=document.getElementById('levelSelect');for(let i=0;i<LEVELS;i++){const o=document.createElement('option');o.value=i;o.textContent='L'+(i+1);if(i===2)o.selected=true;levelSelect.appendChild(o)}
window.addEventListener('resize',resize);resize();updateUI();requestAnimationFrame(tick);
})();
