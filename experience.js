(() => {
  'use strict';
  const canvas = document.getElementById('flow-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 1;
  let height = 1;
  let ratio = 1;
  let pointerX = 0;
  let pointerY = 0;
  let data = window.LastroVisualData || { totals: { entries: 0, exits: 0, balance: 0 }, breakdown: [] };
  let startedAt = performance.now();
  let frame = 0;

  const categoryColors = ['#cf6d3f', '#e7aa72', '#9f6570', '#6d8a78', '#d9c28d', '#bd7658', '#7d6d87', '#b49b83'];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.min(devicePixelRatio || 1, 1.7);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint(1);
  }

  function ribbon(x1, y1, x2, y2, bend, thickness, color, alpha) {
    const gradient = context.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, `${color}10`);
    gradient.addColorStop(0.45, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${color}18`);
    context.beginPath();
    context.moveTo(x1, y1 - thickness / 2);
    context.bezierCurveTo(width * .34, y1 - bend, width * .65, y2 + bend, x2, y2 - thickness / 2);
    context.lineTo(x2, y2 + thickness / 2);
    context.bezierCurveTo(width * .65, y2 + bend + thickness, width * .34, y1 - bend + thickness, x1, y1 + thickness / 2);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
  }

  function paint(progress = 1) {
    context.fillStyle = '#2c1018';
    context.fillRect(0, 0, width, height);
    const cx = width * (0.52 + pointerX * 0.025);
    const cy = height * (0.50 + pointerY * 0.025);
    const max = Math.max(data.totals.entries, data.totals.exits, 1);
    const income = data.totals.entries / max;
    const expense = data.totals.exits / max;

    context.save();
    context.globalAlpha = .4;
    for (let index = 0; index < 7; index += 1) {
      context.beginPath();
      context.ellipse(cx, cy, width * (.12 + index * .055), height * (.14 + index * .05), -.18, 0, Math.PI * 2);
      context.strokeStyle = index % 2 ? '#cf6d3f44' : '#f3efe422';
      context.lineWidth = 1;
      context.stroke();
    }
    context.restore();

    ribbon(-20, height * .26, width + 20, height * .42, height * .18, 9 + income * 28 * progress, '#d99a70', .72);
    ribbon(-20, height * .73, width + 20, height * .58, -height * .2, 9 + expense * 28 * progress, '#7da38d', .64);

    const radius = Math.min(width, height) * .255;
    const totalCategories = data.breakdown.reduce((sum, item) => sum + item.cents, 0) || 1;
    let angle = -Math.PI / 2;
    data.breakdown.slice(0, 8).forEach((item, index) => {
      const arc = Math.max(.04, item.cents / totalCategories * Math.PI * 2) * progress;
      context.beginPath();
      context.arc(cx, cy, radius + index % 2 * 7, angle, angle + arc - .025);
      context.strokeStyle = categoryColors[index];
      context.lineWidth = 5 + (item.cents / totalCategories) * 18;
      context.stroke();
      angle += arc;
    });

    const balanceRatio = Math.min(1, Math.abs(data.totals.balance) / max);
    const core = context.createRadialGradient(cx, cy, 1, cx, cy, radius * .62);
    core.addColorStop(0, data.totals.balance < 0 ? '#cf6d3faa' : '#89bca5aa');
    core.addColorStop(.25, '#f3efe42b');
    core.addColorStop(1, '#2c101800');
    context.fillStyle = core;
    context.beginPath();
    context.arc(cx, cy, radius * (.42 + balanceRatio * .18) * progress, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(cx, cy, 3.5, 0, Math.PI * 2);
    context.fillStyle = '#f3efe4';
    context.fill();
  }

  function animate(now) {
    frame = 0;
    const elapsed = Math.min(1, Math.max(0, (now - startedAt) / 820));
    const eased = 1 - Math.pow(1 - elapsed, 3);
    paint(reduced ? 1 : eased);
    if (elapsed < 1 && !reduced && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function update(next) {
    data = next;
    startedAt = performance.now();
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(animate);
  }

  window.addEventListener('lastro:data', event => update(event.detail));
  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - .5;
    pointerY = (event.clientY - rect.top) / rect.height - .5;
    paint(1);
  });
  canvas.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; paint(1); });
  new ResizeObserver(resize).observe(canvas);
  update(data);
})();
