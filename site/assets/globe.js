/* ALDA — desk globe (three.js): textured Earth tilted on its axis, brass meridian,
   stem and turned wooden base. Africa faces the visitor; drag to spin. */
(function () {
  var host = document.querySelector('.js-globe');
  if (!host || typeof THREE === 'undefined') return;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { host.classList.add('is-fallback'); return; }
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0xffffff, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = false;
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.35, 8.2);
  camera.lookAt(0, -0.35, 0);

  // light: soft sky + warm key + cool rim
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4cc, 0.85));
  var key = new THREE.DirectionalLight(0xfff4e6, 1.05); key.position.set(-4, 3.5, 5); scene.add(key);
  var rim = new THREE.DirectionalLight(0xcfe0ff, 0.45); rim.position.set(4, 1, -3); scene.add(rim);

  var R = 1.25;
  var TILT = 23.4 * Math.PI / 180;
  var root = new THREE.Group();
  scene.add(root);

  // ---- materials
  var brass = new THREE.MeshStandardMaterial({ color: 0xb8924a, metalness: 0.55, roughness: 0.32 });
  var wood = new THREE.MeshStandardMaterial({ color: 0x24150c, metalness: 0.1, roughness: 0.42 });

  // ---- base (turned wood) + stem
  var prof = [
    [0.0, 0], [0.82, 0], [0.86, 0.03], [0.86, 0.08], [0.8, 0.12], [0.5, 0.17], [0.26, 0.24],
    [0.2, 0.33], [0.22, 0.4], [0.14, 0.46], [0.1, 0.5], [0.0, 0.5]
  ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
  var base = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), wood);
  var baseY = -R - 0.75;
  base.position.y = baseY;
  root.add(base);

  var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.62, 24), brass);
  stem.position.y = baseY + 0.5 + 0.31;
  root.add(stem);

  // ---- tilted assembly: meridian ring + axis + globe
  var tilt = new THREE.Group();
  tilt.rotation.z = TILT;
  root.add(tilt);

  var meridianR = R + 0.11;
  var meridian = new THREE.Mesh(new THREE.TorusGeometry(meridianR, 0.028, 16, 160, Math.PI * 1.25), brass);
  meridian.rotation.z = -Math.PI * 0.625; // arc from below the south pole, round the right side, past the north pole
  tilt.add(meridian);
  // graduation ticks on the meridian
  var tickGeo = new THREE.BoxGeometry(0.012, 0.06, 0.06);
  for (var t = 0; t < 46; t++) {
    var ang = -Math.PI * 0.625 + (t / 45) * Math.PI * 1.25;
    var tick = new THREE.Mesh(tickGeo, brass);
    tick.position.set(Math.cos(ang) * (meridianR + 0.035), Math.sin(ang) * (meridianR + 0.035), 0);
    tick.rotation.z = ang + Math.PI / 2;
    tilt.add(tick);
  }
  // axis pins + caps
  var pinGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 12);
  var capGeo = new THREE.SphereGeometry(0.04, 16, 12);
  [1, -1].forEach(function (s) {
    var pin = new THREE.Mesh(pinGeo, brass); pin.position.y = s * (R + 0.07); tilt.add(pin);
    var cap = new THREE.Mesh(capGeo, brass); cap.position.y = s * (meridianR + 0.03); tilt.add(cap);
  });

  // the ring has to meet the stem: the bottom of the tilted meridian is where the stem ends
  var bottom = new THREE.Vector3(0, -meridianR, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), TILT);
  var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 24), brass);
  collar.position.set(bottom.x, bottom.y, 0);
  root.add(collar);
  base.position.x = bottom.x;
  // soft contact shadow under the base
  var sc = document.createElement('canvas'); sc.width = sc.height = 128;
  var sg = sc.getContext('2d'), grd = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(11,11,12,0.35)'); grd.addColorStop(1, 'rgba(11,11,12,0)');
  sg.fillStyle = grd; sg.fillRect(0, 0, 128, 128);
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(bottom.x, baseY - 0.005, 0);
  root.add(shadow);
  // centre the whole object (globe + offset stand) in the frame
  root.position.x = -bottom.x * 0.5;
  stem.position.x = bottom.x;
  stem.scale.y = (bottom.y - (baseY + 0.5)) / 0.62;
  stem.position.y = baseY + 0.5 + (bottom.y - (baseY + 0.5)) / 2;

  // ---- the Earth
  var spin = new THREE.Group();
  tilt.add(spin);
  var loader = new THREE.TextureLoader();
  var src = host.getAttribute('data-src') || 'assets/img/';
  var map = loader.load(src + 'earth.jpg', function () { host.classList.add('is-ready'); });
  map.encoding = THREE.sRGBEncoding;
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  var bump = loader.load(src + 'earth-bump.jpg');
  var earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 64),
    new THREE.MeshStandardMaterial({ map: map, bumpMap: bump, bumpScale: 0.025, roughness: 0.62, metalness: 0.0 })
  );
  spin.add(earth);
  // varnish highlight
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.003, 64, 48),
    new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, shininess: 90, specular: 0xffffff })));

  // ---- Brazzaville marker
  function llToVec(lat, lng, r) {
    var phi = (90 - lat) * Math.PI / 180, th = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  }
  var bzv = llToVec(-4.27, 15.27, R);
  var dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: 0x1d3bff }));
  dot.position.copy(bzv).multiplyScalar(1.006);
  spin.add(dot);
  var ringMat = new THREE.MeshBasicMaterial({ color: 0x1d3bff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.045, 0.06, 40), ringMat);
  ring.position.copy(bzv).multiplyScalar(1.008);
  ring.lookAt(bzv.clone().multiplyScalar(2));
  spin.add(ring);

  // start with Africa facing the viewer (compensating the axial tilt)
  var homeY = Math.atan2(-bzv.x, bzv.z) - 0.25;
  spin.rotation.y = homeY;

  // ---- interaction
  var vel = 0.0016, dragging = false, lastX = 0, tiltX = 0, tTiltX = 0, idle = 0;
  host.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    tTiltX = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    spin.rotation.y += dx * 0.008; vel = dx * 0.0006; idle = 0;
  });
  host.addEventListener('pointerup', function () { dragging = false; });
  host.addEventListener('pointerleave', function () { tTiltX = 0; });

  function size() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.85 ? 8.2 / Math.max(w / h, 0.55) * 0.85 : 8.2;
    camera.updateProjectionMatrix();
  }
  size();
  window.addEventListener('resize', size);

  var visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(host);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 16.67, 3); last = now;
    if (!visible) return;
    if (!dragging && !reduced) {
      vel += (0.0016 - vel) * 0.02;
      spin.rotation.y += vel * dt;
    }
    tiltX += (tTiltX - tiltX) * 0.06;
    root.rotation.x = tiltX;
    root.rotation.y = Math.sin(now / 4000) * 0.06;
    var p = (now / 1600) % 1;
    ring.scale.setScalar(1 + p * 2.2);
    ringMat.opacity = 0.9 * (1 - p);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
