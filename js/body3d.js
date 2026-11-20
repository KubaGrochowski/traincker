// Traincker — model 3D człowieka (three.js). Każda partia mięśni to osobna bryła, którą można podświetlić na żółto.
// Model zbudowany w kodzie z elipsoid i kapsuł (bez zewnętrznych plików modelu). Obrót palcem z rozpędem.
import * as THREE from './vendor/three.module.min.js';

const BASE = new THREE.Color('#4A4A50'), SKIN = new THREE.Color('#38383D'), ACC = new THREE.Color('#F9D30F'), BLACK = new THREE.Color(0);
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, root, host = null, raf = 0, fade = null, lastT = 0;
let rotY = 0, vel = 0, drag = null, sway = !calm(), t0 = performance.now();
const muscles = {};

const E = (rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 32, 24); g.scale(rx, ry, rz); return g; };
const C = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20);

function build() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(27, 0.55, 0.1, 20);
  camera.position.set(0, 1.0, 3.9); camera.lookAt(0, 0.9, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1e, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff0c0, 1.0); rim.position.set(-3, 2, -2.5); scene.add(rim);
  root = new THREE.Group(); scene.add(root);

  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.8, metalness: 0.05 });
  const add = (parent, geo, pos, rot, mus) => {
    let mat = skin;
    if (mus) { mat = new THREE.MeshStandardMaterial({ color: BASE.clone(), roughness: 0.5, metalness: 0.05, emissive: new THREE.Color(0) }); (muscles[mus] ||= []).push(mat); }
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (rot) m.rotation.set(...rot); parent.add(m); return m;
  };

  // tułów, miednica, głowa, szyja
  add(root, E(0.17, 0.26, 0.11), [0, 1.24, 0]);
  add(root, E(0.2, 0.09, 0.1), [0, 1.42, -0.005]); // obręcz barkowa
  add(root, E(0.15, 0.1, 0.1), [0, 0.93, 0]);
  add(root, E(0.095, 0.115, 0.1), [0, 1.67, 0]);
  add(root, C(0.05, 0.06), [0, 1.53, 0], null, 'neck');
  add(root, E(0.075, 0.07, 0.03), [0, 1.34, -0.088], null, 'middle back');

  for (const s of [1, -1]) {
    add(root, E(0.088, 0.064, 0.036), [s * 0.074, 1.37, 0.082], [0, s * 0.25, s * -0.1], 'chest');
    for (const y of [1.25, 1.17, 1.09]) add(root, E(0.034, 0.036, 0.013), [s * 0.036, y, 0.1], null, 'abdominals');
    add(root, E(0.062, 0.068, 0.066), [s * 0.2, 1.43, 0], null, 'shoulders');
    add(root, E(0.08, 0.035, 0.05), [s * 0.08, 1.47, -0.025], [0, 0, s * -0.4], 'traps');
    add(root, E(0.065, 0.13, 0.045), [s * 0.105, 1.24, -0.055], [0, s * -0.3, s * 0.22], 'lats');
    add(root, E(0.035, 0.075, 0.03), [s * 0.04, 1.07, -0.08], null, 'lower back');
    add(root, E(0.085, 0.08, 0.07), [s * 0.07, 0.9, -0.06], null, 'glutes');
    add(root, E(0.04, 0.07, 0.06), [s * 0.145, 0.92, 0], null, 'abductors');

    // ręka: ramię → przedramię → dłoń
    const arm = new THREE.Group(); arm.position.set(s * 0.205, 1.4, 0); arm.rotation.z = s * 0.16; root.add(arm);
    add(arm, C(0.042, 0.22), [0, -0.15, 0]);
    add(arm, E(0.04, 0.09, 0.038), [0, -0.14, 0.028], null, 'biceps');
    add(arm, E(0.043, 0.1, 0.038), [0, -0.15, -0.025], null, 'triceps');
    const fa = new THREE.Group(); fa.position.set(0, -0.3, 0); fa.rotation.z = s * -0.05; arm.add(fa);
    add(fa, E(0.04, 0.04, 0.04), [0, 0, 0]);
    add(fa, E(0.044, 0.11, 0.042), [0, -0.11, 0], null, 'forearms');
    add(fa, E(0.034, 0.06, 0.018), [0, -0.28, 0]);

    // noga: udo → podudzie → stopa
    const leg = new THREE.Group(); leg.position.set(s * 0.09, 0.87, 0); leg.rotation.z = s * 0.02; root.add(leg);
    add(leg, C(0.065, 0.3), [0, -0.2, 0]);
    add(leg, E(0.07, 0.18, 0.06), [0, -0.2, 0.03], null, 'quadriceps');
    add(leg, E(0.06, 0.17, 0.052), [0, -0.21, -0.035], null, 'hamstrings');
    add(leg, E(0.038, 0.13, 0.045), [-s * 0.04, -0.14, 0], null, 'adductors');
    const shin = new THREE.Group(); shin.position.set(0, -0.43, 0); leg.add(shin);
    add(shin, E(0.05, 0.06, 0.05), [0, 0, 0]);
    add(shin, C(0.042, 0.3), [0, -0.2, 0]);
    add(shin, E(0.052, 0.11, 0.05), [0, -0.13, -0.03], null, 'calves');
    add(shin, E(0.045, 0.03, 0.11), [0, -0.41, 0.04]);
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
