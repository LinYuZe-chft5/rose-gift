(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  window.enterGoldenMeadow = () => { location.href = 'golden/index.html'; };
  if (query.get('scene') === 'meadow') window.enterGoldenMeadow();
  return;
  if (query.has('lab')) return;
  const TAU = Math.PI * 2;
  let scene, bg, dog, fx, fg, bgx, dogx, fxx, fgx;
  let W = 0, H = 0, DPR = 1, active = false, raf = 0, rnd;
  let plants = [], motes = [], petals = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };

  function createScene() {
    scene=document.createElement('section'); scene.id='golden-meadow'; scene.setAttribute('aria-hidden','true');
    scene.innerHTML='<canvas id="gm-backdrop" class="gm-layer"></canvas><div class="gm-sunwash"></div><canvas id="gm-petals" class="gm-layer"></canvas><canvas id="gm-motion" class="gm-layer"></canvas><canvas id="gm-foreground" class="gm-layer"></canvas>';
    document.body.appendChild(scene);
    bg=scene.querySelector('#gm-backdrop'); dog=scene.querySelector('#gm-petals'); fx=scene.querySelector('#gm-motion'); fg=scene.querySelector('#gm-foreground');
    bgx=bg.getContext('2d'); dogx=dog.getContext('2d'); fxx=fx.getContext('2d'); fgx=fg.getContext('2d');
  }
  function fit(c,x){c.width=Math.round(W*DPR);c.height=Math.round(H*DPR);c.style.width=W+'px';c.style.height=H+'px';x.setTransform(DPR,0,0,DPR,0,0);}
  function flower(x,cx,cy,r,a,alpha=1){x.save();x.translate(cx,cy);x.rotate(a);x.globalAlpha=alpha;for(let i=0;i<6;i++){x.rotate(Math.PI/3);x.beginPath();x.ellipse(0,-r*.62,r*.36,r*.72,0,0,TAU);x.fillStyle=i%2?'#fffdf0':'#e9eee0';x.fill();}x.beginPath();x.arc(0,0,r*.22,0,TAU);x.fillStyle='#d6c76c';x.fill();x.restore();}

  function buildGarden(){
    rnd=seeded(80423);plants=[];
    const g=bgx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#142719');g.addColorStop(.52,'#294d29');g.addColorStop(1,'#122317');bgx.fillStyle=g;bgx.fillRect(0,0,W,H);
    for(let i=0;i<Math.round(W*H/1100);i++){const x=rnd()*W,y=rnd()*H,d=.25+y/H*.75,l=(8+rnd()*31)*d,b=(rnd()-.5)*11;bgx.strokeStyle=`rgba(${35+rnd()*30},${75+rnd()*55},${30+rnd()*25},${.25+d*.4})`;bgx.lineWidth=.6+d*1.5;bgx.beginPath();bgx.moveTo(x,y+l);bgx.quadraticCurveTo(x+b,y+l*.45,x+b*.4,y);bgx.stroke();}
    for(let i=0;i<Math.max(125,Math.round(W*H/2600));i++){const y=rnd()*H*.94,x=rnd()*W,d=.3+y/H*.8,r=(1.2+rnd()*3.2)*d;bgx.strokeStyle=`rgba(112,143,69,${.35+d*.4})`;bgx.lineWidth=Math.max(.55,r*.18);bgx.beginPath();bgx.moveTo(x,y+r*4.5);bgx.quadraticCurveTo(x+r,y+r*2,x,y);bgx.stroke();flower(bgx,x,y,r,rnd()*TAU,.42+d*.48);}
    const light=bgx.createRadialGradient(W*.12,H*.08,0,W*.12,H*.08,Math.max(W,H)*.62);light.addColorStop(0,'rgba(239,223,111,.24)');light.addColorStop(1,'rgba(239,223,111,0)');bgx.fillStyle=light;bgx.fillRect(0,0,W,H);
    fgx.clearRect(0,0,W,H);for(let i=0;i<Math.max(28,W/10);i++){const x=rnd()*W,y=H*(.77+rnd()*.25),h=28+rnd()*85,r=3.5+rnd()*5;plants.push({x,y:y-h,r,p:rnd()*TAU,s:.45+rnd()*.4});fgx.strokeStyle=`rgba(${45+rnd()*35},${88+rnd()*45},${28+rnd()*25},.9)`;fgx.lineWidth=1.2+rnd()*1.8;fgx.beginPath();fgx.moveTo(x,y);fgx.quadraticCurveTo(x+(rnd()-.5)*16,y-h*.45,x,y-h);fgx.stroke();if(rnd()>.35)flower(fgx,x,y-h,r,rnd()*TAU,.92);}
    motes=Array.from({length:reduced?0:18},()=>({x:rnd()*W,y:rnd()*H*.8,r:.5+rnd()*1.4,p:rnd()*TAU,s:.12+rnd()*.25}));
  }

  function regions(){
    const s=Math.min(W/390,H/844),cx=W/2,top=H*.04;
    const R=(name,x,y,rx,ry,dir,density,pal)=>({name,x:cx+x*s,y:top+y*s,rx:rx*s,ry:ry*s,dir,density,pal});
    return [
      R('earL',-102,157,48,119,.22,.9,'ear'),R('earR',102,154,48,119,2.92,.9,'ear'),
      R('head',0,139,120,127,-1.45,1.2,'face'),R('cheekL',-68,220,65,64,-2.6,1.2,'face'),R('cheekR',68,220,65,64,-.54,1.2,'face'),
      R('neck',0,303,112,88,1.57,1.08,'chest'),R('chest',0,400,132,125,1.57,1.2,'chest'),
      R('bodyL',-82,511,92,151,1.92,.9,'body'),R('bodyR',82,511,92,151,1.22,.9,'body'),
      R('legL',-70,650,46,151,1.64,1.1,'leg'),R('legR',70,650,46,151,1.5,1.1,'leg'),
      R('pawL',-70,779,62,39,1.57,1.28,'paw'),R('pawR',70,779,62,39,1.57,1.28,'paw')];
  }
  const colors={face:['#fff0c3','#f5d99a','#e8b969','#d89443','#b96f2e'],chest:['#fff3c9','#ffe0a1','#f2c778','#dca052','#b97631'],ear:['#e4a555','#d99143','#bd7130','#a65d29','#8d4b23'],body:['#edb461','#d99542','#c77c32','#a95f28','#8c4b22'],leg:['#f2c679','#d99a4c','#bf7730','#a45c28','#e5aa59'],paw:['#ffe0a0','#eab66d','#cf8b3e','#b36a2d','#f5c982']};
  const inside=(r,x,y)=>((x-r.x)**2/r.rx**2+(y-r.y)**2/r.ry**2)<1;
  function drawPetal(x,p){
    const w=p.size,h=w*(1.55+p.curve*.35);x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.globalAlpha=p.alpha;
    const g=x.createLinearGradient(-w*.4,-h*.7,w*.35,h*.65);g.addColorStop(0,'#fff5ca');g.addColorStop(.22,p.color);g.addColorStop(.76,p.color);g.addColorStop(1,'#82431f');x.fillStyle=g;
    x.beginPath();x.moveTo(0,-h*.72);x.bezierCurveTo(w*.82,-h*.42,w*.7,h*.4,0,h*.72);x.bezierCurveTo(-w*.7,h*.4,-w*.82,-h*.42,0,-h*.72);x.fill();
    x.strokeStyle='rgba(255,241,181,.43)';x.lineWidth=Math.max(.35,w*.1);x.stroke();x.strokeStyle='rgba(91,45,21,.28)';x.lineWidth=Math.max(.3,w*.065);x.beginPath();x.moveTo(0,-h*.5);x.quadraticCurveTo(w*.08,0,0,h*.52);x.stroke();x.restore();
  }
  function drawFace(rs){
    const h=rs.find(r=>r.name==='head'),s=Math.min(W/390,H/844),x=h.x,y=h.y+42*s;dogx.save();
    const muzzle=dogx.createRadialGradient(x-15*s,y-5*s,2,x,y+8*s,65*s);muzzle.addColorStop(0,'rgba(255,239,195,.94)');muzzle.addColorStop(1,'rgba(207,159,94,.82)');dogx.fillStyle=muzzle;dogx.beginPath();dogx.ellipse(x,y+8*s,63*s,48*s,-.02,0,TAU);dogx.fill();
    dogx.fillStyle='#4b2b1e';dogx.beginPath();dogx.ellipse(x-30*s,y-24*s,12*s,9*s,-.1,0,TAU);dogx.ellipse(x+30*s,y-24*s,12*s,9*s,.1,0,TAU);dogx.fill();dogx.fillStyle='#120d0c';dogx.beginPath();dogx.arc(x-29*s,y-24*s,4.5*s,0,TAU);dogx.arc(x+29*s,y-24*s,4.5*s,0,TAU);dogx.fill();dogx.fillStyle='#fff5d7';dogx.beginPath();dogx.arc(x-32*s,y-27*s,1.9*s,0,TAU);dogx.arc(x+27*s,y-27*s,1.9*s,0,TAU);dogx.fill();
    const nose=dogx.createRadialGradient(x-7*s,y-4*s,1,x,y+3*s,23*s);nose.addColorStop(0,'#85604a');nose.addColorStop(.38,'#39251e');nose.addColorStop(1,'#100c0b');dogx.fillStyle=nose;dogx.beginPath();dogx.ellipse(x,y+3*s,23*s,16*s,0,0,TAU);dogx.fill();dogx.fillStyle='rgba(255,235,202,.35)';dogx.beginPath();dogx.ellipse(x-8*s,y-3*s,6*s,3*s,-.25,0,TAU);dogx.fill();
    dogx.strokeStyle='#281615';dogx.lineWidth=4*s;dogx.lineCap='round';dogx.beginPath();dogx.moveTo(x,y+17*s);dogx.quadraticCurveTo(x-2*s,y+30*s,x-18*s,y+35*s);dogx.moveTo(x,y+17*s);dogx.quadraticCurveTo(x+2*s,y+30*s,x+18*s,y+35*s);dogx.stroke();dogx.fillStyle='#cf626c';dogx.beginPath();dogx.ellipse(x+2*s,y+44*s,11*s,18*s,.12,0,TAU);dogx.fill();dogx.strokeStyle='rgba(120,39,50,.65)';dogx.lineWidth=1.3*s;dogx.beginPath();dogx.moveTo(x+2*s,y+31*s);dogx.lineTo(x+3*s,y+56*s);dogx.stroke();dogx.restore();
  }
  function buildDog(){
    petals=[];const rs=regions(),quality=W<500?1:1.28;
    for(const r of rs){const count=Math.round(r.rx*r.ry*.145*r.density*quality);let n=0,t=0;while(n<count&&t++<count*9){const x=r.x+(rnd()-.5)*r.rx*2,y=r.y+(rnd()-.5)*r.ry*2;if(!inside(r,x,y))continue;const list=colors[r.pal],size=(r.name==='head'||r.name.includes('cheek')?3.5:4.1)+rnd()*3.2;petals.push({x,y,size:size*(.8+rnd()*.28),rot:r.dir+(rnd()-.5)*(r.name.includes('paw')?.55:.82)+(y-r.y)/r.ry*.2,curve:rnd(),color:list[Math.min(list.length-1,Math.floor(rnd()*list.length*1.15))],alpha:.82+rnd()*.18,z:rnd()});n++;}}
    petals.sort((a,b)=>a.z-b.z);dogx.clearRect(0,0,W,H);dogx.save();dogx.globalAlpha=.34;dogx.fillStyle='#603416';for(const r of rs){dogx.beginPath();dogx.ellipse(r.x,r.y,r.rx,r.ry,0,0,TAU);dogx.fill();}dogx.restore();for(const p of petals)drawPetal(dogx,p);drawFace(rs);
  }
  function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);[[bg,bgx],[dog,dogx],[fx,fxx],[fg,fgx]].forEach(([c,x])=>fit(c,x));buildGarden();buildDog();}
  function animate(now){if(!active)return;raf=requestAnimationFrame(animate);fxx.clearRect(0,0,W,H);const t=now*.001;for(const p of plants){const sway=Math.sin(t*p.s+p.p)*2.4;fxx.strokeStyle='rgba(105,145,62,.68)';fxx.lineWidth=1.2;fxx.beginPath();fxx.moveTo(p.x,p.y+p.r*5);fxx.quadraticCurveTo(p.x+sway*.3,p.y+p.r*2,p.x+sway,p.y);fxx.stroke();flower(fxx,p.x+sway,p.y,p.r,p.p+t*.025,.6);}for(const m of motes){fxx.fillStyle='rgba(255,239,174,.32)';fxx.beginPath();fxx.arc(m.x+Math.sin(t*m.s+m.p)*12,m.y+Math.cos(t*m.s*.7+m.p)*8,m.r,0,TAU);fxx.fill();}}
  window.enterGoldenMeadow=()=>{if(active)return;active=true;scene.setAttribute('aria-hidden','false');requestAnimationFrame(()=>scene.classList.add('gm-visible'));raf=requestAnimationFrame(animate);};
  createScene();resize();addEventListener('resize',resize,{passive:true});addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});if(query.get('scene')==='meadow')window.enterGoldenMeadow();
})();