/* ALDA — sphere made of "ALDA" motifs (canvas 2D). Rotates on its own, follows the pointer,
   and breathes open as the page scrolls. Usage: <canvas class="js-alda-sphere"></canvas> */
(function () {
  var canvas = document.querySelector('.js-alda-sphere');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var INK = '11,11,12', BLUE = '29,59,255';
  var small = window.innerWidth < 861;
  var N = small ? 90 : 150;
  var golden = Math.PI * (3 - Math.sqrt(5));

  // Each motif: a point on the sphere + a style
  var styles = [
    { w: 200, kind: 'fill', c: INK },
    { w: 400, kind: 'fill', c: INK },
    { w: 100, kind: 'fill', c: INK },
    { w: 500, kind: 'stroke', c: INK },
    { w: 300, kind: 'fill', c: BLUE },
    { w: 200, kind: 'dots', c: INK }
  ];
  var items = [];
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = golden * i;
    var pick = Math.random();
    var st = pick < 0.08 ? styles[4] : pick < 0.2 ? styles[3] : pick < 0.3 ? styles[5] : styles[Math.floor(Math.random() * 3)];
    items.push({ x: Math.cos(t) * r, y: y, z: Math.sin(t) * r, s: st, scale: 0.75 + Math.random() * 0.5, ph: Math.random() * 6.28 });
  }

  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2), R = 0;
  function size() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = Math.min(W, H) * 0.4;
  }
  size();
  window.addEventListener('resize', size);

  var rotY = 0, rotX = -0.25, vy = 0.0035, mx = 0, my = 0, tmx = 0, tmy = 0, open = 0;
  window.addEventListener('pointermove', function (e) {
    tmx = (e.clientX / window.innerWidth) * 2 - 1;
    tmy = (e.clientY / window.innerHeight) * 2 - 1;
  });
  // drag to spin
  var dragging = false, lastX = 0;
  canvas.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function (e) { if (!dragging) return; vy = (e.clientX - lastX) * 0.0009; lastX = e.clientX; });
  canvas.addEventListener('pointerup', function () { dragging = false; });

  var visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(canvas);

  function draw(time) {
    requestAnimationFrame(draw);
    if (!visible || !W) return;
    var hero = canvas.closest('section');
    if (hero) {
      var p = Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / (hero.offsetHeight || 1)));
      open += (p - open) * 0.12;
    }
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    if (!dragging) vy += (0.0035 - vy) * 0.02;
    if (!reduced) rotY += vy;
    var ax = rotX + my * 0.35, ay = rotY + mx * 0.5;
    var cy = Math.cos(ax), sy = Math.sin(ax), cr = Math.cos(ay), sr = Math.sin(ay);
    var radius = R * (1 + open * 0.9);
    var fs = Math.max(9, R * 0.085);

    ctx.clearRect(0, 0, W, H);
    // faint orbit lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + INK + ',' + (0.07 * (1 - open)) + ')';
    ctx.beginPath(); ctx.ellipse(W / 2, H / 2, radius * 1.08, radius * 1.08, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W / 2, H / 2, radius * 1.08, radius * 0.32, -0.35 + mx * 0.2, 0, Math.PI * 2); ctx.stroke();

    var list = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var x1 = it.x * cr + it.z * sr, z1 = -it.x * sr + it.z * cr;
      var y2 = it.y * cy - z1 * sy, z2 = it.y * sy + z1 * cy;
      list.push({ it: it, x: x1, y: y2, z: z2 });
    }
    list.sort(function (a, b) { return a.z - b.z; });

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var k = 0; k < list.length; k++) {
      var o = list[k], it = o.it;
      var depth = (o.z + 1) / 2;                       // 0 back → 1 front
      var persp = 0.62 + depth * 0.55;
      var px = W / 2 + o.x * radius, py = H / 2 + o.y * radius;
      var a = (0.08 + depth * 0.9) * (1 - open * 0.85);
      var size = fs * it.scale * persp * (1 + 0.04 * Math.sin(time / 600 + it.ph));
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(Math.max(0.35, Math.sqrt(Math.max(0, 1 - o.x * o.x))), 1); // wrap around the sphere
      ctx.font = it.s.w + ' ' + size.toFixed(1) + 'px Montserrat, system-ui, sans-serif';
      if (it.s.kind === 'stroke') {
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(' + it.s.c + ',' + a + ')'; ctx.strokeText('ALDA', 0, 0);
      } else if (it.s.kind === 'dots') {
        ctx.fillStyle = 'rgba(' + it.s.c + ',' + a + ')';
        ctx.font = '400 ' + (size * 0.7).toFixed(1) + 'px "JetBrains Mono", monospace';
        ctx.fillText('A·L·D·A', 0, 0);
      } else {
        ctx.fillStyle = 'rgba(' + it.s.c + ',' + a + ')'; ctx.fillText('ALDA', 0, 0);
      }
      ctx.restore();
    }
  }
  // wait for the font so the first frames are not drawn in a fallback face
  (document.fonts && document.fonts.load ? document.fonts.load('200 20px Montserrat') : Promise.resolve()).then(function () { requestAnimationFrame(draw); }, function () { requestAnimationFrame(draw); });
})();
