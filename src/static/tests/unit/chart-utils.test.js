/**
 * Unit tests for chart_utils.js.
 * We test these because the chart needs to behave correctly when data is sparse
 * or empty. Bugs here cause wrong numbers on screen or broken layouts.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadChartUtils() {
  const dom = new JSDOM('', { runScripts: 'dangerously' });
  const scriptPath = join(__dirname, '../../js/chart_utils.js');
  const script = readFileSync(scriptPath, 'utf8');
  dom.window.eval(script + '\nif (typeof ChartUtils !== "undefined") { window.ChartUtils = ChartUtils; }');
  return dom.window.ChartUtils;
}
const ChartUtils = loadChartUtils();

describe('processDatasetForChart', () => {
  const baseDataset = {
    label: 'OpenStack CPU SU',
    data: [10, 20, 37.8],
    borderColor: 'rgb(0, 192, 232)',
    backgroundColor: 'rgba(0, 192, 232, 0.1)'
  };

  it('sets spanGaps false so Chart.js does not draw across null gaps', () => {
    const out = ChartUtils.processDatasetForChart(baseDataset, 0);
    expect(out.spanGaps).toBe(false);
  });

  it('passes data through unchanged', () => {
    const out = ChartUtils.processDatasetForChart(baseDataset, 0);
    expect(out.data).toEqual([10, 20, 37.8]);
  });

  it('uses the palette backgroundColor for fill instead of a dynamic gradient', () => {
    const out = ChartUtils.processDatasetForChart(baseDataset, 1);
    expect(out.backgroundColor).toBe(baseDataset.backgroundColor);
    expect(typeof out.backgroundColor).toBe('string');
  });

  it('assigns stacking order from palette index', () => {
    expect(ChartUtils.processDatasetForChart(baseDataset, 0).order).toBe(3);
    expect(ChartUtils.processDatasetForChart(baseDataset, 1).order).toBe(2);
  });
});

// Cumulative costs become daily costs by taking the difference between consecutive days.
// This powers the "Daily" view toggle. Wrong maths here shows wrong dollar amounts.
describe('calculateDailyData', () => {
  it('returns the first value as-is (day 1 delta)', () => {
    const result = ChartUtils.calculateDailyData([100, 150, 200]);
    expect(result[0]).toBe(100);
  });

  it('computes differences between consecutive values', () => {
    const result = ChartUtils.calculateDailyData([100, 150, 200]);
    expect(result[1]).toBe(50);
    expect(result[2]).toBe(50);
  });

  it('propagates null when the cumulative series has a null point', () => {
    const result = ChartUtils.calculateDailyData([100, null, 200]);
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull(); // can't diff against a null predecessor
  });

  it('handles a single-point dataset (low data state)', () => {
    const result = ChartUtils.calculateDailyData([42]);
    expect(result).toEqual([42]);
  });

  it('handles empty input (no data state)', () => {
    const result = ChartUtils.calculateDailyData([]);
    expect(result).toEqual([]);
  });
});

// On small screens we show fewer date labels to avoid crowding. This decides how often
// to show a tick. Wrong intervals make the x-axis unreadable on mobile.
describe('getResponsiveTickInterval', () => {
  it('targets 4 ticks on narrow screens (<400px)', () => {
    const interval = ChartUtils.getResponsiveTickInterval(31, 350);
    expect(interval).toBe(Math.max(1, Math.ceil(31 / 4)));
  });

  it('targets 10 ticks on wide screens (>=800px)', () => {
    const interval = ChartUtils.getResponsiveTickInterval(31, 900);
    expect(interval).toBe(Math.max(1, Math.ceil(31 / 10)));
  });
});

// Chart.js autoSkip uses this as a ceiling; breakpoints match getResponsiveTickInterval.
describe('getResponsiveMaxTicksLimit', () => {
  it('returns 4 below 400px width', () => {
    expect(ChartUtils.getResponsiveMaxTicksLimit(350)).toBe(4);
  });
  it('returns 6 below 600px', () => {
    expect(ChartUtils.getResponsiveMaxTicksLimit(500)).toBe(6);
  });
  it('returns 8 below 800px', () => {
    expect(ChartUtils.getResponsiveMaxTicksLimit(700)).toBe(8);
  });
  it('returns 10 at 800px and above', () => {
    expect(ChartUtils.getResponsiveMaxTicksLimit(900)).toBe(10);
  });
});

// Legend and axis text shrink on narrow viewports so they fit. We check the breakpoints
// match the CSS so the chart stays readable on phones and tablets.
describe('getResponsiveFontSizes', () => {
  it('returns smallest sizes below 400px', () => {
    const sizes = ChartUtils.getResponsiveFontSizes(380);
    expect(sizes.legend).toBe(9);
    expect(sizes.axisTicks).toBe(8);
  });

  it('returns largest sizes at 800px and above', () => {
    const sizes = ChartUtils.getResponsiveFontSizes(1200);
    expect(sizes.legend).toBe(12);
    expect(sizes.axisTicks).toBe(11);
  });
});
