document.addEventListener("DOMContentLoaded", function () {
  console.log("NHL Model Lift JS loaded");

  const statusBox = document.getElementById("tsa-status");
  const lastUpdatedBox = document.getElementById("tsa-last-updated");

  const avgLiftBox = document.getElementById("tsa-avg-lift");
  const playerSeasonsBox = document.getElementById("tsa-player-seasons");

  const liftTypeSelect = document.getElementById("tsa-lift-type");
  const searchInput = document.getElementById("tsa-search");
  const minLiftInput = document.getElementById("tsa-min-lift");
  const resetButton = document.getElementById("tsa-reset");

  const chartCanvas = document.getElementById("tsa-model-lift-chart");

  let modelLiftChart = null;

  function setStatus(message, type = "loading") {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = "tsa-status " + type;
  }

  function formatNumber(value, decimals = 1) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(decimals) : "";
  }

  function formatPct(value, decimals = 1) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(decimals) + "%" : "--";
  }

  function formatPctPoints(value, decimals = 1) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "--";

    const sign = num > 0 ? "+" : "";
    return sign + num.toFixed(decimals) + " pts";
  }

  function getBubbleRadius(modelPicks) {
    const picks = Number(modelPicks);

    if (!Number.isFinite(picks)) return 4;

    return Math.max(
      4,
      Math.min(18, 3 + Math.sqrt(picks))
    );
  }

  function getBubbleColor(liftValue) {
    const lift = Number(liftValue);

    if (!Number.isFinite(lift)) {
      return "rgba(107, 114, 128, 0.55)";
    }

    if (lift >= 0) {
      return "rgba(22, 163, 74, 0.55)";
    }

    return "rgba(220, 38, 38, 0.55)";
  }

  function getBubbleBorderColor(liftValue) {
    const lift = Number(liftValue);

    if (!Number.isFinite(lift)) {
      return "rgba(107, 114, 128, 0.9)";
    }

    if (lift >= 0) {
      return "rgba(22, 101, 52, 0.95)";
    }

    return "rgba(153, 27, 27, 0.95)";
  }

  function getNumericValue(input) {
    if (!input || input.value === "") return "";
    const value = Number(input.value);
    return Number.isFinite(value) ? value : "";
  }

  function getAjaxParams() {
    return {
      playerLiftType: liftTypeSelect.value,
      search: searchInput.value.trim(),
      minLiftPctPoints: getNumericValue(minLiftInput),
    };
  }

  function populateSelect(select, values, defaultLabel) {
    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultLabel;
    select.appendChild(defaultOption);

    values.forEach(value => {
      if (!value) return;

      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function loadLastUpdated() {
    if (!lastUpdatedBox) return;

    fetch("/wp-content/uploads/tsa-data/top_picks/wp_top_picks_refresh_meta.json?v=" + Date.now())
      .then(res => res.json())
      .then(meta => {
        const raw = meta.finished_at.replace(" ", "T");
        const date = new Date(raw);

        const formatted = date.toLocaleString("en-CA", {
          timeZone: "America/Vancouver",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZoneName: "short"
        });

        lastUpdatedBox.textContent = "Model lift updated: " + formatted;
      })
      .catch(() => {
        lastUpdatedBox.textContent = "Model lift updated: Unavailable";
      });
  }

  function loadFilterOptions() {
    const params = new URLSearchParams();

    fetch("/wp-json/tsa/v1/model-lift-2plus-meta?" + params.toString())
      .then(res => res.json())
      .then(meta => {
        const currentLiftType = liftTypeSelect.value;

        populateSelect(liftTypeSelect, meta.playerLiftTypes || [], "All Lift Types");
        liftTypeSelect.value = currentLiftType || "";
      })
      .catch(() => {
        setStatus("Model lift metadata unavailable.", "error");
      });
  }

  function buildChart() {
    if (!chartCanvas || !window.Chart) return;

    modelLiftChart = new Chart(chartCanvas, {
      type: "scatter",
      data: {
		datasets: [
		  {
		    label: "",
		    data: [],
		    pointRadius: context => {
			  const raw = context.raw || {};
			  return getBubbleRadius(raw.modelPicks);
		    },
		    pointHoverRadius: context => {
			  const raw = context.raw || {};
			  return getBubbleRadius(raw.modelPicks) + 2;
		    },
		    backgroundColor: context => {
			  const raw = context.raw || {};
			  return getBubbleColor(raw.y);
		    },
		    borderColor: context => {
			  const raw = context.raw || {};
			  return getBubbleBorderColor(raw.y);
		    },
		    borderWidth: 1,
		  },
		  {
			label: "No Lift",
			data: [
			  { x: 35, y: 0 },
			  { x: 95, y: 0 },
			],
			type: "line",
			borderWidth: 2,
			pointRadius: 0,
			borderDash: [6, 4],
		  },
		],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        scales: {
		  x: {
			title: {
			  display: true,
			  text: "Player Raw Baseline Hit Rate"
			},
			ticks: {
			  callback: value => value + "%"
			}
		  },
		  y: {
		    title: {
			  display: true,
			  text: "Model Lift vs Baseline"
		    },
		    ticks: {
			  callback: value => value + " pts"
		    }
		  }
        },
        plugins: {
		  legend: {
		    display: false
		  },
          tooltip: {
            callbacks: {
              label: context => {
                const raw = context.raw || {};

                if (!raw.player) {
                  return "No Lift";
                }

				return [
				  raw.player + " (" + raw.season + ")",
				  "Baseline: " + formatPct(raw.x),
				  "Lift: " + formatPctPoints(raw.y),
				  "Model Hit Rate: " + formatPct(raw.modelHitRate),
				  "Qualified Picks: " + raw.modelPicks,
				  "Baseline Picks: " + raw.baselinePicks,
				];
              }
            }
          }
        }
      }
    });
  }

  function updateChart(rows) {
    if (!modelLiftChart) return;

    modelLiftChart.data.datasets[0].data = rows.map(row => ({
      x: Number(row.baselineHitRatePct),
      y: Number(row.liftPctPointsDisplay),
      player: row.skaterFullName,
      season: row.season,
      modelHitRate: Number(row.modelHitRatePct),
      modelPicks: row.modelPicks,
      baselinePicks: row.baselinePicks,
      playerLiftType: row.playerLiftType,
    }));

    modelLiftChart.update();
  }

  function loadChartAndKpis() {
    const params = new URLSearchParams(getAjaxParams());

    fetch("/wp-json/tsa/v1/model-lift-2plus?" + params.toString())
      .then(res => res.json())
      .then(response => {
        const rows = response.data || [];

        updateChart(rows);

        if (playerSeasonsBox) {
          playerSeasonsBox.textContent = Number(response.total || 0).toLocaleString();
        }

        if (avgLiftBox) {
          avgLiftBox.textContent = formatPctPoints(response.avg_lift_pct_points);
        }
      })
      .catch(() => {
        updateChart([]);
        if (playerSeasonsBox) playerSeasonsBox.textContent = "--";
        if (avgLiftBox) avgLiftBox.textContent = "--";
      });
  }

  function reloadAll() {
    modelLiftTable.setData();
    loadChartAndKpis();
  }

  function liftFormatter(cell) {
    const value = Number(cell.getValue());

    if (!Number.isFinite(value)) return "";

    if (value >= 8) {
      cell.getElement().classList.add("cell-green-strong");
    } else if (value >= 3) {
      cell.getElement().classList.add("cell-green-light");
    } else if (value <= -5) {
      cell.getElement().classList.add("cell-red-light");
    }

    return formatPctPoints(value);
  }

  function liftTypeFormatter(cell) {
    const value = cell.getValue();

    if (value === "Strong positive lift") {
      cell.getElement().classList.add("cell-green-strong");
    } else if (value === "Positive lift") {
      cell.getElement().classList.add("cell-green-light");
    } else if (value === "Negative lift") {
      cell.getElement().classList.add("cell-red-light");
    }

    return value || "";
  }

  const modelLiftTable = new Tabulator("#tsa-table", {
    ajaxURL: "/wp-json/tsa/v1/model-lift-2plus",
    ajaxParams: getAjaxParams,
    ajaxConfig: "GET",

    layout: "fitDataStretch",
    responsiveLayout: false,

    pagination: true,
    paginationMode: "remote",
    paginationSize: 25,
    paginationSizeSelector: [10, 25, 50, 100],

    dataReceiveParams: {
      data: "data",
      last_page: "last_page",
    },

    sortMode: "remote",

    initialSort: [
      { column: "liftPctPointsDisplay", dir: "desc" },
      { column: "modelPicks", dir: "desc" },
    ],

    columns: [
      {
        title: "Season",
        field: "season",
        width: 95,
        hozAlign: "center",
      },
      {
        title: "Player",
        field: "skaterFullName",
        width: 160,
        minWidth: 160,
        frozen: true,
      },
      {
        title: "Lift Type",
        field: "playerLiftType",
        width: 155,
        formatter: liftTypeFormatter,
      },
      {
        title: "Lift",
        field: "liftPctPointsDisplay",
        width: 100,
        hozAlign: "center",
        formatter: liftFormatter,
      },
      {
        title: "Model Hit Rate",
        field: "modelHitRatePct",
        width: 130,
        hozAlign: "center",
        formatter: cell => formatPct(cell.getValue()),
      },
      {
        title: "Baseline Hit Rate",
        field: "baselineHitRatePct",
        width: 140,
        hozAlign: "center",
        formatter: cell => formatPct(cell.getValue()),
      },
      {
        title: "Model Picks",
        field: "modelPicks",
        width: 110,
        hozAlign: "center",
      },
      {
        title: "Model Hits",
        field: "modelHits",
        width: 105,
        hozAlign: "center",
      },
      {
        title: "Baseline Picks",
        field: "baselinePicks",
        width: 125,
        hozAlign: "center",
      },
      {
        title: "Baseline Hits",
        field: "baselineHits",
        width: 120,
        hozAlign: "center",
      },
      {
        title: "Relative Lift",
        field: "relativeLiftPct",
        width: 120,
        hozAlign: "center",
        formatter: cell => formatPct(cell.getValue()),
      },
      {
        title: "Hits / 100",
        field: "modelMinusBaselineHitsPer100",
        width: 110,
        hozAlign: "center",
        formatter: cell => formatNumber(cell.getValue(), 1),
      },
      {
        title: "Avg Pred Prob",
        field: "modelAvgPredProbPct",
        width: 125,
        hozAlign: "center",
        formatter: cell => formatPct(cell.getValue()),
      },
      {
        title: "Avg F1",
        field: "modelAvgF1ScorePct",
        width: 95,
        hozAlign: "center",
        formatter: cell => formatPct(cell.getValue()),
      },
      {
        title: "Player ID",
        field: "playerId",
        width: 105,
        hozAlign: "center",
      },
    ],

    ajaxResponse: function (url, params, response) {
      const total = response.total || 0;

      if (total === 0) {
        setStatus("No model lift rows match the selected filters.", "empty");
      } else {
        setStatus("Matching player-seasons: " + total.toLocaleString(), "success");
      }

      return response;
    },

    ajaxError: function () {
      setStatus("Failed to load model lift.", "error");
    },
  });

  [
    liftTypeSelect,
    minLiftInput,
  ].forEach(el => {
    if (el) {
      el.addEventListener("change", reloadAll);
    }
  });

  searchInput.addEventListener("input", function () {
    clearTimeout(searchInput._tsaTimer);

    searchInput._tsaTimer = setTimeout(() => {
      reloadAll();
    }, 300);
  });

  resetButton.addEventListener("click", function () {
	liftTypeSelect.value = "";
	searchInput.value = "";
	minLiftInput.value = "";

    modelLiftTable.clearSort();
    modelLiftTable.setSort([
      { column: "liftPctPointsDisplay", dir: "desc" },
      { column: "modelPicks", dir: "desc" },
    ]);

    loadFilterOptions();
    reloadAll();
  });

  loadLastUpdated();
  loadFilterOptions();
  buildChart();
  loadChartAndKpis();
});