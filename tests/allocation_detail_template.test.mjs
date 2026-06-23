import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const templatePath = path.resolve('src/templates/allocation/allocation_detail.html');
const template = fs.readFileSync(templatePath, 'utf8');

test('costs card and toggle elements exist', () => {
  assert.ok(template.includes('id="su-costs-card"'));
  assert.ok(template.includes('id="cumulative-table-wrap"'));
  assert.ok(template.includes('id="daily-table-wrap"'));
  assert.ok(template.includes('id="show-cumulative-btn"'));
  assert.ok(template.includes('id="show-daily-btn"'));
});

test('template renders server-side usage rows from usage_table context', () => {
  assert.ok(template.includes('{% if usage_table.has_data %}'));
  assert.ok(template.includes('{% for row in usage_table.cumulative_rows %}'));
  assert.ok(template.includes('{% for row in usage_table.daily_rows %}'));
  assert.ok(template.includes('id="usage-cumulative-table"'));
  assert.ok(template.includes('id="usage-daily-table"'));
  assert.ok(template.includes('data-order="{{ forloop.counter }}"'));
  assert.ok(template.includes('No billing data available for this month.'));
});

test('template does not embed charges JSON for client-side table building', () => {
  assert.ok(!template.includes('json_script:"charges-data"'));
  assert.ok(!template.includes('id="charges-data"'));
  assert.ok(!template.includes('id="allocationUsageTable"'));
});

test('template loads allocation detail toggle script', () => {
  assert.ok(template.includes("{% static 'js/allocation_detail.js' %}"));
});
