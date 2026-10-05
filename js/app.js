/* Grochu's gym — dziennik treningów na siłowni (jak RepCount): serie, ciężary, powtórzenia, przerwy, plany, rekordy i wykresy.
   Dane w localStorage + Supabase (js/cloud.js). Wszystkie ciężary zapisywane w kg, wyświetlane w kg albo lb. */
(() => {
  'use strict';

  const STORAGE_KEY = 'ggym.v1', REST_KEY = 'ggym.rest';
  const DAYS_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const MON_S = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  /* ---------- biblioteka ćwiczeń ---------- */
  const MUSCLES = [['chest', 'Klatka'], ['back', 'Plecy'], ['shoulders', 'Barki'], ['biceps', 'Biceps'], ['triceps', 'Triceps'], ['legs', 'Nogi'], ['glutes', 'Pośladki'], ['calves', 'Łydki'], ['abs', 'Brzuch'], ['forearms', 'Przedramiona'], ['full', 'Całe ciało'], ['cardio', 'Cardio']];
  const muscleName = m => (MUSCLES.find(x => x[0] === m) || MUSCLES[10])[1];
  const KINDS = [['wr', 'Ciężar × powt.'], ['bw', 'Masa ciała'], ['time', 'Na czas'], ['cardio', 'Cardio']];
  const kindName = k => (KINDS.find(x => x[0] === k) || KINDS[0])[1];
  // [id, nazwa, partia, rodzaj] — id są stałe (zapisane w treningach), nie zmieniać
  const LIB = [
    ['bench', 'Wyciskanie sztangi na ławce płaskiej', 'chest'], ['incbench', 'Wyciskanie sztangi na skosie dodatnim', 'chest'], ['declbench', 'Wyciskanie sztangi na skosie ujemnym', 'chest'],
    ['dbbench', 'Wyciskanie hantli na ławce płaskiej', 'chest'], ['incdb', 'Wyciskanie hantli na skosie dodatnim', 'chest'], ['dbfly', 'Rozpiętki z hantlami', 'chest'],
    ['cablefly', 'Rozpiętki na bramie', 'chest'], ['pecdeck', 'Butterfly (maszyna)', 'chest'], ['chestpress', 'Wyciskanie na maszynie', 'chest'],
    ['pushup', 'Pompki', 'chest', 'bw'], ['dips', 'Pompki na poręczach (dipy)', 'chest', 'bw'],
    ['deadlift', 'Martwy ciąg', 'back'], ['pullup', 'Podciąganie nachwytem', 'back', 'bw'], ['chinup', 'Podciąganie podchwytem', 'back', 'bw'],
    ['bbrow', 'Wiosłowanie sztangą', 'back'], ['dbrow', 'Wiosłowanie hantlem jednorącz', 'back'], ['latpull', 'Ściąganie drążka wyciągu górnego', 'back'],
    ['cablerow', 'Wiosłowanie na wyciągu dolnym', 'back'], ['tbar', 'Wiosłowanie T-bar', 'back'], ['pullover', 'Pullover na wyciągu', 'back'],
    ['hyperext', 'Hiperekstensje', 'back', 'bw'], ['shrug', 'Szrugsy', 'back'],
    ['ohp', 'Wyciskanie żołnierskie (OHP)', 'shoulders'], ['dbpress', 'Wyciskanie hantli nad głowę', 'shoulders'], ['arnold', 'Arnoldki', 'shoulders'],
    ['latraise', 'Unoszenie hantli bokiem', 'shoulders'], ['frontraise', 'Unoszenie hantli w przód', 'shoulders'], ['revfly', 'Odwrotne rozpiętki', 'shoulders'],
    ['facepull', 'Face pull', 'shoulders'], ['uprow', 'Wiosłowanie sztangą do brody', 'shoulders'], ['cablelat', 'Unoszenie ramienia bokiem na wyciągu', 'shoulders'],
    ['curl', 'Uginanie ramion ze sztangą', 'biceps'], ['dbcurl', 'Uginanie ramion z hantlami', 'biceps'], ['hammer', 'Uginanie młotkowe', 'biceps'],
    ['preacher', 'Uginanie na modlitewniku', 'biceps'], ['cablecurl', 'Uginanie ramion na wyciągu', 'biceps'], ['conccurl', 'Uginanie skoncentrowane', 'biceps'],
    ['skull', 'Wyciskanie francuskie', 'triceps'], ['pushdown', 'Prostowanie ramion na wyciągu', 'triceps'], ['cgbench', 'Wyciskanie wąskim chwytem', 'triceps'],
    ['ohext', 'Prostowanie ramion nad głową', 'triceps'], ['kickback', 'Prostowanie ramienia w opadzie', 'triceps'], ['diamond', 'Pompki diamentowe', 'triceps', 'bw'],
    ['squat', 'Przysiad ze sztangą', 'legs'], ['frontsquat', 'Przysiad przedni', 'legs'], ['legpress', 'Wypychanie nóg na suwnicy', 'legs'],
    ['hack', 'Hack przysiad', 'legs'], ['goblet', 'Przysiad z hantlem (goblet)', 'legs'], ['lunge', 'Wykroki z hantlami', 'legs'],
    ['bulgarian', 'Przysiad bułgarski', 'legs'], ['legext', 'Prostowanie nóg na maszynie', 'legs'], ['legcurl', 'Uginanie nóg na maszynie', 'legs'],
    ['rdl', 'Martwy ciąg rumuński', 'legs'],
    ['hipthrust', 'Hip thrust', 'glutes'], ['bridge', 'Mostek biodrowy', 'glutes'], ['abduct', 'Odwodzenie nóg na maszynie', 'glutes'], ['kickcable', 'Wykopy na wyciągu', 'glutes'],
    ['calfstand', 'Wspięcia na palce stojąc', 'calves'], ['calfseat', 'Wspięcia na palce siedząc', 'calves'],
    ['plank', 'Deska (plank)', 'abs', 'time'], ['sideplank', 'Deska bokiem', 'abs', 'time'], ['crunch', 'Spięcia brzucha', 'abs', 'bw'],
    ['legraise', 'Unoszenie nóg w zwisie', 'abs', 'bw'], ['cablecrunch', 'Allahy (spięcia na wyciągu)', 'abs'], ['russian', 'Russian twist', 'abs', 'bw'], ['abwheel', 'Kółko do brzucha', 'abs', 'bw'],
    ['wristcurl', 'Uginanie nadgarstków', 'forearms'], ['farmer', 'Spacer farmera', 'forearms', 'time'],
    ['clean', 'Zarzut sztangi (power clean)', 'full'], ['kbswing', 'Swing kettlebell', 'full'], ['thruster', 'Thruster', 'full'], ['burpee', 'Burpees', 'full', 'bw'],
    ['treadmill', 'Bieżnia', 'cardio', 'cardio'], ['bike', 'Rower stacjonarny', 'cardio', 'cardio'], ['elliptical', 'Orbitrek', 'cardio', 'cardio'],
    ['rower', 'Wioślarz', 'cardio', 'cardio'], ['stairs', 'Schody (stepper)', 'cardio', 'cardio'], ['rope', 'Skakanka', 'cardio', 'cardio'], ['run', 'Bieganie na zewnątrz', 'cardio', 'cardio'],
  ];
  const DEF_EX = Object.fromEntries(LIB.map(([id, name, muscle, kind = 'wr']) => [id, { id, name, muscle, kind }]));

  // Gotowe plany (jak klasyczne podziały w RepCount): [ćwiczenie, serie, powtórzenia]
  const TEMPLATES = [
    { id: 'ppl', name: 'Push / Pull / Legs', desc: '3 treningi: klatka-barki-triceps, plecy-biceps, nogi', rs: [
      ['Push', [['bench', 4, '6–8'], ['ohp', 3, '8'], ['incdb', 3, '10'], ['latraise', 3, '12–15'], ['pushdown', 3, '12']]],
      ['Pull', [['deadlift', 3, '5'], ['pullup', 3, '8'], ['bbrow', 3, '8'], ['facepull', 3, '15'], ['curl', 3, '10'], ['hammer', 2, '12']]],
      ['Legs', [['squat', 4, '6–8'], ['rdl', 3, '8'], ['legpress', 3, '10'], ['legcurl', 3, '12'], ['calfstand', 4, '12–15']]]] },
    { id: 'ul', name: 'Góra / Dół', desc: '2 treningi, każdy 2× w tygodniu', rs: [
      ['Góra', [['bench', 4, '6'], ['bbrow', 4, '8'], ['ohp', 3, '8'], ['latpull', 3, '10'], ['curl', 2, '12'], ['pushdown', 2, '12']]],
      ['Dół', [['squat', 4, '6'], ['rdl', 3, '8'], ['legpress', 3, '10'], ['legcurl', 3, '12'], ['calfstand', 4, '15'], ['plank', 3, '45 s']]]] },
    { id: 'fbw', name: 'FBW (całe ciało)', desc: 'treningi A i B na przemian, 3× w tygodniu', rs: [
      ['FBW A', [['squat', 3, '8'], ['bench', 3, '8'], ['bbrow', 3, '8'], ['ohp', 2, '10'], ['plank', 3, '45 s']]],
      ['FBW B', [['deadlift', 3, '5'], ['incdb', 3, '10'], ['pullup', 3, '8'], ['lunge', 3, '10'], ['curl', 2, '12']]]] },
    { id: '5x5', name: '5×5 (siła)', desc: 'treningi A i B, ciężar rośnie co trening', rs: [
      ['5×5 A', [['squat', 5, '5'], ['bench', 5, '5'], ['bbrow', 5, '5']]],
      ['5×5 B', [['squat', 5, '5'], ['ohp', 5, '5'], ['deadlift', 1, '5']]]] },
  ];

  /* ---------- daty ---------- */
  const pad = n => String(n).padStart(2, '0');
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dow = d => (d.getDay() + 6) % 7; // 0 = poniedziałek
  const todayKey = () => key(new Date());
  const dayOnly = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const weekStart = d => addDays(dayOnly(d), -dow(d));
  const dateLabel = k => { const d = fromKey(k); return `${DAYS_FULL[dow(d)]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
  const shortDate = ms => { const d = new Date(ms); return `${d.getDate()} ${MON_S[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
  const hhmm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const relDay = k => { const t = todayKey(); return k === t ? 'Dziś' : k === key(addDays(new Date(), -1)) ? 'Wczoraj' : null; };
  const ago = ms => { const n = Math.round((dayOnly(new Date()) - dayOnly(ms)) / 864e5); return n <= 0 ? 'dziś' : n === 1 ? 'wczoraj' : n < 14 ? `${n} dni temu` : n < 60 ? `${Math.round(n / 7)} tyg. temu` : shortDate(ms); };
  const defaultName = ms => { const h = new Date(ms).getHours(); return h < 12 ? 'Poranny trening' : h < 18 ? 'Popołudniowy trening' : 'Wieczorny trening'; };

  /* ---------- stan ---------- */
  const DEF_SET = { unit: 'kg', rest: 90, weekGoal: 3, sound: true };
  const withDefaults = s => {
    s = s && typeof s === 'object' ? s : {};
    s.settings = { ...DEF_SET, ...(s.settings || {}) };
    ['workouts', 'routines', 'exercises', 'body'].forEach(c => { if (!s[c] || typeof s[c] !== 'object') s[c] = {}; });
    if (!s.active || typeof s.active !== 'object') s.active = null;
    return s;
  };
  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return withDefaults(JSON.parse(raw)); } catch (_) { }
    return withDefaults({});
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { toast('Nie udało się zapisać danych w przeglądarce'); return; }
    window.Cloud?.changed();
  }
  // Stan z chmury: zapis lokalny bez oznaczania go jako zmiany z tego urządzenia.
  function applyState(s) {
    const typing = document.activeElement?.closest?.('#view-workout') && state.active && s.active && s.active.id === state.active.id;
    state = withDefaults({ ...s });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { }
    if (typing) return; // nie przerywamy wpisywania serii zmianą z drugiego urządzenia
    if (!overlay.innerHTML) render();
  }

  let view = 'workout', animList = true, hello = true;
  let hQuery = '', hLimit = 20, xQuery = '', xMus = 'all', pWeeks = 8, calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  try { const v = localStorage.getItem('ggym.view'); if (['history', 'routines', 'exercises', 'progress'].includes(v)) view = v; } catch (_) { }
  if (state.active) view = 'workout';
  const mq = window.matchMedia('(max-width:680px)');
  const isMobile = () => mq.matches;
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- liczby i jednostki ---------- */
  const r0 = v => Math.round(v || 0);
  const r1 = v => Math.round((v || 0) * 10) / 10;
  const nf = (v, d = 1) => (+v || 0).toLocaleString('pl-PL', { maximumFractionDigits: d });
  const LB = 2.20462;
  const U = () => state.settings.unit === 'lb' ? 'lb' : 'kg';
  const uf = () => U() === 'lb' ? LB : 1;
  const dispW = kg => kg == null || kg === '' ? '' : +(kg * uf()).toFixed(U() === 'lb' ? 1 : 2);
  const fmtW = kg => nf(dispW(kg || 0), 2);
  const fmtRM = kg => nf((kg || 0) * uf(), 1);
  const fmtVol = kg => { const v = (kg || 0) * uf(); return v >= 100000 ? nf(v / 1000, 1) + ' t' : nf(Math.round(v), 0); };
  const fmtK = v => v >= 1000 ? nf(v / 1000, v >= 10000 ? 0 : 1) + 'k' : String(r0(v));
  const fmtSec = s => { s = Math.round(s || 0); return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const fmtDur = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`; };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = p => (p || 'w') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const norm = s => String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const num = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) && x >= 0 ? x : null; };
  const deep = o => JSON.parse(JSON.stringify(o));

  /* ---------- ćwiczenia, serie, statystyki ---------- */
  const exById = id => state.exercises[id] || DEF_EX[id] || null;
  const exOf = e => exById(e.eid) || { id: e.eid, name: e.n || 'Ćwiczenie', muscle: 'full', kind: 'wr' };
  // ćwiczenie także po usunięciu (nazwa zostaje w zapisanych treningach)
  const exAny = eid => exById(eid) || exOf(Object.values(state.workouts).flatMap(w => w.ex).find(e => e.eid === eid) || { eid });
  const allEx = () => [...Object.values(DEF_EX), ...Object.values(state.exercises)].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const colsOf = k => k === 'bw' ? [['kg', '+' + U()], ['r', 'Powt.']] : k === 'time' ? [['kg', '+' + U()], ['s', 'Sek.']] : k === 'cardio' ? [['s', 'Min'], ['km', 'Km'], ['kcal', 'Kcal']] : [['kg', U()], ['r', 'Powt.']];
  const inVal = (s, f, k) => { const v = s[f]; if (v == null || v === '') return ''; if (f === 'kg') return dispW(v); if (f === 's' && k === 'cardio') return r1(v / 60); return v; };
  const putVal = (s, f, v, k) => { if (v == null) { s[f] = null; return; } s[f] = f === 'kg' ? +(v / uf()).toFixed(3) : f === 's' && k === 'cardio' ? Math.round(v * 60) : v; };
  function fmtSet(s, k, long) {
    if (k === 'cardio') return [s.s ? r0(s.s / 60) + ' min' : '', s.km ? nf(s.km, 2) + ' km' : '', s.kcal ? r0(s.kcal) + ' kcal' : ''].filter(Boolean).join(' · ') || '—';
    if (k === 'time') return (s.kg ? `+${fmtW(s.kg)}${long ? ' ' + U() : ''} · ` : '') + fmtSec(s.s);
    if (k === 'bw') return s.kg ? `+${fmtW(s.kg)}${long ? ' ' + U() : ''} × ${s.r || 0}` : `${s.r || 0}${long ? ' powt.' : ''}`;
    return `${fmtW(s.kg)}${long ? ' ' + U() : ''} × ${s.r || 0}`;
  }
  const valid = (s, k) => k === 'cardio' ? !!(s.s || s.km || s.kcal) : k === 'time' ? s.s > 0 : s.r > 0 && (k !== 'wr' || s.kg != null);
  const e1rm = (kg, r) => !kg || !r ? 0 : r === 1 ? kg : kg * (1 + Math.min(r, 15) / 30);
  const work = sets => sets.filter(s => s.t !== 'w');
  const volOf = (sets, k) => k === 'wr' || k === 'bw' ? work(sets).reduce((a, s) => a + (s.kg || 0) * (s.r || 0), 0) : 0;
  const finished = () => Object.values(state.workouts).filter(w => w && w.start).sort((a, b) => b.start - a.start);
  function wStats(w, onlyDone) {
    let sets = 0, vol = 0;
    (w.ex || []).forEach(e => { const k = exOf(e).kind, ss = onlyDone ? e.sets.filter(s => s.done) : e.sets; sets += work(ss).length; vol += volOf(ss, k); });
    return { sets, vol, ms: (w.end || Date.now()) - w.start, ex: (w.ex || []).length };
  }
  // sesje ćwiczenia od najstarszej
  function sessionsOf(eid, excl) {
    const out = [];
    finished().forEach(w => { if (w.id === excl) return; w.ex.forEach(e => { if (e.eid === eid && e.sets.length) out.push({ w, e, sets: e.sets }); }); });
    return out.reverse();
  }
  function lastSets(eid, excl) {
    for (const w of finished()) { if (w.id === excl) continue; const e = w.ex.find(x => x.eid === eid && x.sets.length); if (e) return e.sets; }
    return null;
  }
  function bests(eid, excl, before = Infinity) {
    const b = { e1rm: 0, kg: 0, r: 0, s: 0, n: 0 };
    sessionsOf(eid, excl).forEach(({ w, sets }) => {
      if (w.start >= before) return;
      b.n++;
      work(sets).forEach(s => { b.e1rm = Math.max(b.e1rm, e1rm(s.kg, s.r)); b.kg = Math.max(b.kg, s.kg || 0); b.r = Math.max(b.r, s.r || 0); b.s = Math.max(b.s, s.s || 0); });
    });
    return b;
  }
  // Rekord: tylko gdy ćwiczenie było już robione (pierwszy raz to jeszcze nie rekord)
  function prOf(s, k, b) {
    if (!b.n || s.t === 'w') return null;
    if (k === 'wr') { if (e1rm(s.kg, s.r) > b.e1rm + .01) return 'e1rm'; if ((s.kg || 0) > b.kg + .001) return 'kg'; }
    if (k === 'bw' && (s.r || 0) > b.r) return 'r';
    if (k === 'time' && (s.s || 0) > b.s) return 's';
    return null;
  }
  const PR_NAME = { e1rm: 'Szac. 1RM', kg: 'Najcięższy', r: 'Najwięcej powtórzeń', s: 'Najdłużej' };
  function computePRs(w) {
    const prs = [];
    w.ex.forEach(e => {
      const k = exOf(e).kind, b = bests(e.eid, w.id, w.start);
      e.sets.forEach(s => { delete s.pr; });
      if (!b.n) return;
      const top = {};
      work(e.sets).forEach(s => {
        const t = prOf(s, k, b); if (!t) return;
        const v = t === 'e1rm' ? e1rm(s.kg, s.r) : t === 'kg' ? s.kg : t === 'r' ? s.r : s.s;
        if (!top[t] || v > top[t].v) top[t] = { v, s };
      });
      Object.entries(top).forEach(([t, x]) => { x.s.pr = 1; prs.push({ eid: e.eid, t, v: x.v, set: { kg: x.s.kg, r: x.s.r, s: x.s.s } }); });
    });
    return prs;
  }
  const weekWorkouts = (off = 0) => { const a = addDays(weekStart(new Date()), off * 7).getTime(), b = addDays(new Date(a), 7).getTime(); return finished().filter(w => w.start >= a && w.start < b); };
  function weekSum(off) { const ws = weekWorkouts(off); return ws.reduce((a, w) => { const s = wStats(w); a.sets += s.sets; a.vol += s.vol; a.ms += s.ms; return a; }, { n: ws.length, sets: 0, vol: 0, ms: 0 }); }
  function weekStreak() {
    const g = state.settings.weekGoal; let n = 0;
    for (let i = 0; i < 520; i++) { const c = weekWorkouts(-i).length; if (c >= g) n++; else if (i === 0) continue; else break; }
    return n;
  }
  const prLabel = p => {  return p.t === 'e1rm' ? `~${nf(p.v * uf(), 1)} ${U()}` : p.t === 'kg' ? `${fmtW(p.v)} ${U()}` : p.t === 'r' ? `${p.v} powt.` : fmtSec(p.v); };

  /* ---------- ikony ---------- */
  const wavePath = (amp, len) => { let d = 'M0 20'; for (let x = 0; x < 400; x += len) d += ` Q${x + len / 4} ${20 - amp} ${x + len / 2} 20 T${x + len} 20`; return d + ' V40 H0 Z'; };
  const SEA_SVG = `<svg class="waves" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true"><path class="w1" d="${wavePath(5, 50)}"/><path class="w2" d="${wavePath(7, 100)}" transform="translate(0 3)"/><path class="w3" d="${wavePath(3, 50)}" transform="translate(0 9)"/></svg>`;
  const BOAT = '<svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true"><path d="M12 2v14H4z" fill="currentColor" opacity=".9"/><path d="M14 5v11h7z" fill="currentColor" opacity=".55"/><path d="M2 18h22l-3 4H6z" fill="currentColor"/></svg>';
  const XMARK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const PLUS = '<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DOTS = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="8" r="1.5" fill="currentColor"/></svg>';
  const SEARCH = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.6" stroke="currentColor" stroke-width="1.7"/><path d="M10.5 10.5l3.2 3.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const AGAIN = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.8h-2.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PLAY = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10 6z" fill="currentColor"/></svg>';
  const DUMB = '<svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 6v4M14.5 6v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="3" y="3.5" width="2.6" height="9" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="10.4" y="3.5" width="2.6" height="9" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M5.6 8h4.8" stroke="currentColor" stroke-width="1.6"/></svg>';
  const abbr = m => ({ chest: 'KL', back: 'PL', shoulders: 'BA', biceps: 'BI', triceps: 'TR', legs: 'NO', glutes: 'PO', calves: 'ŁY', abs: 'BR', forearms: 'PR', full: 'CC', cardio: 'CA' }[m] || '··');

  const $ = id => document.getElementById(id);
  const overlay = $('overlay');

  /* ---------- płynne liczby ---------- */
  const shown = new Map();
  function countTo(el, v, dur = 450, fmt = x => r0(x).toLocaleString('pl-PL')) {
    if (!el) return;
    const id = el.id || el.dataset.cnt; const from = shown.has(id) ? shown.get(id) : v; shown.set(id, v);
    if (document.hidden || from === v || calm()) { el.textContent = fmt(v); return; }
    const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (v - from) * e); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(() => { el.textContent = fmt(v); }, dur + 80);
  }
  // Wysokość wody w kole tak, żeby zalana POWIERZCHNIA odpowiadała % celu (jak w trackerze).
  const waterLevel = f => {
    if (f <= 0 || f >= 1) return Math.max(0, Math.min(1, f)) * 100;
    let lo = 0, hi = Math.PI * 2;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if ((m - Math.sin(m)) / (2 * Math.PI) < f) lo = m; else hi = m; }
    return +((1 - Math.cos(lo / 2)) / 2 * 100).toFixed(1);
  };

  /* ---------- rysowanie ---------- */
  const VIEWS = ['workout', 'history', 'routines', 'exercises', 'progress'];
  function render() {
    document.querySelectorAll('.vtab[data-view]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === view));
    VIEWS.forEach(v => { $('view-' + v).hidden = view !== v; });
    const a = state.active;
    document.body.classList.toggle('logging', !!a && view === 'workout');
    const hero = $('hero-num');
    hero.classList.toggle('clock', !!a && !a.edit && view === 'workout');
    if (view === 'workout') {
      if (a) {
        $('top-label').textContent = a.edit ? 'Edycja treningu' : 'Trening trwa';
        if (a.edit) countTo(hero, wStats(a, true).sets); else hero.textContent = elapsed();
        drawHeroSub();
      } else {
        const wk = weekSum(0), g = state.settings.weekGoal, st = weekStreak();
        $('top-label').textContent = dateLabel(todayKey());
        countTo(hero, wk.n);
        $('hero-sub').innerHTML = `<em>z ${g}</em> treningów w tym tygodniu${st ? ` · seria <b>${st}</b> ${st === 1 ? 'tydzień' : 'tyg.'}` : ''}`;
      }
    } else if (view === 'history') {
      const ws = finished(), ms = ws.reduce((x, w) => x + (w.end - w.start), 0);
      $('top-label').textContent = 'Historia treningów';
      countTo(hero, ws.length);
      $('hero-sub').innerHTML = `treningów · łącznie <b>${nf(ms / 36e5, 0)}</b> h`;
    } else if (view === 'routines') {
      $('top-label').textContent = 'Plany treningowe';
      countTo(hero, Object.keys(state.routines).length);
      $('hero-sub').innerHTML = 'planów · start jednym kliknięciem';
    } else if (view === 'exercises') {
      $('top-label').textContent = 'Biblioteka ćwiczeń';
      countTo(hero, allEx().length);
      const own = Object.keys(state.exercises).length;
      $('hero-sub').innerHTML = `ćwiczeń${own ? ` · <b>${own}</b> własnych` : ''}`;
    } else {
      const span = spanWorkouts();
      $('top-label').textContent = `Ostatnie ${pWeeks === 8 ? '8 tygodni' : pWeeks === 26 ? '6 miesięcy' : '12 miesięcy'}`;
      countTo(hero, span.length);
      $('hero-sub').innerHTML = `treningów · średnio <b>${nf(span.length / pWeeks, 1)}</b> / tydz.`;
    }
    updateStartBtn();
    if (view === 'workout') a ? renderLogger() : renderHome();
    else if (view === 'history') renderHistory();
    else if (view === 'routines') renderRoutines();
    else if (view === 'exercises') renderExercises();
    else renderProgress();
    animList = false; hello = false;
  }
  function drawHeroSub() {
    const a = state.active; if (!a || view !== 'workout') return;
    const s = wStats(a, true);
    $('hero-sub').innerHTML = a.edit ? `serii · <b>${fmtVol(s.vol)}</b> ${U()}` : `<b>${s.sets}</b> ${s.sets === 1 ? 'seria' : 'serii'} · <b>${fmtVol(s.vol)}</b> ${U()}`;
    const ls = $('l-stats'); if (ls) ls.innerHTML = `<span><b>${s.sets}</b> serii</span><span><b>${fmtVol(s.vol)}</b> ${U()}</span><span><b>${a.ex.length}</b> ćw.</span>`;
  }
  const elapsed = () => state.active ? fmtSec((Date.now() - state.active.start) / 1000) : '0:00';
  function updateStartBtn() {
    const a = state.active;
    $('start-label').textContent = a ? (a.edit ? 'Edycja treningu' : `Trening · ${elapsed()}`) : 'Start treningu';
    $('start-btn').classList.toggle('live', !!a);
  }

  /* ----- Trening: ekran startowy ----- */
  function wRow(w, i, opts = {}) {
    const s = wStats(w), d = new Date(w.start), names = w.ex.slice(0, 3).map(e => exOf(e).name).join(', ') + (w.ex.length > 3 ? ` +${w.ex.length - 3}` : '');
    return `<button class="meal wrow" data-w="${w.id}" style="--i:${i}"><span class="dt${key(d) === todayKey() ? ' t' : ''}"><b>${d.getDate()}</b><small>${DAYS[dow(d)]}</small></span><span class="nt"><b>${esc(w.name)}${w.prs?.length ? ` <i class="prb">${w.prs.length} PR</i>` : ''}</b><small>${opts.date ? shortDate(w.start) + ' · ' : ''}${fmtDur(s.ms)} · ${s.sets} serii · ${esc(names)}</small></span><span class="kc">${fmtVol(s.vol)}<span>${U()}</span></span></button>`;
  }
  function rCard(r, i, compact) {
    const sets = r.ex.reduce((a, e) => a + (+e.n || 0), 0), last = finished().find(w => w.rid === r.id);
    const list = r.ex.slice(0, compact ? 4 : 8).map(e => `<li><em>${e.n} ×${esc(e.reps ? ' ' + e.reps : '')}</em>${esc(exOf(e).name)}</li>`).join('') + (r.ex.length > (compact ? 4 : 8) ? `<li class="more-ex">i ${r.ex.length - (compact ? 4 : 8)} więcej…</li>` : '');
    return `<article class="rcard" style="--i:${i}"><header><div><h3>${esc(r.name)}</h3><small>${r.ex.length} ćw. · ${sets} serii${last ? ' · ostatnio ' + ago(last.start) : ''}</small></div>${compact ? '' : `<button class="icon sm" data-redit="${r.id}" aria-label="Edytuj plan">${DOTS}</button>`}</header><ul>${list || '<li class="more-ex">Brak ćwiczeń</li>'}</ul><button class="go" data-rstart="${r.id}">${PLAY}<span>Start</span></button></article>`;
  }
  const routinesSorted = () => Object.values(state.routines).sort((a, b) => (a.order ?? a.created ?? 0) - (b.order ?? b.created ?? 0));
  let prevRing = null;
  function renderHome() {
    const el = $('view-workout'), g = state.settings.weekGoal, wk = weekSum(0), pw = weekSum(-1);
    const p = g ? wk.n / g : 0, lv = waterLevel(Math.min(1, p)), ws = weekStart(new Date()), t = todayKey();
    const strip = DAYS.map((dn, i) => { const d = addDays(ws, i), k = key(d), n = finished().filter(w => key(new Date(w.start)) === k).length; return `<span class="wd${n ? ' on' : ''}${k === t ? ' t' : ''}${k > t ? ' fut' : ''}"><i>${n ? CHECK : ''}</i><small>${dn}</small></span>`; }).join('');
    const row = (cls, label, cur, prev, fmt) => { const mx = Math.max(cur, prev, 1); return `<div class="mac ${cls}${cur >= prev && cur ? ' hit' : ''}"><span><i></i>${label}</span><b><em>${fmt(cur)}</em> · tydz. temu ${fmt(prev)}</b><div class="tube"><i style="width:${cur / mx * 100}%"></i></div></div>`; };
    const ring = `<div class="ring${p >= 1 ? ' full' : ''}" style="--lv:${lv}"><i class="wv"></i><i class="wv b"></i><div class="ring-t"><small>ten tydzień</small><b data-cnt="ring-n">${wk.n}</b><small>z ${g} treningów</small><em>${Math.round(p * 100)}%</em></div></div>`;
    const rs = routinesSorted(), recent = finished().slice(0, 4);
    let right = `<div class="mgrp"><h3>Szybki start</h3></div><button class="emptyw" data-start-empty style="--i:0"><span class="pl">${PLUS}</span><span><b>Pusty trening</b><small>dodawaj ćwiczenia na bieżąco</small></span></button>`;
    if (rs.length) right += `<div class="rgrid home">${rs.slice(0, 4).map((r, i) => rCard(r, i + 1, true)).join('')}</div>${rs.length > 4 ? `<button class="allweek" data-go-view="routines">Wszystkie plany (${rs.length})</button>` : ''}`;
    else right += `<div class="break-card empty-day" style="--i:1"><div class="bk-sea" aria-hidden="true">${SEA_SVG}<i class="bk-boat">${BOAT}</i></div><div class="bk-txt"><b>${finished().length ? 'Zapisz swój plan' : 'Pierwszy trening przed Tobą'}</b><small>Ułóż plan albo weź gotowy podział: Push/Pull/Legs, Góra/Dół, FBW, 5×5.</small></div><div class="bk-act"><button class="primary" data-templates>Gotowe plany</button><button class="allweek" data-rnew>Nowy plan</button></div></div>`;
    if (recent.length) right += `<div class="mgrp"><h3>Ostatnie treningi</h3><button data-go-view="history" aria-label="Historia">›</button></div>${recent.map((w, i) => wRow(w, i + 3, { date: true })).join('')}`;
    el.innerHTML = `<div class="dgrid"><div class="panel">${ring}<div class="wstrip">${strip}</div><div class="macros">${row('p', 'Serie', wk.sets, pw.sets, v => r0(v))}${row('f', 'Objętość', wk.vol, pw.vol, v => fmtK(v * uf()) + ' ' + U())}${row('c', 'Czas', wk.ms, pw.ms, v => nf(v / 36e5, 1) + ' h')}</div><button class="allweek wbody" data-body>Masa ciała${bodyLast() ? ` · <b>${fmtW(bodyLast()[1])} ${U()}</b>` : ''}</button></div>
      <div class="mlist${hello ? ' hello' : animList ? ' enter' : ''}">${right}</div></div>`;
    const ringEl = el.querySelector('.ring');
    if (!calm() && prevRing !== lv) {
      const top = l => `calc(4% + ${(100 - l) * .96}%)`, from = prevRing ?? 0;
      ringEl.querySelectorAll('.wv').forEach(w => w.animate({ top: [top(from), top(lv)] }, { duration: 1300, easing: 'cubic-bezier(.3,.7,.3,1)' }));
      el.querySelectorAll('.tube i').forEach((bar, j) => { const w = bar.style.width; bar.style.transition = 'none'; bar.style.width = '0'; requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = ''; bar.style.transitionDelay = (150 + j * 120) + 'ms'; bar.style.width = w; })); });
    }
    prevRing = lv;
  }

  /* ----- Trening: zapis serii (jak w RepCount) ----- */
  const setLabel = (sets, i) => { const s = sets[i]; if (s.t === 'w') return 'R'; if (s.t === 'd') return 'D'; if (s.t === 'f') return 'U'; return String(sets.slice(0, i + 1).filter(x => x.t !== 'w').length); };
  const restOf = e => e.rest ?? state.settings.rest;
  function renderLogger() {
    const el = $('view-workout'), a = state.active, sy = window.scrollY;
    const head = a.edit
      ? `<div class="lhead panel"><div class="field"><label for="l-name">Nazwa</label><input id="l-name" type="text" maxlength="60" value="${esc(a.name)}" autocomplete="off"></div>
        <div class="row3"><div class="field"><label for="l-date">Dzień</label><input id="l-date" type="date" value="${key(new Date(a.start))}"></div><div class="field"><label for="l-time">Start</label><input id="l-time" type="time" value="${hhmm(a.start)}"></div><div class="field"><label for="l-dur">Minut</label><input id="l-dur" type="number" inputmode="numeric" min="1" value="${Math.max(1, Math.round((a.end - a.start) / 60000))}"></div></div>
        <div class="lstats" id="l-stats"></div><div class="lact"><button class="primary acc" id="l-finish">Zapisz zmiany</button><button class="allweek" id="l-cancel">Anuluj</button></div></div>`
      : `<div class="lhead panel"><input id="l-name" class="lname" type="text" maxlength="60" value="${esc(a.name)}" aria-label="Nazwa treningu" autocomplete="off"><div class="lmeta"><span class="clock-ic"><i></i></span><b data-el>${elapsed()}</b><small>· start ${hhmm(a.start)}</small></div><div class="lstats" id="l-stats"></div><div class="lact"><button class="primary acc" id="l-finish">Zakończ trening</button></div></div>`;
    let body = '', i = 0;
    while (i < a.ex.length) {
      const sup = a.ex[i].sup;
      if (sup) {
        let j = i; const grp = [];
        while (j < a.ex.length && a.ex[j].sup === sup) grp.push(exCard(a.ex[j], j++));
        if (grp.length > 1) { body += `<div class="ss"><div class="ss-l">Superseria</div>${grp.join('')}</div>`; i = j; continue; }
      }
      body += exCard(a.ex[i], i); i++;
    }
    if (!a.ex.length) body = `<div class="break-card empty-day"><div class="bk-sea" aria-hidden="true">${SEA_SVG}<i class="bk-boat">${BOAT}</i></div><div class="bk-txt"><b>Pusty trening</b><small>Dodaj pierwsze ćwiczenie — ciężary z ostatniego razu wpiszą się same.</small></div></div>`;
    el.innerHTML = `<div class="logger">${head}<div class="exlist${animList || hello ? ' enter' : ''}">${body}</div><button class="addex" data-addex>${PLUS}<span>Dodaj ćwiczenie</span></button>
      <div class="field lnote"><label for="l-note">Notatka do treningu</label><textarea id="l-note" rows="2" maxlength="600" placeholder="np. samopoczucie, sen, ból barku">${esc(a.note || '')}</textarea></div>
      ${a.edit ? '' : '<button class="danger lcancel" id="l-cancel">Odrzuć trening</button>'}</div>`;
    if (!animList && Math.abs(window.scrollY - sy) > 1) window.scrollTo({ top: sy, behavior: 'instant' }); // odhaczenie serii nie przewija strony
    drawHeroSub();
  }
  function exCard(e, xi) {
    const x = exOf(e), k = x.kind, cols = colsOf(k), prev = lastSets(e.eid, state.active.edit) || [];
    const rest = restOf(e), b = bests(e.eid, state.active.edit, state.active.start);
    const rows = e.sets.map((s, si) => {
      const pv = prev[si];
      const ph = f => pv && pv[f] != null ? inVal(pv, f, k) : s.ph && ((f === 'r' && k !== 'time') || (f === 's' && k === 'time')) ? s.ph : '';
      return `<div class="srow${s.done ? ' done' : ''}${s.t !== 'n' ? ' t-' + s.t : ''}${s.pr ? ' pr' : ''}" data-x="${xi}" data-s="${si}"><button class="stype" data-stype aria-label="Rodzaj serii">${setLabel(e.sets, si)}</button><button class="prev" data-prev ${pv ? '' : 'disabled'}>${pv ? esc(fmtSet(pv, k)) : '—'}</button>${cols.map(([f, l]) => `<input data-f="${f}" type="text" inputmode="decimal" enterkeyhint="next" value="${inVal(s, f, k)}" placeholder="${esc(ph(f))}" aria-label="${l}" autocomplete="off">`).join('')}<button class="chk" data-chk aria-pressed="${!!s.done}" aria-label="Seria zrobiona">${CHECK}</button>${s.pr ? '<i class="prb">PR</i>' : ''}</div>`;
    }).join('');
    const info = [muscleName(x.muscle)];
    if (rest && k !== 'cardio') info.push(`przerwa ${fmtSec(rest)}`);
    if (b.e1rm && k === 'wr') info.push(`rekord 1RM ~${fmtRM(b.e1rm)} ${U()}`);
    return `<article class="exc" data-x="${xi}" style="--i:${xi}"><header><button class="exn" data-exinfo="${e.eid}"><b>${esc(x.name)}</b><small>${info.join(' · ')}</small></button><button class="icon sm" data-exmenu="${xi}" aria-label="Opcje ćwiczenia">${DOTS}</button></header>${e.note ? `<p class="exnote">${esc(e.note)}</p>` : ''}
      <div class="sets n${cols.length}"><div class="sh"><span>Seria</span><span>Poprzednio</span>${cols.map(c => `<span>${c[1]}</span>`).join('')}<span>${CHECK}</span></div>${rows}</div>
      <button class="addset" data-addset="${xi}">${PLUS}<span>Seria</span></button></article>`;
  }
  // nowe ćwiczenie w treningu: serie i ciężary z ostatniego razu (jak w RepCount)
  function newEntry(eid, n, reps, sup) {
    const last = lastSets(eid, state.active?.edit), ph = reps ? String(reps).replace(/\s*s$/, '') : '';
    let sets;
    if (last && !n) sets = last.map(s => ({ t: s.t || 'n', kg: s.kg ?? null, r: s.r ?? null, s: s.s ?? null, km: s.km ?? null, kcal: s.kcal ?? null }));
    else {
      const warm = last ? last.filter(s => s.t === 'w').map(s => ({ ...s, done: false, pr: 0 })) : [];
      const lw = last ? work(last) : [];
      const cnt = n || 3;
      sets = [...warm.map(s => ({ t: 'w', kg: s.kg ?? null, r: s.r ?? null, s: s.s ?? null, km: null, kcal: null }))];
      for (let i = 0; i < cnt; i++) { const p = lw[i] || lw[lw.length - 1]; sets.push(p ? { t: p.t === 'w' ? 'n' : p.t, kg: p.kg ?? null, r: p.r ?? null, s: p.s ?? null, km: p.km ?? null, kcal: p.kcal ?? null } : { t: 'n', kg: null, r: null, s: null, km: null, kcal: null }); }
    }
    sets.forEach(s => { s.done = false; if (ph) s.ph = ph; });
    return { eid, note: '', sup: sup || null, sets };
  }
  function startWorkout(opts = {}) {
    if (state.active) {
      overlay.innerHTML = sheet('Trening już trwa', esc(state.active.name), `<p class="hint">Najpierw zakończ albo odrzuć obecny trening.</p><div class="confirm"><button class="yes acc" id="go-active">Wróć do treningu</button><button id="drop-active">Odrzuć i zacznij nowy</button></div>`);
      $('go-active').addEventListener('click', () => { close(); setView('workout'); });
      $('drop-active').addEventListener('click', () => { state.active = null; stopRest(); close(); startWorkout(opts); });
      return;
    }
    const now = Date.now();
    state.active = { id: uid('w'), name: opts.name || defaultName(now), rid: opts.rid || null, start: now, note: '', ex: [] };
    (opts.ex || []).forEach(e => state.active.ex.push(e.sets ? { eid: e.eid, note: '', sup: e.sup || null, sets: e.sets.map(s => ({ ...s, done: false, pr: 0 })) } : newEntry(e.eid, e.n, e.reps, e.sup)));
    save(); close(); animList = true; view = 'workout'; try { localStorage.setItem('ggym.view', view); } catch (_) { }
    render(); window.scrollTo({ top: 0 });
    if (!opts.ex?.length && !calm()) setTimeout(() => openPicker('workout'), 250);
  }
  const startRoutine = id => { const r = state.routines[id]; if (r) startWorkout({ name: r.name, rid: r.id, ex: r.ex }); };
  function checkSet(xi, si, rowEl) {
    const a = state.active, e = a.ex[xi], s = e?.sets[si]; if (!s) return;
    const k = exOf(e).kind;
    if (s.done) { s.done = false; s.pr = 0; save(); render(); return; }
    // puste pola: z poprzedniego razu albo z planu
    const pv = (lastSets(e.eid, a.edit) || [])[si];
    colsOf(k).forEach(([f]) => { if (s[f] == null || s[f] === '') { if (pv && pv[f] != null) s[f] = pv[f]; else if ((f === 'r' && k !== 'time') || (f === 's' && k === 'time')) s[f] = parseInt(s.ph, 10) || null; } });
    if (!valid(s, k)) { const noKg = k === 'wr' && s.kg == null && s.r > 0; toast(k === 'cardio' ? 'Wpisz czas, dystans albo kcal' : k === 'time' ? 'Wpisz czas w sekundach' : noKg ? 'Wpisz ciężar' : 'Wpisz liczbę powtórzeń'); rowEl?.querySelector(k === 'cardio' ? 'input' : `[data-f="${k === 'time' ? 's' : noKg ? 'kg' : 'r'}"]`)?.focus(); return; }
    s.done = true;
    const t = prOf(s, k, bests(e.eid, a.edit, a.start));
    s.pr = t ? 1 : 0;
    save(); userAct = true; justSet = `${xi}:${si}`; render();
    navigator.vibrate?.(12);
    const row = document.querySelector(`.srow[data-x="${xi}"][data-s="${si}"]`);
    if (row) bubbles(row.querySelector('.chk'), t ? 16 : 7);
    if (t) { toast(`Nowy rekord (${PR_NAME[t]}): ${exOf(e).name} · ${fmtSet(s, k, true)}`); if (row) setTimeout(() => ripple(row.getBoundingClientRect().right - 30, row.getBoundingClientRect().top + 20, 1.6), 100); }
    // przerwa: w superserii dopiero po ostatnim ćwiczeniu z grupy
    const next = a.ex[xi + 1], inSup = e.sup && next && next.sup === e.sup;
    if (!a.edit && !inSup && k !== 'cardio' && restOf(e) > 0) startRest(restOf(e));
  }
  let justSet = null;
  function setMenu(xi, si) {
    const e = state.active.ex[xi], s = e.sets[si];
    const opt = (t, l, d) => `<button class="nav-item${s.t === t ? ' on' : ''}" data-st="${t}"><b>${l}</b><small>${d}</small></button>`;
    overlay.innerHTML = sheet(`Seria ${setLabel(e.sets, si)}`, esc(exOf(e).name), `<nav class="navmenu stypes">${opt('n', 'Normalna', 'liczy się do objętości i rekordów')}${opt('w', 'R · Rozgrzewkowa', 'bez objętości i rekordów')}${opt('d', 'D · Drop set', 'zaraz po poprzedniej, lżej')}${opt('f', 'U · Do upadku', 'do upadku mięśniowego')}<button class="nav-item out" data-sdel>Usuń serię</button></nav>`, 'Rodzaj serii');
    overlay.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { s.t = b.dataset.st; if (s.t === 'w') s.pr = 0; save(); close(); render(); }));
    overlay.querySelector('[data-sdel]').addEventListener('click', () => { e.sets.splice(si, 1); save(); close(); render(); });
  }
  function exMenu(xi) {
    const a = state.active, e = a.ex[xi], x = exOf(e), next = a.ex[xi + 1];
    const rests = [0, 30, 60, 90, 120, 150, 180, 240, 300];
    overlay.innerHTML = sheet(esc(x.name), muscleName(x.muscle), `
      <div class="field"><label for="e-note">Notatka</label><input id="e-note" type="text" maxlength="160" value="${esc(e.note || '')}" placeholder="np. ustawienie siedzenia 4, chwyt szeroki" autocomplete="off"></div>
      ${x.kind !== 'cardio' ? `<div class="field"><span class="lab">Przerwa po serii</span><div class="chips rchips">${rests.map(r => `<button class="${restOf(e) === r ? 'on' : ''}" data-rest-sec="${r}">${r ? fmtSec(r) : 'brak'}</button>`).join('')}</div></div>` : ''}
      <nav class="navmenu">
        ${next ? `<button class="nav-item" data-m="sup">${e.sup && next.sup === e.sup ? 'Rozłącz superserię z następnym' : 'Superseria z następnym ćwiczeniem'}</button>` : ''}
        ${e.sup && !(next && next.sup === e.sup) ? '<button class="nav-item" data-m="unsup">Wyjmij z superserii</button>' : ''}
        <button class="nav-item" data-m="info">Historia i rekordy</button>
        <button class="nav-item" data-m="swap">Zamień ćwiczenie</button>
        ${xi > 0 ? '<button class="nav-item" data-m="up">Przesuń wyżej</button>' : ''}
        ${next ? '<button class="nav-item" data-m="down">Przesuń niżej</button>' : ''}
        <button class="nav-item out" data-m="del">Usuń ćwiczenie</button>
      </nav>`, 'Opcje ćwiczenia');
    $('e-note').addEventListener('input', ev => { e.note = ev.target.value; save(); });
    overlay.querySelectorAll('[data-rest-sec]').forEach(b => b.addEventListener('click', () => { e.rest = +b.dataset.restSec; save(); overlay.querySelectorAll('[data-rest-sec]').forEach(x => x.classList.toggle('on', x === b)); render(); }));
    overlay.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.m;
      if (m === 'sup') { if (e.sup && next.sup === e.sup) { next.sup = null; tidySup(); } else { const id = e.sup || next.sup || uid('s'); e.sup = id; next.sup = id; } }
      if (m === 'unsup') { e.sup = null; tidySup(); }
      if (m === 'up' || m === 'down') { const j = m === 'up' ? xi - 1 : xi + 1;[a.ex[xi], a.ex[j]] = [a.ex[j], a.ex[xi]]; tidySup(); }
      if (m === 'del') { a.ex.splice(xi, 1); tidySup(); }
      if (m === 'info') { openExercise(e.eid); return; }
      if (m === 'swap') { openPicker('swap', ids => { a.ex[xi] = { ...newEntry(ids[0]), sup: e.sup, rest: e.rest }; save(); close(); render(); }); return; }
      save(); close(); render();
    }));
  }
  // superseria musi mieć co najmniej 2 sąsiadujące ćwiczenia
  function tidySup(list = state.active.ex) {
    list.forEach((e, i) => { if (e.sup && list[i - 1]?.sup !== e.sup && list[i + 1]?.sup !== e.sup) e.sup = null; });
  }
  function finishAsk() {
    const a = state.active; if (!a) return;
    if (a.edit) { finish(false); return; }
    let done = 0, pend = 0;
    a.ex.forEach(e => { const k = exOf(e).kind; e.sets.forEach(s => { if (s.done) done++; else if (valid(s, k)) pend++; }); });
    if (!done && !pend) {
      overlay.innerHTML = sheet('Brak zrobionych serii', 'Odhacz ✓ serie, które zrobiłeś', `<div class="confirm"><button data-close>Wróć</button><button class="yes" id="w-drop">Odrzuć trening</button></div>`);
      $('w-drop').addEventListener('click', () => { state.active = null; stopRest(); save(); close(); render(); toast('Trening odrzucony'); });
      return;
    }
    overlay.innerHTML = sheet('Zakończyć trening?', `${elapsed()} · ${done} ${done === 1 ? 'seria' : 'serii'}`, `${pend ? `<p class="hint">${pend} ${pend === 1 ? 'seria nie jest odhaczona' : 'serii nie jest odhaczonych'} — ${done ? 'zostaną pominięte' : 'odhacz je albo zalicz wszystkie'}.</p>` : ''}
      <div class="confirm"><button data-close>Wróć</button><button class="yes acc" id="w-fin" ${done ? '' : 'disabled'}>Zakończ</button></div>${pend ? '<button class="linkish" id="w-all">Zalicz wszystkie wpisane i zakończ</button>' : ''}`);
    $('w-fin').addEventListener('click', () => finish(false));
    $('w-all')?.addEventListener('click', () => finish(true));
  }
  function finish(all) {
    const a = state.active; if (!a) return;
    if (a.edit) {
      const d = $('l-date')?.value, t = $('l-time')?.value, m = num($('l-dur')?.value);
      if (d && t) { const st = new Date(`${d}T${t}`).getTime(); if (isFinite(st)) { a.start = st; } }
      a.end = a.start + Math.max(1, m || Math.round((a.end - a.start) / 60000)) * 60000;
    }
    const ex = a.ex.map(e => { const k = exOf(e).kind; return { eid: e.eid, n: exOf(e).name, note: (e.note || '').trim(), sup: e.sup || null, sets: e.sets.filter(s => s.done || (all && valid(s, k))).map(s => { const o = { t: s.t || 'n' }; ['kg', 'r', 's', 'km', 'kcal'].forEach(f => { if (s[f] != null && s[f] !== '') o[f] = s[f]; }); return o; }) }; }).filter(e => e.sets.length);
    tidySup(ex);
    if (!ex.length) { toast('Brak serii do zapisania'); return; }
    const w = { id: a.edit || a.id, name: (a.name || '').trim() || defaultName(a.start), rid: a.rid || null, start: a.start, end: a.edit ? a.end : Date.now(), note: (a.note || '').trim(), ex };
    w.prs = computePRs(w);
    const before = weekWorkouts(0).length, wasEdit = !!a.edit;
    state.workouts[w.id] = w; state.active = null; stopRest(); save();
    // późniejsze treningi mogły stracić/zyskać rekordy po edycji
    if (wasEdit) { finished().filter(x => x.start > w.start).reverse().forEach(x => { x.prs = computePRs(x); }); save(); }
    close(); animList = true;
    if (wasEdit) { render(); toast('Zapisano zmiany'); openWorkout(w.id); return; }
    render(); window.scrollTo({ top: 0 });
    summary(w, before);
  }
  function summary(w, before) {
    const s = wStats(w), g = state.settings.weekGoal, after = weekWorkouts(0).length, r = w.rid && state.routines[w.rid];
    const diff = r && (r.ex.length !== w.ex.length || r.ex.some((e, i) => e.eid !== w.ex[i].eid || +e.n !== work(w.ex[i].sets).length));
    overlay.innerHTML = sheet('Trening zakończony', esc(w.name), `
      <div class="tot sum4"><div><b>${fmtDur(s.ms).replace(' min', '')}</b><small>${s.ms >= 36e5 ? 'h min' : 'min'}</small></div><div class="p"><b>${fmtVol(s.vol)}</b><small>${U()}</small></div><div class="c"><b>${s.sets}</b><small>serii</small></div><div class="f"><b>${w.prs.length}</b><small>rekordy</small></div></div>
      ${w.prs.length ? `<ul class="prlist">${w.prs.map(p => `<li><i class="prb">PR</i><span>${esc(exAny(p.eid).name)}</span><b>${PR_NAME[p.t]}: ${prLabel(p)}</b></li>`).join('')}</ul>` : ''}
      ${before < g && after >= g ? `<div class="ai-note"><b>Cel tygodnia osiągnięty:</b> ${after} z ${g} treningów.</div>` : `<p class="hint">To ${after}. trening w tym tygodniu (cel: ${g}).</p>`}
      ${diff ? `<button class="allweek" id="upd-r" style="align-self:center">Zaktualizuj plan „${esc(r.name)}”</button>` : ''}
      <button class="primary" data-close>Gotowe</button>`, 'Podsumowanie treningu');
    $('upd-r')?.addEventListener('click', () => { r.ex = w.ex.map(e => ({ eid: e.eid, n: work(e.sets).length || e.sets.length, reps: r.ex.find(x => x.eid === e.eid)?.reps || String(work(e.sets)[0]?.r || ''), sup: e.sup || null })); save(); toast('Plan zaktualizowany'); $('upd-r').remove(); });
    celebrate(before < g && after >= g, w.prs.length);
  }
  function cancelAsk() {
    const a = state.active; if (!a) return;
    if (a.edit) { state.active = null; save(); const id = a.edit; render(); openWorkout(id); return; }
    overlay.innerHTML = sheet('Odrzucić trening?', 'Serie z tego treningu nie zostaną zapisane', `<div class="confirm"><button data-close>Nie</button><button class="yes" id="c-yes">Odrzuć</button></div>`);
    $('c-yes').addEventListener('click', () => { state.active = null; stopRest(); save(); close(); render(); toast('Trening odrzucony'); });
  }

  /* ----- Historia ----- */
  function renderHistory() {
    const el = $('view-history'), q = norm(hQuery.trim());
    const all = finished().filter(w => !q || norm(w.name).includes(q) || w.ex.some(e => norm(exOf(e).name).includes(q)));
    const byMonth = new Map();
    all.forEach(w => { const d = new Date(w.start), m = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m).push(w); });
    let i = 0, html = '', shownN = 0;
    for (const [m, ws] of byMonth) {
      if (shownN >= hLimit) break;
      const [y, mo] = m.split('-').map(Number), vol = ws.reduce((a, w) => a + wStats(w).vol, 0);
      html += `<div class="hday" style="--i:${i++}"><h3>${MONTHS[mo - 1]} ${y !== new Date().getFullYear() ? y : ''}</h3><b>${ws.length} ${ws.length === 1 ? 'trening' : ws.length < 5 ? 'treningi' : 'treningów'} · ${fmtVol(vol)} ${U()}</b></div>`;
      const take = ws.slice(0, hLimit - shownN); shownN += take.length;
      html += take.map(w => wRow(w, i++)).join('');
    }
    if (!all.length) html = q ? '<p class="empty">Nic nie pasuje do wyszukiwania</p>' : `<div class="break-card empty-day"><div class="bk-sea" aria-hidden="true">${SEA_SVG}<i class="bk-boat">${BOAT}</i></div><div class="bk-txt"><b>Jeszcze żadnego treningu</b><small>Zakończone treningi pojawią się tutaj.</small></div><button class="primary" data-start-empty>Zacznij trening</button></div>`;
    if (all.length > hLimit) html += `<button class="allweek more" data-more>Pokaż starsze</button>`;
    if (!el.querySelector('#h-q')) el.innerHTML = `<div class="hbar"><label class="hsearch">${SEARCH}<input id="h-q" type="search" placeholder="Szukaj treningu lub ćwiczenia" autocomplete="off"></label></div><div class="hlist mlist"></div>`;
    const list = el.querySelector('.hlist');
    list.className = 'hlist mlist' + (animList ? ' enter' : '');
    list.innerHTML = html;
  }
  function openWorkout(id) {
    const w = state.workouts[id]; if (!w) return;
    const s = wStats(w);
    let body = '', i = 0;
    while (i < w.ex.length) {
      const e = w.ex[i], grp = [e];
      if (e.sup) while (w.ex[i + grp.length]?.sup === e.sup) grp.push(w.ex[i + grp.length]);
      const block = grp.map(e => { const x = exOf(e); return `<section class="wde"><h4><button data-exinfo="${e.eid}">${esc(x.name)}</button><small>${muscleName(x.muscle)}</small></h4>${e.note ? `<p class="exnote">${esc(e.note)}</p>` : ''}<ol>${e.sets.map((st, si) => `<li class="t-${st.t || 'n'}"><span class="sl">${setLabel(e.sets, si)}</span><b>${fmtSet(st, x.kind, true)}</b>${x.kind === 'wr' && st.t !== 'w' && st.r > 1 && st.kg ? `<small>1RM ~${fmtRM(e1rm(st.kg, st.r))}</small>` : ''}${st.pr ? '<i class="prb">PR</i>' : ''}</li>`).join('')}</ol></section>`; }).join('');
      body += grp.length > 1 ? `<div class="ss"><div class="ss-l">Superseria</div>${block}</div>` : block;
      i += grp.length;
    }
    overlay.innerHTML = sheet(esc(w.name), `${dateLabel(key(new Date(w.start)))} · ${hhmm(w.start)}–${hhmm(w.end)}`, `
      <div class="tot sum4"><div><b>${r0((w.end - w.start) / 60000)}</b><small>min</small></div><div class="p"><b>${fmtVol(s.vol)}</b><small>${U()}</small></div><div class="c"><b>${s.sets}</b><small>serii</small></div><div class="f"><b>${w.prs?.length || 0}</b><small>rekordy</small></div></div>
      ${w.note ? `<div class="ai-note">${esc(w.note)}</div>` : ''}
      <div class="wdex">${body}</div>
      <div class="wfoot"><button class="primary acc" id="w-repeat">${AGAIN}<span>Powtórz trening</span></button><div class="wf2"><button class="allweek" id="w-asr">Zapisz jako plan</button><button class="allweek" id="w-edit">Edytuj</button><button class="danger" id="w-del">Usuń</button></div></div>`, 'Trening', 'wide');
    $('w-repeat').addEventListener('click', () => startWorkout({ name: w.name, rid: w.rid, ex: w.ex.map(e => ({ eid: e.eid, sup: e.sup, sets: lastSets(e.eid) || e.sets })) }));
    $('w-asr').addEventListener('click', () => { const r = { id: uid('r'), name: w.name, created: Date.now(), note: '', ex: w.ex.map(e => ({ eid: e.eid, n: work(e.sets).length || e.sets.length, reps: String(work(e.sets)[0]?.r || ''), sup: e.sup || null })) }; state.routines[r.id] = r; save(); close(); toast(`Zapisano plan „${r.name}”`); setView('routines'); });
    $('w-edit').addEventListener('click', () => {
      if (state.active) { toast('Najpierw zakończ trwający trening'); return; }
      state.active = { ...deep(w), edit: w.id }; state.active.ex.forEach(e => e.sets.forEach(s => { s.done = true; }));
      save(); close(); animList = true; setView('workout'); window.scrollTo({ top: 0 });
    });
    $('w-del').addEventListener('click', () => {
      overlay.innerHTML = sheet('Usunąć trening?', esc(w.name), `<div class="confirm"><button data-close>Anuluj</button><button class="yes" id="cd-yes">Usuń</button></div>`);
      $('cd-yes').addEventListener('click', () => {
        close();
        const tile = document.querySelector(`[data-w="${CSS.escape(id)}"]`);
        const go = () => { delete state.workouts[id]; finished().filter(x => x.start > w.start).reverse().forEach(x => { x.prs = computePRs(x); }); save(); render(); toast('Usunięto'); };
        if (!tile || calm()) { go(); return; }
        bubbles(tile, 10);
        tile.animate({ opacity: [1, 0], transform: ['none', 'translateY(24px) scale(.96)'] }, { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = go;
      });
    });
  }

  /* ----- Plany ----- */
  function renderRoutines() {
    const el = $('view-routines'), rs = routinesSorted();
    el.innerHTML = `<div class="sbar"><div class="bk-act"><button class="primary sm" data-rnew>${PLUS}<span>Nowy plan</span></button><button class="allweek" data-templates>Gotowe plany</button></div></div>
      ${rs.length ? `<div class="rgrid${animList ? ' enter' : ''}">${rs.map((r, i) => rCard(r, i)).join('')}</div>` : `<div class="break-card empty-day" style="max-width:560px"><div class="bk-sea" aria-hidden="true">${SEA_SVG}<i class="bk-boat">${BOAT}</i></div><div class="bk-txt"><b>Brak planów</b><small>Plan to lista ćwiczeń z liczbą serii — start treningu jednym kliknięciem, ciężary z ostatniego razu.</small></div></div>`}`;
  }
  let rdraft = null;
  function openRoutine(r) { rdraft = r ? deep(r) : { id: null, name: '', note: '', ex: [] }; drawRoutine(); }
  function drawRoutine() {
    const d = rdraft, editing = !!d.id;
    overlay.innerHTML = sheet(editing ? 'Edytuj plan' : 'Nowy plan', editing ? `${d.ex.length} ćwiczeń` : 'Ćwiczenia, serie i powtórzenia', `
      <div class="field"><label for="r-name">Nazwa</label><input id="r-name" type="text" maxlength="60" value="${esc(d.name)}" placeholder="np. Push, Nogi, FBW A" autocomplete="off"></div>
      <div class="field"><span class="lab">Ćwiczenia</span><div class="rexl" id="r-list">${d.ex.map((e, i) => { const x = exOf(e); return `<div class="rex${e.sup ? ' in-ss' : ''}" data-ri="${i}" style="--i:${i}"><span class="nt"><b>${esc(x.name)}</b><small>${muscleName(x.muscle)}${e.sup ? ' · superseria' : ''}</small></span><div class="stp"><button data-rsets="-1" aria-label="Mniej serii">−</button><b>${e.n}</b><button data-rsets="1" aria-label="Więcej serii">+</button></div><input class="rreps" data-rreps type="text" maxlength="12" value="${esc(e.reps || '')}" placeholder="powt." aria-label="Powtórzenia"><div class="rmv"><button data-rmove="-1" aria-label="Wyżej" ${i ? '' : 'disabled'}>↑</button><button data-rmove="1" aria-label="Niżej" ${i < d.ex.length - 1 ? '' : 'disabled'}>↓</button><button data-rdel aria-label="Usuń">${XMARK}</button></div></div>`; }).join('') || '<p class="hint" style="text-align:left">Dodaj ćwiczenia do planu.</p>'}</div><button type="button" class="addit" id="r-add">+ Ćwiczenie</button></div>
      <div class="field"><label for="r-note">Notatka</label><textarea id="r-note" rows="2" maxlength="300" placeholder="np. progresja +2,5 kg gdy wszystkie serie wejdą">${esc(d.note || '')}</textarea></div>
      <div class="sheet-foot"><button class="primary" id="r-save">${editing ? 'Zapisz' : 'Utwórz plan'}</button>${editing ? '<button class="danger" id="r-del">Usuń</button>' : ''}</div>`, 'Plan', 'wide');
    $('r-name').addEventListener('input', e => { d.name = e.target.value; });
    $('r-note').addEventListener('input', e => { d.note = e.target.value; });
    $('r-add').addEventListener('click', () => openPicker('routine', (ids, ss) => { const sup = ss ? uid('s') : null; ids.forEach(id => d.ex.push({ eid: id, n: 3, reps: exById(id)?.kind === 'time' ? '45 s' : exById(id)?.kind === 'cardio' ? '' : '8–12', sup })); drawRoutine(); }, () => drawRoutine()));
    $('r-save').addEventListener('click', () => {
      d.name = d.name.trim() || 'Plan'; tidySup(d.ex);
      if (!d.ex.length) { toast('Dodaj co najmniej jedno ćwiczenie'); return; }
      const isNew = !d.id; if (isNew) { d.id = uid('r'); d.created = Date.now(); }
      state.routines[d.id] = d; save(); close(); if (view !== 'workout') setView('routines'); else render(); toast(isNew ? `Utworzono plan „${d.name}”` : 'Zapisano');
    });
    $('r-del')?.addEventListener('click', () => {
      overlay.innerHTML = sheet('Usunąć plan?', esc(d.name), `<p class="hint">Treningi zrobione z tego planu zostaną w historii.</p><div class="confirm"><button id="rd-no">Anuluj</button><button class="yes" id="rd-yes">Usuń</button></div>`);
      $('rd-no').addEventListener('click', drawRoutine);
      $('rd-yes').addEventListener('click', () => { delete state.routines[d.id]; save(); close(); render(); toast('Plan usunięty'); });
    });
  }
  function openTemplates() {
    overlay.innerHTML = sheet('Gotowe plany', 'Klasyczne podziały — możesz je potem zmieniać', `<div class="tpls">${TEMPLATES.map(t => `<div class="tpl"><div><b>${t.name}</b><small>${t.desc}</small><p>${t.rs.map(r => r[0]).join(' · ')}</p></div><button class="allweek" data-tpl="${t.id}">${PLUS}<span>Dodaj</span></button></div>`).join('')}</div>`, 'Gotowe plany');
    overlay.querySelectorAll('[data-tpl]').forEach(b => b.addEventListener('click', () => {
      const t = TEMPLATES.find(x => x.id === b.dataset.tpl), base = Date.now();
      t.rs.forEach(([name, ex], i) => { const r = { id: uid('r'), name, note: t.name, created: base + i, ex: ex.map(([eid, n, reps]) => ({ eid, n, reps, sup: null })) }; state.routines[r.id] = r; });
      save(); b.disabled = true; b.innerHTML = `${CHECK}<span>Dodano</span>`; bubbles(b, 8);
      toast(`Dodano: ${t.rs.map(r => r[0]).join(', ')}`); render();
    }));
  }

  /* ----- Ćwiczenia ----- */
  function exUse() {
    const m = new Map();
    finished().forEach(w => w.ex.forEach(e => { const x = m.get(e.eid) || { n: 0, last: 0 }; x.n++; x.last = Math.max(x.last, w.start); m.set(e.eid, x); }));
    return m;
  }
  function exRow(x, i, use, opts = {}) {
    const u = use.get(x.id), ls = u ? lastSets(x.id) : null, best = ls ? work(ls).sort((a, b) => e1rm(b.kg, b.r) - e1rm(a.kg, a.r) || (b.r || 0) - (a.r || 0) || (b.s || 0) - (a.s || 0))[0] : null;
    return `<button class="meal xrow${opts.sel ? ' on' : ''}" ${opts.pick ? `data-pex="${x.id}"` : `data-exinfo="${x.id}"`} style="--i:${i}"><span class="mt m-${x.muscle}">${abbr(x.muscle)}</span><span class="nt"><b>${esc(x.name)}${x.custom ? ' <i class="own">własne</i>' : ''}</b><small>${muscleName(x.muscle)} · ${kindName(x.kind).toLowerCase()}${u ? ` · ${u.n}× · ${ago(u.last)}` : ''}</small></span>${opts.pick ? `<span class="pk">${CHECK}</span>` : `<span class="kc">${best ? esc(fmtSet(best, x.kind)) : ''}<span>${best ? 'ostatnio' : ''}</span></span>`}</button>`;
  }
  function exFiltered(q, mus) {
    q = norm(q.trim());
    return allEx().filter(x => (mus === 'all' || x.muscle === mus) && (!q || norm(x.name).includes(q) || norm(muscleName(x.muscle)).includes(q)));
  }
  function exListHtml(list, use, opts = {}) {
    let i = 0, html = '';
    if (opts.grouped) {
      const recent = [...use.entries()].sort((a, b) => b[1].last - a[1].last).slice(0, 6).map(([id]) => exById(id)).filter(Boolean);
      if (recent.length) html += `<div class="mgrp"><h3>Ostatnio</h3></div>` + recent.map(x => exRow(x, i++, use, { ...opts, sel: opts.sel?.includes(x.id) })).join('');
      MUSCLES.forEach(([m, name]) => { const xs = list.filter(x => x.muscle === m); if (!xs.length) return; html += `<div class="mgrp"><h3>${name}<em>${xs.length}</em></h3></div>` + xs.map(x => exRow(x, i++, use, { ...opts, sel: opts.sel?.includes(x.id) })).join(''); });
    } else html = list.map(x => exRow(x, i++, use, { ...opts, sel: opts.sel?.includes(x.id) })).join('');
    return html || '<p class="empty">Brak ćwiczeń — dodaj własne</p>';
  }
  const musChips = (cur, attr) => `<div class="mchips"><button class="${cur === 'all' ? 'on' : ''}" ${attr}="all">Wszystkie</button>${MUSCLES.map(([m, n]) => `<button class="${cur === m ? 'on' : ''}" ${attr}="${m}">${n}</button>`).join('')}</div>`;
  function renderExercises() {
    const el = $('view-exercises');
    if (!el.querySelector('#x-q')) el.innerHTML = `<div class="hbar"><label class="hsearch">${SEARCH}<input id="x-q" type="search" placeholder="Szukaj ćwiczenia" autocomplete="off"></label><button class="primary sm" data-xnew>${PLUS}<span>Własne</span></button></div><div id="x-mus"></div><div class="hlist mlist" id="x-list"></div>`;
    $('x-mus').innerHTML = musChips(xMus, 'data-xmus');
    const list = $('x-list');
    list.className = 'hlist mlist' + (animList ? ' enter' : '');
    list.innerHTML = exListHtml(exFiltered(xQuery, xMus), exUse(), { grouped: !xQuery.trim() && xMus === 'all' });
  }
  // wybór ćwiczeń: do treningu, do planu albo zamiana
  let pick = null;
  function openPicker(mode, cb, back) {
    pick = { mode, cb: cb || (ids => addToWorkout(ids, false)), back, sel: [], q: '', mus: 'all', ss: null };
    if (mode === 'workout') pick.cb = (ids, ss) => addToWorkout(ids, ss);
    drawPicker();
  }
  function addToWorkout(ids, ss) {
    const a = state.active; if (!a) return;
    const sup = ss ? uid('s') : null;
    ids.forEach(id => a.ex.push(newEntry(id, 0, '', sup)));
    save(); close(); render();
    setTimeout(() => { const c = document.querySelector(`.exc[data-x="${a.ex.length - ids.length}"]`); if (c) { c.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' }); bubbles(c, 8); } }, 60);
  }
  function drawPicker() {
    const p = pick;
    overlay.innerHTML = sheet(p.mode === 'swap' ? 'Zamień ćwiczenie' : 'Dodaj ćwiczenia', p.mode === 'swap' ? 'Wybierz nowe ćwiczenie' : 'Zaznacz jedno lub kilka', `
      <label class="hsearch">${SEARCH}<input id="p-q" type="search" placeholder="Szukaj" value="${esc(p.q)}" autocomplete="off"></label>
      <div id="p-mus">${musChips(p.mus, 'data-pmus')}</div>
      <div class="plist mlist" id="p-list"></div>
      <button class="linkish" id="p-new">+ Nowe własne ćwiczenie</button>
      ${p.mode === 'swap' ? '' : '<div class="pfoot" id="p-foot"></div>'}`, 'Wybór ćwiczeń', 'wide picker');
    drawPickList();
    $('p-q').addEventListener('input', e => { p.q = e.target.value; drawPickList(); });
    $('p-new').addEventListener('click', () => openCustomEx(null, x => { p.sel.push(x.id); p.q = ''; if (p.mode === 'swap') { p.cb([x.id]); return; } drawPicker(); }, () => drawPicker()));
    if (p.back) overlay.querySelector('.sheet-h .x').addEventListener('click', ev => { ev.stopPropagation(); const b = p.back; pick = null; b(); });
  }
  function drawPickList() {
    const p = pick, list = $('p-list'); if (!list) return;
    list.innerHTML = exListHtml(exFiltered(p.q, p.mus), exUse(), { pick: true, sel: p.sel, grouped: !p.q.trim() && p.mus === 'all' });
    drawPickFoot();
  }
  function openCustomEx(x, done, back) {
    const ed = !!x; x = x || { name: '', muscle: 'chest', kind: 'wr' };
    overlay.innerHTML = sheet(ed ? 'Edytuj ćwiczenie' : 'Nowe ćwiczenie', 'Własne ćwiczenie', `
      <div class="field"><label for="c-name">Nazwa</label><input id="c-name" type="text" maxlength="60" value="${esc(x.name)}" placeholder="np. Wyciskanie na maszynie Smitha" autocomplete="off"></div>
      <div class="field"><span class="lab">Partia mięśni</span><div class="seg seg4 musg">${MUSCLES.map(([m, n]) => `<label><input type="radio" name="c-mus" value="${m}"${x.muscle === m ? ' checked' : ''}>${n}</label>`).join('')}</div></div>
      <div class="field"><span class="lab">Co zapisujesz</span><div class="seg seg4">${KINDS.map(([k, n]) => `<label><input type="radio" name="c-kind" value="${k}"${x.kind === k ? ' checked' : ''}>${k === 'wr' ? 'Ciężar' : n}</label>`).join('')}</div></div>
      <div class="sheet-foot"><button class="primary" id="c-save">${ed ? 'Zapisz' : 'Dodaj ćwiczenie'}</button>${ed ? '<button class="danger" id="c-del">Usuń</button>' : ''}</div>`, 'Własne ćwiczenie');
    if (back) overlay.querySelector('.sheet-h .x').addEventListener('click', ev => { ev.stopPropagation(); back(); });
    if (!isMobile()) $('c-name').focus();
    $('c-save').addEventListener('click', () => {
      const name = $('c-name').value.trim(); if (!name) { toast('Wpisz nazwę'); $('c-name').focus(); return; }
      const nx = { id: x.id || uid('e'), name, muscle: overlay.querySelector('[name=c-mus]:checked')?.value || 'full', kind: overlay.querySelector('[name=c-kind]:checked')?.value || 'wr', custom: true };
      state.exercises[nx.id] = nx; save(); toast(ed ? 'Zapisano' : `Dodano „${name}”`);
      if (done) done(nx); else { close(); render(); }
    });
    $('c-del')?.addEventListener('click', () => {
      const used = exUse().get(x.id)?.n || 0;
      overlay.innerHTML = sheet('Usunąć ćwiczenie?', esc(x.name), `${used ? `<p class="hint">Jest w ${used} treningach — tam zostanie pod tą samą nazwą.</p>` : ''}<div class="confirm"><button data-close>Anuluj</button><button class="yes" id="cx-yes">Usuń</button></div>`);
      $('cx-yes').addEventListener('click', () => {
        // nazwa zostaje w zapisanych treningach
        finished().forEach(w => w.ex.forEach(e => { if (e.eid === x.id) e.n = x.name; }));
        delete state.exercises[x.id]; save(); close(); render(); toast('Usunięto');
      });
    });
  }

  /* ----- karta ćwiczenia: wykres, rekordy, historia ----- */
  const METRICS = {
    wr: [['e1rm', 'Szac. 1RM', 'w'], ['top', 'Najcięższy', 'w'], ['vol', 'Objętość', 'w'], ['reps', 'Powtórzenia', ''], ['sets', 'Serie', '']],
    bw: [['maxr', 'Max powt.', ''], ['reps', 'Powtórzenia', ''], ['sets', 'Serie', ''], ['top', 'Obciążenie', 'w']],
    time: [['maxs', 'Najdłużej', 's'], ['tots', 'Łączny czas', 's'], ['sets', 'Serie', '']],
    cardio: [['min', 'Czas', 'min'], ['km', 'Dystans', 'km'], ['kcal', 'Kcal', '']],
  };
  function metricVal(m, sets) {
    const ws = work(sets);
    switch (m) {
      case 'e1rm': return Math.max(0, ...ws.map(s => e1rm(s.kg, s.r)));
      case 'top': return Math.max(0, ...ws.map(s => s.kg || 0));
      case 'vol': return ws.reduce((a, s) => a + (s.kg || 0) * (s.r || 0), 0);
      case 'reps': return ws.reduce((a, s) => a + (s.r || 0), 0);
      case 'sets': return ws.length;
      case 'maxr': return Math.max(0, ...ws.map(s => s.r || 0));
      case 'maxs': return Math.max(0, ...ws.map(s => s.s || 0));
      case 'tots': return ws.reduce((a, s) => a + (s.s || 0), 0);
      case 'min': return ws.reduce((a, s) => a + (s.s || 0), 0) / 60;
      case 'km': return ws.reduce((a, s) => a + (s.km || 0), 0);
      case 'kcal': return ws.reduce((a, s) => a + (s.kcal || 0), 0);
    }
    return 0;
  }
  const fmtMetric = (u, v) => u === 'w' ? fmtW(v) : u === 's' ? fmtSec(v) : u === 'km' ? nf(v, 2) : nf(v, 1);
  let xd = null;
  function openExercise(eid, tab) {
    const x = exAny(eid);
    xd = { eid, tab: tab || 'chart', m: METRICS[x.kind][0][0], range: 'all', year: 'all' };
    overlay.innerHTML = sheet(esc(x.name), `${muscleName(x.muscle)} · ${kindName(x.kind).toLowerCase()}`, `
      <div class="smode s3 xtabs"><button data-xt="chart">Wykres</button><button data-xt="rec">Rekordy</button><button data-xt="hist">Historia</button></div>
      <div id="xd-body"></div>
      ${x.custom ? '<div class="wf2"><button class="allweek" id="xd-edit">Edytuj ćwiczenie</button></div>' : ''}`, 'Ćwiczenie', 'wide');
    $('xd-edit')?.addEventListener('click', () => openCustomEx(x, () => openExercise(eid), () => openExercise(eid)));
    overlay.querySelectorAll('[data-xt]').forEach(b => b.addEventListener('click', () => { xd.tab = b.dataset.xt; drawXd(); }));
    drawXd();
  }
  function drawXd() {
    const box = $('xd-body'); if (!box || !xd) return;
    overlay.querySelectorAll('[data-xt]').forEach(b => b.classList.toggle('on', b.dataset.xt === xd.tab));
    const x = exAny(xd.eid), k = x.kind, ss = sessionsOf(xd.eid);
    if (!ss.length) { box.innerHTML = `<div class="break-card empty-day"><div class="bk-sea" aria-hidden="true">${SEA_SVG}<i class="bk-boat">${BOAT}</i></div><div class="bk-txt"><b>Brak danych</b><small>Zrób to ćwiczenie na treningu — tu pojawią się wykresy, rekordy i historia.</small></div></div>`; return; }
    if (xd.tab === 'chart') {
      const ms = METRICS[k], mm = ms.find(z => z[0] === xd.m) || ms[0];
      const from = xd.range === '3m' ? Date.now() - 92 * 864e5 : xd.range === '1y' ? Date.now() - 365 * 864e5 : 0;
      const pts = ss.filter(s => s.w.start >= from).map(s => ({ x: s.w.start, y: metricVal(mm[0], s.sets) * (mm[2] === 'w' ? uf() : 1) }));
      const ys = pts.map(p => p.y), first = ys[0], last = ys[ys.length - 1], best = Math.max(...ys);
      const f = v => mm[2] === 'w' ? nf(v, 1) : mm[2] === 's' ? fmtSec(v) : mm[2] === 'km' ? nf(v, 2) : nf(v, 1), unit = mm[2] === 'w' ? ' ' + U() : mm[2] === 'km' ? ' km' : mm[2] === 'min' ? ' min' : '';
      box.innerHTML = `<div class="chips mets">${ms.map(([id, l]) => `<button class="${id === mm[0] ? 'on' : ''}" data-xm="${id}">${l}</button>`).join('')}</div>
        <div class="chart-box">${chart(pts, f)}</div>
        <div class="smode s3 rng"><button data-xr="3m" class="${xd.range === '3m' ? 'on' : ''}">3 mies.</button><button data-xr="1y" class="${xd.range === '1y' ? 'on' : ''}">Rok</button><button data-xr="all" class="${xd.range === 'all' ? 'on' : ''}">Wszystko</button></div>
        ${pts.length ? `<div class="tot sum3"><div><b>${f(last)}</b><small>ostatnio${unit}</small></div><div class="p"><b>${f(best)}</b><small>najlepiej${unit}</small></div><div class="${last >= first ? 'c' : 'f'}"><b>${pts.length > 1 ? (last >= first ? '+' : '−') + f(Math.abs(last - first)) : '—'}</b><small>zmiana${unit}</small></div></div>` : ''}`;
      box.querySelectorAll('[data-xm]').forEach(b => b.addEventListener('click', () => { xd.m = b.dataset.xm; drawXd(); }));
      box.querySelectorAll('[data-xr]').forEach(b => b.addEventListener('click', () => { xd.range = b.dataset.xr; drawXd(); }));
    } else if (xd.tab === 'rec') {
      const years = [...new Set(ss.map(s => new Date(s.w.start).getFullYear()))].sort((a, b) => b - a);
      const sel = ss.filter(s => xd.year === 'all' || new Date(s.w.start).getFullYear() === +xd.year);
      const all = sel.flatMap(s => work(s.sets).map(st => ({ ...st, at: s.w.start, wid: s.w.id })));
      const top = (fn) => all.reduce((b, s) => fn(s) > (b ? fn(b) : 0) ? s : b, null);
      const tile = (cls, label, s, v) => s ? `<div class="${cls}"><b>${v}</b><small>${label}</small><em>${shortDate(s.at)}</em></div>` : '';
      let tiles = '', table = '';
      if (k === 'wr') {
        const b1 = top(s => e1rm(s.kg, s.r)), bk = top(s => s.kg || 0), bv = sel.reduce((b, s) => { const v = volOf(s.sets, 'wr'); return v > (b?.v || 0) ? { v, at: s.w.start } : b; }, null);
        tiles = tile('p', 'szac. 1RM ' + U(), b1, b1 && fmtRM(e1rm(b1.kg, b1.r))) + tile('c', 'najcięższy ' + U(), bk, bk && `${fmtW(bk.kg)}<small> ×${bk.r}</small>`) + tile('f', 'objętość ' + U(), bv, bv && fmtVol(bv.v));
        const rows = [];
        for (let r = 1; r <= 12; r++) { const b = all.filter(s => (s.r || 0) >= r).reduce((m, s) => (s.kg || 0) > (m?.kg || 0) ? s : m, null); if (b) rows.push(`<tr${b.r === r ? '' : ' class="dim"'}><td>${r}</td><td><b>${fmtW(b.kg)}</b> ${U()}</td><td>${b.r !== r ? `(${b.r} powt.)` : ''}</td><td>${shortDate(b.at)}</td></tr>`); }
        table = rows.length ? `<table class="rtable"><thead><tr><th>Powt.</th><th>Najwięcej</th><th></th><th>Kiedy</th></tr></thead><tbody>${rows.join('')}</tbody></table><p class="hint">Rekord dla N powtórzeń = najcięższy ciężar podniesiony co najmniej N razy. 1RM szacowany wzorem Epleya.</p>` : '';
      } else if (k === 'bw') {
        const br = top(s => s.r || 0), bk = top(s => s.kg || 0), bs = sel.reduce((b, s) => { const v = metricVal('reps', s.sets); return v > (b?.v || 0) ? { v, at: s.w.start } : b; }, null);
        tiles = tile('p', 'max powtórzeń', br, br && br.r) + tile('c', 'max obciążenie ' + U(), bk && bk.kg ? bk : null, bk && `+${fmtW(bk.kg)}`) + tile('f', 'powt. w treningu', bs, bs && bs.v);
      } else if (k === 'time') {
        const bt = top(s => s.s || 0), bk = top(s => s.kg || 0);
        tiles = tile('p', 'najdłużej', bt, bt && fmtSec(bt.s)) + tile('c', 'max obciążenie ' + U(), bk && bk.kg ? bk : null, bk && `+${fmtW(bk.kg)}`);
      } else {
        const bt = top(s => s.s || 0), bd = top(s => s.km || 0), bc = top(s => s.kcal || 0);
        tiles = tile('p', 'najdłużej (min)', bt, bt && r0(bt.s / 60)) + tile('c', 'najdalej (km)', bd && bd.km ? bd : null, bd && nf(bd.km, 2)) + tile('f', 'najwięcej kcal', bc && bc.kcal ? bc : null, bc && r0(bc.kcal));
      }
      box.innerHTML = `${years.length > 1 ? `<div class="chips mets"><button data-xy="all" class="${xd.year === 'all' ? 'on' : ''}">Wszystkie lata</button>${years.map(y => `<button data-xy="${y}" class="${String(xd.year) === String(y) ? 'on' : ''}">${y}</button>`).join('')}</div>` : ''}<div class="tot rec3">${tiles}</div>${table}`;
      box.querySelectorAll('[data-xy]').forEach(b => b.addEventListener('click', () => { xd.year = b.dataset.xy; drawXd(); }));
    } else {
      box.innerHTML = `<div class="xhist">${ss.slice().reverse().slice(0, 60).map(s => `<section class="wde"><h4><button data-w="${s.w.id}">${shortDate(s.w.start)}</button><small>${esc(s.w.name)}</small></h4><ol>${s.sets.map((st, si) => `<li class="t-${st.t || 'n'}"><span class="sl">${setLabel(s.sets, si)}</span><b>${fmtSet(st, k, true)}</b>${k === 'wr' && st.t !== 'w' && st.r > 1 && st.kg ? `<small>1RM ~${fmtRM(e1rm(st.kg, st.r))}</small>` : ''}${st.pr ? '<i class="prb">PR</i>' : ''}</li>`).join('')}</ol></section>`).join('')}</div>`;
    }
  }
  // wykres liniowy z „wodą” pod linią
  let chartN = 0;
  function chart(pts, fmt, opts = {}) {
    if (!pts.length) return '<p class="empty">Brak danych w tym okresie</p>';
    const W = 340, H = opts.h || 160, pl = 6, pr = 6, pt = 16, pb = 22, id = 'cg' + (++chartN);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys), padY = (hi - lo) * .18 || Math.abs(hi) * .1 || 1;
    const y0 = opts.zero ? 0 : Math.max(0, lo - padY), y1 = hi + padY;
    const X = x => x1 === x0 ? W / 2 : pl + (x - x0) / (x1 - x0) * (W - pl - pr), Y = y => pt + (1 - (y - y0) / (y1 - y0 || 1)) * (H - pt - pb);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    const area = `${line} L${X(pts[pts.length - 1].x).toFixed(1)} ${H - pb} L${X(pts[0].x).toFixed(1)} ${H - pb} Z`;
    const grid = [0, .5, 1].map(f => { const v = y0 + (y1 - y0) * f, y = Y(v); return `<line x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="gl"/><text x="2" y="${(y - 4).toFixed(1)}" class="gt">${fmt(v)}</text>`; }).join('');
    const lp = pts[pts.length - 1];
    const dots = pts.length <= 40 ? pts.map((p, i) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${i === pts.length - 1 ? 4 : 2.4}" class="pt${i === pts.length - 1 ? ' last' : ''}" style="--d:${i}"/>`).join('') : `<circle cx="${X(lp.x).toFixed(1)}" cy="${Y(lp.y).toFixed(1)}" r="4" class="pt last"/>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".42"/><stop offset="1" stop-color="var(--sea)" stop-opacity=".03"/></linearGradient></defs>${grid}
      <path d="${area}" fill="url(#${id})" class="ar"/>${pts.length > 1 ? `<path d="${line}" class="ln" pathLength="1"/>` : ''}${dots}
      <text x="${pl}" y="${H - 5}" class="gt">${shortDate(x0)}</text>${x1 !== x0 ? `<text x="${W - pr}" y="${H - 5}" class="gt" text-anchor="end">${shortDate(x1)}</text>` : ''}
      <text x="${Math.min(W - 4, Math.max(30, X(lp.x)))}" y="${Math.max(12, Y(lp.y) - 9).toFixed(1)}" class="lv" text-anchor="${X(lp.x) > W - 40 ? 'end' : 'middle'}">${fmt(lp.y)}</text></svg>`;
  }

  /* ----- Postępy ----- */
  const spanStart = () => addDays(weekStart(new Date()), -(pWeeks - 1) * 7).getTime();
  const spanWorkouts = () => { const a = spanStart(); return finished().filter(w => w.start >= a); };
  function renderProgress() {
    const el = $('view-progress'), g = state.settings.weekGoal, t = todayKey(), ws0 = weekStart(new Date());
    const weeks = []; for (let i = pWeeks - 1; i >= 0; i--) { const a = addDays(ws0, -i * 7), b = addDays(a, 7), list = finished().filter(w => w.start >= a.getTime() && w.start < b.getTime()); weeks.push({ a, list, vol: list.reduce((x, w) => x + wStats(w).vol, 0) }); }
    const m = pWeeks > 8, span = spanWorkouts();
    const lbl = (wk, i) => m ? (wk.a.getDate() <= 7 ? MON_S[wk.a.getMonth()] : '') : `${wk.a.getDate()}.${pad(wk.a.getMonth() + 1)}`;
    const maxN = Math.max(g * 1.25, ...weeks.map(w => w.list.length)) || 1;
    const barsN = weeks.map((w, j) => { const n = w.list.length; return `<div class="sb ${!n ? 'empty' : n >= g ? 'hit' : 'low'}" style="--j:${j}" title="tydzień od ${shortDate(w.a)}: ${n}"><span>${n || ''}</span><i style="height:${n / maxN * 100}%"></i></div>`; }).join('');
    const maxV = Math.max(...weeks.map(w => w.vol)) || 1;
    const barsV = weeks.map((w, j) => `<div class="sb ${w.vol ? 'hit' : 'empty'}" style="--j:${j}" title="tydzień od ${shortDate(w.a)}: ${fmtVol(w.vol)} ${U()}"><span>${w.vol ? fmtK(w.vol * uf()) : ''}</span><i style="height:${w.vol / maxV * 100}%"></i></div>`).join('');
    const days = weeks.map(lbl).map((l, i) => `<span class="${i === weeks.length - 1 ? 't' : ''}">${l}</span>`).join('');
    const durs = span.map(w => w.end - w.start), avgDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
    const totVol = span.reduce((a, w) => a + wStats(w).vol, 0), hit = weeks.filter(w => w.list.length >= g).length;
    // partie mięśni: serie robocze w okresie
    const mus = new Map();
    span.forEach(w => w.ex.forEach(e => { const x = exOf(e); if (x.kind === 'cardio') return; mus.set(x.muscle, (mus.get(x.muscle) || 0) + work(e.sets).length); }));
    const musL = [...mus.entries()].sort((a, b) => b[1] - a[1]), musMax = musL[0]?.[1] || 1;
    const prs = span.flatMap(w => (w.prs || []).map(p => ({ ...p, at: w.start, wid: w.id }))).sort((a, b) => b.at - a.at);
    // masa ciała
    const body = Object.entries(state.body).filter(([, v]) => v).sort((a, b) => a[0].localeCompare(b[0]));
    const bspan = body.filter(([k]) => fromKey(k).getTime() >= spanStart()), bpts = (bspan.length > 1 ? bspan : body.slice(-12)).map(([k, v]) => ({ x: fromKey(k).getTime(), y: v * uf() }));
    const bchg = bpts.length > 1 ? bpts[bpts.length - 1].y - bpts[0].y : 0;
    el.innerHTML = `<div class="sbar"><div class="smode s3"><button data-pw="8" class="${pWeeks === 8 ? 'on' : ''}">8 tyg.</button><button data-pw="26" class="${pWeeks === 26 ? 'on' : ''}">6 mies.</button><button data-pw="52" class="${pWeeks === 52 ? 'on' : ''}">Rok</button></div></div>
      <div class="sgrid">
        <section class="scard${animList ? ' enter' : ''}" style="--i:0"><header><div><h3>Treningi w tygodniu</h3><small>cel <b>${g}</b> · w celu ${hit}/${pWeeks} tyg.</small></div><strong class="${hit >= pWeeks * .7 ? 'good' : hit >= pWeeks * .4 ? 'mid' : 'bad'}">${nf(span.length / pWeeks, 1)}</strong></header>
          <div class="sbars${m ? ' m' : ''}" style="--n:${pWeeks}">${barsN}<div class="starget" style="bottom:${g / maxN * 100}%"><span>${g}</span></div></div><div class="sdays${m ? ' m' : ''}" style="--n:${pWeeks}">${days}</div>
          <div class="schips"><span class="schip">Średnio ${fmtDur(avgDur)}</span><span class="schip">Łącznie ${nf(durs.reduce((a, b) => a + b, 0) / 36e5, 1)} h</span><span class="schip rec">Seria: ${weekStreak()} tyg.</span></div></section>
        <section class="scard${animList ? ' enter' : ''}" style="--i:1"><header><div><h3>Objętość</h3><small>ciężar × powtórzenia, tygodniowo</small></div><strong class="good">${fmtVol(totVol)}<small style="display:inline;font-size:12px"> ${U()}</small></strong></header>
          <div class="sbars${m ? ' m' : ''}" style="--n:${pWeeks}">${barsV}</div><div class="sdays${m ? ' m' : ''}" style="--n:${pWeeks}">${days}</div></section>
        <section class="scard${animList ? ' enter' : ''}" style="--i:2">${calendarHtml()}</section>
        <section class="scard${animList ? ' enter' : ''}" style="--i:3"><header><div><h3>Masa ciała</h3><small>${body.length ? `ostatnio <b>${fmtW(body[body.length - 1][1])} ${U()}</b> · ${shortDate(fromKey(body[body.length - 1][0]).getTime())}` : 'zapisuj wagę, żeby widzieć trend'}</small></div>${bpts.length > 1 ? `<strong class="${Math.abs(bchg) < .05 ? '' : 'mid'}">${bchg > 0 ? '+' : bchg < 0 ? '−' : ''}${nf(Math.abs(bchg), 1)}</strong>` : ''}</header>
          ${body.length ? `<div class="chart-box">${chart(bpts, v => nf(v, 1), { h: 140 })}</div>` : ''}<button class="allweek" data-body>${PLUS} Dodaj pomiar</button></section>
        <section class="scard${animList ? ' enter' : ''}" style="--i:4"><header><div><h3>Partie mięśni</h3><small>serie robocze w okresie</small></div></header>
          ${musL.length ? `<div class="macros">${musL.map(([mm, n]) => `<div class="mac p"><span><i></i>${muscleName(mm)}</span><b><em>${n}</em> serii</b><div class="tube"><i style="width:${n / musMax * 100}%"></i></div></div>`).join('')}</div>` : '<p class="empty" style="padding:16px">Brak treningów w tym okresie</p>'}</section>
        <section class="scard${animList ? ' enter' : ''}" style="--i:5"><header><div><h3>Rekordy</h3><small>nowe rekordy w okresie</small></div><strong class="${prs.length ? 'good' : ''}">${prs.length}</strong></header>
          ${prs.length ? `<ul class="prlist">${prs.slice(0, 10).map(p => `<li data-w="${p.wid}"><i class="prb">PR</i><span>${esc(exAny(p.eid).name)}</span><b>${prLabel(p)}</b><small>${shortDate(p.at)}</small></li>`).join('')}</ul>` : '<p class="empty" style="padding:16px">Rekordy pojawią się, gdy pobijesz poprzednie wyniki</p>'}</section>
      </div>`;
  }
  function calendarHtml() {
    const y = calMonth.getFullYear(), mo = calMonth.getMonth(), first = new Date(y, mo, 1), n = new Date(y, mo + 1, 0).getDate(), t = todayKey();
    const by = new Map(); finished().forEach(w => { const k = key(new Date(w.start)); by.set(k, (by.get(k) || 0) + 1); });
    let cells = '', cnt = 0;
    for (let i = 0; i < dow(first); i++) cells += '<span class="cday blank"></span>';
    for (let d = 1; d <= n; d++) { const k = key(new Date(y, mo, d)), c = by.get(k) || 0; cnt += c; cells += `<button class="cday${c ? ' on' : ''}${k === t ? ' t' : ''}${k > t ? ' fut' : ''}" ${c ? `data-cday="${k}"` : 'disabled'} style="--i:${d}">${d}</button>`; }
    const now = new Date(), isNow = y === now.getFullYear() && mo === now.getMonth();
    return `<header><div><h3>Kalendarz</h3><small><b>${cnt}</b> ${cnt === 1 ? 'trening' : cnt > 1 && cnt < 5 ? 'treningi' : 'treningów'} w tym miesiącu</small></div><div class="calnav"><button class="navarr" data-cal="-1" aria-label="Poprzedni miesiąc">‹</button><b>${MONTHS[mo]} ${y}</b><button class="navarr" data-cal="1" aria-label="Następny miesiąc" ${isNow ? 'disabled' : ''}>›</button></div></header>
      <div class="calg">${DAYS.map(d => `<span class="cdh">${d}</span>`).join('')}${cells}</div>`;
  }
  function openDay(k) {
    const ws = finished().filter(w => key(new Date(w.start)) === k);
    if (ws.length === 1) { openWorkout(ws[0].id); return; }
    overlay.innerHTML = sheet(dateLabel(k), `${ws.length} treningi`, `<div class="mlist">${ws.map((w, i) => wRow(w, i)).join('')}</div>`, 'Dzień');
  }

  /* ----- masa ciała ----- */
  const bodyLast = () => Object.entries(state.body).filter(([, v]) => v).sort((a, b) => b[0].localeCompare(a[0]))[0];
  function openBody() {
    const last = bodyLast(), list = Object.entries(state.body).filter(([, v]) => v).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);
    const step = U() === 'lb' ? .2 : .1;
    overlay.innerHTML = sheet('Masa ciała', last ? `ostatnio ${fmtW(last[1])} ${U()} · ${shortDate(fromKey(last[0]).getTime())}` : 'Pomiar najlepiej rano, na czczo', `
      <div class="goal-k"><button data-bk="-1" aria-label="Mniej">−</button><input id="b-kg" type="text" inputmode="decimal" value="${last ? dispW(last[1]).toString().replace('.', ',') : ''}" placeholder="${U()}" aria-label="Masa ciała"><button data-bk="1" aria-label="Więcej">+</button></div>
      <p class="hint" style="margin-top:-8px">${U()}</p>
      <div class="field"><label for="b-day">Dzień</label><input id="b-day" type="date" value="${todayKey()}"></div>
      <button class="primary" id="b-save">Zapisz pomiar</button>
      ${list.length ? `<div class="blist">${list.map(([k, v]) => `<div><span>${shortDate(fromKey(k).getTime())}</span><b>${fmtW(v)} ${U()}</b><button data-bdel="${k}" aria-label="Usuń pomiar">${XMARK}</button></div>`).join('')}</div>` : ''}`, 'Masa ciała');
    overlay.querySelectorAll('[data-bk]').forEach(b => b.addEventListener('click', () => { const v = num($('b-kg').value) || (last ? dispW(last[1]) : (U() === 'lb' ? 170 : 75)); $('b-kg').value = String(+(v + step * +b.dataset.bk).toFixed(1)).replace('.', ','); }));
    $('b-save').addEventListener('click', () => {
      const v = num($('b-kg').value); if (!v || v < 20 || v > 700) { toast('Wpisz poprawną masę ciała'); return; }
      state.body[$('b-day').value || todayKey()] = +(v / uf()).toFixed(2); save(); close(); render(); toast(`Zapisano ${nf(v, 1)} ${U()}`);
    });
    overlay.querySelectorAll('[data-bdel]').forEach(b => b.addEventListener('click', () => { delete state.body[b.dataset.bdel]; save(); render(); openBody(); }));
  }

  /* ----- przerwa między seriami ----- */
  let rest = (() => { try { return JSON.parse(localStorage.getItem(REST_KEY)); } catch (_) { return null; } })(), restInt = null, actx = null;
  const restBar = $('restbar');
  function startRest(sec) {
    rest = { end: Date.now() + sec * 1000, total: sec };
    try { localStorage.setItem(REST_KEY, JSON.stringify(rest)); } catch (_) { }
    unlockAudio(); drawRest(true);
  }
  function stopRest() { rest = null; try { localStorage.removeItem(REST_KEY); } catch (_) { } clearInterval(restInt); restInt = null; restBar.hidden = true; restBar.innerHTML = ''; }
  function drawRest(fresh) {
    if (!rest) { restBar.hidden = true; return; }
    if (fresh || !restBar.innerHTML) restBar.innerHTML = `<div class="rb-in"><div class="rb-t"><small>przerwa</small><b id="rb-left">${fmtSec(rest.total)}</b></div><div class="tube rb-tube"><i id="rb-fill"></i></div><div class="rb-b"><button data-rest="-15" aria-label="Krócej o 15 sekund">−15</button><button data-rest="15" aria-label="Dłużej o 15 sekund">+15</button><button data-rest="skip" class="skip">Pomiń</button></div></div>`;
    restBar.hidden = false; restBar.classList.remove('end');
    tickRest();
    clearInterval(restInt); restInt = setInterval(tickRest, 250);
  }
  function tickRest() {
    if (!rest) return;
    const left = (rest.end - Date.now()) / 1000;
    if (left <= 0) { restDone(); return; }
    const l = $('rb-left'), f = $('rb-fill');
    if (l) l.textContent = fmtSec(Math.ceil(left));
    if (f) f.style.width = Math.min(100, left / rest.total * 100) + '%';
  }
  function restDone() {
    const was = rest; rest = null; try { localStorage.removeItem(REST_KEY); } catch (_) { }
    clearInterval(restInt); restInt = null;
    if (!was) return;
    navigator.vibrate?.([200, 100, 200]);
    if (state.settings.sound) beep();
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') navigator.serviceWorker?.getRegistration().then(r => r?.showNotification('Koniec przerwy', { body: 'Czas na kolejną serię', tag: 'ggym-rest', icon: 'icons/icon-192.png' })).catch(() => { });
    const l = $('rb-left'), f = $('rb-fill'); if (l) l.textContent = '0:00'; if (f) f.style.width = '0';
    restBar.classList.add('end'); if (!calm()) bubbles(restBar, 12);
    toast('Koniec przerwy — kolejna seria');
    setTimeout(() => { if (!rest) { restBar.hidden = true; restBar.innerHTML = ''; } }, 2200);
  }
  function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (_) { } }
  function beep() {
    if (!actx) return;
    try { [0, .22, .44].forEach((t, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = i === 2 ? 1175 : 880; g.gain.setValueAtTime(.0001, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(.25, actx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + t + .18); o.connect(g).connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + .2); }); } catch (_) { }
  }
  restBar.addEventListener('click', e => {
    const b = e.target.closest('[data-rest]'); if (!b || !rest) return;
    if (b.dataset.rest === 'skip') { stopRest(); return; }
    rest.end += +b.dataset.rest * 1000; rest.total = Math.max(rest.total, (rest.end - Date.now()) / 1000);
    try { localStorage.setItem(REST_KEY, JSON.stringify(rest)); } catch (_) { }
    tickRest();
  });

  /* ---------- okienka ---------- */
  const sheet = (title, sub, body, label, cls = '') => `<div class="scrim" data-close><div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label || title)}"><div class="sheet-h"><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div><button class="x" data-close aria-label="Zamknij">×</button></div>${body}</div></div>`;
  const close = () => { overlay.innerHTML = ''; pick = null; xd = null; };
  overlay.addEventListener('click', e => {
    if (e.target.hasAttribute('data-close')) { if (e.target.classList.contains('scrim') && pick?.back) { const b = pick.back; pick = null; b(); return; } close(); return; }
    // wybór ćwiczeń
    const pe = e.target.closest('[data-pex]');
    if (pe && pick) {
      const id = pe.dataset.pex;
      if (pick.mode === 'swap') { const p = pick; pick = null; p.cb([id]); return; }
      const i = pick.sel.indexOf(id); if (i >= 0) pick.sel.splice(i, 1); else { pick.sel.push(id); if (!calm()) bubbles(pe.querySelector('.pk'), 5); }
      pe.classList.toggle('on', i < 0); drawPickFoot(); return;
    }
    const pm = e.target.closest('[data-pmus]'); if (pm && pick) { pick.mus = pm.dataset.pmus; overlay.querySelectorAll('[data-pmus]').forEach(b => b.classList.toggle('on', b === pm)); drawPickList(); return; }
    // edytor planu
    const rr = e.target.closest('.rex'); if (rr && rdraft) {
      const i = +rr.dataset.ri, ex = rdraft.ex[i];
      const bs = e.target.closest('[data-rsets]'); if (bs) { ex.n = Math.max(1, Math.min(20, ex.n + +bs.dataset.rsets)); rr.querySelector('.stp b').textContent = ex.n; return; }
      const bm = e.target.closest('[data-rmove]'); if (bm) { const j = i + +bm.dataset.rmove;[rdraft.ex[i], rdraft.ex[j]] = [rdraft.ex[j], rdraft.ex[i]]; tidySup(rdraft.ex); drawRoutine(); return; }
      if (e.target.closest('[data-rdel]')) { rdraft.ex.splice(i, 1); tidySup(rdraft.ex); drawRoutine(); return; }
    }
    const xi = e.target.closest('[data-exinfo]'); if (xi) { openExercise(xi.dataset.exinfo); return; }
    const wv = e.target.closest('[data-w]'); if (wv) { openWorkout(wv.dataset.w); return; }
  });
  function drawPickFoot() {
    const p = pick, f = $('p-foot'); if (!f || !p) return;
    f.innerHTML = `<button class="primary acc" id="p-add" ${p.sel.length ? '' : 'disabled'}>${p.sel.length ? `Dodaj (${p.sel.length})` : 'Dodaj'}</button>${p.sel.length > 1 ? '<button class="allweek" id="p-ss">Jako superseria</button>' : ''}`;
    $('p-add')?.addEventListener('click', () => { const s = pick; pick = null; s.cb(s.sel, false); });
    $('p-ss')?.addEventListener('click', () => { const s = pick; pick = null; s.cb(s.sel, true); });
  }
  overlay.addEventListener('input', e => { if (e.target.matches('[data-rreps]') && rdraft) { const i = +e.target.closest('.rex').dataset.ri; rdraft.ex[i].reps = e.target.value; } });

  // Ustawienia
  function openSettings() {
    const s = state.settings;
    let restV = s.rest, goal = s.weekGoal;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    overlay.innerHTML = sheet('Ustawienia', '', `
      <div class="field"><span class="lab">Jednostka ciężaru</span><div class="seg"><label><input type="radio" name="s-unit" value="kg"${s.unit !== 'lb' ? ' checked' : ''}>kg</label><label><input type="radio" name="s-unit" value="lb"${s.unit === 'lb' ? ' checked' : ''}>lb</label></div></div>
      <div class="field"><span class="lab">Domyślna przerwa między seriami</span><div class="ed-val"><button data-sr="-15" aria-label="Krócej">−</button><div class="ed-num"><b class="sv" id="s-rest">${restV ? fmtSec(restV) : 'brak'}</b></div><button data-sr="15" aria-label="Dłużej">+</button></div></div>
      <div class="field"><span class="lab">Cel: treningów w tygodniu</span><div class="ed-val"><button data-sg="-1" aria-label="Mniej">−</button><div class="ed-num"><b class="sv" id="s-goal">${goal}</b></div><button data-sg="1" aria-label="Więcej">+</button></div></div>
      <div class="field"><span class="lab">Dźwięk po przerwie</span><div class="seg"><label><input type="radio" name="s-snd" value="1"${s.sound ? ' checked' : ''}>Włączony</label><label><input type="radio" name="s-snd" value="0"${!s.sound ? ' checked' : ''}>Wyłączony</label></div></div>
      ${perm !== 'unsupported' ? `<button class="nav-item" id="s-notif" ${perm !== 'default' ? 'disabled' : ''}>${perm === 'granted' ? 'Powiadomienia o końcu przerwy: włączone' : perm === 'denied' ? 'Powiadomienia zablokowane w przeglądarce' : 'Włącz powiadomienie o końcu przerwy'}</button>` : ''}
      <button class="primary" id="s-save">Zapisz</button>`, 'Ustawienia');
    overlay.querySelectorAll('[data-sr]').forEach(b => b.addEventListener('click', () => { restV = Math.max(0, Math.min(600, restV + +b.dataset.sr)); $('s-rest').textContent = restV ? fmtSec(restV) : 'brak'; }));
    overlay.querySelectorAll('[data-sg]').forEach(b => b.addEventListener('click', () => { goal = Math.max(1, Math.min(7, goal + +b.dataset.sg)); $('s-goal').textContent = goal; }));
    $('s-notif')?.addEventListener('click', async () => { try { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Powiadomienia włączone' : 'Powiadomienia nie zostały włączone'); openSettings(); } catch (_) { } });
    $('s-save').addEventListener('click', () => {
      state.settings = { ...s, unit: overlay.querySelector('[name=s-unit]:checked').value, rest: restV, weekGoal: goal, sound: overlay.querySelector('[name=s-snd]:checked').value === '1' };
      save(); close(); prevRing = null; render(); toast('Zapisano ustawienia');
    });
  }
  // Eksport do CSV (Excel): jeden wiersz na serię
  function exportCsv() {
    const q = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const dec = v => v == null || v === '' ? '' : String(v).replace('.', ',');
    const rows = [['Data', 'Godzina', 'Trening', 'Czas (min)', 'Ćwiczenie', 'Partia', 'Seria', 'Rodzaj', 'Ciężar (kg)', 'Powtórzenia', 'Czas (s)', 'Dystans (km)', 'Kcal', 'Rekord', 'Notatka']];
    const TN = { n: 'normalna', w: 'rozgrzewka', d: 'drop set', f: 'do upadku' };
    finished().slice().reverse().forEach(w => w.ex.forEach(e => { const x = exOf(e); e.sets.forEach((s, i) => rows.push([key(new Date(w.start)), hhmm(w.start), w.name, r0((w.end - w.start) / 60000), x.name, muscleName(x.muscle), i + 1, TN[s.t || 'n'], dec(s.kg), s.r ?? '', s.s ?? '', dec(s.km), s.kcal ?? '', s.pr ? 'tak' : '', i ? '' : e.note])); }));
    if (rows.length < 2) { toast('Brak treningów do eksportu'); return; }
    const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `grochu-gym-${todayKey()}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    close(); toast(`Wyeksportowano ${rows.length - 1} serii`);
  }

  /* ---------- ekran logowania: bez konta nie ma panelu ---------- */
  let authMode = 'in';
  function setAuthMode(m) {
    authMode = m;
    document.querySelectorAll('[data-auth]').forEach(b => b.setAttribute('aria-selected', b.dataset.auth === m));
    $('a-pass2-row').hidden = m !== 'up';
    $('a-pass').setAttribute('autocomplete', m === 'up' ? 'new-password' : 'current-password');
    $('a-submit').textContent = m === 'up' ? 'Załóż konto' : 'Zaloguj się';
    showAuthError('');
  }
  function showAuthError(msg) { const el = $('auth-err'); el.textContent = msg; el.hidden = !msg; }
  function updateGate() {
    const logged = !!window.Cloud?.user || !window.Cloud;
    $('auth').hidden = logged;
    $('app-main').hidden = !logged;
    document.body.classList.toggle('gate', !logged);
    if (!logged) { close(); restBar.hidden = true; if (matchMedia('(hover: hover)').matches && !document.activeElement?.closest('#auth')) $('a-email').focus(); }
    else if (rest) drawRest();
  }
  function authError(err) {
    const m = (err?.message || '').toLowerCase(), c = err?.code || '';
    if (err instanceof TypeError || m.includes('failed to fetch')) return 'Brak połączenia z internetem';
    if (err?.status === 404 || m.includes('gym_data')) return 'Baza nie jest jeszcze skonfigurowana (supabase/setup.sql)';
    if (err?.status === 429 || c === 'over_request_rate_limit' || m.includes('rate')) return 'Za dużo prób — spróbuj za kilka minut';
    if (c === 'invalid_credentials' || m.includes('invalid login')) return 'Zły e-mail lub hasło';
    if (c === 'user_already_exists' || m.includes('already registered')) return 'To konto już istnieje — zaloguj się';
    if (c === 'weak_password' || m.includes('password')) return 'Hasło musi mieć co najmniej 6 znaków';
    if (c === 'email_address_invalid' || m.includes('email')) return 'Sprawdź adres e-mail';
    return 'Nie udało się: ' + (err?.message || 'nieznany błąd');
  }
  document.querySelectorAll('[data-auth]').forEach(b => b.addEventListener('click', () => setAuthMode(b.dataset.auth)));
  $('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('a-email').value.trim(), pass = $('a-pass').value, pass2 = $('a-pass2').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) return showAuthError('Sprawdź adres e-mail');
    if (pass.length < 6) return showAuthError('Hasło musi mieć co najmniej 6 znaków');
    if (authMode === 'up' && pass !== pass2) return showAuthError('Hasła nie są takie same');
    const btn = $('a-submit'), label = btn.textContent;
    btn.disabled = true; btn.textContent = '…'; showAuthError('');
    try {
      if (authMode === 'up') await window.Cloud.signUp(email, pass); else await window.Cloud.signIn(email, pass);
      try { if (window.PasswordCredential) await navigator.credentials.store(new PasswordCredential({ id: email, password: pass, name: email })); } catch (_) { }
      hello = true; updateGate(); render();
      setTimeout(() => { $('auth-form').reset(); setAuthMode('in'); }, 1500);
    } catch (err) { showAuthError(authError(err)); }
    finally { btn.disabled = false; btn.textContent = label === '…' ? 'Zaloguj się' : label; }
  });
  // Komputer: ⋯ = konto, ustawienia, eksport, wylogowanie. Telefon: ☰ = widoki i to samo.
  $('menu-btn').addEventListener('click', () => {
    const extra = `<button class="nav-item" data-mi="settings">Ustawienia</button><button class="nav-item" data-mi="body">Masa ciała</button><button class="nav-item" data-mi="csv">Eksportuj do Excela (CSV)</button>`;
    if (isMobile()) {
      const item = (v, label) => `<button class="nav-item${view === v ? ' on' : ''}" data-go-view="${v}">${label}</button>`;
      overlay.innerHTML = sheet('Menu', esc(window.Cloud?.user?.email || ''), `<nav class="navmenu">${item('workout', state.active ? 'Trening · trwa' : 'Trening')}${item('history', 'Historia')}${item('routines', 'Plany')}${item('exercises', 'Ćwiczenia')}${item('progress', 'Postępy')}<div class="navsep"></div>${extra}<button class="nav-item out" id="logout">Wyloguj się</button></nav>`, 'Menu');
      overlay.querySelectorAll('[data-go-view]').forEach(b => b.addEventListener('click', () => { close(); setView(b.dataset.goView); window.scrollTo({ top: 0 }); }));
    } else {
      overlay.innerHTML = sheet(esc(window.Cloud?.user?.email || 'Konto'), '', `<nav class="navmenu">${extra}</nav><button class="primary" id="logout">Wyloguj</button>`, 'Konto');
    }
    overlay.querySelectorAll('[data-mi]').forEach(b => b.addEventListener('click', () => ({ settings: openSettings, body: openBody, csv: exportCsv })[b.dataset.mi]()));
    $('logout').addEventListener('click', confirmLogout);
  });
  function confirmLogout() {
    overlay.innerHTML = sheet('Czy chcesz się wylogować?', state.active ? 'Trwający trening zostanie zapisany w chmurze' : '', `<div class="confirm"><button data-close>Nie</button><button class="yes" id="confirm-logout">Tak</button></div>`);
    $('confirm-logout').addEventListener('click', async () => {
      const b = $('confirm-logout'); b.disabled = true;
      try { await window.Cloud.signOut(); close(); stopRest(); applyState({}); render(); updateGate(); }
      catch (err) { close(); toast(err.message); }
    });
  }

  /* ---------- zdarzenia ---------- */
  let userAct = false;
  function setView(v) { view = v; animList = true; try { localStorage.setItem('ggym.view', view); } catch (_) { } render(); }
  document.addEventListener('click', e => {
    if (e.target.closest('#overlay') || e.target.closest('#restbar')) return;
    const T = s => e.target.closest(s);
    let b;
    if (T('#start-btn')) { if (state.active) { if (view !== 'workout') setView('workout'); window.scrollTo({ top: 0 }); } else openStart(); return; }
    if (T('[data-start-empty]')) { startWorkout(); return; }
    if ((b = T('[data-rstart]'))) { if (!calm()) ripple(e.clientX, e.clientY, 1); startRoutine(b.dataset.rstart); return; }
    if ((b = T('[data-redit]'))) { openRoutine(state.routines[b.dataset.redit]); return; }
    if (T('[data-rnew]')) { openRoutine(null); return; }
    if (T('[data-templates]')) { openTemplates(); return; }
    if (T('[data-body]')) { openBody(); return; }
    if ((b = T('[data-go-view]'))) { setView(b.dataset.goView); window.scrollTo({ top: 0 }); return; }
    if ((b = T('.vtab[data-view]'))) { if (e.clientX || e.clientY) ripple(e.clientX, e.clientY, .7); setView(b.dataset.view); return; }
    // zapis serii
    if ((b = T('[data-chk]'))) { const r = b.closest('.srow'); checkSet(+r.dataset.x, +r.dataset.s, r); return; }
    if ((b = T('[data-stype]'))) { const r = b.closest('.srow'); setMenu(+r.dataset.x, +r.dataset.s); return; }
    if ((b = T('[data-prev]'))) {
      const r = b.closest('.srow'), en = state.active.ex[+r.dataset.x], s = en.sets[+r.dataset.s], pv = (lastSets(en.eid, state.active.edit) || [])[+r.dataset.s]; if (!pv) return;
      ['kg', 'r', 's', 'km', 'kcal'].forEach(f => { if (pv[f] != null) s[f] = pv[f]; }); save(); render(); return;
    }
    if ((b = T('[data-addset]'))) {
      const en = state.active.ex[+b.dataset.addset], l = en.sets[en.sets.length - 1];
      en.sets.push(l ? { t: l.t === 'w' ? 'n' : l.t, kg: l.kg ?? null, r: l.r ?? null, s: l.s ?? null, km: l.km ?? null, kcal: l.kcal ?? null, ph: l.ph, done: false } : { t: 'n', kg: null, r: null, s: null, km: null, kcal: null, done: false });
      save(); render(); const row = document.querySelector(`.srow[data-x="${b.dataset.addset}"][data-s="${en.sets.length - 1}"]`); if (row && !calm()) row.animate({ opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }, { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      return;
    }
    if ((b = T('[data-exmenu]'))) { exMenu(+b.dataset.exmenu); return; }
    if ((b = T('[data-exinfo]'))) { openExercise(b.dataset.exinfo); return; }
    if (T('[data-addex]')) { openPicker('workout'); return; }
    if (T('#l-finish')) { finishAsk(); return; }
    if (T('#l-cancel')) { cancelAsk(); return; }
    // listy
    if ((b = T('[data-w]'))) { if (!calm()) { b.animate({ transform: ['scale(1)', 'scale(1.02)', 'scale(1)'] }, { duration: 300, easing: 'cubic-bezier(.3,.7,.4,1)' }); ripple(e.clientX, e.clientY, 1); } setTimeout(() => openWorkout(b.dataset.w), calm() ? 0 : 120); return; }
    if ((b = T('[data-xmus]'))) { xMus = b.dataset.xmus; animList = true; renderExercises(); animList = false; return; }
    if (T('[data-xnew]')) { openCustomEx(null); return; }
    if (T('[data-more]')) { hLimit += 20; renderHistory(); return; }
    if ((b = T('[data-pw]'))) { pWeeks = +b.dataset.pw; animList = true; render(); return; }
    if ((b = T('[data-cal]'))) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + +b.dataset.cal, 1); const c = b.closest('.scard'); c.innerHTML = calendarHtml(); c.querySelector('.calg').classList.add('enter'); return; }
    if ((b = T('[data-cday]'))) { openDay(b.dataset.cday); return; }
    const ring = T('.ring'); if (ring && !calm()) { ripple(e.clientX, e.clientY, 1.4); bubbles(ring, 8); }
  });
  function openStart() {
    const rs = routinesSorted();
    if (!rs.length) { startWorkout(); return; }
    overlay.innerHTML = sheet('Start treningu', 'Z planu albo pusty', `<button class="emptyw" id="st-empty"><span class="pl">${PLUS}</span><span><b>Pusty trening</b><small>dodawaj ćwiczenia na bieżąco</small></span></button><div class="mgrp"><h3>Plany</h3></div><div class="stl">${rs.map(r => { const last = finished().find(w => w.rid === r.id); return `<button class="meal" data-st-r="${r.id}"><span class="mt">${PLAY}</span><span class="nt"><b>${esc(r.name)}</b><small>${r.ex.length} ćw. · ${r.ex.map(e => exOf(e).name).slice(0, 3).join(', ')}</small></span><span class="kc">${last ? ago(last.start) : 'nowy'}<span>ostatnio</span></span></button>`; }).join('')}</div>`, 'Start treningu');
    $('st-empty').addEventListener('click', () => startWorkout());
    overlay.querySelectorAll('[data-st-r]').forEach(b => b.addEventListener('click', () => startRoutine(b.dataset.stR)));
  }
  // wpisywanie serii: bez przerysowania (kursor zostaje w polu)
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'h-q') { hQuery = t.value; hLimit = 20; renderHistory(); return; }
    if (t.id === 'x-q') { xQuery = t.value; renderExercises(); return; }
    const a = state.active; if (!a || !t.closest('#view-workout')) return;
    if (t.id === 'l-name') { a.name = t.value; save(); return; }
    if (t.id === 'l-note') { a.note = t.value; save(); return; }
    const row = t.closest('.srow'); if (!row || !t.dataset.f) return;
    const en = a.ex[+row.dataset.x], s = en?.sets[+row.dataset.s]; if (!s) return;
    putVal(s, t.dataset.f, num(t.value), exOf(en).kind);
    save(); drawHeroSub();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.innerHTML) { close(); return; }
    if (e.key === 'Enter' && e.target.matches('.srow input')) {
      e.preventDefault();
      const all = [...document.querySelectorAll('.srow input')], i = all.indexOf(e.target);
      if (all[i + 1]) all[i + 1].focus(); else e.target.blur();
    }
  });
  // nowy dzień / powrót do karty
  let lastToday = todayKey();
  function checkDayChange() { const t = todayKey(); if (t === lastToday) return; lastToday = t; if (!state.active && !overlay.innerHTML) render(); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkDayChange(); if (rest) tickRest(); } });
  setInterval(checkDayChange, 60000);
  // zegar trwającego treningu
  setInterval(() => {
    const a = state.active; if (!a || a.edit || document.hidden) return;
    const t = elapsed();
    document.querySelectorAll('[data-el]').forEach(x => { x.textContent = t; });
    if (view === 'workout' && $('hero-num').classList.contains('clock')) $('hero-num').textContent = t;
    $('start-label').textContent = `Trening · ${t}`;
  }, 1000);

  let tt;
  function toast(m) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = m; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2800);
  }

  /* ---------- morskie efekty: bąbelki, kręgi na wodzie, fala przez cały ekran, morze w tle ---------- */
  const sea = document.createElement('div');
  sea.className = 'sea'; sea.setAttribute('aria-hidden', 'true'); sea.innerHTML = SEA_SVG;
  document.body.appendChild(sea);
  const bed = document.createElement('div');
  bed.className = 'seabed'; bed.setAttribute('aria-hidden', 'true'); bed.innerHTML = SEA_SVG;
  document.body.appendChild(bed);
  function bubbles(el, n = 11) {
    if (calm() || !el) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const s = 4 + Math.random() * 7, dx = (Math.random() - .5) * Math.min(r.width, 220) * 1.2, rise = 36 + Math.random() * 70, sway = (Math.random() - .5) * 18;
      const b = document.createElement('i');
      b.className = 'bubble';
      Object.assign(b.style, { left: cx - s / 2 + 'px', top: cy - s / 2 + 'px', width: s + 'px', height: s + 'px' });
      document.body.appendChild(b);
      b.animate([
        { transform: 'translate(0,0) scale(.3)', opacity: 0 },
        { transform: `translate(${dx * .4}px,${-rise * .3}px) scale(1)`, opacity: 1, offset: .2 },
        { transform: `translate(${dx * .7 + sway}px,${-rise * .7}px) scale(1)`, opacity: .9, offset: .7 },
        { transform: `translate(${dx}px,${-rise}px) scale(1.5)`, opacity: 0 }
      ], { duration: 700 + Math.random() * 500, delay: Math.random() * 120, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'backwards' }).onfinish = () => b.remove();
      setTimeout(() => b.remove(), 1700);
    }
  }
  function ripple(x, y, k = 1) {
    if (calm() || (!x && !y)) return;
    [0, 140].forEach(delay => {
      const r = document.createElement('i');
      r.className = 'ripple';
      Object.assign(r.style, { left: x + 'px', top: y + 'px' });
      document.body.appendChild(r);
      r.animate({ transform: ['translate(-50%,-50%) scale(.1)', `translate(-50%,-50%) scale(${k})`], opacity: [.55, 0] },
        { duration: 650, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' }).onfinish = () => r.remove();
      setTimeout(() => r.remove(), 1000);
    });
  }
  function swell() {
    if (calm()) return;
    sea.classList.remove('swell'); void sea.offsetWidth; sea.classList.add('swell');
    setTimeout(() => sea.classList.remove('swell'), 2700);
    for (let i = 0; i < 26; i++) {
      const s = 5 + Math.random() * 10, x = Math.random() * innerWidth;
      const b = document.createElement('i');
      b.className = 'bubble';
      Object.assign(b.style, { left: x + 'px', top: innerHeight - 10 + 'px', width: s + 'px', height: s + 'px' });
      document.body.appendChild(b);
      const rise = innerHeight * (.3 + Math.random() * .45), sw = (Math.random() - .5) * 60;
      b.animate([
        { transform: 'translate(0,0)', opacity: 0 },
        { transform: `translate(${sw * .5}px,${-rise * .4}px)`, opacity: .9, offset: .3 },
        { transform: `translate(${sw}px,${-rise}px) scale(1.4)`, opacity: 0 }
      ], { duration: 1400 + Math.random() * 900, delay: Math.random() * 500, easing: 'ease-out', fill: 'backwards' }).onfinish = () => b.remove();
      setTimeout(() => b.remove(), 3200);
    }
  }
  // Koniec treningu: fala przez ekran (zawsze przy celu tygodnia albo rekordach), podskok liczby.
  function celebrate(goal, prs) {
    navigator.vibrate?.([15, 60, 25]);
    if (calm()) return;
    $('hero-num').animate({ transform: ['scale(1)', 'scale(1.14)', 'scale(.98)', 'scale(1)'] }, { duration: 900, easing: 'ease-out' });
    if (goal || prs) swell(); else bubbles($('hero-num'), 14);
  }
  // Morze w tle: co kilka sekund z dna wypływa pojedynczy bąbelek (nie podczas dotyku i pisania — iPhone).
  let tStart = null;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; tStart = t ? [t.clientX, t.clientY] : null; }, { passive: true });
  document.addEventListener('touchend', e => {
    const f = e.target.closest?.('input:not([type=file]):not([type=radio]):not([type=checkbox]), textarea');
    const t = e.changedTouches[0], moved = !tStart || !t || Math.hypot(t.clientX - tStart[0], t.clientY - tStart[1]) > 10;
    if (f && !moved && document.activeElement !== f && !f.disabled) f.focus();
  }, { passive: true });
  let lastTouch = 0;
  ['touchstart', 'pointerdown', 'focusin'].forEach(t => document.addEventListener(t, () => { lastTouch = Date.now(); }, { passive: true, capture: true }));
  function ambient() {
    if (calm() || document.hidden || overlay.innerHTML || !$('auth').hidden) return;
    if (Date.now() - lastTouch < 4000 || document.activeElement?.matches('input, textarea, select')) return;
    const s = 4 + Math.random() * 9, x = Math.random() * innerWidth;
    const b = document.createElement('i');
    b.className = 'amb';
    Object.assign(b.style, { left: x + 'px', top: innerHeight + 'px', width: s + 'px', height: s + 'px' });
    document.body.appendChild(b);
    const rise = innerHeight * (.5 + Math.random() * .5), sway = (Math.random() - .5) * 80;
    b.animate([
      { transform: 'translate(0,0)', opacity: 0 },
      { transform: `translate(${sway * .3}px,${-rise * .25}px)`, opacity: .7, offset: .15 },
      { transform: `translate(${-sway * .4}px,${-rise * .6}px)`, opacity: .55, offset: .6 },
      { transform: `translate(${sway}px,${-rise}px) scale(1.3)`, opacity: 0 }
    ], { duration: 7000 + Math.random() * 5000, easing: 'linear' }).onfinish = () => b.remove();
    setTimeout(() => b.remove(), 13000);
  }
  setInterval(ambient, 2600);

  /* ---------- telefon: bez przybliżania ---------- */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }

  render();
  if (rest) { if (rest.end > Date.now()) drawRest(); else stopRest(); }

  /* ---------- konto i synchronizacja (js/cloud.js) ---------- */
  updateGate();
  if (window.Cloud) {
    let wasLogged = !!window.Cloud.user;
    window.Cloud.onChange(() => { const now = !!window.Cloud.user; if (now !== wasLogged) { wasLogged = now; updateGate(); } });
    window.Cloud.attach({ getState: () => state, applyState });
  }
})();
