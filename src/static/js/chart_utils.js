/**
 * Chart Utilities Module
 * Shared utility functions for chart data processing, color manipulation,
 * and responsive calculations.
 * 
 * This module should be loaded before allocation_detail.js and chart_tooltip.js
 */

const ChartUtils = (function() {
  'use strict';

  /* ========================================
     COLOR UTILITIES
     ======================================== */

  /**
   * Converts an RGB/RGBA color to grayscale using luminance formula.
   * @param {string} color - RGB/RGBA color string (e.g., 'rgb(75, 192, 192)')
   * @returns {string} - Grayscale RGB color string
   */
  function toGrayscale(color) {
    const match = color.match(/\d+/g);
    if (!match || match.length < 3) return color;

    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    return `rgb(${gray}, ${gray}, ${gray})`;
  }

  /**
   * Sets or modifies the opacity of an RGB/RGBA color.
   * @param {string} color - RGB or RGBA color string
   * @param {number} opacity - Opacity value between 0 and 1
   * @returns {string} - RGBA color string with specified opacity
   */
  function setOpacity(color, opacity) {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, opacity + ')');
    } else if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
    return color;
  }

  /* ========================================
     DATA PROCESSING UTILITIES
     ======================================== */

  /**
   * Interpolates missing data points by calculating the midpoint between
   * the previous and next valid data points.
   * @param {Array} data - Array of data values (may contain null/undefined)
   * @returns {Object} - Object with interpolated data and missing indices set
   */
  function interpolateMissingData(data) {
    const interpolated = [...data];
    const missingIndices = new Set();

    for (let i = 0; i < data.length; i++) {
      if (data[i] === null || data[i] === undefined || isNaN(data[i])) {
        missingIndices.add(i);

        // Find previous valid value
        let prevValue = null;
        let prevIndex = i - 1;
        while (prevIndex >= 0 && (data[prevIndex] === null || data[prevIndex] === undefined || isNaN(data[prevIndex]))) {
          prevIndex--;
        }
        if (prevIndex >= 0) {
          prevValue = data[prevIndex];
        }

        // Find next valid value
        let nextValue = null;
        let nextIndex = i + 1;
        while (nextIndex < data.length && (data[nextIndex] === null || data[nextIndex] === undefined || isNaN(data[nextIndex]))) {
          nextIndex++;
        }
        if (nextIndex < data.length) {
          nextValue = data[nextIndex];
        }

        // Interpolate midpoint
        if (prevValue !== null && nextValue !== null) {
          interpolated[i] = (prevValue + nextValue) / 2;
        } else if (prevValue !== null) {
          interpolated[i] = prevValue;
        } else if (nextValue !== null) {
          interpolated[i] = nextValue;
        } else {
          interpolated[i] = 0;
        }
      }
    }

    return { data: interpolated, missingIndices };
  }

  /**
   * Calculates daily data from cumulative data.
   * @param {Array} cumulativeData - Array of cumulative values
   * @returns {Array} - Array of daily differences
   */
  function calculateDailyData(cumulativeData) {
    const dailyData = [];
    for (let i = 0; i < cumulativeData.length; i++) {
      if (cumulativeData[i] === null || cumulativeData[i] === undefined) {
        dailyData.push(null);
      } else if (i === 0) {
        dailyData.push(cumulativeData[i]);
      } else if (cumulativeData[i - 1] === null || cumulativeData[i - 1] === undefined) {
        dailyData.push(null);
      } else {
        dailyData.push(cumulativeData[i] - cumulativeData[i - 1]);
      }
    }
    return dailyData;
  }

  /* ========================================
     DATE/LABEL UTILITIES
     ======================================== */

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /**
   * Checks if a year is a leap year.
   * @param {number} year - The year to check
   * @returns {boolean} - True if leap year
   */
  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Gets the number of days in a given month.
   * @param {number} year - The year
   * @param {number} month - The month (0-indexed, 0 = January)
   * @returns {number} - Number of days in the month
   */
  function getDaysInMonth(year, month) {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 1 && isLeapYear(year)) {
      return 29;
    }
    return daysInMonth[month];
  }

  /**
   * Generates date labels for a given month.
   * @param {number} year - The year
   * @param {number} month - The month (0-indexed)
   * @returns {Array} - Array of date label strings (e.g., ['Jan 1', 'Jan 2', ...])
   */
  function generateMonthLabels(year, month) {
    const monthName = MONTH_NAMES[month];
    const daysCount = getDaysInMonth(year, month);
    const labels = [];

    for (let day = 1; day <= daysCount; day++) {
      labels.push(`${monthName} ${day}`);
    }

    return labels;
  }

  /**
   * Generates usage labels for a given year/month or defaults to current.
   * @param {number|null} year - The year (defaults to current)
   * @param {number|null} month - The month (defaults to current)
   * @returns {Array} - Array of date label strings
   */
  function generateUsageLabels(year = null, month = null) {
    if (year === null || month === null) {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }
    return generateMonthLabels(year, month);
  }

  /* ========================================
     RESPONSIVE UTILITIES
     ======================================== */

  /**
   * Calculates optimal tick interval based on chart width and data count.
   * Adapts to viewport size to prevent label crowding on smaller screens.
   * @param {number} totalDays - Total number of data points
   * @param {number} chartWidth - Current chart width in pixels
   * @returns {number} - Optimal tick interval
   */
  function getResponsiveTickInterval(totalDays, chartWidth) {
    let targetTicks;

    if (chartWidth < 400) {
      targetTicks = 4;
    } else if (chartWidth < 600) {
      targetTicks = 6;
    } else if (chartWidth < 800) {
      targetTicks = 8;
    } else {
      targetTicks = 10;
    }

    const interval = Math.ceil(totalDays / targetTicks);
    return Math.max(1, Math.min(interval, Math.ceil(totalDays / 3)));
  }

  /**
   * Returns responsive font sizes for chart elements based on chart width.
   * @param {number} chartWidth - Current chart width in pixels
   * @returns {Object} - Object with legend, axisTicks, and axisTitle font sizes
   */
  function getResponsiveFontSizes(chartWidth) {
    if (chartWidth < 400) {
      return { legend: 9, axisTicks: 8, axisTitle: 9 };
    } else if (chartWidth < 576) {
      return { legend: 10, axisTicks: 9, axisTitle: 10 };
    } else if (chartWidth < 768) {
      return { legend: 11, axisTicks: 10, axisTitle: 11 };
    } else {
      return { legend: 12, axisTicks: 11, axisTitle: 12 };
    }
  }

  /* ========================================
     DATA CENTERING (Low data state handling)
     ======================================== */

  /**
   * Gets labels for low data states, centering data horizontally on the chart.
   * @param {Array} usageLabels - Full array of usage labels
   * @param {number} dataLength - Actual data length
   * @returns {Array} - Padded labels array for centered display
   */
  function getCenteredLabels(usageLabels, dataLength) {
    if (dataLength >= 4) {
      return usageLabels.slice(0, dataLength);
    }

    if (dataLength === 1) {
      return ['', usageLabels[0], ''];
    } else if (dataLength === 2) {
      return ['', usageLabels[0], usageLabels[1], ''];
    } else if (dataLength === 3) {
      return ['', usageLabels[0], usageLabels[1], usageLabels[2], ''];
    }

    return usageLabels.slice(0, dataLength);
  }

  /**
   * Pads data arrays to match centered label structure.
   * @param {Array} data - Original data array
   * @returns {Array} - Padded data array
   */
  function getCenteredData(data) {
    if (data.length >= 4) {
      return data;
    }

    if (data.length === 1) {
      return [null, data[0], null];
    } else if (data.length === 2) {
      return [null, data[0], data[1], null];
    } else if (data.length === 3) {
      return [null, data[0], data[1], data[2], null];
    }

    return data;
  }

  /* ========================================
     CHART DATASET PROCESSING
     ======================================== */

  /**
   * Creates a trend-following gradient for chart fill.
   * @param {Object} context - Chart.js context
   * @param {string} color - Border color for the dataset
   * @param {Object} config - Optional configuration { startOpacity, fadeHeight, padding }
   * @returns {CanvasGradient|string} - Gradient or fallback color
   */
  function createTrendGradient(context, color, config = {}) {
    const { startOpacity = 0.13, fadeHeight = 150, padding = 20 } = config;
    const chart = context.chart;
    const { ctx, chartArea, scales } = chart;
    
    if (!chartArea || !scales || !scales.x || !scales.y) {
      return color;
    }

    const datasets = chart.data.datasets;
    const currentDatasetIndex = context.datasetIndex;
    const data = context.dataset.data;
    const currentOrder = datasets[currentDatasetIndex].order;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, n = 0;
    const points = [];

    for (let i = 0; i < data.length; i++) {
      if (data[i] === null || data[i] === undefined) continue;

      let stackedValue = 0;
      for (let d = 0; d < datasets.length; d++) {
        if (chart.isDatasetVisible(d)) {
          const otherOrder = datasets[d].order;
          const shouldStack = (otherOrder !== undefined && currentOrder !== undefined) 
            ? otherOrder <= currentOrder 
            : d <= currentDatasetIndex;
          
          if (shouldStack) {
            const dVal = datasets[d].data[i];
            if (typeof dVal === 'number') stackedValue += dVal;
          }
        }
      }

      const x = scales.x.getPixelForValue(i);
      const y = scales.y.getPixelForValue(stackedValue);
      points.push({ x, y });

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      n++;
    }

    if (n < 2) return color;

    const denom = n * sumXX - sumX * sumX;
    let nx = 0, ny = 1, cx = sumX / n, cy = sumY / n;

    if (Math.abs(denom) > 1e-10) {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const len = Math.sqrt(slope * slope + 1);
      nx = -slope / len;
      ny = 1 / len;
    }

    let minProj = Infinity, maxDataProj = -Infinity;
    points.forEach(p => {
      const proj = (p.x - cx) * nx + (p.y - cy) * ny;
      if (proj < minProj) minProj = proj;
      if (proj > maxDataProj) maxDataProj = proj;
    });

    minProj -= padding;
    const dataSpread = maxDataProj - minProj - padding;
    const actualFadeHeight = Math.max(fadeHeight, dataSpread + 50);
    const totalDistance = Math.max(chartArea.height, actualFadeHeight + padding);

    const p1x = cx + nx * minProj;
    const p1y = cy + ny * minProj;
    const p2x = cx + nx * (minProj + totalDistance);
    const p2y = cy + ny * (minProj + totalDistance);

    if (!isFinite(p1x) || !isFinite(p1y) || !isFinite(p2x) || !isFinite(p2y)) {
      return setOpacity(color, 0.2);
    }

    const gradient = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
    const fadeStop = Math.min(1, (padding + actualFadeHeight) / totalDistance);

    gradient.addColorStop(0, setOpacity(color, startOpacity));
    gradient.addColorStop(fadeStop, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    return gradient;
  }

  /**
   * Creates segment styling for missing data visualization.
   * @param {Set} missingIndices - Set of indices with missing data
   * @returns {Object} - Segment style object for Chart.js
   */
  function createMissingDataSegmentStyle(missingIndices) {
    return {
      borderColor: function(ctx) {
        const p0 = ctx.p0;
        const p1 = ctx.p1;
        if (!p0 || !p1 || !p0.parsed || !p1.parsed) return undefined;
        
        const index0 = p0.parsed.x;
        const index1 = p1.parsed.x;
        
        if (missingIndices.has(index0) || missingIndices.has(index1)) {
          return 'rgba(70, 70, 70, 0.7)';
        }
        return undefined;
      }
    };
  }

  /**
   * Processes a raw dataset for chart rendering with interpolation and styling.
   * @param {Object} dataset - Raw dataset with label, data, borderColor, backgroundColor
   * @param {number} idx - Dataset index for stacking order
   * @returns {Object} - Processed dataset ready for Chart.js
   */
  function processDatasetForChart(dataset, idx) {
    const { data: interpolatedData, missingIndices } = interpolateMissingData(dataset.data);
    const borderColor = dataset.borderColor;

    return {
      ...dataset,
      fill: true,
      borderWidth: 2,
      tension: 0.25,
      order: 3 - idx,
      data: interpolatedData,
      missingIndices,
      originalBorderColor: borderColor,
      originalBackgroundColor: dataset.backgroundColor,
      backgroundColor: (context) => createTrendGradient(context, borderColor),
      segment: createMissingDataSegmentStyle(missingIndices)
    };
  }

  /**
   * Chart.js plugin to apply grayscale filter over missing data regions.
   */
  const missingDataGrayscalePlugin = {
    id: 'missingDataGrayscale',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales?.x || !scales?.y) return;
      
      const missingRegions = [];
      
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        if (!chart.isDatasetVisible(datasetIndex)) return;
        const { missingIndices, data } = dataset;
        if (!missingIndices?.size) return;
        
        let currentRegion = null;
        for (let i = 0; i < data.length; i++) {
          if (missingIndices.has(i)) {
            currentRegion = currentRegion 
              ? { ...currentRegion, end: i }
              : { start: Math.max(0, i - 1), end: i };
          } else if (currentRegion) {
            missingRegions.push({ ...currentRegion, end: Math.min(data.length - 1, currentRegion.end + 1) });
            currentRegion = null;
          }
        }
        if (currentRegion) {
          missingRegions.push({ ...currentRegion, end: Math.min(data.length - 1, currentRegion.end + 1) });
        }
      });
      
      missingRegions.forEach(({ start, end }) => {
        const startX = scales.x.getPixelForValue(start);
        const width = scales.x.getPixelForValue(end) - startX;
        const height = chartArea.bottom - chartArea.top;
        if (width <= 0) return;
        
        const imageData = ctx.getImageData(startX, chartArea.top, width, height);
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 0) {
            const gray = (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) * 0.85;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
          }
        }
        ctx.putImageData(imageData, startX, chartArea.top);
      });
    }
  };

  /**
   * Returns color for hover states, applying grayscale for missing data points.
   * @param {Object} context - Chart.js context
   * @returns {string} - Color string
   */
  function getHoverColor(context) {
    const { dataset, dataIndex } = context;
    const missingIndices = dataset.missingIndices || new Set();
    const color = dataset.originalBorderColor || dataset.borderColor;
    return missingIndices.has(dataIndex) ? toGrayscale(color) : dataset.borderColor;
  }

  /* ========================================
     PUBLIC API
     ======================================== */

  return {
    // Color utilities
    toGrayscale,
    setOpacity,

    // Data processing
    interpolateMissingData,
    calculateDailyData,
    processDatasetForChart,
    createTrendGradient,
    createMissingDataSegmentStyle,

    // Chart plugins and helpers
    missingDataGrayscalePlugin,
    getHoverColor,

    // Date/label utilities
    MONTH_NAMES,
    isLeapYear,
    getDaysInMonth,
    generateMonthLabels,
    generateUsageLabels,

    // Responsive utilities
    getResponsiveTickInterval,
    getResponsiveFontSizes,

    // Data centering
    getCenteredLabels,
    getCenteredData
  };

})();

