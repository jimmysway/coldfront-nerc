import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadAllocationDetailJs() {
  const scriptPath = path.resolve('src/static/js/allocation_detail.js');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const sandbox = {
    console,
    Date,
    window: {},
    document: {
      readyState: 'complete',
      getElementById: () => null,
      addEventListener: () => {},
    },
    $: undefined,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: scriptPath });
  return sandbox;
}

test('transformCumulativeCharges sorts dates and parses numeric values', () => {
  // We need predictable ordering so the same day always lines up
  // with the same table row and users do not see shuffled values.
  const sandbox = loadAllocationDetailJs();
  const raw = {
    '2026-05-03': { 'GPU SU': '8.40', 'CPU SU': '3.20' },
    '2026-05-01': { 'GPU SU': '2.10', 'CPU SU': '1.00' },
    '2026-05-02': { 'GPU SU': '5.00', 'CPU SU': '2.25' },
  };

  const transformed = sandbox.transformCumulativeCharges(raw);
  assert.equal(transformed.year, 2026);
  assert.equal(transformed.month, 4);
  assert.deepEqual(toPlain(transformed.datasets.map((d) => d.label)), ['CPU SU', 'GPU SU']);
  const cpuData = toPlain(transformed.datasets[0].data);
  const gpuData = toPlain(transformed.datasets[1].data);
  assert.equal(cpuData[0], 1.0);
  assert.equal(cpuData[1], 2.25);
  assert.equal(cpuData[2], 3.2);
  assert.equal(gpuData[0], 2.1);
  assert.equal(gpuData[1], 5.0);
  assert.equal(gpuData[2], 8.4);
  assert.equal(cpuData[3], null);
});

test('transformCumulativeCharges returns null for empty input', () => {
  // Returning null for empty payload keeps the UI from showing a fake
  // or misleading table when there is no billing data.
  const sandbox = loadAllocationDetailJs();
  assert.equal(sandbox.transformCumulativeCharges(null), null);
  assert.equal(sandbox.transformCumulativeCharges({}), null);
});

test('calculateDailyData derives increments and preserves gaps', () => {
  // Missing days should stay visibly blank so we do not imply usage
  // happened when the source data had a gap.
  const sandbox = loadAllocationDetailJs();
  const daily = sandbox.calculateDailyData([1.5, 2.5, null, 7.0, 10.0]);
  assert.deepEqual(toPlain(daily), [1.5, 1.0, null, null, 3.0]);
});

test('loadUsageDataFromDOM reads and transforms charges-data payload', () => {
  // If this breaks, the table stays empty even when backend data is valid.
  // This test protects that data handoff.
  const sandbox = loadAllocationDetailJs();

  sandbox.document.getElementById = (id) => {
    if (id !== 'charges-data') return null;
    return {
      textContent: JSON.stringify({
        '2026-05-01': { CPU: '10.00' },
        '2026-05-02': { CPU: '14.50' },
      }),
    };
  };

  const transformed = sandbox.loadUsageDataFromDOM();
  assert.ok(transformed);
  assert.equal(transformed.year, 2026);
  assert.equal(transformed.month, 4);
  assert.equal(transformed.datasets.length, 1);
  assert.equal(transformed.datasets[0].label, 'CPU');
  assert.equal(transformed.datasets[0].data[0], 10);
  assert.equal(transformed.datasets[0].data[1], 14.5);
  assert.equal(transformed.datasets[0].data[2], null);
});
