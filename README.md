# AETHER — Next-Gen Digital Universe

An immersive, sci-fi inspired single-page experience: floating holographic
interfaces, a cinematic WebGL particle universe, abstract 3D environments and
experimental UI interactions — a dark, neon-lit "movie intro" vibe.

![stack](https://img.shields.io/badge/WebGL-Three.js-38f9ff) ![vanilla](https://img.shields.io/badge/JS-vanilla-8b5cff) ![license](https://img.shields.io/badge/license-MIT-ff3df0)

## ✶ Features

- **WebGL particle universe** (`Three.js`) — a 5k+ additive-blended galactic
  particle field with spiral branches, a breathing vertical wave, parallax
  dust motes and floating wireframe relics (icosahedron + torus-knot).
- **Cinematic camera** — eased pointer parallax plus a scroll-driven dolly that
  pushes the camera *into* the universe as you descend.
- **Boot sequence** — animated kernel-boot preloader with progress log.
- **Floating glassmorphism cards** — real-time 3D tilt, cursor-tracking glow
  and layered depth (`translateZ`) for a UI that feels alive.
- **Holographic core** — a pure-CSS reactive orb with orbiting shells & rings.
- **Experimental UI** — custom glowing cursor + follower ring, magnetic
  buttons, neon gradient text flow, scanlines/grain/vignette film grade,
  animated counters, decrypting "signal archive" fragments and a live HUD.
- **Accessible & resilient** — honours `prefers-reduced-motion`, degrades
  gracefully if WebGL/Three.js is unavailable, mobile-friendly.

## ✶ Run it

It's a static site — no build step. Just serve the folder:

```bash
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Or simply open `index.html` in a modern browser.

## ✶ Structure

```
index.html        # markup + section scaffold
css/style.css     # full visual system (dark cinematic + neon glass)
js/scene.js       # Three.js particle universe + camera + relics
js/main.js        # UI layer: boot, cursor, tilt, reveal, counters, HUD
```

## ✶ Tech

Vanilla HTML/CSS/JS + [Three.js r128](https://threejs.org/) (via CDN).
No framework, no bundler. Fonts: Orbitron · Space Grotesk · JetBrains Mono.

---

*A speculative interface. Step through the hologram — the universe is rendering.*
