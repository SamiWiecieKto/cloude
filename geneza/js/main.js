// GENEZA — punkt startowy: spina symulację, widok 3D i UI w pętlę gry.
import { Simulation, computeDerived } from './simulation.js';
import { PlanetView } from './planet3d.js';
import { UI } from './ui.js';

const ui = new UI();
let sim = new Simulation(ui.params);          // planeta "podglądowa" przed startem
let view = new PlanetView(document.getElementById('scene'), sim);

let running = false;
let speed = 1;            // mln lat na sekundę rzeczywistą
let paused = false;

const SUBSTEP = 0.25;     // mln lat na krok symulacji
let simDebt = 0;          // niezasymulowany czas
let lastTexture = 0;
let lastUIUpdate = 0;
let pvTick = 0;

// Przed startem: suwaki na żywo aktualizują podgląd planety
const origRefresh = ui.refreshPreview.bind(ui);
ui.refreshPreview = (s) => {
  origRefresh(s);
  if (!running) {
    sim.params = JSON.parse(JSON.stringify(ui.params));
    sim.derived = computeDerived(sim.params, null);
    sim.textureDirty = true;
  }
};

ui.onStart = (params) => {
  sim = new Simulation(params);
  view.sim = sim;
  sim.textureDirty = true;
  running = true;
  paused = false;
  speed = 1;
  ui.enterRunning();
  ui.updateLog(sim);
  ui.updateLife(sim);
  ui.toast('Symulacja rozpoczęta. Czas płynie: 1 s = 1 mln lat.');
};

ui.onSpeed = (v) => {
  if (v === 'pause') { paused = !paused; ui.toast(paused ? '⏸️ Pauza' : '▶️ Wznowiono'); return; }
  paused = false;
  speed = +v;
};

ui.onIntervene = (id) => {
  if (!running) { ui.toast('Najpierw rozpocznij symulację.'); return; }
  const res = sim.intervene(id);
  if (!res.ok) ui.toast(res.msg);
  ui.updateLog(sim);
};

let lastT = performance.now();
function loop(now) {
  const dtReal = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  if (running && !paused) {
    simDebt += dtReal * speed;
    let steps = 0;
    const maxSteps = 600;   // bezpiecznik przy 100×
    while (simDebt >= SUBSTEP && steps < maxSteps) {
      sim.step(SUBSTEP);
      simDebt -= SUBSTEP;
      steps++;
    }
    if (steps === maxSteps) simDebt = 0; // nie nadganiaj w nieskończoność
  }

  // Tekstury: odświeżaj przy zmianach, ale nie częściej niż co 1.2 s
  if (sim.textureDirty && now - lastTexture > 1200) {
    sim.textureDirty = false;
    lastTexture = now;
    view.redrawTextures();
  }

  // UI: 4×/s wystarczy
  if (now - lastUIUpdate > 250) {
    lastUIUpdate = now;
    if (running) {
      ui.updateStats(sim);
      ui.updateLog(sim);
      ui.updateLife(sim);
      ui.updateGallery(sim);
      ui.updateInterventions(sim);
      pvTick++;
      if (pvTick % 4 === 0) origRefresh(sim);   // podgląd warunków na żywo, co ~1 s
    }
  }

  view.render(dtReal);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
