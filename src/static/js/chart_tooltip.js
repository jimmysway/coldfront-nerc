/**
 * Chart Tooltip Module
 * 
 * External tooltip handler for Chart.js charts.
 * Requires: chart_utils.js to be loaded first.
 */

const toGrayscale = ChartUtils.toGrayscale;

const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div');

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'chartjs-tooltip';
    
    const table = document.createElement('table');
    
    tooltipEl.appendChild(table);
    chart.canvas.parentNode.appendChild(tooltipEl);
  }

  return tooltipEl;
};

const externalTooltipHandler = (context) => {
  // Tooltip Element
  const {chart, tooltip} = context;
  const tooltipEl = getOrCreateTooltip(chart);

  // Hide if no tooltip
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  // Set Text
  if (tooltip.body) {
    const titleLines = tooltip.title || [];
    const bodyLines = tooltip.body.map(b => b.lines);

    const tableHead = document.createElement('thead');

    titleLines.forEach(title => {
      const tr = document.createElement('tr');
      
      const th = document.createElement('th');
      const text = document.createTextNode(title);

      th.appendChild(text);
      tr.appendChild(th);
      tableHead.appendChild(tr);
    });

    const tableBody = document.createElement('tbody');
    let totalValue = 0;
    let hasMissingData = false;
    
    bodyLines.forEach((body, i) => {
      const dataset = chart.data.datasets[i];
      const dataPoint = tooltip.dataPoints[i]; 
      
      if (!dataPoint) return;
      
      // Check if this data point is missing/interpolated
      const dataIndex = dataPoint.dataIndex;
      const missingIndices = dataset.missingIndices || new Set();
      const isMissing = missingIndices.has(dataIndex);
      
      if (isMissing) {
        hasMissingData = true;
      }
      
      // const colors = tooltip.labelColors[i];
      const value = dataPoint.formattedValue || dataPoint.parsed.y;
      const label = dataPoint.dataset.label;
      
      // Use parsed y value for total calculation (more reliable than parsing formatted string)
      const numericValue = dataPoint.parsed.y;
      if (!isNaN(numericValue) && numericValue !== null && numericValue !== undefined) {
        totalValue += numericValue;
      }

      const tr = document.createElement('tr');
      tr.classList.add('tooltip-row');
      if (isMissing) {
        tr.classList.add('tooltip-error-row');
      }

      const td = document.createElement('td');

      // Left: Box + Label
      const leftSpan = document.createElement('span');
      leftSpan.classList.add('tooltip-left');

      const spanBox = document.createElement('span');
      spanBox.classList.add('tooltip-box');
      // Use grayscale for missing data
      const boxColor = isMissing ? toGrayscale(dataset.borderColor) : dataset.borderColor;
      spanBox.style.background = boxColor;

      const textLabel = document.createElement('span');
      textLabel.classList.add('tooltip-label');
      if (isMissing) {
        textLabel.classList.add('tooltip-error-label');
      }
      textLabel.innerText = label;

      leftSpan.appendChild(spanBox);
      leftSpan.appendChild(textLabel);

      // Right: Value + USD or Error Message
      const rightSpan = document.createElement('span');
      if (isMissing) {
        rightSpan.classList.add('tooltip-error-message');
        rightSpan.innerText = 'Data unavailable';
      } else {
        rightSpan.classList.add('tooltip-value');
        rightSpan.innerText = value + ' USD';
      }

      td.appendChild(leftSpan);
      td.appendChild(rightSpan);
      tr.appendChild(td);
      tableBody.appendChild(tr);
    });
    
    // Add error message row if there's missing data
    if (hasMissingData) {
      const errorTr = document.createElement('tr');
      errorTr.classList.add('tooltip-error-info-row');

      const errorTd = document.createElement('td');
      errorTd.colSpan = 1;
      
      const errorMessage = document.createElement('span');
      errorMessage.classList.add('tooltip-error-info');
      errorMessage.innerHTML = 'Data temporarily unavailable for display';

      errorTd.appendChild(errorMessage);
      errorTr.appendChild(errorTd);
      tableBody.appendChild(errorTr);
    }
    
    // Add total row
    if (totalValue > 0 && !hasMissingData) {
      const totalTr = document.createElement('tr');
      totalTr.classList.add('tooltip-total-row');

      const totalTd = document.createElement('td');

      const totalLeftSpan = document.createElement('span');
      totalLeftSpan.classList.add('tooltip-total-label');
      totalLeftSpan.innerText = 'Total';

      const totalRightSpan = document.createElement('span');
      totalRightSpan.classList.add('tooltip-total-value');
      if (hasMissingData) {
        totalRightSpan.classList.add('tooltip-total-value-interpolated');
      }
      totalRightSpan.innerText = totalValue.toFixed(2) + ' USD';

      totalTd.appendChild(totalLeftSpan);
      totalTd.appendChild(totalRightSpan);
      totalTr.appendChild(totalTd);
      tableBody.appendChild(totalTr);
    }

    const tableRoot = tooltipEl.querySelector('table');

    // Remove old children
    while (tableRoot.firstChild) {
      tableRoot.firstChild.remove();
    }

    // Add new children
    tableRoot.appendChild(tableHead);
    tableRoot.appendChild(tableBody);
  }

  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;

  // Display, position, and set styles for font
  tooltipEl.style.opacity = 1;
  
  // Position to the right of the cursor
  const left = positionX + tooltip.caretX + 30; // 15px offset
  const top = positionY + tooltip.caretY;
  
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = top + 'px';
  tooltipEl.style.transform = 'translate(0, -50%)'; // Vertically center, horizontally align left edge
};

