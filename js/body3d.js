// Traincker — model 3D człowieka (three.js). Każda partia mięśni to osobna bryła, którą można podświetlić na żółto.
// Model zbudowany w kodzie: mięśnie jako wrzeciona z fakturą włókien, duże mięśnie podzielone na głowy (bez zewnętrznych plików). Obrót palcem z rozpędem.
import * as THREE from './vendor/three.module.min.js';

const BASE = new THREE.Color('#6A4446'), SKIN = new THREE.Color('#3A3A3F'), ACC = new THREE.Color('#F9D30F'), BLACK = new THREE.Color(0);
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, root, host = null, raf = 0, fade = null, lastT = 0;
let rotY = 0, vel = 0, drag = null, sway = !calm(), t0 = performance.now();
const muscles = {};

// brzusiec mięśnia: wrzeciono zwężające się w ścięgna (Lathe), spłaszczone w osi z; włókna biegną wzdłuż długości
const bellyCache = new Map();
function B(len, w, d, peak = 0.5, blunt = 0.75) {
  const k = [len, w, d, peak, blunt].join();
  if (bellyCache.has(k)) return bellyCache.get(k);
  const pts = [], N = 22, a = Math.log(0.5) / Math.log(peak);
  for (let i = 0; i <= N; i++) {
    const t = i / N, tt = Math.pow(t, a), r = Math.pow(Math.sin(Math.PI * tt), blunt);
    pts.push(new THREE.Vector2(Math.max(0.0001, r), (t - 0.5) * len));
  }
  const g = new THREE.LatheGeometry(pts, 28); g.scale(w, 1, d); g.computeVertexNormals();
  bellyCache.set(k, g); return g;
}
const E = (rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 32, 24); g.scale(rx, ry, rz); return g; };
const C = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20);

// faktura włókien mięśniowych (mapa wypukłości z cienkich pasków)
function fiberTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 256; i += 2) { const v = 90 + Math.random() * 110 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1 + (Math.random() < .3), 64); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
}

function build() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(27, 0.55, 0.1, 20);
  camera.position.set(0, 1.0, 3.9); camera.lookAt(0, 0.9, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1e, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(2, 3, 3); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-2.5, 0.5, 2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff0c0, 1.1); rim.position.set(-3, 2, -2.5); scene.add(rim);
  root = new THREE.Group(); scene.add(root);

  const fib = fiberTex();
  const under = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2B2526'), roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.7, metalness: 0.05 });
  const tendon = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8C8580'), roughness: 0.5 });
  const neutral = new THREE.MeshStandardMaterial({ color: BASE.clone(), roughness: 0.55, bumpMap: fib, bumpScale: 1.2 });
  const put = (parent, geo, mat, pos, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (rot) m.rotation.set(...rot); parent.add(m); return m; };
  // mięsień: osobny materiał, żeby dało się go podświetlić; mus = null → mięsień „neutralny” (nie ma go w liście partii)
  const M = (parent, mus, geo, pos, rot) => {
    let mat = neutral;
    if (mus) { mat = new THREE.MeshStandardMaterial({ color: BASE.clone(), roughness: 0.5, metalness: 0.02, bumpMap: fib, bumpScale: 1.2, emissive: new THREE.Color(0) }); (muscles[mus] ||= []).push(mat); }
    return put(parent, geo, mat, pos, rot);
  };
  const H = Math.PI / 2;

  // ---------- spód (żeby między mięśniami nie było prześwitów) ----------
  put(root, E(0.155, 0.25, 0.1), under, [0, 1.24, 0]);
  put(root, E(0.14, 0.1, 0.085), under, [0, 0.93, -0.012]);
  put(root, E(0.2, 0.06, 0.085), under, [0, 1.43, -0.005]);
  // głowa, szyja
  put(root, E(0.092, 0.115, 0.102), skin, [0, 1.675, 0.005]);
  put(root, E(0.06, 0.04, 0.06), skin, [0, 1.6, 0.03]);
  put(root, C(0.045, 0.08), under, [0, 1.53, 0]);
  // mostek, kresa biała
  put(root, B(0.16, 0.012, 0.01), tendon, [0, 1.36, 0.105]);
  put(root, B(0.32, 0.006, 0.006), tendon, [0, 1.12, 0.112]);

  for (const s of [1, -1]) {
    // ---------- szyja ----------
    M(root, 'neck', B(0.13, 0.018, 0.018, 0.5), [s * 0.032, 1.54, 0.035], [0.35, 0, s * -0.3]);
    // ---------- klatka: część obojczykowa i mostkowa ----------
    M(root, 'chest', B(0.17, 0.045, 0.022, 0.4), [s * 0.085, 1.42, 0.082], [0, s * 0.25, s * (H + 0.3)]);
    M(root, 'chest', B(0.2, 0.07, 0.027, 0.4), [s * 0.083, 1.355, 0.09], [0, s * 0.3, s * (H - 0.18)]);
    // ---------- brzuch: prosty (4 „kostki”) i skośne ----------
    [[1.27, 0.07], [1.195, 0.07], [1.12, 0.07], [1.035, 0.09]].forEach(([y, l]) => M(root, 'abdominals', B(l, 0.034, 0.018, 0.5, 0.5), [s * 0.036, y, 0.1]));
    M(root, 'abdominals', B(0.2, 0.05, 0.03, 0.55), [s * 0.12, 1.11, 0.065], [0, s * 0.55, s * -0.18]);
    // zębaty przedni (neutralny)
    [1.31, 1.26, 1.21].forEach((y, i) => M(root, null, B(0.07, 0.016, 0.012), [s * (0.148 - i * 0.004), y, 0.045 + i * 0.006], [0, s * 0.7, s * 1.15]));
    // ---------- barki: trzy głowy naramiennego ----------
    M(root, 'shoulders', B(0.14, 0.04, 0.035, 0.35), [s * 0.2, 1.415, 0.045], [0.2, 0, s * 0.22]);
    M(root, 'shoulders', B(0.14, 0.045, 0.04, 0.35), [s * 0.228, 1.41, 0], [0, 0, s * 0.3]);
    M(root, 'shoulders', B(0.14, 0.04, 0.035, 0.35), [s * 0.2, 1.415, -0.045], [-0.2, 0, s * 0.22]);
    // ---------- plecy ----------
    M(root, 'traps', B(0.17, 0.045, 0.03, 0.45), [s * 0.085, 1.485, -0.03], [0, 0, s * (H - 0.45)]);
    M(root, 'traps', B(0.24, 0.07, 0.02, 0.3), [s * 0.05, 1.33, -0.098], [0, 0, s * -0.32]);
    M(root, 'middle back', B(0.12, 0.05, 0.012), [s * 0.06, 1.385, -0.094], [0, 0, s * 0.95]);
    M(root, 'middle back', B(0.1, 0.028, 0.016), [s * 0.148, 1.36, -0.074], [0, s * -0.4, s * 1.1]);
    M(root, 'middle back', B(0.1, 0.05, 0.013), [s * 0.11, 1.4, -0.092], [0, s * -0.3, s * 0.5]); // podgrzebieniowy
    M(root, 'lats', B(0.32, 0.095, 0.028, 0.3), [s * 0.115, 1.2, -0.07], [0, s * -0.45, s * 0.38]);
    M(root, 'lower back', B(0.3, 0.03, 0.026, 0.55), [s * 0.034, 1.11, -0.092]);
    // ---------- pośladki, biodro ----------
    M(root, 'glutes', B(0.18, 0.095, 0.065, 0.5), [s * 0.075, 0.9, -0.072], [0, s * 0.2, s * 0.35]);
    M(root, 'abductors', B(0.11, 0.055, 0.035), [s * 0.125, 0.975, -0.03], [0, s * -0.5, s * 0.5]);
    M(root, 'abductors', B(0.11, 0.03, 0.022), [s * 0.148, 0.9, 0.035], [0, s * 0.3, s * -0.12]);

    // ---------- ręka ----------
    const arm = new THREE.Group(); arm.position.set(s * 0.215, 1.4, 0); arm.rotation.z = s * 0.14; root.add(arm);
    put(arm, C(0.032, 0.24), under, [0, -0.15, 0]);
    M(arm, 'biceps', B(0.21, 0.024, 0.03, 0.55), [s * 0.012, -0.155, 0.028]);
    M(arm, 'biceps', B(0.2, 0.024, 0.028, 0.55), [-s * 0.012, -0.15, 0.026]);
    M(arm, null, B(0.12, 0.028, 0.02, 0.6), [s * 0.022, -0.22, 0.012]); // ramienny
    M(arm, 'triceps', B(0.24, 0.032, 0.03, 0.4), [0, -0.14, -0.032]);
    M(arm, 'triceps', B(0.15, 0.026, 0.024, 0.45), [s * 0.026, -0.12, -0.016]);
    M(arm, 'triceps', B(0.13, 0.022, 0.02, 0.55), [-s * 0.022, -0.19, -0.02]);
    const fa = new THREE.Group(); fa.position.set(0, -0.3, 0); fa.rotation.z = s * -0.05; arm.add(fa);
    put(fa, E(0.034, 0.03, 0.032), tendon, [0, 0, -0.012]);
    put(fa, C(0.024, 0.2), under, [0, -0.13, 0]);
    M(fa, 'forearms', B(0.2, 0.026, 0.024, 0.28), [s * 0.022, -0.08, 0.016]);
    M(fa, 'forearms', B(0.22, 0.028, 0.024, 0.3), [-s * 0.016, -0.1, 0.014]);
    M(fa, 'forearms', B(0.21, 0.026, 0.022, 0.3), [s * 0.012, -0.1, -0.018]);
    put(fa, E(0.03, 0.055, 0.016), skin, [0, -0.275, 0]);
    put(fa, B(0.06, 0.022, 0.012), skin, [0, -0.335, 0.004]);

    // ---------- noga ----------
    const leg = new THREE.Group(); leg.position.set(s * 0.09, 0.87, 0); leg.rotation.z = s * 0.025; root.add(leg);
    put(leg, C(0.05, 0.32), under, [0, -0.2, 0]);
    M(leg, 'quadriceps', B(0.36, 0.036, 0.034, 0.45), [0, -0.19, 0.052]);
    M(leg, 'quadriceps', B(0.33, 0.045, 0.04, 0.45), [s * 0.046, -0.215, 0.015]);
    M(leg, 'quadriceps', B(0.17, 0.04, 0.035, 0.7), [-s * 0.035, -0.31, 0.032]);
    M(leg, null, B(0.42, 0.012, 0.01), [-s * 0.01, -0.22, 0.06], [0, 0, s * -0.22]); // krawiecki
    M(leg, 'adductors', B(0.25, 0.045, 0.05, 0.35), [-s * 0.045, -0.14, 0.0], [0, 0, s * -0.12]);
    M(leg, 'hamstrings', B(0.33, 0.033, 0.034, 0.5), [s * 0.025, -0.21, -0.042]);
    M(leg, 'hamstrings', B(0.33, 0.031, 0.032, 0.45), [-s * 0.02, -0.215, -0.042]);
    put(leg, E(0.026, 0.03, 0.014), tendon, [0, -0.43, 0.05]); // rzepka
    const shin = new THREE.Group(); shin.position.set(0, -0.43, 0); leg.add(shin);
    put(shin, E(0.045, 0.05, 0.045), under, [0, 0, 0]);
    put(shin, C(0.032, 0.32), under, [0, -0.2, 0]);
    M(shin, 'calves', B(0.2, 0.03, 0.034, 0.35), [-s * 0.022, -0.12, -0.036]);
    M(shin, 'calves', B(0.18, 0.027, 0.03, 0.35), [s * 0.022, -0.11, -0.032]);
    M(shin, 'calves', B(0.22, 0.042, 0.024, 0.45), [0, -0.21, -0.022]);
    M(shin, null, B(0.27, 0.02, 0.02, 0.35), [s * 0.016, -0.17, 0.03]); // piszczelowy przedni
    put(shin, B(0.12, 0.012, 0.01), tendon, [0, -0.33, -0.04]); // ścięgno Achillesa
    put(shin, E(0.042, 0.028, 0.105), skin, [0, -0.41, 0.04]);
  }
}

function frame(now) {
  raf = 0;
  if (!host || !host.isConnected) return;
  const dt = Math.min(50, now - (lastT || now)); lastT = now;
  let more = false;
  if (!drag && Math.abs(vel) > 0.00005) { rotY += vel * dt; vel *= Math.pow(0.93, dt / 16); more = true; }
  if (sway && !drag) { root.rotation.y = rotY + Math.sin((now - t0) / 900) * 0.45; more = true; } else root.rotation.y = rotY;
  if (fade) {
    const k = Math.min(1, (now - fade.t) / 450), e = 1 - Math.pow(1 - k, 3);
    fade.items.forEach(([m, a, b, ea, eb]) => { m.color.copy(a).lerp(b, e); m.emissive.copy(ea).lerp(eb, e); });
    if (k < 1) more = true; else fade = null;
  }
  renderer.render(scene, camera);
  if (more) kick();
}
const kick = () => { if (!raf) { lastT = 0; raf = requestAnimationFrame(frame); } };

function size() {
  if (!host) return;
  const w = host.clientWidth || 200, h = host.clientHeight || 320;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}

function setLevels(lvl, instant) {
  const items = [];
  for (const [mus, mats] of Object.entries(muscles)) {
    const v = Math.min(1, lvl?.[mus] || 0), to = BASE.clone().lerp(ACC, v), eto = ACC.clone().multiplyScalar(v * 0.22);
    mats.forEach(m => { if (instant || calm()) { m.color.copy(to); m.emissive.copy(eto); } else items.push([m, m.color.clone(), to, m.emissive.clone(), eto]); });
  }
  fade = items.length ? { t: performance.now(), items } : null;
  kick();
}

function bindPointer(cv) {
  cv.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, lx: e.clientX, lt: e.timeStamp, moved: false, id: e.pointerId };
    if (sway) { sway = false; rotY = root.rotation.y; }
    vel = 0;
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; try { cv.setPointerCapture(drag.id); } catch (_) { } }
      else return;
    }
    const step = (e.clientX - drag.lx) * 0.012, dt = Math.max(1, e.timeStamp - drag.lt);
    rotY += step; vel = vel * 0.4 + (step / dt) * 0.6; vel = Math.max(-0.02, Math.min(0.02, vel));
    drag.lx = e.clientX; drag.lt = e.timeStamp;
    root.rotation.y = rotY; renderer.render(scene, camera);
  });
  const end = () => { if (!drag) return; if (!drag.moved) vel = 0; drag = null; kick(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}

if (document.documentElement.classList.contains('pcframe')) { /* ramka iPhone'a na PC — model żyje w środku iframe */ }
else try {
  build();
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cv = renderer.domElement; cv.className = 'body3d'; cv.setAttribute('aria-hidden', 'true');
  bindPointer(cv);
  window.Body3D = {
    ok: true,
    mount(el, lvl) { host = el; el.appendChild(cv); size(); setLevels(lvl, true); kick(); },
    set(lvl) { setLevels(lvl); },
  };
  addEventListener('resize', () => { size(); kick(); });
} catch (err) {
  window.Body3D = { ok: false };
}
window.dispatchEvent(new Event('body3d-ready'));
