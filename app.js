(function(){
  const boot=document.getElementById('boot'), error=document.getElementById('error');
  if(!window.THREE || !THREE.OrbitControls){
    document.getElementById('loading').style.display='none'; error.style.display='block';
    error.innerHTML='<b>Three.js 未能加载。</b><br>这个页面本身完整，但首次打开需要网络访问 jsDelivr CDN。请检查网络后刷新。'; return;
  }
  const C={skeleton:0x8796a5,ring:0x516879,home:0x5e93ad,stable:0xd7b36b,traffic:0x34495e,service:0x77b989,industry:0xa8766b,void:0x6fe8ff,axis:0xaeb8c2,route:0xffe084};
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x071019); scene.fog=new THREE.FogExp2(0x071019,.0020);
  const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputEncoding=THREE.sRGBEncoding; document.getElementById('scene').appendChild(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.1,2000); camera.position.set(210,155,230);
  const controls=new THREE.OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07; controls.target.set(0,40,0); controls.maxDistance=650; controls.minDistance=35;
  scene.add(new THREE.HemisphereLight(0xa8cbea,0x15202a,.75));
  const sun=new THREE.DirectionalLight(0xfff3d1,1.55); sun.position.set(-160,190,80); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-260;sun.shadow.camera.right=260;sun.shadow.camera.top=260;sun.shadow.camera.bottom=-260;sun.shadow.camera.near=.1;sun.shadow.camera.far=600; scene.add(sun);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(155,175,8,96),new THREE.MeshStandardMaterial({color:0x111b22,roughness:.9,metalness:.15})); floor.position.y=-8; floor.receiveShadow=true; scene.add(floor);
  const grid=new THREE.GridHelper(420,42,0x274051,0x172733); grid.position.y=-3.8; scene.add(grid);

  const groups={skeleton:new THREE.Group(),homes:new THREE.Group(),stable:new THREE.Group(),traffic:new THREE.Group(),service:new THREE.Group(),industry:new THREE.Group(),voids:new THREE.Group(),routes:new THREE.Group()}; Object.values(groups).forEach(g=>scene.add(g));
  const levelYs=[4,24,44,64,84,104,124], levelR=[74,86,98,109,119,128,136];
  const interactive=[], movers=[]; let schoolObj=null, routeLine=null, currentTime=7.5;
  function mat(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:opts.roughness??.72,metalness:opts.metalness??.15,transparent:!!opts.transparent,opacity:opts.opacity??1,side:THREE.DoubleSide,depthWrite:opts.depthWrite??true});}
  function add(mesh,group,name,desc,type){mesh.userData={name,desc,type};mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);if(name)interactive.push(mesh);return mesh}
  function box(w,h,d,color,group,pos,name,desc,type,opacity=1){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,{transparent:opacity<1,opacity}));m.position.set(...pos);return add(m,group,name,desc,type)}
  function polar(r,a,y){return [Math.cos(a)*r,y,Math.sin(a)*r]}
  function orientRadial(o,a){o.rotation.y=-a;return o}

  const axis=new THREE.Group(); groups.skeleton.add(axis);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(33,46,28,24),mat(0x788896,{metalness:.35}));base.position.y=10;base.castShadow=true;base.receiveShadow=true;axis.add(base);base.userData={name:'中央定轴下部',desc:'重型铁路、最大质量吞吐、核心市政与垂直升运的稳定基础。',type:'skeleton'};interactive.push(base);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(20,28,118,24),mat(C.axis,{metalness:.38}));shaft.position.y=77;shaft.castShadow=true;axis.add(shaft);shaft.userData={name:'中央定轴',desc:'长期固定的垂直交通与承力核心。大型医院、大学、城市级设施与部分高稳定住宅靠近这里。',type:'skeleton'};interactive.push(shaft);
  const crown=new THREE.Mesh(new THREE.CylinderGeometry(37,19,10,32),mat(0x8aa2b4,{metalness:.4}));crown.position.y=142;axis.add(crown);crown.userData={name:'顶部空运中心',desc:'城市与天空的边界设施。大型空船、航空器、紧急物资和快速客运在此接入。',type:'skeleton'};interactive.push(crown);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const p=polar(43,a,142);box(13,2.2,5,0xb7c5d0,groups.skeleton,p,null,null,'skeleton');}

  levelYs.forEach((y,li)=>{
    const r=levelR[li];
    [r-2.2,r+2.2].forEach((rr,ri)=>{
      const rail=new THREE.Mesh(new THREE.TorusGeometry(rr,.48,6,128),mat(ri?0x61788a:C.ring,{metalness:.42}));
      rail.rotation.x=Math.PI/2;rail.position.y=y-3;rail.castShadow=true;groups.skeleton.add(rail);
      if(ri===0){rail.userData={name:`第 ${li+1} 高度固定环架`,desc:'长期固定的是承力环架、环轨与接口。真正占据城市面积的是分段生活、公共服务与生产模块，它们并不构成实心整圆。',type:'skeleton'};interactive.push(rail);}
    });
    for(let s=0;s<8;s++){const a=s*Math.PI/4;const len=r-25;const p=polar(25+len/2,a,y-3);const bridge=box(len,1.15,2.0,C.skeleton,groups.skeleton,p,null,null,'skeleton');orientRadial(bridge,a);}
  });

  const stableAngles=[0,Math.PI/2,Math.PI,Math.PI*1.5];
  stableAngles.forEach((a,si)=>levelYs.forEach((y,li)=>{
    const r0=31,r1=levelR[li]+26,len=r1-r0;const p=polar((r0+r1)/2,a,y+2);
    const deck=box(len,2.2,13,C.stable,groups.stable,p,`固定辐向住宅带 ${si+1} · L${li+1}`,'不参加普通住宅的日常伸缩。沿途住宅、商铺与社区设施连续向中央连接。','stable');orientRadial(deck,a);
    for(let k=0;k<Math.floor(len/14);k++){
      const rr=r0+8+k*14, side=(k%2?1:-1);const q=polar(rr,a,y+7+(k%3)*1.3);q[0]+=Math.cos(a+Math.PI/2)*side*7.2;q[2]+=Math.sin(a+Math.PI/2)*side*7.2;
      const b=box(8,8+(k%3)*2,6,0xc6a664,groups.stable,q,null,null,'stable');orientRadial(b,a);
    }
  }));

  stableAngles.forEach((a,si)=>levelYs.forEach((y,li)=>{
    const offA=a+0.085, r0=32,r1=levelR[li]+25,len=r1-r0,p=polar((r0+r1)/2,offA,y+1.2);
    const road=box(len,.9,9,C.traffic,groups.traffic,p,`主干交通带 ${si+1}`,'高流量通勤、撤离、消防、大型运输与模块迁位需要的长期净空，不布置连续住宅。','traffic');orientRadial(road,offA);
  }));

  levelYs.forEach((y,li)=>{
    const baseR=levelR[li]+15;
    for(let seg=0;seg<12;seg++){
      const a=seg*Math.PI*2/12 + 0.19 + (li%2)*.045;
      if(stableAngles.some(sa=>Math.abs(Math.atan2(Math.sin(a-sa),Math.cos(a-sa)))<.20)) continue;
      const g=new THREE.Group();groups.homes.add(g);const phase=(seg*.77+li*.39)%6.28;g.userData={baseR,a,phase,li,type:'homeMover'};movers.push(g);
      const p=polar(baseR,a,y+2);g.position.set(...p);g.rotation.y=-a;
      const deck=new THREE.Mesh(new THREE.BoxGeometry(36,2.6,34),mat(C.home));deck.castShadow=true;deck.receiveShadow=true;g.add(deck);
      deck.userData={name:`生活组团 L${li+1}-${seg+1}`,desc:'完整居民邻里：住宅、餐饮、便利商业、社区服务和内部公共空间共同迁位。它不是一栋小住宅，也不会因公共服务区离开就变成空壳。',type:'home'};interactive.push(deck);
      const housePos=[[-11,-10],[-2,-11],[8,-10],[-11,2],[9,2],[-8,11],[3,11],[12,10]];
      housePos.forEach((q,k)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(6.5,9+((seg+k+li)%5)*2.2,6.5),mat(k%3===0?0x79a7b8:0x6797ac));b.position.set(q[0],6,q[1]);b.castShadow=true;b.receiveShadow=true;g.add(b)});
      const commerce=new THREE.Mesh(new THREE.BoxGeometry(8,4.5,27),mat(0x789b99));commerce.position.set(-15,3.3,0);commerce.castShadow=true;commerce.receiveShadow=true;g.add(commerce);
      const court=new THREE.Mesh(new THREE.BoxGeometry(8,.35,9),mat(0x526c61));court.position.set(1,3.05,0);court.receiveShadow=true;g.add(court);
    }
  });

  const serviceLevel=3, serviceY=levelYs[serviceLevel], serviceR=levelR[serviceLevel]+18;
  const sg=new THREE.Group(); groups.service.add(sg); schoolObj=sg; sg.userData={baseR:serviceR,baseA:.72};
  box(44,3.0,58,C.service,sg,[0,0,0],'复合公共服务区','学校并不单独漂移。它与大型商业、片区医疗、体育训练、图书馆、公共办事及交通接口组成更大的服务运行段，在有限范围内整体调位。','service');
  box(18,8,22,0x6fae80,sg,[-10,5,-13],'片区学校','公共服务运行段中的学校部分，与同组团的其他大型服务共享交通、体育和后勤接口。','service');
  box(14,6,24,0x8ca66f,sg,[11,4,-12],'片区市场与商业','比邻里商业更大，承担跨多个生活组团的市场、餐饮和公共消费服务。','service');
  box(14,7,13,0x78a993,sg,[-11,4.5,14],'片区医疗与公共服务','片区医疗、图书馆、公共办事等共享稳定接口。','service');
  box(11,5,13,0x82a79c,sg,[12,3.5,15],'图书馆与公共办事','服务多个相邻生活组团的共享设施。','service');
  const sport=new THREE.Mesh(new THREE.BoxGeometry(16,.55,20),mat(0x4f785d));sport.position.set(1,2.0,13);sport.receiveShadow=true;sg.add(sport);sport.userData={name:'片区体育训练场',desc:'学校和居民共同使用的大型体育与训练设施，是公共服务组团面积的重要组成部分。',type:'service'};interactive.push(sport);
  [1,5].forEach((li,j)=>{const a=1.55+j*2.35,r=levelR[li]+17,p=polar(r,a,levelYs[li]+3);const gg=new THREE.Group();gg.position.set(...p);gg.rotation.y=-a;groups.service.add(gg);
    const d=new THREE.Mesh(new THREE.BoxGeometry(34,2.4,42),mat(0x669d78));d.castShadow=true;d.receiveShadow=true;gg.add(d);d.userData={name:`复合公共服务段 L${li+1}`,desc:'学校、市场、医疗、体育、图书馆等按片区组合，不是零散小建筑。',type:'service'};interactive.push(d);
    [[-8,-9],[8,-9],[-8,9],[8,9]].forEach((q,k)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(11,5+(k%2)*2,10),mat(0x77aa86));b.position.set(q[0],4,q[1]);b.castShadow=true;gg.add(b)});
  });

  for(let i=0;i<7;i++){const li=i%3,a=2.3+i*.46,r=levelR[li]+18,p=polar(r,a,levelYs[li]+3);const b=box(30,7+(i%3)*3,24,C.industry,groups.industry,p,'生产物流模块','中型工厂、装配、维修、仓储与货运接口。局部迁位服务于工序和物流，不与普通住宅混为一体。','industry');orientRadial(b,a)}

  stableAngles.forEach((a,si)=>{
    const p=polar(105,a,65);const v=box(120,138,15,C.void,groups.voids,p,`长期开放间隙 ${si+1}`,'上下层错位和净空共同保护的采光、通风、维修、飞行、交换与疏散空间。','void',.10);orientRadial(v,a);
  });
  groups.voids.visible=false;

  function setRoute(kind){groups.routes.clear(); routeLine=null; if(kind==='none')return;
    const t=currentTime, homeShift=calcMove(t), schoolA=calcSchoolA(t), y=serviceY+10; let pts=[];
    if(kind==='zhuyao'){
      const a=0, start=new THREE.Vector3(...polar(124,a,y)); const mid=new THREE.Vector3(...polar(55,a,y)); const end=new THREE.Vector3(...polar(serviceR,schoolA,y)); pts=[start,mid,end]; document.getElementById('routeNote').textContent='祝遥住在固定辐向住宅带，住宅和道路本体不随普通轮历伸缩；学校所在的复合公共服务运行段只在本地服务范围内移动，所以通学距离波动较小。';
    }else if(kind==='ordinary'){
      const a=.95, rr=126+homeShift*getHomeAmp(); const start=new THREE.Vector3(...polar(rr,a,y)); const junction=new THREE.Vector3(...polar(70,.90,y)); const end=new THREE.Vector3(...polar(serviceR,schoolA,y)); pts=[start,junction,end]; document.getElementById('routeNote').textContent='普通学生住宅可能从 A1 类节点局部换到 A3 类节点。路线随轮历更新，但不会出现住宅跑到城市另一端而无法回家。';
    }else{
      const a=2.0, rr=126+homeShift*getHomeAmp(); pts=[new THREE.Vector3(...polar(rr,a,y)),new THREE.Vector3(...polar(70,a,y)),new THREE.Vector3(24,y,0)]; document.getElementById('routeNote').textContent='普通居民通常先从邻里进入无连续建筑的主干交通带，再沿固定交通骨架进入中央稳定核心。';
    }
    const geo=new THREE.BufferGeometry().setFromPoints(pts);routeLine=new THREE.Line(geo,new THREE.LineBasicMaterial({color:C.route,linewidth:4}));groups.routes.add(routeLine);
    pts.forEach((p,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(2.1,16,16),mat(i===0?0xffcc66:0xffffcc));m.position.copy(p);groups.routes.add(m)});
  }

  function getHomeAmp(){return +document.getElementById('homeAmp').value}
  function getServiceAmp(){return THREE.MathUtils.degToRad(+document.getElementById('serviceAmp').value)}
  function calcMove(t){return Math.sin((t-5.5)/24*Math.PI*2)*.72 + Math.sin((t-12)/12*Math.PI*2)*.28}
  function calcSchoolA(t){
    const center=.72, amp=getServiceAmp(); let f;
    if(t<6) f=0;
    else if(t<8.5) f=-1;
    else if(t<15.5) f=-1+2*(t-8.5)/7;
    else if(t<18.5) f=1;
    else if(t<21.5) f=1-(t-18.5)/3;
    else f=0;
    return center+amp*.55*f;
  }
  function updateTime(t){currentTime=t;
    const mv=calcMove(t),amp=getHomeAmp(); movers.forEach(g=>{const local=mv*.72+Math.sin(t*.43+g.userData.phase)*.28;const r=g.userData.baseR+local*amp;const p=polar(r,g.userData.a,levelYs[g.userData.li]+2);g.position.set(...p)});
    const a=calcSchoolA(t),p=polar(serviceR,a,serviceY+5);schoolObj.position.set(...p);schoolObj.rotation.y=-a;
    const sunAngle=(t-6)/24*Math.PI*2;sun.position.set(Math.cos(sunAngle)*210,Math.max(12,Math.sin(sunAngle)*185),Math.sin(sunAngle*.92)*150);sun.intensity=(t<5||t>20)?.28:1.55;
    const hh=Math.floor(t)%24,mm=Math.floor((t-hh)*60);document.getElementById('timeLabel').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');document.getElementById('moveMetric').textContent=Math.round(Math.abs(mv)*amp)+' u';
    const delta=THREE.MathUtils.radToDeg(a-.72);document.getElementById('schoolMetric').textContent=(delta>=0?'+':'')+delta.toFixed(0)+'°';
    document.getElementById('homeAmpLabel').textContent=amp;document.getElementById('serviceAmpLabel').textContent=document.getElementById('serviceAmp').value;
    setRoute(document.getElementById('routeSelect').value);
  }

  const levelSelect=document.getElementById('levelSelect'); levelYs.forEach((_,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`L${i+1}`;if(i===3)o.selected=true;levelSelect.appendChild(o)});
  function applyView(){const mode=document.getElementById('viewMode').value,li=+levelSelect.value;
    groups.skeleton.visible=document.getElementById('showSkeleton').checked;groups.homes.visible=document.getElementById('showHomes').checked;groups.stable.visible=document.getElementById('showStable').checked;groups.traffic.visible=document.getElementById('showTraffic').checked;groups.service.visible=document.getElementById('showService').checked;groups.industry.visible=document.getElementById('showIndustry').checked;groups.voids.visible=document.getElementById('showVoids').checked;sun.visible=document.getElementById('showSun').checked;
    scene.traverse(o=>{if(o.userData && o.userData._viewHidden){o.visible=true;o.userData._viewHidden=false}});
    if(mode==='skeleton'){groups.homes.visible=false;groups.stable.visible=false;groups.traffic.visible=false;groups.service.visible=false;groups.industry.visible=false;groups.voids.visible=false;groups.skeleton.visible=true;}
    if(mode==='voids'){groups.homes.visible=false;groups.stable.visible=false;groups.traffic.visible=false;groups.service.visible=false;groups.industry.visible=false;groups.skeleton.visible=true;groups.voids.visible=true;}
    if(mode==='level'){
      [groups.homes,groups.stable,groups.traffic,groups.service,groups.industry].forEach(g=>g.traverse(o=>{if(o.isMesh){const wy=new THREE.Vector3();o.getWorldPosition(wy);if(Math.abs(wy.y-levelYs[li])>15){o.visible=false;o.userData._viewHidden=true}}}));
    }
    if(mode==='section'){
      [groups.homes,groups.stable,groups.traffic,groups.service,groups.industry].forEach(g=>g.traverse(o=>{if(o.isMesh){const wp=new THREE.Vector3();o.getWorldPosition(wp);if(wp.z<0 || Math.abs(wp.z)>72){o.visible=false;o.userData._viewHidden=true}}}));
    }
  }
  document.querySelectorAll('#controls input[type=checkbox]').forEach(x=>x.addEventListener('change',applyView));document.getElementById('viewMode').addEventListener('change',applyView);levelSelect.addEventListener('change',applyView);document.getElementById('routeSelect').addEventListener('change',()=>setRoute(document.getElementById('routeSelect').value));
  ['homeAmp','serviceAmp'].forEach(id=>document.getElementById(id).addEventListener('input',()=>updateTime(currentTime)));
  document.querySelectorAll('[data-cam]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.cam;if(k==='iso'){camera.position.set(210,155,230);controls.target.set(0,45,0)}if(k==='top'){camera.position.set(0,390,.01);controls.target.set(0,35,0)}if(k==='side'){camera.position.set(340,75,0);controls.target.set(0,55,0)}if(k==='home'){camera.position.set(185,96,142);controls.target.set(105,64,0)}controls.update()}));
  const timeEl=document.getElementById('time');timeEl.addEventListener('input',()=>updateTime(+timeEl.value));let playing=false,last=performance.now();document.getElementById('play').addEventListener('click',e=>{playing=!playing;e.currentTarget.textContent=playing?'Ⅱ 暂停':'▶ 播放'});

  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),card=document.getElementById('hoverCard');renderer.domElement.addEventListener('pointermove',ev=>{mouse.x=ev.clientX/innerWidth*2-1;mouse.y=-(ev.clientY/innerHeight*2-1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(interactive.filter(o=>o.visible),true);const hit=hits.find(h=>h.object.userData&&h.object.userData.name);if(hit){const d=hit.object.userData;card.style.display='block';card.style.left=Math.min(ev.clientX+14,innerWidth-300)+'px';card.style.top=Math.min(ev.clientY+14,innerHeight-120)+'px';card.innerHTML=`<b>${d.name}</b><br>${d.desc||''}<br><span class="tag">${d.type||'结构'}</span>`}else card.style.display='none'});

  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  updateTime(currentTime);applyView();boot.style.display='none';
  function animate(now){requestAnimationFrame(animate);if(playing){const dt=(now-last)/1000;let t=(+timeEl.value+dt*1.2)%24;timeEl.value=t;updateTime(t)}last=now;controls.update();renderer.render(scene,camera)}requestAnimationFrame(animate);
})();
