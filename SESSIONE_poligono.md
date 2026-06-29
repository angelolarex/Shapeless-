# Shapeless — Log sessione: Pagina Poligono

**Ultima modifica:** 27 giugno 2026  
**File di output:** `pagina-poligono.html`, `js/vase_poly.js`  
**Dati geometria:** `js/poly_geo.js` (generato da Python, non modificare)

---

## Obiettivo

Hero section alternativa con il vaso Blade h37 come mesh low-poly triangolata.  
Effetto finale: **Deconstructed Strips + Plexus Constellation** su sfondo chiaro della pagina.

---

## File coinvolti

| File | Ruolo |
|------|-------|
| `pagina-poligono.html` | Pagina completa con script 3D inline (sostituisce riferimento a vase_poly.js) |
| `js/vase_poly.js` | Stesso codice 3D come file esterno (mantenuto sincronizzato) |
| `js/poly_geo.js` | Mesh decimata dal modello OBJ — **NON TOCCARE** |
| `js/blade_geo.js` | Caricato ma non usato in questa pagina (lasciato per compatibilità) |
| `models/Blade h37.obj` | Modello sorgente originale |

---

## Struttura dati (poly_geo.js) — invariata

```
window.POLY_V   → Float32Array  (vertici × 3 float, xyz)
window.POLY_F   → Int32Array    (1519 triangoli × 3 indici)
```

- ~800-1000 vertici unici
- 1519 triangoli — ~38 per lama (SCALE=14)
- Range Y normalizzato: [-2.2, 2.2]
- Triangolazione anisotropa → triangoli irregolari, più grandi sulle piatte, più piccoli sulle curvature

---

## Architettura finale (vase_poly.js / pagina-poligono.html)

### Concetto visivo

**Deconstructed Strips** — le strip verticali e torte apparse inizialmente come "bug" sono state accettate come scelta di design intenzionale. Il vaso appare come una scultura di frammenti di vetro bordeaux tagliati al laser, con overlay wireframe neon cyan e constellation dots sui ridge.

### Quattro layer sincronizzati nel VaseGroup

```
geoIdx  = THREE.BufferGeometry(POLY_V, POLY_F)    ← sorgente indicizzata
geoFlat = geoIdx.toNonIndexed()                   ← INTENZIONALE: strips
edgeGeo = THREE.EdgesGeometry(geoIdx, 22)          ← solo ridge netti
geoMajor = endpoint unici di edgeGeo              ← major nodes sui ridge
```

#### LAYER 1 — FACES (strips decostruite)
```javascript
const geoFlat = geoIdx.toNonIndexed();
geoFlat.computeVertexNormals();  // per-face normals

new THREE.MeshPhongMaterial({
  color: 0x7a0c28,      // bordeaux
  emissive: 0x1a0008,
  specular: 0xd02050,
  shininess: 28,
  flatShading: true,    // ogni triangolo = pannello piatto uniforme
  transparent: true, opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,    // strati superiori sempre visibili
  clippingPlanes: [clipPlane],
  polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
})
```

**Perché toNonIndexed() è INTENZIONALE:**  
Con la geometria indicizzata ogni triangolo condivide vertici → mesh continua.  
Con toNonIndexed() ogni triangolo ha i propri 3 vertici indipendenti → ciascuno è un pannello piatto separato. Con DoubleSide e depthWrite:false le strip sono visibili anche internamente → effetto vetro decostruito.

#### LAYER 2 — EDGES (ridge wireframe)
```javascript
const edgeGeo = new THREE.EdgesGeometry(geoIdx, 22);  // soglia 22°
new THREE.LineBasicMaterial({
  color: 0x40d0ff,  // neon cyan — contrasto forte sul bordeaux
  transparent: true, opacity: 0.92,
  clippingPlanes: [clipPlane],
})
```

**Perché soglia 22°:**  
Sotto 22° si vedono troppi edge interni alle strip → rumore visivo.  
Sopra 30° si perdono edge strutturali importanti.  
22° = solo i bordi netti dove le strip si incontrano con angolo significativo.

**VIETATO WireframeGeometry** → mostrerebbe tutti i triangoli inclusa la silhouette seghettata.  
**EdgesGeometry(geoIdx, soglia)** → solo bordi strutturali, silhouette pulita.

#### LAYER 3A — MINOR NODES (sub-connections)
```javascript
new THREE.PointsMaterial({
  color: 0xff90b0,   // rosa-caldo (complementare al bordeaux)
  size: 0.045, sizeAttenuation: true,
  transparent: true, opacity: 0.60,
  map: makeNodeTex(false),  // glow texture 64px
  blending: THREE.AdditiveBlending, depthWrite: false,
  clippingPlanes: [clipPlane],
})
// Posizionati su: geoIdx (tutti i vertici unici della mesh)
```

#### LAYER 3B — MAJOR NODES (structural ridge joints)
```javascript
// Estrazione endpoint unici dagli edge
function buildMajorNodeGeo(edgeGeo) {
  const ep = edgeGeo.attributes.position, seen = {}, pos = [];
  for (let i = 0; i < ep.count; i++) {
    const k = ep.getX(i).toFixed(3)+','+ep.getY(i).toFixed(3)+','+ep.getZ(i).toFixed(3);
    if (!seen[k]) { seen[k]=1; pos.push(ep.getX(i),ep.getY(i),ep.getZ(i)); }
  }
  // ...
}

new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.22,          // 5× più grandi dei minor nodes
  map: makeNodeTex(true),  // glow texture 128px, più intensa
  blending: THREE.AdditiveBlending, depthWrite: false,
  clippingPlanes: [clipPlane],
})
```

**Perché endpoint di EdgesGeometry:**  
Questi vertici sono esattamente sulle intersezioni dei ridge visibili → major nodes appaiono come "giunzioni strutturali" naturalmente posizionate dove le strip si toccano.

### Luci (palette bordeaux)
```javascript
AmbientLight(0x1a0810, 4.0)           // dark warm ambient
DirectionalLight(0xe090a0, 2.8)        // warm pinkish sun
DirectionalLight(0x301010, 1.2)        // dark warm fill
PointLight(0xc01840, 3.0, 20)          // red-wine rim
```

### Clip plane e animazione build
```javascript
const YMIN = -2.2, YMAX = 2.2;
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), YMIN - 0.05);

// Build: 5000ms
clipPlane.constant = YMIN + (YMAX - YMIN) * p;  // sale da YMIN a YMAX
VaseGroup.rotation.y = p * Math.PI * 2.5;        // 1.25 giri

// Post-build: rimuovi clip da tutti i materiali
VaseGroup.traverse(o => {
  if (o.material) [].concat(o.material).forEach(m => m.clippingPlanes = []);
});

// Idle: rotazione lenta + mouse tilt
idleY += 0.0008;
VaseGroup.rotation.y = idleY + curY;
```

### Breathing post-build (sfasato sui 4 materiali)
```javascript
matMajor.opacity = c01(0.80 + 0.16 * Math.sin(t * 0.00155));
matSmall.opacity = c01(0.48 + 0.14 * Math.sin(t * 0.00140 + 0.5));
matEdge.opacity  = c01(0.82 + 0.12 * Math.sin(t * 0.00120 + 1.4));
matFace.opacity  = c01(0.48 + 0.09 * Math.sin(t * 0.00095 + 2.8));
```

### Ombra bordeaux
```javascript
// Canvas 512px, gradiente radiale
rgba(80,5,20,0.28) → 0.12 → 0.04 → 0.01 → 0.00
PlaneGeometry(6.0, 5.0), rotation.x = -PI/2, y = YMIN - 0.05
```

---

## Evoluzione del progetto (storia delle iterazioni)

### Versione 1 — Papercraft flat-shaded (giugno 2026)
Prompt AI: vaso low-poly stile papercraft, viola matte, texture granulare.  
Implementazione: MeshPhongMaterial viola + PointLight multipli + canvas grain texture.  
**Abbandonata** per l'effetto Plexus Constellation.

### Versione 2 — Plexus Constellation prima iterazione
THREE layer su geometria indicizzata: faces + edges + dots.  
**Bug critico:** usato `toNonIndexed()` per la face mesh credendo fosse necessario per flatShading → frammentazione in strip verticali con gap visibili.

### Versione 3 — Tentativo fix "geometria continua"
Fix proposto: usare geoIdx direttamente (no toNonIndexed), LatheGeometry o CylinderGeometry.  
Three.js r128 con `flatShading:true` usa `dFdx/dFdy` nel fragment shader → funziona con geoIdx indicizzata.  
**Risolto correttamente** — ma l'utente aveva visto lo screenshot con le strip e le preferiva.

### Versione 4 (FINALE) — Deconstructed Strips (design intenzionale)
L'utente ha richiesto di mantenere le strip come scelta artistica e raffinarle:
- `toNonIndexed()` confermato come INTENZIONALE
- EdgesGeometry con soglia 22° per ridge wireframe pulito  
- Major nodes estratti dagli endpoint degli edge (sui ridge)
- Minor nodes su tutti i vertici (sub-connections)
- Colore bordeaux al posto del viola

---

## Palette colori definitiva

| Elemento | Colore | Hex |
|---------|--------|-----|
| Facce (bordeaux) | Deep wine | `0x7a0c28` |
| Emissive | Very dark red | `0x1a0008` |
| Specular | Warm pink-red | `0xd02050` |
| Edge wireframe | Neon cyan | `0x40d0ff` |
| Minor nodes | Warm pink | `0xff90b0` |
| Major nodes | White bright | `0xffffff` |
| Ambient | Dark warm | `0x1a0810` |
| Sun | Warm pinkish | `0xe090a0` |
| Rim light | Wine red | `0xc01840` |
| Build ring | Bright pink-red | `0xff4070` |
| Ombra | Dark bordeaux | `rgba(80,5,20,...)` |

---

## Regole tecniche da non dimenticare

1. **NON usare WireframeGeometry** → seghetta la silhouette. Sempre EdgesGeometry(geoIdx, soglia).
2. **toNonIndexed() È INTENZIONALE** in questa versione — non "correggere".
3. **flatShading:true su toNonIndexed** → computeVertexNormals() obbligatorio dopo toNonIndexed.
4. **flatShading:true su geoIdx** → funziona anche senza toNonIndexed (Three.js r128 usa dFdx/dFdy).
5. **depthWrite:false su faces** → edge e nodi sempre visibili sopra le facce.
6. **polygonOffset** sul face material → evita z-fighting con gli edge.
7. **AdditiveBlending + depthWrite:false** su Points → glow additivo.
8. **renderer.localClippingEnabled = true** → obbligatorio per clippingPlanes sui materiali.
9. **Rimuovere clippingPlanes dopo build** → traverse + forEach su tutti i materiali.
10. **Major nodes = endpoint di EdgesGeometry** → posizionati naturalmente sui ridge strutturali.
