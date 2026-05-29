/**
 * Chart.js options for the allocation usage line chart.
 * Load after chart_utils.js and chart_tooltip.js (externalTooltipHandler).
 *
 * @param {object} deps
 * @param {typeof ChartUtils.getResponsiveFontSizes} deps.getResponsiveFontSizes
 * @param {typeof ChartUtils.getResponsiveMaxTicksLimit} deps.getResponsiveMaxTicksLimit
 * @param {typeof ChartUtils.getHoverColor} deps.getHoverColor
 * @param {(context: object) => void} deps.externalTooltipHandler
 * @returns {object} Chart.js line chart options
 */
function buildUsageChartOptions(deps) {
  'use strict';

  const getResponsiveFontSizes = deps.getResponsiveFontSizes;
  const getResponsiveMaxTicksLimit = deps.getResponsiveMaxTicksLimit;
  const getHoverColor = deps.getHoverColor;
  const externalTooltipHandler = deps.externalTooltipHandler;

  return {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio || 1,
    onResize(chart) {
      chart.update('none');
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 4,
        hoverBackgroundColor: getHoverColor,
        hoverBorderColor: getHoverColor,
        hoverBorderWidth: 0,
      },
      line: {},
    },
    plugins: {
      legend: {
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 20,
          font(context) {
            const chartWidth = context.chart.width || 800;
            const sizes = getResponsiveFontSizes(chartWidth);
            return { size: sizes.legend };
          },
          useBorderRadius: false,
          generateLabels(chart) {
            return chart.data.datasets.map(function (dataset, i) {
              return {
                text: dataset.label,
                fillStyle: dataset.borderColor,
                strokeStyle: dataset.borderColor,
                lineWidth: 0,
                hidden: !chart.isDatasetVisible(i),
                datasetIndex: i,
              };
            });
          },
        },
        display: true,
        position: 'bottom',
      },
      tooltip: {
        enabled: false,
        position: 'nearest',
        external: externalTooltipHandler,
      },
    },
    scales: {
      x: {
        offset: false,
        border: {
          display: true,
        },
        grid: {
          display: false,
          drawOnChartArea: true,
          drawTicks: false,
        },
        ticks: {
          align: 'center',
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 4,
          maxTicksLimit(context) {
            const chartWidth = context.chart.width || 800;
            return getResponsiveMaxTicksLimit(chartWidth);
          },
          font(context) {
            const chartWidth = context.chart.width || 800;
            const sizes = getResponsiveFontSizes(chartWidth);
            return { size: sizes.axisTicks };
          },
        },
      },
      y: {
        stacked: true,
        border: {
          display: false,
        },
        ticks: {
          count: 5,
          font(context) {
            const chartWidth = context.chart.width || 800;
            const sizes = getResponsiveFontSizes(chartWidth);
            return { size: sizes.axisTicks };
          },
        },
        beginAtZero: true,
        grace: '30%',
      },
    },
  };
}
