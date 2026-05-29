/**
 * Chart Utilities — data shaping, labels, and responsive chart sizing.
 * Load before chart_tooltip.js, usage_chart_options.js, and allocation_detail.js.
 */

const ChartUtils = (function() {
  'use strict';

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** Cumulative series → per-day deltas; nulls propagate when the series is broken. */
  function calculateDailyData(cumulativeData) {
    return cumulativeData.map((cur, i) => {
      if (cur === null || cur === undefined) return null;
      if (i === 0) return cur;
      const prev = cumulativeData[i - 1];
      if (prev === null || prev === undefined) return null;
      return cur - prev;
    });
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function getDaysInMonth(year, month) {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month === 1 && isLeapYear(year) ? 29 : daysInMonth[month];
  }

  function generateMonthLabels(year, month) {
    const monthName = MONTH_NAMES[month];
    const daysCount = getDaysInMonth(year, month);
    const labels = [];
    for (let day = 1; day <= daysCount; day++) {
      labels.push(`${monthName} ${day}`);
    }
    return labels;
  }

  function generateUsageLabels(year = null, month = null) {
    if (year === null || month === null) {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }
    return generateMonthLabels(year, month);
  }

  const TICK_TARGETS = [[400, 4], [600, 6], [800, 8], [Infinity, 10]];

  function getResponsiveTickInterval(totalDays, chartWidth) {
    const targetTicks = TICK_TARGETS.find(([w]) => chartWidth < w)[1];
    const interval = Math.ceil(totalDays / targetTicks);
    return Math.max(1, Math.min(interval, Math.ceil(totalDays / 3)));
  }

  /** Caps visible x-axis category ticks (same width breakpoints as getResponsiveTickInterval). */
  function getResponsiveMaxTicksLimit(chartWidth) {
    return TICK_TARGETS.find(([w]) => chartWidth < w)[1];
  }

  const FONT_BY_MAX_WIDTH = [
    [400, { legend: 9, axisTicks: 8, axisTitle: 9 }],
    [576, { legend: 10, axisTicks: 9, axisTitle: 10 }],
    [768, { legend: 11, axisTicks: 10, axisTitle: 11 }],
    [Infinity, { legend: 12, axisTicks: 11, axisTitle: 12 }]
  ];

  function getResponsiveFontSizes(chartWidth) {
    return FONT_BY_MAX_WIDTH.find(([w]) => chartWidth < w)[1];
  }

  function processDatasetForChart(dataset, idx) {
    return {
      ...dataset,
      fill: 'stack',
      borderWidth: 2,
      tension: 0.25,
      spanGaps: false,
      order: 3 - idx
    };
  }

  function getHoverColor(context) {
    return context.dataset.borderColor;
  }

  return {
    calculateDailyData,
    processDatasetForChart,
    getHoverColor,
    MONTH_NAMES,
    isLeapYear,
    getDaysInMonth,
    generateMonthLabels,
    generateUsageLabels,
    getResponsiveTickInterval,
    getResponsiveMaxTicksLimit,
    getResponsiveFontSizes
  };
})();
