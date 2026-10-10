/* ALDA — holographic point cloud: a rotating sphere that morphs into the map of Africa.
   Requires three.js (global THREE). Exposes window.AldaAfrica = { setMorph(v) }. */
(function () {
  var host = document.querySelector('.js-africa');
  if (!host) return;
  if (typeof THREE === 'undefined') { document.documentElement.classList.add('no-webgl'); return; }

  // Simplified coastline, [lon, lat]
  var AFRICA = [
    [-5.9,35.8],[-1,35.1],[3,36.8],[10.2,37.2],[11,35.5],[10,33.5],[11.5,33.1],[15,32.3],[18,30.6],[20,30.9],
    [20.1,32.2],[23,32.6],[25,31.6],[29.9,31.2],[32.3,31.3],[32.5,29.9],[33.6,27],[35.6,23.1],[37.2,21],[38.6,18],
    [39.7,15.1],[41.7,13.4],[43.3,12.5],[44.5,10.4],[48,11.2],[51.2,11.8],[51,10.4],[49.8,7.5],[48,4.5],[46,2],
    [43,-0.5],[41.5,-1.8],[40,-3.5],[39.2,-6],[39.6,-8.5],[40.4,-10.5],[40.6,-15],[36.8,-18],[35.5,-21],[35.4,-24],
    [32.9,-26],[32.5,-28.5],[31,-30],[28.5,-32.6],[25.6,-33.9],[22,-34.2],[20,-34.8],[18.4,-34.2],[18.2,-31.6],[16.5,-28.6],
    [15.2,-26.7],[14.4,-22.9],[12.5,-18.5],[11.8,-15.8],[12.3,-13],[13.6,-11],[13.2,-8.8],[12.3,-6.1],[11.8,-4.5],[9.6,-1.5],
    [9.3,0.5],[9.6,3.8],[8.5,4.5],[6,4.3],[4.4,6.4],[1.5,6.1],[-2,4.7],[-4.5,5.2],[-7.5,4.4],[-9.3,5.5],
    [-11.5,6.9],[-13.2,8.5],[-15,10.8],[-16.7,12.4],[-17.5,14.7],[-16.5,16.2],[-16.1,19],[-17,21],[-15.9,23.7],[-14.5,26.1],
    [-13.1,27.7],[-10.2,29.3],[-9.8,31.2],[-8.5,33.3],[-6.8,34.1]
  ];
  var MADAGASCAR = [
    [49.3,-12],[50.5,-15.5],[49.4,-17.8],[47.1,-24.9],[45.2,-25.5],[43.6,-23.5],[43.3,-21.8],[44.4,-19.6],[44,-17],[46.3,-15.8],[48,-13.6]
  ];
  var BZV = [15.27, -4.27];

  function inside(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }

  var small = window.innerWidth < 861;
  var STEP = small ? 1.25 : 0.85;          // degrees between dots
  var S = 2.7 / 73;                          // degrees -> world units
  var CX = 17, CY = 1.5;                     // map centre
  function toWorld(lon, lat) { return [(lon - CX) * S, (lat - CY) * S]; }

  // dotted map on a staggered grid
  var map = [];
  for (var lat = 38; lat >= -36; lat -= STEP) {
    var row = Math.round((38 - lat) / STEP);
    for (var lon = -19 + (row % 2) * STEP / 2; lon <= 52; lon += STEP) {
      if (inside(lon, lat, AFRICA) || inside(lon, lat, MADAGASCAR)) map.push(toWorld(lon, lat));
    }
  }
  var N = map.length;

  var pos = new Float32Array(N * 3), sph = new Float32Array(N * 3), rnd = new Float32Array(N);
  var R = 1.3, golden = Math.PI * (3 - Math.sqrt(5));
  // sort map by y so the morph sweeps north → south
  map.sort(function (a, b) { return b[1] - a[1]; });
  for (var i = 0; i < N; i++) {
    pos[i * 3] = map[i][0];
    pos[i * 3 + 1] = map[i][1];
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = golden * i;
    sph[i * 3] = Math.cos(t) * r * R;
    sph[i * 3 + 1] = y * R;
    sph[i * 3 + 2] = Math.sin(t) * r * R;
    rnd[i] = Math.random();
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0xffffff, 0);
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSphere', new THREE.BufferAttribute(sph, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));

  var uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uSpin: { value: 0 },
    uSize: { value: small ? 5.5 : 6.5 },
    uPR: { value: DPR },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uBzv: { value: new THREE.Vector2(toWorld(BZV[0], BZV[1])[0], toWorld(BZV[0], BZV[1])[1]) }
  };

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: [
      'attribute vec3 aSphere; attribute float aRnd;',
      'uniform float uTime, uMorph, uSpin, uSize, uPR; uniform vec2 uMouse, uBzv;',
      'varying float vRnd; varying float vDepth; varying float vGlow; varying float vY;',
      'void main(){',
      '  float c = cos(uSpin), s = sin(uSpin);',
      '  vec3 sp = vec3(aSphere.x*c + aSphere.z*s, aSphere.y, -aSphere.x*s + aSphere.z*c);',
      '  sp *= 1.0 + 0.025*sin(uTime*1.3 + aRnd*12.0);',
      '  float m = smoothstep(aRnd*0.35, aRnd*0.35 + 0.65, uMorph);',
      '  vec3 p = mix(sp, position, m);',
      '  p.z += sin(uTime*1.6 + position.x*6.0 + position.y*4.0) * 0.035 * m;',
      '  float d = distance(position.xy, uMouse);',
      '  p.z += smoothstep(0.55, 0.0, d) * 0.22 * m;',
      '  float b = distance(position.xy, uBzv);',
      '  float ring = fract(uTime*0.35);',
      '  vGlow = m * smoothstep(0.06, 0.0, abs(b - ring*0.9)) * (1.0 - ring);',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  float twinkle = 0.75 + 0.25*sin(uTime*2.0 + aRnd*40.0);',
      '  gl_PointSize = uSize * uPR * twinkle * (1.0 + vGlow*1.2) * (5.0 / -mv.z);',
      '  vRnd = aRnd; vDepth = mix(smoothstep(-1.4, 1.4, sp.z), 1.0, m); vY = p.y;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime;',
      'varying float vRnd; varying float vDepth; varying float vGlow; varying float vY;',
      'void main(){',
      '  vec2 q = gl_PointCoord - 0.5; float r = length(q);',
      '  if (r > 0.5) discard;',
      '  float a = smoothstep(0.5, 0.2, r);',
      '  vec3 ink = vec3(0.043, 0.043, 0.047);',
      '  vec3 blue = vec3(0.114, 0.231, 1.0);',
      '  vec3 cyan = vec3(0.0, 0.70, 0.86);',
      '  vec3 violet = vec3(0.49, 0.30, 1.0);',
      '  float h = fract(vRnd*0.6 + vY*0.25 + uTime*0.04);',
      '  vec3 holo = h < 0.5 ? mix(blue, cyan, h*2.0) : mix(cyan, violet, (h-0.5)*2.0);',
      '  vec3 col = mix(ink, holo, step(0.62, vRnd) * 0.9);',
      '  col = mix(col, blue, vGlow);',
      '  gl_FragColor = vec4(col, a * mix(0.18, 0.95, vDepth));',
      '}'
    ].join('\n')
  });

  var points = new THREE.Points(geo, mat);
  var group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // Brazzaville marker
  var bz = toWorld(BZV[0], BZV[1]);
  var dotGeo = new THREE.CircleGeometry(0.035, 24);
  var dotMat = new THREE.MeshBasicMaterial({ color: 0x1d3bff, transparent: true, opacity: 0 });
  var dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.set(bz[0], bz[1], 0.05);
  group.add(dot);
  var ringMat = new THREE.MeshBasicMaterial({ color: 0x1d3bff, transparent: true, opacity: 0, side: THREE.DoubleSide });
  var ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.068, 48), ringMat);
  ringMesh.position.copy(dot.position);
  group.add(ringMesh);

  var label = document.querySelector('.js-africa-label');

  function size() {
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the map fully visible on narrow screens
    camera.position.z = w / h < 0.8 ? 6.2 / Math.max(w / h, 0.45) * 0.8 : 6.2;
    camera.updateProjectionMatrix();
    // leave room for the headline: map to the right on wide screens, lower on narrow ones
    var wide = w / h > 1.2;
    group.position.set(wide ? Math.min(1.6, (w / h - 1) * 1.6) : 0, wide ? -0.05 : -0.45, 0);
  }
  size();
  window.addEventListener('resize', size);

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
  });
  host.addEventListener('pointerleave', function () { mouse.tx = 0; mouse.ty = 0; });

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: '100px' }).observe(host);
  }

  var target = 0, morph = 0, spin = 0, last = performance.now();
  var v3 = new THREE.Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible) return;
    morph += (target - morph) * Math.min(1, dt * 6);
    spin += dt * (0.35 + (1 - morph) * 0.25);
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 4);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 4);

    uniforms.uTime.value = now / 1000;
    uniforms.uMorph.value = morph;
    uniforms.uSpin.value = spin;

    group.rotation.y = mouse.x * 0.25;
    group.rotation.x = -mouse.y * 0.18 + (1 - morph) * 0.25;

    // mouse in map space for the ripple
    var vw = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
    uniforms.uMouse.value.set(mouse.x * vw * camera.aspect / 2 - group.position.x, mouse.y * vw / 2 - group.position.y);

    var mk = Math.max(0, (morph - 0.8) / 0.2);
    dotMat.opacity = mk;
    var pr = (now / 1000 * 0.8) % 1;
    ringMesh.scale.setScalar(1 + pr * 3);
    ringMat.opacity = mk * (1 - pr);

    if (label) {
      dot.getWorldPosition(v3); v3.project(camera);
      label.style.transform = 'translate(' + ((v3.x + 1) / 2 * host.clientWidth + 36) + 'px,' + ((1 - v3.y) / 2 * host.clientHeight - 8) + 'px)';
      label.style.opacity = mk;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.AldaAfrica = {
    setMorph: function (v) { target = Math.max(0, Math.min(1, v)); },
    count: N
  };
})();
