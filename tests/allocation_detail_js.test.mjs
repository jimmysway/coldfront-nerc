import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadAllocationDetailJs() {
  const scriptPath = path.resolve('src/static/js/allocation_detail.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const elements = new Map();

  const sandbox = {
    console,
    window: {},
    document: {
      readyState: 'complete',
      getElementById: (id) => elements.get(id) ?? null,
      addEventListener: () => {},
    },
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: scriptPath });
  return { sandbox, elements };
}

function makeToggleElement(id, tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    style: { display: '' },
    classList: {
      _classes: new Set(),
      toggle(name, on) {
        if (on) this._classes.add(name);
        else this._classes.delete(name);
      },
    },
  };
}

test('usage table script initializes DataTables', () => {
  const scriptPath = path.resolve('src/static/js/allocation_detail.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  assert.ok(code.includes('DataTable'));
  assert.ok(code.includes('pageLength: 10'));
  assert.ok(code.includes('lengthMenu'));
});

test('setUsageMode shows cumulative table and updates button styles', () => {
  const { sandbox, elements } = loadAllocationDetailJs();

  const cumulativeWrap = makeToggleElement('cumulative-table-wrap');
  const dailyWrap = makeToggleElement('daily-table-wrap');
  dailyWrap.style.display = 'none';
  const cumulativeBtn = makeToggleElement('show-cumulative-btn', 'button');
  const dailyBtn = makeToggleElement('show-daily-btn', 'button');
  const title = { textContent: '' };
  const subtitle = { textContent: '' };

  for (const [id, el] of [
    ['cumulative-table-wrap', cumulativeWrap],
    ['daily-table-wrap', dailyWrap],
    ['show-cumulative-btn', cumulativeBtn],
    ['show-daily-btn', dailyBtn],
    ['chart-title', title],
    ['chart-subtitle', subtitle],
  ]) {
    elements.set(id, el);
  }

  sandbox.setUsageModeForTest('daily');
  assert.equal(cumulativeWrap.style.display, 'none');
  assert.equal(dailyWrap.style.display, '');
  assert.ok(dailyBtn.classList._classes.has('btn-primary'));
  assert.equal(title.textContent, 'SU Cost - Daily');

  sandbox.setUsageModeForTest('cumulative');
  assert.equal(cumulativeWrap.style.display, '');
  assert.equal(dailyWrap.style.display, 'none');
  assert.ok(cumulativeBtn.classList._classes.has('btn-primary'));
  assert.equal(title.textContent, 'SU Cost - Cumulative');
});
