// GENEZA — proceduralny generator gatunków: nazwy, cechy i portrety SVG.
import { STAGES } from './biochem.js';

// ── Nazwy ─────────────────────────────────────────────────────────────────
const GENUS_SYL = ['xel', 'vor', 'tha', 'mi', 'kro', 'zan', 'ael', 'pyr', 'och', 'lum', 'ner', 'gly', 'sar', 'ume', 'bry', 'kta', 'phos', 'yl', 'dra', 'ost'];
const SPECIES_SYL = ['is', 'ura', 'on', 'ax', 'ith', 'eus', 'ora', 'ans', 'ellus', 'ide', 'oph', 'yra', 'um', 'ras', 'ex'];

const NICK_ADJ = {
  carbon: ['zielony', 'oceaniczny', 'łąkowy', 'rafowy', 'leśny', 'przybrzeżny'],
  ammonia: ['mroźny', 'szronowy', 'polarny', 'lodowy', 'zimnokrwisty'],
  methane: ['smolisty', 'bursztynowy', 'jeziorny', 'mglisty'],
  silicon: ['krystaliczny', 'bazaltowy', 'żarowy', 'obsydianowy'],
  sulfur: ['siarkowy', 'kominowy', 'kwasolubny', 'żółty'],
  hydrogen: ['obłoczny', 'burzowy', 'stratosferyczny', 'dryfujący'],
  radiotroph: ['jarzący', 'mutagenny', 'popromienny', 'fluorescencyjny'],
  plasma: ['piorunowy', 'jonowy', 'iskrowy', 'polarny'],
};

const NICK_NOUN = {
  1: ['pęcherzyk', 'zaczyn', 'praglut'],
  2: ['drobinek', 'mikrob', 'zarodnik'],
  3: ['listnik', 'kożuch', 'sinica', 'dywanik'],
  4: ['gąszczak', 'polip', 'splotek', 'kielich'],
  5: ['pełzacz', 'skrytoszpon', 'wirotek', 'głębinnik', 'kłaczor', 'strzelec'],
  6: ['myśliciel', 'znakotwórca', 'ogniomistrz', 'pieśniarz'],
  7: ['budowniczy', 'gwiazdowierca', 'miastotwórca'],
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

function makeName(rng, bio, stage) {
  const genus = cap(pick(rng, GENUS_SYL) + pick(rng, GENUS_SYL) + pick(rng, SPECIES_SYL));
  const species = pick(rng, GENUS_SYL) + pick(rng, SPECIES_SYL);
  const nick = `${pick(rng, NICK_NOUN[Math.max(1, Math.min(7, stage))])} ${pick(rng, NICK_ADJ[bio.id])}`;
  return { latin: `${genus} ${species}`, nick: cap(nick) };
}

// ── Cechy ─────────────────────────────────────────────────────────────────
const LOCOMOTION = {
  aquatic: ['pływanie falujące', 'odrzut wodny', 'pełzanie po dnie', 'dryf planktonowy'],
  land: ['kroczenie', 'pełzanie', 'skoki', 'toczenie się'],
  aerial: ['dryf balonowy', 'lot żaglowy', 'pulsacja gazowa'],
  crystal: ['wzrost kierunkowy', 'migracja termiczna', 'osypywanie i odrastanie'],
};

const SENSES = ['fotoreceptory', 'echolokacja', 'elektrorecepcja', 'chemoreceptory', 'czułki wibracyjne', 'termowizja', 'magnetorecepcja'];
const DIETS = {
  carbon: ['fotosynteza', 'filtrowanie planktonu', 'drapieżnictwo', 'roślinożerność', 'padlinożerność'],
  ammonia: ['chemosynteza azotowa', 'filtrowanie zawiesiny', 'drapieżnictwo powolne'],
  methane: ['metabolizm acetylenowy', 'pochłanianie węglowodorów'],
  silicon: ['mineralotrofia', 'termosynteza', 'wchłanianie stopionych soli'],
  sulfur: ['utlenianie siarkowodoru', 'chemosynteza kominowa'],
  hydrogen: ['zbieranie aerozoli', 'fotosynteza wodorowa', 'polowanie na mniejszych pływaków'],
  radiotroph: ['radiosynteza melaninowa', 'pochłanianie izotopów'],
  plasma: ['absorpcja wyładowań', 'rezonans pola magnetycznego'],
};

export function generateSpecies(rng, bio, stage, sim) {
  const name = makeName(rng, bio, stage);
  const aquatic = !bio.aerial && sim.params.water > 30 && rng() < 0.7;
  const habitat = bio.aerial ? 'aerial' : (bio.id === 'silicon' ? 'crystal' : (aquatic ? 'aquatic' : 'land'));
  const habitatName = { aquatic: 'oceany', land: 'lądy', aerial: 'atmosfera', crystal: 'pola geotermalne' }[habitat];

  const sizeCm = stage <= 2 ? +(rng() * 0.01).toFixed(4)
    : stage === 3 ? +(rng() * 30).toFixed(1)
    : +(Math.pow(rng(), 1.5) * (stage >= 5 ? 900 : 120) + 1).toFixed(0);

  const traits = [];
  traits.push(`Metabolizm: ${pick(rng, DIETS[bio.id])}`);
  if (stage >= 4) traits.push(`Lokomocja: ${pick(rng, LOCOMOTION[habitat])}`);
  if (stage >= 4) traits.push(`Zmysły: ${pick(rng, SENSES)}${rng() < 0.4 ? ', ' + pick(rng, SENSES) : ''}`);
  if (stage >= 5 && rng() < 0.5) traits.push(pick(rng, ['Bioluminescencja godowa', 'Pancerz segmentowy', 'Symbioza z mikrobami', 'Hibernacja epokowa', 'Rój o wspólnej pamięci', 'Regeneracja całkowita']));
  if (stage >= 6) traits.push(pick(rng, ['Prymitywne narzędzia', 'Język gestów chemicznych', 'Kult gwiazdy macierzystej', 'Hodowla organizmów niższych']));
  if (stage >= 7) traits.push(pick(rng, ['Miasta-kopce widoczne z orbity', 'Radioastronomia', 'Żegluga oceaniczna', 'Inżynieria klimatu']));

  return {
    id: 'sp' + Math.floor(rng() * 1e9),
    biochem: bio.id,
    biochemName: bio.name,
    stage,
    stageName: STAGES[stage].name,
    latin: name.latin,
    nick: name.nick,
    fullName: `${name.nick} (${name.latin})`,
    habitat, habitatName, sizeCm, traits,
    bornAt: sim.time,
    extinctAt: null,
    svg: makeCreatureSVG(rng, bio, stage, habitat),
  };
}

// ── Portrety SVG ──────────────────────────────────────────────────────────
const PALETTES = {
  carbon: ['#2e7d32', '#66bb6a', '#26a69a', '#8d6e63', '#43a047'],
  ammonia: ['#4fc3f7', '#b3e5fc', '#80deea', '#9fa8da', '#e1f5fe'],
  methane: ['#ff9800', '#bf360c', '#8d6e63', '#ffcc80', '#a1887f'],
  silicon: ['#90a4ae', '#cfd8dc', '#78909c', '#b0bec5', '#eceff1'],
  sulfur: ['#fdd835', '#f57f17', '#ff7043', '#ffee58', '#e65100'],
  hydrogen: ['#ce93d8', '#f8bbd0', '#b39ddb', '#e1bee7', '#f3e5f5'],
  radiotroph: ['#33691e', '#76ff03', '#1b5e20', '#aeea00', '#212121'],
  plasma: ['#40c4ff', '#7c4dff', '#18ffff', '#651fff', '#00b0ff'],
};

function makeCreatureSVG(rng, bio, stage, habitat) {
  const pal = PALETTES[bio.id];
  const c1 = pick(rng, pal), c2 = pick(rng, pal), c3 = pick(rng, pal);
  const parts = [];
  const glow = (bio.id === 'radiotroph' || bio.id === 'plasma')
    ? `<filter id="g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  const filt = glow ? 'filter="url(#g)"' : '';

  if (stage <= 2) {
    // Komórka / kolonia mikrobów
    const n = stage === 1 ? 1 : 3 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const x = 60 + (rng() - 0.5) * 70, y = 60 + (rng() - 0.5) * 70, r = 8 + rng() * 16;
      parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${c1}" opacity="0.75" ${filt}/>`);
      parts.push(`<circle cx="${x + r * 0.2}" cy="${y - r * 0.2}" r="${r * 0.35}" fill="${c2}"/>`);
      if (rng() < 0.6) { // wici
        const a = rng() * Math.PI * 2;
        parts.push(`<path d="M ${x + Math.cos(a) * r} ${y + Math.sin(a) * r} q ${Math.cos(a) * 15} ${Math.sin(a) * 15 + 8}, ${Math.cos(a) * 26} ${Math.sin(a) * 26}" stroke="${c3}" stroke-width="2" fill="none"/>`);
      }
    }
  } else if (stage === 3) {
    // Maty / pionierska "roślinność"
    for (let i = 0; i < 8; i++) {
      const x = 15 + i * 13, h = 20 + rng() * 55, w = 4 + rng() * 7;
      parts.push(`<path d="M ${x} 105 q ${(rng() - 0.5) * 24} ${-h * 0.6}, ${(rng() - 0.5) * 14} ${-h}" stroke="${i % 2 ? c1 : c2}" stroke-width="${w}" stroke-linecap="round" fill="none" ${filt}/>`);
    }
    parts.push(`<ellipse cx="60" cy="106" rx="52" ry="8" fill="${c3}" opacity="0.5"/>`);
  } else if (bio.id === 'silicon') {
    // Formy krystaliczne
    const n = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const cx = 30 + rng() * 60, cy = 45 + rng() * 45, s = 12 + rng() * 26, a = rng() * Math.PI;
      const pts = [];
      const k = 3 + Math.floor(rng() * 3);
      for (let j = 0; j < k * 2; j++) {
        const rr = j % 2 ? s : s * 0.45, aa = a + (j / (k * 2)) * Math.PI * 2;
        pts.push(`${cx + Math.cos(aa) * rr},${cy + Math.sin(aa) * rr * 1.6}`);
      }
      parts.push(`<polygon points="${pts.join(' ')}" fill="${pick(rng, pal)}" opacity="0.85" stroke="${c3}" stroke-width="1"/>`);
    }
    if (stage >= 6) parts.push(`<circle cx="60" cy="40" r="5" fill="#fff" opacity="0.9"/>`);
  } else if (bio.id === 'plasma') {
    // Wyładowania
    for (let i = 0; i < 6; i++) {
      let d = `M ${20 + rng() * 20} ${20 + rng() * 80}`;
      let x = 30, y = 60;
      for (let j = 0; j < 5; j++) { x += 12 + rng() * 8; y += (rng() - 0.5) * 40; d += ` L ${x} ${y}`; }
      parts.push(`<path d="${d}" stroke="${pick(rng, pal)}" stroke-width="${1 + rng() * 2.5}" fill="none" ${filt} opacity="0.9"/>`);
    }
    parts.push(`<circle cx="60" cy="60" r="${10 + rng() * 12}" fill="${c1}" opacity="0.35" ${filt}/>`);
  } else if (habitat === 'aerial') {
    // Pływak balonowy
    const r = 26 + rng() * 14;
    parts.push(`<ellipse cx="60" cy="45" rx="${r}" ry="${r * 0.8}" fill="${c1}" opacity="0.8" ${filt}/>`);
    parts.push(`<ellipse cx="${60 - r * 0.3}" cy="${45 - r * 0.3}" rx="${r * 0.3}" ry="${r * 0.2}" fill="#fff" opacity="0.35"/>`);
    const tent = 3 + Math.floor(rng() * 5);
    for (let i = 0; i < tent; i++) {
      const x = 60 - r * 0.6 + (i / (tent - 1 || 1)) * r * 1.2;
      parts.push(`<path d="M ${x} ${45 + r * 0.7} q ${(rng() - 0.5) * 20} 25, ${(rng() - 0.5) * 12} ${35 + rng() * 15}" stroke="${c2}" stroke-width="2.5" fill="none"/>`);
    }
    if (stage >= 5) parts.push(`<circle cx="${60 + r * 0.5}" cy="43" r="4" fill="#111"/><circle cx="${60 + r * 0.5 + 1}" cy="42" r="1.3" fill="#fff"/>`);
  } else {
    // Zwierzokształtne: korpus + segmenty + odnóża/płetwy + oczy
    const bodyW = 30 + rng() * 26, bodyH = 16 + rng() * 18, cy = habitat === 'aquatic' ? 60 : 70;
    const segs = 1 + Math.floor(rng() * 3);
    for (let s = 0; s < segs; s++) {
      const sx = 60 + (s - (segs - 1) / 2) * bodyW * 0.75;
      parts.push(`<ellipse cx="${sx}" cy="${cy}" rx="${bodyW * (0.55 - s * 0.06)}" ry="${bodyH * (1 - s * 0.12)}" fill="${s % 2 ? c2 : c1}" ${filt}/>`);
    }
    const headX = 60 + (segs / 2) * bodyW * 0.75 + 6;
    parts.push(`<circle cx="${headX}" cy="${cy - bodyH * 0.4}" r="${bodyH * 0.65}" fill="${c1}"/>`);
    const eyes = pickEyes(rng);
    for (let e = 0; e < eyes; e++) {
      const ex = headX - 6 + e * 7, ey = cy - bodyH * 0.55 + (e % 2) * 4;
      parts.push(`<circle cx="${ex}" cy="${ey}" r="3.2" fill="#111"/><circle cx="${ex + 1}" cy="${ey - 1}" r="1.1" fill="#fff"/>`);
    }
    if (habitat === 'aquatic') {
      parts.push(`<path d="M ${60 - segs * bodyW * 0.45} ${cy} l -20 -14 l 4 14 l -4 14 z" fill="${c3}"/>`);
      const fins = 1 + Math.floor(rng() * 2);
      for (let f = 0; f < fins; f++) parts.push(`<path d="M ${50 + f * 18} ${cy - bodyH} q 6 -16, 16 -10 q -4 8, -10 12 z" fill="${c3}" opacity="0.9"/>`);
    } else {
      const legs = 2 + Math.floor(rng() * 3) * 2;
      for (let l = 0; l < legs; l++) {
        const lx = 60 - bodyW * 0.5 + (l / (legs - 1 || 1)) * bodyW;
        parts.push(`<path d="M ${lx} ${cy + bodyH * 0.6} q ${(rng() - 0.5) * 8} 12, ${(rng() - 0.5) * 10} ${20 + rng() * 6}" stroke="${c3}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
      }
      if (rng() < 0.4) parts.push(`<path d="M ${headX} ${cy - bodyH} q 4 -14, 12 -16" stroke="${c2}" stroke-width="2" fill="none"/><circle cx="${headX + 12}" cy="${cy - bodyH - 16}" r="2.5" fill="${c2}"/>`);
    }
    if (stage >= 7) parts.push(`<path d="M ${headX + 8} ${cy - bodyH * 1.4} l 5 -9 l 5 9 z" fill="#ffd54f" stroke="#b8860b" stroke-width="0.7"/>`);
  }

  const bgTint = { aquatic: '#0a2740', land: '#1c2617', aerial: '#2a1e3f', crystal: '#301a12' }[habitat] || '#101418';
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><defs>${glow}</defs><rect width="120" height="120" rx="10" fill="${bgTint}"/>${parts.join('')}</svg>`;
}

function pickEyes(rng) {
  const r = rng();
  return r < 0.5 ? 2 : r < 0.75 ? 1 : r < 0.92 ? 3 : 4;
}
