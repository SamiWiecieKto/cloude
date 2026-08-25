// GENEZA — widok 3D planety (three.js): proceduralna tekstura, chmury,
// poświata atmosfery, obrót myszą (osie X/Y) i zoom kółkiem.
import * as THREE from 'three';   // rozwiązywane przez importmapę w index.html
import { mulberry32 } from './simulation.js';

// ── Prosty szum wartościowy + fBm ─────────────────────────────────────────
function makeNoise(seed) {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  const grad = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; grad[i] = rng() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
  const fade = t => t * t * (3 - 2 * t);
  function val2(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const aa = grad[perm[perm[xi] + yi]], ba = grad[perm[perm[xi + 1] + yi]];
    const ab = grad[perm[perm[xi] + yi + 1]], bb = grad[perm[perm[xi + 1] + yi + 1]];
    const u = fade(xf), v = fade(yf);
    return (aa * (1 - u) + ba * u) * (1 - v) + (ab * (1 - u) + bb * u) * v;
  }
  return function fbm(x, y, oct = 5) {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < oct; o++) { sum += val2(x * freq, y * freq) * amp; norm += amp; amp *= 0.5; freq *= 2.1; }
    return sum / norm; // ~-1..1
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function mixRGB(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

// Kolor cieczy zależny od rozpuszczalnika dominującego na planecie
function oceanColor(sim) {
  const t = sim.derived.temp;
  if (t < -150) return [120, 80, 40];      // ciekły metan — bursztynowe jeziora
  if (t < -20) return [90, 140, 190];      // amoniak/solanki — stalowo-błękitne
  if (t > 350) return [255, 90, 20];       // oceany magmy
  return [18, 60, 120];                    // woda
}

export class PlanetView {
  constructor(canvas, sim) {
    this.canvas = canvas;
    this.sim = sim;
    this.noise = makeNoise(sim.seed);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.z = 3.6;

    // Gwiazdy w tle
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1400 * 3);
    const r1 = mulberry32(sim.seed + 7);
    for (let i = 0; i < 1400; i++) {
      const th = r1() * Math.PI * 2, ph = Math.acos(2 * r1() - 1), r = 40 + r1() * 20;
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      starPos[i * 3 + 2] = r * Math.cos(ph);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfc8dd, size: 0.09, sizeAttenuation: true })));

    // Światło gwiazdy macierzystej
    this.starLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.starLight.position.set(4, 1.2, 2.5);
    this.scene.add(this.starLight);
    this.scene.add(new THREE.AmbientLight(0x333344, 0.55));

    // Grupa planety (obracana przez użytkownika)
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Powierzchnia
    this.surfCanvas = document.createElement('canvas');
    this.surfCanvas.width = 768; this.surfCanvas.height = 384;
    this.nightCanvas = document.createElement('canvas');
    this.nightCanvas.width = 768; this.nightCanvas.height = 384;
    this.surfTex = new THREE.CanvasTexture(this.surfCanvas);
    this.nightTex = new THREE.CanvasTexture(this.nightCanvas);
    this.surfTex.colorSpace = THREE.SRGBColorSpace;
    const surfMat = new THREE.MeshPhongMaterial({
      map: this.surfTex, emissiveMap: this.nightTex, emissive: 0xffcf7a, emissiveIntensity: 0,
      shininess: 12, specular: 0x222222,
    });
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), surfMat);
    this.group.add(this.planet);

    // Chmury
    this.cloudCanvas = document.createElement('canvas');
    this.cloudCanvas.width = 512; this.cloudCanvas.height = 256;
    this.cloudTex = new THREE.CanvasTexture(this.cloudCanvas);
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.018, 64, 48),
      new THREE.MeshLambertMaterial({ map: this.cloudTex, transparent: true, depthWrite: false })
    );
    this.group.add(this.clouds);

    // Poświata atmosfery (fresnel)
    this.atmoMat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false,
      uniforms: { cAtmo: { value: new THREE.Color(0x5588ff) }, strength: { value: 1.0 } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix * normal); vP = (modelViewMatrix * vec4(position,1.)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 cAtmo; uniform float strength; varying vec3 vN; varying vec3 vP;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 2.4);
        gl_FragColor = vec4(cAtmo, f * strength); }`,
    });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(1.09, 64, 48), this.atmoMat);
    this.group.add(this.atmo);

    // Interakcja: obrót (X/Y) + zoom
    this.dragging = false;
    this.lastX = 0; this.lastY = 0;
    this.autoSpin = true;
    canvas.addEventListener('pointerdown', e => { this.dragging = true; this.autoSpin = false; this.lastX = e.clientX; this.lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!this.dragging) return;
      const dx = (e.clientX - this.lastX) / 200, dy = (e.clientY - this.lastY) / 200;
      this.group.rotation.y += dx;
      this.group.rotation.x = Math.max(-1.4, Math.min(1.4, this.group.rotation.x + dy));
      this.lastX = e.clientX; this.lastY = e.clientY;
    });
    canvas.addEventListener('pointerup', () => { this.dragging = false; });
    canvas.addEventListener('pointercancel', () => { this.dragging = false; });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.camera.position.z = Math.max(1.45, Math.min(7, this.camera.position.z + e.deltaY * 0.0018));
    }, { passive: false });

    // Zoom szczypaniem na ekranach dotykowych
    this.pinch = null;
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (this.pinch) this.camera.position.z = Math.max(1.45, Math.min(7, this.camera.position.z - (d - this.pinch) * 0.01));
        this.pinch = d;
      }
    }, { passive: true });
    canvas.addEventListener('touchend', () => { this.pinch = null; });

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.redrawTextures();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ── Rysowanie tekstur na podstawie stanu symulacji ──────────────────────
  redrawTextures() {
    const sim = this.sim, p = sim.params, d = sim.derived;
    const W = this.surfCanvas.width, H = this.surfCanvas.height;
    const ctx = this.surfCanvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const data = img.data;
    const noise = this.noise;

    const seaLevel = ((p.water / 100) * 2 - 1) * 0.42; // próg wysokości dla cieczy (fBm ma odchylenie ~0.3)
    const ocean = oceanColor(sim);
    const molten = d.temp > 350;
    const gasWorld = p.atm.h2 > 40 && p.pressure > 20;  // świat gazowy — pasy

    // Kolor "wegetacji": zależy od gwiazdy (wokół czerwonych karłów rośliny są ciemne/fioletowe)
    const carbon = sim.life['carbon'];
    const photoBio = Object.values(sim.life).some(l => l.alive && l.stage >= 3);
    const vegBase = p.starType === 'M' ? [70, 30, 90] : p.starType === 'K' ? [90, 70, 20] : [30, 110, 40];
    let vegColor = vegBase;
    for (const bid in sim.life) {
      const l = sim.life[bid];
      if (l.alive && l.stage >= 3 && bid !== 'carbon') {
        const tint = { sulfur: [180, 160, 30], silicon: [150, 150, 160], ammonia: [80, 130, 170], methane: [160, 90, 30], radiotroph: [60, 130, 20], hydrogen: vegBase, plasma: vegBase }[bid];
        if (tint && (!carbon.alive || l.biomass > carbon.biomass)) vegColor = tint;
      }
    }
    const vegAmount = photoBio ? Math.min(1, sim.totalBiomass() / 300) : 0;

    for (let y = 0; y < H; y++) {
      const lat = (y / H) * Math.PI;                    // 0..PI
      const latFrac = Math.abs(Math.cos(lat));          // 1 na biegunach? nie: cos(0)=1 (góra tekstury = biegun)
      // temperatura lokalna: biegun zimniejszy; nachylenie osi łagodzi kontrast
      const polarDrop = (28 - p.tilt * 0.18) * latFrac;
      const localTemp = d.temp - polarDrop + 6;
      for (let x = 0; x < W; x++) {
        const lon = (x / W) * Math.PI * 2;
        // próbkowanie sferyczne bez szwu (współrzędne na walcu)
        const nx = Math.cos(lon) * 1.6 + 10, ny = Math.sin(lon) * 1.6 + 10, nz = (y / H) * 3.2;
        let e = noise(nx + nz * 0.7, ny + nz * 1.3, 5);
        e += noise(nx * 3, ny * 3 + nz, 3) * 0.3;

        let r, g, b;
        if (gasWorld) {
          // pasy jak na gazowych olbrzymach
          const bandN = noise(nz * 2.2 + e * 0.35, 10, 3);
          const t = (Math.sin(nz * 6 + bandN * 3) + 1) / 2;
          const c = mixRGB([200, 160, 120], [120, 90, 150], t);
          const c2 = mixRGB(c, [240, 230, 210], Math.max(0, bandN));
          r = c2[0]; g = c2[1]; b = c2[2];
        } else if (e < seaLevel) {
          // ocean — głębia ciemniejsza
          const depth = Math.min(1, (seaLevel - e) * 1.6);
          const freezePt = d.temp < -150 ? -195 : d.temp < -20 ? -85 : -2;
          const frozen = (localTemp + e * 9) < freezePt;   // szum poszarpuje granicę lodu
          if (frozen) { r = 225; g = 235; b = 245; }
          else { r = ocean[0] * (1 - depth * 0.55); g = ocean[1] * (1 - depth * 0.5); b = ocean[2] * (1 - depth * 0.35); }
          if (molten) { r = 255 - depth * 60; g = 90 - depth * 30; b = 20; }
        } else {
          // ląd
          const h01 = (e - seaLevel) / Math.max(0.001, 1 - seaLevel);
          if (molten) {
            const crack = noise(nx * 6, ny * 6, 3);
            const base = mixRGB([40, 24, 20], [90, 50, 34], h01);
            if (crack > 0.42) { r = 255; g = 120; b = 30; } else { r = base[0]; g = base[1]; b = base[2]; }
          } else if (localTemp + e * 9 < -8) {
            const c = mixRGB([225, 232, 240], [190, 205, 220], h01); r = c[0]; g = c[1]; b = c[2];
          } else {
            const dry = localTemp > 60 || p.water < 12;
            let base = dry ? mixRGB([150, 118, 70], [190, 160, 110], h01) : mixRGB([96, 84, 58], [140, 125, 92], h01);
            // wysokie góry — skała/śnieg
            if (h01 > 0.75) base = mixRGB(base, localTemp < 15 ? [230, 233, 240] : [130, 122, 115], (h01 - 0.75) * 3.2);
            // wegetacja pokrywa niziny w strefach umiarkowanych
            if (vegAmount > 0.02 && h01 < 0.7 && localTemp > -5 && localTemp < 75) {
              const vn = (noise(nx * 2.4, ny * 2.4, 3) + 1) / 2;
              const cover = Math.min(1, vegAmount * (0.5 + vn));
              base = mixRGB(base, vegColor, cover * 0.85);
            }
            r = base[0]; g = base[1]; b = base[2];
          }
        }
        const i = (y * W + x) * 4;
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.surfTex.needsUpdate = true;

    // — Światła miast (mapa emisji nocnej) —
    const nctx = this.nightCanvas.getContext('2d');
    nctx.fillStyle = '#000'; nctx.fillRect(0, 0, W, H);
    const civ = Object.values(sim.life).some(l => l.alive && l.stage >= 7);
    if (civ) {
      const r2 = mulberry32(sim.seed + 99);
      nctx.fillStyle = '#ffd27a';
      for (let i = 0; i < 900; i++) {
        const x = r2() * W, y = H * 0.15 + r2() * H * 0.7;
        // tylko na lądzie: powtórz test wysokości
        const lon = (x / W) * Math.PI * 2;
        const nx = Math.cos(lon) * 1.6 + 10, ny = Math.sin(lon) * 1.6 + 10, nz = (y / H) * 3.2;
        let e = noise(nx + nz * 0.7, ny + nz * 1.3, 5) + noise(nx * 3, ny * 3 + nz, 3) * 0.3;
        if (e > seaLevel) { const s = r2() < 0.12 ? 2.2 : 1.1; nctx.globalAlpha = 0.5 + r2() * 0.5; nctx.fillRect(x, y, s, s); }
      }
      nctx.globalAlpha = 1;
      this.planet.material.emissiveIntensity = 0.85;
    } else {
      this.planet.material.emissiveIntensity = 0;
    }
    this.nightTex.needsUpdate = true;

    // — Chmury —
    const cW = this.cloudCanvas.width, cH = this.cloudCanvas.height;
    const cctx = this.cloudCanvas.getContext('2d');
    const cimg = cctx.createImageData(cW, cH);
    const cdata = cimg.data;
    const cover = Math.min(0.95, d.cloudiness + (gasWorld ? 0.25 : 0));
    for (let y = 0; y < cH; y++) {
      for (let x = 0; x < cW; x++) {
        const lon = (x / cW) * Math.PI * 2;
        const nx = Math.cos(lon) * 1.3 + 30, ny = Math.sin(lon) * 1.3 + 30, nz = (y / cH) * 2.6;
        let c = (noise(nx * 2 + nz, ny * 2 + nz * 2, 4) + 1) / 2;
        if (gasWorld) c = c * 0.4 + 0.3 * ((Math.sin(nz * 8 + c * 4) + 1) / 2);
        const alpha = Math.max(0, (c - (1 - cover)) / Math.max(0.05, cover)) * 0.85;
        const i = (y * cW + x) * 4;
        const tint = molten ? [90, 70, 70] : [255, 255, 255];
        cdata[i] = tint[0]; cdata[i + 1] = tint[1]; cdata[i + 2] = tint[2];
        cdata[i + 3] = Math.floor(Math.min(1, alpha) * 255);
      }
    }
    cctx.putImageData(cimg, 0, 0);
    this.cloudTex.needsUpdate = true;

    // — Atmosfera i światło gwiazdy —
    const pr = Math.min(1, p.pressure / 2);
    this.atmoMat.uniforms.strength.value = pr * 1.2;
    const atmSum = Math.max(1, p.atm.n2 + p.atm.o2 + p.atm.co2 + p.atm.ch4 + p.atm.nh3 + p.atm.h2);
    let ac;
    if (p.atm.ch4 / atmSum > 0.05 && d.temp < -60) ac = new THREE.Color(0xcda45e);       // mgiełka tolinowa
    else if (molten) ac = new THREE.Color(0xff7040);
    else if (p.atm.co2 / atmSum > 0.6) ac = new THREE.Color(0xd8c090);
    else ac = new THREE.Color(0x6b9fff);
    this.atmoMat.uniforms.cAtmo.value = ac;
    this.starLight.color.setHex(d.starColor);
  }

  render(dtReal) {
    if (this.autoSpin && !this.dragging) this.group.rotation.y += dtReal * 0.06;
    this.clouds.rotation.y += dtReal * 0.01;
    this.renderer.render(this.scene, this.camera);
  }
}
