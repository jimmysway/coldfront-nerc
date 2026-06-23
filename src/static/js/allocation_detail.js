/**
 * NERC allocation detail: toggle cumulative/daily usage cost tables.
 * Tables are server-rendered in allocation_detail.html; DataTables adds sort/pagination.
 */

const USAGE_MODES = {
  cumulative: {
    wrapId: 'cumulative-table-wrap',
    tableId: 'usage-cumulative-table',
    btnId: 'show-cumulative-btn',
    title: 'SU Cost - Cumulative',
    subtitle: 'Showing the cumulative cost for this month',
  },
  daily: {
    wrapId: 'daily-table-wrap',
    tableId: 'usage-daily-table',
    btnId: 'show-daily-btn',
    title: 'SU Cost - Daily',
    subtitle: 'Showing the daily cost for this month',
  },
};

const USAGE_TABLE_DT_OPTIONS = {
  lengthMenu: [5, 10, 20, 50, 100],
  pageLength: 10,
  order: [[0, 'asc']],
};

const usageDataTables = {};

function initUsageDataTable(tableId) {
  if (typeof $ === 'undefined' || !$.fn.DataTable) return null;
  const selector = `#${tableId}`;
  if (!document.getElementById(tableId)) return null;
  if ($.fn.DataTable.isDataTable(selector)) {
    return $(selector).DataTable();
  }
  return $(selector).DataTable(USAGE_TABLE_DT_OPTIONS);
}

function initUsageDataTables() {
  for (const cfg of Object.values(USAGE_MODES)) {
    usageDataTables[cfg.tableId] = initUsageDataTable(cfg.tableId);
  }
}

function setUsageMode(mode) {
  for (const [name, cfg] of Object.entries(USAGE_MODES)) {
    const wrap = document.getElementById(cfg.wrapId);
    const btn = document.getElementById(cfg.btnId);
    if (wrap) {
      wrap.style.display = name === mode ? '' : 'none';
    }
    if (btn) {
      btn.classList.toggle('btn-primary', name === mode);
      btn.classList.toggle('btn-outline-primary', name !== mode);
    }
  }

  const active = USAGE_MODES[mode];
  const dt = usageDataTables[active.tableId];
  if (dt) {
    dt.columns.adjust().draw(false);
  }

  const title = document.getElementById('chart-title');
  const subtitle = document.getElementById('chart-subtitle');
  if (title) title.textContent = active.title;
  if (subtitle) subtitle.textContent = active.subtitle;
}

function initUsageTableToggle() {
  if (!document.getElementById('su-costs-card')) return;

  initUsageDataTables();

  document
    .getElementById('show-cumulative-btn')
    ?.addEventListener('click', () => setUsageMode('cumulative'));
  document
    .getElementById('show-daily-btn')
    ?.addEventListener('click', () => setUsageMode('daily'));
  setUsageMode('cumulative');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUsageTableToggle);
} else {
  initUsageTableToggle();
}

if (typeof window !== 'undefined') {
  window.setUsageModeForTest = setUsageMode;
}
