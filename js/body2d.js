/* Traincker — sylwetka 2D z mięśniami (przód i tył), męska albo kobieca, z włosami.
   Mięśnie przylegają do siebie jak w atlasie anatomii; każda partia to <g class="mu" data-m="…">, więc app.js może ją
   podświetlić (--v: 0–1). Rysowana jest prawa połowa (x ≥ 60), lewa to odbicie. Sylwetka kobieca powstaje z męskiej
   przez przeskalowanie szerokości na różnych wysokościach (węższe barki i talia, szersze biodra) + biust i długie włosy. */
(function () {
  const W = 120, C = 60, MIR = `matrix(-1 0 0 1 ${W} 0)`;

  // ---------- kształt kobiecy: szerokość ciała zależna od wysokości ----------
  const KB = [[0, 0.95], [50, 0.86], [70, 0.88], [95, 0.84], [112, 0.82], [125, 1.02], [138, 1.1], [160, 1.06], [190, 1.0], [246, 0.96]];
  const kAt = y => { for (let i = 1; i < KB.length; i++) if (y <= KB[i][0]) { const [y0, k0] = KB[i - 1], [y1, k1] = KB[i]; return k0 + (k1 - k0) * (y - y0) / (y1 - y0); } return KB[KB.length - 1][1]; };
  const warp = (d, arm) => d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_, x, y) => { x = +x; y = +y; const k = arm ? 0.87 : kAt(y); return `${+(C + (x - C) * k).toFixed(1)} ${y}`; });

  // ---------- prawa połowa ciała (męska) ----------
  // sylwetka (spód): tułów z nogą, ręka, dłoń
  const SIL = {
    body: 'M60 33L68 34L69 44Q82 47 93 51Q100 55 101 64Q101 70 99 72L89 70Q87 76 86 84Q83 98 81 112Q84 118 85 124Q88 132 87 140Q89 160 84 188Q82 194 82 200Q84 212 78 232L80 244L66 244L67 232Q63 214 66 200Q67 194 67 188Q66 170 61.5 154L60 154Z',
    arm: 'M89 64Q99 62 102 72Q104 88 104 103Q108 118 107 146L99 146Q95 128 94 108Q91 90 89 70Z',
    hand: 'M99 145L107 145Q109 156 105 166Q101 168 99 163Q98 154 99 145Z',
  };
  // [partia, ścieżka, włókna, ręka?]; mz = mięsień neutralny (spoza listy partii)
  const FRONT = [
    ['traps', 'M68 40Q80 46 93 51L86 52Q76 50 69 46Z', 'M69 43L91 51'],
    ['neck', 'M61 47L65.5 34.5L68 35.5L63.5 48Z', 'M62.5 47L66.5 35'],
    ['chest', 'M60.5 53L86 52Q93 54 94 60Q92 66 89 70Q84 80 74 82Q64 83 60.5 79Z', 'M61 56L91 60M61 62L91 61M61 68L90 62M61 74L89 63M64 80L89 64M72 81L89 65'],
    ['shoulders', 'M86 52Q93 50 97 54Q102 60 101.5 70Q100.5 80 98 87Q95 80 93 72Q92 64 89 60Q88 56 86 52Z', 'M90 54L98 85M94 54L100 80M98 57L101 72', 1],
    ['biceps', 'M92 72Q98 70 101 76Q102.5 90 99.5 102Q96.5 104.5 94 101Q91 88 92 72Z', 'M95 73L97 102M98 73L99 101', 1],
    ['forearms', 'M99.5 102Q105 103 106.5 112Q106.5 124 103.5 135Q101 122 99.5 102Z', 'M102 104L104 132', 1],
    ['forearms', 'M94 105Q99 103 101.5 112Q103.5 128 102.5 146L99 146Q96 130 95 118Z', 'M97 106L100.5 145', 1],
    ['mz', 'M88 70.5L82 75L87.5 77Z'], ['mz', 'M87.5 77.5L81.5 82L86.5 84Z'], ['mz', 'M86.5 84.5L81 89L85.5 90.5Z'],
    ['abdominals', 'M61 84L69 84Q71 84 71 86L71 93.5Q71 95.5 69 95.5L61 95.5Z'],
    ['abdominals', 'M61 96.5L69.5 96.5Q71 96.5 71 98.5L71 105.5Q71 107.5 69 107.5L61 107.5Z'],
    ['abdominals', 'M61 108.5L69.5 108.5Q71 108.5 71 110.5L71 117.5Q71 119.5 69 119.5L61 119.5Z'],
    ['abdominals', 'M61 120.5L70 120.5Q71.5 128 69.5 140Q66 148 61 150Z'],
    ['abdominals', 'M72.5 85Q79 83 85.5 86Q83.5 100 81 112Q83 118 84.5 124Q78 126 73.5 133Q71.5 110 72.5 85Z', 'M74 88L81 108M77 87L83 104M80 86L84.5 96'],
    ['abductors', 'M84.5 124.5Q87.5 131 87 140Q85.5 146 83.5 148Q81.5 136 80 128Z'],
    ['adductors', 'M62 152Q70 146 74 137.5Q72.5 152 71 166Q68 170 66 170Q63.5 160 62 152Z', 'M64 155L72 141M66 162L73 146'],
    ['quadriceps', 'M80 140Q87.5 138 88 158Q87 176 83 190Q80 184 79 170Q78 154 80 140Z', 'M82 143L83 186M85 147L85 180'],
    ['quadriceps', 'M75 135Q80.5 136 80 146Q80 170 77 186Q74.5 188.5 72 186Q70 168 71 150Q72 140 75 135Z', 'M75.5 138L74.5 186M73 146L75 184M78 142L76 185'],
    ['quadriceps', 'M70.5 167Q74.5 174 76 186Q74 192 70 191Q66 186 67 176Z', 'M70 172L72 190'],
    ['mz', 'M76 200Q81 204 80.5 214Q78.5 226 74.5 230Q74 214 76 200Z', 'M77 203L76 228'],
    ['calves', 'M67.5 198Q72 200 72.5 210Q70.5 220 67.5 224Q64.5 212 67.5 198Z', 'M68 201L68 222'],
  ];
  const BACK = [
    ['traps', 'M60 34L68 38Q80 45 93 51Q84 56 76 62Q68 80 61 98L60 98Z', 'M61 44L91 51M61 54L88 53M61 66L82 56M61 80L77 61M61 92L72 66'],
    ['middle back', 'M70 62.5Q80 58 90 60Q92 66 89.5 72Q80 72 72 70Z', 'M72 66L89 63M73 69L89 68'],
    ['middle back', 'M74 71.5Q84 72 90 72.5Q90 76 87 78.5Q80 77.5 75 75.5Z', 'M76 74L89 75'],
    ['shoulders', 'M88 54Q95 50 99 56Q102 64 100.5 74Q99.5 82 98 87Q94 78 92 70Q89 62 88 54Z', 'M91 56L98 85M95 55L100 78', 1],
    ['triceps', 'M90 70Q97 66 101.5 72Q103.5 88 100.5 102Q96.5 104.5 93 100Q90 86 90 70Z', 'M93 72L96 101M97 70L99 100M100 74L101 96', 1],
    ['forearms', 'M94 105Q100 102.5 105 106Q108 120 105.5 146L100 146Q96 128 94 105Z', 'M97 107L101.5 145M101 106L104 144', 1],
    ['lats', 'M62 98Q64 86 72 75Q80 78 88 79Q87 90 84 100Q82 110 80 118Q70 116 62 112Z', 'M64 100L86 82M64 106L84 92M66 111L82 103M72 116L80 112'],
    ['lower back', 'M61 99Q66 99 68.5 104Q69.5 116 68.5 129Q64.5 131 61 129Z', 'M63 101L63 128M66 102L66.5 128'],
    ['abductors', 'M70 122Q80 118 86 126Q86.5 132 84.5 134.5Q76 128 70 128Z'],
    ['glutes', 'M61 128.5Q72 124 84 132Q88 140 86 148Q80 156 70 156.5Q63 155.5 61 152Z', 'M62 133L84 140M62 140L85 146M63 147L82 152'],
    ['hamstrings', 'M75 157Q84 154.5 87 164Q86 178 81.5 190Q77.5 186 76.5 176Q74.5 166 75 157Z', 'M78 160L81 188M82 160L84 180'],
    ['hamstrings', 'M64.5 157Q70 156.5 74.5 158.5Q75 174 74 190Q70.5 190.5 68.5 188Q65 172 64.5 157Z', 'M67 160L71 188M71 160L72.5 188'],
    ['adductors', 'M61.5 154.5Q64 156 64.5 166Q64 172 62 174Z'],
    ['calves', 'M66 196Q73 195.5 74 204Q74 216 71 222.5Q66.5 220 65 210Q64.5 200 66 196Z', 'M68 199L70 220M71.5 199L72 218'],
    ['calves', 'M74.5 196Q81 196 82 204Q81 214 77.5 220.5Q74.5 216 74.5 204Z', 'M77 199L77 218M80 201L79.5 214'],
    ['calves', 'M67.5 223Q72 225 78 221Q77 228 74.5 232L69.5 232Q67.5 228 67.5 223Z'],
  ];
  const BREAST = 'M62 74Q61.5 88 72 89.5Q83.5 88.5 84 76.5Q80.5 68 72 68Q65 69 62 74Z';

  // ---------- włosy ----------
  function hair(side, sex) {
    if (sex === 'm') return side === 'front'
      ? { back: '', front: 'M47 21Q46 3.5 60 3Q74 3.5 73 21Q71.5 12 64 10.5Q57 9.5 49 13Q47.5 16 47 21Z' }
      : { back: '', front: 'M47 22Q46 3.5 60 3Q74 3.5 73 22Q72 31 60 32Q48 31 47 22Z' };
    return side === 'front'
      ? { back: 'M47 20Q45 2 60 2Q75 2 73 20Q75 40 79 55Q72 58 69 50Q71 40 70 30L50 30Q49 40 51 50Q48 58 41 55Q45 40 47 20Z', front: 'M48 22Q46.5 3.5 60 3Q73.5 3.5 72 22Q70 11 62 11Q54 13 48.5 20Z' }
      : { back: '', front: 'M47.5 20Q45 2 60 2Q75 2 72.5 20Q76 40 77 58Q60 64 43 58Q44 40 47.5 20Z' };
  }

  // ---------- rysowanie ----------
  window.drawBody = function (side, lvl, sex, x0) {
    const f = sex === 'f';
    const wp = (d, arm) => f ? warp(d, arm) : d;
    const both = (d, cls = '') => `<path${cls} d="${d}"/><path${cls} d="${d}" transform="${MIR}"/>`;
    const hx = f ? 11.3 : 12.5, hy = f ? 15 : 15.5;
    let sil = both(wp(SIL.body)) + both(wp(SIL.arm, 1)) + both(wp(SIL.hand, 1));
    sil += `<ellipse cx="${C}" cy="20" rx="${hx}" ry="${hy}"/>`;
    if (side === 'front') sil += `<ellipse cx="${C}" cy="31" rx="${hx * (f ? 0.6 : 0.68)}" ry="${f ? 4.6 : 5.4}"/>`;
    const list = (side === 'front' ? FRONT : BACK).slice();
    if (f && side === 'front') list.splice(list.findIndex(x => x[0] === 'chest') + 1, 0, ['chest', BREAST, 'M66 76Q72 72 80 77']);
    const lvlOf = m => Math.min(1, lvl[m] || 0);
    // kolejność rysowania zostaje, sąsiednie kawałki tej samej partii trafiają do jednej grupy
    let out = '', i = 0;
    while (i < list.length) {
      const m = list[i][0]; let paths = '', fibs = '';
      while (i < list.length && list[i][0] === m) { const [, d, fb, arm] = list[i]; paths += both(wp(d, arm)); if (fb) fibs += both(wp(fb, arm), ' class="fb"'); i++; }
      if (m === 'mz') out += `<g class="mz">${paths}${fibs}</g>`;
      else { const v = lvlOf(m); out += `<g class="mu${v ? ' on' : ''}"${v ? ` style="--v:${v.toFixed(2)}"` : ''} data-m="${m}">${paths}${fibs}</g>`; }
    }
    const hr = hair(side, f ? 'f' : 'm');
    return `<g transform="translate(${x0} 0)" class="body ${f ? 'f' : 'm'}">${hr.back ? `<path class="hair" d="${hr.back}"/>` : ''}<g class="sil">${sil}</g>${out}${hr.front ? `<path class="hair" d="${hr.front}"/>` : ''}</g>`;
  };
  window.BODY_W = W;
})();
