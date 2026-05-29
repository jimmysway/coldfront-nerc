/**
 * External Chart.js tooltip (custom DOM).
 */

function isNumericY(y) {
  return y !== null && y !== undefined && typeof y === 'number' && !Number.isNaN(y);
}

function getOrCreateTooltip(chart) {
  const parent = chart.canvas.parentNode;
  let el = parent.querySelector('#chartjs-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'chartjs-tooltip';
    el.append(document.createElement('table'));
    parent.append(el);
  }
  return el;
}

function buildTitleHead(titleLines) {
  const thead = document.createElement('thead');
  for (const title of titleLines) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = title;
    tr.append(th);
    thead.append(tr);
  }
  return thead;
}

function buildBody(chart, dataPoints) {
  const tbody = document.createElement('tbody');
  let total = 0;

  for (const dp of dataPoints) {
    const dataset = chart.data.datasets[dp.datasetIndex];
    const y = dp.parsed.y;
    const has = isNumericY(y);
    if (has) total += y;

    const tr = document.createElement('tr');
    tr.className = 'tooltip-row';

    const left = document.createElement('span');
    left.className = 'tooltip-left';
    const swatch = document.createElement('span');
    swatch.className = 'tooltip-box';
    swatch.style.background = dataset.borderColor;
    const lab = document.createElement('span');
    lab.className = 'tooltip-label';
    lab.textContent = dp.dataset.label;
    left.append(swatch, lab);

    const right = document.createElement('span');
    right.className = 'tooltip-value';
    right.textContent = has ? `${dp.formattedValue || y} USD` : '—';

    const td = document.createElement('td');
    td.append(left, right);
    tr.append(td);
    tbody.append(tr);
  }

  if (total > 0) {
    const tr = document.createElement('tr');
    tr.className = 'tooltip-total-row';
    const td = document.createElement('td');
    const left = document.createElement('span');
    left.className = 'tooltip-total-label';
    left.textContent = 'Total';
    const right = document.createElement('span');
    right.className = 'tooltip-total-value';
    right.textContent = `${total.toFixed(2)} USD`;
    td.append(left, right);
    tr.append(td);
    tbody.append(tr);
  }

  return tbody;
}

const externalTooltipHandler = (context) => {
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = '0';
    return;
  }

  if (tooltip.body) {
    const table = tooltipEl.querySelector('table');
    const thead = buildTitleHead(tooltip.title || []);
    const tbody = buildBody(chart, tooltip.dataPoints || []);
    table.replaceChildren(thead, tbody);
  }

  const { offsetLeft: px, offsetTop: py } = chart.canvas;
  Object.assign(tooltipEl.style, {
    opacity: '1',
    left: `${px + tooltip.caretX + 30}px`,
    top: `${py + tooltip.caretY}px`,
    transform: 'translate(0, -50%)'
  });
};
