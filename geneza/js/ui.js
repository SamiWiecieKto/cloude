// GENEZA — interfejs: panele parametrów, statystyki, dziennik, galeria, interwencje.
import { PARAM_SCHEMA, PRESETS, INTERVENTIONS, STAR_TYPES, computeDerived, randomParams, mulberry32 } from './simulation.js';
import { BIOCHEMISTRIES, STAGES } from './biochem.js';

const $ = sel => document.querySelector(sel);

function getPath(obj, path) { return path.split('.').reduce((o, k) => o[k], obj); }
function setPath(obj, path, v) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = v;
}

// mapowanie suwak(0..1000) <-> wartość (liniowe lub logarytmiczne)
function toSlider(item, v) {
  if (!item.log) return ((v - item.min) / (item.max - item.min)) * 1000;
  const lmin = Math.log(item.min + 0.001), lmax = Math.log(item.max + 0.001);
  return ((Math.log(v + 0.001) - lmin) / (lmax - lmin)) * 1000;
}
function fromSlider(item, s) {
  let v;
  if (!item.log) v = item.min + (s / 1000) * (item.max - item.min);
  else {
    const lmin = Math.log(item.min + 0.001), lmax = Math.log(item.max + 0.001);
    v = Math.exp(lmin + (s / 1000) * (lmax - lmin)) - 0.001;
  }
  const st = item.step || 1;
  return Math.round(v / st) * st;
}

export class UI {
  constructor() {
    this.params = JSON.parse(JSON.stringify(PRESETS.earth.params));
    this.onStart = null;       // callback(params)
    this.onIntervene = null;   // callback(id)
    this.onSpeed = null;       // callback(mult|'pause')
    this.speed = 1;
    this.running = false;
    this.galleryCount = 0;
    this.buildSetup();
    this.buildInterventions();
    this.bindTabs();
    this.bindTimeControls();
    this.refreshPreview();
  }

  // ── Panel parametrów (lewa strona) ──────────────────────────────────────
  buildSetup() {
    const host = $('#paramPanel');
    host.innerHTML = '';

    // Presety
    const presetRow = document.createElement('div');
    presetRow.className = 'preset-row';
    for (const [key, ps] of Object.entries(PRESETS)) {
      const b = document.createElement('button');
      b.className = 'preset-btn';
      b.textContent = ps.name;
      b.onclick = () => {
        this.params = ps.params ? JSON.parse(JSON.stringify(ps.params)) : randomParams(mulberry32(Math.floor(Math.random() * 1e9)));
        this.buildSetup();
        this.refreshPreview();
      };
      presetRow.appendChild(b);
    }
    host.appendChild(presetRow);

    for (const group of PARAM_SCHEMA) {
      const g = document.createElement('div');
      g.className = 'param-group';
      g.innerHTML = `<h3>${group.group}</h3>`;
      for (const item of group.items) {
        const row = document.createElement('div');
        row.className = 'param-row';
        const val = getPath(this.params, item.key);

        if (item.type === 'select') {
          row.innerHTML = `<label>${item.label}</label>`;
          const sel = document.createElement('select');
          for (const o of item.options) {
            const opt = document.createElement('option');
            opt.value = o.value; opt.textContent = o.label;
            if (o.value === val) opt.selected = true;
            sel.appendChild(opt);
          }
          sel.onchange = () => { setPath(this.params, item.key, sel.value); this.refreshPreview(); };
          row.appendChild(sel);
        } else if (item.type === 'checkbox') {
          const id = 'chk_' + item.key.replace('.', '_');
          row.innerHTML = `<label for="${id}">${item.label}</label>`;
          const chk = document.createElement('input');
          chk.type = 'checkbox'; chk.id = id; chk.checked = !!val;
          chk.onchange = () => { setPath(this.params, item.key, chk.checked); this.refreshPreview(); };
          row.appendChild(chk);
        } else {
          row.innerHTML = `<label>${item.label} <span class="val" data-key="${item.key}"></span></label>`;
          const slider = document.createElement('input');
          slider.type = 'range'; slider.min = 0; slider.max = 1000; slider.step = 1;
          slider.value = toSlider(item, val);
          slider.oninput = () => {
            const v = fromSlider(item, +slider.value);
            setPath(this.params, item.key, +v.toFixed(4));
            row.querySelector('.val').textContent = this.fmtVal(item, v);
            this.refreshPreview();
          };
          row.querySelector('.val').textContent = this.fmtVal(item, val);
          row.appendChild(slider);
        }
        g.appendChild(row);
      }
      host.appendChild(g);
    }
  }

  fmtVal(item, v) {
    const num = item.step && item.step < 1 ? (+v).toFixed(2) : Math.round(v);
    return `${num}${item.unit ? ' ' + item.unit : ''}`;
  }

  // Podgląd warunków przed startem + na żywo
  refreshPreview(sim = null) {
    const params = sim ? sim.params : this.params;
    const d = sim ? sim.derived : computeDerived(params, null);
    const el = $('#preview');
    const fakeSim = sim || { params, derived: d, life: {} };
    const rows = BIOCHEMISTRIES.map(b => {
      const s = b.score(fakeSim);
      const pct = Math.round(s * 100);
      return `<div class="hab-row"><span class="hab-dot" style="background:${b.color}"></span>
        <span class="hab-name" title="${b.desc}">${b.name}</span>
        <div class="hab-bar"><div style="width:${pct}%;background:${b.color}"></div></div>
        <span class="hab-pct">${pct}%</span></div>`;
    }).join('');
    const warn = [];
    if (d.escaping) warn.push('⚠️ Zbyt mała masa — atmosfera ucieka w kosmos!');
    if (d.eroding) warn.push('⚠️ Słabe pole magnetyczne — wiatr gwiazdowy zdziera atmosferę!');
    el.innerHTML = `
      <div class="prev-stats">
        <div>🌡️ Temperatura: <b>${d.temp.toFixed(0)}°C</b></div>
        <div>☀️ Nasłonecznienie: <b>${(d.flux * 100).toFixed(0)}%</b> ziemskiego</div>
        <div>🛡️ Promieniowanie: <b>${d.radiation.toFixed(0)}</b> (Ziemia ≈ 10)</div>
        <div>⚖️ Grawitacja: <b>${d.gravity.toFixed(2)} g</b></div>
        <div>♨️ Efekt cieplarniany: <b>+${d.greenhouse.toFixed(0)}°C</b></div>
      </div>
      ${warn.map(w => `<div class="warn">${w}</div>`).join('')}
      <h4>Przydatność dla biochemii życia</h4>
      ${rows}`;
  }

  // ── Interwencje ─────────────────────────────────────────────────────────
  buildInterventions() {
    const host = $('#intervPanel');
    host.innerHTML = '<p class="hint">Wydawaj Punkty Genezy (PG), by kształtować planetę w trakcie symulacji.</p>';
    for (const iv of INTERVENTIONS) {
      const b = document.createElement('button');
      b.className = 'interv-btn';
      b.dataset.id = iv.id;
      b.innerHTML = `<span class="iv-icon">${iv.icon}</span>
        <span class="iv-body"><b>${iv.name}</b><small>${iv.desc}</small></span>
        <span class="iv-cost">${iv.cost} PG</span>`;
      b.onclick = () => { if (this.onIntervene) this.onIntervene(iv.id); };
      host.appendChild(b);
    }
  }

  updateInterventions(sim) {
    document.querySelectorAll('.interv-btn').forEach(b => {
      const iv = INTERVENTIONS.find(i => i.id === b.dataset.id);
      b.classList.toggle('disabled', !this.running || sim.points < iv.cost);
    });
  }

  // ── Zakładki ────────────────────────────────────────────────────────────
  bindTabs() {
    document.querySelectorAll('.tabbar').forEach(bar => {
      bar.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
          bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const panel = bar.parentElement;
          panel.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
          panel.querySelector('#' + btn.dataset.tab).classList.add('active');
        };
      });
    });
  }

  bindTimeControls() {
    $('#btnStart').onclick = () => {
      if (this.onStart) this.onStart(this.params);
    };
    document.querySelectorAll('.speed-btn').forEach(b => {
      b.onclick = () => {
        if (b.dataset.speed === 'pause') {
          b.classList.toggle('active');
          if (this.onSpeed) this.onSpeed('pause');
          return;
        }
        document.querySelectorAll('.speed-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        if (this.onSpeed) this.onSpeed(b.dataset.speed);
      };
    });
    $('#btnRestart').onclick = () => {
      if (confirm('Porzucić tę planetę i zacząć od nowa?')) location.reload();
    };
  }

  enterRunning() {
    this.running = true;
    document.body.classList.add('running');
    $('#btnStart').style.display = 'none';
    $('#paramPanel').querySelectorAll('input, select, button').forEach(el => el.disabled = true);
    document.querySelector('.tabbar-left button[data-tab="intervPanel"]').click();
    document.querySelector('.speed-btn[data-speed="1"]').classList.add('active');
  }

  // ── Aktualizacje w trakcie gry ──────────────────────────────────────────
  updateStats(sim) {
    const d = sim.derived;
    $('#stTime').textContent = sim.time >= 1000 ? (sim.time / 1000).toFixed(2) + ' mld lat' : sim.time.toFixed(0) + ' mln lat';
    $('#stTemp').textContent = d.temp.toFixed(0) + '°C';
    $('#stPoints').textContent = Math.floor(sim.points) + ' PG';
    const biomass = sim.totalBiomass();
    $('#stBio').textContent = biomass < 1 ? '—' : this.fmtBiomass(biomass);
    const dom = sim.dominant();
    if (dom) {
      const l = sim.life[dom];
      $('#stStage').textContent = `${STAGES[l.stage].icon} ${STAGES[l.stage].name}`;
    } else {
      $('#stStage').textContent = '☁️ Świat jałowy';
    }
  }

  fmtBiomass(b) {
    // biomasa umowna -> populacja "jednostek życia"
    const units = b * 1e12;
    if (units >= 1e15) return (units / 1e15).toFixed(1) + ' biliardów';
    if (units >= 1e12) return (units / 1e12).toFixed(1) + ' bilionów';
    return (units / 1e9).toFixed(1) + ' mld';
  }

  updateLog(sim) {
    if (!sim.logDirty) return;
    sim.logDirty = false;
    const host = $('#logPanel');
    const html = sim.log.slice().reverse().map(e =>
      `<div class="log-entry log-${e.type}">
        <span class="log-time">${e.time >= 1000 ? (e.time / 1000).toFixed(2) + ' mld' : e.time.toFixed(0) + ' mln'}</span>
        <span class="log-text">${e.text}</span>
      </div>`).join('');
    host.innerHTML = html;
  }

  updateLife(sim) {
    const host = $('#lifePanel');
    const rows = BIOCHEMISTRIES.map(b => {
      const l = sim.life[b.id];
      const s = l.score ?? b.score(sim);
      let status;
      if (l.alive) status = `<b style="color:${b.color}">${STAGES[l.stage].icon} ${STAGES[l.stage].name}</b><br>biomasa: ${this.fmtBiomass(l.biomass)}`;
      else if (l.everAlive) status = `<span class="dead">💀 wymarłe (×${l.extinctions})</span>`;
      else status = `<span class="dim">brak życia</span>`;
      return `<div class="life-card" style="border-left-color:${b.color}">
        <div class="life-head"><span>${b.name}</span><span class="hab-pct">${Math.round(s * 100)}%</span></div>
        <div class="life-status">${status}</div>
        <div class="hab-bar"><div style="width:${Math.round(s * 100)}%;background:${b.color}"></div></div>
      </div>`;
    }).join('');
    host.innerHTML = rows;
  }

  updateGallery(sim) {
    if (sim.species.length === this.galleryCount) {
      // tylko odśwież statusy wymarcia
      document.querySelectorAll('.sp-card').forEach(card => {
        const sp = sim.species.find(s => s.id === card.dataset.id);
        if (sp && sp.extinctAt && !card.classList.contains('extinct')) {
          card.classList.add('extinct');
          card.querySelector('.sp-status').textContent = '💀 wymarły';
        }
      });
      return;
    }
    this.galleryCount = sim.species.length;
    const host = $('#galleryPanel');
    host.innerHTML = sim.species.slice().reverse().map(sp => `
      <div class="sp-card ${sp.extinctAt ? 'extinct' : ''}" data-id="${sp.id}">
        <div class="sp-img">${sp.svg}</div>
        <div class="sp-info">
          <b>${sp.nick}</b>
          <i>${sp.latin}</i>
          <small>${sp.biochemName} · ${sp.stageName}</small>
          <small>Siedlisko: ${sp.habitatName} · rozmiar: ${sp.sizeCm < 0.1 ? (sp.sizeCm * 10000).toFixed(0) + ' µm' : sp.sizeCm + ' cm'}</small>
          <small class="sp-traits">${sp.traits.join(' • ')}</small>
          <small class="sp-status">${sp.extinctAt ? '💀 wymarły' : '✅ żyje'}</small>
        </div>
      </div>`).join('') || '<p class="hint">Jeszcze nic tu nie wyewoluowało…</p>';
  }

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }
}
