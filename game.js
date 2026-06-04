'use strict';

/* =========================================================
   Arnes Mathe-Abenteuer
   Rechenspiel für die 1. Klasse: + und − mit kleinen Zahlen,
   immer schwerer werdend, mit Würfel-Anschauung, Leben,
   drei Spielmodi und einem "Hilf mir"-Knopf.
   ========================================================= */

/* ---- Einstellungen (zum Anpassen) ---- */
const CORRECT_PER_LEVEL = 3;   // Richtige Aufgaben pro Stufe
const BOND_TO_TEN_LEVEL = 3;   // Verliebte Zahlen: 7 + ? = 10
const SUB_FROM_LEVEL    = 4;   // Ab hier Minus
const SEQ_FROM_LEVEL    = 12;  // Ab hier Zahlenreihen
const TRIPLE_FROM_LEVEL = 17;  // Ab hier drei Zahlen
const MAX_BY_LEVEL = [5, 10, 10, 10, 10, 20, 20, 20, 20, 30, 40, 50, 50, 60, 70, 80, 90, 100, 100, 100];
const MAX_LIVES   = 3;         // So viele Leben gibt es höchstens
const LIFE_EVERY  = 3;         // Alle X Stufen ein Leben dazu
const TIME_SECONDS = 120;      // Zeitmodus: 2 Minuten

/* ---- Spielzustand ---- */
const state = {
  mode: null,           // 'practice' | 'time' | 'count'
  score: 0, level: 1, correctInLevel: 0,
  streak: 0, best: 0, lives: MAX_LIVES,
  input: '', current: null, lastPrefix: '',
  vizRun: 0, busy: false,
  target: 10, timeLeft: TIME_SECONDS, timerId: null, timerPaused: false, runStart: 0,
};
let muted = false;
let currentAdvance = null;     // Funktion, die den nächsten Erklär-Schritt zeigt
let helpAdvance = null;        // Funktion, die den nächsten Hilfe-Schritt zeigt

/* ---- Helfer ---- */
const $ = id => document.getElementById(id);
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtTime = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

/* ---- DOM ---- */
const startScreen = $('startScreen'), endScreen = $('endScreen'), gameWrap = $('game');
const scoreEl = $('score'), livesEl = $('lives'), modeChip = $('modeChip'), streakEl = $('streak');
const muteBtn = $('muteBtn'), homeBtn = $('homeBtn');
const levelFill = $('levelFill'), levelInfo = $('levelInfo');
const quizCard = $('quizCard'), questionMath = $('questionMath'), answerBox = $('answerBox'), questionSuffix = $('questionSuffix');
const keypad = $('keypad');
const helpArea = $('helpArea'), helpQuestion = $('helpQuestion'), helpCaption = $('helpCaption'), helpCubes = $('helpCubes'), helpBtn = $('helpBtn'), helpPhaseBtn = $('helpPhaseBtn');
const feedbackCard = $('feedbackCard'), mascot = $('mascot'), feedbackMsg = $('feedbackMsg');
const explainQuestion = $('explainQuestion'), vizCaption = $('vizCaption'), cubesEl = $('cubes'), vizResult = $('vizResult');
const phaseInfo = $('phaseInfo'), phaseBtn = $('phaseBtn');
const banner = $('banner');
const countLabel = $('countLabel'), startBest = $('startBest'), endTitle = $('endTitle'), endStats = $('endStats');
const mapDifficulty = $('mapDifficulty'), mapSummary = $('mapSummary'), mapPath = $('mapPath');

/* ---- Speichern / Laden ---- */
const SAVE_KEY = 'arne-mathe-v2';
const persist = {
  practice: { score: 0, level: 1, correctInLevel: 0, lives: MAX_LIVES },
  best: 0, muted: false, bestTime: 0, bestCount: {}
};
function load(){
  try{
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (d.practice) Object.assign(persist.practice, d.practice);
    if (typeof d.best === 'number') persist.best = d.best;
    if (typeof d.muted === 'boolean') persist.muted = d.muted;
    if (typeof d.bestTime === 'number') persist.bestTime = d.bestTime;
    if (d.bestCount && typeof d.bestCount === 'object') persist.bestCount = d.bestCount;
  }catch(e){}
  muted = persist.muted; state.best = persist.best;
}
function save(){
  try{ persist.muted = muted; persist.best = state.best;
    localStorage.setItem(SAVE_KEY, JSON.stringify(persist)); }catch(e){}
}
function syncPractice(){
  persist.practice = { score: state.score, level: state.level, correctInLevel: state.correctInLevel, lives: state.lives };
}

/* ---- Töne ---- */
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){ try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ audioCtx = null; } }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function tone(freq, dur, type, when, gain){
  if (muted) return;
  ensureAudio(); if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  o.connect(g); g.connect(audioCtx.destination);
  const t = audioCtx.currentTime + (when || 0);
  const vol = gain == null ? 0.18 : gain;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}
const playClick   = () => tone(440, 0.04, 'square', 0, 0.06);
const playCorrect = () => { tone(660, 0.12, 'sine', 0); tone(880, 0.18, 'sine', 0.1); };
const playWrong   = () => { tone(300, 0.18, 'sine', 0, 0.16); tone(200, 0.28, 'sine', 0.12, 0.16); };
const playLevelUp = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.12));

/* ---- Konfetti ---- */
function confetti(){
  const colors = ['#ff6b6b','#fcc419','#37b24d','#4dabf7','#f783ac','#9775fa','#ffa94d'];
  for (let i = 0; i < 26; i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.25) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }
}

/* =========================================================
   Aufgaben erzeugen – werden mit der Stufe wirklich schwerer
   ========================================================= */
function maxForLevel(l){ return l <= MAX_BY_LEVEL.length ? MAX_BY_LEVEL[l - 1] : 100; }

// Mindestgrößen, damit späte Aufgaben nicht trivial werden (kein 27-0, kein 3+2 bei Stufe 6 ...)
function bandFor(level){
  const M = maxForLevel(level);
  if (M <= 10) return { M, bMin: level === 1 ? 0 : 1, aMin: 1 };
  if (M <= 20) return { M, bMin: 1, aMin: 1 };
  const bMin = Math.min(level - 1, Math.floor(M * 0.35)); // zweite Zahl
  let aMin = Math.min(Math.floor(M * 0.3), M - Math.max(1, bMin) - 1);      // erste Zahl
  return { M, bMin, aMin: Math.max(0, aMin) };
}

function genAdd(level){
  const { M, bMin, aMin } = bandFor(level);
  const bLo = level === 1 ? 0 : Math.max(1, bMin);   // "+0" nur ganz am Anfang
  const aHi = M - bLo;
  const a = randInt(Math.min(aMin, aHi), aHi);
  const b = randInt(bLo, M - a);
  return { type: 'add', prefix: `${a} + ${b} =`, answer: a + b,
    viz: { start: a, steps: [{ op: '+', n: b }], total: a + b, meta: { a, b } } };
}
function genSub(level){
  const { M, bMin, aMin } = bandFor(level);
  const bLo = Math.max(1, bMin);                     // niemals "−0"
  const a = randInt(Math.max(aMin, bLo), M);
  const b = randInt(bLo, a);
  return { type: 'sub', prefix: `${a} − ${b} =`, answer: a - b,
    viz: { start: a, steps: [{ op: '-', n: b }], total: a - b, meta: { a, b } } };
}
function genBondToTen(){
  const known = randInt(1, 9);
  const partner = 10 - known;
  return { type: 'add', subtype: 'bond10', prefix: `${known} +`, suffix: '= 10', answer: partner,
    viz: { start: known, steps: [{ op: '+', n: partner }], total: 10, meta: { a: known, b: partner } } };
}
function genTriple(level){
  const M = maxForLevel(level);
  const nMin = Math.min(3 + Math.floor((level - TRIPLE_FROM_LEVEL) / 3), 8);
  const startMin = Math.min(8 + (level - TRIPLE_FROM_LEVEL), 30);
  let total = randInt(Math.min(startMin, M), M);
  const start = total, steps = [];
  for (let k = 0; k < 2; k++){
    const canAdd = (M - total) >= 1, canSub = total >= 1;
    const op = (canAdd && canSub) ? pick(['+', '-']) : (canAdd ? '+' : '-');
    const maxAvail = op === '+' ? (M - total) : total;
    const lo = Math.min(Math.max(1, nMin), maxAvail);
    const n = randInt(lo, maxAvail);
    steps.push({ op, n });
    total += op === '+' ? n : -n;
  }
  let expr = `${start}`;
  for (const s of steps) expr += ` ${s.op === '+' ? '+' : '−'} ${s.n}`;
  return { type: 'triple', prefix: `${expr} =`, answer: total,
    viz: { start, steps, total, meta: { expr } } };
}
function genSeq(){
  const step = randInt(2, 10);                       // 2er- bis 10er-Reihe (1er ist zu leicht)
  const maxIdx = Math.floor(100 / step);
  const answerIdx = randInt(4, Math.min(maxIdx, 8));
  const shown = answerIdx - 1;
  const terms = [];
  for (let i = 1; i <= shown; i++) terms.push(step * i);
  const lastTerm = step * shown, answer = step * answerIdx;
  return { type: 'seq', prefix: terms.join(', ') + ', ', answer,
    viz: { start: lastTerm, steps: [{ op: '+', n: step }], total: answer, meta: { step, lastTerm } } };
}
function weightedPick(items, weights){
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++){ r -= weights[i]; if (r < 0) return items[i]; }
  return items[items.length - 1];
}
function generateProblem(level){
  let types = ['add'], weights = [3];
  if (level === BOND_TO_TEN_LEVEL){
    types = ['bond']; weights = [5];
  } else if (level === SUB_FROM_LEVEL){
    types = ['sub']; weights = [4];
  } else if (level === 5){
    types = ['add', 'sub']; weights = [3, 3];
  } else if (level === 6){
    types = ['add']; weights = [4];
  } else if (level === 7){
    types = ['sub']; weights = [4];
  } else if (level >= 8){
    types = ['add', 'sub']; weights = [3, 3];
  }
  if (level === 9){ types.push('bond'); weights.push(3); }
  if (level >= SEQ_FROM_LEVEL)    { types.push('seq');    weights.push(2); }
  if (level >= TRIPLE_FROM_LEVEL) { types.push('triple'); weights.push(3); }
  let p;
  for (let tries = 0; tries < 12; tries++){
    const t = weightedPick(types, weights);
    p = t === 'add' ? genAdd(level) : t === 'sub' ? genSub(level) : t === 'bond' ? genBondToTen()
      : t === 'seq' ? genSeq() : genTriple(level);
    if (p.prefix !== state.lastPrefix) break;
  }
  state.lastPrefix = p.prefix;
  return p;
}

/* =========================================================
   Aufgabe anzeigen & Eingabe
   ========================================================= */
function renderQuestion(){
  questionMath.textContent = state.current.prefix;
  questionSuffix.textContent = state.current.suffix || '';
  const prompt = problemPrompt(state.current);
  helpQuestion.textContent = prompt;
  explainQuestion.textContent = prompt;
  state.input = '';
  renderAnswerBox();
}
function problemPrompt(p){
  if (!p) return '';
  if (p.suffix) return p.prefix.replace(/\s+$/, '') + ' ? ' + p.suffix.trim();
  return p.prefix.replace(/\s+$/, '') + ' ?';
}
function renderAnswerBox(){
  answerBox.textContent = state.input === '' ? '?' : state.input;
  answerBox.classList.toggle('empty', state.input === '');
}
function inputDigit(d){
  if (state.busy || !state.current) return;
  if (state.input.length >= 3) return;
  if (state.input === '0') state.input = '';
  state.input += d;
  renderAnswerBox(); playClick();
}
function inputBack(){
  if (state.busy) return;
  state.input = state.input.slice(0, -1);
  renderAnswerBox();
}

/* =========================================================
   Antwort prüfen
   ========================================================= */
function check(){
  if (state.busy || !state.current) return;
  if (state.input === ''){ shake(quizCard); return; }
  const val = parseInt(state.input, 10);
  if (val === state.current.answer) onCorrect();
  else onWrong();
}

async function onCorrect(){
  state.busy = true;
  const helped = state.current.helped;
  playCorrect(); confetti();
  if (!helped){
    state.score++; state.streak++;
    if (state.streak > state.best) state.best = state.streak;
    state.correctInLevel++;
    if (state.correctInLevel >= CORRECT_PER_LEVEL) levelUp();
  }
  if (state.mode === 'practice') syncPractice();
  save(); updateStats();
  flashCorrect(helped);

  if (state.mode === 'count' && state.score >= state.target){ await sleep(950); endRun(); return; }
  await sleep(850);
  if (state.busy) nextProblem();
}

async function onWrong(){
  state.busy = true;
  state.streak = 0;
  loseLife();
  if (state.mode === 'practice') syncPractice();
  save(); updateStats();
  playWrong(); shake(quizCard);
  if (state.mode === 'time') state.timerPaused = true;   // Uhr hält während der Erklärung an
  await sleep(350);
  startExplanation(state.current);
}

function loseLife(){
  state.lives = Math.max(0, state.lives - 1);
  livesEl.classList.remove('lose'); void livesEl.offsetWidth; livesEl.classList.add('lose');
  if (state.lives <= 0){
    // Alle Leben weg -> zurück auf Stufe 1, Leben wieder voll (Punkte bleiben)
    state.level = 1; state.correctInLevel = 0; state.lives = MAX_LIVES;
    showBanner('💔 Alle Leben weg! Zurück zu Stufe 1.');
  }
}

/* =========================================================
   "Hilf mir": Würfel zum Selber-Zählen – OHNE Zahlen, OHNE Ergebnis
   ========================================================= */
function showHelp(){
  const p = state.current;
  if (state.busy || !p || p.helped) return;
  ensureAudio();
  p.helped = true;
  helpBtn.classList.add('hidden');
  helpArea.classList.remove('hidden');
  helpCaption.textContent = 'Drück Los und geh Schritt für Schritt weiter. 🧮';
  const ctx = vizContext(helpCubes, false);            // false = keine Zahlen in den Würfeln
  setCols(ctx, peakOf(p.viz));
  startHelpPhases(buildHelpPhases(p, ctx), ctx);
}
function startHelpPhases(phases, ctx){
  let i = 0;
  helpPhaseBtn.textContent = 'Los →';
  helpPhaseBtn.classList.remove('hidden');
  lockHelp(false);
  helpAdvance = async () => {
    if (helpPhaseBtn.disabled || ctx.token !== state.vizRun) return;
    if (i >= phases.length){ finishHelp(); return; }
    const ph = phases[i];
    helpCaption.textContent = ph.caption;
    helpPhaseBtn.textContent = 'Warte ...';
    lockHelp(true);
    await ph.run();
    if (ctx.token !== state.vizRun) return;
    i++;
    if (i >= phases.length) finishHelp();
    else {
      helpPhaseBtn.textContent = 'Weiter →';
      lockHelp(false);
    }
  };
}
function finishHelp(){
  helpPhaseBtn.classList.add('hidden');
  lockHelp(false);
  helpAdvance = null;
}
function lockHelp(locked){
  helpPhaseBtn.disabled = locked;
  helpPhaseBtn.classList.toggle('locked', locked);
}
function buildHelpPhases(p, ctx){
  const phases = [];
  if (p.type === 'add' || p.type === 'seq'){
    const a = p.viz.start, b = p.viz.steps[0].n;
    phases.push({ caption: p.type === 'add' ? 'Zähl zuerst die grünen Würfel.' : 'Zähl bis zur letzten Zahl der Reihe.',
      run: () => a > 0 ? vizPopGreen(ctx, a) : Promise.resolve() });
    if (b > 0){
      phases.push({ caption: p.type === 'add' ? 'Jetzt kommen die gelben Würfel dazu.' : 'Jetzt kommt der nächste Sprung dazu.',
        run: () => vizSlideYellow(ctx, b) });            // gelb lassen: zwei Gruppen zum Zählen
    }
    phases.push({ caption: 'Zähl jetzt alle Würfel zusammen.', run: () => Promise.resolve() });
  } else if (p.type === 'sub'){
    const a = p.viz.start, b = p.viz.steps[0].n;
    phases.push({ caption: 'Zähl zuerst alle grünen Würfel.', run: () => vizPopGreen(ctx, a) });
    if (b > 0){
      phases.push({ caption: 'Diese roten Würfel werden gleich weggenommen.',
        run: async () => { ctx._grp = await vizMarkRed(ctx, b); } });
      phases.push({ caption: 'Jetzt nehmen wir die roten Würfel weg.',
        run: () => vizRemove(ctx, ctx._grp) });
    }
    phases.push({ caption: 'Zähl die übrigen Würfel.', run: () => Promise.resolve() });
  } else { // triple
    phases.push({ caption: 'Zähl zuerst die grünen Würfel.', run: () => vizPopGreen(ctx, p.viz.start) });
    for (const s of p.viz.steps){
      if (s.op === '+'){
        phases.push({ caption: 'Jetzt kommen gelbe Würfel dazu.', run: () => vizSlideYellow(ctx, s.n) });
      } else {
        phases.push({ caption: 'Diese roten Würfel werden gleich weggenommen.',
          run: async () => { ctx._grp = await vizMarkRed(ctx, s.n); } });
        phases.push({ caption: 'Jetzt nehmen wir die roten Würfel weg.',
          run: () => vizRemove(ctx, ctx._grp) });
      }
    }
    phases.push({ caption: 'Zähl jetzt die Würfel, die übrig sind.', run: () => Promise.resolve() });
  }
  return phases;
}

/* =========================================================
   Erklärung: langsam, Schritt für Schritt, mit Bestätigung.
   Während eine Teil-Animation läuft, ist "Weiter" gesperrt –
   so kann nichts in 2 Sekunden weggeklickt werden.
   ========================================================= */
function startExplanation(p){
  helpAdvance = null;
  quizCard.classList.add('hidden');
  feedbackCard.classList.remove('hidden');
  vizResult.classList.remove('show'); vizResult.textContent = '';
  mascot.textContent = '🤔';
  explainQuestion.textContent = problemPrompt(p);
  feedbackMsg.textContent = 'Schau genau hin – so rechnest du:';
  feedbackMsg.className = 'feedback-msg hint';

  const ctx = vizContext(cubesEl, true);               // true = Zahlen in den Würfeln
  setCols(ctx, peakOf(p.viz));
  const phases = buildPhases(p, ctx);
  let i = 0;

  async function show(){
    const ph = phases[i];
    vizCaption.textContent = ph.caption;
    phaseInfo.textContent = `Schritt ${i + 1} von ${phases.length}`;
    lockPhase(true);
    await ph.run();
    if (ctx.token !== state.vizRun) return;             // abgebrochen (z. B. neue Aufgabe)
    lockPhase(false);
    phaseBtn.textContent = (i === phases.length - 1) ? 'Verstanden ✓' : 'Weiter →';
  }
  currentAdvance = () => {
    if (phaseBtn.disabled) return;                      // während Animation gesperrt
    if (i >= phases.length - 1){ nextProblem(); return; }
    i++; show();
  };
  show();
}
function lockPhase(locked){ phaseBtn.disabled = locked; phaseBtn.classList.toggle('locked', locked); }

function buildPhases(p, ctx){
  const m = p.viz.meta;
  const reveal = () => { vizResult.textContent = resultFor(p); vizResult.classList.add('show'); mascot.textContent = '🦭'; };
  const phases = [];

  if (p.type === 'add' || p.type === 'seq'){
    const a = p.type === 'add' ? m.a : m.lastTerm;
    const b = p.type === 'add' ? m.b : m.step;
    const cap1 = p.type === 'add' ? `Das sind ${a} Würfel.` : `Die letzte Zahl ist ${a}.`;
    const cap2 = p.type === 'add' ? `Jetzt kommen ${b} dazu.` : `${m.step}er-Reihe: ${b} kommen dazu.`;
    if (a > 0) phases.push({ caption: cap1, run: () => vizPopGreen(ctx, a) });
    if (b > 0) phases.push({ caption: cap2, run: async () => { ctx._grp = await vizSlideYellow(ctx, b); } });
    phases.push({ caption: 'Zusammenstecken – zähl mit! 🧮',
      run: async () => { if (ctx._grp) await vizMerge(ctx, ctx._grp); reveal(); } });

  } else if (p.type === 'sub'){
    const a = m.a, b = m.b;
    phases.push({ caption: `Das sind ${a} Würfel.`, run: () => vizPopGreen(ctx, a) });
    if (b > 0){
      phases.push({ caption: `Wir nehmen ${b} weg – die roten.`, run: async () => { ctx._grp = await vizMarkRed(ctx, b); } });
      phases.push({ caption: 'Weg damit! Zähl, was übrig bleibt.', run: async () => { await vizRemove(ctx, ctx._grp); reveal(); } });
    } else {
      phases.push({ caption: 'Wir nehmen nichts weg.', run: async () => { reveal(); } });
    }

  } else { // triple
    phases.push({ caption: `Wir starten mit ${p.viz.start}.`, run: () => vizPopGreen(ctx, p.viz.start) });
    const steps = p.viz.steps;
    steps.forEach((s, idx) => {
      const last = idx === steps.length - 1;
      if (s.op === '+'){
        phases.push({ caption: `Plus ${s.n}: ${s.n} kommen dazu.`,
          run: async () => { const g = await vizSlideYellow(ctx, s.n); await vizMerge(ctx, g); if (last) reveal(); } });
      } else {
        phases.push({ caption: `Minus ${s.n}: ${s.n} fallen weg.`,
          run: async () => { const g = await vizMarkRed(ctx, s.n); await vizRemove(ctx, g); if (last) reveal(); } });
      }
    });
  }
  return phases;
}
function resultFor(p){
  const m = p.viz.meta, t = p.viz.total;
  switch (p.type){
    case 'add':    return `${m.a} + ${m.b} = ${t}`;
    case 'sub':    return `${m.a} − ${m.b} = ${t}`;
    case 'triple': return `${m.expr} = ${t}`;
    case 'seq':    return `${m.lastTerm} + ${m.step} = ${t}`;
  }
  return '= ' + t;
}

/* =========================================================
   Würfel-Bausteine (gemeinsam für Hilfe & Erklärung), langsam
   ========================================================= */
function peakOf(viz){
  let peak = viz.start, run = viz.start;
  for (const s of viz.steps){ run += s.op === '+' ? s.n : -s.n; peak = Math.max(peak, run); }
  return peak;
}
function vizContext(container, numbered){
  container.innerHTML = '';
  return { container, numbered, cubes: [], token: ++state.vizRun, _grp: null };
}
function setCols(ctx, peak){
  ctx.container.style.gridTemplateColumns = 'repeat(' + Math.min(10, Math.max(1, peak)) + ',1fr)';
}
function newCube(ctx, value, cls){
  const d = document.createElement('div');
  d.className = 'cube ' + cls;
  if (ctx.numbered) d.textContent = value;
  ctx.container.appendChild(d);
  ctx.cubes.push(d);
  return d;
}
async function vizPopGreen(ctx, n){
  const base = ctx.cubes.length;
  const stag = Math.min(0.06, 0.9 / Math.max(1, n));
  for (let i = 1; i <= n; i++){
    const c = newCube(ctx, base + i, 'enter');
    c.style.setProperty('--d', ((i - 1) * stag) + 's');
  }
  await sleep(n * stag * 1000 + 650);
}
async function vizSlideYellow(ctx, n){
  const base = ctx.cubes.length, grp = [];
  const stag = Math.min(0.08, 0.9 / Math.max(1, n));
  for (let i = 1; i <= n; i++){
    const c = newCube(ctx, base + i, 'enter-slide added');
    c.style.setProperty('--d', ((i - 1) * stag) + 's');
    grp.push(c);
  }
  await sleep(n * stag * 1000 + 750);
  return grp;
}
async function vizMerge(ctx, grp){ grp.forEach(c => c.classList.remove('added')); await sleep(800); }
async function vizMarkRed(ctx, n){
  const grp = ctx.cubes.slice(ctx.cubes.length - n);
  grp.forEach(c => c.classList.add('red'));
  await sleep(1000);
  return grp;
}
async function vizRemove(ctx, grp){
  grp.forEach(c => c.classList.add('removing'));
  await sleep(700);
  grp.forEach(c => c.remove());
  ctx.cubes = ctx.cubes.filter(c => !grp.includes(c));
  await sleep(500);
}

/* =========================================================
   Nächste Aufgabe / Stufen / Leben / Anzeige
   ========================================================= */
function nextProblem(){
  state.vizRun++; currentAdvance = null; helpAdvance = null;
  state.busy = false; state.timerPaused = false;
  feedbackCard.classList.add('hidden');
  quizCard.classList.remove('hidden');
  vizResult.classList.remove('show'); vizResult.textContent = '';
  phaseInfo.textContent = '';
  cubesEl.innerHTML = '';
  helpArea.classList.add('hidden'); helpCubes.innerHTML = '';
  finishHelp();
  helpBtn.classList.remove('hidden');
  state.current = generateProblem(state.level);
  renderQuestion();
}

function levelUp(){
  state.level++;
  state.correctInLevel = 0;
  playLevelUp();
  let extra = '';
  if (state.level % LIFE_EVERY === 0 && state.lives < MAX_LIVES){ state.lives++; extra += ' ❤️ +1 Leben!'; }
  if (state.level === BOND_TO_TEN_LEVEL) extra += ' Neu: verliebte Zahlen! 💕';
  if (state.level === SUB_FROM_LEVEL)    extra += ' Neu: Minus bis 10! ➖';
  if (state.level === 6)                 extra += ' Neu: bis 20! 🔟';
  if (state.level === SEQ_FROM_LEVEL)    extra += ' Neu: Zahlenreihen! 🔢';
  if (state.level === TRIPLE_FROM_LEVEL) extra += ' Neu: drei Zahlen! 🎲';
  showBanner(`Stufe ${state.level} erreicht! 🎉${extra}`);
}

function renderLives(){
  livesEl.textContent = '❤️'.repeat(state.lives) + '🤍'.repeat(Math.max(0, MAX_LIVES - state.lives));
}
function updateStats(){
  scoreEl.textContent = state.score;
  streakEl.textContent = state.streak;
  renderLives();
  renderLevelMap();
  if (state.mode === 'time'){
    modeChip.textContent = '⏱️ ' + fmtTime(state.timeLeft);
    modeChip.classList.toggle('urgent', state.timeLeft <= 10);
    levelFill.classList.add('time');
    levelFill.style.width = Math.max(0, Math.round(state.timeLeft / TIME_SECONDS * 100)) + '%';
    levelInfo.textContent = 'Stufe ' + state.level + ' – noch ' + fmtTime(state.timeLeft);
  } else if (state.mode === 'count'){
    modeChip.textContent = '🎯 ' + state.score + '/' + state.target;
    modeChip.classList.remove('urgent');
    levelFill.classList.remove('time');
    levelFill.style.width = Math.min(100, Math.round(state.score / state.target * 100)) + '%';
    levelInfo.textContent = 'Stufe ' + state.level + ' – noch ' + Math.max(0, state.target - state.score) + ' Aufgaben';
  } else {
    modeChip.textContent = '🏆 Stufe ' + state.level;
    modeChip.classList.remove('urgent');
    levelFill.classList.remove('time');
    levelFill.style.width = Math.min(100, Math.round(state.correctInLevel / CORRECT_PER_LEVEL * 100)) + '%';
    levelInfo.textContent = state.correctInLevel + '/' + CORRECT_PER_LEVEL + ' bis Stufe ' + (state.level + 1);
  }
}

function levelDetails(level){
  const max = maxForLevel(level);
  if (level >= TRIPLE_FROM_LEVEL) return { icon: '🎲', label: '3 Zahlen', difficulty: 'knifflig', className: 'hard', detail: 'bis ' + max };
  if (level >= SEQ_FROM_LEVEL) return { icon: '🔢', label: 'Reihen', difficulty: 'mittel+', className: 'medium', detail: 'bis 100' };
  if (level === 1) return { icon: '➕', label: 'Plus', difficulty: 'leicht', className: 'easy', detail: 'bis 5' };
  if (level === 2) return { icon: '➕', label: 'Plus', difficulty: 'leicht', className: 'easy', detail: 'bis 10' };
  if (level === BOND_TO_TEN_LEVEL) return { icon: '💕', label: 'Verliebte Zahlen', difficulty: 'leicht+', className: 'easy', detail: 'zur 10' };
  if (level === SUB_FROM_LEVEL) return { icon: '➖', label: 'Minus', difficulty: 'leicht+', className: 'easy', detail: 'bis 10' };
  if (level === 5) return { icon: '↔', label: 'Plus & Minus', difficulty: 'leicht+', className: 'easy', detail: 'bis 10' };
  if (level === 6) return { icon: '➕', label: 'Plus', difficulty: 'mittel', className: 'medium', detail: 'bis 20' };
  if (level === 7) return { icon: '➖', label: 'Minus', difficulty: 'mittel', className: 'medium', detail: 'bis 20' };
  if (level === 8) return { icon: '↔', label: 'Plus & Minus', difficulty: 'mittel', className: 'medium', detail: 'bis 20' };
  if (level === 9) return { icon: '💕', label: 'Zehnerfreunde', difficulty: 'mittel', className: 'medium', detail: 'Wiederholung' };
  if (level >= SUB_FROM_LEVEL) return { icon: '↔', label: 'Plus & Minus', difficulty: 'mittel', className: 'medium', detail: 'bis ' + max };
  return { icon: '➕', label: 'Plus', difficulty: 'leicht', className: 'easy', detail: 'bis ' + max };
}
function renderLevelMap(){
  const details = levelDetails(state.level);
  mapDifficulty.textContent = details.difficulty;
  mapDifficulty.className = 'map-pill ' + details.className;
  mapSummary.textContent = 'Stufe ' + state.level + ': ' + details.label + ' ' + details.detail;
  mapPath.innerHTML = '';

  const start = Math.max(1, state.level - 2);
  const end = Math.max(start + 6, Math.min(state.level + 4, TRIPLE_FROM_LEVEL + 2));
  for (let level = start; level <= end; level++){
    const item = document.createElement('div');
    const info = levelDetails(level);
    item.className = 'map-node ' + (level < state.level ? 'done' : level === state.level ? 'current ' + info.className : 'locked');
    if (level === BOND_TO_TEN_LEVEL || level === SUB_FROM_LEVEL || level === 6 || level === SEQ_FROM_LEVEL || level === TRIPLE_FROM_LEVEL) item.classList.add('milestone');

    const badge = document.createElement('div');
    badge.className = 'map-badge';
    badge.textContent = level < state.level ? '✓' : level === state.level ? '🦭' : info.icon;

    const text = document.createElement('div');
    text.className = 'map-text';
    const title = document.createElement('b');
    title.textContent = 'Stufe ' + level;
    const meta = document.createElement('span');
    meta.textContent = info.label + ' · ' + info.detail;
    text.appendChild(title);
    text.appendChild(meta);

    item.appendChild(badge);
    item.appendChild(text);
    mapPath.appendChild(item);
  }
}

function flashCorrect(helped){
  quizCard.classList.add('flash');
  setTimeout(() => quizCard.classList.remove('flash'), 700);
  const b = document.createElement('div');
  b.className = 'rich-badge' + (helped ? ' helped' : '');
  b.textContent = helped ? 'Richtig gezählt! 👍' : pick(['Richtig! +1 ⭐', 'Super! +1 🌟', 'Toll! +1 🎉']);
  quizCard.appendChild(b);
  setTimeout(() => b.remove(), 1100);
}

let bannerTimer = null;
function showBanner(text){
  banner.textContent = text;
  banner.classList.remove('hidden');
  requestAnimationFrame(() => banner.classList.add('show'));
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => banner.classList.add('hidden'), 300);
  }, 2400);
}
function shake(el){
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}

/* =========================================================
   Modi: Start, Timer, Ende
   ========================================================= */
function showScreen(which){
  startScreen.classList.toggle('hidden', which !== 'start');
  endScreen.classList.toggle('hidden', which !== 'end');
  gameWrap.classList.toggle('hidden', which !== 'game');
}
function startMode(mode){
  ensureAudio();
  state.mode = mode; state.streak = 0;
  if (mode === 'practice'){
    state.score = persist.practice.score;
    state.level = Math.max(1, persist.practice.level);
    state.correctInLevel = persist.practice.correctInLevel;
    state.lives = persist.practice.lives != null ? persist.practice.lives : MAX_LIVES;
    const s = parseInt(new URLSearchParams(location.search).get('stufe'), 10);
    if (s >= 1){ state.level = s; state.correctInLevel = 0; }
  } else {
    state.score = 0; state.level = 1; state.correctInLevel = 0; state.lives = MAX_LIVES;
  }
  if (mode === 'time'){ state.timeLeft = TIME_SECONDS; state.timerPaused = false; }
  if (mode === 'count'){ state.runStart = Date.now(); }
  showScreen('game');
  updateStats();
  nextProblem();
  if (mode === 'time') startTimer();
}
function startTimer(){ stopTimer(); state.timerId = setInterval(tick, 1000); }
function stopTimer(){ if (state.timerId){ clearInterval(state.timerId); state.timerId = null; } }
function tick(){
  if (state.timerPaused) return;
  state.timeLeft--;
  if (state.timeLeft < 0) state.timeLeft = 0;
  updateStats();
  if (state.timeLeft <= 0){ stopTimer(); endRun(); }
}
function endRun(){
  stopTimer(); state.vizRun++; currentAdvance = null; helpAdvance = null; state.busy = true;
  let statsHtml = '';
  if (state.mode === 'time'){
    if (state.score > (persist.bestTime || 0)) persist.bestTime = state.score;
    endTitle.textContent = '⏱️ Zeit vorbei!';
    statsHtml = `Du hast <b>${state.score}</b> ${state.score === 1 ? 'Aufgabe' : 'Aufgaben'} geschafft! 🌟`
      + `<br><span class="rec">🥇 Rekord: ${persist.bestTime}</span>`;
  } else if (state.mode === 'count'){
    const secs = Math.round((Date.now() - state.runStart) / 1000);
    const prev = persist.bestCount[state.target];
    if (prev == null || secs < prev) persist.bestCount[state.target] = secs;
    endTitle.textContent = '🎯 Geschafft!';
    statsHtml = `${state.target} Aufgaben in <b>${fmtTime(secs)}</b>! 🎉`
      + `<br><span class="rec">🥇 Beste Zeit: ${fmtTime(persist.bestCount[state.target])}</span>`;
  }
  save();
  endStats.innerHTML = statsHtml;
  showScreen('end');
  playLevelUp(); confetti();
}
function goMenu(){
  stopTimer(); state.vizRun++; currentAdvance = null; helpAdvance = null; state.busy = true; state.mode = null;
  refreshStartBest();
  showScreen('start');
}
function refreshStartBest(){
  const parts = [];
  if (persist.practice.score > 0) parts.push(`Üben: Stufe ${persist.practice.level}, ⭐ ${persist.practice.score}`);
  if (persist.bestTime > 0) parts.push(`Zeit-Rekord: ${persist.bestTime}`);
  startBest.innerHTML = parts.length ? ('🥇 ' + parts.join(' · ')) : '';
}

/* =========================================================
   Steuerung
   ========================================================= */
keypad.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.d != null) inputDigit(b.dataset.d);
  else if (b.dataset.act === 'back') inputBack();
  else if (b.dataset.act === 'check') check();
});
helpBtn.addEventListener('click', showHelp);
helpPhaseBtn.addEventListener('click', () => { if (helpAdvance) helpAdvance(); });
phaseBtn.addEventListener('click', () => { if (currentAdvance) currentAdvance(); });

window.addEventListener('keydown', e => {
  if (!gameWrap || gameWrap.classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
  else if (e.key === 'Backspace'){ e.preventDefault(); inputBack(); }
  else if (e.key === 'Enter'){
    e.preventDefault();
    if (!feedbackCard.classList.contains('hidden')){ if (currentAdvance) currentAdvance(); }
    else if (!helpPhaseBtn.classList.contains('hidden') && state.input === ''){ if (helpAdvance) helpAdvance(); }
    else check();
  }
});

muteBtn.addEventListener('click', () => {
  muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; save();
});
homeBtn.addEventListener('click', () => {
  if (confirm('Zurück zum Menü?')) goMenu();
});

// Startbildschirm
document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => startMode(btn.dataset.mode));
});
document.querySelectorAll('.count-choice button').forEach(btn => {
  btn.addEventListener('click', () => {
    state.target = parseInt(btn.dataset.count, 10);
    countLabel.textContent = state.target;
    document.querySelectorAll('.count-choice button').forEach(b => b.classList.toggle('sel', b === btn));
  });
});
$('againBtn').addEventListener('click', () => startMode(state.mode));
$('menuBtn').addEventListener('click', goMenu);

/* ---- Start ---- */
function init(){
  load();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  countLabel.textContent = state.target;
  refreshStartBest();
  showScreen('start');
}
init();
