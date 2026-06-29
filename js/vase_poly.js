/* ============================================================
   Shapeless — Hero 3D Vase BLADE  |  Three.js r128

   DECONSTRUCTED STRIPS + PLEXUS CONSTELLATION
   Look decostruito intenzionale — toNonIndexed() produce
   strip poligonali separate come vetro tagliato al laser.

   LAYER 1 — FACES (STRIPS)
     toNonIndexed() → ogni triangolo è un pannello indipendente
     MeshPhong, flatShading:true, bordeaux bordeaux semitrasparente
     depthWrite:false → gli strati superiori sono sempre visibili
     polygonOffset → le facce cedono la priorità in depth agli edge

   LAYER 2 — EDGES (RIDGE WIREFRAME)
     EdgesGeometry (soglia 22°) → solo gli spigoli dei ridge più
     netti, dove le strip si incontrano. NESSUN edge ridondante.
     LineSegments, neon cyan #40d0ff

   LAYER 3A — MINOR NODES (sub-connections)
     Points su geoIdx (tutti i vertici unici) — piccoli dot rosa
     → "connection points" interni alle strip

   LAYER 3B — MAJOR NODES (structural joints)
     Points estratti dagli endpoint di EdgesGeometry
     → vertex esattamente sui ridge netti, grandi e luminosi
     → dimensione × 5-6 rispetto ai minor nodes

   ANIMAZIONE BUILD
     Clip plane che sale da YMIN a YMAX (5 sec)
     Rotazione Y simultanea (2.5π)
     Tutti e quattro i layer si rivelano in perfetta sincronia
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('vaseCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ── Renderer ─────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;

  /* ── Camera ───────────────────────────────────────────── */
  const isMobile = window.innerWidth < 768;
  const camera   = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(isMobile ? 0 : -1.5, 0.2, isMobile ? 7.5 : 11.0);

  /* ── Scene ────────────────────────────────────────────── */
  const scene = new THREE.Scene();

  /* ── Luci (palette bordeaux) ──────────────────────────── */
  scene.add(new THREE.AmbientLight(0x1a0810, 4.0));
  const sun = new THREE.DirectionalLight(0xe090a0, 2.8);
  sun.position.set(2.5, 4.5, 3);
  scene.add(sun);
  const fillLight = new THREE.DirectionalLight(0x301010, 1.2);
  fillLight.position.set(-3, -1, -2.5);
  scene.add(fillLight);
  const rimLight = new THREE.PointLight(0xc01840, 3.0, 20);
  rimLight.position.set(-1.5, 4, -3);
  scene.add(rimLight);

  /* ── Clipping plane (build animation) ────────────────── */
  const YMIN = -2.2, YMAX = 2.2;
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), YMIN - 0.05);

  /* ── Texture nodo: glow circolare rosa-vino ───────────── */
  function makeNodeTex(bright) {
    const sz  = bright ? 128 : 64;
    const c   = document.createElement('canvas');
    c.width   = c.height = sz;
    const ctx = c.getContext('2d'), h = sz / 2;
    const g   = ctx.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0,            'rgba(255,255,255,1.00)');
    g.addColorStop(bright?0.06:0.14, 'rgba(255,210,225,0.95)');
    g.addColorStop(bright?0.22:0.40, 'rgba(220,100,130,0.62)');
    g.addColorStop(bright?0.52:0.70, 'rgba(140,20,50,0.20)');
    g.addColorStop(1,            'rgba(80,0,20,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sz, sz);
    return new THREE.CanvasTexture(c);
  }

  /* ── Ombra sfumata bordeaux ───────────────────────────── */
  function buildShadow() {
    const sc  = document.createElement('canvas');
    sc.width  = sc.height = 512;
    const ctx = sc.getContext('2d');
    const g   = ctx.createRadialGradient(256, 256, 6, 256, 256, 256);
    g.addColorStop(0,    'rgba(80,5,20,0.28)');
    g.addColorStop(0.30, 'rgba(80,5,20,0.12)');
    g.addColorStop(0.58, 'rgba(80,5,20,0.04)');
    g.addColorStop(0.85, 'rgba(80,5,20,0.01)');
    g.addColorStop(1,    'rgba(80,5,20,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(6.0, 5.0),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(sc),
        transparent: true, depthWrite: false,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = YMIN - 0.05;
    m.renderOrder = -1;
    return m;
  }

  /* ── Estrae i vertici unici dagli edge di EdgesGeometry ──
     Questi sono i "joint node" sui ridge netti delle strip.  */
  function buildMajorNodeGeo(edgeGeo) {
    const ep  = edgeGeo.attributes.position;
    const seen = new Set(), pos = [];
    for (let i = 0; i < ep.count; i++) {
      const x = ep.getX(i), y = ep.getY(i), z = ep.getZ(i);
      const k = x.toFixed(3) + ',' + y.toFixed(3) + ',' + z.toFixed(3);
      if (!seen.has(k)) { seen.add(k); pos.push(x, y, z); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }

  /* ── Ref materiali (breathing post-build) ─────────────── */
  let matFace = null, matEdge = null, matSmall = null, matMajor = null;

  /* ── VaseGroup ────────────────────────────────────────── */
  function initVase() {
    const group = new THREE.Group();
    group.add(buildShadow());

    if (!window.POLY_V || !window.POLY_F) {
      console.warn('poly_geo.js non caricato'); return group;
    }

    /* Geometria indicizzata — sorgente per edge e nodi */
    const geoIdx = new THREE.BufferGeometry();
    geoIdx.setAttribute('position', new THREE.BufferAttribute(window.POLY_V.slice(), 3));
    geoIdx.setIndex(new THREE.BufferAttribute(window.POLY_F.slice(), 1));
    geoIdx.computeVertexNormals();

    /* ── LAYER 1 — FACES (DECONSTRUCTED STRIPS) ───────────
       toNonIndexed() → ogni triangolo diventa un pannello
       indipendente. Con flatShading:true, ciascuno ha la sua
       normale uniforme → pannelli di vetro tagliati al laser.
       depthWrite:false → visibili gli strati sopra.          */
    const geoFlat = geoIdx.toNonIndexed();
    geoFlat.computeVertexNormals();

    matFace = new THREE.MeshPhongMaterial({
      color:       0x7a0c28,
      emissive:    0x1a0008,
      specular:    0xd02050,
      shininess:   28,
      flatShading: true,
      transparent: true,
      opacity:     0.55,
      side:        THREE.DoubleSide,
      depthWrite:  false,
      clippingPlanes:      [clipPlane],
      polygonOffset:       true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits:  1,
    });
    group.add(new THREE.Mesh(geoFlat, matFace));

    /* ── LAYER 2 — EDGE WIREFRAME (ridge netti, 22°) ──────
       EdgesGeometry con soglia alta → solo i bordi netti
       dove le strip si incontrano con angolo significativo.
       NO bordi interni alle strip → overlay pulito.           */
    const edgeGeo = new THREE.EdgesGeometry(geoIdx, 22);
    matEdge = new THREE.LineBasicMaterial({
      color:          0x40d0ff,
      transparent:    true,
      opacity:        0.92,
      clippingPlanes: [clipPlane],
    });
    group.add(new THREE.LineSegments(edgeGeo, matEdge));

    const nodeTex   = makeNodeTex(false);
    const majorTex  = makeNodeTex(true);

    /* ── LAYER 3A — MINOR NODES (sub-connections) ─────────
       Tutti i vertici unici della geometria indicizzata.
       Piccoli dot rosa → rete di connessioni secondarie.      */
    matSmall = new THREE.PointsMaterial({
      color:           0xff90b0,
      size:            0.045,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.60,
      map:             nodeTex,
      alphaTest:       0.004,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
      clippingPlanes:  [clipPlane],
    });
    group.add(new THREE.Points(geoIdx, matSmall));

    /* ── LAYER 3B — MAJOR NODES (structural ridge joints) ──
       Vertici estratti dagli endpoint di EdgesGeometry:
       posizionati esattamente sui ridge visibili delle strip.
       Grandi (5× i minor), bianchi brillanti, glow marcato.  */
    const geoMajor = buildMajorNodeGeo(edgeGeo);
    matMajor = new THREE.PointsMaterial({
      color:           0xffffff,
      size:            0.22,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.92,
      map:             majorTex,
      alphaTest:       0.004,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
      clippingPlanes:  [clipPlane],
    });
    group.add(new THREE.Points(geoMajor, matMajor));

    scene.add(group);
    return group;
  }

  const VaseGroup = initVase();

  /* ── Anello stampa 3D (build animation, bordeaux-pink) ── */
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff4070, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.009, 8, 100), ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xc01030, transparent: true, opacity: 0,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.048, 8, 100), glowMat);
  glow.rotation.x = Math.PI / 2;
  scene.add(glow);

  /* ── State ────────────────────────────────────────────── */
  const BUILD_MS = 5000;
  let buildStart = null, built = false;
  let tgtX = 0, tgtY = 0, curX = 0, curY = 0, idleY = 0;

  /* ── Mouse / touch ────────────────────────────────────── */
  const hero = document.getElementById('hero3d');
  if (hero) {
    hero.addEventListener('mousemove', function (e) {
      if (!built) return;
      const r = hero.getBoundingClientRect();
      tgtY =  ((e.clientX - r.left) / r.width  * 2 - 1) * 0.55;
      tgtX = -((e.clientY - r.top)  / r.height * 2 - 1) * 0.32;
    });
    hero.addEventListener('mouseleave', function () { tgtX = 0; tgtY = 0; });
    hero.addEventListener('touchmove', function (e) {
      if (!built) return;
      const t = e.touches[0], r = hero.getBoundingClientRect();
      tgtY =  ((t.clientX - r.left) / r.width  * 2 - 1) * 0.45;
      tgtX = -((t.clientY - r.top)  / r.height * 2 - 1) * 0.25;
    }, { passive: true });
  }

  /* ── Resize ───────────────────────────────────────────── */
  function resize() {
    const p = canvas.parentElement; if (!p) return;
    renderer.setSize(p.offsetWidth, p.offsetHeight, false);
    camera.aspect = p.offsetWidth / p.offsetHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function c01(v) { return Math.max(0, Math.min(1, v)); }

  /* ── Render loop ──────────────────────────────────────── */
  function tick(t) {
    requestAnimationFrame(tick);
    if (!buildStart) buildStart = t;
    const p = Math.min((t - buildStart) / BUILD_MS, 1.0);

    /* ── BUILD PHASE ──────────────────────────────────── */
    if (!built) {
      clipPlane.constant = YMIN + (YMAX - YMIN) * p;
      VaseGroup.rotation.y = p * Math.PI * 2.5;
      ring.position.y = clipPlane.constant;
      glow.position.y = clipPlane.constant;
      const alpha = p < 0.04 ? p / 0.04 : p > 0.94 ? (1 - p) / 0.06 : 1;
      ringMat.opacity = alpha * 0.80;
      glowMat.opacity = alpha * 0.22;

      if (p >= 1.0) {
        built = true;
        ring.visible = glow.visible = false;
        idleY = VaseGroup.rotation.y;
        VaseGroup.traverse(function (o) {
          if (!o.material) return;
          (Array.isArray(o.material) ? o.material : [o.material])
            .forEach(function (m) { m.clippingPlanes = []; });
        });
      }

    /* ── POST-BUILD: idle + mouse + breathing ─────────── */
    } else {
      curX  += (tgtX - curX) * 0.055;
      curY  += (tgtY - curY) * 0.055;
      idleY += 0.0008;
      VaseGroup.rotation.y = idleY + curY;
      VaseGroup.rotation.x = curX;

      if (matFace && matEdge && matSmall && matMajor) {
        matMajor.opacity = c01(0.80 + 0.16 * Math.sin(t * 0.00155));
        matSmall.opacity = c01(0.48 + 0.14 * Math.sin(t * 0.00140 + 0.5));
        matEdge.opacity  = c01(0.82 + 0.12 * Math.sin(t * 0.00120 + 1.4));
        matFace.opacity  = c01(0.48 + 0.09 * Math.sin(t * 0.00095 + 2.8));
      }
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
})();
