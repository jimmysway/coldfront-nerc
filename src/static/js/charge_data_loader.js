/**
 * Charge data loader for allocation usage charts.
 *
 * Reads the backend-rendered json_script payload and converts it into the
 * dataset shape consumed by allocation_detail.js.
 */

const ChargeDataLoader = (function () {
    "use strict";

    function transformCumulativeCharges(rawData) {
        if (
            !rawData ||
            typeof rawData !== "object" ||
            Object.keys(rawData).length === 0
        ) {
            return null;
        }

        const sortedDates = Object.keys(rawData).sort();
        if (sortedDates.length === 0) return null;

        const firstDate = sortedDates[0];
        const [yearStr, monthStr] = firstDate.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;

        const suTypes = new Set();
        for (const dateStr of sortedDates) {
            const dayData = rawData[dateStr];
            if (dayData && typeof dayData === "object") {
                Object.keys(dayData).forEach((su) => suTypes.add(su));
            }
        }

        const colorPalette = ChartConfig.COLOR_PALETTE;
        const datasets = [];
        const sortedSuTypes = Array.from(suTypes).sort();

        sortedSuTypes.forEach((suType, idx) => {
            const data = sortedDates.map((dateStr) => {
                const dayData = rawData[dateStr];
                if (dayData && dayData[suType] !== undefined) {
                    return parseFloat(dayData[suType]);
                }
                return null;
            });

            const color = colorPalette[idx % colorPalette.length];
            datasets.push({
                label: suType,
                data: data,
                borderColor: color.border,
                backgroundColor: color.background,
            });
        });

        return { year, month, datasets };
    }

    function loadChargesData(options = {}) {
        const dataElementId = options.dataElementId || "charges-data";
        const chartViewId = options.chartViewId || "chart-view";
        const log =
            options.log ||
            ((msg, ...args) => console.info("[NERC Chart]", msg, ...args));
        const warn =
            options.warn ||
            ((msg, ...args) => console.warn("[NERC Chart]", msg, ...args));

        const chartView = document.getElementById(chartViewId);
        if (!chartView) {
            warn(`no #${chartViewId}; skipping chart load`);
            return null;
        }

        const chargesDataElement = document.getElementById(dataElementId);
        if (!chargesDataElement) {
            warn(`no #${dataElementId} json_script; chart will be hidden`);
            return null;
        }

        let rawData = null;
        try {
            rawData = JSON.parse(chargesDataElement.textContent);
        } catch (e) {
            warn(`failed to parse #${dataElementId}:`, e);
            return null;
        }

        if (
            !rawData ||
            typeof rawData !== "object" ||
            Object.keys(rawData).length === 0
        ) {
            warn(`empty charges payload in #${dataElementId}`);
            return null;
        }

        const transformed = transformCumulativeCharges(rawData);
        if (!transformed || !transformed.datasets.length) {
            warn("transformCumulativeCharges produced no datasets", rawData);
            return null;
        }

        log(
            `loaded ${transformed.datasets.length} datasets, ${transformed.datasets[0].data.length} days (year=${transformed.year} month=${transformed.month + 1})`,
        );
        return transformed;
    }

    return {
        loadChargesData,
        transformCumulativeCharges,
    };
})();
