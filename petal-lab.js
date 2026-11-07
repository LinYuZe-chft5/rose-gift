(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('lab') !== 'petal') return;

  const TAU = Math.PI * 2;
  const palette = ['#FFF1D6','#F4D59B','#EFC477','#E9AE68','#D99143','#B96F35','#87502B'];
  const seed = n => () => { n |= 0; n = n + 0x6D2B79F5 | 0; let t=Math.imul(n^n>>>15,1|n); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };

  const PetalGeometry = {
    path(ctx, type, w, h, bend = 0) {
      ctx.beginPath();
      if (type === 'long') {
        ctx.moveTo(bend,-h*.76); ctx.bezierCurveTo(w*.62+bend,-h*.62,w*.56+bend,h*.28,bend*.2,h*.74); ctx.bezierCurveTo(-w*.48+bend,h*.4,-w*.66+bend,-h*.42,bend,-h*.76);
      } else if (type === 'curl') {
        ctx.moveTo(-w*.08+bend,-h*.74); ctx.bezierCurveTo(w*.72+bend,-h*.56,w*.78+bend,h*.2,w*.1+bend*.2,h*.72); ctx.bezierCurveTo(-w*.54+bend,h*.53,-w*.62+bend,-h*.22,-w*.08+bend,-h*.74);
      } else {
        ctx.moveTo(bend,-h*.64); ctx.bezierCurveTo(w*.86+bend,-h*.5,w*.85+bend,h*.31,bend*.15,h*.7); ctx.bezierCurveTo(-w*.8+bend,h*.4,-w*.88+bend,-h*.4,bend,-h*.64);
      }
    }
  };
  const PetalMaterial = {
    draw(ctx, p, shadow = true) {
      const w=p.size, h=w*(p.type==='long'?2.05:p.type==='curl'?1.72:1.58);
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rotation); ctx.globalAlpha=p.alpha;
      const surface=ctx.createRadialGradient(-w*.18,-h*.2,w*.08,w*.05,-h*.02,h*.82); surface.addColorStop(0,'#fff9e4'); surface.addColorStop(.2,p.color); surface.addColorStop(.62,p.color); surface.addColorStop(.86,'#b66a36'); surface.addColorStop(1,'#75401f'); ctx.fillStyle=surface;
      if (shadow) { ctx.shadowColor='rgba(62,31,14,.32)'; ctx.shadowBlur=4; ctx.shadowOffsetY=2; }
      PetalGeometry.path(ctx,p.type,w,h,p.bend || 0); ctx.fill(); ctx.shadowColor='transparent';
      ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=p.alpha*.34; const rim=ctx.createLinearGradient(-w,-h*.4,w,h*.2);rim.addColorStop(0,'rgba(255,250,221,0)');rim.addColorStop(.52,'rgba(255,245,200,.7)');rim.addColorStop(1,'rgba(255,250,221,0)');ctx.strokeStyle=rim;ctx.lineWidth=Math.max(1,w*.1);ctx.stroke();ctx.restore();
      ctx.strokeStyle='rgba(122,64,30,.28)'; ctx.lineWidth=Math.max(.45,w*.042); ctx.beginPath(); ctx.moveTo(0,-h*.54); ctx.bezierCurveTo(w*.12,-h*.18,-w*.09,h*.18,0,h*.55); ctx.stroke();
      ctx.strokeStyle='rgba(255,245,204,.3)'; ctx.lineWidth=Math.max(.3,w*.025); for(let i=-1;i<=1;i+=2){ctx.beginPath();ctx.moveTo(i*w*.08,-h*.3);ctx.quadraticCurveTo(i*w*.18,0,i*w*.08,h*.28);ctx.stroke();}
      ctx.restore();
    }
  };
  const PetalRenderer = {
    draw(ctx,p){ (Array.isArray(p) ? p : [p]).forEach(item => PetalMaterial.draw(ctx,item)); },
    make(x,y,size,rotation,type,color,alpha=1,depth=0){ return {x,y,size,rotation,type,color,alpha,depth}; }
  };
  const PetalCluster = {
    layered(random,cx,cy,count=15){
      const layers=[];
      for(let i=0;i<count;i++){
        const layer=i<5?0:i<10?1:2, angle=-Math.PI*.9+(i/(count-1))*Math.PI*1.8+(random()-.5)*.24;
        const radius=layer===0?30+random()*14:layer===1?20+random()*18:10+random()*19;
        layers.push(PetalRenderer.make(cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius*.52,layer===0?31+random()*7:layer===1?27+random()*8:23+random()*7,angle+Math.PI/2+(random()-.5)*.22, i%5===0?'curl':i%3===0?'long':'round',palette[1+layer+Math.floor(random()*2)],.72+random()*.25,layer+i*.01));
      }
      return layers.sort((a,b)=>a.depth-b.depth);
    },
    flow(random,cx,cy,count,mode){
      return Array.from({length:count},(_,i)=>{ const u=count<2?.5:i/(count-1), transverse=(random()-.5)*18, longitudinal=(u-.5)*150; let x=cx,y=cy,rotation;
        if(mode==='radial'){const a=-Math.PI*.82+u*Math.PI*1.64,r=24+u*105;x=cx+Math.cos(a)*r;y=cy+Math.sin(a)*r*.62;rotation=a+Math.PI/2;}
        else if(mode==='wrap'){x=cx+longitudinal;y=cy+Math.sin(u*Math.PI)*48+transverse;rotation=.18+u*.92;}
        else if(mode==='down'){x=cx+Math.sin(u*Math.PI)*42+transverse;y=cy+longitudinal;rotation=Math.PI/2+(x-cx)*.006;}
        else {x=cx+longitudinal;y=cy+Math.sin(u*TAU)*27+transverse;rotation=Math.atan2(Math.cos(u*TAU)*27,150)+Math.PI/2;}
        return PetalRenderer.make(x,y,11+Math.sin(u*Math.PI)*5+random()*3,rotation,mode==='down'?'long':i%5===0?'curl':'round',palette[1+Math.min(4,Math.floor(u*5))],.72+random()*.22);
      });
    }
  };
  const PetalFlowField = { draw(ctx,random,cx,cy){ [['radial',cx-72,cy-30],['wrap',cx+78,cy-30],['down',cx-76,cy+62],['cross',cx+76,cy+62]].forEach(([mode,x,y])=>PetalRenderer.draw(ctx,PetalCluster.flow(random,x,y,25,mode))); } };

  function panel(title, description, id) { return `<article class="pl-card"><h2>${title}</h2><p>${description}</p><canvas id="${id}"></canvas></article>`; }
  const root=document.createElement('section'); root.id='petal-lab'; root.innerHTML=`<div class="pl-shell"><header class="pl-heading"><h1>Petal Laboratory</h1><p>GOLDEN PETAL MASTERPIECE · 材质先行测试板<br>四个区域共享同一套花瓣几何、材质和光照系统。</p></header><main class="pl-grid">${panel('A · Single Petal','三种基础轮廓：细长水滴、宽圆弧、微卷曲。','pl-a')}${panel('B · Layered Bloom','不同角度、颜色与深度的自然叠层。','pl-b')}${panel('C · Curved Surface','左上暖光、基部阴影、中心脉络与边缘高光。','pl-c')}${panel('D · Petal Flow','放射、弧形、向下与交错毛流方向。','pl-d')}</main><div class="pl-footer">当前阶段只测试花瓣材质与组合，不绘制金毛主体，不包含汇聚动画。</div></div>`; document.body.appendChild(root);

  function canvas(id){ const c=root.querySelector('#'+id), rect=c.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2); c.width=rect.width*d;c.height=rect.height*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return [x,rect.width,rect.height]; }
  function base(x,w,h){ const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,238,190,.04)');g.addColorStop(1,'rgba(0,0,0,.18)');x.fillStyle=g;x.fillRect(0,0,w,h); }
  function render(){
    let [x,w,h]=canvas('pl-a');base(x,w,h);[['long',w*.22],['round',w*.5],['curl',w*.78]].forEach(([type,cx],i)=>PetalMaterial.draw(x,PetalRenderer.make(cx,h*.52,40,-.12+i*.08,type,palette[i+1],1)));
    [x,w,h]=canvas('pl-b');base(x,w,h);PetalRenderer.draw(x,PetalCluster.layered(seed(22),w*.5,h*.5,15));
    [x,w,h]=canvas('pl-c');base(x,w,h);for(let i=0;i<5;i++)PetalMaterial.draw(x,PetalRenderer.make(w*.22+i*w*.14,h*.53-i*3,38+i*2,-.3+i*.13,i%2?'curl':'round',palette[1+i],1));
    [x,w,h]=canvas('pl-d');base(x,w,h);PetalFlowField.draw(x,seed(44),w*.25,h*.45);
  }
  render(); addEventListener('resize',render,{passive:true});
})();
