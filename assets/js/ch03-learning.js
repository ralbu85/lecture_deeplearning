// Chapter 3: self-contained teaching widgets; no notebook or OJS state dependencies.
const C = { curve: '#34465e', current: '#a51c30', other: '#708198', tangent: '#1f5eaa', secant: '#16806a' };
const loss = w => (w - 2) ** 2;
const grad = w => 2 * (w - 2);
const loss2 = ([a, b]) => (a - 2) ** 2 + (b - 1) ** 2;
const grad2 = ([a, b]) => [2 * (a - 2), 2 * (b - 1)];
const fmt = x => x === 0 ? '0' : Math.abs(x) >= 10000 || Math.abs(x) < .0001 ? x.toExponential(2) : String(Number(x.toFixed(4)));
const pair = p => `(${p.map(fmt).join(', ')})`;
const num = x => x < 0 ? `(${fmt(x)})` : fmt(x);
let chartId = 0;

function ticks(min, max, count) {
  const raw = (max - min) / count;
  const unit = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find(v => v * unit >= raw) * unit;
  const values = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-8; v += step) values.push(Math.abs(v) < step * 1e-8 ? 0 : v);
  return values;
}

function frame({ xmin, xmax, ymin, ymax, square = false, tickCount = 6, xlabel = '가중치 w', ylabel = '손실 J(w)', title }) {
  const width = square ? 540 : 650, height = square ? 510 : 360;
  const left = 68, right = square ? 38 : 26, top = 38, bottom = 55;
  // Square data ranges use equal scales on both axes.
  const pw = width - left - right, ph = square ? pw : height - top - bottom;
  const totalHeight = square ? top + ph + bottom : height;
  const x = n => left + (n - xmin) / (xmax - xmin) * pw;
  const y = n => top + ph - (n - ymin) / (ymax - ymin) * ph;
  const id = `dl-clip-${++chartId}`;
  let base = `<svg viewBox="0 0 ${width} ${totalHeight}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg"><title>${title}</title><defs><clipPath id="${id}"><rect x="${left}" y="${top}" width="${pw}" height="${ph}"/></clipPath></defs><rect x="${left}" y="${top}" width="${pw}" height="${ph}" fill="white"/>`;
  for (const v of ticks(xmin, xmax, tickCount)) {
    base += `<line x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${top + ph}" stroke="#e4e9ef"/><text x="${x(v)}" y="${top + ph + 22}" text-anchor="middle" font-size="13" fill="#536278">${fmt(Number(v.toPrecision(3)))}</text>`;
  }
  for (const v of ticks(ymin, ymax, square ? tickCount : 5)) {
    base += `<line x1="${left}" x2="${left + pw}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e9ef"/><text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" font-size="13" fill="#536278">${fmt(Number(v.toPrecision(3)))}</text>`;
  }
  base += `<path d="M ${left} ${top} V ${top + ph} H ${left + pw}" fill="none" stroke="#6b7a8f"/><text x="${left}" y="21" font-size="15" font-weight="600" fill="#34465e">${ylabel}</text><text x="${left + pw / 2}" y="${top + ph + 48}" text-anchor="middle" font-size="15" fill="#34465e">${xlabel}</text>`;
  return { x, y, base, clip: id, pw, ph, close: '</svg>' };
}
function point(x, y, color, r = 6) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="2"/>`;
}
function line(x1, y1, x2, y2, color, dashed = false) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${dashed ? 'stroke-dasharray="7 5"' : ''}/>`;
}
function plot1({ w, previous, history = [], h, tangent = false }) {
  const values = [w, ...history, ...(previous === undefined ? [] : [previous]), ...(h === undefined ? [] : [w + h])];
  const lo = Math.min(...values), hi = Math.max(...values), top = Math.max(...values.map(loss));
  const xmin = lo < -1 ? Math.floor(lo - .5) : -1;
  const xmax = hi > 5 ? Math.ceil(hi + .5) : 5;
  const ymax = top > 10 ? Math.ceil(top * 1.2) : 10;
  const p = frame({ xmin, xmax, ymin: 0, ymax, title: `가중치 w와 손실 J(w)의 관계. 현재 w=${fmt(w)}, 손실=${fmt(loss(w))}.` });
  const { x, y } = p;
  let s = p.base + `<g clip-path="url(#${p.clip})">`;
  const curve = Array.from({ length: 241 }, (_, i) => {
    const a = xmin + (xmax - xmin) * i / 240;
    return `${x(a)},${y(loss(a))}`;
  }).join(' ');
  s += `<polyline points="${curve}" fill="none" stroke="${C.curve}" stroke-width="2.5"/>`;
  if (tangent) {
    const g = grad(w);
    s += line(x(xmin), y(loss(w) + g * (xmin - w)), x(xmax), y(loss(w) + g * (xmax - w)), C.tangent, true);
  }
  if (h !== undefined) {
    const slope = (loss(w + h) - loss(w)) / h;
    s += line(x(xmin), y(loss(w) + slope * (xmin - w)), x(xmax), y(loss(w) + slope * (xmax - w)), C.secant);
    s += line(x(w), y(loss(w)), x(w + h), y(loss(w)), C.other, true);
    s += line(x(w + h), y(loss(w)), x(w + h), y(loss(w + h)), C.other, true);
    s += point(x(w + h), y(loss(w + h)), C.secant);
  }
  if (history.length > 1) {
    s += `<polyline points="${history.map(a => `${x(a)},${y(loss(a))}`).join(' ')}" fill="none" stroke="${C.current}" stroke-width="1.5" opacity=".65"/>`;
    history.slice(0, -1).forEach(a => { s += point(x(a), y(loss(a)), C.other, 3.5); });
  }
  if (previous !== undefined) {
    s += line(x(previous), y(loss(previous)), x(w), y(loss(w)), C.current, true);
    s += point(x(previous), y(loss(previous)), C.other, 5);
  }
  s += point(x(w), y(loss(w)), C.current, 7);
  s += '</g>';
  return s + p.close;
}
function plot2(history) {
  const pnow = history.at(-1);
  const extent = Math.max(3, ...history.flatMap(([a, b]) => [Math.abs(a - 2) + .5, Math.abs(b - 1) + .5]));
  const radius = Math.ceil(extent), xmin = 2 - radius, xmax = 2 + radius, ymin = 1 - radius, ymax = 1 + radius;
  const p = frame({ xmin, xmax, ymin, ymax, square: true, xlabel: '가중치 w₁', ylabel: '가중치 w₂', title: `두 가중치와 손실의 등고선. 현재 위치 ${pair(pnow)}, 손실 ${fmt(loss2(pnow))}.` });
  const { x, y } = p;
  let s = p.base + `<g clip-path="url(#${p.clip})">`;
  const levels = radius <= 4 ? [25, 16, 9, 4, 1] : [2, 1.4, .9, .45, .15].map(v => radius * radius * v);
  const colors = ['#f2f6fa', '#e6eef7', '#d3e3f2', '#b9d2e9', '#8fb6d8'];
  levels.forEach((v, i) => {
    s += `<circle cx="${x(2)}" cy="${y(1)}" r="${Math.sqrt(v) * p.pw / (2 * radius)}" fill="${colors[i]}" stroke="#8ba8c4" stroke-width="1"/>`;
    const a = 2 + Math.sqrt(v) / Math.sqrt(2), b = 1 + Math.sqrt(v) / Math.sqrt(2);
    if (a < xmax - .5 && b < ymax - .5) s += `<text x="${x(a)}" y="${y(b) - 5}" text-anchor="middle" font-size="13" fill="#365b7c">J = ${fmt(Number(v.toPrecision(3)))}</text>`;
  });
  s += `<polyline points="${history.map(([a, b]) => `${x(a)},${y(b)}`).join(' ')}" fill="none" stroke="${C.current}" stroke-width="2.5"/>`;
  history.slice(0, -1).forEach(([a, b]) => { s += point(x(a), y(b), C.other, 4); });
  s += `<path d="M ${x(2)-5} ${y(1)} h 10 M ${x(2)} ${y(1)-5} v 10" stroke="#1f3f7a" stroke-width="2.5"/>`;
  s += `<text x="${x(2) - 8}" y="${y(1) + 21}" text-anchor="end" font-size="13" fill="#1f3f7a">최솟점 (2, 1)</text>`;
  s += point(x(pnow[0]), y(pnow[1]), C.current, 7);
  return s + '</g>' + p.close;
}
function shell(root, title, controls, buttons, legend) {
  root.innerHTML = `<div class="dl-title">${title}</div><div class="dl-controls">${controls}</div><div class="dl-buttons">${buttons}</div><div class="dl-chart"></div><div class="dl-legend">${legend.map(([color, label]) => `<span style="--key:${color}">${label}</span>`).join('')}</div><div class="dl-readout" aria-live="polite" aria-atomic="true"></div>`;
  return { chart: root.querySelector('.dl-chart'), readout: root.querySelector('.dl-readout'), get: key => root.querySelector(`[data-control="${key}"]`) };
}
const button = (key, label) => `<button type="button" data-control="${key}">${label}</button>`;

function plotGradientVector(position) {
  const [a, b] = position, [g1, g2] = grad2(position);
  const end = [a + g1, b + g2];
  const radius = Math.max(3, Math.ceil(Math.max(Math.abs(end[0] - 2), Math.abs(end[1] - 1)) + 1));
  const p = frame({ xmin: 2 - radius, xmax: 2 + radius, ymin: 1 - radius, ymax: 1 + radius,
    square: true, tickCount: 8, xlabel: '가중치 w₁', ylabel: '가중치 w₂',
    title: `현재 가중치 ${pair(position)}에서 기울기 벡터 ${pair([g1, g2])}. 가로 성분 ${fmt(g1)}, 세로 성분 ${fmt(g2)}.` });
  const { x, y } = p, vertical = '#aa6a00';
  const marker = `${p.clip}-arrow`;
  const arrowColors = [C.tangent, vertical, C.secant];
  let s = p.base + `<defs>${arrowColors.map((color, i) => `<marker id="${marker}-${i}" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="${color}"/></marker>`).join('')}</defs><g clip-path="url(#${p.clip})">`;
  const levels = [100, 50, 25, 10, 5, 1];
  const colors = ['#f8fafc', '#eff4f9', '#e5edf6', '#d8e6f3', '#c4dbee', '#a8c8e3'];
  levels.forEach((v, i) => {
    s += `<circle cx="${x(2)}" cy="${y(1)}" r="${Math.sqrt(v) * p.pw / (2 * radius)}" fill="${colors[i]}" stroke="#abc0d5" stroke-width="1"/>`;
    const offset = Math.sqrt(v) / Math.sqrt(2);
    if (offset < radius - .7) s += `<text x="${x(2 - offset)}" y="${y(1 - offset) + 16}" text-anchor="middle" font-size="12" fill="#536b83">J = ${v}</text>`;
  });
  s += '</g>';
  const arrow = (from, to, color, dashed = false) => `<line x1="${x(from[0])}" y1="${y(from[1])}" x2="${x(to[0])}" y2="${y(to[1])}" stroke="${color}" stroke-width="2.8" ${dashed ? 'stroke-dasharray="6 3"' : ''} marker-end="url(#${marker}-${arrowColors.indexOf(color)})"/>`;
  if (g1 !== 0) {
    s += arrow(position, [end[0], b], C.tangent, true);
    s += `<text x="${x(a + g1 / 2)}" y="${y(b) - 10}" text-anchor="middle" font-size="16" fill="${C.tangent}">${fmt(g1)}</text>`;
  }
  if (g2 !== 0) {
    s += arrow([end[0], b], end, vertical, true);
    s += `<text x="${x(end[0]) + 12}" y="${y(b + g2 / 2) + 5}" font-size="16" fill="${vertical}">${fmt(g2)}</text>`;
  }
  if (g1 !== 0 || g2 !== 0) {
    s += arrow(position, end, C.secant);
    s += `<text x="${x(a + g1 * .55) - 12}" y="${y(b + g2 * .55) + 19}" text-anchor="end" font-size="16" font-weight="700" fill="${C.secant}">∇J</text>`;
  }
  s += `<path d="M ${x(2)-5} ${y(1)} h 10 M ${x(2)} ${y(1)-5} v 10" stroke="#1f3f7a" stroke-width="2.5"/>`;
  s += point(x(a), y(b), C.current, 6);
  s += `<text x="${x(a) - 10}" y="${y(b) - 12}" text-anchor="end" font-size="14" fill="${C.current}">현재 위치</text>`;
  return s + p.close;
}

function gradientVector(root) {
  const ui = shell(root, '직접 확인 — 편미분값을 모으면 어느 방향을 가리키는가',
    '<label>현재 w₁ <output data-control="w1-label">4</output><input type="range" min="0" max="4" step="0.5" value="4" data-control="w1"></label><label>현재 w₂ <output data-control="w2-label">0</output><input type="range" min="-1" max="3" step="0.5" value="0" data-control="w2"></label>',
    button('reset', '처음으로'),
    [[C.tangent, 'w₁의 편미분값'], ['#aa6a00', 'w₂의 편미분값'], [C.secant, '기울기 벡터 ∇J']]);
  function render() {
    const current = [Number(ui.get('w1').value), Number(ui.get('w2').value)];
    const g = grad2(current);
    root.dataset.weight = JSON.stringify(current); root.dataset.gradient = JSON.stringify(g);
    ui.get('w1-label').textContent = fmt(current[0]); ui.get('w2-label').textContent = fmt(current[1]);
    ui.chart.innerHTML = plotGradientVector(current);
    const direction = (values) => [values[0] > 0 ? '오른쪽 (w₁ 증가)' : values[0] < 0 ? '왼쪽 (w₁ 감소)' : '', values[1] > 0 ? '위쪽 (w₂ 증가)' : values[1] < 0 ? '아래쪽 (w₂ 감소)' : ''].filter(Boolean).join(' · ');
    const description = g.every(v => v === 0)
      ? '<p>기울기 벡터가 (0, 0)이므로 방향을 가리키는 화살표가 없다. 이 예제에서는 현재 위치가 최솟점이다.</p>'
      : `<p><strong>손실이 증가하는 방향:</strong> ${direction(g)}</p><p><strong>손실을 줄일 방향:</strong> ${direction(g.map(v => -v))}</p>`;
    ui.readout.innerHTML = `<p>현재 가중치 (w₁, w₂) = <strong>${pair(current)}</strong></p><p>편미분값: ∂J/∂w₁ = <strong>${fmt(g[0])}</strong>, ∂J/∂w₂ = <strong>${fmt(g[1])}</strong></p><p>기울기 벡터 ∇J = <strong>${pair(g)}</strong></p>${description}`;
  }
  ['w1', 'w2'].forEach(key => ui.get(key).addEventListener('input', render));
  ui.get('reset').addEventListener('click', () => { ui.get('w1').value = 4; ui.get('w2').value = 0; render(); });
  render();
}

function explore(root) {
  let w = 4, previous;
  const ui = shell(root, '직접 확인 — 가중치를 바꾸면 손실은 어떻게 달라지는가',
    '<label>시작 위치<select data-control="start"><option value="4">w = 4</option><option value="0">w = 0</option></select></label>',
    button('left', '왼쪽으로 0.5') + button('right', '오른쪽으로 0.5') + button('reset', '처음으로'),
    [[C.curve, '손실함수'], [C.current, '현재 위치'], [C.other, '이동 전 위치']]);
  function render() {
    root.dataset.weight = w;
    ui.chart.innerHTML = plot1({ w, previous });
    let note = '왼쪽 또는 오른쪽으로 이동해 손실을 비교한다.';
    if (previous !== undefined) {
      const d = loss(w) - loss(previous);
      note = `이동 전 손실 ${fmt(loss(previous))} → 이동 후 손실 ${fmt(loss(w))}. <strong>${d < -1e-10 ? `손실이 ${fmt(-d)} 감소했다.` : d > 1e-10 ? `손실이 ${fmt(d)} 증가했다.` : '손실이 같다.'}</strong>`;
    }
    ui.readout.innerHTML = `<div class="dl-metrics"><strong>가중치 w = ${fmt(w)}</strong><strong>손실 J(w) = ${fmt(loss(w))}</strong></div><p>${note}</p>`;
    ui.get('left').disabled = w <= -1;
    ui.get('right').disabled = w >= 5;
  }
  ['left', 'right'].forEach(key => ui.get(key).addEventListener('click', () => { previous = w; w += key === 'left' ? -.5 : .5; render(); }));
  function reset() { w = Number(ui.get('start').value); previous = undefined; render(); }
  ui.get('reset').addEventListener('click', reset);
  ui.get('start').addEventListener('change', reset);
  render();
}
function derivative(root) {
  const gaps = [1, .5, .1, .01];
  const ui = shell(root, '직접 확인 — 두 점을 가까이 옮기기',
    '<label>기준점<select data-control="base"><option value="4">w = 4</option><option value="0">w = 0</option><option value="2">w = 2</option></select></label><label>두 점 사이의 간격 <output data-control="gap-label">1</output><input type="range" min="0" max="3" step="1" value="0" data-control="gap"></label><label>접근하는 쪽<select data-control="side"><option value="1">오른쪽</option><option value="-1">왼쪽</option></select></label>', '',
    [[C.curve, '손실함수'], [C.secant, '두 점을 잇는 직선'], [C.tangent, '접선 (점선)']]);
  function render() {
    const w = Number(ui.get('base').value), h = gaps[Number(ui.get('gap').value)] * Number(ui.get('side').value);
    const d = loss(w + h) - loss(w), slope = d / h;
    ui.get('gap-label').textContent = fmt(Math.abs(h));
    ui.get('gap').setAttribute('aria-valuetext', fmt(Math.abs(h)));
    root.dataset.slope = slope;
    ui.chart.innerHTML = plot1({ w, h, tangent: true });
    ui.readout.innerHTML = `<p>가중치: ${fmt(w)} → ${fmt(w + h)} &nbsp; / &nbsp; 손실: ${fmt(loss(w))} → ${fmt(loss(w + h))}</p><p>두 점 사이의 변화율 = ${num(d)} ÷ ${num(h)} = <strong>${fmt(slope)}</strong></p><p>간격을 줄이면 변화율은 기준점의 접선 기울기 <strong>${fmt(grad(w))}</strong>에 가까워진다.</p>`;
  }
  ['base', 'gap', 'side'].forEach(key => ui.get(key).addEventListener('input', render));
  render();
}
function descent(root, dimension) {
  const two = dimension === 2;
  const starts = two ? '<label>시작 위치<select data-control="start"><option value="a">(w₁, w₂) = (4, 0)</option><option value="b">(w₁, w₂) = (0, 3)</option></select></label>' : '<label>시작 위치<select data-control="start"><option value="4">w = 4</option><option value="0">w = 0</option></select></label>';
  const ui = shell(root, two ? '직접 확인 — 두 가중치를 함께 갱신하기' : '직접 확인 — 미분값으로 가중치를 갱신하기',
    starts + '<label>학습률 η <output data-control="eta-label">0.1</output><input type="range" min="0.05" max="1.1" step="0.05" value="0.1" data-control="eta"></label>',
    button('step', '한 번 이동') + button('play', '자동 반복') + button('pause', '일시정지') + button('reset', '처음으로'),
    [[C.current, '현재 위치와 이동 경로'], [C.other, '이전 위치']]);
  let history = [], timer = null, eta = .1;
  const cost = two ? loss2 : loss, gradient = two ? grad2 : grad;
  const display = two ? pair : fmt;
  const atMinimum = () => cost(history.at(-1)) === 0;
  function pause() { if (timer !== null) clearInterval(timer); timer = null; }
  function render() {
    const now = history.at(-1), steps = history.length - 1, g = gradient(now);
    root.dataset.step = steps;
    root.dataset.weight = two ? JSON.stringify(now) : now;
    root.dataset.loss = cost(now);
    ui.chart.innerHTML = two ? plot2(history) : plot1({ w: now, history });
    let calculation = '「한 번 이동」을 눌러 첫 갱신을 확인한다.';
    if (steps > 0) {
      const before = history.at(-2), gb = gradient(before);
      calculation = two ? `이번 갱신: ${pair(before)} − ${fmt(eta)} × ${pair(gb)} = <strong>${pair(now)}</strong>` : `이번 갱신: ${fmt(before)} − ${fmt(eta)} × ${num(gb)} = <strong>${fmt(now)}</strong>`;
    }
    const next = atMinimum() ? '현재 미분값이 0이므로 더 이동하지 않는다.' : steps >= 20 ? '20회 갱신을 마쳤다. 학습률이나 시작 위치를 바꾸어 비교할 수 있다.' : `${two ? '현재 위치의 기울기 벡터' : '현재 위치의 미분값'} = <strong>${display(g)}</strong>. 다음 갱신에는 이 값을 사용한다.`;
    ui.readout.innerHTML = `<p><strong>갱신 ${steps}회${timer === null ? '' : ' · 반복 중'}</strong></p><div class="dl-metrics"><span>${two ? '가중치 (w₁, w₂)' : '가중치 w'} = <strong>${display(now)}</strong></span><span>손실 J = <strong>${fmt(cost(now))}</strong></span></div><p>${calculation}</p><p>${next}</p>`;
    ui.get('step').disabled = steps >= 20 || atMinimum();
    ui.get('play').disabled = timer !== null || steps >= 20 || atMinimum();
    ui.get('pause').disabled = timer === null;
  }
  function step() {
    if (history.length > 20 || atMinimum()) { pause(); render(); return; }
    const now = history.at(-1), g = gradient(now);
    history.push(two ? now.map((v, i) => v - eta * g[i]) : now - eta * g);
    if (history.length > 20 || atMinimum()) pause();
    render();
  }
  function reset() {
    pause(); eta = Number(ui.get('eta').value); ui.get('eta-label').textContent = fmt(eta);
    const start = ui.get('start').value;
    history = [two ? (start === 'a' ? [4, 0] : [0, 3]) : Number(start)];
    render();
  }
  ui.get('step').addEventListener('click', () => { pause(); step(); });
  ui.get('play').addEventListener('click', () => { if (timer === null && history.length <= 20 && !atMinimum()) { timer = setInterval(step, 850); render(); } });
  ui.get('pause').addEventListener('click', () => { pause(); render(); });
  ui.get('reset').addEventListener('click', reset);
  ui.get('eta').addEventListener('input', reset);
  ui.get('start').addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); render(); } });
  reset();
}
for (const root of document.querySelectorAll('[data-dl-demo]')) {
  const mode = root.dataset.dlDemo;
  if (mode === 'explore') explore(root);
  else if (mode === 'gradient-vector') gradientVector(root);
  else if (mode === 'derivative') derivative(root);
  else if (mode === 'descent') descent(root, 1);
  else if (mode === 'descent2') descent(root, 2);
}
