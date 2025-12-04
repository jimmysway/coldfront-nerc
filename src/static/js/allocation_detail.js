/* ========================================
   UTILITY REFERENCES
   ======================================== */

const generateUsageLabels = ChartUtils.generateUsageLabels;
const getResponsiveTickInterval = ChartUtils.getResponsiveTickInterval;
const getResponsiveFontSizes = ChartUtils.getResponsiveFontSizes;
const getCenteredLabels = ChartUtils.getCenteredLabels;
const getCenteredData = ChartUtils.getCenteredData;
const processDatasetForChart = ChartUtils.processDatasetForChart;
const calculateDailyData = ChartUtils.calculateDailyData;
const missingDataGrayscalePlugin = ChartUtils.missingDataGrayscalePlugin;
const getHoverColor = ChartUtils.getHoverColor;

/* ========================================
   DATA INITIALIZATION
   
   Data sources (in priority order):
   1. window.usageData - Pre-populated from Django template (production)
   2. ChartConfig mock data - For development when useMockData=true
   
   Django template should set:
   - window.usageYear (number)
   - window.usageMonth (number, 0-indexed)
   - window.usageData = { datasets: [...] }
   ======================================== */

const usageYear = window.usageYear || new Date().getFullYear();
const usageMonth = window.usageMonth !== undefined ? window.usageMonth : new Date().getMonth();
const usageLabels = generateUsageLabels(usageYear, usageMonth);

let usageDatasets;
if (window.usageData && Array.isArray(window.usageData.datasets)) {
  usageDatasets = window.usageData.datasets;
} else {
  usageDatasets = ChartConfig.generateMockData(usageYear, usageMonth);
}

let currentDataMode = 'cumulative';

function getDataForMode(mode) {
  if (mode === 'daily') {
    return usageDatasets.map(ds => ({ ...ds, data: calculateDailyData(ds.data) }));
  }
  return usageDatasets;
}

function exportUsageToCSV() {
  const datasets = getDataForMode(currentDataMode);
  
  // Build CSV header
  let csvContent = 'Date';
  datasets.forEach(ds => {
    csvContent += ',' + ds.label + ' (USD)';
  });
  csvContent += ',Total (USD)\n';

  // Build CSV rows
  usageLabels.forEach((label, i) => {
    csvContent += label;
    
    let rowTotal = 0;
    let hasMissing = false;
    
    datasets.forEach(ds => {
      let val = ds.data[i];
      if (val !== null && val !== undefined) {
        rowTotal += val;
        csvContent += ',' + val.toFixed(2);
      } else {
        hasMissing = true;
        csvContent += ',';
      }
    });
    
    if (hasMissing) {
      csvContent += ',';
    } else {
      csvContent += ',' + rowTotal.toFixed(2);
    }
    
    csvContent += '\n';
  });

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `su_usage_${currentDataMode}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Attach export button handler
var exportBtn = document.getElementById('export-csv-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', exportUsageToCSV);
}

// Populate Table with usage data
var dataTableInstance = null;

function populateUsageTable(datasets) {
  const table = document.getElementById('allocationUsageTable');
  if (!table) return;
  
  // Destroy existing DataTable if it exists
  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }
  
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  // Header row
  let headerRow = '<tr>';
  headerRow += '<th scope="col">Date</th>';
  datasets.forEach(ds => {
    headerRow += `<th scope="col">${ds.label} (USD)</th>`;
  });
  headerRow += '<th scope="col">Total (USD)</th>';
  headerRow += '</tr>';
  thead.innerHTML = headerRow;

  // Body: one row per day
  let bodyRows = '';
  usageLabels.forEach((label, i) => {
    bodyRows += '<tr>';
    bodyRows += `<th scope="row" class="text-nowrap">${label}</th>`;
    
    let rowTotal = 0;
    let hasMissing = false;
    
    datasets.forEach(ds => {
      let val = ds.data[i];
      if (val !== null && val !== undefined) {
        rowTotal += val;
        bodyRows += `<td>${val.toFixed(2)}</td>`;
      } else {
        hasMissing = true;
        bodyRows += `<td class="text-muted">-</td>`;
      }
    });
    
    if (hasMissing) {
      bodyRows += `<td class="text-muted">-</td>`;
    } else {
      bodyRows += `<td><strong>${rowTotal.toFixed(2)}</strong></td>`;
    }
    
    bodyRows += '</tr>';
  });
  tbody.innerHTML = bodyRows;

  // Initialize DataTable for pagination
  if (typeof $ !== 'undefined' && $.fn.DataTable) {
    dataTableInstance = $('#allocationUsageTable').DataTable({
      "pageLength": 10,
      "ordering": true,
      "searching": false,
      "lengthChange": false,
      "order": [],
      "language": {
        "paginate": {
          "previous": '<',
          "next": '>'
        }
      },
      "drawCallback": function() {
        var paginate = $(this).closest('.dataTables_wrapper').find('.dataTables_paginate');
        var pagination = paginate.find('.pagination');
        
        // Skip if already restructured
        if (paginate.find('.pagination-container').length) {
          // Just update arrow text in case it was reset
          var prevLink = paginate.find('.pagination-prev .page-link');
          var nextLink = paginate.find('.pagination-next .page-link');
          if (prevLink.length && prevLink.text().trim() !== '<') prevLink.text('<');
          if (nextLink.length && nextLink.text().trim() !== '>') nextLink.text('>');
          return;
        }
        
        // Get elements
        var prevItem = pagination.find('.page-item:first-child').addClass('pagination-prev');
        var nextItem = pagination.find('.page-item:last-child').addClass('pagination-next');
        var pageItems = pagination.find('.page-item:not(:first-child):not(:last-child)');
        
        // Create new structure
        var container = $('<div class="pagination-container"></div>');
        var prevWrapper = $('<div class="pagination-arrow-wrapper"></div>');
        var numbersGroup = $('<div class="page-numbers-group"></div>');
        var nextWrapper = $('<div class="pagination-arrow-wrapper"></div>');
        
        // Move elements into new structure
        prevItem.appendTo(prevWrapper);
        pageItems.appendTo(numbersGroup);
        nextItem.appendTo(nextWrapper);
        
        // Assemble container
        container.append(prevWrapper);
        container.append(numbersGroup);
        container.append(nextWrapper);
        
        // Replace pagination with new container
        pagination.replaceWith(container);
        
        // Set arrow text
        var prevLink = prevWrapper.find('.page-link');
        var nextLink = nextWrapper.find('.page-link');
        prevLink.text('<');
        nextLink.text('>');
      }
    });
  }
}

// Initial table population
populateUsageTable(usageDatasets);

// View toggle handlers (graph/table)
var graphBtn = document.getElementById('show-graph-btn');
var tableBtn = document.getElementById('show-table-btn');
var chartView = document.getElementById('chart-view');
var tableView = document.getElementById('table-view');

if (graphBtn && tableBtn && chartView && tableView) {
  graphBtn.addEventListener('click', function() {
    chartView.style.display = 'block';
    tableView.style.display = 'none';
    graphBtn.classList.add('active');
    tableBtn.classList.remove('active');
  });

  tableBtn.addEventListener('click', function() {
    chartView.style.display = 'none';
    tableView.style.display = 'block';
    graphBtn.classList.remove('active');
    tableBtn.classList.add('active');
  });
}

// Data mode toggle handlers
var cumulativeBtn = document.getElementById('show-cumulative-btn');
var dailyBtn = document.getElementById('show-daily-btn');
var usageChart = null;

// NERC Usage Chart
const ctx = document.getElementById('allocationUsageChart');

if (ctx) {
  const processedDatasets = usageDatasets.map((ds, idx) => processDatasetForChart(ds, idx));
  const dataLength = processedDatasets.reduce((max, ds) => Math.max(max, ds.data?.length || 0), 0);
  const isLowDataState = dataLength < 4;
  
  // Get centered labels and update datasets if in low data state
  const chartLabels = isLowDataState ? getCenteredLabels(usageLabels, dataLength) : usageLabels.slice(0, dataLength);
  
  if (isLowDataState) {
    processedDatasets.forEach(ds => {
      if (ds.data) {
        ds.data = getCenteredData(ds.data);
      }
    });
  }

  usageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: processedDatasets
    },
    plugins: [missingDataGrayscalePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onResize: function(chart, size) {
        // Force tick recalculation on resize by updating the chart
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
          hoverBorderWidth: 0
        },
        line: {}
      },
      plugins: {
        legend: {
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 20,
            font: function(context) {
              const chartWidth = context.chart.width || 800;
              const sizes = getResponsiveFontSizes(chartWidth);
              return { size: sizes.legend };
            },
            useBorderRadius: false,
            generateLabels: function (chart) {
              return chart.data.datasets.map(function (dataset, i) {
                return {
                  text: dataset.label,
                  fillStyle: dataset.borderColor,
                  strokeStyle: dataset.borderColor,
                  lineWidth: 0,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i
                };
              });
            }
          },
          display: true,
          position: 'bottom',
        },
        tooltip: {
          enabled: false,
          position: 'nearest',
          external: externalTooltipHandler
        }
      },
      scales: {
        x: {
          offset: true,
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
            autoSkip: false,
            font: function(context) {
              const chartWidth = context.chart.width || 800;
              const sizes = getResponsiveFontSizes(chartWidth);
              return { size: sizes.axisTicks };
            },
            callback: function (value, index) {
              const label = this.getLabelForValue(value);
              const totalLabels = this.chart.data.labels.length;
              
              // Get current chart width for responsive tick calculation
              const chartWidth = this.chart.width || 800;
              const tickInterval = getResponsiveTickInterval(totalLabels, chartWidth);
              const lastIndex = totalLabels - 1;
              
              // Show label if it aligns with the interval counting backwards from the end
              if ((lastIndex - index) % tickInterval === 0) {
                return label;
              }
              return '';
            }
          }
        },
        y: {
          stacked: true,
          border: {
            display: false,
          },
          ticks: {
            count: 5,
            font: function(context) {
              const chartWidth = context.chart.width || 800;
              const sizes = getResponsiveFontSizes(chartWidth);
              return { size: sizes.axisTicks };
            }
          },
          beginAtZero: true,
          grace: '30%',
        }
      }
    }
  });

  // Function to update chart with new data
  function updateChartData(mode) {
    const datasets = getDataForMode(mode);
    const newProcessedDatasets = datasets.map((ds, idx) => processDatasetForChart(ds, idx));
    usageChart.data.datasets = newProcessedDatasets;
    usageChart.update();
  }

  // Toggle button handlers
  const chartTitle = document.getElementById('chart-title');
  const chartSubtitle = document.getElementById('chart-subtitle');
  
  const modeConfig = {
    cumulative: { title: 'SU Cost - Cumulative', subtitle: 'Showing the cumulative cost for the last month' },
    daily: { title: 'SU Cost - Daily', subtitle: 'Showing the daily cost for the last month' }
  };

  function switchMode(mode) {
    if (currentDataMode === mode) return;
    currentDataMode = mode;
    cumulativeBtn?.classList.toggle('active', mode === 'cumulative');
    dailyBtn?.classList.toggle('active', mode === 'daily');
    updateChartData(mode);
    populateUsageTable(getDataForMode(mode));
    if (chartTitle) chartTitle.textContent = modeConfig[mode].title;
    if (chartSubtitle) chartSubtitle.textContent = modeConfig[mode].subtitle;
  }

  cumulativeBtn?.addEventListener('click', () => switchMode('cumulative'));
  dailyBtn?.addEventListener('click', () => switchMode('daily'));
}

