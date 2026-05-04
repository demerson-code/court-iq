/* =============================================================
   Court IQ — Volleyball Rotation Tool
   Single-file app logic: state, persistence, UI, algorithm
   ============================================================= */

/* ===== Constants ===== */
const SKILLS = ['setting', 'passing', 'serving', 'spiking', 'defense', 'attitude', 'communication'];
const SKILL_LABELS = {
  setting: 'Setting',
  passing: 'Passing',
  serving: 'Serving',
  spiking: 'Spiking',
  defense: 'Defense',
  attitude: 'Attitude',
  communication: 'Comm.'
};

// Position multipliers — how much each skill matters at each court position.
// Position 1 = right back (server), 2 = right front (sets), 3 = mid front,
// 4 = left front, 5 = left back, 6 = mid back.
const POS_MULT = {
  1: { setting: 0.5, passing: 1.3, serving: 1.6, spiking: 0.7, defense: 1.2, attitude: 1.0, communication: 1.0 },
  2: { setting: 1.8, passing: 0.7, serving: 1.0, spiking: 1.0, defense: 0.8, attitude: 1.0, communication: 1.3 },
  3: { setting: 0.5, passing: 0.7, serving: 1.0, spiking: 1.5, defense: 1.0, attitude: 1.0, communication: 1.1 },
  4: { setting: 0.5, passing: 0.7, serving: 1.0, spiking: 1.5, defense: 1.0, attitude: 1.0, communication: 1.0 },
  5: { setting: 0.5, passing: 1.3, serving: 1.0, spiking: 0.7, defense: 1.3, attitude: 1.0, communication: 1.0 },
  6: { setting: 0.5, passing: 1.3, serving: 1.0, spiking: 0.7, defense: 1.3, attitude: 1.0, communication: 1.1 }
};

const POSITION_NAMES = {
  1: 'Server',
  2: 'Setter',
  3: 'Mid Front',
  4: 'Outside',
  5: 'Left Back',
  6: 'Mid Back'
};

const SAVE_KEY = 'court_iq_v1';

/* ===== State ===== */
let S = {
  teamName: '',
  players: [],
  weights: { setting: 5, passing: 8, serving: 8, spiking: 6, defense: 7, attitude: 5, communication: 5 },
  mode: 'strict',
  result: null,
  currentRotation: 0
};

/* ===== Helpers ===== */
function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultSkills() {
  const o = {};
  SKILLS.forEach(s => o[s] = 5);
  return o;
}

function newPlayer(name = '') {
  return { id: genId(), name, skills: defaultSkills(), available: true };
}

function el(tag, opts = {}, children = []) {
  const e = document.createElement(tag);
  if (opts.cls) e.className = opts.cls;
  if (opts.text != null) e.textContent = opts.text;
  if (opts.attrs) {
    for (const k in opts.attrs) e.setAttribute(k, opts.attrs[k]);
  }
  if (opts.dataset) {
    for (const k in opts.dataset) e.dataset[k] = opts.dataset[k];
  }
  if (opts.on) {
    for (const k in opts.on) e.addEventListener(k, opts.on[k]);
  }
  if (opts.title) e.title = opts.title;
  children.forEach(c => {
    if (c == null) return;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

/* ===== Persistence ===== */
function save() {
  const payload = {
    teamName: S.teamName,
    players: S.players.map(p => ({
      id: p.id, name: p.name, skills: p.skills, available: p.available
    })),
    weights: S.weights,
    mode: S.mode
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (e) { /* quota / private mode */ }
}

function load() {
  const urlState = readStateFromUrl();
  if (urlState) {
    applyLoadedState(urlState);
    save();
    return;
  }
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) applyLoadedState(JSON.parse(raw));
  } catch (e) { /* ignore */ }
}

function applyLoadedState(data) {
  if (!data) return;
  S.teamName = data.teamName || '';
  if (Array.isArray(data.players)) {
    S.players = data.players.map(p => ({
      id: p.id || genId(),
      name: p.name || '',
      skills: { ...defaultSkills(), ...(p.skills || {}) },
      available: p.available !== false
    }));
  }
  if (data.weights) {
    S.weights = { ...S.weights, ...data.weights };
  }
  if (data.mode === 'loose' || data.mode === 'strict') {
    S.mode = data.mode;
  }
}

/* ===== URL encoding (compact base64url JSON) ===== */
function encodeStateForUrl() {
  const compact = {
    t: S.teamName || undefined,
    p: S.players.map(p => ({
      n: p.name || '',
      s: SKILLS.map(k => p.skills[k] | 0),
      a: p.available ? 1 : 0
    })),
    w: SKILLS.map(k => S.weights[k] | 0),
    m: S.mode === 'loose' ? 0 : 1
  };
  return b64urlEncode(JSON.stringify(compact));
}

function readStateFromUrl() {
  const m = window.location.hash.match(/^#d=(.+)$/);
  if (!m) return null;
  try {
    const c = JSON.parse(b64urlDecode(m[1]));
    return {
      teamName: c.t || '',
      players: (c.p || []).map(p => {
        const skills = {};
        SKILLS.forEach((k, i) => skills[k] = (p.s && p.s[i]) || 5);
        return {
          id: genId(),
          name: p.n || '',
          skills,
          available: p.a !== 0
        };
      }),
      weights: (() => {
        const w = {};
        SKILLS.forEach((k, i) => w[k] = (c.w && c.w[i]) || 5);
        return w;
      })(),
      mode: c.m === 0 ? 'loose' : 'strict'
    };
  } catch (e) { return null; }
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  url.hash = 'd=' + encodeStateForUrl();
  return url.toString();
}

/* ===== Algorithm ===== */
function playerScoreAtPosition(player, pos) {
  let score = 0;
  for (const s of SKILLS) {
    score += (player.skills[s] || 0) * (S.weights[s] || 0) * (POS_MULT[pos][s] || 1);
  }
  return score;
}

function playerAvgValue(player) {
  let sum = 0;
  for (let p = 1; p <= 6; p++) sum += playerScoreAtPosition(player, p);
  return sum / 6;
}

function playerSkillRaw(player) {
  let s = 0;
  for (const k of SKILLS) s += (player.skills[k] || 0);
  return s / SKILLS.length;
}

function pickBestSix(availablePlayers) {
  return [...availablePlayers]
    .map(p => ({ p, v: playerAvgValue(p) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 6)
    .map(x => x.p);
}

function permute(arr, cb) {
  // Heap's algorithm — generates all permutations of arr.
  const n = arr.length;
  const a = arr.slice();
  const c = new Array(n).fill(0);
  cb(a);
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const swap = i % 2 === 0 ? 0 : c[i];
      const tmp = a[swap]; a[swap] = a[i]; a[i] = tmp;
      cb(a);
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

/* Strict: 6 players cycle through 6 positions. Sum of rotation scores is
   a constant for any given 6 players (each player visits each position
   exactly once). We optimize for:
     1. max(min rotation score) — no weak rotations
     2. low variance — balanced rotations
     3. strong server in pos 1 at rotation 0 — tiebreaker
*/
function optimizeStrictArrangement(six) {
  let best = null;
  permute(six, perm => {
    const rotScores = [];
    for (let r = 0; r < 6; r++) {
      let total = 0;
      for (let startPos = 1; startPos <= 6; startPos++) {
        const player = perm[startPos - 1];
        const currentPos = ((startPos - 1 - r + 6) % 6) + 1;
        total += playerScoreAtPosition(player, currentPos);
      }
      rotScores.push(total);
    }
    const minRot = Math.min(...rotScores);
    const meanRot = rotScores.reduce((a, b) => a + b, 0) / 6;
    const variance = rotScores.reduce((a, b) => a + (b - meanRot) ** 2, 0) / 6;
    const serverSkill = perm[0].skills.serving || 0;
    const score = minRot * 1000 - variance * 0.5 + serverSkill * 0.1;
    if (!best || score > best.score) {
      best = { perm: perm.slice(), score, rotScores };
    }
  });
  return best;
}

/* Loose: pure 6-position assignment problem — best player in each spot. */
function optimizeLooseArrangement(six) {
  let best = null;
  permute(six, perm => {
    let total = 0;
    for (let pos = 1; pos <= 6; pos++) {
      total += playerScoreAtPosition(perm[pos - 1], pos);
    }
    if (!best || total > best.score) {
      best = { perm: perm.slice(), score: total };
    }
  });
  return best;
}

function generateLineup() {
  const available = S.players.filter(p => p.available && (p.name || '').trim());
  if (available.length < 6) {
    return { error: `Need at least 6 available players (you have ${available.length}).` };
  }
  const six = pickBestSix(available);

  let result;
  if (S.mode === 'loose') {
    const out = optimizeLooseArrangement(six);
    const rotation = {};
    for (let i = 0; i < 6; i++) rotation[i + 1] = out.perm[i];
    result = {
      mode: 'loose',
      starting6: out.perm,
      rotations: [rotation],
      rotationScores: [out.score]
    };
  } else {
    const out = optimizeStrictArrangement(six);
    const rotations = [];
    for (let r = 0; r < 6; r++) {
      const rot = {};
      for (let startPos = 1; startPos <= 6; startPos++) {
        const player = out.perm[startPos - 1];
        const currentPos = ((startPos - 1 - r + 6) % 6) + 1;
        rot[currentPos] = player;
      }
      rotations.push(rot);
    }
    result = {
      mode: 'strict',
      starting6: out.perm,
      rotations,
      rotationScores: out.rotScores
    };
  }

  const startingIds = new Set(result.starting6.map(p => p.id));
  result.bench = available
    .filter(p => !startingIds.has(p.id))
    .map(p => ({ player: p, value: playerAvgValue(p), skill: playerSkillRaw(p) }))
    .sort((a, b) => b.value - a.value);

  if (result.mode === 'strict') {
    const order = [];
    for (let r = 0; r < 6; r++) order.push(result.rotations[r][1]);
    result.servingOrder = order;
  } else {
    result.servingOrder = [...result.starting6].sort(
      (a, b) => (b.skills.serving || 0) - (a.skills.serving || 0)
    );
  }

  return result;
}

/* ===== Roster Render ===== */
function renderRoster() {
  const list = $('#playerList');
  list.replaceChildren();
  S.players.forEach(p => list.appendChild(buildPlayerCard(p)));
  $('#rosterEmpty').hidden = S.players.length > 0;
  updateCounts();
}

function buildPlayerCard(p) {
  const card = el('div', {
    cls: 'player-card' +
      (p.available ? '' : ' unavailable') +
      (p._expanded ? ' expanded' : ''),
    dataset: { id: p.id }
  });

  // Avail toggle
  const togInput = el('input', { attrs: { type: 'checkbox' } });
  togInput.checked = !!p.available;
  togInput.addEventListener('change', e => {
    e.stopPropagation();
    p.available = e.target.checked;
    card.classList.toggle('unavailable', !p.available);
    updateCounts();
    save();
  });
  const togSpan = el('span', { cls: 'avail-slider' });
  const tog = el('label', { cls: 'avail-toggle', title: 'Available for game' }, [togInput, togSpan]);
  tog.addEventListener('click', e => e.stopPropagation());

  // Name input
  const nameInput = el('input', {
    cls: 'player-name-input',
    attrs: { type: 'text', placeholder: 'Player name', maxlength: '20', autocomplete: 'off' }
  });
  nameInput.value = p.name || '';
  nameInput.addEventListener('input', e => {
    p.name = e.target.value;
    save();
  });
  nameInput.addEventListener('click', e => e.stopPropagation());

  // Overall AVG
  const overallNum = el('span', { cls: 'num', text: avgSkillDisplay(p) });
  const overallLbl = el('span', { cls: 'lbl', text: 'AVG' });
  const overall = el('div', { cls: 'player-overall' }, [overallNum, overallLbl]);

  const arrow = el('span', { cls: 'player-expand-arrow', text: '›' });

  const head = el('div', { cls: 'player-card-head' }, [tog, nameInput, overall, arrow]);
  head.addEventListener('click', () => {
    p._expanded = !p._expanded;
    card.classList.toggle('expanded', p._expanded);
  });

  // Skills section
  const skillBox = el('div', { cls: 'player-skills' });
  SKILLS.forEach(skill => {
    skillBox.appendChild(buildSkillRow(p.skills, skill, val => {
      overallNum.textContent = avgSkillDisplay(p);
      save();
    }));
  });
  const delBtn = el('button', {
    cls: 'btn-delete-player',
    text: '🗑 Delete player',
    on: { click: () => confirmDelete(p) }
  });
  skillBox.appendChild(el('div', { cls: 'player-actions' }, [delBtn]));

  card.appendChild(head);
  card.appendChild(skillBox);
  return card;
}

function avgSkillDisplay(p) {
  const sum = SKILLS.reduce((a, k) => a + (p.skills[k] || 0), 0);
  return (sum / SKILLS.length).toFixed(1);
}

function buildSkillRow(skillsObj, skill, onChange) {
  const label = el('label', { cls: 'skill-label', text: SKILL_LABELS[skill] });
  const slider = el('input', {
    cls: 'skill-slider',
    attrs: { type: 'range', min: '1', max: '10', step: '1' }
  });
  slider.value = String(skillsObj[skill] || 5);
  const val = el('span', { cls: 'skill-value', text: slider.value });
  slider.addEventListener('input', e => {
    skillsObj[skill] = +e.target.value;
    val.textContent = e.target.value;
    if (onChange) onChange(+e.target.value);
  });
  return el('div', { cls: 'skill-row' }, [label, slider, val]);
}

/* ===== Weights ===== */
function renderWeights() {
  const list = $('#weightList');
  list.replaceChildren();
  SKILLS.forEach(skill => {
    list.appendChild(buildSkillRow(S.weights, skill, () => save()));
  });
}

function updateCounts() {
  const total = S.players.length;
  const avail = S.players.filter(p => p.available && (p.name || '').trim()).length;
  $('#availCount').textContent = avail;
  $('#totalCount').textContent = total;

  const runBtn = $('#runBtn');
  if (runBtn) runBtn.disabled = avail < 6;
  const hint = $('#runHint');
  if (hint) {
    if (avail < 6) {
      hint.textContent = `Need ${6 - avail} more available player${6 - avail === 1 ? '' : 's'} (named, marked available).`;
    } else {
      hint.textContent = `${avail} players available — ready to generate.`;
    }
  }
}

/* ===== Lineup Render ===== */
function renderLineup() {
  const r = S.result;
  const wrap = $('#lineupResult');
  if (!r || r.error) {
    wrap.hidden = true;
    if (r && r.error) toast(r.error);
    return;
  }
  wrap.hidden = false;

  $('.rotation-controls').style.display = r.mode === 'strict' ? 'flex' : 'none';

  renderCourt();
  renderStrengthBars();
  renderServingOrder();
  renderBench();
}

function renderCourt() {
  const layer = $('#playerLayer');
  layer.replaceChildren();
  const r = S.result;
  if (!r) return;
  const rotIdx = r.mode === 'strict' ? S.currentRotation : 0;
  const rotation = r.rotations[rotIdx];
  $('#rotNum').textContent = String(rotIdx + 1);

  for (let pos = 1; pos <= 6; pos++) {
    const player = rotation[pos];
    if (!player) continue;
    const firstName = (player.name || '?').split(' ')[0];
    const pname = el('span', { cls: 'pname', text: firstName });
    const ppos = el('span', { cls: 'ppos', text: POSITION_NAMES[pos] });
    const cls = ['player-circle'];
    if (pos === 1) cls.push('is-server');
    if (pos === 2) cls.push('is-setter');
    const circle = el('div', {
      cls: cls.join(' '),
      dataset: { pos: String(pos) }
    }, [pname, ppos]);
    layer.appendChild(circle);
  }
}

function renderStrengthBars() {
  const r = S.result;
  const wrap = $('#strengthBars');
  wrap.replaceChildren();
  if (!r || r.mode !== 'strict') {
    $('.rotation-strength').style.display = 'none';
    return;
  }
  $('.rotation-strength').style.display = 'block';

  const max = Math.max(...r.rotationScores);
  const min = Math.min(...r.rotationScores);
  const range = Math.max(max - min, 1);
  const weakThreshold = min + range * 0.2;

  r.rotationScores.forEach((score, i) => {
    const cls = ['strength-bar'];
    if (i === S.currentRotation) cls.push('active');
    if (score <= weakThreshold && score < max) cls.push('weak');
    const heightPct = ((score - min) / range) * 70 + 30;
    const label = el('span', { cls: 'strength-bar-label', text: String(i + 1) });
    const bar = el('div', {
      cls: cls.join(' '),
      title: `Rotation ${i + 1}: strength ${score.toFixed(0)}`,
      on: {
        click: () => {
          S.currentRotation = i;
          renderCourt();
          renderStrengthBars();
        }
      }
    }, [label]);
    bar.style.height = heightPct + '%';
    wrap.appendChild(bar);
  });
  wrap.parentElement.classList.add('strength-bars-wrapper');
}

function renderServingOrder() {
  const r = S.result;
  const ol = $('#servingOrder');
  ol.replaceChildren();
  r.servingOrder.forEach(player => {
    const stars = '★'.repeat(Math.round((player.skills.serving || 0) / 2));
    const star = el('span', { cls: 'star', text: stars });
    const skill = el('span', { cls: 'serve-skill' }, [
      'Serving ', star, ' ' + (player.skills.serving || 0)
    ]);
    const name = el('span', { cls: 'serve-name', text: player.name || '?' });
    const li = el('li', {}, [name, skill]);
    ol.appendChild(li);
  });
}

function renderBench() {
  const ul = $('#benchList');
  ul.replaceChildren();
  const r = S.result;
  if (!r.bench.length) {
    ul.appendChild(el('li', { cls: 'bench-empty', text: 'No bench — all available players are starting.' }));
    return;
  }
  r.bench.forEach(({ player, skill }) => {
    const name = el('span', { cls: 'bench-name', text: player.name || '?' });
    const pill = el('span', { cls: 'bench-stat-pill', text: skill.toFixed(1) });
    const stats = el('span', { cls: 'bench-stats' }, [pill]);
    ul.appendChild(el('li', {}, [name, stats]));
  });
}

/* ===== Tabs / Toast / Modal ===== */
function setTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === name + 'Tab'));
}

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.hidden = true, ms);
}

function confirmDialog(title, msg) {
  return new Promise(resolve => {
    const m = $('#confirmModal');
    $('#confirmTitle').textContent = title;
    $('#confirmMsg').textContent = msg;
    m.hidden = false;
    const ok = $('#confirmOk');
    const cancel = $('#confirmCancel');
    function cleanup(v) {
      m.hidden = true;
      ok.removeEventListener('click', okH);
      cancel.removeEventListener('click', cancelH);
      resolve(v);
    }
    function okH() { cleanup(true); }
    function cancelH() { cleanup(false); }
    ok.addEventListener('click', okH);
    cancel.addEventListener('click', cancelH);
  });
}

async function confirmDelete(player) {
  const ok = await confirmDialog(
    'Delete player?',
    `Remove ${player.name || 'this player'} from the roster? This can't be undone.`
  );
  if (!ok) return;
  S.players = S.players.filter(p => p.id !== player.id);
  save();
  renderRoster();
}

/* ===== Init / wiring ===== */
function init() {
  load();

  $('#teamName').value = S.teamName;
  $('#teamName').addEventListener('input', e => {
    S.teamName = e.target.value;
    save();
  });

  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => setTab(tab.dataset.tab));
  });

  $('#addPlayerBtn').addEventListener('click', () => {
    const np = newPlayer('');
    np._expanded = true;
    S.players.push(np);
    save();
    renderRoster();
    setTimeout(() => {
      const card = document.querySelector(`.player-card[data-id="${np.id}"]`);
      if (card) {
        const input = card.querySelector('.player-name-input');
        if (input) input.focus();
      }
    }, 50);
  });

  $$('input[name="mode"]').forEach(r => {
    r.checked = (r.value === S.mode);
    r.addEventListener('change', e => {
      if (e.target.checked) {
        S.mode = e.target.value;
        save();
      }
    });
  });

  $('#resetWeightsBtn').addEventListener('click', async () => {
    const ok = await confirmDialog('Reset weights?', 'Restore all skill weights to defaults?');
    if (!ok) return;
    S.weights = { setting: 5, passing: 8, serving: 8, spiking: 6, defense: 7, attitude: 5, communication: 5 };
    save();
    renderWeights();
    toast('Weights reset.');
  });

  $('#runBtn').addEventListener('click', () => {
    const result = generateLineup();
    if (result.error) {
      toast(result.error);
      return;
    }
    S.result = result;
    S.currentRotation = 0;
    renderLineup();
    setTab('lineup');
    toast(result.mode === 'strict' ? 'Lineup ready — 6 rotations generated.' : 'Lineup ready.');
  });

  $('#nextRotBtn').addEventListener('click', () => {
    if (!S.result || S.result.mode !== 'strict') return;
    S.currentRotation = (S.currentRotation + 1) % 6;
    renderCourt();
    renderStrengthBars();
  });
  $('#prevRotBtn').addEventListener('click', () => {
    if (!S.result || S.result.mode !== 'strict') return;
    S.currentRotation = (S.currentRotation - 1 + 6) % 6;
    renderCourt();
    renderStrengthBars();
  });

  $('#shareBtn').addEventListener('click', async () => {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast('Share link copied to clipboard!');
    } catch (e) {
      window.prompt('Copy this link:', url);
    }
    history.replaceState(null, '', '#d=' + encodeStateForUrl());
  });

  renderRoster();
  renderWeights();
  updateCounts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
