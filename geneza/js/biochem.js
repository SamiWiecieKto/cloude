// GENEZA — definicje biochemii życia i ich wymagań środowiskowych.
// Każda biochemia ocenia planetę funkcją score() -> 0..1 (0 = brak szans, 1 = idealnie).

// Pomocnicze: dzwonowa funkcja przydatności — 1 w [lo..hi], opada do 0 poza [min..max]
function band(value, min, lo, hi, max) {
  if (value <= min || value >= max) return 0;
  if (value >= lo && value <= hi) return 1;
  if (value < lo) return (value - min) / (lo - min);
  return (max - value) / (max - hi);
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// Etapy rozwoju życia (uniwersalna drabina, nazwy per biochemia mogą się różnić)
export const STAGES = [
  { id: 0, name: 'Chemia prebiotyczna', icon: '🧪' },
  { id: 1, name: 'Protokomórki', icon: '🫧' },
  { id: 2, name: 'Mikroorganizmy', icon: '🦠' },
  { id: 3, name: 'Fotosynteza / chemosynteza', icon: '🌿' },
  { id: 4, name: 'Życie wielokomórkowe', icon: '🪸' },
  { id: 5, name: 'Złożona fauna i flora', icon: '🦎' },
  { id: 6, name: 'Inteligencja', icon: '🧠' },
  { id: 7, name: 'Cywilizacja', icon: '🏙️' },
];

// Typowy czas (mln lat) potrzebny na przejście z etapu N do N+1 przy score=1
// (na Ziemi: abiogeneza ~0.5 mld, fotosynteza ~1 mld, wielokomórkowość ~2 mld...)
export const STAGE_TIME = [80, 150, 400, 700, 500, 300, 150, Infinity];

export const BIOCHEMISTRIES = [
  {
    id: 'carbon',
    name: 'Węglowo-wodne',
    desc: 'Klasyczne życie oparte na węglu i ciekłej wodzie — takie jak ziemskie. Wymaga umiarkowanych temperatur, wody, węgla, azotu i fosforu.',
    color: '#39d98a',
    solvent: 'woda',
    score(p) {
      const temp = band(p.derived.temp, -25, 5, 55, 125);                 // ciekła woda (z solankami i ciśnieniem)
      const water = band(p.params.water, 2, 20, 90, 100.001);             // potrzebne oceany
      const chem = clamp01(p.params.elements.C / 40) * clamp01(p.params.elements.N / 30) * clamp01(p.params.elements.P / 25);
      const press = band(p.params.pressure, 0.05, 0.4, 8, 60);            // ciśnienie utrzymujące ciecz
      const rad = 1 - clamp01((p.derived.radiation - 30) / 120);          // promieniowanie szkodzi
      return clamp01(temp * water * Math.pow(chem, 0.6) * press * Math.max(0.15, rad));
    },
    photosynthesis: true,   // etap 3 produkuje tlen
  },
  {
    id: 'ammonia',
    name: 'Amoniakalne',
    desc: 'Życie w ciekłym amoniaku zamiast wody. Rozwija się w mroźnych światach (-80…-30°C) z amoniakiem w atmosferze. Powolny metabolizm, długie epoki.',
    color: '#4fc3f7',
    solvent: 'amoniak',
    score(p) {
      const temp = band(p.derived.temp, -110, -80, -32, -5);
      const nh3 = clamp01(p.params.atm.nh3 / 8);
      const chem = clamp01(p.params.elements.C / 40) * clamp01(p.params.elements.N / 20);
      const press = band(p.params.pressure, 0.3, 1, 20, 80);
      return clamp01(temp * nh3 * Math.pow(chem, 0.5) * press);
    },
    slowFactor: 1.8,        // zimny metabolizm = wolniejsza ewolucja
  },
  {
    id: 'methane',
    name: 'Metanogeniczne',
    desc: 'Egzotyczne życie w jeziorach ciekłego metanu, jak hipotetyczne organizmy Tytana. Wymaga skrajnego zimna (-190…-150°C) i metanu.',
    color: '#ffb74d',
    solvent: 'metan',
    score(p) {
      const temp = band(p.derived.temp, -210, -190, -148, -120);
      const ch4 = clamp01(p.params.atm.ch4 / 5);
      const c = clamp01(p.params.elements.C / 30);
      return clamp01(temp * ch4 * Math.pow(c, 0.5));
    },
    slowFactor: 3.0,
  },
  {
    id: 'silicon',
    name: 'Krzemowo-termalne',
    desc: 'Spekulatywne życie krzemowe: kryształy metabolizujące w żarze. Potrzebuje wysokich temperatur (150…600°C), krzemu i aktywnych wulkanów.',
    color: '#b0bec5',
    solvent: 'stopione sole',
    score(p) {
      const temp = band(p.derived.temp, 90, 150, 600, 900);
      const si = clamp01(p.params.elements.Si / 50);
      const volc = clamp01(p.params.volcanism / 40);
      return clamp01(temp * si * volc);
    },
    slowFactor: 2.2,
    noPhotosynthesis: true,
  },
  {
    id: 'sulfur',
    name: 'Siarkowe (chemosynteza)',
    desc: 'Chemolitotrofy żywiące się związkami siarki przy kominach wulkanicznych. Nie potrzebują światła — wystarczy geotermia, siarka i rozpuszczalnik.',
    color: '#ffe14d',
    solvent: 'woda/kwasy',
    score(p) {
      const temp = band(p.derived.temp, -15, 20, 130, 250);
      const s = clamp01(p.params.elements.S / 50);
      const volc = clamp01(p.params.volcanism / 55);
      const wet = clamp01(p.params.water / 15);
      return clamp01(temp * s * volc * wet);
    },
    slowFactor: 1.4,
    maxStage: 6,   // chemosynteza daje za mało energii na cywilizację przemysłową
  },
  {
    id: 'hydrogen',
    name: 'Wodorowi pływacy',
    desc: 'Aerożyciowe organizmy-balony dryfujące w gęstej wodorowej atmosferze — jak hipotetyczni „pływacy" Sagana dla Jowisza. Wymagają grubej atmosfery H₂.',
    color: '#ce93d8',
    solvent: 'atmosfera H₂',
    score(p) {
      const h2 = clamp01(p.params.atm.h2 / 30);
      const press = band(p.params.pressure, 3, 10, 100, 200);
      const temp = band(p.derived.temp, -150, -80, 120, 300);
      return clamp01(h2 * press * temp);
    },
    aerial: true,
  },
  {
    id: 'radiotroph',
    name: 'Radiotroficzne',
    desc: 'Organizmy czerpiące energię z promieniowania jonizującego (jak grzyby z Czarnobyla, tylko dalej). Kwitną tam, gdzie inne życie ginie.',
    color: '#76ff03',
    solvent: 'woda',
    score(p) {
      const rad = band(p.derived.radiation, 25, 60, 300, 1000);
      const c = clamp01(p.params.elements.C / 30);
      const wet = clamp01(p.params.water / 8);
      const temp = band(p.derived.temp, -60, -20, 80, 160);
      return clamp01(rad * Math.pow(c * wet, 0.5) * temp);
    },
    maxStage: 5,   // trudno o inteligencję z mutacyjnym chaosem
  },
  {
    id: 'plasma',
    name: 'Plazmowo-elektryczne',
    desc: 'Czysto hipotetyczne struktury samoorganizującej się plazmy i pól elektrycznych w ekstremalnych burzach. Bardziej „zjawisko" niż biologia.',
    color: '#40c4ff',
    solvent: '—',
    score(p) {
      const storm = clamp01(p.params.pressure / 60) * clamp01(p.params.volcanism / 60);
      const temp = band(p.derived.temp, 200, 400, 1200, 2000);
      const flare = clamp01(p.derived.radiation / 200);
      return clamp01(storm * Math.max(temp, flare * 0.7) * 0.8);
    },
    maxStage: 4,
    slowFactor: 0.5,   // plazma "żyje" szybko
  },
];

export function getBiochem(id) {
  return BIOCHEMISTRIES.find(b => b.id === id);
}
