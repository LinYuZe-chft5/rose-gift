(() => {
  'use strict';
  const canvas = document.querySelector('#golden');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const query = new URLSearchParams(location.search);
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  const glow = document.createElement('canvas');
  glow.setAttribute('aria-hidden', 'true'); glow.style.pointerEvents = 'none';
  canvas.after(glow);
  const glowContext = glow.getContext('2d');
  const bloomSource = document.createElement('canvas');
  const bloomContext = bloomSource.getContext('2d');
  const model = window.STARDUST_DATA;
  const encoded = atob(window.STARDUST_DATA.data);
  const bytes = Uint8Array.from(encoded, c => c.charCodeAt(0));
  const points = new Float32Array(bytes.buffer);
  const baseAlpha = new Float32Array(model.routes.map(r => points[r[0]*12+5]));
  let width, height, ratio, scale, origin, frame = 0, elapsed = 0, last = 0;
  let paused = false, burst = -100, pointer = [-9999, -9999];
  const frozen = () => media.matches || query.get('freeze') === '1';
  const vertex = `precision highp float;
    attribute vec2 home; attribute vec3 color; attribute vec4 props; attribute vec3 flow;
    uniform vec2 view,origin,mouse; uniform float scale,dpr,time,freeze,burst; uniform sampler2D silhouette;
    varying vec3 tint; varying float opacity,bright;
    void main(){
      float seed=props.z,face=flow.y;
      float t=time; vec2 tangent=vec2(props.w,flow.x);
      float phase=home.y*.045+home.x*.019-t*1.15+seed*.35;
      float envelope=1.;
      float support=1.-step(0.,flow.z);
      float drift=mix(min(11.,max(0.,flow.z)*.32),.45,face)*(1.-support);
      vec2 normal=vec2(-tangent.y,tangent.x);
      vec2 p=home+tangent*sin(phase)*drift+normal*cos(phase)*drift*.3;
      float drawOrder=clamp((home.y-208.)/562.,0.,1.);
      float localTime=clamp((time-drawOrder*2.6)/2.2,0.,1.);
      float gather=localTime*localTime*(3.-2.*localTime);
      float age=time-burst;
      float scatter=1.-gather;
      if(age>=0.&&age<5.)scatter=max(scatter,sin(age/5.*3.14159265)*.85);
      if(freeze>.5){scatter=0.;p=home;envelope=1.;gather=1.;}
      p+=scatter*(-tangent*(90.+seed*100.)+normal*sin(seed*6.283+time)*35.);
      vec2 screen=origin+p*scale;
      vec2 delta=screen-mouse;
      screen+=delta*exp(-dot(delta,delta)/3500.)*.06*(1.-face);
      gl_Position=vec4(screen/view*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
      float pulse=freeze>.5?1.:mix(.90+.10*sin(time*(.7+seed)+seed*130.),1.,support);
      bright=step(3.8,props.y);
      gl_PointSize=clamp(props.y*max(.7,scale)*dpr*6.,3.,75.);
      float mask=texture2D(silhouette,p/vec2(478.,850.)).r;
      opacity=props.x*pulse*(.15+.85*gather)*mix(mask,1.,scatter);
      tint=color;
    }`;
  const fragment = `precision mediump float; varying vec3 tint; varying float opacity,bright;
    void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);
      float core=exp(-r*65.);float halo=exp(-r*8.)*.19+exp(-r*2.8)*.035;
      float cross=(exp(-abs(p.x)*95.-abs(p.y)*13.)+exp(-abs(p.y)*95.-abs(p.x)*13.))*.065*bright;
      gl_FragColor=vec4(tint*(core+halo+cross)*opacity,1.);
    }`;
  let program, buffer, uniforms;
  const fallback = !gl ? canvas.getContext('2d') : null;
  function init() {
    if (!gl) return;
    program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    for (const [name, size, offset] of [['home', 2, 0], ['color', 3, 2], ['props', 4, 5], ['flow', 3, 9]]) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 48, offset * 4);
    }
    uniforms = Object.fromEntries(['view', 'origin', 'mouse', 'scale', 'dpr', 'time', 'freeze', 'burst'].map(k => [k, gl.getUniformLocation(program, k)]));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    const maskBytes=Uint8Array.from(atob(model.mask),c=>c.charCodeAt(0));
    const maskTexture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,maskTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,478,850,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,maskBytes);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program,'silhouette'),0);
  }
  function resize() {
    width = innerWidth; height = innerHeight; ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    glow.width = canvas.width; glow.height = canvas.height;
    bloomSource.width = Math.round(width*.5); bloomSource.height = Math.round(height*.5);
    const header = document.querySelector('header').getBoundingClientRect();
    const footer = document.querySelector('footer').getBoundingClientRect();
    const top = header.bottom + 22, bottom = footer.top - 22;
    const b = model.bounds;
    scale = Math.min((bottom-top)/(b[3]-b[1]+32), width*.82/(b[2]-b[0]+24));
    origin = [width / 2 - model.center * scale, (top+bottom)/2-(b[1]+b[3])/2*scale];
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    render(elapsed);
  }
  function render(time) {
    const t = frozen() ? 8 : time;
    for (let routeIndex=0; routeIndex<model.routes.length; routeIndex++) {
      const [id, pathId, phase, offset, speed] = model.routes[routeIndex];
      const path = model.paths[pathId];
      const progress = ((phase+t*speed)%1+1)%1;
      const u = progress*(model.openPaths ? path.length-1 : path.length);
      const a = path[Math.floor(u)], b = path[(Math.floor(u)+1)%path.length];
      const f = u-Math.floor(u), dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy)||1;
      points[id*12] = a[0]+dx*f-dy/len*offset;
      points[id*12+1] = a[1]+dy*f+dx/len*offset;
      points[id*12+5] = baseAlpha[routeIndex]*(model.openPaths ? Math.min(1,progress*10,(1-progress)*10) : 1);
    }
    if (gl) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, points);
      gl.clearColor(.012, .025, .033, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.view, width, height); gl.uniform2f(uniforms.origin, ...origin);
      gl.uniform2f(uniforms.mouse, ...pointer);
      for (const [key, value] of Object.entries({ scale, dpr: ratio, time, freeze: frozen() ? 1 : 0, burst })) gl.uniform1f(uniforms[key], value);
      gl.drawArrays(gl.POINTS, 0, window.STARDUST_DATA.count);
      // Full-frame two-scale bloom, separate from each particle's local halo.
      bloomContext.clearRect(0,0,bloomSource.width,bloomSource.height);
      bloomContext.filter = 'brightness(1.1)';
      bloomContext.drawImage(canvas,0,0,bloomSource.width,bloomSource.height);
      glowContext.clearRect(0,0,glow.width,glow.height);
      glowContext.globalCompositeOperation = 'screen';
      for (const [radius, alpha] of [[3,.18],[10,.08]]) {
        glowContext.filter = `blur(${radius*ratio}px)`;
        glowContext.globalAlpha = alpha;
        glowContext.drawImage(bloomSource,0,0,glow.width,glow.height);
      }
      glowContext.globalAlpha = 1; glowContext.filter = 'none';
    } else {
      fallback.setTransform(ratio, 0, 0, ratio, 0, 0);
      fallback.fillStyle = '#030609'; fallback.fillRect(0, 0, width, height);
      for (let i = 0; i < points.length; i += 24) {
        fallback.fillStyle = `rgba(${points[i+2]*255},${points[i+3]*255},${points[i+4]*255},${points[i+5]})`;
        fallback.fillRect(origin[0]+points[i]*scale, origin[1]+points[i+1]*scale, 1, 1);
      }
    }
    window.goldenStatus = { renderer: gl ? 'WebGL stardust + dual-scale bloom' : 'Canvas fallback', time, count: model.count, paths: model.paths.length, center: model.center, reducedMotion: media.matches, scale, origin, bounds: { left: origin[0]+model.bounds[0]*scale, right: origin[0]+model.bounds[2]*scale, top: origin[1]+model.bounds[1]*scale, bottom: origin[1]+model.bounds[3]*scale } };
  }
  function tick(now) {
    if (paused || document.hidden) return;
    if (last && !frozen()) elapsed += Math.max(0,Math.min(now-last, 64))/1000;
    last = now; render(elapsed);
    if (!frozen()) frame = requestAnimationFrame(tick);
  }
  function resume() { cancelAnimationFrame(frame); last = 0; if (!paused) tick(performance.now()); }
  const replay = () => { burst = elapsed; render(elapsed); };
  addEventListener('resize', resize);
  addEventListener('pointermove', e => { pointer = [e.clientX, e.clientY]; });
  addEventListener('pointerout', () => { pointer = [-9999, -9999]; });
  canvas.addEventListener('pointerdown', replay);
  document.querySelector('#bloom').addEventListener('click', replay);
  document.addEventListener('visibilitychange', resume); media.addEventListener('change', resume);
  addEventListener('pagehide', () => { cancelAnimationFrame(frame); last = 0; });
  addEventListener('pageshow', resume);
  init(); resize(); resume();
  window.goldenQA = { pause: () => { paused = true; cancelAnimationFrame(frame); }, renderAt: render };
})();