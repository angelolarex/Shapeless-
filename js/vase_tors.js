/* ============================================================
   Shapeless — Torsione PIXEL ART + GRAIN  |  Three.js r128

   Pipeline:
   1. Scene 3D  →  WebGLRenderTarget a BASSA RISOLUZIONE
   2. Render target  →  Quad fullscreen con ShaderMaterial
      - NearestFilter sul texture → pixel chunky (pixel art)
      - Frammento shader aggiunge grain noise animato

   Animazione: stessa di vase_poly (build + plexus transition)
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('vaseCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ── Renderer ─────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(1);   // pixel ratio fisso: 1 px = 1 px canvas
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);

  /* ── Dimensione pixel (aumenta = più pixelato) ────────── */
  const PIXEL_SIZE = 5;

  /* ── Render target low-res ────────────────────────────── */
  const pixelTarget = new THREE.WebGLRenderTarget(64, 64, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format:    THREE.RGBAFormat,
  });

  /* ── Quad fullscreen con shader pixel + grain ─────────── */
  const quadScene  = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: pixelTarget.texture },
      uTime:    { value: 0.0 },
      uGrain:   { value: 0.055 },  // intensità grain (0 = off, 0.1 = forte)
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uGrain;
      varying vec2 vUv;

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);

        /* Grain: rumore per frame (uTime cambia ogni frame) */
        float noise = (rand(vUv + mod(uTime, 17.37)) - 0.5) * uGrain;
        color.rgb += noise;

        gl_FragColor = color;
      }
    `,
    transparent:  true,
    depthTest:    false,
    depthWrite:   false,
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat));

  /* ── Camera 3D ────────────────────────────────────────── */
  const isMobile = window.innerWidth < 768;
  const camera   = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(isMobile ? 0 : -1.5, 0.2, isMobile ? 7.5 : 11.0);

  /* ── Scene 3D ─────────────────────────────────────────── */
  const scene = new THREE.Scene();

  /* ── Luci ─────────────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xfaf5f0, 0.70));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(3, 5, 6); scene.add(sun);
  const fillLight = new THREE.DirectionalLight(0xf5ecec, 0.35);
  fillLight.position.set(-4, 0, 3); scene.add(fillLight);

  /* ── Clipping plane ───────────────────────────────────── */
  const YMIN = -2.2, YMAX = 2.2;
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), YMIN - 0.05);

  /* ── Ombra sfumata ────────────────────────────────────── */
  function buildShadow() {
    const sc = document.createElement('canvas');
    sc.width = sc.height = 256;
    const ctx = sc.getContext('2d');
    const g = ctx.createRadialGradient(128,128,4,128,128,128);
    g.addColorStop(0,    'rgba(80,15,45,0.25)');
    g.addColorStop(0.35, 'rgba(80,15,45,0.12)');
    g.addColorStop(0.65, 'rgba(80,15,45,0.04)');
    g.addColorStop(1,    'rgba(80,15,45,0.00)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 4.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent:true, depthWrite:false })
    );
    m.rotation.x = -Math.PI/2; m.position.y = YMIN-0.05; m.renderOrder = -1;
    return m;
  }

  /* ── Materiali (ref per transizione plexus) ───────────── */
  let matFill = null, matEdge = null, matPts = null;
  const EDGE_START = new THREE.Color(0x1a0408);
  const EDGE_END   = new THREE.Color(0xc8a882);
  const _cTmp      = new THREE.Color();

  /* ── Init vaso ────────────────────────────────────────── */
  function initVase() {
    const group = new THREE.Group();
    group.add(buildShadow());

    if (!window.TORS_V || !window.TORS_F) {
      console.warn('tors_geo.js non caricato'); return group;
    }

    const geoIdx = new THREE.BufferGeometry();
    geoIdx.setAttribute('position', new THREE.BufferAttribute(window.TORS_V.slice(), 3));
    geoIdx.setIndex(new THREE.BufferAttribute(window.TORS_F.slice(), 1));

    const geoFlat = geoIdx.toNonIndexed();
    geoFlat.computeVertexNormals();

    matFill = new THREE.MeshPhongMaterial({
      color:       0x5c1530,
      emissive:    0x120408,
      specular:    0x200810,
      shininess:   28,
      flatShading: true,
      transparent: true,
      opacity:     0.90,
      side:        THREE.DoubleSide,
      clippingPlanes:      [clipPlane],
      polygonOffset:       true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits:  2,
    });
    group.add(new THREE.Mesh(geoFlat, matFill));

    /* Spigoli strutturali 20° */
    const edgeGeo = new THREE.EdgesGeometry(geoIdx, 20);
    matEdge = new THREE.LineBasicMaterial({
      color: 0x1a0408, transparent: true, opacity: 0.85,
      clippingPlanes: [clipPlane],
    });
    group.add(new THREE.LineSegments(edgeGeo, matEdge));

    /* Dot plexus */
    matPts = new THREE.PointsMaterial({
      color: 0xffd8b8, size: 0.040,
      transparent: true, opacity: 0,
      sizeAttenuation: true, clippingPlanes: [clipPlane],
    });
    group.add(new THREE.Points(geoIdx, matPts));

    scene.add(group);
    return group;
  }

  const vase = initVase();

  /* ── Anello stampa 3D ─────────────────────────────────── */
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6b1f45, transparent:true, opacity:0 });
  const ring    = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.009, 6, 80), ringMat);
  ring.rotation.x = Math.PI / 2; scene.add(ring);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8a3060, transparent:true, opacity:0, side:THREE.BackSide });
  const glow    = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.048, 6, 80), glowMat);
  glow.rotation.x = Math.PI / 2; scene.add(glow);

  /* ── State ────────────────────────────────────────────── */
  const BUILD_MS = 5000;
  const TRANS_MS = 2400;
  let buildStart = null, built = false;
  let transStart = null, transitioned = false;
  let tgtX = 0, tgtY = 0, curX = 0, curY = 0, idleY = 0;

  /* ── Mouse / touch ────────────────────────────────────── */
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
    const p = canvas.parentElement; if (!p) return;
    const W = p.offsetWidth, H = p.offsetHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    /* Aggiorna render target alla nuova dimensione pixelata */
    pixelTarget.setSize(
      Math.max(1, Math.floor(W / PIXEL_SIZE)),
      Math.max(1, Math.floor(H / PIXEL_SIZE))
    );
  }
  resize(); window.addEventListener('resize', resize);

  /* ── Utility ──────────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut3(t)   { return 1 - Math.pow(1 - t, 3); }

  /* ── Render loop ──────────────────────────────────────── */
  function tick(t) {
    requestAnimationFrame(tick);
    if (!buildStart) buildStart = t;
    const p = Math.min((t - buildStart) / BUILD_MS, 1.0);

    /* ── Build phase ──────────────────────────────────── */
    if (!built) {
      clipPlane.constant = YMIN + (YMAX - YMIN) * p;
      vase.rotation.y    = p * Math.PI * 2.5;
      ring.position.y    = clipPlane.constant;
      glow.position.y    = clipPlane.constant;
      const alpha = p < 0.04 ? p / 0.04 : p > 0.94 ? (1 - p) / 0.06 : 1;
      ringMat.opacity = alpha * 0.85;
      glowMat.opacity = alpha * 0.22;

      if (p >= 1.0) {
        built = true;
        ring.visible = glow.visible = false;
        idleY = vase.rotation.y;
        transStart = t;
        vase.traverse(function(o) {
          if (!o.material) return;
          (Array.isArray(o.material) ? o.material : [o.material])
            .forEach(function(m) { m.clippingPlanes = []; });
        });
      }

    /* ── Post-build ───────────────────────────────────── */
    } else {
      curX += (tgtX - curX) * 0.055;
      curY += (tgtY - curY) * 0.055;
      idleY += 0.0008;
      vase.rotation.y = idleY + curY;
      vase.rotation.x = curX;

      if (matFill && matEdge && matPts) {
        if (!transitioned) {
          const tp = Math.min((t - transStart) / TRANS_MS, 1.0);
          const te = easeOut3(tp);
          matFill.opacity = lerp(0.90, 0.12, te);
          if (tp > 0.35 && matFill.blending !== THREE.AdditiveBlending) {
            matFill.blending = THREE.AdditiveBlending;
            matFill.depthWrite = false;
            matFill.needsUpdate = true;
          }
          _cTmp.copy(EDGE_START).lerp(EDGE_END, te);
          matEdge.color.copy(_cTmp);
          matEdge.opacity = lerp(0.85, 0.95, te);
          matPts.opacity = lerp(0, 0.80, te);
          if (tp >= 1.0) { transitioned = true; matEdge.color.copy(EDGE_END); }

        } else {
          const breath = Math.sin(t * 0.0018);
          matPts.opacity  = 0.70 + 0.10 * breath;
          matEdge.opacity = 0.84 + 0.08 * Math.sin(t * 0.0014 + 1.0);
        }
      }
    }

    /* ── Double render: scene → pixelTarget → quad ─────── */
    renderer.setRenderTarget(pixelTarget);
    renderer.clear();
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    quadMat.uniforms.uTime.value = t * 0.001;
    renderer.render(quadScene, quadCamera);
  }
  requestAnimationFrame(tick);
})();
