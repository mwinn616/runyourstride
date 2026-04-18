// ── Constants ──────────────────────────────────────────────────────────────────

const KM_PER_MI = 1.60934;

const ZONE_MULTIPLIERS = {
  '5k':  [[1.38,1.50],[1.20,1.35],[1.05,1.10],[0.95,1.00],[0.88,0.94]],
  '10k': [[1.32,1.44],[1.16,1.28],[1.02,1.07],[0.93,0.98],[0.86,0.92]],
  'half':[[1.27,1.38],[1.13,1.24],[0.99,1.04],[0.90,0.95],[0.84,0.89]],
  'full':[[1.22,1.32],[1.10,1.20],[0.96,1.01],[0.88,0.93],[0.82,0.87]],
};

const ZONES = [
  { name: 'Recovery',    desc: 'Very easy. Full recovery runs.',              color: '#4CAF50' },
  { name: 'Easy',        desc: 'Comfortable. Build aerobic base.',            color: '#8BC34A' },
  { name: 'Tempo',       desc: 'Comfortably hard. Lactate threshold.',        color: '#FFC107' },
  { name: 'Interval',    desc: 'Hard effort. VO2 max training.',              color: '#FF9800' },
  { name: 'Rep / Speed', desc: 'Very hard. Pure speed and power work.',       color: '#F44336' },
];

const PREDICTOR_DISTANCES = [
  { label: '5K',            km: 5       },
  { label: '10K',           km: 10      },
  { label: 'Half-Marathon', km: 21.0975 },
  { label: 'Marathon',      km: 42.195  },
];

const TRAINING_DIST_MI = { '5k': 3.10686, '10k': 6.21371, 'half': 13.1094, 'full': 26.2188 };

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function fmtPace(secPerMi, unit) {
  const sec = unit === 'km' ? secPerMi / KM_PER_MI : secPerMi;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,'0')} /${unit}`;
}

function getTimeInputs(hId, mId, sId) {
  const h = parseInt(document.getElementById(hId).value) || 0;
  const m = parseInt(document.getElementById(mId).value) || 0;
  const s = parseInt(document.getElementById(sId).value) || 0;
  return h * 3600 + m * 60 + s;
}

// ── App Banner ─────────────────────────────────────────────────────────────────

const appBanner = {
  init() {
    if (localStorage.getItem('stride_banner_dismissed')) return;
    const el = document.getElementById('app-banner');
    el.style.display = 'block';
    document.documentElement.style.setProperty('--banner-h', el.offsetHeight + 'px');
  },

  dismiss() {
    localStorage.setItem('stride_banner_dismissed', '1');
    document.getElementById('app-banner').style.display = 'none';
    document.documentElement.style.setProperty('--banner-h', '0px');
  }
};

// ── App controller ─────────────────────────────────────────────────────────────

const app = {
  theme: localStorage.getItem('stride_theme') || 'light',

  init() {
    document.documentElement.setAttribute('data-theme', this.theme);
    this._updateThemeBtn();
    appBanner.init();
    paceChart.render();
    historyTab.render();
  },

  switchTab(name) {
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.querySelector(`[data-tab="${name}"]`).classList.add('active');
    if (name === 'history') historyTab.render();
  },

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('stride_theme', this.theme);
    this._updateThemeBtn();
  },

  _updateThemeBtn() {
    document.getElementById('themeBtn').textContent = this.theme === 'dark' ? '☀️' : '🌙';
  },

  showError(msg) {
    document.getElementById('error-message').textContent = msg;
    document.getElementById('error-modal').style.display = 'flex';
  },

  closeError() {
    document.getElementById('error-modal').style.display = 'none';
  }
};

// ── Calculator ─────────────────────────────────────────────────────────────────

const calculator = {
  paceUnit: 'mi',
  lastCalculated: null,
  lastResult: null,

  onInput() {
    document.getElementById('resetBtn').style.display = 'block';
  },

  setPaceUnit(unit) {
    this.paceUnit = unit;
    document.getElementById('calcUnitMi').classList.toggle('active', unit === 'mi');
    document.getElementById('calcUnitKm').classList.toggle('active', unit === 'km');
  },

  setDistance() {
    const sel = document.getElementById('race-distance');
    const inp = document.getElementById('distance-amount');
    if (sel.value === 'other') {
      inp.style.display = 'block';
      inp.value = '';
      inp.focus();
    } else {
      inp.style.display = 'none';
    }
    this.onInput();
  },

  _getDistance() {
    const sel = document.getElementById('race-distance');
    if (sel.value === 'other') return parseFloat(document.getElementById('distance-amount').value) || 0;
    return parseFloat(sel.value) || 0;
  },

  _getTime() {
    return getTimeInputs('time-hours', 'time-minutes', 'time-seconds');
  },

  _getPaceSec() {
    const m = parseInt(document.getElementById('pace-minutes').value) || 0;
    const s = parseInt(document.getElementById('pace-seconds').value) || 0;
    const sec = m * 60 + s;
    return this.paceUnit === 'km' ? sec * KM_PER_MI : sec;
  },

  calculate() {
    const time     = this._getTime();
    const distance = this._getDistance();
    const pace     = this._getPaceSec();

    const missing = [];
    if (!time)     missing.push('time');
    if (!distance) missing.push('distance');
    if (!pace)     missing.push('pace');

    if (missing.length === 0 && this.lastCalculated) missing.push(this.lastCalculated);

    if (missing.length > 1) {
      app.showError('Please enter values for at least two fields.');
      return;
    }

    if (missing[0] === 'time') {
      const totalSec = distance * pace;
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = Math.floor(totalSec % 60);
      document.getElementById('time-hours').value   = h || '';
      document.getElementById('time-minutes').value = String(m).padStart(2,'0');
      document.getElementById('time-seconds').value = String(s).padStart(2,'0');
      this.lastCalculated = 'time';
      this.lastResult = { distance, time: totalSec, paceSec: pace };

    } else if (missing[0] === 'distance') {
      const dist = time / pace;
      document.getElementById('distance-amount').value   = dist.toFixed(2);
      document.getElementById('race-distance').value     = 'other';
      document.getElementById('distance-amount').style.display = 'block';
      this.lastCalculated = 'distance';
      this.lastResult = { distance: dist, time, paceSec: pace };

    } else {
      const paceSec = time / distance;
      const display = this.paceUnit === 'km' ? paceSec / KM_PER_MI : paceSec;
      document.getElementById('pace-minutes').value = Math.floor(display / 60);
      document.getElementById('pace-seconds').value = String(Math.floor(display % 60)).padStart(2,'0');
      this.lastCalculated = 'pace';
      this.lastResult = { distance, time, paceSec };
    }

    document.getElementById('splitsBtn').style.display = 'block';
    document.getElementById('resetBtn').style.display  = 'block';
    this._saveToHistory();
  },

  showSplits() {
    if (!this.lastResult) return;
    const { distance, time, paceSec } = this.lastResult;
    let html = `<div class="splits-summary">
      <span class="splits-total">${fmtTime(time)}</span>
      <span class="splits-pace">${fmtPace(paceSec, this.paceUnit)}</span>
    </div>
    <div class="splits-table">
      <div class="splits-row header">
        <span>Mile</span><span>Split</span><span>Cumulative</span>
      </div>`;
    const totalMiles = distance;
    for (let i = 1; i <= Math.ceil(totalMiles); i++) {
      const frac     = Math.min(i, totalMiles) - (i - 1);
      const splitSec = frac * paceSec;
      const cumSec   = Math.min(i, totalMiles) * paceSec;
      const label    = frac < 0.99 ? `Mile ${i} (${(frac).toFixed(2)}mi)` : `Mile ${i}`;
      html += `<div class="splits-row">
        <span>${label}</span>
        <span>${fmtTime(splitSec)}</span>
        <span>${fmtTime(cumSec)}</span>
      </div>`;
    }
    html += '</div>';
    document.getElementById('splits-content').innerHTML = html;
    document.getElementById('splits-modal').style.display = 'flex';
  },

  hideSplits() {
    document.getElementById('splits-modal').style.display = 'none';
  },

  reset() {
    ['time-hours','time-minutes','time-seconds','pace-minutes','pace-seconds']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('race-distance').value = '';
    document.getElementById('distance-amount').value = '';
    document.getElementById('distance-amount').style.display = 'none';
    document.getElementById('splitsBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display  = 'none';
    this.lastCalculated = null;
    this.lastResult = null;
  },

  _saveToHistory() {
    if (!this.lastResult) return;
    const { distance, time, paceSec } = this.lastResult;
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
      distance: distance.toFixed(5),
      timeSec: time,
      time: fmtTime(time),
      pace: fmtPace(paceSec, 'mi'),
      paceSec,
    };
    const history = JSON.parse(localStorage.getItem('stride_history') || '[]');
    history.unshift(entry);
    if (history.length > 50) history.pop();
    localStorage.setItem('stride_history', JSON.stringify(history));
  }
};

// ── Pace Chart ─────────────────────────────────────────────────────────────────

const paceChart = {
  unit: 'mi',
  DIST_KM: [5, 10, 21.0975, 42.195],

  setUnit(unit) {
    this.unit = unit;
    document.getElementById('chartUnitMi').classList.toggle('active', unit === 'mi');
    document.getElementById('chartUnitKm').classList.toggle('active', unit === 'km');
    this.render();
  },

  render() {
    const rows = [];
    for (let paceSecMi = 5 * 60; paceSecMi <= 15 * 60; paceSecMi += 15) {
      const display = this.unit === 'km' ? paceSecMi / KM_PER_MI : paceSecMi;
      const pm = Math.floor(display / 60);
      const ps = String(Math.floor(display % 60)).padStart(2, '0');
      const cells = this.DIST_KM.map(km => fmtTime((km / KM_PER_MI) * paceSecMi));
      rows.push(`<tr><td class="pace-cell">${pm}:${ps}</td>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`);
    }
    document.getElementById('paceTableBody').innerHTML = rows.join('');
  }
};

// ── Race Predictor ─────────────────────────────────────────────────────────────

const predictor = {
  unit: 'mi',

  setUnit(unit) {
    this.unit = unit;
    document.getElementById('predUnitMi').classList.toggle('active', unit === 'mi');
    document.getElementById('predUnitKm').classList.toggle('active', unit === 'km');
    this.calculate();
  },

  calculate() {
    const knownKm = parseFloat(document.getElementById('predictor-distance').value);
    const timeSec = getTimeInputs('pred-hours', 'pred-minutes', 'pred-seconds');
    if (!knownKm || !timeSec) {
      document.getElementById('predictor-results').style.display = 'none';
      return;
    }

    const html = PREDICTOR_DISTANCES.map(d => {
      const predicted = timeSec * Math.pow(d.km / knownKm, 1.06);
      const distMi    = d.km / KM_PER_MI;
      const paceSec   = predicted / distMi;
      const isKnown   = d.km === knownKm;
      return `<div class="result-card${isKnown ? ' highlight' : ''}">
        <div class="result-left">
          <div class="result-dist">${d.label}</div>
          ${isKnown ? '<div class="result-badge">YOUR RACE</div>' : ''}
        </div>
        <div class="result-right">
          <div class="result-time">${fmtTime(predicted)}</div>
          <div class="result-pace-text">${fmtPace(paceSec, this.unit)}</div>
        </div>
      </div>`;
    }).join('');

    document.getElementById('predictor-cards').innerHTML = html;
    document.getElementById('predictor-results').style.display = 'block';
  }
};

// ── Training Zones ─────────────────────────────────────────────────────────────

const training = {
  unit: 'mi',

  setUnit(unit) {
    this.unit = unit;
    document.getElementById('trainUnitMi').classList.toggle('active', unit === 'mi');
    document.getElementById('trainUnitKm').classList.toggle('active', unit === 'km');
    this.calculate();
  },

  calculate() {
    const race    = document.getElementById('training-race').value;
    const timeSec = getTimeInputs('train-hours', 'train-minutes', 'train-seconds');
    if (!race || !timeSec) {
      document.getElementById('training-results').style.display = 'none';
      return;
    }

    const goalPaceMi = timeSec / TRAINING_DIST_MI[race];
    const mults      = ZONE_MULTIPLIERS[race];

    const html = ZONES.map((zone, i) => {
      const lo = fmtPace(goalPaceMi * mults[i][0], this.unit);
      const hi = fmtPace(goalPaceMi * mults[i][1], this.unit);
      return `<div class="zone-card">
        <div class="zone-bar" style="background:${zone.color};"></div>
        <div class="zone-body">
          <div class="zone-name">${zone.name}</div>
          <div class="zone-range" style="color:${zone.color};">${lo} — ${hi}</div>
          <div class="zone-desc">${zone.desc}</div>
        </div>
      </div>`;
    }).join('');

    document.getElementById('training-zone-cards').innerHTML = html;
    document.getElementById('training-results').style.display = 'block';
  }
};

// ── History ────────────────────────────────────────────────────────────────────

const historyTab = {
  _cache: [],

  _distLabel(dist) {
    const d = parseFloat(dist);
    if (Math.abs(d - 3.10686) < 0.01)  return '5K';
    if (Math.abs(d - 6.21371) < 0.01)  return '10K';
    if (Math.abs(d - 13.1094) < 0.01)  return 'Half-Marathon';
    if (Math.abs(d - 26.2188) < 0.01)  return 'Marathon';
    return `${parseFloat(d).toFixed(2)} mi`;
  },

  _parseTimeSec(str) {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0] * 60 + parts[1];
  },

  showSplits(idx) {
    const e       = this._cache[idx];
    const dist    = parseFloat(e.distance);
    const timeSec = e.timeSec != null ? e.timeSec : this._parseTimeSec(e.time);
    const paceSec = e.paceSec != null ? e.paceSec : timeSec / dist;
    calculator.lastResult = { distance: dist, time: timeSec, paceSec };
    calculator.showSplits();
  },

  render() {
    const history = JSON.parse(localStorage.getItem('stride_history') || '[]');
    this._cache   = history;
    const list    = document.getElementById('history-list');
    const empty   = document.getElementById('history-empty');
    if (!history.length) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = history.map((e, i) => `
      <div class="history-card" onclick="historyTab.showSplits(${i})">
        <div class="history-left">
          <div class="history-dist">${this._distLabel(e.distance)}</div>
          <div class="history-date">${e.date}</div>
        </div>
        <div class="history-right">
          <div class="history-time">${e.time}</div>
          <div class="history-pace">${e.pace}</div>
        </div>
      </div>
    `).join('');
  },

  clearAll() {
    if (!confirm('Clear all history?')) return;
    localStorage.removeItem('stride_history');
    this.render();
  }
};

// ── Boot ───────────────────────────────────────────────────────────────────────
app.init();
