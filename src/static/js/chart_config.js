/**
 * Chart Configuration Module
 * 
 * Centralizes chart configuration including:
 * - Dataset color definitions
 * - Chart styling options
 * - Mock data for development
 */

const ChartConfig = (function() {
  'use strict';

  /* ========================================
     DATASET COLOR PALETTE
     ======================================== */
  
  const DATASET_COLORS = {
    cpu: {
      border: 'rgb(0, 192, 232)',
      background: 'rgba(0, 192, 232, 0.1)'
    },
    gpuH100: {
      border: 'rgb(117, 213, 92)',
      background: 'rgba(117, 213, 92, 0.1)'
    },
    gpuV100: {
      border: 'rgb(255, 146, 138)',
      background: 'rgba(255, 146, 138, 0.1)'
    },
    gpuA100: {
      border: 'rgb(255, 206, 86)',
      background: 'rgba(255, 206, 86, 0.1)'
    },
    storage: {
      border: 'rgb(153, 102, 255)',
      background: 'rgba(153, 102, 255, 0.1)'
    },
    network: {
      border: 'rgb(255, 159, 64)',
      background: 'rgba(255, 159, 64, 0.1)'
    }
  };

  const COLOR_PALETTE = [
    DATASET_COLORS.cpu,
    DATASET_COLORS.gpuH100,
    DATASET_COLORS.gpuV100,
    DATASET_COLORS.gpuA100,
    DATASET_COLORS.storage,
    DATASET_COLORS.network
  ];

  /* ========================================
     CHART STYLING
     ======================================== */

  const LINE_STYLE = {
    fill: true,
    borderWidth: 2,
    tension: 0.25,
    pointRadius: 0,
    hoverRadius: 4
  };

  const MISSING_DATA_STYLE = {
    segmentColor: 'rgba(70, 70, 70, 0.7)',
    gradientColor: 'rgb(160, 160, 160)',
    fillOpacity: 0.08
  };

  const GRADIENT_CONFIG = {
    startOpacity: 0.13,
    fadeHeight: 150,
    padding: 20
  };

  /* ========================================
     MOCK DATA
     ======================================== */

  // Set to false when using real backend data
  const USE_MOCK_DATA = true;

  // Hardcoded mock data for development
  const MOCK_DATA = [
    {
      label: 'CPU',
      resourceType: 'cpu',
      data: [2, 2.3, 2.5, 2.9, 3.2, 3.6, 4.1, 4.5, 4.8, 5.2, 5.7, 6.1, 6.5, 7.0, 7.4, 7.9, 8.3, 8.8, 9.2, 9.7, 10.1, 10.6, 11.0, 11.5, 12.0, 12.4, 12.9, 13.3, 13.8, 14.2],
      borderColor: DATASET_COLORS.cpu.border,
      backgroundColor: DATASET_COLORS.cpu.background
    },
    {
      label: 'GPU H100',
      resourceType: 'gpuH100',
      data: [1, 1.8, 2.5, 3.4, 4.2, 5.0, 5.9, 6.7, 7.5, 8.4, 9.2, 10.0, 10.9, 11.7, 12.5, 13.4, 14.2, 15.0, 15.9, 16.7, 17.5, 18.4, 19.2, 20.0, 20.9, 21.7, 22.5, 23.4, 24.2, 25.0],
      borderColor: DATASET_COLORS.gpuH100.border,
      backgroundColor: DATASET_COLORS.gpuH100.background
    },
    {
      label: 'GPU V100',
      resourceType: 'gpuV100',
      data: [5, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5],
      borderColor: DATASET_COLORS.gpuV100.border,
      backgroundColor: DATASET_COLORS.gpuV100.background
    }
  ];

  function generateMockData(year, month) {
    if (!USE_MOCK_DATA) {
      return [];
    }
    
    const daysInMonth = ChartUtils.getDaysInMonth(year, month);

    return MOCK_DATA.map(dataset => ({
      ...dataset,
      data: dataset.data.slice(0, daysInMonth)
    }));
  }

  /* ========================================
     PUBLIC API
     ======================================== */

  return {
    DATASET_COLORS: DATASET_COLORS,
    COLOR_PALETTE: COLOR_PALETTE,
    LINE_STYLE: LINE_STYLE,
    MISSING_DATA_STYLE: MISSING_DATA_STYLE,
    GRADIENT_CONFIG: GRADIENT_CONFIG,
    USE_MOCK_DATA: USE_MOCK_DATA,
    generateMockData: generateMockData
  };

})();
