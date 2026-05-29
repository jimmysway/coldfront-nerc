/**
 * Chart Configuration Module
 *
 * Dataset color definitions for usage charts.
 */

const ChartConfig = (function() {
  'use strict';

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

  return { DATASET_COLORS, COLOR_PALETTE };

})();
