/* ========================================
   CONSTANTS
   ======================================== */

const DOM_IDS = {
    CHARGES_DATA: "charges-data",
    CHART_VIEW: "chart-view",
    TABLE_VIEW: "table-view",
    ALLOCATION_USAGE_CHART: "allocationUsageChart",
    ALLOCATION_USAGE_TABLE: "allocationUsageTable",
    SU_COSTS_CARD: "su-costs-card",
    SHOW_GRAPH_BTN: "show-graph-btn",
    SHOW_TABLE_BTN: "show-table-btn",
    SHOW_CUMULATIVE_BTN: "show-cumulative-btn",
    SHOW_DAILY_BTN: "show-daily-btn",
    EXPORT_CSV_BTN: "export-csv-btn",
    CHART_TITLE: "chart-title",
    CHART_SUBTITLE: "chart-subtitle",
};

/* ========================================
   UTILITY REFERENCES
   ======================================== */

const generateUsageLabels = ChartUtils.generateUsageLabels;
const getResponsiveMaxTicksLimit = ChartUtils.getResponsiveMaxTicksLimit;
const getResponsiveFontSizes = ChartUtils.getResponsiveFontSizes;
const processDatasetForChart = ChartUtils.processDatasetForChart;
const calculateDailyData = ChartUtils.calculateDailyData;
const getHoverColor = ChartUtils.getHoverColor;
const transformCumulativeCharges = ChargeDataLoader.transformCumulativeCharges;
const loadChargesData = ChargeDataLoader.loadChargesData;

const usageChartData = loadChargesData({
    dataElementId: DOM_IDS.CHARGES_DATA,
    chartViewId: DOM_IDS.CHART_VIEW,
});
const usageYear = usageChartData?.year || new Date().getFullYear();
const usageMonth =
    usageChartData?.month !== undefined
        ? usageChartData.month
        : new Date().getMonth();
const usageLabels = generateUsageLabels(usageYear, usageMonth);

let usageDatasets;
if (usageChartData && usageChartData.datasets.length > 0) {
    usageDatasets = usageChartData.datasets;
} else {
    usageDatasets = [];
}

const suCostsCard = document.getElementById(DOM_IDS.SU_COSTS_CARD);
if (suCostsCard && usageDatasets.length === 0) {
    console.warn(
        "[NERC Chart] hiding #" + DOM_IDS.SU_COSTS_CARD + " (no usage data)",
    );
    suCostsCard.style.display = "none";
}

/* ========================================
   DATA HELPERS
   ======================================== */

let currentDataMode = "cumulative";
let dailyDatasetsCache = null;

function getDataForMode(mode) {
    if (mode === "daily") {
        if (!dailyDatasetsCache) {
            dailyDatasetsCache = usageDatasets.map((ds) => ({
                ...ds,
                data: calculateDailyData(ds.data),
            }));
        }
        return dailyDatasetsCache;
    }
    return usageDatasets;
}

function toISODate(year, month, day) {
    const y = String(year);
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Per-column numeric values for one day; null = gap. */
function summedNumericCells(datasets, rowIndex) {
    const values = datasets.map((ds) => {
        const v = ds.data[rowIndex];
        return v !== null && v !== undefined && !Number.isNaN(v) ? v : null;
    });
    const present = values.filter((v) => v !== null);
    return {
        values,
        rowTotal: present.reduce((a, b) => a + b, 0),
        anyValue: present.length > 0,
    };
}

function maxDataPoints(datasets) {
    return datasets.reduce((m, ds) => Math.max(m, ds.data?.length || 0), 0);
}

/** Shapes datasets + x labels the same way for first paint, mode updates, and Playwright. */
function buildUsageChartPayload(datasets, year, month) {
    const baseLabels = generateUsageLabels(year, month);
    const processedDatasets = (datasets || []).map((ds, idx) =>
        processDatasetForChart(ds, idx),
    );
    const dataLength = maxDataPoints(processedDatasets);
    const chartLabels = baseLabels.slice(0, dataLength);
    return { chartLabels, processedDatasets };
}

const USAGE_DATATABLE_OPTIONS = {
    aoColumnDefs: [{ bSortable: false, aTargets: ["nosort"] }],
};

function exportUsageToCSV() {
    const datasets = getDataForMode(currentDataMode);

    // Build CSV header
    let csvContent = "Date";
    datasets.forEach((ds) => {
        csvContent += "," + ds.label + " (USD)";
    });
    csvContent += ",Total (USD)\n";

    // Build CSV rows with ISO date format
    usageLabels.forEach((label, i) => {
        const { values, rowTotal, anyValue } = summedNumericCells(datasets, i);
        csvContent += toISODate(usageYear, usageMonth, i + 1);
        values.forEach((v) => {
            csvContent += v === null ? "," : `,${v.toFixed(2)}`;
        });
        csvContent += "," + (anyValue ? rowTotal.toFixed(2) : "");
        csvContent += "\n";
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `su_usage_${currentDataMode}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Attach export button handler
var exportBtn = document.getElementById(DOM_IDS.EXPORT_CSV_BTN);
if (exportBtn) {
    exportBtn.addEventListener("click", exportUsageToCSV);
}

// Populate Table with usage data
var dataTableInstance = null;

function populateUsageTable(datasets) {
    const table = document.getElementById(DOM_IDS.ALLOCATION_USAGE_TABLE);
    if (!table) return;

    // Destroy existing DataTable if it exists
    if (dataTableInstance) {
        dataTableInstance.destroy();
        dataTableInstance = null;
    }

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");

    // Header row
    let headerRow = "<tr>";
    headerRow += '<th scope="col">Date</th>';
    datasets.forEach((ds) => {
        headerRow += `<th scope="col">${ds.label} (USD)</th>`;
    });
    headerRow += '<th scope="col">Total (USD)</th>';
    headerRow += "</tr>";
    thead.innerHTML = headerRow;

    // Body: one row per day
    let bodyRows = "";
    usageLabels.forEach((label, i) => {
        const { values, rowTotal, anyValue } = summedNumericCells(datasets, i);
        bodyRows += "<tr>";
        bodyRows += `<th scope="row" class="text-nowrap">${label}</th>`;
        values.forEach((v) => {
            bodyRows +=
                v === null
                    ? '<td class="text-muted">-</td>'
                    : `<td>${v.toFixed(2)}</td>`;
        });
        bodyRows += anyValue
            ? `<td><strong>${rowTotal.toFixed(2)}</strong></td>`
            : '<td class="text-muted">-</td>';
        bodyRows += "</tr>";
    });
    tbody.innerHTML = bodyRows;

    // Only initialize DataTable when the container is visible; if the table is
    // hidden, DataTables will mis-measure column widths. The table button click
    // handler is responsible for initializing it on first reveal.
    const tableContainer = document.getElementById(DOM_IDS.TABLE_VIEW);
    const isTableVisible =
        tableContainer && tableContainer.style.display !== "none";
    if (isTableVisible && typeof $ !== "undefined" && $.fn.DataTable) {
        dataTableInstance = $("#allocationUsageTable").DataTable(
            USAGE_DATATABLE_OPTIONS,
        );
    }
}

// Initial table population
populateUsageTable(usageDatasets);

// View toggle handlers (graph/table)
var graphBtn = document.getElementById(DOM_IDS.SHOW_GRAPH_BTN);
var tableBtn = document.getElementById(DOM_IDS.SHOW_TABLE_BTN);
var chartView = document.getElementById(DOM_IDS.CHART_VIEW);
var tableView = document.getElementById(DOM_IDS.TABLE_VIEW);

if (graphBtn && tableBtn && chartView && tableView) {
    graphBtn.addEventListener("click", function () {
        chartView.style.display = "block";
        tableView.style.display = "none";
        graphBtn.classList.add("active");
        tableBtn.classList.remove("active");
    });

    tableBtn.addEventListener("click", function () {
        chartView.style.display = "none";
        tableView.style.display = "block";
        graphBtn.classList.remove("active");
        tableBtn.classList.add("active");

        if (typeof $ !== "undefined" && $.fn.DataTable) {
            if (!dataTableInstance) {
                dataTableInstance = $(
                    "#" + DOM_IDS.ALLOCATION_USAGE_TABLE,
                ).DataTable(USAGE_DATATABLE_OPTIONS);
            } else {
                dataTableInstance.columns.adjust().draw(false);
            }
        }
    });
}

// Data mode toggle handlers
var cumulativeBtn = document.getElementById(DOM_IDS.SHOW_CUMULATIVE_BTN);
var dailyBtn = document.getElementById(DOM_IDS.SHOW_DAILY_BTN);
var usageChart = null;

// NERC Usage Chart
const ctx = document.getElementById(DOM_IDS.ALLOCATION_USAGE_CHART);

if (ctx) {
    const initialPayload = buildUsageChartPayload(
        usageDatasets,
        usageYear,
        usageMonth,
    );

    usageChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: initialPayload.chartLabels,
            datasets: initialPayload.processedDatasets,
        },
        options: buildUsageChartOptions({
            getResponsiveFontSizes,
            getResponsiveMaxTicksLimit,
            getHoverColor,
            externalTooltipHandler,
        }),
    });

    function updateChartData(mode) {
        const datasets = getDataForMode(mode);
        const payload = buildUsageChartPayload(datasets, usageYear, usageMonth);
        usageChart.data.labels = payload.chartLabels;
        usageChart.data.datasets = payload.processedDatasets;
        usageChart.update();
    }

    // Toggle button handlers
    const chartTitle = document.getElementById(DOM_IDS.CHART_TITLE);
    const chartSubtitle = document.getElementById(DOM_IDS.CHART_SUBTITLE);

    const modeConfig = {
        cumulative: {
            title: "SU Cost - Cumulative",
            subtitle: "Showing the cumulative cost for this month",
        },
        daily: {
            title: "SU Cost - Daily",
            subtitle: "Showing the daily cost for this month",
        },
    };

    function switchMode(mode) {
        if (currentDataMode === mode) return;
        currentDataMode = mode;
        cumulativeBtn?.classList.toggle("active", mode === "cumulative");
        dailyBtn?.classList.toggle("active", mode === "daily");
        updateChartData(mode);
        populateUsageTable(getDataForMode(mode));
        if (chartTitle) chartTitle.textContent = modeConfig[mode].title;
        if (chartSubtitle)
            chartSubtitle.textContent = modeConfig[mode].subtitle;
    }

    cumulativeBtn?.addEventListener("click", () => switchMode("cumulative"));
    dailyBtn?.addEventListener("click", () => switchMode("daily"));
}

if (typeof window !== "undefined") {
    window.__nercChart = {
        transformCumulativeCharges,
        loadChargesData,
        buildUsageChartPayload,
        DOM_IDS,
        getUsageChartOptionDeps() {
            return {
                getResponsiveFontSizes,
                getResponsiveMaxTicksLimit,
                getHoverColor,
                externalTooltipHandler,
            };
        },
    };
}
