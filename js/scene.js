/* ══════════════════════════════════════════════════════════════
   AETHER — WebGL particle universe (Three.js)
   Cinematic particle simulation + abstract geometry + camera drift
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    console.warn("[AETHER] Three.js not loaded — skipping WebGL scene.");
    return;
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("webgl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060f, 0.018);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 34);

  // ── Palette ──────────────────────────────────────────────
  const PALETTE = [
    new THREE.Color(0x38f9ff), // cyan
    new THREE.Color(0x8b5cff), // violet
    new THREE.Color(0xff3df0), // magenta
    new THREE.Color(0xb6ff3d), // lime
  ];

  // ── Circular sprite texture (soft glowing dot) ───────────
  function makeDotTexture() {
    const s = 64;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.9)");
    g.addColorStop(0.5, "rgba(180,200,255,0.35)");
    g.addColorStop(1, "rgba(180,200,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }
  const dotTex = makeDotTexture();

  // ── 1. Deep particle nebula (the universe) ───────────────
  const COUNT = prefersReduced ? 1400 : 5200;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT); // per-particle phase for drift

  for (let i = 0; i < COUNT; i++) {
    // distribute in a flattened galactic disc with spiral bias
    const r = Math.pow(Math.random(), 0.6) * 60;
    const branch = (i % 3) / 3 * Math.PI * 2;
    const spin = r * 0.09;
    const scatter = (Math.random() - 0.5) * 6 * (1 + r * 0.02);
    const a = branch + spin + (Math.random() - 0.5) * 0.6;

    positions[i * 3] = Math.cos(a) * r + scatter;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14 + scatter * 0.4;
    positions[i * 3 + 2] = Math.sin(a) * r + scatter;

    const col = PALETTE[Math.floor(Math.random() * PALETTE.length)].clone();
    col.multiplyScalar(0.55 + Math.random() * 0.45);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    seeds[i] = Math.random() * Math.PI * 2;
  }

  const nebGeo = new THREE.BufferGeometry();
  nebGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  nebGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const nebMat = new THREE.PointsMaterial({
    size: 0.55,
    map: dotTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const nebula = new THREE.Points(nebGeo, nebMat);
  scene.add(nebula);

  // ── 2. Foreground drifting "data motes" (parallax dust) ──
  const DUST = prefersReduced ? 300 : 900;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 80;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 50;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 40 + 10;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.22, map: dotTex, color: 0x9fd8ff, transparent: true,
    opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ── 3. Abstract wireframe icosahedron (floating relic) ───
  const relicGeo = new THREE.IcosahedronGeometry(7, 1);
  const relicMat = new THREE.MeshBasicMaterial({
    color: 0x38f9ff, wireframe: true, transparent: true, opacity: 0.12,
  });
  const relic = new THREE.Mesh(relicGeo, relicMat);
  relic.position.set(18, -4, -18);
  scene.add(relic);

  const relic2 = new THREE.Mesh(
    new THREE.TorusKnotGeometry(4, 1.1, 90, 12),
    new THREE.MeshBasicMaterial({ color: 0xff3df0, wireframe: true, transparent: true, opacity: 0.1 })
  );
  relic2.position.set(-22, 8, -24);
  scene.add(relic2);

  // ── Interaction state ────────────────────────────────────
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollN = 0; // normalized scroll 0..1

  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5);
    pointer.ty = (e.clientY / window.innerHeight - 0.5);
  });
  window.addEventListener("scroll", () => {
    const max = document.body.scrollHeight - window.innerHeight;
    scrollN = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  // ── Resize ───────────────────────────────────────────────
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // ── Animation loop ───────────────────────────────────────
  const clock = new THREE.Clock();
  const basePos = positions.slice(); // copy for vertical wave displacement

  function tick() {
    const t = clock.getElapsedTime();

    // smooth pointer easing
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // slow galactic rotation
    nebula.rotation.y = t * 0.04;
    nebula.rotation.z = Math.sin(t * 0.05) * 0.04;

    // gentle vertical "breathing" wave through the particle field
    if (!prefersReduced) {
      const arr = nebGeo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        arr[ix + 1] = basePos[ix + 1] + Math.sin(t * 0.6 + seeds[i]) * 0.6;
      }
      nebGeo.attributes.position.needsUpdate = true;
    }

    dust.rotation.y = -t * 0.02;
    dust.position.y = Math.sin(t * 0.3) * 1.5;

    relic.rotation.x = t * 0.18;
    relic.rotation.y = t * 0.12;
    relic2.rotation.z = t * 0.2;
    relic2.rotation.x = -t * 0.1;

    // camera: parallax from pointer + cinematic dolly on scroll
    const targetX = pointer.x * 8;
    const targetY = -pointer.y * 6 + scrollN * 4;
    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.position.z = 34 - scrollN * 16; // dolly inward as you descend
    camera.lookAt(0, scrollN * 2, 0);
    camera.rotation.z = pointer.x * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // expose a tiny hook for main.js (e.g. burst on CTA) if desired
  window.AETHER = window.AETHER || {};
  window.AETHER.pulse = function () {
    relicMat.opacity = 0.5;
    setTimeout(() => (relicMat.opacity = 0.12), 280);
  };
})();
