import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const templatePath = path.resolve('src/templates/allocation/allocation_detail.html');
const template = fs.readFileSync(templatePath, 'utf8');

test('costs card and table elements exist', () => {
  // These IDs are the contract between template and JS; if they change,
  // users lose the usage table even when data exists.
  assert.ok(template.includes('id="su-costs-card"'));
  assert.ok(template.includes('id="allocationUsageTable"'));
  assert.ok(template.includes('id="show-cumulative-btn"'));
  assert.ok(template.includes('id="show-daily-btn"'));
});

test('template includes charges JSON sources', () => {
  // We support both context-based and attribute-based charge payloads
  // so allocation pages still show data across different backend paths.
  assert.ok(template.includes('{{ charges|json_script:"charges-data" }}'));
  assert.ok(template.includes('usage-table-empty'));
  assert.ok(
    template.includes('<script id="charges-data" type="application/json">')
  );
});

test('template loads allocation detail JS asset', () => {
  // Without this script include, the costs section renders as an empty shell.
  assert.ok(template.includes("{% static 'js/allocation_detail.js' %}"));
});
