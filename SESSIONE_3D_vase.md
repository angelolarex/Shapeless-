# Shapeless — Log sessione: Hero 3D Vase (Blade h37)

**Data:** 25 giugno 2026  
**Obiettivo:** Rendere il vero modello OBJ del vaso Blade h37 come wireframe animato nella hero section del sito, usando Three.js r128 puro (no framework).

---

## Stack tecnico

- HTML/CSS/JS puro, nessun framework
- **Three.js r128** via CDN: `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
- Modello: `Blade h37.obj` (export Rhino, superfici NURBS separate per patch)
- Server locale: `192.168.1.13:8080`

---

## File coinvolti

| File | Ruolo |
|------|-------|
| `index.html` | Carica Three.js → blade_geo.js → vase3d.js in fondo al body |
| `js/blade_geo.js` | Geometria estratta dal modello OBJ (generato da Python) |
| `js/vase3d.js` | Renderer Three.js, animazione, interazione mouse |
| `css/style.css` | Tema chiaro, `color-scheme: light`, variabili CSS |

---

## Struttura dati (blade_geo.js)

Il file è generato da uno script Python (`extract_edges.py`) che legge l'OBJ e ricostruisce le curve strutturali del vaso come polyline continue.

```
window.BLADE_V   → Float32Array  (34620 vertici × 3 float, xyz piatto)
window.BLADE_L   → Int32Array    (39 valori, lunghezza di ogni catena in vertici)
```

**39 catene** = curve strutturali reali del Blade h37 (seams NURBS, anello base, apertura top). Lunghezze: 100–1003 vertici ciascuna.

### Perché boundary edges?
L'OBJ di Rhino esporta ogni superficie NURBS come mesh separata, **senza vertici condivisi tra patch**. Quindi tutti i bordi delle patch appaiono come boundary edges (un solo triangolo adiacente). Usare boundary edges invece di sharp edges interni è l'approccio corretto per questo tipo di export.

### Generazione blade_geo.js (Python)
```
1. Legge vertici e quad dall'OBJ (fan triangulation per i quad)
2. Normalizza Y in [-2.2, 2.2] (Y è asse verticale in questo OBJ)
3. Trova boundary edges: presenti in un solo triangolo
4. Ricostruisce catene connesse via adjacency graph
5. Filtra: MIN_CHAIN = 30 vertici → mantiene 39 catene, scarta rumore
6. Output: BLADE_V (Float32Array base64) + BLADE_L (Int32Array base64)
```

---

## Architettura vase3d.js

### Renderer e scena
```javascript
renderer.localClippingEnabled = true;  // obbligatorio per clippingPlanes sui materiali
scene.fog = new THREE.Fog(0xfafaf8, 9.5, 14.5);  // fronte scuro, retro sfuma a bianco
```

### Camera
```javascript
camera.position.set(-1.8, 0.2, 11.5);  // desktop
camera.position.set(0, 0, 7.5);         // mobile
```

### Clipping planes
```javascript
const YMIN = -2.2, YMAX = 2.2;

// Animazione build: rivela il vaso dal basso verso l'alto
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), YMIN - 0.05);

// Clip inferiore per le linee del corpo: evita caos visivo dove i blade convergono alla base
const bottomClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.05);
// → mantiene y >= -2.05 per le body lines; le ring lines non ce l'hanno
```

### Materiali

| Materiale | Uso | Fog | Clip |
|-----------|-----|-----|------|
| `matSolid` | Corpo vaso (layer 1) | ✓ | clipPlane + bottomClip |
| `matDash` | Corpo vaso (layer 2, tratteggio) | ✓ | clipPlane + bottomClip |
| `matRing` | Anelli base/top | ✗ | solo clipPlane |

**matDash config:** `dashSize: 0.22, gapSize: 0.18, opacity: 0.55`  
⚠️ `computeLineDistances()` va chiamato sull'oggetto `THREE.Line`, **non** sulla `BufferGeometry`.

### Logica catene
```javascript
for (let ci = 0; ci < L.length; ci++) {
  const len = L[ci];
  const pos = V.subarray(offset * 3, (offset + len) * 3);
  offset += len;

  // avgY < -1.7 o avgY > 1.7 → anello base/top
  const isRing = (avgY < YMIN + 0.5) || (avgY > YMAX - 0.5);

  if (isRing) {
    group.add(new THREE.Line(geo, matRing));
  } else {
    // Doppio layer: solid + dashed
    group.add(new THREE.Line(geo, matSolid));
    const lineDash = new THREE.Line(g2, matDash);
    lineDash.computeLineDistances();  // ← deve stare qui, sul Line
    group.add(lineDash);
  }
}
```

### Ombra bordeaux
Canvas 512px, gradiente radiale puro (no ellisse netta), plane 6×5 unità:
```javascript
ctx.createRadialGradient(256,256,6, 256,256,256);
// stops: 0.18 → 0.10 → 0.04 → 0.01 → 0.00
ctx.fillRect(0, 0, 512, 512);  // no clip ellisse → sfumatura indefinita
```

### Animazione build
```javascript
const BUILD_MS = 5500;
// clipPlane.constant cresce da YMIN a YMAX → vaso appare dal basso
// vase.rotation.y = p * Math.PI * 3.0  → 1.5 giri durante il build
// Dopo: clip planes rimosse, rotazione idle + interazione mouse
```

---

## Bug risolti in questa sessione

### 1. Geometria procedurale invece del modello reale
**Problema:** Le prime versioni usavano geometria parametrica (coseni, N_BLADES=10-12) invece dell'OBJ.  
**Fix:** Estrazione completa di boundary edges dall'OBJ → 39 polyline reali.

### 2. 0 sharp edges trovati
**Problema:** OBJ Rhino = mesh separate senza vertici condivisi tra patch → nessun edge condiviso da 2 triangoli.  
**Fix:** Usare boundary edges (1 solo triangolo adiacente) invece di sharp edges interni.

### 3. Filtro Y tagliava base e top
**Problema:** `mid[:,1] > -1.90` tagliava la base del vaso.  
**Fix:** Rimosso il cutoff Y, usato solo filtro r (raggio del profilo).

### 4. Union-find lasciava solo 1053 edge
**Problema:** Patch disconnesse = ogni patch è il suo componente → union-find eliminava tutto.  
**Fix:** Rimosso union-find, usati solo filtri raggio + lunghezza minima.

### 5. Modello invisibile dopo switch a chain polylines
**Problema:** `g2.computeLineDistances()` chiamato sulla `BufferGeometry` invece che sul `THREE.Line` → `TypeError` silenzioso che interrompeva `initVase()` prima di `scene.add(group)`.  
**Fix:**
```javascript
// ❌ SBAGLIATO
g2.computeLineDistances();

// ✓ GIUSTO
const lineDash = new THREE.Line(g2, matDash);
lineDash.computeLineDistances();
```

### 6. Tratteggio non visibile
**Problema:** `dashSize: 0.07` troppo piccolo per la scala del modello (~4.4 unità verticali).  
**Fix:** `dashSize: 0.22, gapSize: 0.18, opacity: 0.55`

### 7. Base frammentata
**Problema:** Le body lines (blade curves) convergono caoticamente alla base.  
**Fix:** `bottomClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2.05)` → blocca le body lines a y = -2.05; matRing non ha questo clip e mostra l'anello base pulito a y = -2.2.

### 8. Ombra come cerchio netto
**Problema:** `ctx.ellipse()` creava un bordo visibile.  
**Fix:** `ctx.fillRect(0,0,512,512)` con gradiente radiale morbido, PlaneGeometry più grande (6×5).

---

## Stato attuale

- ✅ Modello OBJ reale renderizzato come wireframe (39 catene)
- ✅ Fog per profondità (fronte scuro, retro chiaro)
- ✅ Linee retro più leggere + tratteggiate
- ✅ Animazione build dal basso con rotazione
- ✅ Interazione mouse (tilt) dopo build
- ✅ Ombra bordeaux sfumata che segue il vaso
- ✅ Base con anello netto separato dalle body lines
- ⚠️ Base: verificare visivamente dopo ultimo fix (bottomClip)

---

## Snippet utili

### Hard refresh (svuota cache browser)
```
Ctrl+Shift+R  (Windows/Linux)
Cmd+Shift+R   (Mac)
```

### Come il fog crea profondità
```
Camera a z=11.5, vaso a z=0
Fog: near=9.5, far=14.5
Fronte vaso: distanza ≈ 11.5 → fog 40% → linee bordeaux visibili
Retro vaso:  distanza ≈ 13.5 → fog 80% → linee quasi bianche
```

### Script tag in index.html
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="js/blade_geo.js"></script>
<script src="js/vase3d.js"></script>
```
