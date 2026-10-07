/* Traincker — dziennik treningów na siłowni. Układ i działanie jak RepCount (lista treningów, karty ćwiczeń z seriami
   Kg / Powt. / Notatka, wartości docelowe z ostatniego razu jako szare podpowiedzi, timer przerwy, plany, rekordy, wykresy),
   wygląd jak Grochu's tracker. Dane w localStorage + Supabase (js/cloud.js). Ciężary zapisywane w kg, wyświetlane w kg albo lb. */
(() => {
  'use strict';

  const STORAGE_KEY = 'ggym.v1', REST_KEY = 'ggym.rest', APP_VERSION = 13;
  const DAYS_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const MON_S = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  /* ---------- biblioteka ćwiczeń: free-exercise-db (js/exercises.js, domena publiczna) ---------- */
  const DB = window.EXDB || { m: [], e: [], c: [], l: [], k: [], f: [], x: [] };
  // mięśnie w kolejności od góry ciała; nazwy ćwiczeń zostają po angielsku, etykiety po polsku
  const MUSCLE_PL = { chest: 'Klatka', shoulders: 'Barki', triceps: 'Triceps', biceps: 'Biceps', forearms: 'Przedramiona', lats: 'Najszersze grzbietu', 'middle back': 'Środek pleców', traps: 'Kaptury', 'lower back': 'Dolny grzbiet', abdominals: 'Brzuch', glutes: 'Pośladki', quadriceps: 'Czworogłowe ud', hamstrings: 'Dwugłowe ud', adductors: 'Przywodziciele', abductors: 'Odwodziciele', calves: 'Łydki', neck: 'Szyja' };
  const MUSCLES = Object.entries(MUSCLE_PL);
  const muscleName = m => MUSCLE_PL[m] || 'Całe ciało';
  const musList = arr => (arr || []).map(muscleName).join(', ');
  const EQUIP_PL = { barbell: 'Sztanga', dumbbell: 'Hantle', machine: 'Maszyna', cable: 'Wyciąg', 'body only': 'Masa ciała', kettlebells: 'Kettlebell', bands: 'Gumy', 'e-z curl bar': 'Gryf łamany', 'medicine ball': 'Piłka lekarska', 'exercise ball': 'Piłka gimnastyczna', 'foam roll': 'Wałek', other: 'Inne', none: 'Bez sprzętu' };
  const CAT_PL = { strength: 'Siłowe', powerlifting: 'Trójbój', 'olympic weightlifting': 'Podnoszenie ciężarów', strongman: 'Strongman', plyometrics: 'Plyometria', stretching: 'Rozciąganie', cardio: 'Cardio' };
  const LEVEL_PL = { beginner: 'Początkujący', intermediate: 'Średnio zaawansowany', expert: 'Zaawansowany' };
  const MECH_PL = { compound: 'Wielostawowe', isolation: 'Izolowane' }, FORCE_PL = { push: 'Pchanie', pull: 'Ciągnięcie', static: 'Statyczne' };
  // filtr sprzętu / typu nad listą ćwiczeń
  const EQ_FILTERS = [['all', 'Cały sprzęt'], ['barbell', 'Sztanga'], ['dumbbell', 'Hantle'], ['machine', 'Maszyna'], ['cable', 'Wyciąg'], ['body only', 'Masa ciała'], ['kettlebells', 'Kettlebell'], ['bands', 'Gumy'], ['e-z curl bar', 'Gryf łamany'], ['other', 'Inne'], ['cat:cardio', 'Cardio'], ['cat:stretching', 'Rozciąganie']];
  const KINDS = [['wr', 'Ciężar i powtórzenia'], ['bw', 'Masa ciała'], ['time', 'Na czas'], ['cardio', 'Cardio']];
  const kindName = k => (KINDS.find(x => x[0] === k) || KINDS[0])[1];
  // rodzaj zapisu serii: ciężar × powt., masa ciała, czas, cardio
  const KIND_OVR = { Plank: 'time', Side_Bridge: 'time', Farmers_Walk: 'time', 'Dips_-_Chest_Version': 'bw', 'Dips_-_Triceps_Version': 'bw', Ring_Dips: 'bw', 'Chin-Up': 'bw', Pullups: 'bw', Hanging_Leg_Raise: 'bw', Ab_Roller: 'bw' };
  const kindOf = (id, eq, cat, force) => KIND_OVR[id] || (cat === 'cardio' ? 'cardio' : cat === 'stretching' ? 'time' : force === 'static' && (eq === 'body only' || eq == null) ? 'time' : eq === 'body only' ? 'bw' : 'wr');
  const DEF_EX = {};
  DB.x.forEach(([id, name, p, sc, eq, cat, lv, me, fo, img]) => {
    const e = DB.e[eq], c = DB.c[cat], f = DB.f[fo];
    DEF_EX[id] = { id, name, primary: p.map(i => DB.m[i]), secondary: sc.map(i => DB.m[i]), equipment: e ?? null, category: c, level: DB.l[lv], mechanic: DB.k[me] ?? null, force: f ?? null, img, kind: kindOf(id, e, c, f) };
  });
  // dwa ćwiczenia z poprzedniej biblioteki, których nie ma w bazie
  DEF_EX.burpee = { id: 'burpee', name: 'Burpee', primary: ['quadriceps'], secondary: ['chest', 'shoulders', 'triceps', 'abdominals', 'glutes', 'hamstrings', 'calves'], equipment: 'body only', category: 'plyometrics', level: 'beginner', mechanic: 'compound', force: 'push', img: 0, kind: 'bw' };
  DEF_EX.run = { id: 'run', name: 'Running, Outdoor', primary: ['quadriceps'], secondary: ['calves', 'glutes', 'hamstrings'], equipment: null, category: 'cardio', level: 'beginner', mechanic: null, force: null, img: 0, kind: 'cardio' };
  // stare id (polska biblioteka) → id w free-exercise-db; zapisane treningi i plany są przepisywane przy wczytaniu
  const ALIAS = { bench: 'Barbell_Bench_Press_-_Medium_Grip', incbench: 'Barbell_Incline_Bench_Press_-_Medium_Grip', declbench: 'Decline_Barbell_Bench_Press', dbbench: 'Dumbbell_Bench_Press', incdb: 'Incline_Dumbbell_Press', dbfly: 'Dumbbell_Flyes', cablefly: 'Cable_Crossover', pecdeck: 'Butterfly', chestpress: 'Machine_Bench_Press', pushup: 'Pushups', dips: 'Dips_-_Chest_Version', deadlift: 'Barbell_Deadlift', pullup: 'Pullups', chinup: 'Chin-Up', bbrow: 'Bent_Over_Barbell_Row', dbrow: 'One-Arm_Dumbbell_Row', latpull: 'Wide-Grip_Lat_Pulldown', cablerow: 'Seated_Cable_Rows', tbar: 'T-Bar_Row_with_Handle', pullover: 'Straight-Arm_Dumbbell_Pullover', hyperext: 'Hyperextensions_Back_Extensions', shrug: 'Barbell_Shrug', ohp: 'Standing_Military_Press', dbpress: 'Dumbbell_Shoulder_Press', arnold: 'Arnold_Dumbbell_Press', latraise: 'Side_Lateral_Raise', frontraise: 'Front_Dumbbell_Raise', revfly: 'Reverse_Flyes', facepull: 'Face_Pull', uprow: 'Upright_Barbell_Row', cablelat: 'Cable_Seated_Lateral_Raise', curl: 'Barbell_Curl', dbcurl: 'Dumbbell_Bicep_Curl', hammer: 'Hammer_Curls', preacher: 'Preacher_Curl', cablecurl: 'Standing_Biceps_Cable_Curl', conccurl: 'Concentration_Curls', skull: 'EZ-Bar_Skullcrusher', pushdown: 'Triceps_Pushdown', cgbench: 'Close-Grip_Barbell_Bench_Press', ohext: 'Cable_Rope_Overhead_Triceps_Extension', kickback: 'Tricep_Dumbbell_Kickback', diamond: 'Push-Ups_-_Close_Triceps_Position', squat: 'Barbell_Full_Squat', frontsquat: 'Front_Barbell_Squat', legpress: 'Leg_Press', hack: 'Hack_Squat', goblet: 'Goblet_Squat', lunge: 'Dumbbell_Lunges', bulgarian: 'Split_Squat_with_Dumbbells', legext: 'Leg_Extensions', legcurl: 'Lying_Leg_Curls', rdl: 'Romanian_Deadlift', hipthrust: 'Barbell_Hip_Thrust', bridge: 'Butt_Lift_Bridge', abduct: 'Thigh_Abductor', kickcable: 'One-Legged_Cable_Kickback', calfstand: 'Standing_Calf_Raises', calfseat: 'Seated_Calf_Raise', plank: 'Plank', sideplank: 'Side_Bridge', crunch: 'Crunches', legraise: 'Hanging_Leg_Raise', cablecrunch: 'Cable_Crunch', russian: 'Russian_Twist', abwheel: 'Ab_Roller', wristcurl: 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench', farmer: 'Farmers_Walk', clean: 'Power_Clean', kbswing: 'One-Arm_Kettlebell_Swings', thruster: 'Kettlebell_Thruster', treadmill: 'Running_Treadmill', bike: 'Bicycling_Stationary', elliptical: 'Elliptical_Trainer', rower: 'Rowing_Stationary', stairs: 'Stairmaster', rope: 'Rope_Jumping' };
  const canon = id => ALIAS[id] && DEF_EX[ALIAS[id]] ? ALIAS[id] : id;
  // własne ćwiczenia z poprzedniej wersji miały jedną „partię” → mięśnie główne
  const OLD_GROUP = { chest: ['chest'], back: ['middle back', 'lats'], shoulders: ['shoulders'], biceps: ['biceps'], triceps: ['triceps'], legs: ['quadriceps'], glutes: ['glutes'], calves: ['calves'], abs: ['abdominals'], forearms: ['forearms'], full: [], cardio: [] };
  const IMG_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';

  // Gotowe plany: [ćwiczenie, serie rozgrzewkowe, serie robocze, notatka]
  const TEMPLATES = [
    { id: 'ppl', name: 'Push / Pull / Legs', desc: '3 treningi: klatka-barki-triceps, plecy-biceps, nogi', rs: [
      ['Push', [['bench', 2, 3, '6–8 powt.'], ['ohp', 1, 3, '8 powt.'], ['incdb', 0, 3, '10 powt.'], ['latraise', 0, 3, '12–15 powt.'], ['pushdown', 0, 3, '12 powt.']]],
      ['Pull', [['deadlift', 2, 3, '5 powt.'], ['pullup', 0, 3, '8 powt.'], ['bbrow', 1, 3, '8 powt.'], ['facepull', 0, 3, '15 powt.'], ['curl', 0, 3, '10 powt.'], ['hammer', 0, 2, '12 powt.']]],
      ['Legs', [['squat', 2, 3, '6–8 powt.'], ['rdl', 1, 3, '8 powt.'], ['legpress', 0, 3, '10 powt.'], ['legcurl', 0, 3, '12 powt.'], ['calfstand', 0, 4, '12–15 powt.']]]] },
    { id: 'ul', name: 'Góra / Dół', desc: '2 treningi, każdy 2× w tygodniu', rs: [
      ['Góra', [['bench', 2, 4, '6 powt.'], ['bbrow', 1, 4, '8 powt.'], ['ohp', 1, 3, '8 powt.'], ['latpull', 0, 3, '10 powt.'], ['curl', 0, 2, '12 powt.'], ['pushdown', 0, 2, '12 powt.']]],
      ['Dół', [['squat', 2, 4, '6 powt.'], ['rdl', 1, 3, '8 powt.'], ['legpress', 0, 3, '10 powt.'], ['legcurl', 0, 3, '12 powt.'], ['calfstand', 0, 4, '15 powt.'], ['plank', 0, 3, '45 s']]]] },
    { id: 'fbw', name: 'FBW (całe ciało)', desc: 'treningi A i B na przemian, 3× w tygodniu', rs: [
      ['FBW A', [['squat', 2, 3, '8 powt.'], ['bench', 1, 3, '8 powt.'], ['bbrow', 0, 3, '8 powt.'], ['ohp', 0, 2, '10 powt.'], ['plank', 0, 3, '45 s']]],
      ['FBW B', [['deadlift', 2, 3, '5 powt.'], ['incdb', 0, 3, '10 powt.'], ['pullup', 0, 3, '8 powt.'], ['lunge', 0, 3, '10 powt.'], ['curl', 0, 2, '12 powt.']]]] },
    { id: '5x5', name: '5×5 (siła)', desc: 'treningi A i B, ciężar rośnie co trening', rs: [
      ['5×5 A', [['squat', 2, 5, '5 powt.'], ['bench', 2, 5, '5 powt.'], ['bbrow', 1, 5, '5 powt.']]],
      ['5×5 B', [['squat', 2, 5, '5 powt.'], ['ohp', 2, 5, '5 powt.'], ['deadlift', 2, 1, '5 powt.']]]] },
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
  const dateLabel = ms => { const d = new Date(ms); return `${DAYS_FULL[dow(d)]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
  const shortDate = ms => { const d = new Date(ms); return `${d.getDate()} ${MON_S[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
  const hhmm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const ago = ms => { const n = Math.round((dayOnly(new Date()) - dayOnly(ms)) / 864e5); return n <= 0 ? 'dziś' : n === 1 ? 'wczoraj' : n < 14 ? `${n} dni temu` : n < 60 ? `${Math.round(n / 7)} tyg. temu` : shortDate(ms); };
  const defaultName = ms => { const h = new Date(ms).getHours(); return h < 12 ? 'Poranny trening' : h < 18 ? 'Popołudniowy trening' : 'Wieczorny trening'; };

  /* ---------- stan ---------- */
  const REST_OPTS = [60, 120, 180];
  const snapRest = v => !v ? 0 : REST_OPTS.reduce((b, o) => Math.abs(o - v) <= Math.abs(b - v) ? o : b, REST_OPTS[0]);
  const DEF_SET = { unit: 'kg', rest: 120, autoRest: true, weekGoal: 3, sound: true };
  let migrated = false;
  const withDefaults = s => {
    s = s && typeof s === 'object' ? s : {};
    s.settings = { ...DEF_SET, ...(s.settings || {}) };
    if (!REST_OPTS.includes(s.settings.rest)) s.settings.rest = snapRest(s.settings.rest) || 120;
    ['workouts', 'routines', 'exercises', 'body'].forEach(c => { if (!s[c] || typeof s[c] !== 'object') s[c] = {}; });
    // plany z poprzedniej wersji: {n, reps} → {w, n, note}
    Object.values(s.routines).forEach(r => { (r.ex || []).forEach(e => { if (e.w == null) e.w = 0; if (e.reps != null) { if (!e.note && e.reps) e.note = /s$/.test(e.reps) ? e.reps : e.reps + ' powt.'; delete e.reps; } }); if (!r.target) r.target = 'latest'; });
    if (!s.active || typeof s.active !== 'object') s.active = null;
    // trwający trening z poprzedniej wersji: nieodhaczone serie były tylko podpowiedzią
    if (s.active) s.active.ex.forEach(e => e.sets.forEach(x => { if (x.done === false) { e.tg = e.tg || []; ['kg', 'r', 's', 'km', 'kcal'].forEach(f => { x[f] = null; }); } delete x.done; delete x.ph; delete x.pr; }));
    // biblioteka free-exercise-db: stare id ćwiczeń → nowe, własne ćwiczenia dostają mięśnie główne i pomocnicze
    const fix = e => { if (e && e.eid) { const c = canon(e.eid); if (c !== e.eid) { e.eid = c; delete e.n; migrated = true; } } };
    Object.values(s.workouts).forEach(w => (w.ex || []).forEach(fix));
    Object.values(s.workouts).forEach(w => (w.prs || []).forEach(fix));
    Object.values(s.routines).forEach(r => (r.ex || []).forEach(fix));
    if (s.active) s.active.ex.forEach(fix);
    Object.values(s.exercises).forEach(x => { if (!x.primary) { migrated = true; x.primary = OLD_GROUP[x.muscle] || []; x.secondary = []; if (x.muscle === 'cardio') x.category = 'cardio'; delete x.muscle; } x.secondary = x.secondary || []; });
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
    const typing = document.activeElement?.closest?.('#wk-layer') && state.active && s.active && s.active.id === state.active.id;
    state = withDefaults({ ...s });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { }
    if (typing || overlay.innerHTML) return; // nie przerywamy wpisywania ani otwartego okienka
    if (!state.active) wOpen = false;
    render();
  }

  // nawigacja jak w aplikacji na telefon: zakładki na dole, trening jako osobny ekran, szczegóły nakładane na wierzch
  let tab = 'log', wOpen = !!state.active, stack = [], animTab = true;
  let hQuery = '', hLimit = 25, xQuery = '', xMus = 'all', xEq = 'all', pWeeks = 8, calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  try { const v = localStorage.getItem('ggym.tab'); if (['log', 'routines', 'exercises', 'progress', 'more'].includes(v)) tab = v; } catch (_) { }
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- liczby i jednostki ---------- */
  const r0 = v => Math.round(v || 0);
  const r1 = v => Math.round((v || 0) * 10) / 10;
  const nf = (v, d = 1) => (+v || 0).toLocaleString('pl-PL', { maximumFractionDigits: d });
  const LB = 2.20462;
  const U = () => state.settings.unit === 'lb' ? 'lb' : 'kg';
  const UC = () => U() === 'lb' ? 'Lb' : 'Kg';
  const uf = () => U() === 'lb' ? LB : 1;
  const dispW = kg => kg == null || kg === '' ? '' : +(kg * uf()).toFixed(U() === 'lb' ? 1 : 2);
  const fmtW = kg => nf(dispW(kg || 0), 2);
  const fmtRM = kg => nf((kg || 0) * uf(), 1);
  const fmtVol = kg => { const v = (kg || 0) * uf(); return v >= 100000 ? nf(v / 1000, 1) + ' t' : nf(Math.round(v), 0); };
  const fmtK = v => v >= 1000 ? nf(v / 1000, v >= 10000 ? 0 : 1) + 'k' : String(r0(v));
  const fmtSec = s => { s = Math.round(s || 0); return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const fmtDur = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`; };
  const fmtDurS = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}:${pad(m % 60)} h` : `${m} min`; };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = p => (p || 'w') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const norm = s => String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const num = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) && x >= 0 ? x : null; };
  const deep = o => JSON.parse(JSON.stringify(o));
  const plural = (n, a, b, c) => n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c;

  /* ---------- ćwiczenia, serie, statystyki ---------- */
  const exById = id => state.exercises[id] || DEF_EX[id] || DEF_EX[canon(id)] || null;
  const exOf = e => exById(e.eid) || { id: e.eid, name: e.n || 'Ćwiczenie', primary: [], secondary: [], kind: 'wr' };
  const exSub = x => [musList(x.primary), x.equipment ? EQUIP_PL[x.equipment] : (x.category === 'cardio' ? 'Cardio' : '')].filter(Boolean).join(' · ') || kindName(x.kind);
  const exAny = eid => exById(eid) || exOf(Object.values(state.workouts).flatMap(w => w.ex).find(e => e.eid === eid) || { eid });
  const allEx = () => [...Object.values(DEF_EX), ...Object.values(state.exercises)].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  // pola serii jak w RepCount: Kg / Powt. / Notatka
  const colsOf = k => k === 'bw' ? [['kg', '+' + UC()], ['r', 'Powt.']] : k === 'time' ? [['kg', '+' + UC()], ['s', 'Sek.']] : k === 'cardio' ? [['s', 'Min'], ['km', 'Km'], ['kcal', 'Kcal']] : [['kg', UC()], ['r', 'Powt.']];
  const inVal = (s, f, k) => { const v = s?.[f]; if (v == null || v === '') return ''; const o = f === 'kg' ? dispW(v) : f === 's' && k === 'cardio' ? r1(v / 60) : v; return String(o).replace('.', ','); };
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
  function wStats(w, live) {
    let sets = 0, vol = 0;
    (w.ex || []).forEach(e => { const k = exOf(e).kind, ss = live ? e.sets.filter(s => valid(s, k)) : e.sets; sets += work(ss).length; vol += volOf(ss, k); });
    return { sets, vol, ms: (w.end || Date.now()) - w.start, ex: (w.ex || []).length };
  }
  // sesje ćwiczenia od najstarszej
  function sessionsOf(eid, excl) {
    const out = [];
    finished().forEach(w => { if (w.id === excl) return; w.ex.forEach(e => { if (e.eid === eid && e.sets.length) out.push({ w, e, sets: e.sets }); }); });
    return out.reverse();
  }
  function lastSets(eid, excl, rid) {
    for (const w of finished()) { if (w.id === excl || (rid && w.rid !== rid)) continue; const e = w.ex.find(x => x.eid === eid && x.sets.length); if (e) return e.sets; }
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
  const PR_NAME = { e1rm: 'Szac. 1RM', kg: 'Najcięższy ciężar', r: 'Najwięcej powtórzeń', s: 'Najdłużej' };
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
  const prLabel = p => p.t === 'e1rm' ? `~${fmtRM(p.v)} ${U()}` : p.t === 'kg' ? `${fmtW(p.v)} ${U()}` : p.t === 'r' ? `${p.v} powt.` : fmtSec(p.v);
  const weekWorkouts = (off = 0) => { const a = addDays(weekStart(new Date()), off * 7).getTime(), b = addDays(new Date(a), 7).getTime(); return finished().filter(w => w.start >= a && w.start < b); };
  function weekStreak() {
    const g = state.settings.weekGoal; let n = 0;
    for (let i = 0; i < 520; i++) { const c = weekWorkouts(-i).length; if (c >= g) n++; else if (i === 0) continue; else break; }
    return n;
  }
  // krótkie podsumowanie ćwiczenia w liście treningów (jak w RepCount): „4 × 95 kg”
  function exLine(e) {
    const k = exOf(e).kind, ws = work(e.sets), n = ws.length || e.sets.length;
    if (k === 'cardio') return fmtSet(e.sets.reduce((a, s) => ({ s: (a.s || 0) + (s.s || 0), km: (a.km || 0) + (s.km || 0), kcal: (a.kcal || 0) + (s.kcal || 0) }), {}), k);
    if (k === 'time') return `${n} × ${fmtSec(Math.max(...e.sets.map(s => s.s || 0)))}`;
    if (k === 'bw') { const kg = Math.max(0, ...e.sets.map(s => s.kg || 0)); return kg ? `${n} × +${fmtW(kg)} ${U()}` : `${n} × ${Math.max(...e.sets.map(s => s.r || 0))}`; }
    return `${n} × ${fmtW(Math.max(0, ...ws.map(s => s.kg || 0)))} ${U()}`;
  }

  /* ---------- ikony ---------- */
  const wavePath = (amp, len) => { let d = 'M0 20'; for (let x = 0; x < 400; x += len) d += ` Q${x + len / 4} ${20 - amp} ${x + len / 2} 20 T${x + len} 20`; return d + ' V40 H0 Z'; };
  const SEA_SVG = `<svg class="waves" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true"><path class="w1" d="${wavePath(5, 50)}"/><path class="w2" d="${wavePath(7, 100)}" transform="translate(0 3)"/><path class="w3" d="${wavePath(3, 50)}" transform="translate(0 9)"/></svg>`;
  const BOAT = '<svg width="26" height="24" viewBox="0 0 26 24" aria-hidden="true"><path d="M12 2v14H4z" fill="currentColor" opacity=".9"/><path d="M14 5v11h7z" fill="currentColor" opacity=".55"/><path d="M2 18h22l-3 4H6z" fill="currentColor"/></svg>';
  const XMARK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const PLUS = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const PLUSC = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.2" stroke="currentColor" stroke-width="1.6"/><path d="M10 6v8M6 10h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const DOTS = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="3.5" cy="9" r="1.6" fill="currentColor"/><circle cx="9" cy="9" r="1.6" fill="currentColor"/><circle cx="14.5" cy="9" r="1.6" fill="currentColor"/></svg>';
  const DOTSC = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="11" r="1.3" fill="currentColor"/><circle cx="11" cy="11" r="1.3" fill="currentColor"/><circle cx="15" cy="11" r="1.3" fill="currentColor"/></svg>';
  const CHEV = '<svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true"><path d="M1.5 1.5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const BACK = '<svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden="true"><path d="M9 2L2 9l7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DOWN = '<svg width="18" height="11" viewBox="0 0 18 11" fill="none" aria-hidden="true"><path d="M2 2l7 7 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ALARM = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="13" r="7.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 9v4.2l2.6 1.6M4 5.5L6.8 3M20 5.5L17.2 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SEARCH = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.6" stroke="currentColor" stroke-width="1.7"/><path d="M10.5 10.5l3.2 3.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const NOTE = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3.5" y="2.5" width="13" height="15" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 7h7M6.5 10h7M6.5 13h4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const BARS = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="9" width="4" height="8.5" rx="1.2" fill="currentColor"/><rect x="8" y="4" width="4" height="13.5" rx="1.2" fill="currentColor"/><rect x="13.5" y="6.5" width="4" height="11" rx="1.2" fill="currentColor"/></svg>';
  const STAR = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8l-4.3-4 5.8-.7z" fill="currentColor"/></svg>';
  const STARS = '<svg width="11" height="11" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8l-4.3-4 5.8-.7z" fill="currentColor"/></svg>';
  const AGAIN = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.8h-2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const STOP = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="5" y="5" width="12" height="12" rx="2.5" fill="currentColor"/></svg>';
  const PLAY = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.8v12.4L16 10z" fill="currentColor"/></svg>';

  const $ = id => document.getElementById(id);
  const overlay = $('overlay'), tabView = $('tab-view'), wkLayer = $('wk-layer'), dtLayer = $('dt-layer');

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

  /* ---------- mapa mięśni: sylwetka z przodu i z tyłu, mięśnie główne i pomocnicze ---------- */
  // kształty lewej połowy (patrząc na rysunek), druga połowa to odbicie; „c” = kształt na środku ciała (bez odbicia)
  const BODY = {
    front: {
      sil: ['M36 36 L50 32 L50 100 L35 100 C33 88 34 68 36 54 Z', 'M38 88 L50 90 L50 102 L40 98 Z', 'M42 148 L47.5 148 C47.5 162 46.5 172 45.5 180 L42 180 Z', 'M37 180 L46 180 L48 188 L35 188 Z'],
      silC: ['M41 8 C41 2 59 2 59 8 L59 20 C59 26 41 26 41 20 Z'],
      joints: [[27, 69, 3.6], [20, 96, 3.6], [42, 145, 5]],
      m: {
        traps: ['M44 30 L44 35 L34 36 C37 33 40 31 44 30 Z'],
        shoulders: ['M34 35 C27 35 22 40 22 48 C22 51 24 52 26 51 C28 47 31 43 36 40 L37 37 Z'],
        chest: ['M50 37 L50 55 C45 57 39 56 35 52 C33 48 34 43 37 39 L39 37 Z'],
        biceps: ['M27 52 C24 55 23 61 24 67 C26 69 29 68 30 65 C31 60 31 55 30 52 Z'],
        forearms: ['M24 71 C21 77 19 84 19 91 C21 92 23 92 24 91 C26 84 28 77 29 72 Z'],
        abdominals: ['M36 56 C35 64 36 74 38 84 L43 88 L43 58 Z'],
        quadriceps: ['M35 100 C34 112 35 126 38 140 L46 141 C47 128 48 114 47 101 L42 92 L39 92 Z'],
        abductors: ['M35 86 C33 90 33 96 34 101 L38 98 L39 90 Z'],
        adductors: ['M47 98 L50 100 L50 124 C48 120 47 110 47 100 Z'],
        calves: ['M35.5 150 C33.5 158 34.5 168 37.5 178 L42 178 C42.5 168 43 158 43 150 Z'],
      },
      c: {
        neck: ['M45 24 L55 24 L56 33 L44 33 Z'],
        abdominals: ['M44 57 L56 57 L56 88 C54 92 46 92 44 88 Z'],
      },
      lines: ['M50 60 L50 88', 'M44 66 L56 66', 'M44 75 L56 75'],
    },
    back: {
      sil: ['M36 36 L50 30 L50 104 L35 104 C33 90 34 70 36 54 Z', 'M41 148 L47 148 C47 160 46 170 45 178 L41 178 Z', 'M37 178 L46 178 L48 188 L35 188 Z'],
      silC: ['M41 8 C41 2 59 2 59 8 L59 20 C59 26 41 26 41 20 Z', 'M45 22 L55 22 L56 30 L44 30 Z'],
      joints: [[27, 69, 3.6], [20, 96, 3.6], [42, 146, 5]],
      m: {
        traps: ['M46 24 L50 24 L50 52 C47 48 43 43 40 39 L34 36 C38 33 43 30 46 24 Z'],
        shoulders: ['M34 35 C27 35 22 40 22 48 C22 51 24 52 26 51 C28 47 31 43 36 40 L37 37 Z'],
        'middle back': ['M40 40 C44 44 47 48 50 53 L50 63 C46 61 43 57 41 51 Z'],
        lats: ['M36 42 C34 52 35 62 39 72 L46 78 C45 70 43 62 41 53 C40 48 38 45 37 41 Z'],
        'lower back': ['M50 64 L50 88 L45 88 C44 82 44 74 46 69 C47 66 48 65 50 64 Z'],
        triceps: ['M27 51 C24 54 23 60 24 66 C26 68 29 67 30 64 C31 59 31 54 30 51 Z'],
        forearms: ['M24 71 C21 77 19 84 19 91 C21 92 23 92 24 91 C26 84 28 77 29 72 Z'],
        glutes: ['M50 90 L50 110 C45 112 39 110 36 104 C35 97 37 92 42 90 Z'],
        abductors: ['M43 86 C38 86 35 88 35 93 C36 96 37 96 38 95 C39 92 41 90 45 89 Z'],
        hamstrings: ['M36 108 C35 120 37 132 40 142 L46 142 C47 132 48 120 48 112 C44 113 40 112 36 108 Z'],
        adductors: ['M48 112 L50 112 L50 130 C49 124 48 118 48 112 Z'],
        calves: ['M37 150 C35 158 36 168 40 176 L45 176 C47 168 47 158 46 150 C43 148 40 148 37 150 Z'],
      },
      c: {},
      lines: ['M50 28 L50 88'],
    },
  };
  const MIR = 'matrix(-1 0 0 1 100 0)';
  // lvl: mięsień → 1 (główny), 0.5 (pomocniczy) albo dowolna wartość 0–1 (mapa cieplna w Postępach)
  function figure(side, lvl, x0) {
    const B = BODY[side], both = d => `<path d="${d}"/><path d="${d}" transform="${MIR}"/>`;
    const fillOf = m => { const v = lvl[m] || 0; return v ? ` style="--v:${Math.min(1, v).toFixed(2)}" class="mu on"` : ' class="mu"'; };
    let sil = B.sil.map(both).join('') + B.silC.map(d => `<path d="${d}"/>`).join('') + B.joints.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${100 - cx}" cy="${cy}" r="${r}"/>`).join('');
    Object.values(B.m).flat().forEach(d => { sil += both(d); }); Object.values(B.c).flat().forEach(d => { sil += `<path d="${d}"/>`; });
    const mus = Object.entries(B.m).map(([m, ds]) => `<g${fillOf(m)} data-m="${m}">${ds.map(both).join('')}</g>`).join('') + Object.entries(B.c).map(([m, ds]) => `<g${fillOf(m)} data-m="${m}">${ds.map(d => `<path d="${d}"/>`).join('')}</g>`).join('');
    return `<g transform="translate(${x0} 0)"><g class="sil">${sil}</g>${mus}<g class="ln">${B.lines.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
  }
  function bodyMap(primary = [], secondary = [], heat) {
    const lvl = {};
    if (heat) Object.assign(lvl, heat); else { secondary.forEach(m => { lvl[m] = .45; }); primary.forEach(m => { lvl[m] = 1; }); }
    return `<svg class="bmap${heat ? ' heat' : ''}" viewBox="0 0 220 196" role="img" aria-label="Mapa mięśni">${figure('front', lvl, 2)}${figure('back', lvl, 118)}<text x="52" y="195" class="bt">przód</text><text x="168" y="195" class="bt">tył</text></svg>`;
  }

  /* ================= rysowanie ================= */
  function render() {
    document.querySelectorAll('#tabbar [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    renderTab();
    renderLive();
    if (wOpen && state.active) { wkLayer.hidden = false; renderWorkout(); } else { wkLayer.hidden = true; wkLayer.innerHTML = ''; wOpen = false; hideAsk(true); }
    if (stack.length) { dtLayer.hidden = false; renderDetail(); } else { dtLayer.hidden = true; dtLayer.innerHTML = ''; }
    document.body.classList.toggle('locked', wOpen || !!stack.length);
    animTab = false;
  }
  function renderTab() {
    const y = window.scrollY;
    ({ log: renderLog, routines: renderRoutines, exercises: renderExercises, progress: renderProgress, more: renderMore })[tab]();
    if (!animTab) window.scrollTo({ top: y, behavior: 'instant' });
  }
  const head = (title, sub, right = '') => `<header class="scr-h"><div class="brandrow"><img class="brand" src="icons/icon-192.png" alt="" width="22" height="22"><div class="eyebrow">Traincker</div></div><div class="scr-t"><div><h1>${title}</h1>${sub ? `<p class="scr-sub">${sub}</p>` : ''}</div><div class="scr-r">${right}</div></div></header>`;
  const emptyCard = (title, text, btn = '') => `<div class="break-card empty-day"><div class="bk-sea" aria-hidden="true">${SEA_SVG}<i class="bk-boat">${BOAT}</i></div><div class="bk-txt"><b>${title}</b><small>${text}</small></div>${btn}</div>`;
  function renderLive() {
    const a = state.active, lb = $('livebar');
    $('fab').hidden = !!a || tab !== 'log';
    lb.hidden = !a || wOpen;
    if (a && !wOpen) lb.innerHTML = `<span class="lv-dot"></span><span class="lv-t"><b>${esc(a.name)}</b><small>${a.edit ? 'edycja treningu' : `trwa · <span data-el>${elapsed()}</span>`}${rest ? ` · przerwa <span data-rl>${fmtSec(restLeft())}</span>` : ''}</small></span><span class="lv-go">Wróć</span>`;
  }
  const elapsed = () => state.active ? fmtSec((Date.now() - state.active.start) / 1000) : '0:00';

  /* ----- Treningi (dziennik, jak główny ekran RepCount) ----- */
  function wCard(w, i) {
    const s = wStats(w), lines = w.ex.slice(0, 7).map(e => `<li${e.sup ? ' class="ss"' : ''}><span>${esc(exOf(e).name)}</span><b>${esc(exLine(e))}</b></li>`).join('') + (w.ex.length > 7 ? `<li class="more"><span>i ${w.ex.length - 7} więcej…</span></li>` : '');
    return `<button class="wcard" data-w="${w.id}" style="--i:${i}"><div class="wc-h"><span class="wc-d">${dateLabel(w.start)}</span><span class="wc-t">${hhmm(w.start)} · ${fmtDur(s.ms)}</span></div><b class="wc-n">${esc(w.name)}</b><ul>${lines}</ul><div class="wc-f"><span>${s.sets} ${plural(s.sets, 'seria', 'serie', 'serii')}</span>${s.vol ? `<span>${fmtVol(s.vol)} ${U()}</span>` : ''}${w.prs?.length ? `<span class="pr">${STARS} ${w.prs.length} ${plural(w.prs.length, 'rekord', 'rekordy', 'rekordów')}</span>` : ''}</div></button>`;
  }
  function renderLog() {
    const wk = weekWorkouts(0).length, st = weekStreak(), g = state.settings.weekGoal, q = norm(hQuery.trim());
    const all = finished().filter(w => !q || norm(w.name).includes(q) || w.ex.some(e => norm(exOf(e).name).includes(q)));
    let html = '', i = 0, n = 0, lastM = '';
    for (const w of all) {
      if (n >= hLimit) break;
      const d = new Date(w.start), m = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (m !== lastM) { const cnt = all.filter(x => { const y = new Date(x.start); return y.getMonth() === d.getMonth() && y.getFullYear() === d.getFullYear(); }).length; html += `<div class="grp" style="--i:${i++}"><h3>${m}</h3><em>${cnt} ${plural(cnt, 'trening', 'treningi', 'treningów')}</em></div>`; lastM = m; }
      html += wCard(w, i++); n++;
    }
    if (!all.length) html = q ? '<p class="empty">Nic nie pasuje do wyszukiwania</p>' : emptyCard('Zacznij pierwszy trening', 'Naciśnij +, wybierz plan albo pusty trening i dodawaj serie. Następnym razem ciężary z ostatniego treningu podpowiedzą się same.', '<button class="primary acc" data-start>Nowy trening</button>');
    if (all.length > hLimit) html += '<button class="allweek more" data-more>Pokaż starsze</button>';
    const sub = `<b>${wk}</b> z ${g} w tym tygodniu${st ? ` · seria <b>${st}</b> ${plural(st, 'tydzień', 'tygodnie', 'tygodni')}` : ''}`;
    if (!tabView.querySelector('#h-q') || (all.length && tabView.querySelector('span#h-q'))) tabView.innerHTML = `<div id="log-h"></div>${finished().length ? `<label class="hsearch">${SEARCH}<input id="h-q" type="search" placeholder="Szukaj treningu lub ćwiczenia" autocomplete="off"></label>` : '<span id="h-q" hidden></span>'}<div class="wlist" id="w-list"></div>`;
    $('log-h').innerHTML = head('Treningi', sub);
    const list = $('w-list'); list.className = 'wlist' + (animTab ? ' enter' : ''); list.innerHTML = html;
  }

  /* ----- Trening (ekran treningu jak w RepCount) ----- */
  const setLabel = (sets, i, pre = '') => { const s = sets[i]; if (s.t === 'w') return 'R'; return pre + work(sets.slice(0, i + 1)).length; };
  const restOf = e => e.rest != null ? snapRest(e.rest) : state.settings.rest;
  // podpowiedź (szara wartość docelowa): z ostatniego razu, a dla dodatkowych serii — z poprzedniej serii
  function target(e, si) {
    const t = e.tg?.[si]; if (t) return t;
    for (let i = si - 1; i >= 0; i--) { const p = e.sets[i]; if (p && p.t !== 'w' && valid(p, exOf(e).kind)) return p; if (e.tg?.[i] && e.sets[i].t !== 'w') return e.tg[i]; }
    return null;
  }
  function setRow(e, xi, si, label) {
    const s = e.sets[si], k = exOf(e).kind, tg = target(e, si), ok = valid(s, k);
    const pr = ok && !state.active.edit ? prOf(s, k, bests(e.eid, state.active.edit, state.active.start)) : null;
    const fields = colsOf(k).map(([f, l]) => `<label class="fld f-${f}"><small>${l}</small><input data-f="${f}" type="text" inputmode="decimal" enterkeyhint="next" value="${inVal(s, f, k)}" placeholder="${tg ? esc(String(inVal(tg, f, k))) : ''}" autocomplete="off"></label>`).join('');
    const note = k === 'cardio' ? '' : `<label class="fld f-note"><small>Notatka</small><input data-f="note" type="text" enterkeyhint="done" maxlength="60" value="${esc(s.note || '')}" placeholder="${tg?.note ? esc(tg.note) : ''}" autocomplete="off"></label>`;
    return `<div class="srow${ok ? ' ok' : ''}${s.t !== 'n' ? ' t-' + s.t : ''}${k === 'cardio' ? ' cardio' : ''}" data-x="${xi}" data-s="${si}" data-v="${ok ? 1 : 0}"><button class="sn" data-sn aria-label="Seria ${label}${tg ? ', wpisz podpowiedź' : ''}">${label}</button>${s.t === 'd' ? '<i class="tagd" title="Drop set">↓</i>' : s.t === 'f' ? '<i class="tagd f" title="Do upadku">U</i>' : ''}${fields}${note}<span class="prs" ${pr ? '' : 'hidden'} title="Rekord">${STAR}</span><button class="sm" data-smenu aria-label="Opcje serii">${DOTS}</button></div>`;
  }
  function exCard(group, idx0) {
    const a = state.active;
    const foot = e => `<div class="cfoot"><button class="adds" data-addset="${idx0}">${PLUSC}<span>Dodaj serię</span></button><span class="cic"><button data-exnote="${idx0}" aria-label="Notatka do ćwiczenia" class="${a.ex[idx0].note ? 'on' : ''}">${NOTE}</button><button data-exinfo="${e.eid}" data-xt="chart" aria-label="Historia i wykres">${BARS}</button><button data-exinfo="${e.eid}" data-xt="rec" aria-label="Rekordy">${STAR}</button></span></div>`;
    if (group.length === 1) {
      const e = group[0], x = exOf(e);
      return `<article class="exc" data-x="${idx0}" style="--i:${idx0}"><header><button class="exn" data-exinfo="${e.eid}"><b>${esc(x.name)}</b>${e.note ? `<small>${esc(e.note)}</small>` : ''}</button><button class="sm acc" data-exmenu="${idx0}" aria-label="Opcje ćwiczenia">${DOTS}</button></header><div class="sets">${e.sets.map((s, si) => setRow(e, idx0, si, setLabel(e.sets, si))).join('')}</div>${foot(e)}</article>`;
    }
    // superseria: A, B, C… i serie na przemian A1, B1, A2, B2
    const L = 'ABCDEFGH', rounds = Math.max(...group.map(e => e.sets.length));
    let rows = '';
    for (let r = 0; r < rounds; r++) group.forEach((e, gi) => { if (e.sets[r]) rows += setRow(e, idx0 + gi, r, e.sets[r].t === 'w' ? 'R' : L[gi] + work(e.sets.slice(0, r + 1)).length); });
    return `<article class="exc ss" data-x="${idx0}" style="--i:${idx0}"><header class="ssh">${group.map((e, gi) => `<div class="ssn"><i>${L[gi]}</i><button class="exn" data-exinfo="${e.eid}"><b>${esc(exOf(e).name)}</b>${e.note ? `<small>${esc(e.note)}</small>` : ''}</button><button class="sm acc" data-exmenu="${idx0 + gi}" aria-label="Opcje ćwiczenia">${DOTS}</button></div>`).join('')}</header><div class="sets">${rows}</div>${foot(group[0])}</article>`;
  }
  const groupsOf = list => { const out = []; let i = 0; while (i < list.length) { const g = [list[i]]; if (list[i].sup) while (list[i + g.length]?.sup === list[i].sup) g.push(list[i + g.length]); out.push([i, g]); i += g.length; } return out; };
  function renderWorkout() {
    const a = state.active, sy = wkLayer.scrollTop, s = wStats(a, true), d = new Date(a.start);
    const fresh = !wkLayer.querySelector('.wk-body');
    const bar = `<div class="topbar wkbar"><button class="tb-i" data-wk-min aria-label="${a.edit ? 'Anuluj edycję' : 'Zwiń trening'}">${a.edit ? XMARK : DOWN}</button><div class="tb-mid"><button class="fin" data-finish>${a.edit ? 'Zapisz' : 'Zakończ'}</button></div><div class="tb-rt"><div class="tb-g"><button class="tb-timer${rest ? ' run' : ''}" data-timer aria-label="Timer przerwy">${ALARM}<span data-rl>${rest ? fmtSec(restLeft()) : ''}</span></button><button data-wk-menu aria-label="Opcje treningu">${DOTSC}</button></div><small class="tb-el">${a.edit ? 'edycja' : `<span data-el>${elapsed()}</span>`}</small></div></div>`;
    const body = `<div class="wk-head"><div class="eyebrow">${DAYS_FULL[dow(d)]} · ${hhmm(a.start)}</div><input class="wname" id="w-name" type="text" maxlength="60" value="${esc(a.name)}" aria-label="Nazwa treningu" autocomplete="off">${a.note ? `<p class="wnote" data-wk-menu>${esc(a.note)}</p>` : ''}</div>
      <div class="exlist${fresh ? ' enter' : ''}">${groupsOf(a.ex).map(([i, g]) => exCard(g, i)).join('') || emptyCard('Pusty trening', 'Dodaj pierwsze ćwiczenie. Szare liczby w seriach to wynik z ostatniego razu — dotknij numeru serii, żeby go wpisać.')}</div>
      <button class="addex" data-addex>${PLUSC}<span>Dodaj ćwiczenie</span></button>`;
    wkLayer.innerHTML = `${bar}<div class="wk-body">${body}</div>`;
    wkLayer.scrollTop = sy;
  }
  const statChips = s => `<span><b>${s.sets}</b> ${plural(s.sets, 'seria', 'serie', 'serii')}</span><span><b>${fmtVol(s.vol)}</b> ${U()}</span><span><b>${state.active?.ex.length || 0}</b> ćw.</span>`;
  // jedna seria zmieniła stan (wpisana / wyczyszczona): poprawka w miejscu, bez przerysowania (kursor zostaje w polu)
  function patchRow(row) {
    const a = state.active, e = a.ex[+row.dataset.x], s = e?.sets[+row.dataset.s]; if (!s) return;
    const k = exOf(e).kind, ok = valid(s, k), was = row.dataset.v === '1';
    row.classList.toggle('ok', ok); row.dataset.v = ok ? 1 : 0;
    const pr = ok && !a.edit ? prOf(s, k, bests(e.eid, a.edit, a.start)) : null;
    row.querySelector('.prs').hidden = !pr;
    const st = $('w-stats'); if (st) st.innerHTML = statChips(wStats(a, true));
    if (ok && !was) logged(e, +row.dataset.x, row, pr);
  }
  // seria wpisana: rekord, przerwa (w superserii dopiero po ostatnim ćwiczeniu z grupy)
  function logged(e, xi, row, pr) {
    const a = state.active, k = exOf(e).kind;
    navigator.vibrate?.(12);
    if (!calm()) { row.querySelector('.sn').animate({ transform: ['scale(.7)', 'scale(1.15)', 'scale(1)'] }, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); const r = row.querySelector('.sn').getBoundingClientRect(); ripple(r.left + r.width / 2, r.top + r.height / 2, .9); }
    if (pr) toast(`Nowy rekord (${PR_NAME[pr]}): ${exOf(e).name} · ${fmtSet(e.sets[+row.dataset.s], k, true)}`);
    const next = a.ex[xi + 1], inSup = e.sup && next && next.sup === e.sup;
    if (!a.edit && state.settings.autoRest && !inSup && k !== 'cardio' && restOf(e) > 0) askRest(restOf(e));
  }
  // nowe ćwiczenie w treningu: serie z ostatniego razu jako szare podpowiedzi (jak w RepCount)
  function newEntry(eid, opt = {}) {
    const tgAll = opt.tg || lastSets(eid, state.active?.edit, opt.rid) || lastSets(eid, state.active?.edit) || [];
    const tw = tgAll.filter(s => s.t === 'w'), tn = work(tgAll);
    let types;
    if (opt.w != null || opt.n != null) types = [...Array(opt.w || 0).fill('w'), ...Array(opt.n || 0).fill('n')];
    else types = tgAll.length ? tgAll.map(s => s.t === 'w' ? 'w' : 'n') : ['n', 'n', 'n'];
    let wi = 0, ni = 0;
    const tg = types.map(t => { const src = t === 'w' ? (tw[wi++] || tw[tw.length - 1]) : (tn[ni++] || tn[tn.length - 1]); return src ? { kg: src.kg ?? null, r: src.r ?? null, s: src.s ?? null, km: src.km ?? null, kcal: src.kcal ?? null, note: src.note || '' } : null; });
    // drop sety i serie do upadku z ostatniego razu zostają oznaczone
    ni = 0; const nt = types.map(t => t === 'w' ? 'w' : (tn[ni++]?.t || 'n'));
    return { eid, note: opt.note || '', sup: opt.sup || null, rest: undefined, tg, sets: nt.map(t => ({ t, kg: null, r: null, s: null, km: null, kcal: null, note: '' })) };
  }
  function startWorkout(opts = {}) {
    if (state.active) {
      overlay.innerHTML = sheet('Trening już trwa', esc(state.active.name), `<p class="hint">Najpierw zakończ albo odrzuć obecny trening.</p><div class="confirm"><button id="go-active">Wróć do treningu</button><button class="yes" id="drop-active">Odrzuć i zacznij nowy</button></div>`);
      $('go-active').addEventListener('click', () => { close(); openWorkout(); });
      $('drop-active').addEventListener('click', () => { state.active = null; stopRest(); close(); startWorkout(opts); });
      return;
    }
    const now = Date.now();
    state.active = { id: uid('w'), name: opts.name || defaultName(now), rid: opts.rid || null, start: now, note: opts.note || '', ex: [] };
    (opts.ex || []).forEach(e => state.active.ex.push(newEntry(e.eid, e)));
    save(); close(); stack = []; openWorkout();
    if (!opts.ex?.length) setTimeout(() => openPicker('workout'), calm() ? 0 : 280);
  }
  function openWorkout() { wOpen = true; render(); wkLayer.scrollTop = 0; }
  function startRoutine(id) {
    const r = state.routines[id]; if (!r) return;
    startWorkout({ name: r.name, rid: r.id, note: r.note || '', ex: r.ex.map(e => ({ eid: e.eid, w: e.w || 0, n: e.n || 1, sup: e.sup, note: e.note, rid: r.target === 'routine' ? r.id : null })) });
  }
  function openStart() {
    const rs = routinesSorted();
    overlay.innerHTML = sheet('Nowy trening', '', `<button class="emptyw" id="st-empty"><span class="pl">${PLUS}</span><span><b>Pusty trening</b><small>dodawaj ćwiczenia na bieżąco</small></span></button>
      ${rs.length ? `<div class="grp"><h3>Z planu</h3></div><div class="ilist">${rs.map(r => { const last = finished().find(w => w.rid === r.id); return `<button class="irow" data-st-r="${r.id}"><span class="ir-t"><b>${esc(r.name)}</b><small>${r.ex.length} ćw.${last ? ' · ostatnio ' + ago(last.start) : ''}</small></span><span class="go-pill">${PLAY}</span></button>`; }).join('')}</div>` : `<button class="linkish" id="st-tpl">Gotowe plany: Push/Pull/Legs, Góra/Dół, FBW, 5×5</button>`}`, 'Nowy trening');
    $('st-empty').addEventListener('click', () => startWorkout());
    $('st-tpl')?.addEventListener('click', openTemplates);
    overlay.querySelectorAll('[data-st-r]').forEach(b => b.addEventListener('click', () => startRoutine(b.dataset.stR)));
  }
  function setMenu(xi, si) {
    const e = state.active.ex[xi], s = e.sets[si];
    const opt = (t, l, d) => `<button class="irow${s.t === t ? ' on' : ''}" data-st="${t}"><span class="ir-t"><b>${l}</b><small>${d}</small></span>${s.t === t ? '<span class="ck">✓</span>' : ''}</button>`;
    overlay.innerHTML = sheet(`Seria ${setLabel(e.sets, si)}`, esc(exOf(e).name), `<div class="ilist">${opt('n', 'Normalna', 'liczy się do objętości i rekordów')}${opt('w', 'Rozgrzewkowa (R)', 'bez objętości i rekordów')}${opt('d', 'Drop set ↓', 'zaraz po poprzedniej, lżej')}${opt('f', 'Do upadku (U)', 'do upadku mięśniowego')}</div><div class="ilist"><button class="irow" data-sclear><span class="ir-t"><b>Wyczyść</b></span></button><button class="irow out" data-sdel><span class="ir-t"><b>Usuń serię</b></span></button></div>`, 'Seria');
    overlay.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { s.t = b.dataset.st; save(); close(); render(); }));
    overlay.querySelector('[data-sclear]').addEventListener('click', () => { ['kg', 'r', 's', 'km', 'kcal'].forEach(f => { s[f] = null; }); s.note = ''; save(); close(); render(); });
    overlay.querySelector('[data-sdel]').addEventListener('click', () => { e.sets.splice(si, 1); e.tg?.splice(si, 1); save(); close(); render(); });
  }
  function exMenu(xi) {
    const a = state.active, e = a.ex[xi], x = exOf(e), next = a.ex[xi + 1];
    const rests = [0, ...REST_OPTS];
    overlay.innerHTML = sheet(esc(x.name), esc(exSub(x)), `
      ${x.kind !== 'cardio' ? `<div class="field"><span class="lab">Przerwa po serii</span><div class="chips rchips">${rests.map(r => `<button class="${restOf(e) === r ? 'on' : ''}" data-rest-sec="${r}">${r ? fmtSec(r) : 'brak'}</button>`).join('')}</div></div>` : ''}
      <div class="ilist">
        <button class="irow" data-m="note"><span class="ir-t"><b>Notatka</b>${e.note ? `<small>${esc(e.note)}</small>` : ''}</span>${CHEV}</button>
        <button class="irow" data-m="info"><span class="ir-t"><b>Historia, wykres i rekordy</b></span>${CHEV}</button>
        ${next ? `<button class="irow" data-m="sup"><span class="ir-t"><b>${e.sup && next.sup === e.sup ? 'Rozłącz z następnym' : 'Superseria z następnym'}</b><small>${esc(exOf(next).name)}</small></span></button>` : ''}
        ${e.sup && !(next && next.sup === e.sup) ? '<button class="irow" data-m="unsup"><span class="ir-t"><b>Wyjmij z superserii</b></span></button>' : ''}
        <button class="irow" data-m="swap"><span class="ir-t"><b>Zamień ćwiczenie</b></span>${CHEV}</button>
        ${xi > 0 ? '<button class="irow" data-m="up"><span class="ir-t"><b>Przesuń wyżej</b></span></button>' : ''}
        ${next ? '<button class="irow" data-m="down"><span class="ir-t"><b>Przesuń niżej</b></span></button>' : ''}
      </div>
      <div class="ilist"><button class="irow out" data-m="del"><span class="ir-t"><b>Usuń ćwiczenie</b></span></button></div>`, 'Opcje ćwiczenia');
    overlay.querySelectorAll('[data-rest-sec]').forEach(b => b.addEventListener('click', () => { e.rest = +b.dataset.restSec; save(); overlay.querySelectorAll('[data-rest-sec]').forEach(z => z.classList.toggle('on', z === b)); }));
    overlay.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.m;
      if (m === 'note') { exNote(xi); return; }
      if (m === 'info') { close(); pushDetail({ type: 'ex', eid: e.eid, tab: 'hist' }); return; }
      if (m === 'swap') { openPicker('swap', ids => { a.ex[xi] = { ...newEntry(ids[0]), sup: e.sup, rest: e.rest }; save(); close(); render(); }); return; }
      if (m === 'sup') { if (e.sup && next.sup === e.sup) { next.sup = null; tidySup(); } else { const id = e.sup || next.sup || uid('s'); e.sup = id; next.sup = id; } }
      if (m === 'unsup') { e.sup = null; tidySup(); }
      if (m === 'up' || m === 'down') { const j = m === 'up' ? xi - 1 : xi + 1;[a.ex[xi], a.ex[j]] = [a.ex[j], a.ex[xi]]; tidySup(); }
      if (m === 'del') { a.ex.splice(xi, 1); tidySup(); }
      save(); close(); render();
    }));
  }
  function exNote(xi) {
    const e = state.active.ex[xi];
    overlay.innerHTML = sheet('Notatka', esc(exOf(e).name), `<div class="field"><textarea id="n-txt" rows="3" maxlength="200" placeholder="np. ustawienie siedzenia 4, chwyt szeroki">${esc(e.note || '')}</textarea></div><button class="primary acc" id="n-save">Zapisz</button>`, 'Notatka');
    $('n-save').addEventListener('click', () => { e.note = $('n-txt').value.trim(); save(); close(); render(); });
  }
  // superseria musi mieć co najmniej 2 sąsiadujące ćwiczenia
  function tidySup(list = state.active.ex) { list.forEach((e, i) => { if (e.sup && list[i - 1]?.sup !== e.sup && list[i + 1]?.sup !== e.sup) e.sup = null; }); }
  function addSet(xi) {
    const a = state.active, e0 = a.ex[xi], grp = e0.sup ? a.ex.filter(x => x.sup === e0.sup) : [e0];
    grp.forEach(e => { const li = e.sets.length - 1, l = e.sets[li], src = l ? (l.kg != null ? l : target(e, li)) : null; e.sets.push({ t: l && l.t !== 'w' ? l.t : 'n', kg: exOf(e).kind !== 'cardio' && src?.kg != null ? src.kg : null, r: null, s: null, km: null, kcal: null, note: '' }); });
    save(); render();
    const row = wkLayer.querySelector(`.srow[data-x="${xi}"][data-s="${e0.sets.length - 1}"]`);
    if (row && !calm()) row.animate({ opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }, { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  // dotknięcie numeru serii: wpisuje podpowiedź z ostatniego razu (szybkie „zrobione jak ostatnio”)
  function tapSet(row) {
    const a = state.active, e = a.ex[+row.dataset.x], si = +row.dataset.s, s = e.sets[si], k = exOf(e).kind;
    if (valid(s, k)) { setMenu(+row.dataset.x, si); return; }
    const tg = target(e, si);
    if (!tg) { row.querySelector('input')?.focus(); toast('Wpisz wynik tej serii'); return; }
    colsOf(k).forEach(([f]) => { if (s[f] == null && tg[f] != null) s[f] = tg[f]; });
    if (!valid(s, k)) { row.querySelector('input')?.focus(); return; }
    save();
    colsOf(k).forEach(([f]) => { const inp = row.querySelector(`[data-f="${f}"]`); if (inp) inp.value = inVal(s, f, k); });
    patchRow(row);
  }
  function workoutMenu() {
    const a = state.active;
    overlay.innerHTML = sheet(a.edit ? 'Edycja treningu' : 'Trening', esc(a.name), `
      ${a.edit ? `<div class="row3"><div class="field"><label for="m-date">Dzień</label><input id="m-date" type="date" value="${key(new Date(a.start))}"></div><div class="field"><label for="m-time">Start</label><input id="m-time" type="time" value="${hhmm(a.start)}"></div><div class="field"><label for="m-dur">Minut</label><input id="m-dur" type="number" inputmode="numeric" min="1" value="${Math.max(1, Math.round((a.end - a.start) / 60000))}"></div></div>` : ''}
      <div class="field"><label for="m-note">Notatka do treningu</label><textarea id="m-note" rows="3" maxlength="600" placeholder="np. samopoczucie, sen, ból barku">${esc(a.note || '')}</textarea></div>
      <button class="primary acc" id="m-save">Zapisz</button>
      <div class="ilist">${a.edit ? '<button class="irow" id="m-cancel"><span class="ir-t"><b>Anuluj edycję</b></span></button>' : '<button class="irow out" id="m-drop"><span class="ir-t"><b>Odrzuć trening</b><small>serie z tego treningu nie zostaną zapisane</small></span></button>'}</div>`, 'Trening');
    $('m-save').addEventListener('click', () => {
      a.note = $('m-note').value.trim();
      if (a.edit) { const d = $('m-date').value, t = $('m-time').value, m = num($('m-dur').value); if (d && t) { const st = new Date(`${d}T${t}`).getTime(); if (isFinite(st)) a.start = st; } a.end = a.start + Math.max(1, m || 60) * 60000; }
      save(); close(); render();
    });
    $('m-cancel')?.addEventListener('click', () => { const id = a.edit; state.active = null; wOpen = false; save(); close(); pushDetail({ type: 'w', id }); });
    $('m-drop')?.addEventListener('click', () => {
      overlay.innerHTML = sheet('Odrzucić trening?', 'Serie z tego treningu nie zostaną zapisane', `<div class="confirm"><button data-close>Nie</button><button class="yes" id="c-yes">Odrzuć</button></div>`);
      $('c-yes').addEventListener('click', () => { state.active = null; wOpen = false; stopRest(); save(); close(); render(); toast('Trening odrzucony'); });
    });
  }
  function finishAsk() {
    const a = state.active; if (!a) return;
    if (a.edit) { finish(); return; }
    const s = wStats(a, true);
    if (!s.sets && !a.ex.some(e => e.sets.some(x => valid(x, exOf(e).kind)))) {
      overlay.innerHTML = sheet('Brak wpisanych serii', 'Wpisz ciężar i powtórzenia albo dotknij numeru serii', `<div class="confirm"><button data-close>Wróć</button><button class="yes" id="w-drop">Odrzuć trening</button></div>`);
      $('w-drop').addEventListener('click', () => { state.active = null; wOpen = false; stopRest(); save(); close(); render(); toast('Trening odrzucony'); });
      return;
    }
    const empty = a.ex.reduce((n, e) => n + e.sets.filter(x => !valid(x, exOf(e).kind)).length, 0);
    overlay.innerHTML = sheet('Zakończyć trening?', `${elapsed()} · ${s.sets} ${plural(s.sets, 'seria', 'serie', 'serii')}`, `${empty ? `<p class="hint">${empty} ${plural(empty, 'pusta seria zostanie pominięta', 'puste serie zostaną pominięte', 'pustych serii zostanie pominiętych')}.</p>` : ''}<div class="confirm"><button data-close>Wróć</button><button class="yes acc" id="w-fin">Zakończ</button></div>`);
    $('w-fin').addEventListener('click', finish);
  }
  function finish() {
    const a = state.active; if (!a) return;
    const ex = a.ex.map(e => { const k = exOf(e).kind; return { eid: e.eid, n: exOf(e).name, note: (e.note || '').trim(), sup: e.sup || null, sets: e.sets.filter(s => valid(s, k)).map(s => { const o = { t: s.t || 'n' }; ['kg', 'r', 's', 'km', 'kcal'].forEach(f => { if (s[f] != null && s[f] !== '') o[f] = s[f]; }); if (s.note) o.note = s.note; return o; }) }; }).filter(e => e.sets.length);
    tidySup(ex);
    if (!ex.length) { toast('Brak serii do zapisania'); return; }
    const w = { id: a.edit || a.id, name: (a.name || '').trim() || defaultName(a.start), rid: a.rid || null, start: a.start, end: a.edit ? a.end : Date.now(), note: (a.note || '').trim(), ex };
    w.prs = computePRs(w);
    const before = weekWorkouts(0).length, wasEdit = !!a.edit;
    state.workouts[w.id] = w; state.active = null; wOpen = false; stopRest();
    if (wasEdit) finished().filter(x => x.start > w.start).reverse().forEach(x => { x.prs = computePRs(x); }); // późniejsze rekordy po edycji
    save(); close(); animTab = true;
    if (wasEdit) { stack = [{ type: 'w', id: w.id }]; render(); toast('Zapisano zmiany'); return; }
    tab = 'log'; stack = []; render(); window.scrollTo({ top: 0 });
    summary(w, before);
  }
  // poprzedni najlepszy wynik (przed tym treningiem) dla danego rodzaju rekordu
  function prevBest(eid, t, w) {
    let best = null;
    sessionsOf(eid, w.id).forEach(({ w: ww, sets }) => {
      if (ww.start >= w.start) return;
      work(sets).forEach(x => { const v = t === 'e1rm' ? e1rm(x.kg, x.r) : t === 'kg' ? (x.kg || 0) : t === 'r' ? (x.r || 0) : (x.s || 0); if (!best || v > best.v) best = { v, set: x, at: ww.start }; });
    });
    return best;
  }
  // rekordy w postaci: ćwiczenie, data poprzedniego rekordu, „stary wynik › dziś nowy wynik”
  function prListHtml(w) {
    const seen = new Set(), rows = [];
    (w.prs || []).forEach(p => {
      const x = exAny(p.eid), k = x.kind, pb = prevBest(p.eid, p.t, w);
      const now = fmtSet(p.set, k, true), was = pb ? fmtSet(pb.set, k, true) : '—';
      const id = p.eid + '|' + now + '|' + was; if (seen.has(id)) return; seen.add(id);
      rows.push(`<div class="prrow"><b class="pr-n">${esc(x.name)}</b><small class="pr-d">${pb ? dateLabel(pb.at) : 'pierwszy raz'}</small><div class="pr-v"><span class="was">${esc(was)}</span><i>›</i><span class="now"><em>dziś</em> ${esc(now)}</span></div></div>`);
    });
    return `<div class="prlist2">${rows.join('')}</div>`;
  }
  function openPRs(w) {
    overlay.innerHTML = sheet('Rekordy', `${esc(w.name)} · ${shortDate(w.start)}`, prListHtml(w) + '<button class="primary acc" data-close>Zamknij</button>', 'Rekordy');
  }
  // po treningu: tylko czas i liczba rekordów; dotknięcie rekordów rozwija listę
  function summary(w, before) {
    const s = wStats(w), g = state.settings.weekGoal, after = weekWorkouts(0).length, n = (w.prs || []).length;
    overlay.innerHTML = sheet('Trening zakończony', esc(w.name), `
      <div class="sumtiles"><div class="st"><small>Czas</small><b>${fmtDurS(s.ms)}</b></div><button class="st pr" id="sum-pr" ${n ? '' : 'disabled'} aria-expanded="false"><small>Rekordy</small><b>${n}</b>${n ? `<span>pokaż ${CHEV}</span>` : ''}</button></div>
      <div id="sum-list" hidden>${n ? prListHtml(w) : ''}</div>
      <button class="primary acc" data-close>Gotowe</button>`, 'Podsumowanie treningu');
    $('sum-pr')?.addEventListener('click', () => { const l = $('sum-list'), b = $('sum-pr'), open = l.hidden; l.hidden = !open; b.setAttribute('aria-expanded', open); b.classList.toggle('open', open); });
    celebrate(before < g && after >= g, n);
  }
  // plan, z którego był trening, można zaktualizować z menu ⋯ zakończonego treningu
  const routineDiff = (w, r) => r && (r.ex.length !== w.ex.length || r.ex.some((e, i) => e.eid !== w.ex[i].eid || +e.n !== work(w.ex[i].sets).length || +(e.w || 0) !== w.ex[i].sets.filter(x => x.t === 'w').length));

  /* ----- ekrany szczegółów (nakładane na wierzch, jak w aplikacji na telefon) ----- */
  function pushDetail(d) { stack.push(d); render(); dtLayer.scrollTop = 0; }
  function popDetail() { stack.pop(); render(); }
  const dtBar = (title, right = '') => `<div class="topbar dtbar"><button class="tb-i" data-back aria-label="Wstecz">${BACK}</button><div class="tb-c">${title}</div><div class="tb-r">${right}</div></div>`;
  function renderDetail() {
    const d = stack[stack.length - 1];
    if (d.type === 'w' && !state.workouts[d.id]) { stack.pop(); return render(); }
    if (d.type === 'r' && !state.routines[d.id]) { stack.pop(); return render(); }
    const sy = dtLayer.scrollTop;
    dtLayer.innerHTML = d.type === 'w' ? workoutScreen(d) : d.type === 'r' ? routineScreen(d) : d.type === 'ex' ? exerciseScreen(d) : '';
    dtLayer.scrollTop = sy;
    if (d.type === 'ex') bindChart(d);
    if (d.fresh) { delete d.fresh; const n = dtLayer.querySelector('[data-rname]'); if (n && matchMedia('(hover: hover)').matches) { n.focus(); n.select(); } }
  }

  /* szczegóły zakończonego treningu */
  function histTable(sets, k) {
    const cols = k === 'cardio' ? [['s', 'Min'], ['km', 'Km'], ['kcal', 'Kcal']] : k === 'time' ? [['kg', '+' + UC()], ['s', 'Sek.']] : k === 'bw' ? [['kg', '+' + UC()], ['r', 'Powt.']] : [['kg', UC()], ['r', 'Powt.']];
    return `<table class="htab"><thead><tr><th>Seria</th>${cols.map(c => `<th>${c[1]}</th>`).join('')}<th>Notatka</th></tr></thead><tbody>${sets.map((s, i) => `<tr class="t-${s.t || 'n'}"><td>${s.t === 'w' ? 'R' : setLabel(sets, i)}${s.t === 'd' ? ' ↓' : s.t === 'f' ? ' U' : ''}</td>${cols.map(([f]) => `<td>${f === 's' && k === 'time' ? fmtSec(s.s) : esc(inVal(s, f, k) || '—')}</td>`).join('')}<td class="nt">${esc(s.note || '')}${s.pr ? ` <span class="prs">${STARS}</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
  }
  function sumStrip(sets, k) {
    const ws = work(sets);
    if (k === 'wr') return `<div class="strip mini"><div><small>Powt.</small><b>${ws.reduce((a, s) => a + (s.r || 0), 0)}</b></div><div><small>Serie</small><b>${ws.length}</b></div><div><small>1RM</small><b>${fmtRM(Math.max(0, ...ws.map(s => e1rm(s.kg, s.r))))} ${U()}</b></div><div><small>Objętość</small><b>${fmtVol(volOf(sets, k))} ${U()}</b></div></div>`;
    if (k === 'bw') return `<div class="strip mini"><div><small>Powt.</small><b>${ws.reduce((a, s) => a + (s.r || 0), 0)}</b></div><div><small>Serie</small><b>${ws.length}</b></div><div><small>Max</small><b>${Math.max(0, ...ws.map(s => s.r || 0))}</b></div></div>`;
    if (k === 'time') return `<div class="strip mini"><div><small>Serie</small><b>${ws.length}</b></div><div><small>Łącznie</small><b>${fmtSec(ws.reduce((a, s) => a + (s.s || 0), 0))}</b></div><div><small>Najdłużej</small><b>${fmtSec(Math.max(0, ...ws.map(s => s.s || 0)))}</b></div></div>`;
    return `<div class="strip mini"><div><small>Czas</small><b>${r0(ws.reduce((a, s) => a + (s.s || 0), 0) / 60)} min</b></div><div><small>Dystans</small><b>${nf(ws.reduce((a, s) => a + (s.km || 0), 0), 2)} km</b></div><div><small>Kcal</small><b>${r0(ws.reduce((a, s) => a + (s.kcal || 0), 0))}</b></div></div>`;
  }
  function workoutScreen(d) {
    const w = state.workouts[d.id], s = wStats(w);
    const body = groupsOf(w.ex).map(([, g]) => { const cards = g.map(e => { const x = exOf(e); return `<section class="hcard"><header><button class="exn" data-exinfo="${e.eid}"><b>${esc(x.name)}</b></button>${e.note ? `<small>${esc(e.note)}</small>` : ''}</header>${histTable(e.sets, x.kind)}${sumStrip(e.sets, x.kind)}</section>`; }).join(''); return g.length > 1 ? `<div class="ssg"><div class="ss-l">Superseria</div>${cards}</div>` : cards; }).join('');
    return `${dtBar(esc(w.name), `<button class="tb-i" data-wmenu="${w.id}" aria-label="Opcje">${DOTSC}</button>`)}<div class="dt-body">
      <div class="eyebrow">${dateLabel(w.start)} · ${hhmm(w.start)}–${hhmm(w.end)}</div><h1 class="big">${esc(w.name)}</h1>
      <div class="strip"><div><small>Czas</small><b>${fmtDurS(s.ms)}</b></div><div><small>Serie</small><b>${s.sets}</b></div><div><small>Objętość</small><b>${fmtVol(s.vol)} ${U()}</b></div><button class="stpr" data-wprs="${w.id}" ${w.prs?.length ? '' : 'disabled'}><small>Rekordy</small><b class="acc">${w.prs?.length || 0}</b></button></div>
      ${w.note ? `<div class="ai-note">${esc(w.note)}</div>` : ''}
      <button class="primary acc bigbtn" data-repeat="${w.id}">${AGAIN}<span>Powtórz trening</span></button>
      <div class="hlist">${body}</div></div>`;
  }
  function workoutActions(id) {
    const w = state.workouts[id]; if (!w) return;
    overlay.innerHTML = sheet(esc(w.name), dateLabel(w.start), `<div class="ilist"><button class="irow" data-a="edit"><span class="ir-t"><b>Edytuj trening</b><small>serie, dzień, godzina, czas</small></span>${CHEV}</button><button class="irow" data-a="plan"><span class="ir-t"><b>Zapisz jako plan</b></span></button>${routineDiff(w, w.rid && state.routines[w.rid]) ? `<button class="irow" data-a="upd"><span class="ir-t"><b>Zaktualizuj plan „${esc(state.routines[w.rid].name)}”</b><small>ćwiczenia i liczba serii jak w tym treningu</small></span></button>` : ''}</div><div class="ilist"><button class="irow out" data-a="del"><span class="ir-t"><b>Usuń trening</b></span></button></div>`, 'Opcje treningu');
    overlay.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.a;
      if (act === 'edit') {
        if (state.active) { close(); toast('Najpierw zakończ trwający trening'); return; }
        state.active = { ...deep(w), edit: w.id }; state.active.ex.forEach(e => { e.tg = []; e.sets.forEach(s => { s.note = s.note || ''; delete s.pr; }); });
        save(); close(); stack = []; openWorkout();
      }
      if (act === 'upd') { const r = state.routines[w.rid]; r.ex = w.ex.map(e => ({ eid: e.eid, w: e.sets.filter(x => x.t === 'w').length, n: work(e.sets).length || 1, note: r.ex.find(x => x.eid === e.eid)?.note || '', sup: e.sup || null })); save(); close(); toast('Plan zaktualizowany'); return; }
      if (act === 'plan') { const r = { id: uid('r'), name: w.name, created: Date.now(), note: '', target: 'latest', ex: w.ex.map(e => ({ eid: e.eid, w: e.sets.filter(x => x.t === 'w').length, n: work(e.sets).length || 1, note: '', sup: e.sup || null })) }; state.routines[r.id] = r; save(); close(); toast(`Zapisano plan „${r.name}”`); tab = 'routines'; stack = [{ type: 'r', id: r.id }]; render(); }
      if (act === 'del') {
        overlay.innerHTML = sheet('Usunąć trening?', esc(w.name), `<div class="confirm"><button data-close>Anuluj</button><button class="yes" id="cd-yes">Usuń</button></div>`);
        $('cd-yes').addEventListener('click', () => { delete state.workouts[id]; finished().filter(x => x.start > w.start).reverse().forEach(x => { x.prs = computePRs(x); }); save(); close(); stack = stack.filter(z => !(z.type === 'w' && z.id === id)); render(); toast('Usunięto'); });
      }
    }));
  }

  /* ----- Plany ----- */
  const routinesSorted = () => Object.values(state.routines).sort((a, b) => (a.order ?? a.created ?? 0) - (b.order ?? b.created ?? 0));
  function renderRoutines() {
    const rs = routinesSorted();
    const rows = rs.map((r, i) => { const last = finished().find(w => w.rid === r.id), sets = r.ex.reduce((a, e) => a + (+e.n || 0), 0); return `<button class="irow" data-r="${r.id}" style="--i:${i}"><span class="ir-t"><b>${esc(r.name)}</b><small>${r.ex.length} ćw. · ${sets} serii${last ? ' · ostatnio ' + ago(last.start) : ''}</small></span>${CHEV}</button>`; }).join('');
    tabView.innerHTML = `${head('Plany', 'Ułóż trening raz — startuj jednym dotknięciem', `<button class="hbtn" data-rnew aria-label="Nowy plan">${PLUS}</button>`)}
      ${rs.length ? `<div class="ilist${animTab ? ' enter' : ''}">${rows}</div>` : emptyCard('Brak planów', 'Plan to lista ćwiczeń z liczbą serii. Ciężary i powtórzenia podpowiadają się z ostatniego razu.', '<button class="primary acc" data-rnew>Nowy plan</button>')}
      <div class="ilist"><button class="irow" data-templates><span class="ir-t"><b>Gotowe plany</b><small>Push/Pull/Legs, Góra/Dół, FBW, 5×5</small></span>${CHEV}</button></div>`;
  }
  function newRoutine() { const r = { id: uid('r'), name: 'Nowy plan', note: '', target: 'latest', created: Date.now(), ex: [] }; state.routines[r.id] = r; save(); pushDetail({ type: 'r', id: r.id, fresh: true }); }
  function routineScreen(d) {
    const r = state.routines[d.id], sets = r.ex.reduce((a, e) => a + (+e.n || 0) + (+e.w || 0), 0);
    const rows = groupsOf(r.ex).map(([i0, g]) => { const inner = g.map((e, gi) => { const i = i0 + gi, x = exOf(e); return `<button class="irow" data-rex="${i}"><span class="ir-t"><b>${esc(x.name)}</b><small>${e.w ? `${e.w} ${plural(e.w, 'rozgrzewkowa', 'rozgrzewkowe', 'rozgrzewkowych')} + ` : ''}${e.n} ${plural(e.n, 'seria', 'serie', 'serii')}</small>${e.note ? `<small class="nt">${esc(e.note)}</small>` : ''}</span>${CHEV}</button>`; }).join(''); return g.length > 1 ? `<div class="ssg in"><div class="ss-l">Superseria</div>${inner}</div>` : inner; }).join('');
    return `${dtBar('', `<button class="tb-i" data-rmenu="${r.id}" aria-label="Opcje planu">${DOTSC}</button>`)}<div class="dt-body">
      <h1 class="big">${esc(r.name)}</h1>
      <button class="startbtn" data-rstart="${r.id}" ${r.ex.length ? '' : 'disabled'}><span>Start!</span>${SEA_SVG}</button>
      <div class="ilist">
        <label class="irow"><span class="ir-t"><b>Nazwa</b></span><input class="ir-in" data-rname type="text" maxlength="60" value="${esc(r.name)}" autocomplete="off"></label>
        <button class="irow" data-rtarget><span class="ir-t"><b>Ciężary i powtórzenia</b></span><span class="ir-v">${r.target === 'routine' ? 'Z tego planu' : 'Ostatnie'}</span>${CHEV}</button>
        <label class="irow"><span class="ir-t"><b>Notatka</b></span><input class="ir-in" data-rnote type="text" maxlength="200" value="${esc(r.note || '')}" placeholder="np. progresja +2,5 kg" autocomplete="off"></label>
      </div>
      <div class="grp"><h3>Ćwiczenia</h3><em>${r.ex.length} ćw. · ${sets} serii</em></div>
      <div class="ilist">${rows}<button class="irow addrow" data-radd>${PLUSC}<span class="ir-t"><b>Dodaj ćwiczenie</b></span></button></div></div>`;
  }
  function routineEx(rid, i) {
    const r = state.routines[rid], e = r.ex[i], x = exOf(e), next = r.ex[i + 1];
    let w = e.w || 0, n = e.n || 1;
    overlay.innerHTML = sheet(esc(x.name), esc(exSub(x)), `
      <div class="ilist"><div class="irow static"><span class="ir-t"><b>Serie rozgrzewkowe</b></span><span class="stp"><button data-sw="-1" aria-label="Mniej">−</button><b id="re-w">${w}</b><button data-sw="1" aria-label="Więcej">+</button></span></div>
      <div class="irow static"><span class="ir-t"><b>Serie robocze</b></span><span class="stp"><button data-sn2="-1" aria-label="Mniej">−</button><b id="re-n">${n}</b><button data-sn2="1" aria-label="Więcej">+</button></span></div></div>
      <div class="field"><label for="re-note">Notatka</label><input id="re-note" type="text" maxlength="200" value="${esc(e.note || '')}" placeholder="np. 8–12 powt., tempo 3-1-1, RPE 8" autocomplete="off"></div>
      <div class="ilist">
        ${next ? `<button class="irow" data-ra="sup"><span class="ir-t"><b>${e.sup && next.sup === e.sup ? 'Rozłącz z następnym' : 'Superseria z następnym'}</b><small>${esc(exOf(next).name)}</small></span></button>` : ''}
        ${i > 0 ? '<button class="irow" data-ra="up"><span class="ir-t"><b>Przesuń wyżej</b></span></button>' : ''}${next ? '<button class="irow" data-ra="down"><span class="ir-t"><b>Przesuń niżej</b></span></button>' : ''}
        <button class="irow" data-ra="info"><span class="ir-t"><b>Historia, wykres i rekordy</b></span>${CHEV}</button>
      </div>
      <button class="primary acc" id="re-save">Gotowe</button>
      <div class="ilist"><button class="irow out" data-ra="del"><span class="ir-t"><b>Usuń z planu</b></span></button></div>`, 'Ćwiczenie w planie');
    overlay.querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => { w = Math.max(0, Math.min(10, w + +b.dataset.sw)); $('re-w').textContent = w; }));
    overlay.querySelectorAll('[data-sn2]').forEach(b => b.addEventListener('click', () => { n = Math.max(1, Math.min(20, n + +b.dataset.sn2)); $('re-n').textContent = n; }));
    const keep = () => { e.w = w; e.n = n; e.note = $('re-note').value.trim(); };
    $('re-save').addEventListener('click', () => { keep(); save(); close(); render(); });
    overlay.querySelectorAll('[data-ra]').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.ra; keep();
      if (m === 'info') { save(); close(); pushDetail({ type: 'ex', eid: e.eid, tab: 'hist' }); return; }
      if (m === 'sup') { if (e.sup && next.sup === e.sup) { next.sup = null; tidySup(r.ex); } else { const id = e.sup || next.sup || uid('s'); e.sup = id; next.sup = id; } }
      if (m === 'up' || m === 'down') { const j = m === 'up' ? i - 1 : i + 1;[r.ex[i], r.ex[j]] = [r.ex[j], r.ex[i]]; tidySup(r.ex); }
      if (m === 'del') { r.ex.splice(i, 1); tidySup(r.ex); }
      save(); close(); render();
    }));
  }
  function routineMenu(id) {
    const r = state.routines[id];
    overlay.innerHTML = sheet(esc(r.name), '', `<div class="ilist"><button class="irow" data-rm="dup"><span class="ir-t"><b>Duplikuj plan</b></span></button></div><div class="ilist"><button class="irow out" data-rm="del"><span class="ir-t"><b>Usuń plan</b><small>treningi z tego planu zostaną w historii</small></span></button></div>`, 'Opcje planu');
    overlay.querySelector('[data-rm="dup"]').addEventListener('click', () => { const c = { ...deep(r), id: uid('r'), name: r.name + ' (kopia)', created: Date.now() }; delete c.order; state.routines[c.id] = c; save(); close(); stack[stack.length - 1] = { type: 'r', id: c.id }; render(); toast('Skopiowano plan'); });
    overlay.querySelector('[data-rm="del"]').addEventListener('click', () => {
      overlay.innerHTML = sheet('Usunąć plan?', esc(r.name), `<div class="confirm"><button data-close>Anuluj</button><button class="yes" id="rd-yes">Usuń</button></div>`);
      $('rd-yes').addEventListener('click', () => { delete state.routines[id]; save(); close(); stack = stack.filter(z => !(z.type === 'r' && z.id === id)); render(); toast('Plan usunięty'); });
    });
  }
  function openTemplates() {
    overlay.innerHTML = sheet('Gotowe plany', 'Klasyczne podziały — możesz je potem zmieniać', `<div class="tpls">${TEMPLATES.map(t => `<div class="tpl"><div><b>${t.name}</b><small>${t.desc}</small><p>${t.rs.map(r => r[0]).join(' · ')}</p></div><button class="allweek" data-tpl="${t.id}">${PLUS}<span>Dodaj</span></button></div>`).join('')}</div>`, 'Gotowe plany');
    overlay.querySelectorAll('[data-tpl]').forEach(b => b.addEventListener('click', () => {
      const t = TEMPLATES.find(x => x.id === b.dataset.tpl), base = Date.now();
      t.rs.forEach(([name, ex], i) => { const r = { id: uid('r'), name, note: t.name, target: 'latest', created: base + i, ex: ex.map(([eid, w, n, note]) => ({ eid: canon(eid), w, n, note, sup: null })) }; state.routines[r.id] = r; });
      save(); b.disabled = true; b.innerHTML = `<span>✓ Dodano</span>`;
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
    const u = use.get(x.id);
    return `<button class="irow xrow${opts.sel ? ' on' : ''}" ${opts.pick ? `data-pex="${x.id}"` : `data-exinfo="${x.id}"`} style="--i:${i}"><span class="ir-t"><b>${esc(x.name)}${x.custom ? ' <i class="own">własne</i>' : ''}</b><small>${esc(exSub(x))}${u ? ` · ${u.n}× · ${ago(u.last)}` : ''}</small></span>${opts.pick ? '<span class="pk">✓</span>' : CHEV}</button>`;
  }
  const eqOk = (x, eq) => eq === 'all' || (eq.startsWith('cat:') ? x.category === eq.slice(4) : x.equipment === eq);
  function exFiltered(q, mus, eq = 'all') {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    return allEx().filter(x => (mus === 'all' || (x.primary || []).includes(mus)) && eqOk(x, eq) && (!words.length || words.every(w => norm(x.name).includes(w) || norm(musList(x.primary)).includes(w) || norm(EQUIP_PL[x.equipment] || '').includes(w))));
  }
  function exListHtml(list, use, opts = {}) {
    let i = 0, html = '';
    const blk = (title, xs) => `<div class="grp"><h3>${title}</h3><em>${xs.length}</em></div><div class="ilist">${xs.map(x => exRow(x, i++, use, { ...opts, sel: opts.sel?.includes(x.id) })).join('')}</div>`;
    if (opts.grouped) {
      const recent = [...use.entries()].sort((a, b) => b[1].last - a[1].last).slice(0, 6).map(([id]) => exById(id)).filter(Boolean);
      if (recent.length) html += blk('Ostatnio', recent);
      MUSCLES.forEach(([m, name]) => { const xs = list.filter(x => (x.primary || [])[0] === m); if (xs.length) html += blk(name, xs); });
      const rest = list.filter(x => !MUSCLE_PL[(x.primary || [])[0]]); if (rest.length) html += blk('Inne', rest);
    } else html = list.length ? `<div class="ilist">${list.map(x => exRow(x, i++, use, { ...opts, sel: opts.sel?.includes(x.id) })).join('')}</div>` : '';
    return html || '<p class="empty">Brak ćwiczeń — dodaj własne</p>';
  }
  const musChips = (cur, attr) => `<div class="mchips"><button class="${cur === 'all' ? 'on' : ''}" ${attr}="all">Wszystkie mięśnie</button>${MUSCLES.map(([m, n]) => `<button class="${cur === m ? 'on' : ''}" ${attr}="${m}">${n}</button>`).join('')}</div>`;
  const eqChips = (cur, attr) => `<div class="mchips eq">${EQ_FILTERS.map(([v, n]) => `<button class="${cur === v ? 'on' : ''}" ${attr}="${v}">${n}</button>`).join('')}</div>`;
  function renderExercises() {
    if (!tabView.querySelector('#x-q')) tabView.innerHTML = `${head('Ćwiczenia', `${allEx().length} ćwiczeń · baza free-exercise-db`, `<button class="hbtn" data-xnew aria-label="Nowe ćwiczenie">${PLUS}</button>`)}<label class="hsearch">${SEARCH}<input id="x-q" type="search" placeholder="Szukaj ćwiczenia" autocomplete="off"></label><div id="x-mus"></div><div id="x-list"></div>`;
    $('x-mus').innerHTML = musChips(xMus, 'data-xmus') + eqChips(xEq, 'data-xeq');
    const list = exFiltered(xQuery, xMus, xEq);
    $('x-list').innerHTML = `<p class="cnt">${list.length} ${plural(list.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}</p>` + exListHtml(list, exUse(), { grouped: !xQuery.trim() && xMus === 'all' && xEq === 'all' });
  }
  // wybór ćwiczeń: do treningu, do planu albo zamiana (przełącznik „Superseria” nad listą jak w RepCount)
  let pick = null;
  function openPicker(mode, cb) {
    pick = { mode, cb, sel: [], q: '', mus: 'all', eq: 'all', ss: false };
    if (mode === 'workout') pick.cb = (ids, ss) => addToWorkout(ids, ss);
    drawPicker();
  }
  function addToWorkout(ids, ss) {
    const a = state.active; if (!a) return;
    const sup = ss && ids.length > 1 ? uid('s') : null;
    ids.forEach(id => a.ex.push(newEntry(id, { sup })));
    save(); close(); render();
    setTimeout(() => { const c = wkLayer.querySelector(`.exc[data-x="${a.ex.length - ids.length}"]`); c?.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }); }, 60);
  }
  function drawPicker() {
    const p = pick;
    overlay.innerHTML = sheet(p.mode === 'swap' ? 'Zamień ćwiczenie' : 'Dodaj ćwiczenia', '', `
      <label class="hsearch">${SEARCH}<input id="p-q" type="search" placeholder="Szukaj" value="${esc(p.q)}" autocomplete="off"></label>
      <div class="ilist"><button class="irow addrow" id="p-new">${PLUSC}<span class="ir-t"><b>Nowe własne ćwiczenie</b></span></button></div>
      ${p.mode === 'swap' ? '' : `<label class="switch"><span>Superseria</span><input type="checkbox" id="p-ss" ${p.ss ? 'checked' : ''}><i></i></label>`}
      <div id="p-mus">${musChips(p.mus, 'data-pmus')}${eqChips(p.eq, 'data-peq')}</div>
      <div class="plist" id="p-list"></div>
      ${p.mode === 'swap' ? '' : '<div class="pfoot" id="p-foot"></div>'}`, 'Wybór ćwiczeń', 'tall picker');
    drawPickList();
    $('p-q').addEventListener('input', e => { p.q = e.target.value; drawPickList(); });
    $('p-ss')?.addEventListener('change', e => { p.ss = e.target.checked; drawPickFoot(); });
    $('p-new').addEventListener('click', () => openCustomEx(null, x => { p.sel.push(x.id); p.q = ''; if (p.mode === 'swap') { p.cb([x.id]); return; } drawPicker(); }, () => drawPicker()));
  }
  function drawPickList() { const p = pick, list = $('p-list'); if (!list) return; list.innerHTML = exListHtml(exFiltered(p.q, p.mus, p.eq), exUse(), { pick: true, sel: p.sel, grouped: !p.q.trim() && p.mus === 'all' && p.eq === 'all' }); drawPickFoot(); }
  function drawPickFoot() {
    const p = pick, f = $('p-foot'); if (!f || !p) return;
    f.innerHTML = `<span class="pf-n">${p.sel.length ? `${p.sel.length} ${plural(p.sel.length, 'wybrane', 'wybrane', 'wybranych')}${p.ss && p.sel.length > 1 ? ' · superseria' : ''}` : 'Zaznacz ćwiczenia'}</span><button class="primary acc" id="p-add" ${p.sel.length ? '' : 'disabled'}>Dodaj</button>`;
    $('p-add').addEventListener('click', () => { const s = pick; pick = null; s.cb(s.sel, s.ss); });
  }
  function openCustomEx(x, done, back) {
    const ed = !!x; x = x || { name: '', primary: [], secondary: [], equipment: 'barbell', kind: 'wr' };
    // mięśnie: dotknięcie na mapie albo na liście — główny → pomocniczy → brak
    const pr = new Set(x.primary || []), se = new Set(x.secondary || []);
    let eq = x.equipment ?? 'none';
    const EQS = Object.keys(EQUIP_PL);
    overlay.innerHTML = sheet(ed ? 'Edytuj ćwiczenie' : 'Nowe ćwiczenie', 'Własne ćwiczenie', `
      <div class="field"><label for="c-name">Nazwa</label><input id="c-name" type="text" maxlength="60" value="${esc(x.name)}" placeholder="np. Smith Machine Shrug" autocomplete="off"></div>
      <div class="field"><span class="lab">Mięśnie <em class="lab-h">dotknij: główny → pomocniczy → brak</em></span><div class="mm pickmap" id="c-map"></div><div class="mchips wrap" id="c-mus"></div></div>
      <div class="field"><span class="lab">Sprzęt</span><div class="mchips wrap" id="c-eq">${EQS.map(k => `<button type="button" data-ceq="${k}" class="${eq === k ? 'on' : ''}">${EQUIP_PL[k]}</button>`).join('')}</div></div>
      <div class="field"><span class="lab">Co zapisujesz</span><div class="seg seg4">${KINDS.map(([k, n]) => `<label><input type="radio" name="c-kind" value="${k}"${x.kind === k ? ' checked' : ''}>${k === 'wr' ? 'Ciężar' : n}</label>`).join('')}</div></div>
      <div class="sheet-foot"><button class="primary acc" id="c-save">${ed ? 'Zapisz' : 'Dodaj ćwiczenie'}</button>${ed ? '<button class="danger" id="c-del">Usuń</button>' : ''}</div>`, 'Własne ćwiczenie', 'tall');
    const drawMus = () => {
      $('c-map').innerHTML = bodyMap([...pr], [...se]);
      $('c-mus').innerHTML = MUSCLES.map(([m, n]) => `<button type="button" data-cmus="${m}" class="${pr.has(m) ? 'on' : se.has(m) ? 'half' : ''}">${n}</button>`).join('');
    };
    const cycle = m => { if (pr.has(m)) { pr.delete(m); se.add(m); } else if (se.has(m)) se.delete(m); else pr.add(m); drawMus(); };
    drawMus();
    $('c-map').addEventListener('click', ev => { const g = ev.target.closest('[data-m]'); if (g) cycle(g.dataset.m); });
    $('c-mus').addEventListener('click', ev => { const b = ev.target.closest('[data-cmus]'); if (b) cycle(b.dataset.cmus); });
    $('c-eq').addEventListener('click', ev => { const b = ev.target.closest('[data-ceq]'); if (!b) return; eq = b.dataset.ceq; $('c-eq').querySelectorAll('button').forEach(z => z.classList.toggle('on', z === b)); });
    if (back) overlay.querySelector('.sheet-h .x').addEventListener('click', ev => { ev.stopPropagation(); back(); });
    if (matchMedia('(hover: hover)').matches) $('c-name').focus();
    $('c-save').addEventListener('click', () => {
      const name = $('c-name').value.trim(); if (!name) { toast('Wpisz nazwę'); $('c-name').focus(); return; }
      const kind = overlay.querySelector('[name=c-kind]:checked')?.value || 'wr';
      const nx = { id: x.id || uid('e'), name, primary: [...pr], secondary: [...se].filter(m => !pr.has(m)), equipment: eq === 'none' ? null : eq, category: kind === 'cardio' ? 'cardio' : 'strength', kind, custom: true };
      state.exercises[nx.id] = nx; save(); toast(ed ? 'Zapisano' : `Dodano „${name}”`);
      if (done) done(nx); else { close(); render(); }
    });
    $('c-del')?.addEventListener('click', () => {
      const used = exUse().get(x.id)?.n || 0;
      overlay.innerHTML = sheet('Usunąć ćwiczenie?', esc(x.name), `${used ? `<p class="hint">Jest w ${used} treningach — tam zostanie pod tą samą nazwą.</p>` : ''}<div class="confirm"><button data-close>Anuluj</button><button class="yes" id="cx-yes">Usuń</button></div>`);
      $('cx-yes').addEventListener('click', () => { finished().forEach(w => w.ex.forEach(e => { if (e.eid === x.id) e.n = x.name; })); delete state.exercises[x.id]; save(); close(); stack = stack.filter(z => !(z.type === 'ex' && z.eid === x.id)); render(); toast('Usunięto'); });
    });
  }

  /* ----- ekran ćwiczenia: historia, wykres, rekordy (jak w RepCount) ----- */
  const METRICS = {
    wr: [['e1rm', 'Szacowany 1RM', 'w'], ['top', 'Najcięższy ciężar', 'w'], ['vol', 'Objętość', 'w'], ['reps', 'Powtórzenia', ''], ['sets', 'Serie', '']],
    bw: [['maxr', 'Najwięcej powtórzeń', ''], ['reps', 'Powtórzenia', ''], ['sets', 'Serie', ''], ['top', 'Obciążenie', 'w']],
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
  function exerciseScreen(d) {
    const x = exAny(d.eid), k = x.kind, ss = sessionsOf(d.eid);
    d.tab = d.tab || 'hist';
    const tabs = `<div class="smode s4 xtabs"><button data-xt2="hist" class="${d.tab === 'hist' ? 'on' : ''}">Historia</button><button data-xt2="chart" class="${d.tab === 'chart' ? 'on' : ''}">Wykres</button><button data-xt2="rec" class="${d.tab === 'rec' ? 'on' : ''}">Rekordy</button><button data-xt2="info" class="${d.tab === 'info' ? 'on' : ''}">Opis</button></div>`;
    let body;
    if (d.tab === 'info') body = infoHtml(x);
    else if (!ss.length) body = emptyCard('Brak danych', 'Zrób to ćwiczenie na treningu — tu pojawi się historia, wykres i rekordy.');
    else if (d.tab === 'hist') body = `<div class="hlist">${ss.slice().reverse().slice(0, 80).map(s => `<section class="hcard"><header><button class="hd" data-w="${s.w.id}">${dateLabel(s.w.start)}</button><small>${esc(s.w.name)}</small></header>${s.e.note ? `<p class="exnote">${esc(s.e.note)}</p>` : ''}${histTable(s.sets, k)}${sumStrip(s.sets, k)}</section>`).join('')}</div>`;
    else if (d.tab === 'chart') {
      const ms = METRICS[k], mm = ms.find(z => z[0] === d.m) || ms[0]; d.m = mm[0];
      const from = d.range === '3m' ? Date.now() - 92 * 864e5 : d.range === '1y' ? Date.now() - 365 * 864e5 : 0;
      const pts = ss.filter(s => s.w.start >= from).map(s => ({ x: s.w.start, y: metricVal(mm[0], s.sets) * (mm[2] === 'w' ? uf() : 1), wid: s.w.id }));
      d.pts = pts; d.mm = mm;
      const sel = pts[Math.min(d.sel ?? pts.length - 1, pts.length - 1)];
      // historia rekordów: kolejne pobite maksima
      const recs = []; let best = -1; ss.forEach(s => { const v = metricVal(mm[0], s.sets) * (mm[2] === 'w' ? uf() : 1); if (v > best + 1e-9) { best = v; recs.push({ x: s.w.start, y: v, wid: s.w.id }); } });
      body = `<div class="chips mets">${ms.map(([id, l]) => `<button class="${id === mm[0] ? 'on' : ''}" data-xm="${id}">${l}</button>`).join('')}</div>
        <div class="mcard" id="x-sel">${sel ? selCard(mm, sel) : ''}</div>
        <div class="chart-box" id="x-chart">${chart(pts, v => fmtMv(mm, v), { sel: d.sel ?? pts.length - 1 })}</div>
        <div class="smode s3 rng"><button data-xr="3m" class="${d.range === '3m' ? 'on' : ''}">3 mies.</button><button data-xr="1y" class="${d.range === '1y' ? 'on' : ''}">Rok</button><button data-xr="all" class="${!d.range || d.range === 'all' ? 'on' : ''}">Wszystko</button></div>
        ${recs.length > 1 ? `<div class="grp"><h3>Historia rekordów</h3><em>${esc(mm[1])}</em></div><div class="ilist">${recs.slice().reverse().slice(0, 30).map(r => `<button class="irow" data-w="${r.wid}"><span class="ir-t"><b>${dateLabel(r.x)}</b></span><span class="ir-v">${fmtMv(mm, r.y)}${mUnit(mm)}</span>${CHEV}</button>`).join('')}</div>` : ''}`;
    } else body = recordsHtml(d, ss, k);
    return `${dtBar(esc(x.name), x.custom ? `<button class="tb-i" data-xedit="${x.id}" aria-label="Edytuj ćwiczenie">${DOTSC}</button>` : '')}<div class="dt-body"><div class="eyebrow">${esc([x.equipment ? EQUIP_PL[x.equipment] : '', CAT_PL[x.category] || '', kindName(x.kind)].filter(Boolean).join(' · '))}</div><h1 class="big">${esc(x.name)}</h1>${musCard(x)}${tabs}${body}</div>`;
  }
  // karta z mapą mięśni: główne (żółte) i pomocnicze (jaśniejsze)
  function musCard(x) {
    const p = x.primary || [], sc = x.secondary || [];
    const tag = (m, cls) => `<span class="mtag ${cls}" data-mus="${esc(m)}">${muscleName(m)}</span>`;
    return `<section class="muscard"><div class="mm">${bodyMap(p, sc)}</div><div class="ml"><div><small>Główne</small><p>${p.map(m => tag(m, 'p')).join('') || '<span class="mtag">—</span>'}</p></div>${sc.length ? `<div><small>Pomocnicze</small><p>${sc.map(m => tag(m, 's')).join('')}</p></div>` : ''}</div></section>`;
  }
  // opis z bazy: zdjęcia (pozycja startowa i końcowa), parametry i instrukcja (po angielsku)
  let INSTR = null, instrLoading = null;
  function loadInstr() {
    if (INSTR || instrLoading) return instrLoading;
    instrLoading = fetch('data/instructions.json').then(r => r.json()).then(j => { INSTR = j; }).catch(() => { instrLoading = null; }).then(() => { if (stack[stack.length - 1]?.tab === 'info') render(); });
    return instrLoading;
  }
  function infoHtml(x) {
    const imgs = x.img ? [0, 1].slice(0, x.img).map(i => `<img src="${IMG_BASE}${encodeURIComponent(x.id)}/${i}.jpg" alt="${esc(x.name)} — ${i ? 'koniec ruchu' : 'początek ruchu'}" loading="lazy" onerror="this.remove()">`).join('') : '';
    const chips = [['Sprzęt', x.equipment ? EQUIP_PL[x.equipment] : 'Bez sprzętu'], ['Kategoria', CAT_PL[x.category]], ['Poziom', LEVEL_PL[x.level]], ['Ruch', MECH_PL[x.mechanic]], ['Siła', FORCE_PL[x.force]], ['Zapis', kindName(x.kind)]].filter(c => c[1]);
    let steps = '';
    if (x.custom) steps = '<p class="hint" style="text-align:left">Własne ćwiczenie — bez opisu z bazy.</p>';
    else if (INSTR) steps = (INSTR[x.id] || []).length ? `<ol class="steps">${INSTR[x.id].map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : '';
    else { loadInstr(); steps = '<p class="hint" style="text-align:left">Wczytuję opis…</p>'; }
    return `${imgs ? `<div class="eximg">${imgs}</div>` : ''}<div class="ilist">${chips.map(([k, v]) => `<div class="irow static"><span class="ir-t"><b>${k}</b></span><span class="ir-v body">${esc(v)}</span></div>`).join('')}</div>${steps ? `<div class="grp"><h3>Jak wykonać</h3><em>EN</em></div>${steps}` : ''}<p class="hint src">Dane: free-exercise-db (domena publiczna)</p>`;
  }
  const fmtMv = (mm, v) => mm[2] === 'w' ? nf(v, 1) : mm[2] === 's' ? fmtSec(v) : mm[2] === 'km' ? nf(v, 2) : nf(v, 1);
  const mUnit = mm => mm[2] === 'w' ? ' ' + U() : mm[2] === 'km' ? ' km' : mm[2] === 'min' ? ' min' : '';
  const selCard = (mm, p) => `<small>${esc(mm[1])}</small><b>${fmtMv(mm, p.y)}<em>${mUnit(mm)}</em></b><span>${dateLabel(p.x)}</span><button data-w="${p.wid}" aria-label="Otwórz trening">${CHEV}</button>`;
  function recordsHtml(d, ss, k) {
    const years = [...new Set(ss.map(s => new Date(s.w.start).getFullYear()))].sort((a, b) => b - a);
    const sel = ss.filter(s => !d.year || d.year === 'all' || new Date(s.w.start).getFullYear() === +d.year);
    const all = sel.flatMap(s => work(s.sets).map(st => ({ ...st, at: s.w.start, wid: s.w.id })));
    const top = fn => all.reduce((b, s) => fn(s) > (b ? fn(b) : 0) ? s : b, null);
    const yt = `<div class="ytabs">${['all', ...years].map(y => `<button data-xy="${y}" class="${String(d.year || 'all') === String(y) ? 'on' : ''}">${y === 'all' ? 'Wszystkie' : y}</button>`).join('')}</div>`;
    const tile = (label, s, v) => s ? `<button class="rtile" data-w="${s.wid}"><small>${label}</small><b>${v}</b><span>${shortDate(s.at)}</span></button>` : '';
    let rep = '', other = '';
    if (k === 'wr' || k === 'bw') {
      // rekordy powtórzeń: najcięższy ciężar dla dokładnie N powtórzeń, bez wyników „przebitych” przez więcej powtórzeń
      const byR = new Map(); all.forEach(s => { if (!s.r) return; const b = byR.get(s.r); if (!b || (s.kg || 0) > (b.kg || 0)) byR.set(s.r, s); });
      const rs = [...byR.keys()].sort((a, b) => a - b).filter(r => ![...byR.keys()].some(r2 => r2 > r && (byR.get(r2).kg || 0) >= (byR.get(r).kg || 0)));
      if (k === 'wr' && rs.length) rep = `<div class="grp"><h3>Rekordy powtórzeń</h3></div><div class="ilist">${rs.slice(0, 20).map(r => { const s = byR.get(r); return `<button class="irow" data-w="${s.wid}"><span class="ir-t"><b>${r} ${plural(r, 'powtórzenie', 'powtórzenia', 'powtórzeń')} max</b><small>${dateLabel(s.at)}</small></span><span class="ir-v">${fmtW(s.kg)} ${U()}</span></button>`; }).join('')}</div>`;
    }
    if (k === 'wr') {
      const b1 = top(s => e1rm(s.kg, s.r)), bk = top(s => s.kg || 0), br = top(s => s.r || 0);
      const bv = sel.reduce((b, s) => { const v = volOf(s.sets, 'wr'); return v > (b?.v || 0) ? { v, at: s.w.start, wid: s.w.id } : b; }, null);
      other = tile('Szacowany 1RM', b1, b1 && `${fmtRM(e1rm(b1.kg, b1.r))} ${U()}`) + tile('Najcięższy ciężar', bk, bk && `${fmtW(bk.kg)} ${U()}`) + tile('Największa objętość', bv, bv && `${fmtVol(bv.v)} ${U()}`) + tile('Najwięcej powtórzeń', br, br && `${br.r} × ${fmtW(br.kg)}`);
    } else if (k === 'bw') {
      const br = top(s => s.r || 0), bk = top(s => s.kg || 0), bs = sel.reduce((b, s) => { const v = metricVal('reps', s.sets); return v > (b?.v || 0) ? { v, at: s.w.start, wid: s.w.id } : b; }, null);
      other = tile('Najwięcej powtórzeń', br, br && br.r) + tile('Powtórzenia w treningu', bs, bs && bs.v) + (bk?.kg ? tile('Największe obciążenie', bk, `+${fmtW(bk.kg)} ${U()}`) : '');
    } else if (k === 'time') {
      const bt = top(s => s.s || 0), bk = top(s => s.kg || 0);
      other = tile('Najdłużej', bt, bt && fmtSec(bt.s)) + (bk?.kg ? tile('Największe obciążenie', bk, `+${fmtW(bk.kg)} ${U()}`) : '');
    } else {
      const bt = top(s => s.s || 0), bd = top(s => s.km || 0), bc = top(s => s.kcal || 0);
      other = tile('Najdłużej', bt, bt && `${r0(bt.s / 60)} min`) + (bd?.km ? tile('Najdalej', bd, `${nf(bd.km, 2)} km`) : '') + (bc?.kcal ? tile('Najwięcej kcal', bc, r0(bc.kcal)) : '');
    }
    return `${years.length > 1 ? yt : ''}${rep}<div class="grp"><h3>Inne</h3></div><div class="rgrid2">${other}</div>${k === 'wr' ? '<p class="hint">1RM szacowany wzorem Epleya. Rekord N powtórzeń pokazany tylko, gdy nie przebija go wynik z większą liczbą powtórzeń.</p>' : ''}`;
  }
  // wykres: cienka linia = każdy trening, gruba = trend (średnia z kilku ostatnich), woda pod linią
  let chartN = 0;
  function chart(pts, fmt, opts = {}) {
    if (!pts.length) return '<p class="empty">Brak danych w tym okresie</p>';
    const W = 340, H = opts.h || 190, pl = 4, pr = 34, pt = 12, pb = 22, id = 'cg' + (++chartN);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys), padY = (hi - lo) * .15 || Math.abs(hi) * .1 || 1;
    const y0 = Math.max(0, lo - padY), y1 = hi + padY;
    const X = x => x1 === x0 ? (W - pr) / 2 : pl + (x - x0) / (x1 - x0) * (W - pl - pr), Y = y => pt + (1 - (y - y0) / (y1 - y0 || 1)) * (H - pt - pb);
    const path = arr => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    const n = Math.max(2, Math.min(5, Math.round(pts.length / 6))), trend = pts.map((p, i) => { const a = pts.slice(Math.max(0, i - n + 1), i + 1); return { x: p.x, y: a.reduce((s, q) => s + q.y, 0) / a.length }; });
    const line = path(pts), tl = path(trend), area = `${tl} L${X(pts[pts.length - 1].x).toFixed(1)} ${H - pb} L${X(pts[0].x).toFixed(1)} ${H - pb} Z`;
    const grid = [0, .33, .66, 1].map(f => { const v = y0 + (y1 - y0) * f, y = Y(v); return `<line x1="0" x2="${W - pr + 4}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="gl"/><text x="${W - 2}" y="${(y + 3).toFixed(1)}" class="gt" text-anchor="end">${fmt(v)}</text>`; }).join('');
    const yrs = new Set(); let xl = '';
    if (x1 - x0 > 400 * 864e5) pts.forEach(p => { const y = new Date(p.x).getFullYear(); if (!yrs.has(y)) { yrs.add(y); const jx = X(new Date(y, 0, 1).getTime()); if (jx > 20 && jx < W - pr - 10) xl += `<line x1="${jx.toFixed(1)}" x2="${jx.toFixed(1)}" y1="${pt}" y2="${H - pb}" class="gl v"/><text x="${jx.toFixed(1)}" y="${H - 6}" class="gt" text-anchor="middle">${y}</text>`; } });
    else xl = `<text x="${pl}" y="${H - 6}" class="gt">${shortDate(x0)}</text>${x1 !== x0 ? `<text x="${W - pr}" y="${H - 6}" class="gt" text-anchor="end">${shortDate(x1)}</text>` : ''}`;
    const sp = pts[Math.min(opts.sel ?? pts.length - 1, pts.length - 1)];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".32"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".02"/></linearGradient></defs>${grid}${xl}
      <path d="${area}" fill="url(#${id})" class="ar"/>${pts.length > 1 ? `<path d="${line}" class="ln thin"/><path d="${tl}" class="ln" pathLength="1"/>` : ''}
      <line class="cur" x1="${X(sp.x).toFixed(1)}" x2="${X(sp.x).toFixed(1)}" y1="${pt}" y2="${H - pb}"/><circle class="halo" cx="${X(sp.x).toFixed(1)}" cy="${Y(sp.y).toFixed(1)}" r="11"/><circle class="pt last" cx="${X(sp.x).toFixed(1)}" cy="${Y(sp.y).toFixed(1)}" r="5"/>
      <rect class="hit" x="0" y="0" width="${W - pr}" height="${H}" fill="transparent" data-geo="${X(x0)},${X(x1)},${W},${pl},${pr}"/></svg>`;
  }
  // dotknięcie / przeciągnięcie po wykresie wybiera trening (karta z wartością nad wykresem)
  function bindChart(d) {
    const box = $('x-chart'); if (!box || !d.pts?.length) return;
    const svg = box.querySelector('svg'); if (!svg) return;
    const pick = ev => {
      const r = svg.getBoundingClientRect(), W = 340, x = (ev.clientX - r.left) / r.width * W;
      const pts = d.pts, xs = pts.map(p => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs), X = v => x1 === x0 ? (W - 34) / 2 : 4 + (v - x0) / (x1 - x0) * (W - 4 - 34);
      let bi = 0, bd = 1e9; pts.forEach((p, i) => { const dd = Math.abs(X(p.x) - x); if (dd < bd) { bd = dd; bi = i; } });
      if (bi === d.sel) return; d.sel = bi;
      box.innerHTML = chart(pts, v => fmtMv(d.mm, v), { sel: bi }); box.querySelector('svg')?.classList.add('still');
      $('x-sel').innerHTML = selCard(d.mm, pts[bi]); bindChart(d);
    };
    let down = false;
    svg.addEventListener('pointerdown', ev => { down = true; pick(ev); });
    svg.addEventListener('pointermove', ev => { if (down || ev.pointerType === 'mouse') pick(ev); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => svg.addEventListener(t, () => { down = false; }));
  }

  /* ----- Postępy ----- */
  const spanStart = () => addDays(weekStart(new Date()), -(pWeeks - 1) * 7).getTime();
  const spanWorkouts = () => { const a = spanStart(); return finished().filter(w => w.start >= a); };
  let prevRing = null;
  function renderProgress() {
    const g = state.settings.weekGoal, ws0 = weekStart(new Date()), t = todayKey();
    const weeks = []; for (let i = pWeeks - 1; i >= 0; i--) { const a = addDays(ws0, -i * 7), b = addDays(a, 7), list = finished().filter(w => w.start >= a.getTime() && w.start < b.getTime()); weeks.push({ a, list, vol: list.reduce((x, w) => x + wStats(w).vol, 0) }); }
    const m = pWeeks > 8, span = spanWorkouts(), wk = weekWorkouts(0).length, p = g ? wk / g : 0, lv = waterLevel(Math.min(1, p));
    const lbl = wk2 => m ? (wk2.a.getDate() <= 7 ? MON_S[wk2.a.getMonth()] : '') : `${wk2.a.getDate()}.${pad(wk2.a.getMonth() + 1)}`;
    const maxN = Math.max(g * 1.25, ...weeks.map(w => w.list.length)) || 1, maxV = Math.max(...weeks.map(w => w.vol)) || 1;
    const barsN = weeks.map((w, j) => { const n = w.list.length; return `<div class="sb ${!n ? 'empty' : n >= g ? 'hit' : 'low'}" style="--j:${j}" title="tydzień od ${shortDate(w.a)}: ${n}"><span>${n || ''}</span><i style="height:${n / maxN * 100}%"></i></div>`; }).join('');
    const barsV = weeks.map((w, j) => `<div class="sb ${w.vol ? 'hit' : 'empty'}" style="--j:${j}" title="tydzień od ${shortDate(w.a)}: ${fmtVol(w.vol)} ${U()}"><span>${w.vol ? fmtK(w.vol * uf()) : ''}</span><i style="height:${w.vol / maxV * 100}%"></i></div>`).join('');
    const days = weeks.map(lbl).map((l, i) => `<span class="${i === weeks.length - 1 ? 't' : ''}">${l}</span>`).join('');
    const durs = span.map(w => w.end - w.start), avgDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0, hit = weeks.filter(w => w.list.length >= g).length;
    const mus = new Map(); span.forEach(w => w.ex.forEach(e => { const x = exOf(e); if (x.kind === 'cardio') return; const n = work(e.sets).length; (x.primary || []).forEach(m => mus.set(m, (mus.get(m) || 0) + n)); (x.secondary || []).forEach(m => mus.set(m, (mus.get(m) || 0) + n / 2)); }));
    const musL = [...mus.entries()].sort((a, b) => b[1] - a[1]), musMax = musL[0]?.[1] || 1;
    const heat = Object.fromEntries(musL.map(([m, n]) => [m, .18 + .82 * n / musMax]));
    const prs = span.flatMap(w => (w.prs || []).map(q => ({ ...q, at: w.start, wid: w.id }))).sort((a, b) => b.at - a.at);
    const body = Object.entries(state.body).filter(([, v]) => v).sort((a, b) => a[0].localeCompare(b[0]));
    const bspan = body.filter(([k]) => fromKey(k).getTime() >= spanStart()), bpts = (bspan.length > 1 ? bspan : body.slice(-12)).map(([k, v]) => ({ x: fromKey(k).getTime(), y: v * uf() }));
    const strip = DAYS.map((dn, i) => { const d = addDays(ws0, i), k = key(d), n = finished().filter(w => key(new Date(w.start)) === k).length; return `<span class="wd${n ? ' on' : ''}${k === t ? ' t' : ''}${k > t ? ' fut' : ''}"><i>${n ? '✓' : ''}</i><small>${dn}</small></span>`; }).join('');
    tabView.innerHTML = `${head('Postępy', `${span.length} ${plural(span.length, 'trening', 'treningi', 'treningów')} · średnio <b>${nf(span.length / pWeeks, 1)}</b> / tydz.`)}
      <div class="smode s3 pw"><button data-pw="8" class="${pWeeks === 8 ? 'on' : ''}">8 tyg.</button><button data-pw="26" class="${pWeeks === 26 ? 'on' : ''}">6 mies.</button><button data-pw="52" class="${pWeeks === 52 ? 'on' : ''}">Rok</button></div>
      <div class="sgrid">
        <section class="scard${animTab ? ' enter' : ''} wkcard" style="--i:0"><div class="ring${p >= 1 ? ' full' : ''}" style="--lv:${lv}"><i class="wv"></i><i class="wv b"></i><div class="ring-t"><small>ten tydzień</small><b>${wk}</b><small>z ${g} treningów</small></div></div><div class="wkr"><h3>Cel tygodnia</h3><small>${p >= 1 ? 'osiągnięty — tak trzymaj' : `jeszcze ${g - wk} ${plural(g - wk, 'trening', 'treningi', 'treningów')}`}</small><div class="schips"><span class="schip rec">Seria: ${weekStreak()} tyg.</span></div></div><div class="wstrip">${strip}</div></section>
        <section class="scard${animTab ? ' enter' : ''}" style="--i:1"><header><div><h3>Treningi w tygodniu</h3><small>w celu ${hit}/${pWeeks} tyg.</small></div><strong class="${hit >= pWeeks * .7 ? 'good' : hit >= pWeeks * .4 ? 'mid' : 'bad'}">${nf(span.length / pWeeks, 1)}</strong></header>
          <div class="sbars${m ? ' m' : ''}" style="--n:${pWeeks}">${barsN}<div class="starget" style="bottom:${g / maxN * 100}%"><span>${g}</span></div></div><div class="sdays${m ? ' m' : ''}" style="--n:${pWeeks}">${days}</div>
          <div class="schips"><span class="schip">Średnio ${fmtDur(avgDur)}</span><span class="schip">Łącznie ${nf(durs.reduce((a, b) => a + b, 0) / 36e5, 1)} h</span></div></section>
        <section class="scard${animTab ? ' enter' : ''}" style="--i:2"><header><div><h3>Objętość</h3><small>ciężar × powtórzenia, tygodniowo</small></div><strong class="good">${fmtK(span.reduce((a, w) => a + wStats(w).vol, 0) * uf())}<small style="display:inline;font-size:12px"> ${U()}</small></strong></header>
          <div class="sbars${m ? ' m' : ''}" style="--n:${pWeeks}">${barsV}</div><div class="sdays${m ? ' m' : ''}" style="--n:${pWeeks}">${days}</div></section>
        <section class="scard${animTab ? ' enter' : ''}" style="--i:3">${calendarHtml()}</section>
        <section class="scard${animTab ? ' enter' : ''}" style="--i:4"><header><div><h3>Masa ciała</h3><small>${body.length ? `ostatnio <b>${fmtW(body[body.length - 1][1])} ${U()}</b> · ${shortDate(fromKey(body[body.length - 1][0]).getTime())}` : 'zapisuj wagę, żeby widzieć trend'}</small></div></header>
          ${body.length ? `<div class="chart-box">${chart(bpts, v => nf(v, 1), { h: 150 })}</div>` : ''}<button class="allweek" data-body>${PLUS} Dodaj pomiar</button></section>
        <section class="scard${animTab ? ' enter' : ''}" style="--i:5"><header><div><h3>Partie mięśni</h3><small>serie robocze: mięsień główny 1, pomocniczy ½</small></div></header>
          ${musL.length ? `<div class="mm heatmap">${bodyMap([], [], heat)}</div><div class="macros">${musL.map(([mm, n]) => `<div class="mac"><span><i></i>${muscleName(mm)}</span><b><em>${nf(n, 1)}</em> serii</b><div class="tube"><i style="width:${n / musMax * 100}%"></i></div></div>`).join('')}</div>` : '<p class="empty" style="padding:16px">Brak treningów w tym okresie</p>'}</section>
        <section class="scard${animTab ? ' enter' : ''}" style="--i:6"><header><div><h3>Rekordy</h3><small>pobite w okresie</small></div><strong class="${prs.length ? 'good' : ''}">${prs.length}</strong></header>
          ${prs.length ? `<div class="ilist flat">${prs.slice(0, 10).map(q => `<button class="irow" data-w="${q.wid}"><span class="prs">${STAR}</span><span class="ir-t"><b>${esc(exAny(q.eid).name)}</b><small>${PR_NAME[q.t]} · ${shortDate(q.at)}</small></span><span class="ir-v">${prLabel(q)}</span></button>`).join('')}</div>` : '<p class="empty" style="padding:16px">Rekordy pojawią się, gdy pobijesz poprzednie wyniki</p>'}</section>
      </div>`;
    const ringEl = tabView.querySelector('.ring');
    if (ringEl && !calm() && prevRing !== lv) { const top = l => `calc(4% + ${(100 - l) * .96}%)`, from = prevRing ?? 0; ringEl.querySelectorAll('.wv').forEach(w => w.animate({ top: [top(from), top(lv)] }, { duration: 1300, easing: 'cubic-bezier(.3,.7,.3,1)' })); }
    prevRing = lv;
  }
  function calendarHtml() {
    const y = calMonth.getFullYear(), mo = calMonth.getMonth(), first = new Date(y, mo, 1), n = new Date(y, mo + 1, 0).getDate(), t = todayKey();
    const by = new Map(); finished().forEach(w => { const k = key(new Date(w.start)); by.set(k, (by.get(k) || 0) + 1); });
    let cells = '', cnt = 0;
    for (let i = 0; i < dow(first); i++) cells += '<span class="cday blank"></span>';
    for (let d = 1; d <= n; d++) { const k = key(new Date(y, mo, d)), c = by.get(k) || 0; cnt += c; cells += `<button class="cday${c ? ' on' : ''}${k === t ? ' t' : ''}${k > t ? ' fut' : ''}" ${c ? `data-cday="${k}"` : 'disabled'} style="--i:${d}">${d}</button>`; }
    const now = new Date(), isNow = y === now.getFullYear() && mo === now.getMonth();
    return `<header><div><h3>Kalendarz</h3><small><b>${cnt}</b> ${plural(cnt, 'trening', 'treningi', 'treningów')} w miesiącu</small></div><div class="calnav"><button class="navarr" data-cal="-1" aria-label="Poprzedni miesiąc">‹</button><b>${MONTHS[mo]} ${y}</b><button class="navarr" data-cal="1" aria-label="Następny miesiąc" ${isNow ? 'disabled' : ''}>›</button></div></header>
      <div class="calg">${DAYS.map(d => `<span class="cdh">${d}</span>`).join('')}${cells}</div>`;
  }
  function openDay(k) {
    const ws = finished().filter(w => key(new Date(w.start)) === k);
    if (ws.length === 1) { pushDetail({ type: 'w', id: ws[0].id }); return; }
    overlay.innerHTML = sheet(dateLabel(fromKey(k).getTime()), `${ws.length} treningi`, `<div class="ilist">${ws.map(w => `<button class="irow" data-w="${w.id}"><span class="ir-t"><b>${esc(w.name)}</b><small>${hhmm(w.start)} · ${fmtDur(w.end - w.start)}</small></span>${CHEV}</button>`).join('')}</div>`, 'Dzień');
  }

  /* ----- Więcej (ustawienia) ----- */
  function renderMore() {
    const s = state.settings, perm = 'Notification' in window ? Notification.permission : 'unsupported', cs = window.Cloud?.status;
    const tog = (k, on) => `<label class="switch"><input type="checkbox" data-set="${k}" ${on ? 'checked' : ''}><i></i></label>`;
    tabView.innerHTML = `${head('Więcej', '')}
      <div class="grp"><h3>Konto</h3></div>
      <div class="ilist"><div class="irow static"><span class="ir-t"><b>${esc(window.Cloud?.user?.email || 'Bez konta')}</b><small>${cs === 'ok' ? 'zsynchronizowano' : cs === 'syncing' ? 'synchronizacja…' : cs === 'offline' ? 'bez internetu — wyśle później' : cs === 'error' ? 'błąd synchronizacji' : ''}</small></span></div><button class="irow out" data-logout><span class="ir-t"><b>Wyloguj się</b></span></button></div>
      <div class="grp"><h3>Trening</h3></div>
      <div class="ilist">
        <div class="irow static"><span class="ir-t"><b>Jednostka</b></span><span class="smode u2"><button data-unit="kg" class="${s.unit !== 'lb' ? 'on' : ''}">kg</button><button data-unit="lb" class="${s.unit === 'lb' ? 'on' : ''}">lb</button></span></div>
        <div class="irow static"><span class="ir-t"><b>Przerwa między seriami</b><small>domyślna, można zmienić dla ćwiczenia</small></span><span class="smode u3">${REST_OPTS.map(o => `<button data-rest-set="${o}" class="${s.rest === o ? 'on' : ''}">${fmtSec(o)}</button>`).join('')}</span></div>
        <div class="irow static"><span class="ir-t"><b>Pytaj o przerwę po serii</b><small>po wpisaniu serii z boku pojawi się „Przerwa?”</small></span>${tog('autoRest', s.autoRest)}</div>
        <div class="irow static"><span class="ir-t"><b>Dźwięk na koniec przerwy</b></span>${tog('sound', s.sound)}</div>
        ${perm !== 'unsupported' ? `<button class="irow" data-notif ${perm !== 'default' ? 'disabled' : ''}><span class="ir-t"><b>Powiadomienie o końcu przerwy</b><small>${perm === 'granted' ? 'włączone' : perm === 'denied' ? 'zablokowane w przeglądarce' : 'gdy aplikacja jest w tle'}</small></span>${perm === 'default' ? '<span class="ir-v acc">Włącz</span>' : ''}</button>` : ''}
        <div class="irow static"><span class="ir-t"><b>Cel: treningów w tygodniu</b></span><span class="stp"><button data-goal-d="-1" aria-label="Mniej">−</button><b>${s.weekGoal}</b><button data-goal-d="1" aria-label="Więcej">+</button></span></div>
      </div>
      <div class="grp"><h3>Dane</h3></div>
      <div class="ilist">
        <button class="irow" data-body><span class="ir-t"><b>Masa ciała</b>${bodyLast() ? `<small>ostatnio ${fmtW(bodyLast()[1])} ${U()}</small>` : ''}</span>${CHEV}</button>
        <button class="irow" data-templates><span class="ir-t"><b>Gotowe plany</b></span>${CHEV}</button>
        <button class="irow" data-csv><span class="ir-t"><b>Eksportuj do Excela (CSV)</b><small>${finished().length} ${plural(finished().length, 'trening', 'treningi', 'treningów')}</small></span>${CHEV}</button>
      </div>
      <p class="ver">Traincker · wersja ${APP_VERSION}</p>`;
  }

  /* ----- masa ciała ----- */
  const bodyLast = () => Object.entries(state.body).filter(([, v]) => v).sort((a, b) => b[0].localeCompare(a[0]))[0];
  function openBody() {
    const last = bodyLast(), list = Object.entries(state.body).filter(([, v]) => v).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8), step = U() === 'lb' ? .2 : .1;
    overlay.innerHTML = sheet('Masa ciała', last ? `ostatnio ${fmtW(last[1])} ${U()} · ${shortDate(fromKey(last[0]).getTime())}` : 'Pomiar najlepiej rano, na czczo', `
      <div class="goal-k"><button data-bk="-1" aria-label="Mniej">−</button><input id="b-kg" type="text" inputmode="decimal" value="${last ? String(dispW(last[1])).replace('.', ',') : ''}" placeholder="${U()}" aria-label="Masa ciała"><button data-bk="1" aria-label="Więcej">+</button></div>
      <p class="hint" style="margin-top:-8px">${U()}</p>
      <div class="field"><label for="b-day">Dzień</label><input id="b-day" type="date" value="${todayKey()}"></div>
      <button class="primary acc" id="b-save">Zapisz pomiar</button>
      ${list.length ? `<div class="blist">${list.map(([k, v]) => `<div><span>${shortDate(fromKey(k).getTime())}</span><b>${fmtW(v)} ${U()}</b><button data-bdel="${k}" aria-label="Usuń pomiar">${XMARK}</button></div>`).join('')}</div>` : ''}`, 'Masa ciała');
    overlay.querySelectorAll('[data-bk]').forEach(b => b.addEventListener('click', () => { const v = num($('b-kg').value) || (last ? dispW(last[1]) : (U() === 'lb' ? 170 : 75)); $('b-kg').value = String(+(v + step * +b.dataset.bk).toFixed(1)).replace('.', ','); }));
    $('b-save').addEventListener('click', () => {
      const v = num($('b-kg').value); if (!v || v < 20 || v > 700) { toast('Wpisz poprawną masę ciała'); return; }
      state.body[$('b-day').value || todayKey()] = +(v / uf()).toFixed(2); save(); close(); render(); toast(`Zapisano ${nf(v, 1)} ${U()}`);
    });
    overlay.querySelectorAll('[data-bdel]').forEach(b => b.addEventListener('click', () => { delete state.body[b.dataset.bdel]; save(); render(); openBody(); }));
  }

  /* ----- przerwa między seriami: duży zegar w kole jak w RepCount ----- */
  let rest = (() => { try { return JSON.parse(localStorage.getItem(REST_KEY)); } catch (_) { return null; } })(), restInt = null, actx = null;
  const restLeft = () => rest ? Math.max(0, (rest.end - Date.now()) / 1000) : 0;
  function startRest(sec, auto) {
    rest = { end: Date.now() + sec * 1000, total: sec };
    try { localStorage.setItem(REST_KEY, JSON.stringify(rest)); } catch (_) { }
    unlockAudio(); clearInterval(restInt); restInt = setInterval(tickRest, 250); tickRest();
    if (!auto) openTimer();
    else document.querySelectorAll('.tb-timer').forEach(b => { b.classList.add('run'); if (!calm()) b.animate({ transform: ['scale(1)', 'scale(1.12)', 'scale(1)'] }, { duration: 400 }); });
    renderLive();
  }
  // wysuwane z boku pytanie „Przerwa?” — „Tak” włącza timer ustawiony wcześniej (Więcej → Przerwa między seriami)
  let askT = null;
  function askRest(sec) {
    hideAsk(true);
    const el = document.createElement('div');
    el.className = 'restask'; el.id = 'restask'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Przerwa?');
    el.innerHTML = `<span class="ra-q">${ALARM}<b>Przerwa?</b></span><button class="ra-yes" data-rest-yes="${sec}">Tak · ${fmtSec(sec)}</button><button class="ra-no" data-rest-no aria-label="Nie">${XMARK}</button>`;
    document.body.appendChild(el);
    clearTimeout(askT); askT = setTimeout(() => hideAsk(), 9000);
  }
  function hideAsk(now) {
    clearTimeout(askT);
    const el = $('restask'); if (!el) return;
    if (now || calm()) { el.remove(); return; }
    el.classList.add('out'); setTimeout(() => el.remove(), 260);
  }
  function stopRest() { hideAsk(true); rest = null; try { localStorage.removeItem(REST_KEY); } catch (_) { } clearInterval(restInt); restInt = null; document.querySelectorAll('.tb-timer').forEach(b => { b.classList.remove('run'); b.querySelector('[data-rl]').textContent = ''; }); if ($('t-ring')) drawTimer(); renderLive(); }
  function tickRest() {
    if (!rest) return;
    const left = restLeft();
    if (left <= 0) { restDone(); return; }
    document.querySelectorAll('[data-rl]').forEach(el => { el.textContent = fmtSec(Math.ceil(left)); });
    const ring = $('t-ring'); if (ring) { ring.style.setProperty('--p', (left / rest.total).toFixed(4)); $('t-left').textContent = fmtSec(Math.ceil(left)); }
  }
  function restDone() {
    const was = rest; rest = null; try { localStorage.removeItem(REST_KEY); } catch (_) { }
    clearInterval(restInt); restInt = null;
    if (!was) return;
    const buzz = [500, 200, 500, 200, 700];
    const vibrated = !!navigator.vibrate?.(buzz);
    if (state.settings.sound) beep();
    if ((document.hidden || !vibrated) && 'Notification' in window && Notification.permission === 'granted') navigator.serviceWorker?.getRegistration().then(r => r?.showNotification('Koniec przerwy', { body: 'Czas na kolejną serię', tag: 'ggym-rest', renotify: true, vibrate: buzz, icon: 'icons/icon-192.png' })).catch(() => { });
    document.querySelectorAll('[data-rl]').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.tb-timer').forEach(b => { b.classList.remove('run'); b.classList.add('end'); setTimeout(() => b.classList.remove('end'), 2000); });
    if ($('t-ring')) { drawTimer(); $('t-ring').classList.add('end'); }
    toast('Koniec przerwy — kolejna seria');
    renderLive();
  }
  function openTimer() {
    overlay.innerHTML = sheet('Przerwa', '', '<div id="t-box"></div>', 'Timer przerwy', 'timer');
    drawTimer();
  }
  function drawTimer() {
    const box = $('t-box'); if (!box) return;
    const presets = REST_OPTS, cur = rest ? rest.total : 0;
    box.innerHTML = `<div class="tring" id="t-ring" style="--p:${rest ? (restLeft() / rest.total).toFixed(4) : 0}"><svg viewBox="0 0 220 220" aria-hidden="true"><circle class="bg" cx="110" cy="110" r="96"/><circle class="fg" cx="110" cy="110" r="96" pathLength="1"/></svg><b id="t-left">${rest ? fmtSec(Math.ceil(restLeft())) : '0:00'}</b></div>
      <div class="chips tpre">${presets.map(p => `<button data-tgo="${p}" class="${cur === p ? 'on' : ''}">${fmtSec(p)}</button>`).join('')}</div>
      ${rest ? `<div class="tctl"><button class="tstop" data-tstop aria-label="Zatrzymaj">${STOP}</button></div>` : '<p class="hint">Wybierz czas przerwy</p>'}`;
  }
  function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (_) { } }
  function beep() {
    if (!actx) return;
    try { [0, .22, .44].forEach((t, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = i === 2 ? 1175 : 880; g.gain.setValueAtTime(.0001, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(.25, actx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + t + .18); o.connect(g).connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + .2); }); } catch (_) { }
  }

  /* ---------- okienka ---------- */
  const sheet = (title, sub, body, label, cls = '') => `<div class="scrim" data-close><div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label || title)}"><div class="sheet-h"><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div><button class="x" data-close aria-label="Zamknij">×</button></div>${body}</div></div>`;
  const close = () => { overlay.innerHTML = ''; pick = null; };
  overlay.addEventListener('click', e => {
    if (e.target.hasAttribute('data-close')) { close(); return; }
    const T = s => e.target.closest(s); let b;
    if ((b = T('[data-pex]')) && pick) {
      const id = b.dataset.pex;
      if (pick.mode === 'swap') { const p = pick; pick = null; p.cb([id]); return; }
      const i = pick.sel.indexOf(id); if (i >= 0) pick.sel.splice(i, 1); else pick.sel.push(id);
      overlay.querySelectorAll(`[data-pex="${CSS.escape(id)}"]`).forEach(z => z.classList.toggle('on', i < 0)); drawPickFoot(); return;
    }
    if ((b = T('[data-pmus]')) && pick) { pick.mus = b.dataset.pmus; overlay.querySelectorAll('[data-pmus]').forEach(z => z.classList.toggle('on', z === b)); drawPickList(); return; }
    if ((b = T('[data-peq]')) && pick) { pick.eq = b.dataset.peq; overlay.querySelectorAll('[data-peq]').forEach(z => z.classList.toggle('on', z === b)); drawPickList(); return; }
    if ((b = T('[data-tadj]')) && rest) { rest.end += +b.dataset.tadj * 1000; rest.total = Math.max(rest.total, restLeft()); try { localStorage.setItem(REST_KEY, JSON.stringify(rest)); } catch (_) { } tickRest(); return; }
    if (T('[data-tstop]')) { stopRest(); return; }
    if ((b = T('[data-tgo]'))) { startRest(+b.dataset.tgo, true); drawTimer(); return; }
    if ((b = T('[data-w]'))) { close(); pushDetail({ type: 'w', id: b.dataset.w }); return; }
  });

  // Eksport do CSV (Excel): jeden wiersz na serię
  function exportCsv() {
    const q = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const dec = v => v == null || v === '' ? '' : String(v).replace('.', ',');
    const rows = [['Data', 'Godzina', 'Trening', 'Czas (min)', 'Ćwiczenie', 'Mięśnie główne', 'Seria', 'Rodzaj', 'Ciężar (kg)', 'Powtórzenia', 'Czas (s)', 'Dystans (km)', 'Kcal', 'Rekord', 'Notatka serii', 'Notatka ćwiczenia']];
    const TN = { n: 'normalna', w: 'rozgrzewka', d: 'drop set', f: 'do upadku' };
    finished().slice().reverse().forEach(w => w.ex.forEach(e => { const x = exOf(e); e.sets.forEach((s, i) => rows.push([key(new Date(w.start)), hhmm(w.start), w.name, r0((w.end - w.start) / 60000), x.name, musList(x.primary), i + 1, TN[s.t || 'n'], dec(s.kg), s.r ?? '', s.s ?? '', dec(s.km), s.kcal ?? '', s.pr ? 'tak' : '', s.note || '', i ? '' : e.note])); }));
    if (rows.length < 2) { toast('Brak treningów do eksportu'); return; }
    const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `traincker-${todayKey()}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(`Wyeksportowano ${rows.length - 1} serii`);
  }

  /* ---------- ekran logowania: bez konta nie ma aplikacji ---------- */
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
    if (!logged) { close(); wkLayer.hidden = true; dtLayer.hidden = true; if (matchMedia('(hover: hover)').matches && !document.activeElement?.closest('#auth')) $('a-email').focus(); }
    else render();
  }
  function authError(err) {
    const m = (err?.message || '').toLowerCase(), c = err?.code || '';
    if (err instanceof TypeError || m.includes('failed to fetch')) return 'Brak połączenia z internetem';
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
      animTab = true; updateGate();
      setTimeout(() => { $('auth-form').reset(); setAuthMode('in'); }, 1500);
    } catch (err) { showAuthError(authError(err)); }
    finally { btn.disabled = false; btn.textContent = label === '…' ? 'Zaloguj się' : label; }
  });
  function confirmLogout() {
    overlay.innerHTML = sheet('Czy chcesz się wylogować?', state.active ? 'Trwający trening zostanie zapisany w chmurze' : '', `<div class="confirm"><button data-close>Nie</button><button class="yes" id="confirm-logout">Tak</button></div>`);
    $('confirm-logout').addEventListener('click', async () => {
      const b = $('confirm-logout'); b.disabled = true;
      try { await window.Cloud.signOut(); close(); stopRest(); stack = []; wOpen = false; state = withDefaults({}); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { } updateGate(); }
      catch (err) { close(); toast(err.message); }
    });
  }

  /* ---------- zdarzenia ---------- */
  function setTab(t) { tab = t; animTab = true; stack = []; try { localStorage.setItem('ggym.tab', t); } catch (_) { } tabView.innerHTML = ''; render(); window.scrollTo({ top: 0 }); }
  document.addEventListener('click', e => {
    if (e.target.closest('#overlay')) return;
    const T = s => e.target.closest(s); let b;
    // zakładki i główne przyciski
    if ((b = T('#tabbar [data-tab]'))) { if (b.dataset.tab === tab && !stack.length) window.scrollTo({ top: 0, behavior: 'smooth' }); else setTab(b.dataset.tab); return; }
    if (T('#fab') || T('[data-start]')) { if (!calm()) ripple(e.clientX, e.clientY, 1.2); openStart(); return; }
    if ((b = T('[data-rest-yes]'))) { unlockAudio(); startRest(+b.dataset.restYes, true); hideAsk(); return; }
    if (T('[data-rest-no]')) { hideAsk(); return; }
    if (T('#livebar')) { openWorkout(); return; }
    if (T('[data-back]')) { popDetail(); return; }
    // ekran treningu
    if (T('[data-wk-min]')) { if (state.active?.edit) { workoutMenu(); return; } wOpen = false; render(); return; }
    if (T('[data-finish]')) { finishAsk(); return; }
    if (T('[data-wk-menu]')) { workoutMenu(); return; }
    if (T('[data-timer]')) { unlockAudio(); openTimer(); return; }
    if ((b = T('[data-sn]'))) { tapSet(b.closest('.srow')); return; }
    if ((b = T('[data-smenu]'))) { const r = b.closest('.srow'); setMenu(+r.dataset.x, +r.dataset.s); return; }
    if ((b = T('[data-addset]'))) { addSet(+b.dataset.addset); return; }
    if ((b = T('[data-exmenu]'))) { exMenu(+b.dataset.exmenu); return; }
    if ((b = T('[data-exnote]'))) { exNote(+b.dataset.exnote); return; }
    if ((b = T('[data-exinfo]'))) { pushDetail({ type: 'ex', eid: b.dataset.exinfo, tab: b.dataset.xt || 'hist' }); return; }
    if (T('[data-addex]')) { openPicker('workout'); return; }
    // listy i szczegóły
    if ((b = T('[data-w]'))) { if (!calm()) ripple(e.clientX, e.clientY, 1); pushDetail({ type: 'w', id: b.dataset.w }); return; }
    if ((b = T('[data-wmenu]'))) { workoutActions(b.dataset.wmenu); return; }
    if ((b = T('[data-wprs]'))) { const w = state.workouts[b.dataset.wprs]; if (w?.prs?.length) openPRs(w); return; }
    if ((b = T('[data-repeat]'))) { const w = state.workouts[b.dataset.repeat]; if (w) startWorkout({ name: w.name, rid: w.rid, ex: w.ex.map(e => ({ eid: e.eid, sup: e.sup, note: e.note, tg: e.sets })) }); return; }
    if ((b = T('[data-r]'))) { pushDetail({ type: 'r', id: b.dataset.r }); return; }
    if (T('[data-rnew]')) { newRoutine(); return; }
    if (T('[data-templates]')) { openTemplates(); return; }
    if ((b = T('[data-rstart]'))) { if (!calm()) ripple(e.clientX, e.clientY, 1.6); startRoutine(b.dataset.rstart); return; }
    if ((b = T('[data-rmenu]'))) { routineMenu(b.dataset.rmenu); return; }
    if ((b = T('[data-rex]'))) { routineEx(stack[stack.length - 1].id, +b.dataset.rex); return; }
    if (T('[data-radd]')) { const r = state.routines[stack[stack.length - 1].id]; openPicker('routine', (ids, ss) => { const sup = ss && ids.length > 1 ? uid('s') : null; ids.forEach(id => r.ex.push({ eid: id, w: 0, n: 3, note: '', sup })); save(); close(); render(); }); return; }
    if (T('[data-rtarget]')) {
      const r = state.routines[stack[stack.length - 1].id];
      overlay.innerHTML = sheet('Ciężary i powtórzenia', 'Skąd brać szare podpowiedzi w seriach', `<div class="ilist"><button class="irow${r.target !== 'routine' ? ' on' : ''}" data-tv="latest"><span class="ir-t"><b>Ostatnie</b><small>z ostatniego razu, gdy robiłeś to ćwiczenie</small></span>${r.target !== 'routine' ? '<span class="ck">✓</span>' : ''}</button><button class="irow${r.target === 'routine' ? ' on' : ''}" data-tv="routine"><span class="ir-t"><b>Z tego planu</b><small>z ostatniego treningu z tego planu (np. dzień ciężki i lekki)</small></span>${r.target === 'routine' ? '<span class="ck">✓</span>' : ''}</button></div>`, 'Podpowiedzi');
      overlay.querySelectorAll('[data-tv]').forEach(z => z.addEventListener('click', () => { r.target = z.dataset.tv; save(); close(); render(); }));
      return;
    }
    if ((b = T('[data-xt2]'))) { const d = stack[stack.length - 1]; d.tab = b.dataset.xt2; d.sel = null; render(); return; }
    if ((b = T('[data-xm]'))) { const d = stack[stack.length - 1]; d.m = b.dataset.xm; d.sel = null; render(); return; }
    if ((b = T('[data-xr]'))) { const d = stack[stack.length - 1]; d.range = b.dataset.xr; d.sel = null; render(); return; }
    if ((b = T('[data-xy]'))) { stack[stack.length - 1].year = b.dataset.xy; render(); return; }
    if ((b = T('[data-xedit]'))) { const x = exById(b.dataset.xedit); if (x) openCustomEx(x, () => { close(); render(); }); return; }
    if ((b = T('[data-xmus]'))) { xMus = b.dataset.xmus; renderExercises(); return; }
    if ((b = T('[data-xeq]'))) { xEq = b.dataset.xeq; renderExercises(); return; }
    if (T('[data-xnew]')) { openCustomEx(null); return; }
    if (T('[data-more]')) { hLimit += 25; renderLog(); return; }
    if ((b = T('[data-pw]'))) { pWeeks = +b.dataset.pw; animTab = true; render(); return; }
    if ((b = T('[data-cal]'))) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + +b.dataset.cal, 1); const c = b.closest('.scard'); c.innerHTML = calendarHtml(); c.querySelector('.calg').classList.add('enter'); return; }
    if ((b = T('[data-cday]'))) { openDay(b.dataset.cday); return; }
    if (T('[data-body]')) { openBody(); return; }
    // ustawienia
    if ((b = T('[data-unit]'))) { state.settings.unit = b.dataset.unit; save(); render(); return; }
    if ((b = T('[data-rest-set]'))) { state.settings.rest = +b.dataset.restSet; save(); render(); return; }
    if ((b = T('[data-goal-d]'))) { state.settings.weekGoal = Math.max(1, Math.min(7, state.settings.weekGoal + +b.dataset.goalD)); save(); prevRing = null; render(); return; }
    if (T('[data-notif]')) { Notification.requestPermission().then(r => { toast(r === 'granted' ? 'Powiadomienia włączone' : 'Powiadomienia nie zostały włączone'); render(); }).catch(() => { }); return; }
    if (T('[data-csv]')) { exportCsv(); return; }
    if (T('[data-logout]')) { confirmLogout(); return; }
    const ring = T('.ring'); if (ring && !calm()) ripple(e.clientX, e.clientY, 1.4);
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-set]')) { state.settings[t.dataset.set] = t.checked; save(); return; }
    // seria zatwierdzona (wyjście z pola): rekord i przerwa
    const row = t.closest?.('#wk-layer .srow'); if (row) patchRow(row);
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'h-q') { hQuery = t.value; hLimit = 25; renderLog(); return; }
    if (t.id === 'x-q') { xQuery = t.value; renderExercises(); return; }
    if (t.matches('[data-rname]') || t.matches('[data-rnote]')) { const r = state.routines[stack[stack.length - 1]?.id]; if (!r) return; if (t.matches('[data-rname]')) { r.name = t.value; const h = dtLayer.querySelector('h1.big'); if (h) h.textContent = t.value || 'Plan'; } else r.note = t.value; save(); return; }
    const a = state.active; if (!a || !t.closest('#wk-layer')) return;
    if (t.id === 'w-name') { a.name = t.value; save(); return; }
    const row = t.closest('.srow'); if (!row || !t.dataset.f) return;
    const en = a.ex[+row.dataset.x], s = en?.sets[+row.dataset.s]; if (!s) return;
    if (t.dataset.f === 'note') s.note = t.value; else putVal(s, t.dataset.f, num(t.value), exOf(en).kind);
    if ((t.dataset.f === 'r' || t.dataset.f === 's') && t.value !== '' && s.kg == null && exOf(en).kind !== 'cardio') {
      const tg = target(en, +row.dataset.s), kgIn = row.querySelector('[data-f="kg"]');
      if (tg?.kg != null && kgIn) { s.kg = tg.kg; kgIn.value = inVal(s, 'kg', exOf(en).kind); if (!calm()) kgIn.animate({ color: ['var(--accent)', 'var(--ink)'] }, { duration: 700 }); }
    }
    save();
    const st = $('w-stats'); if (st) st.innerHTML = statChips(wStats(a, true));
    row.classList.toggle('ok', valid(s, exOf(en).kind));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (overlay.innerHTML) { close(); return; } if (stack.length) { popDetail(); return; } if (wOpen && !state.active?.edit) { wOpen = false; render(); } return; }
    if (e.key === 'Enter' && e.target.matches('#wk-layer .srow input')) {
      e.preventDefault();
      const all = [...wkLayer.querySelectorAll('.srow input')], i = all.indexOf(e.target);
      if (all[i + 1] && all[i + 1].closest('.srow') === e.target.closest('.srow')) all[i + 1].focus(); else e.target.blur();
    }
  });
  // nowy dzień / powrót do aplikacji
  let lastToday = todayKey();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (rest) tickRest(); if (todayKey() !== lastToday) { lastToday = todayKey(); if (!overlay.innerHTML && !wOpen) render(); } } });
  // zegar trwającego treningu
  setInterval(() => { if (!state.active || state.active.edit || document.hidden) return; const t = elapsed(); document.querySelectorAll('[data-el]').forEach(x => { x.textContent = t; }); }, 1000);
  window.Cloud?.onChange(() => { if (tab === 'more' && !wOpen && !stack.length && !overlay.innerHTML) renderMore(); });

  let tt;
  function toast(m) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = m; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2800);
  }

  /* ---------- morskie efekty: kręgi na wodzie, fala przez cały ekran ---------- */
  const sea = document.createElement('div');
  sea.className = 'sea'; sea.setAttribute('aria-hidden', 'true'); sea.innerHTML = SEA_SVG;
  document.body.appendChild(sea);
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
  }
  // Koniec treningu: fala przez ekran przy rekordzie albo celu tygodnia.
  function celebrate(goal, prs) { navigator.vibrate?.([15, 60, 25]); if (goal || prs) swell(); }
  // iPhone: dotknięcie pola czasem nie otwiera klawiatury, więc pole dostaje focus() w obsłudze dotyku.
  let tStart = null;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; tStart = t ? [t.clientX, t.clientY] : null; }, { passive: true });
  document.addEventListener('touchend', e => {
    const f = e.target.closest?.('input:not([type=file]):not([type=radio]):not([type=checkbox]), textarea');
    const t = e.changedTouches[0], moved = !tStart || !t || Math.hypot(t.clientX - tStart[0], t.clientY - tStart[1]) > 10;
    if (f && !moved && document.activeElement !== f && !f.disabled) f.focus();
  }, { passive: true });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));

  if (rest) { if (rest.end > Date.now()) { restInt = setInterval(tickRest, 250); } else { rest = null; try { localStorage.removeItem(REST_KEY); } catch (_) { } } }
  updateGate();
  if (window.Cloud) {
    let wasLogged = !!window.Cloud.user;
    window.Cloud.onChange(() => { const now = !!window.Cloud.user; if (now !== wasLogged) { wasLogged = now; updateGate(); } });
    window.Cloud.attach({ getState: () => state, applyState });
  }
  if (migrated) { migrated = false; save(); } // dane po zmianie biblioteki trafiają też do chmury
})();
