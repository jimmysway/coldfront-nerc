/**
 * NERC allocation detail: SU cost usage table (cumulative/daily), CSV export, DataTables.
 * Expects {{ charges|json_script:"charges-data" }} and #allocationUsageTable in the template.
 */

const DEV_USE_MOCK_RAW_DATA = false;
const DEV_VERBOSE_LOGGING = false;

function generateUsageLabels(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const labels = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    labels.push(
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
  }
  return labels;
}

function calculateDailyData(cumulativeData) {
  const dailyData = [];
  for (let i = 0; i < cumulativeData.length; i++) {
    if (cumulativeData[i] === null || cumulativeData[i] === undefined) {
      dailyData.push(null);
    } else if (i === 0) {
      dailyData.push(cumulativeData[i]);
    } else if (
      cumulativeData[i - 1] === null ||
      cumulativeData[i - 1] === undefined
    ) {
      dailyData.push(null);
    } else {
      dailyData.push(cumulativeData[i] - cumulativeData[i - 1]);
    }
  }
  return dailyData;
}

function generateMockRawData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const data = {};
  const totals = {
    'OpenStack CPU SU': 0,
    'OpenStack GPU A100 SU': 0,
  };
  const dailyRates = {
    'OpenStack CPU SU': 2.5,
    'OpenStack GPU A100 SU': 12.8,
  };
  for (let day = 1; day <= today; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = {};
    for (const [suType, rate] of Object.entries(dailyRates)) {
      const dailyUsage = rate * (0.5 + Math.random());
      totals[suType] += dailyUsage;
      dayData[suType] = totals[suType].toFixed(2);
    }
    data[dateStr] = dayData;
  }
  return data;
}

function transformCumulativeCharges(rawData) {
  if (!rawData || typeof rawData !== 'object' || Object.keys(rawData).length === 0) {
    return null;
  }

  const sortedDates = Object.keys(rawData).sort();
  if (sortedDates.length === 0) return null;

  const firstDate = sortedDates[0];
  const [yearStr, monthStr] = firstDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  const suTypes = new Set();
  for (const dateStr of sortedDates) {
    const dayData = rawData[dateStr];
    if (dayData && typeof dayData === 'object') {
      Object.keys(dayData).forEach((su) => suTypes.add(su));
    }
  }

  const datasets = [];
  const sortedSuTypes = Array.from(suTypes).sort();

  sortedSuTypes.forEach((suType) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = new Array(daysInMonth).fill(null);
    for (const dateStr of sortedDates) {
      const dayData = rawData[dateStr];
      if (!dayData || dayData[suType] === undefined) continue;
      const day = parseInt(dateStr.split('-')[2], 10);
      if (day >= 1 && day <= daysInMonth) {
        data[day - 1] = parseFloat(dayData[suType]);
      }
    }
    datasets.push({ label: suType, data });
  });

  return { year, month, datasets };
}

function loadUsageDataFromDOM() {
  let rawData = null;
  const chargesDataElement = document.getElementById('charges-data');
  if (chargesDataElement) {
    try {
      rawData = JSON.parse(chargesDataElement.textContent);
      if (!rawData || Object.keys(rawData).length === 0) {
        rawData = null;
      }
    } catch (e) {
      console.warn('[NERC usage table] Failed to parse backend data:', e);
    }
  }

  if (!rawData && DEV_USE_MOCK_RAW_DATA) {
    rawData = generateMockRawData();
    console.warn('[NERC usage table] Using DEV MOCK data');
  }

  if (!rawData) return null;

  if (DEV_VERBOSE_LOGGING) {
    console.log('[NERC usage table] Raw data:', rawData);
  }
  const transformed = transformCumulativeCharges(rawData);
  if (DEV_VERBOSE_LOGGING) {
    console.log('[NERC usage table] Transformed:', transformed);
  }
  return transformed;
}

let usageDatasets = [];
let usageLabels = [];
let currentDataMode = 'cumulative';
let dataTableInstance = null;

const usageTable = () => document.getElementById('allocationUsageTable');
const usageEmptyState = () => document.getElementById('usage-table-empty');
const cumulativeBtn = () => document.getElementById('show-cumulative-btn');
const dailyBtn = () => document.getElementById('show-daily-btn');
const chartTitle = () => document.getElementById('chart-title');
const chartSubtitle = () => document.getElementById('chart-subtitle');

function showUsageEmptyState(message) {
  const table = usageTable();
  const empty = usageEmptyState();
  if (table) table.style.display = 'none';
  if (empty) {
    empty.textContent = message;
    empty.style.display = 'block';
  }
}

function hideUsageEmptyState() {
  const table = usageTable();
  const empty = usageEmptyState();
  if (table) table.style.display = '';
  if (empty) empty.style.display = 'none';
}

function getDataForMode(mode) {
  if (mode === 'daily') {
    return usageDatasets.map((ds) => ({
      ...ds,
      data: calculateDailyData(ds.data),
    }));
  }
  return usageDatasets;
}

const modeConfig = {
  cumulative: {
    title: 'SU Cost - Cumulative',
    subtitle: 'Showing the cumulative cost for this month',
  },
  daily: {
    title: 'SU Cost - Daily',
    subtitle: 'Showing the daily cost for this month',
  },
};

function populateUsageTable(datasets) {
  const table = document.getElementById('allocationUsageTable');
  if (!table) return;

  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  let headerRow = '<tr>';
  headerRow += '<th scope="col">Date</th>';
  datasets.forEach((ds) => {
    headerRow += `<th scope="col">${ds.label} (USD)</th>`;
  });
  headerRow += '<th scope="col">Total (USD)</th>';
  headerRow += '</tr>';
  thead.innerHTML = headerRow;

  let bodyRows = '';
  usageLabels.forEach((label, i) => {
    bodyRows += '<tr>';
    bodyRows += `<th scope="row" class="text-nowrap">${label}</th>`;
    let rowTotal = 0;
    let hasMissing = false;
    datasets.forEach((ds) => {
      const val = ds.data[i];
      if (val !== null && val !== undefined) {
        rowTotal += val;
        bodyRows += `<td>${val.toFixed(2)}</td>`;
      } else {
        hasMissing = true;
        bodyRows += `<td class="text-muted">-</td>`;
      }
    });
    if (hasMissing) {
      bodyRows += `<td class="text-muted">-</td>`;
    } else {
      bodyRows += `<td><strong>${rowTotal.toFixed(2)}</strong></td>`;
    }
    bodyRows += '</tr>';
  });
  tbody.innerHTML = bodyRows;

  if (typeof $ !== 'undefined' && $.fn.DataTable) {
    dataTableInstance = $('#allocationUsageTable').DataTable({
      aoColumnDefs: [
        {
          bSortable: false,
          aTargets: ['nosort'],
        },
      ],
    });
  }
}

function setModeButtons(mode) {
  const cumulative = cumulativeBtn();
  const daily = dailyBtn();
  if (!cumulative || !daily) return;
  cumulative.classList.toggle('btn-primary', mode === 'cumulative');
  cumulative.classList.toggle('btn-outline-primary', mode !== 'cumulative');
  daily.classList.toggle('btn-primary', mode === 'daily');
  daily.classList.toggle('btn-outline-primary', mode !== 'daily');
}

function switchMode(mode) {
  if (currentDataMode === mode) return;
  currentDataMode = mode;
  setModeButtons(mode);
  populateUsageTable(getDataForMode(mode));
  const title = chartTitle();
  const subtitle = chartSubtitle();
  if (title) title.textContent = modeConfig[mode].title;
  if (subtitle) subtitle.textContent = modeConfig[mode].subtitle;
}

function initUsageTable() {
  const usageChartData = loadUsageDataFromDOM();
  const usageYear = usageChartData?.year ?? new Date().getFullYear();
  const usageMonth =
    usageChartData?.month !== undefined
      ? usageChartData.month
      : new Date().getMonth();
  usageLabels = generateUsageLabels(usageYear, usageMonth);
  usageDatasets =
    usageChartData && usageChartData.datasets.length > 0
      ? usageChartData.datasets
      : [];

  if (usageDatasets.length === 0) {
    showUsageEmptyState('No billing data available for this month.');
    return;
  }

  hideUsageEmptyState();
  setModeButtons('cumulative');
  populateUsageTable(getDataForMode('cumulative'));
  cumulativeBtn()?.addEventListener('click', () => switchMode('cumulative'));
  dailyBtn()?.addEventListener('click', () => switchMode('daily'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUsageTable);
} else {
  initUsageTable();
}

if (typeof window !== 'undefined') {
  window.transformCumulativeChargesForTest = transformCumulativeCharges;
}
