/* ============================================================
   Shapeless — Hero 3D Vase  |  Three.js r128
   39 polyline continue dal Blade h37.obj
   Profondità: Fog + layer tratteggiato dietro
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('vaseCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ── Imposta dimensioni canvas PRIMA del renderer ─────── */
  // Three.js usa canvas.width/height come dimensione iniziale del contesto WebGL.
  // Se il canvas è 300×150 (default HTML) il renderer parte sbagliato su mobile.
  const isMobile = window.innerWidth < 768;
  (function setInitialSize() {
    var w = canvas.clientWidth  || (canvas.parentElement && canvas.parentElement.offsetWidth)  || window.innerWidth;
    var h = canvas.clientHeight || (isMobile ? 340 : window.innerHeight);
    if (w > 0 && h > 0) { canvas.width = w; canvas.height = h; }
  })();

  /* ── Renderer ─────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;

  /* ── Camera ───────────────────────────────────────────── */
  const camera   = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(isMobile ? 0 : -1.8, 0.2, isMobile ? 7.5 : 11.5);

  /* ── Scene + Fog ──────────────────────────────────────── */
  const scene = new THREE.Scene();
  scene.fog   = new THREE.Fog(0xfafaf8, 9.5, 14.5);   // fronte scuro, retro chiaro

  /* ── Clipping plane ───────────────────────────────────── */
  const YMIN = -2.2, YMAX = 2.2;
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), YMIN - 0.05);

  /* ── Ombra bordeaux sfumata ───────────────────────────── */
  function buildShadow() {
    const sc = document.createElement('canvas');
    sc.width = sc.height = 512;
    const ctx = sc.getContext('2d');
    // Gradiente radiale su canvas intero — nessun bordo netto
    const g = ctx.createRadialGradient(256,256,6, 256,256,256);
    g.addColorStop(0,    'rgba(60,10,30,0.32)');
    g.addColorStop(0.20, 'rgba(60,10,30,0.18)');
    g.addColorStop(0.45, 'rgba(60,10,30,0.07)');
    g.addColorStop(0.70, 'rgba(60,10,30,0.02)');
    g.addColorStop(1,    'rgba(60,10,30,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);   // riempie tutto il canvas, no ellisse netta
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(6.0, 5.0),   // più largo per sfumatura ampia
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent:true, depthWrite:false, fog:false })
    );
    m.rotation.x = -Math.PI/2; m.position.y = YMIN-0.05; m.renderOrder = -1;
    return m;
  }

  /* ── Costruisce le polyline dal modello reale ─────────── */
  function initVase() {
    const group = new THREE.Group();
    group.add(buildShadow());

    if (!window.BLADE_V || !window.BLADE_L) {
      console.warn('blade_geo.js non caricato'); return group;
    }

    const V = window.BLADE_V;   // flat xyz array
    const L = window.BLADE_L;   // lunghezze catene (Int32Array)

    // ── Piani di clip ─────────────────────────────────────
    // bottomClip ferma le linee del corpo leggermente sopra la base
    // → elimina il caos visivo dove i blade convergono in basso
    // Gli anelli (matRing) non usano bottomClip e mostrano il bordo pulito
    const bottomClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.15);

    // ── Materiali ─────────────────────────────────────────
    // Layer 1 — solido + fog: davanti bordeaux scuro, dietro sfuma al bianco
    const matSolid = new THREE.LineBasicMaterial({
      color: 0x4d0f2a, transparent: true, opacity: 0.80,
      fog: true, clippingPlanes: [clipPlane, bottomClip]
    });
    // Layer 2 — tratteggio + fog: le linee dietro mostrano i gap,
    //   davanti si sovrappongono al solido e sono quasi invisibili
    const matDash = new THREE.LineDashedMaterial({
      color: 0x5a1235, transparent: true, opacity: 0.55,
      dashSize: 0.22, gapSize: 0.18,
      fog: true, clippingPlanes: [clipPlane, bottomClip]
    });
    // Anelli base/top: netti, senza bottomClip — più marcati per definire la base
    const matRing = new THREE.LineBasicMaterial({
      color: 0x2a0615, transparent: true, opacity: 1.0,
      fog: false, clippingPlanes: [clipPlane]
    });

    let offset = 0;
    const nChains = L.length;

    for (let ci = 0; ci < nChains; ci++) {
      const len = L[ci];
      const pos = V.subarray(offset * 3, (offset + len) * 3);
      offset += len;

      // Media Y della catena → distingue base/top/corpo
      let avgY = 0;
      for (let i = 1; i < pos.length; i += 3) avgY += pos[i];
      avgY /= len;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));

      const isRing = (avgY < YMIN + 0.5) || (avgY > YMAX - 0.5);

      if (isRing) {
        group.add(new THREE.Line(geo, matRing));
      } else {
        // Corpo vaso: layer solido + layer tratteggiato sovrapposti
        const lineSolid = new THREE.Line(geo, matSolid);
        group.add(lineSolid);

        const g2 = new THREE.BufferGeometry();
        g2.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
        const lineDash = new THREE.Line(g2, matDash);
        lineDash.computeLineDistances();
        group.add(lineDash);
      }
    }

    scene.add(group);
    return group;
  }

  const vase = initVase();

  /* ── Anello stampa 3D ─────────────────────────────────── */
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6b1f45, transparent: true, opacity: 0, fog: false });
  const ring    = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.009, 6, 80), ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8a3060, transparent: true, opacity: 0, side: THREE.BackSide, fog: false });
  const glow    = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.048, 6, 80), glowMat);
  glow.rotation.x = Math.PI / 2;
  scene.add(glow);

  /* ── Interazione ──────────────────────────────────────── */
  const BUILD_MS = 5500;
  let buildStart = null, built = false;
  let tgtX = 0, tgtY = 0, curX = 0, curY = 0, idleY = 0;

  const hero = document.getElementById('hero3d');
  if (hero) {
    hero.addEventListener('mousemove', function(e) {
      if (!built) return;
      const r = hero.getBoundingClientRect();
      tgtY =  ((e.clientX-r.left)/r.width *2-1)*0.55;
      tgtX = -((e.clientY-r.top) /r.height*2-1)*0.32;
    });
    hero.addEventListener('mouseleave', function() { tgtX=0; tgtY=0; });
    hero.addEventListener('touchmove', function(e) {
      if (!built) return;
      const t=e.touches[0], r=hero.getBoundingClientRect();
      tgtY =  ((t.clientX-r.left)/r.width *2-1)*0.45;
      tgtX = -((t.clientY-r.top) /r.height*2-1)*0.25;
    }, { passive: true });
  }

  /* ── Resize ───────────────────────────────────────────── */
  function resize() {
    // Usa le dimensioni CSS del canvas (funziona sia desktop che mobile stacked)
    var w = canvas.clientWidth  || (canvas.parentElement && canvas.parentElement.offsetWidth)  || 0;
    var h = canvas.clientHeight || (canvas.parentElement && canvas.parentElement.offsetHeight) || 0;
    if (!w || !h) {
      // Dimensioni non ancora pronte (CSS non calcolato): riprova al prossimo frame
      requestAnimationFrame(resize);
      return;
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  // Secondo tentativo dopo il primo paint, garantisce il corretto sizing su mobile
  requestAnimationFrame(function() { resize(); });
  window.addEventListener('resize', resize);

  /* ── Render loop ──────────────────────────────────────── */
  function tick(t) {
    requestAnimationFrame(tick);
    if (!buildStart) buildStart = t;
    const p = Math.min((t-buildStart)/BUILD_MS, 1.0);

    if (!built) {
      clipPlane.constant = YMIN + (YMAX-YMIN)*p;
      vase.rotation.y    = p * Math.PI * 3.0;
      ring.position.y    = clipPlane.constant;
      glow.position.y    = clipPlane.constant;
      const alpha = p<0.03 ? p/0.03 : p>0.94 ? (1-p)/0.06 : 1;
      ringMat.opacity = alpha*0.85; glowMat.opacity = alpha*0.22;

      if (p >= 1.0) {
        built = true;
        ring.visible = false; glow.visible = false;
        idleY = vase.rotation.y;
        vase.traverse(function(o) {
          if (o.material && o.material.clippingPlanes) o.material.clippingPlanes = [];
        });
      }
    } else {
      curX  += (tgtX-curX)*0.055; curY += (tgtY-curY)*0.055;
      idleY += 0.0010;
      vase.rotation.y = idleY+curY;
      vase.rotation.x = curX;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
})();
