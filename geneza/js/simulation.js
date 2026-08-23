// GENEZA — silnik symulacji planety i rozwoju życia.
import { BIOCHEMISTRIES, STAGES, STAGE_TIME } from './biochem.js';
import { generateSpecies } from './species.js';

// ── Deterministyczny generator liczb losowych ─────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Typy gwiazd ───────────────────────────────────────────────────────────
export const STAR_TYPES = {
  M: { name: 'Czerwony karzeł (M)', lum: 0.04, color: 0xff7043, flare: 90, hz: [0.08, 0.25] },
  K: { name: 'Pomarańczowy karzeł (K)', lum: 0.35, color: 0xffab5e, flare: 35, hz: [0.5, 0.9] },
  G: { name: 'Żółty karzeł (G) — jak Słońce', lum: 1.0, color: 0xfff4d6, flare: 15, hz: [0.9, 1.5] },
  F: { name: 'Biało-żółta (F)', lum: 2.5, color: 0xf8f7ff, flare: 10, hz: [1.4, 2.2] },
  A: { name: 'Biała, gorąca (A)', lum: 12, color: 0xcad8ff, flare: 8, hz: [3.0, 5.0] },
};

// ── Schemat parametrów (do budowy UI) ─────────────────────────────────────
export const PARAM_SCHEMA = [
  { group: 'Gwiazda i orbita', items: [
    { key: 'starType', label: 'Typ gwiazdy', type: 'select', options: Object.entries(STAR_TYPES).map(([k, v]) => ({ value: k, label: v.name })) },
    { key: 'distance', label: 'Odległość od gwiazdy', unit: 'AU', min: 0.05, max: 15, step: 0.01, log: true },
  ]},
  { group: 'Planeta', items: [
    { key: 'mass', label: 'Masa planety', unit: 'M⊕', min: 0.05, max: 12, step: 0.05 },
    { key: 'rotationH', label: 'Doba (obrót)', unit: 'h', min: 4, max: 2400, step: 1, log: true },
    { key: 'tilt', label: 'Nachylenie osi', unit: '°', min: 0, max: 90, step: 1 },
    { key: 'moon', label: 'Duży księżyc', type: 'checkbox' },
    { key: 'magneticField', label: 'Pole magnetyczne', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'volcanism', label: 'Wulkanizm', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'water', label: 'Pokrycie cieczą', unit: '%', min: 0, max: 100, step: 1 },
  ]},
  { group: 'Atmosfera', items: [
    { key: 'pressure', label: 'Ciśnienie', unit: 'bar', min: 0, max: 120, step: 0.01, log: true },
    { key: 'atm.n2', label: 'Azot (N₂)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'atm.o2', label: 'Tlen (O₂)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'atm.co2', label: 'Dwutlenek węgla (CO₂)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'atm.ch4', label: 'Metan (CH₄)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'atm.nh3', label: 'Amoniak (NH₃)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'atm.h2', label: 'Wodór (H₂)', unit: '%', min: 0, max: 100, step: 1 },
  ]},
  { group: 'Skorupa — pierwiastki', items: [
    { key: 'elements.C', label: 'Węgiel (C)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'elements.N', label: 'Azot w skorupie (N)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'elements.P', label: 'Fosfor (P)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'elements.S', label: 'Siarka (S)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'elements.Fe', label: 'Żelazo (Fe)', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'elements.Si', label: 'Krzem (Si)', unit: '%', min: 0, max: 100, step: 1 },
  ]},
];

// ── Presety planet ────────────────────────────────────────────────────────
export const PRESETS = {
  earth: { name: '🌍 Ziemia 2.0', params: {
    starType: 'G', distance: 1.0, mass: 1.0, rotationH: 24, tilt: 23, moon: true,
    magneticField: 80, volcanism: 30, water: 70, pressure: 1.0,
    atm: { n2: 78, o2: 0, co2: 15, ch4: 2, nh3: 0, h2: 0 },
    elements: { C: 60, N: 40, P: 35, S: 30, Fe: 60, Si: 60 },
  }},
  titan: { name: '🟠 Świat metanowy', params: {
    starType: 'G', distance: 9.5, mass: 0.4, rotationH: 382, tilt: 27, moon: false,
    magneticField: 10, volcanism: 15, water: 25, pressure: 1.5,
    atm: { n2: 90, o2: 0, co2: 0, ch4: 8, nh3: 1, h2: 1 },
    elements: { C: 70, N: 50, P: 10, S: 10, Fe: 20, Si: 30 },
  }},
  volcanic: { name: '🌋 Piekło wulkaniczne', params: {
    starType: 'K', distance: 0.35, mass: 1.6, rotationH: 40, tilt: 5, moon: false,
    magneticField: 40, volcanism: 95, water: 8, pressure: 30,
    atm: { n2: 10, o2: 0, co2: 75, ch4: 1, nh3: 0, h2: 2 },
    elements: { C: 30, N: 15, P: 20, S: 85, Fe: 70, Si: 85 },
  }},
  iceAmmonia: { name: '❄️ Lodowy świat amoniaku', params: {
    starType: 'M', distance: 0.35, mass: 0.9, rotationH: 200, tilt: 12, moon: true,
    magneticField: 55, volcanism: 25, water: 45, pressure: 3,
    atm: { n2: 70, o2: 0, co2: 2, ch4: 3, nh3: 20, h2: 3 },
    elements: { C: 55, N: 65, P: 20, S: 20, Fe: 40, Si: 40 },
  }},
  gasDwarf: { name: '🎈 Karzeł gazowy', params: {
    starType: 'G', distance: 2.2, mass: 8, rotationH: 11, tilt: 15, moon: true,
    magneticField: 90, volcanism: 5, water: 0, pressure: 90,
    atm: { n2: 5, o2: 0, co2: 1, ch4: 4, nh3: 5, h2: 80 },
    elements: { C: 40, N: 30, P: 10, S: 15, Fe: 20, Si: 15 },
  }},
  random: { name: '🎲 Losowa planeta', params: null },
};

export function randomParams(rng) {
  const stars = Object.keys(STAR_TYPES);
  const starType = stars[Math.floor(rng() * stars.length)];
  const hz = STAR_TYPES[starType].hz;
  const nearHZ = rng() < 0.6;
  const distance = nearHZ
    ? hz[0] + rng() * (hz[1] - hz[0]) * (0.6 + rng())
    : 0.05 + Math.pow(rng(), 2) * 14;
  const mix = () => Math.floor(Math.pow(rng(), 1.6) * 100);
  const atmRaw = { n2: mix(), o2: 0, co2: mix(), ch4: mix() / 3, nh3: mix() / 4, h2: mix() / 2 };
  return {
    starType, distance: +distance.toFixed(2),
    mass: +(0.1 + Math.pow(rng(), 1.4) * 10).toFixed(2),
    rotationH: Math.floor(6 + Math.pow(rng(), 2) * 1200),
    tilt: Math.floor(rng() * 60), moon: rng() < 0.5,
    magneticField: Math.floor(rng() * 100), volcanism: Math.floor(rng() * 100),
    water: Math.floor(Math.pow(rng(), 0.8) * 100),
    pressure: +(Math.pow(rng(), 2.2) * 60).toFixed(2),
    atm: atmRaw,
    elements: { C: mix(), N: mix(), P: mix(), S: mix(), Fe: mix(), Si: mix() },
  };
}

// ── Wielkości pochodne (temperatura, promieniowanie itd.) ─────────────────
export function computeDerived(params, life) {
  const star = STAR_TYPES[params.starType];
  const flux = star.lum / (params.distance * params.distance);

  // Albedo: lód i chmury odbijają, oceany/skała pochłaniają
  const a = params.atm;
  const atmTotal = Math.max(1, a.n2 + a.o2 + a.co2 + a.ch4 + a.nh3 + a.h2);
  const f = k => a[k] / atmTotal; // frakcje 0..1
  const cloudiness = Math.min(0.9, 0.08 + Math.min(1, params.pressure) * 0.45 * (0.4 + params.water / 100) + (params.pressure > 10 ? 0.25 : 0));
  let albedo = 0.12 + cloudiness * 0.35;

  // Temperatura efektywna (K): 278.5K przy strumieniu 1 i albedo 0
  const tEff = 278.5 * Math.pow(Math.max(flux * (1 - albedo), 1e-6), 0.25);

  // Efekt cieplarniany — strojony tak, by Ziemia (N2/O2, ślad CO2, 1 bar) dawała ~+33K
  const pFac = Math.pow(Math.min(params.pressure, 100), 0.45);
  const ghGas = 0.55 + f('co2') * 3.2 + f('ch4') * 9 + f('nh3') * 5 + f('h2') * 2.2 + f('n2') * 0.12;
  const waterVapor = (params.water / 100) * Math.max(0, Math.min(1, (tEff - 240) / 80)) * 0.8;
  const greenhouse = Math.min(500, 33 * pFac * (ghGas + waterVapor));

  const temp = tEff + greenhouse - 273.15; // °C

  // Grawitacja (planety skaliste: R ~ M^0.27)
  const gravity = Math.pow(params.mass, 0.46);

  // Promieniowanie na powierzchni (umowne jednostki, Ziemia ≈ 10)
  const flareBase = star.flare * Math.min(4, 1 / Math.max(0.05, params.distance));
  const shieldMag = 1 - 0.75 * (params.magneticField / 100);
  const shieldAtm = 1 - 0.6 * Math.min(1, params.pressure / 2);
  const radiation = Math.max(1, flareBase * shieldMag * shieldAtm * 3 + (life ? 0 : 0));

  // Ryzyko utraty atmosfery
  const escaping = params.mass < 0.35 && params.pressure > 0.01;
  const eroding = params.magneticField < 25 && star.flare > 25 && params.pressure > 0.01;

  return { flux, albedo, tEff, greenhouse, temp, gravity, radiation, escaping, eroding, cloudiness, starColor: star.color };
}

// ── Interwencje gracza ────────────────────────────────────────────────────
export const INTERVENTIONS = [
  { id: 'comet', name: 'Grad komet lodowych', cost: 25, icon: '☄️',
    desc: '+8% pokrycia cieczą, odrobina organiki. Małe ryzyko lokalnej katastrofy.' },
  { id: 'organics', name: 'Zasiew organiki', cost: 35, icon: '🧬',
    desc: 'Bombardowanie meteorytami bogatymi w aminokwasy. Znacząco zwiększa szansę abiogenezy.' },
  { id: 'volcano', name: 'Stymulacja wulkanizmu', cost: 30, icon: '🌋',
    desc: '+15% wulkanizmu, +CO₂ i siarka do atmosfery. Ogrzewa planetę.' },
  { id: 'magnet', name: 'Rozruch dynama planetarnego', cost: 50, icon: '🧲',
    desc: '+25% pola magnetycznego. Chroni atmosferę i życie przed promieniowaniem.' },
  { id: 'microbes', name: 'Panspermia kierowana', cost: 90, icon: '🦠',
    desc: 'Zasiedlenie gotowymi mikrobami. Działa tylko, gdy warunki są choć znośne (przydatność > 30%).' },
  { id: 'evoboost', name: 'Impuls ewolucyjny', cost: 60, icon: '⚡',
    desc: 'Przyspiesza ewolucję wszystkich linii przez 200 mln lat (×3).' },
  { id: 'co2drain', name: 'Wychwyt CO₂', cost: 40, icon: '🌫️',
    desc: 'Usuwa połowę CO₂ z atmosfery. Chłodzi rozgrzane światy.' },
  { id: 'ghpump', name: 'Pompa cieplarniana', cost: 40, icon: '🔥',
    desc: 'Uwalnia CO₂ i CH₄ z zamarzniętej skorupy. Ogrzewa zimne światy.' },
];

// ── Główna klasa symulacji ────────────────────────────────────────────────
export class Simulation {
  constructor(params, seed = Date.now() % 2147483647) {
    this.rng = mulberry32(seed);
    this.seed = seed;
    this.params = JSON.parse(JSON.stringify(params));
    this.time = 0;               // mln lat
    this.points = 60;            // Punkty Genezy
    this.log = [];
    this.species = [];
    this.life = {};
    this.evoBoostUntil = 0;
    this.textureDirty = true;
    this.milestones = new Set();
    for (const b of BIOCHEMISTRIES) {
      this.life[b.id] = { alive: false, stage: -1, biomass: 0, sinceStage: 0, everAlive: false, extinctions: 0 };
    }
    this.derived = computeDerived(this.params, null);
    this.addLog('start', `Symulacja rozpoczęta. Temperatura powierzchni: ${this.derived.temp.toFixed(0)}°C.`);
  }

  addLog(type, text) {
    this.log.push({ time: this.time, type, text });
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
    this.logDirty = true;
  }

  totalBiomass() {
    let s = 0;
    for (const id in this.life) s += this.life[id].biomass;
    return s;
  }

  dominant() {
    let best = null;
    for (const id in this.life) {
      const l = this.life[id];
      if (l.alive && (!best || l.stage > this.life[best].stage || (l.stage === this.life[best].stage && l.biomass > this.life[best].biomass))) best = id;
    }
    return best;
  }

  // Jeden krok symulacji; dt w mln lat (typowo 0.1)
  step(dt) {
    this.time += dt;
    const p = this.params;

    // — Powolne procesy geofizyczne —
    // Ucieczka atmosfery przy małej masie lub braku pola magnetycznego
    if (this.derived.escaping) p.pressure = Math.max(0, p.pressure - p.pressure * 0.0004 * dt * 10);
    if (this.derived.eroding) p.pressure = Math.max(0, p.pressure - p.pressure * 0.0002 * dt * 10);
    // Wulkanizm powoli stygnie w małych planetach
    if (p.mass < 0.6 && p.volcanism > 0) p.volcanism = Math.max(0, p.volcanism - 0.0006 * dt * 10);

    // — Fotosynteza zmienia atmosferę (Wielkie Utlenienie) —
    const carbonLife = this.life['carbon'];
    if (carbonLife.alive && carbonLife.stage >= 3 && carbonLife.biomass > 5) {
      const rate = Math.min(0.02, carbonLife.biomass * 0.00002) * dt * 10;
      const takenCO2 = Math.min(p.atm.co2, rate * 8);
      p.atm.co2 -= takenCO2;
      p.atm.o2 = Math.min(60, p.atm.o2 + takenCO2 * 0.7 + rate);
      if (p.atm.o2 > 10) this.milestone('oxygen', '🌬️ Wielkie Utlenienie! Fotosynteza wypełniła atmosferę tlenem.', 40);
    }

    this.derived = computeDerived(p, this.life);

    // — Zdarzenia losowe —
    this.randomEvents(dt);

    // — Życie: abiogeneza, wzrost, ewolucja —
    const boost = this.time < this.evoBoostUntil ? 3 : 1;
    for (const bio of BIOCHEMISTRIES) {
      const l = this.life[bio.id];
      const score = bio.score(this);
      l.score = score;

      if (!l.alive) {
        // Abiogeneza: szansa/mln lat zależna od kwadratu przydatności
        if (score > 0.08) {
          const organicBonus = this.organicsUntil && this.time < this.organicsUntil ? 5 : 1;
          const pAbio = score * score * 0.012 * dt * 10 * organicBonus * boost;
          if (this.rng() < pAbio) this.spark(bio);
        }
        continue;
      }

      // Wzrost/spadek biomasy — logistyczny wokół pojemności środowiska
      const capacity = 10 + score * 900 * (1 + l.stage * 0.6);
      const growth = (0.004 + 0.002 * l.stage) * dt * 10;
      if (score < 0.03) {
        l.biomass -= l.biomass * 0.05 * dt * 10; // warunki zabójcze
      } else {
        l.biomass += l.biomass * growth * (1 - l.biomass / capacity);
      }
      if (l.biomass < 0.5) { this.extinct(bio, 'warunki środowiskowe stały się zabójcze'); continue; }

      // Awans na kolejny etap — pasek postępu wypełniany tym szybciej, im lepsze warunki
      l.sinceStage += dt;
      const maxStage = bio.maxStage ?? 7;
      if (l.stage < maxStage && score > 0.12) {
        const slow = bio.slowFactor ?? 1;
        const needed = STAGE_TIME[l.stage] * slow / Math.max(0.15, score);
        l.progress = (l.progress || 0) + (dt / needed) * boost;
        if (l.progress >= (l.goal ?? 1)) this.advance(bio);
      }
    }

    // — Punkty Genezy: baza + premia za biomasę i etapy —
    const biomass = this.totalBiomass();
    const dom = this.dominant();
    const stageBonus = dom ? this.life[dom].stage : 0;
    this.points += (0.12 + Math.min(0.5, biomass * 0.0006) + stageBonus * 0.05) * dt;
  }

  spark(bio) {
    const l = this.life[bio.id];
    l.alive = true; l.everAlive = true; l.stage = 1; l.biomass = 2; l.sinceStage = 0;
    l.progress = 0; l.goal = 0.75 + this.rng() * 0.6;
    this.addLog('life', `✨ ABIOGENEZA! W ${bio.solvent === '—' ? 'burzach plazmowych' : bio.solvent} narodziły się pierwsze protokomórki linii: ${bio.name}.`);
    this.points += 30;
    this.textureDirty = true;
  }

  advance(bio) {
    const l = this.life[bio.id];
    l.stage++; l.sinceStage = 0;
    l.progress = 0;
    l.goal = 0.75 + this.rng() * 0.6;   // losowy rozrzut tempa ewolucji
    const stage = STAGES[l.stage];
    const sp = generateSpecies(this.rng, bio, l.stage, this);
    this.species.push(sp);
    this.addLog('evolve', `${stage.icon} Linia ${bio.name} osiągnęła etap: ${stage.name}. Pojawia się ${sp.fullName}.`);
    this.points += 10 + l.stage * 8;
    this.textureDirty = true;
    if (l.stage === 6) this.milestone('intel_' + bio.id, `🧠 INTELIGENCJA! ${sp.fullName} zaczyna używać narzędzi i przekazywać wiedzę.`, 80);
    if (l.stage === 7) this.milestone('civ_' + bio.id, `🏙️ CYWILIZACJA! Na planecie płoną pierwsze miasta ${sp.fullName}. Twoje dzieło patrzy w gwiazdy.`, 150);
  }

  extinct(bio, reason) {
    const l = this.life[bio.id];
    l.alive = false; l.biomass = 0; l.extinctions++;
    const st = l.stage; l.stage = -1;
    for (const sp of this.species) if (sp.biochem === bio.id && !sp.extinctAt) sp.extinctAt = this.time;
    this.addLog('extinct', `💀 WYMARCIE linii ${bio.name} (etap ${st >= 0 ? STAGES[st].name : '?'}) — ${reason}.`);
    this.textureDirty = true;
  }

  milestone(id, text, pts) {
    if (this.milestones.has(id)) return;
    this.milestones.add(id);
    this.addLog('milestone', text + ` (+${pts} PG)`);
    this.points += pts;
  }

  randomEvents(dt) {
    const roll = this.rng();
    const freq = dt * 10; // skala częstości
    // Uderzenie asteroidy
    if (roll < 0.0009 * freq) {
      const big = this.rng() < 0.25;
      if (big) {
        this.addLog('disaster', '☄️ WIELKI IMPAKT! Planetoida rozmiaru miasta uderza w planetę. Niebo ciemnieje od pyłu.');
        this.hitBiomass(0.45, 'zima impaktowa');
        this.params.water = Math.min(100, this.params.water + 1);
      } else {
        this.addLog('event', '🌠 Deszcz meteorów dostarcza świeżej materii organicznej.');
        this.organicsUntil = this.time + 50;
      }
      this.textureDirty = true;
    }
    // Rozbłysk gwiazdy
    const star = STAR_TYPES[this.params.starType];
    if (roll > 0.9995 - star.flare * 0.00003 * freq) {
      if (this.params.magneticField > 50 || this.params.pressure > 3) {
        this.addLog('event', '🌟 Potężny rozbłysk gwiazdy! Pole magnetyczne i atmosfera ochroniły powierzchnię — zorze płoną na całym niebie.');
      } else {
        this.addLog('disaster', '🌟 Rozbłysk gwiazdy smaga niechronioną powierzchnię promieniowaniem!');
        this.hitBiomass(0.25, 'sterylizacja promieniowaniem');
      }
    }
    // Superwulkan
    if (roll > 0.5 && roll < 0.5 + 0.0004 * freq * (this.params.volcanism / 50)) {
      this.addLog('disaster', '🌋 Erupcja superwulkanu! Popioły przesłaniają gwiazdę, CO₂ zalewa atmosferę.');
      this.params.atm.co2 = Math.min(100, this.params.atm.co2 + 3);
      this.hitBiomass(0.18, 'zima wulkaniczna');
      this.textureDirty = true;
    }
    // Epoka lodowcowa / odwilż — dryf orbitalny Milankovicia
    if (roll > 0.3 && roll < 0.3 + 0.0003 * freq) {
      const cool = this.rng() < 0.5;
      this.addLog('event', cool ? '❄️ Cykle orbitalne pogrążają planetę w epoce lodowcowej.' : '☀️ Cykle orbitalne przynoszą epokę ciepła.');
      this.tempDrift = (this.tempDrift || 0) + (cool ? -6 : 6); // uwzględniane pośrednio przez log — efekt symboliczny
    }
    // Błysk gamma — bardzo rzadki kataklizm
    if (roll > 0.99998) {
      this.addLog('disaster', '💥 BŁYSK GAMMA z odległej supernowej! Warstwa ozonowa zniszczona, powierzchnia wyjałowiona.');
      this.hitBiomass(0.7, 'błysk gamma');
    }
  }

  hitBiomass(fraction, reason) {
    for (const bio of BIOCHEMISTRIES) {
      const l = this.life[bio.id];
      if (!l.alive) continue;
      l.biomass *= (1 - fraction * (0.6 + this.rng() * 0.8));
      l.progress = (l.progress || 0) * (1 - fraction * 0.5);   // kataklizm cofa też postęp ewolucyjny
      if (l.biomass < 0.5) this.extinct(bio, reason);
    }
  }

  // Interwencja gracza; zwraca komunikat lub null gdy nie stać / nie można
  intervene(id) {
    const def = INTERVENTIONS.find(i => i.id === id);
    if (!def || this.points < def.cost) return { ok: false, msg: 'Za mało Punktów Genezy.' };
    const p = this.params;
    switch (id) {
      case 'comet':
        p.water = Math.min(100, p.water + 8);
        this.organicsUntil = Math.max(this.organicsUntil || 0, this.time + 30);
        if (this.rng() < 0.15) { this.hitBiomass(0.1, 'uderzenia komet'); this.addLog('player', '☄️ Komety dostarczyły wodę, ale kilka spadło niefortunnie…'); }
        else this.addLog('player', '☄️ Grad komet lodowych zwiększył zasoby cieczy na planecie.');
        break;
      case 'organics':
        this.organicsUntil = this.time + 150;
        this.addLog('player', '🧬 Meteoryty pełne aminokwasów zasiały planetę organiką. Szansa abiogenezy znacząco rośnie.');
        break;
      case 'volcano':
        p.volcanism = Math.min(100, p.volcanism + 15);
        p.atm.co2 = Math.min(100, p.atm.co2 + 4);
        p.elements.S = Math.min(100, p.elements.S + 5);
        this.addLog('player', '🌋 Wnętrze planety budzi się. Wulkany wyrzucają CO₂ i siarkę.');
        break;
      case 'magnet':
        p.magneticField = Math.min(100, p.magneticField + 25);
        this.addLog('player', '🧲 Jądro planety wiruje szybciej — pole magnetyczne wzmocnione.');
        break;
      case 'microbes': {
        let seeded = false;
        for (const bio of BIOCHEMISTRIES) {
          const l = this.life[bio.id];
          if (!l.alive && bio.score(this) > 0.3) { this.spark(bio); l.stage = 2; seeded = true; break; }
        }
        if (!seeded) return { ok: false, msg: 'Żadna biochemia nie przetrwa obecnych warunków (wymagana przydatność > 30%).' };
        this.addLog('player', '🦠 Panspermia kierowana: kapsuły z mikrobami dotarły do powierzchni.');
        break;
      }
      case 'evoboost':
        this.evoBoostUntil = this.time + 200;
        this.addLog('player', '⚡ Impuls ewolucyjny: mutacje i selekcja przyspieszają (×3 przez 200 mln lat).');
        break;
      case 'co2drain':
        p.atm.co2 *= 0.5;
        this.addLog('player', '🌫️ Orbitalne wychwytywacze usunęły połowę CO₂. Planeta stygnie.');
        break;
      case 'ghpump':
        p.atm.co2 = Math.min(100, p.atm.co2 + 10);
        p.atm.ch4 = Math.min(100, p.atm.ch4 + 3);
        this.addLog('player', '🔥 Pompy cieplarniane uwolniły CO₂ i metan z wiecznej zmarzliny. Planeta się ogrzewa.');
        break;
    }
    this.points -= def.cost;
    this.derived = computeDerived(p, this.life);
    this.textureDirty = true;
    return { ok: true };
  }
}
