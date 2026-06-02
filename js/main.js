/* ══════════════════════════════════════════════════════════════
   AETHER — UI interaction layer
   Boot sequence · custom cursor · magnetic buttons · 3D tilt cards
   reveal-on-scroll · counters · nav behaviour · injected content
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  /* ── Inject system cards ──────────────────────────────── */
  const CARDS = [
    { glyph: "◈", color: "#38f9ff", tag: "SYS·01", title: "Holo Interfaces", text: "Glassmorphic panels that float in depth and tilt toward your gaze in real time." },
    { glyph: "✧", color: "#8b5cff", tag: "SYS·02", title: "Particle Fields", text: "Millions of additive light motes simulate a living, breathing cosmic medium." },
    { glyph: "❖", color: "#ff3df0", tag: "SYS·03", title: "Fluid Motion", text: "Eased camera dollies and parallax drift create cinematic, weightless transitions." },
    { glyph: "⟁", color: "#b6ff3d", tag: "SYS·04", title: "Reactive Core", text: "An abstract energy nucleus pulses and warps in response to presence and scroll." },
    { glyph: "◉", color: "#38f9ff", tag: "SYS·05", title: "Depth Layers", text: "Stacked z-planes and blur gradients fabricate impossible spatial dimensionality." },
    { glyph: "⬡", color: "#8b5cff", tag: "SYS·06", title: "Neon Gradients", text: "Animated multi-stop spectra wash every surface in shifting electric color." },
  ];
  const cardWrap = $("#cards");
  if (cardWrap) {
    cardWrap.innerHTML = CARDS.map(
      (c) => `
      <article class="card reveal" data-tilt data-split>
        <span class="card__tag">${c.tag}</span>
        <span class="card__glyph" style="color:${c.color}">${c.glyph}</span>
        <h3 class="card__title">${c.title}</h3>
        <p class="card__text">${c.text}</p>
        <div class="card__line"></div>
      </article>`
    ).join("");
  }

  /* ── Inject archive fragments ─────────────────────────── */
  const FRAGS = [
    { id: "FRG-0x91A", title: "Echo Drift", meta: "DECRYPTED · 84%" },
    { id: "FRG-0x44C", title: "Null Horizon", meta: "DECRYPTED · 61%" },
    { id: "FRG-0x7E2", title: "Ghost Lattice", meta: "DECRYPTED · 97%" },
    { id: "FRG-0x10F", title: "Solar Whisper", meta: "DECRYPTED · 73%" },
    { id: "FRG-0xBB8", title: "Void Bloom", meta: "DECRYPTED · 52%" },
    { id: "FRG-0x2D6", title: "Quantum Tide", meta: "DECRYPTED · 88%" },
    { id: "FRG-0xE07", title: "Mirror Pulse", meta: "DECRYPTED · 69%" },
    { id: "FRG-0x5A3", title: "Aether Seed", meta: "DECRYPTED · 100%" },
  ];
  const grid = $("#archiveGrid");
  if (grid) {
    grid.innerHTML = FRAGS.map((f) => {
      const bars = Array.from({ length: 7 })
        .map(() => `<i style="animation-delay:${(Math.random() * 1.2).toFixed(2)}s"></i>`)
        .join("");
      return `
        <article class="frag reveal" data-split>
          <div>
            <span class="frag__id">${f.id}</span>
            <h3 class="frag__title">${f.title}</h3>
          </div>
          <div>
            <div class="frag__bars">${bars}</div>
            <p class="frag__meta">${f.meta}</p>
          </div>
        </article>`;
    }).join("");
  }

  /* ── Custom cursor ────────────────────────────────────── */
  const cursor = $("#cursor");
  const ring = $("#cursorRing");
  if (cursor && ring && window.matchMedia("(hover: hover)").matches) {
    let rx = 0, ry = 0, mx = 0, my = 0;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });
    (function follow() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(follow);
    })();
    const hoverable = "a, button, [data-magnetic], [data-tilt], .frag";
    document.addEventListener("pointerover", (e) => {
      if (e.target.closest(hoverable)) ring.classList.add("is-hover");
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest(hoverable)) ring.classList.remove("is-hover");
    });
  }

  /* ── Magnetic elements ────────────────────────────────── */
  if (!prefersReduced) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = 0.35;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "translate(0,0)";
      });
    });
  }

  /* ── 3D tilt cards ────────────────────────────────────── */
  if (!prefersReduced) {
    $$("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (py - 0.5) * -12;
        const ry = (px - 0.5) * 14;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ── Reveal on scroll ─────────────────────────────────── */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ── Animated counters ────────────────────────────────── */
  const fmt = (n) => n.toLocaleString("en-US");
  const counterIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseInt(el.dataset.count, 10);
        const dur = 1600;
        const start = performance.now();
        function step(now) {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(Math.floor(target * eased));
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = fmt(target);
        }
        requestAnimationFrame(step);
        counterIO.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  $$("[data-count]").forEach((el) => counterIO.observe(el));

  /* ── Nav: hide on scroll-down, show on scroll-up ─────── */
  const nav = $("#nav");
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    if (y > lastY && y > 220) nav.classList.add("is-hidden");
    else nav.classList.remove("is-hidden");
    lastY = y;
  }, { passive: true });

  /* ── HUD readout (fake telemetry) ─────────────────────── */
  const readout = $("#hudReadout");
  if (readout) {
    setInterval(() => {
      const lat = (Math.sin(Date.now() / 3000) * 89).toFixed(3);
      const lon = (Math.cos(Date.now() / 2200) * 179).toFixed(3);
      readout.textContent = `SYS//ONLINE · LAT ${lat} · LON ${lon}`;
    }, 120);
  }

  /* ── Footer clock ─────────────────────────────────────── */
  const clk = $("#footClock");
  if (clk) {
    const tick = () => {
      const d = new Date();
      clk.textContent = d.toTimeString().slice(0, 8) + " UTC" + (d.getTimezoneOffset() <= 0 ? "+" : "-");
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ── CTA pulse → poke the WebGL relics ────────────────── */
  $$(".btn--neon").forEach((b) =>
    b.addEventListener("click", () => window.AETHER && window.AETHER.pulse && window.AETHER.pulse())
  );

  /* ── Boot sequence ────────────────────────────────────── */
  const boot = $("#boot");
  const bootLog = $("#bootLog");
  const bootBar = $("#bootBar");
  const LINES = [
    "booting aether kernel…",
    "mounting holographic matrix…",
    "seeding particle universe…",
    "calibrating depth layers…",
    "syncing neon spectrum…",
    "core online ◈",
  ];
  let li = 0, prog = 0;
  function runBoot() {
    if (!boot) return;
    const iv = setInterval(() => {
      prog = Math.min(prog + Math.random() * 22 + 8, 100);
      if (bootBar) bootBar.style.width = prog + "%";
      if (bootLog && li < LINES.length) {
        bootLog.textContent = LINES[Math.min(li, LINES.length - 1)];
        li++;
      }
      if (prog >= 100) {
        clearInterval(iv);
        if (bootLog) bootLog.textContent = LINES[LINES.length - 1];
        setTimeout(() => {
          boot.classList.add("is-done");
          document.body.style.overflow = "";
        }, 500);
      }
    }, 280);
  }
  document.body.style.overflow = "hidden";
  if (prefersReduced) {
    boot && boot.classList.add("is-done");
    document.body.style.overflow = "";
  } else {
    window.addEventListener("load", runBoot);
    // fallback in case load already fired
    if (document.readyState === "complete") runBoot();
  }
})();
