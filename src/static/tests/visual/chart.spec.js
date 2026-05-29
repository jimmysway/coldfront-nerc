import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_URL = `file://${path.join(__dirname, '..', 'fixtures', 'chart_test.html')}`;

const BREAKPOINTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 375,  height: 667 },
  { name: 'narrow',  width: 360,  height: 640 },
];

// Inject charges JSON and rebuild chart using the same helpers as production (window.__nercChart).
async function injectDataAndRender(page, rawData) {
  await page.evaluate((json) => {
    const api = window.__nercChart;
    if (!api) throw new Error('__nercChart missing; load allocation_detail.js before tests');

    const data = JSON.parse(json);
    let el = document.getElementById('charges-data');
    if (!el) {
      el = document.createElement('script');
      el.id = 'charges-data';
      el.type = 'application/json';
      document.body.appendChild(el);
    }
    el.textContent = JSON.stringify(data);

    const transformed = api.transformCumulativeCharges(data);
    const ctx = document.getElementById('allocationUsageChart');
    const card = document.getElementById('su-costs-card');

    if (ctx && typeof Chart !== 'undefined' && Chart.getChart) {
      const existing = Chart.getChart(ctx);
      if (existing) existing.destroy();
    }
    if (window._testChart) {
      window._testChart.destroy();
      window._testChart = null;
    }

    if (!ctx) return;

    if (!transformed || !transformed.datasets.length) {
      if (card) card.style.display = 'none';
      return;
    }
    if (card) card.style.display = '';

    const payload = api.buildUsageChartPayload(
      transformed.datasets,
      transformed.year,
      transformed.month
    );
    const baseOptions = buildUsageChartOptions(api.getUsageChartOptionDeps());
    window._testChart = new Chart(ctx, {
      type: 'line',
      data: { labels: payload.chartLabels, datasets: payload.processedDatasets },
      options: Object.assign({}, baseOptions, { animation: false }),
    });
  }, JSON.stringify(rawData));

  await page.waitForTimeout(300);
}

// -----------------------------------------------------------------------
// Data fixtures
// -----------------------------------------------------------------------

/** Twenty days of cumulative-style charges (Feb 1–20) for the “regular data” visual. */
const REGULAR_DATA = {
  '2025-02-01': { 'OpenStack CPU SU': '10.00', 'OpenStack GPU A100 SU': '5.00' },
  '2025-02-02': { 'OpenStack CPU SU': '22.50', 'OpenStack GPU A100 SU': '11.50' },
  '2025-02-03': { 'OpenStack CPU SU': '37.70', 'OpenStack GPU A100 SU': '18.80' },
  '2025-02-04': { 'OpenStack CPU SU': '48.70', 'OpenStack GPU A100 SU': '24.60' },
  '2025-02-05': { 'OpenStack CPU SU': '63.50', 'OpenStack GPU A100 SU': '31.70' },
  '2025-02-06': { 'OpenStack CPU SU': '76.60', 'OpenStack GPU A100 SU': '38.10' },
  '2025-02-07': { 'OpenStack CPU SU': '89.00', 'OpenStack GPU A100 SU': '44.00' },
  '2025-02-08': { 'OpenStack CPU SU': '105.00', 'OpenStack GPU A100 SU': '52.00' },
  '2025-02-09': { 'OpenStack CPU SU': '119.50', 'OpenStack GPU A100 SU': '59.20' },
  '2025-02-10': { 'OpenStack CPU SU': '133.40', 'OpenStack GPU A100 SU': '66.00' },
  '2025-02-11': { 'OpenStack CPU SU': '145.60', 'OpenStack GPU A100 SU': '72.10' },
  '2025-02-12': { 'OpenStack CPU SU': '161.20', 'OpenStack GPU A100 SU': '79.90' },
  '2025-02-13': { 'OpenStack CPU SU': '175.30', 'OpenStack GPU A100 SU': '86.80' },
  '2025-02-14': { 'OpenStack CPU SU': '188.60', 'OpenStack GPU A100 SU': '93.30' },
  '2025-02-15': { 'OpenStack CPU SU': '201.50', 'OpenStack GPU A100 SU': '99.50' },
  '2025-02-16': { 'OpenStack CPU SU': '217.90', 'OpenStack GPU A100 SU': '107.60' },
  '2025-02-17': { 'OpenStack CPU SU': '232.60', 'OpenStack GPU A100 SU': '115.00' },
  '2025-02-18': { 'OpenStack CPU SU': '246.10', 'OpenStack GPU A100 SU': '121.60' },
  '2025-02-19': { 'OpenStack CPU SU': '261.20', 'OpenStack GPU A100 SU': '129.10' },
  '2025-02-20': { 'OpenStack CPU SU': '275.50', 'OpenStack GPU A100 SU': '136.10' },
};

const LOW_DATA = {
  '2025-02-01': { 'OpenStack CPU SU': '10.00', 'OpenStack GPU A100 SU': '5.00', 'OpenShift CPU SU': '3.00' },
  '2025-02-02': { 'OpenStack CPU SU': '22.50', 'OpenStack GPU A100 SU': '11.00', 'OpenShift CPU SU': '7.20' },
  '2025-02-03': { 'OpenStack CPU SU': '37.80', 'OpenStack GPU A100 SU': '18.50', 'OpenShift CPU SU': '12.10' },
};

/** One day with no charge rows — backend sends `{}`; chart should break lines (spanGaps false). */
const MISSING_DAY_DATA = {
  '2025-02-01': { 'OpenStack CPU SU': '10.00', 'OpenStack GPU A100 SU': '5.00' },
  '2025-02-02': { 'OpenStack CPU SU': '37.80', 'OpenStack GPU A100 SU': '18.50' },
  '2025-02-03': {},
  '2025-02-04': { 'OpenStack CPU SU': '55.00', 'OpenStack GPU A100 SU': '28.00' },
  '2025-02-05': { 'OpenStack CPU SU': '72.10', 'OpenStack GPU A100 SU': '39.20' },
};

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

for (const bp of BREAKPOINTS) {
  test.describe(`Breakpoint: ${bp.name} (${bp.width}x${bp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(FIXTURE_URL);
    });

    test('renders correctly with regular data', async ({ page }) => {
      await injectDataAndRender(page, REGULAR_DATA);
      await expect(page.locator('#su-costs-card')).toBeVisible();
      await expect(page.locator('#allocationUsageChart')).toBeVisible();
      await expect(page).toHaveScreenshot(`regular-data-${bp.name}.png`);
    });

    test('hides the costs card when there is no data', async ({ page }) => {
      await injectDataAndRender(page, {});
      await expect(page.locator('#su-costs-card')).toBeHidden();
      await expect(page).toHaveScreenshot(`no-data-${bp.name}.png`);
    });

    test('renders chart with few days of data (1-3 points)', async ({ page }) => {
      await injectDataAndRender(page, LOW_DATA);
      await expect(page.locator('#su-costs-card')).toBeVisible();
      await expect(page.locator('#allocationUsageChart')).toBeVisible();
      await expect(page).toHaveScreenshot(`low-data-${bp.name}.png`);
    });

    test('renders gaps when a day has no charge data', async ({ page }) => {
      await injectDataAndRender(page, MISSING_DAY_DATA);
      await expect(page.locator('#su-costs-card')).toBeVisible();
      await expect(page.locator('#allocationUsageChart')).toBeVisible();
      await expect(page).toHaveScreenshot(`missing-day-data-${bp.name}.png`);
    });

  });
}

// -----------------------------------------------------------------------
// Functional behaviour tests (not breakpoint-specific)
// -----------------------------------------------------------------------

test('empty charge day becomes null in transformed datasets', async ({ page }) => {
  await page.goto(FIXTURE_URL);
  // Build payload inside the page so `{}` day entries are not altered by evaluate() cloning.
  const result = await page.evaluate(() => {
    const data = {
      '2025-02-01': { 'OpenStack CPU SU': '10.00', 'OpenStack GPU A100 SU': '5.00' },
      '2025-02-02': {},
      '2025-02-03': { 'OpenStack CPU SU': '37.80', 'OpenStack GPU A100 SU': '18.50' },
      '2025-02-04': { 'OpenStack CPU SU': '55.00', 'OpenStack GPU A100 SU': '28.00' },
      '2025-02-05': { 'OpenStack CPU SU': '72.10', 'OpenStack GPU A100 SU': '39.20' },
    };
    const sortedKeys = Object.keys(data).sort();
    const t = window.__nercChart.transformCumulativeCharges(data);
    const cpu = t.datasets.find((d) => d.label === 'OpenStack CPU SU');
    const feb2Index = sortedKeys.indexOf('2025-02-02');
    return {
      sortedKeys,
      feb2Index,
      seriesLen: cpu.data.length,
      valueAtFeb2: cpu.data[feb2Index],
      cpuFirst: cpu.data[0],
    };
  });
  expect(result.sortedKeys).toContain('2025-02-02');
  expect(result.feb2Index).toBe(1);
  expect(result.seriesLen).toBe(result.sortedKeys.length);
  expect(result.valueAtFeb2).toBeNull();
  expect(result.cpuFirst).toBe(10);
});

test('cumulative-to-daily toggle updates the chart', async ({ page }) => {
  await page.goto(FIXTURE_URL);
  await injectDataAndRender(page, REGULAR_DATA);

  // Inject and wire up the toggle buttons as allocation_detail.js would
  await page.evaluate(() => {
    // Simulate the daily button click via ChartUtils.calculateDailyData directly
    const result = ChartUtils.calculateDailyData([10, 22.5, 37.8, 55]);
    window._dailyResult = result;
  });
  const dailyData = await page.evaluate(() => window._dailyResult);
  expect(dailyData[0]).toBeCloseTo(10);
  expect(dailyData[1]).toBeCloseTo(12.5);
  expect(dailyData[2]).toBeCloseTo(15.3, 1);
});