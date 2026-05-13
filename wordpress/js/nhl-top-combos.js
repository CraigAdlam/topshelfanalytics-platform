document.addEventListener("DOMContentLoaded", function () {
  console.log("NHL Top Combos JS loaded");
  const statusBox = document.getElementById("tsa-status");
  const lastUpdatedBox = document.getElementById("tsa-last-updated");
  const correctCombosBox = document.getElementById("tsa-correct-combos");
  const comboPoolBox = document.getElementById("tsa-combo-pool");

  const predictionDateSelect = document.getElementById("tsa-prediction-date");
  const searchInput = document.getElementById("tsa-search");
  const teamSelect = document.getElementById("tsa-team");
  const resultSelect = document.getElementById("tsa-result");

  const minProbInput = document.getElementById("tsa-min-prob");
  const minAccuracyInput = document.getElementById("tsa-min-accuracy");
  const minPrecisionInput = document.getElementById("tsa-min-precision");
  const minRecallInput = document.getElementById("tsa-min-recall");
  const minF1Input = document.getElementById("tsa-min-f1");
  const minLegEVInput = document.getElementById("tsa-min-leg-ev");
  const minComboEVInput = document.getElementById("tsa-min-combo-ev");
  const minWinProbInput = document.getElementById("tsa-min-win-prob");

  const resetButton = document.getElementById("tsa-reset");

  function setStatus(message, type = "loading") {
    statusBox.textContent = message;
    statusBox.className = "tsa-status " + type;
  }

  function formatNumber(value, decimals = 2) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(decimals) : "";
  }

  function formatPercent(value, decimals = 1) {
    const num = Number(value);
    return Number.isFinite(num) ? (num * 100).toFixed(decimals) + "%" : "";
  }

  function getPercentParam(input) {
    const value = Number(input.value);
    return Number.isFinite(value) && input.value !== "" ? value / 100 : "";
  }

  function getDecimalParam(input) {
    const value = Number(input.value);
    return Number.isFinite(value) && input.value !== "" ? value : "";
  }

  function resultFormatter(cell) {
    const value = cell.getValue();

    if (value === "Hit") {
      cell.getElement().classList.add("cell-green-light");
    } else if (value === "Miss") {
      cell.getElement().classList.add("cell-red-light");
    } else if (value === "Pending") {
      cell.getElement().classList.add("cell-gold");
    }

    return value || "";
  }

  function getAjaxParams() {
	return {
	  predictionDate: predictionDateSelect.value,
	  search: searchInput.value.trim(),
	  teamAbbrev: teamSelect.value,
	  resultLabel: resultSelect.value,
	  minPredProb2Plus: getPercentParam(minProbInput),
	  minAccuracy2Plus: getPercentParam(minAccuracyInput),
	  minPrecision2Plus: getPercentParam(minPrecisionInput),
	  minRecall2Plus: getPercentParam(minRecallInput),
	  minF1Score2Plus: getPercentParam(minF1Input),
	  minLegEV2Plus: getDecimalParam(minLegEVInput),
	  minEV: getDecimalParam(minComboEVInput),
	  minWinProb: getPercentParam(minWinProbInput),
	};
  }

  function reloadTable() {
    topCombosTable.setData();
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

  fetch("/wp-content/uploads/tsa-data/top_combos/wp_top_combos_refresh_meta.json")
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

	  if (lastUpdatedBox) {
	    lastUpdatedBox.textContent = "Top combinations updated: " + formatted;
	  }
    })
    .catch(() => {
      lastUpdatedBox.textContent = "Top combinations updated: Unavailable";
    });

  fetch("/wp-json/tsa/v1/top-combos-2plus-meta")
    .then(res => res.json())
    .then(meta => {
      populateSelect(
        predictionDateSelect,
        meta.predictionDates || [],
        "All Dates"
      );

      populateSelect(
        teamSelect,
        meta.teams || [],
        "All Teams"
      );
    })
    .catch(() => {
      setStatus("Top combinations metadata unavailable.", "error");
    });

  const topCombosTable = new Tabulator("#tsa-table", {
    ajaxURL: "/wp-json/tsa/v1/top-combos-2plus",
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
	  { column: "predictionDate", dir: "desc" },
	  { column: "ev", dir: "desc" },
	],

	columns: [
	  {
		title: "Date",
		field: "predictionDate",
		sorter: "date",
		width: 110,
		frozen: true,
	  },
	  {
		title: "Result",
		field: "parlayResultLabel",
		width: 85,
		formatter: resultFormatter,
		hozAlign: "center",
	  },
	  {
		title: "Win Prob",
		field: "winProb",
		width: 100,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "Combo EV",
		field: "ev",
		width: 100,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "Combo Edge",
		field: "parlayEdge",
		width: 110,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "Combo Odds",
		field: "parlayAmerican",
		width: 105,
		formatter: cell => formatNumber(cell.getValue(), 0),
		hozAlign: "center",
	  },
	  {
		title: "P1 Player",
		field: "p1_skaterFullName",
		width: 140,
		hozAlign: "left",
	  },
	  {
		title: "P1 Team",
		field: "p1_teamAbbrev",
		width: 80,
		hozAlign: "center",
	  },
	  {
		title: "P1 Prob",
		field: "p1_predProb2Plus",
		width: 95,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "P1 F1",
		field: "p1_f1Score2Plus",
		width: 80,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "P1 Odds",
		field: "p1_oddsAmerican",
		width: 85,
		formatter: cell => formatNumber(cell.getValue(), 0),
		hozAlign: "center",
	  },
	  {
		title: "P2 Player",
		field: "p2_skaterFullName",
		width: 140,
		hozAlign: "left",
	  },
	  {
		title: "P2 Team",
		field: "p2_teamAbbrev",
		width: 80,
		hozAlign: "center",
	  },
	  {
		title: "P2 Prob",
		field: "p2_predProb2Plus",
		width: 95,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "P2 F1",
		field: "p2_f1Score2Plus",
		width: 80,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "P2 Odds",
		field: "p2_oddsAmerican",
		width: 85,
		formatter: cell => formatNumber(cell.getValue(), 0),
		hozAlign: "center",
	  },
	  {
		title: "P3 Player",
		field: "p3_skaterFullName",
		width: 140,
		hozAlign: "left",
	  },
	  {
		title: "P3 Team",
		field: "p3_teamAbbrev",
		width: 80,
		hozAlign: "center",
	  },
	  {
		title: "P3 Prob",
		field: "p3_predProb2Plus",
		width: 95,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "P3 F1",
		field: "p3_f1Score2Plus",
		width: 80,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "P3 Odds",
		field: "p3_oddsAmerican",
		width: 85,
		formatter: cell => formatNumber(cell.getValue(), 0),
		hozAlign: "center",
	  },
	  {
		title: "Min Prob",
		field: "minPredProb2Plus",
		width: 95,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "Min F1",
		field: "minF1Score2Plus",
		width: 85,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "Min Acc",
		field: "minAccuracy2Plus",
		width: 85,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "Min Prec",
		field: "minPrecision2Plus",
		width: 90,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	  {
		title: "Min Recall",
		field: "minRecall2Plus",
		width: 95,
		formatter: cell => formatPercent(cell.getValue(), 1),
		hozAlign: "center",
	  },
	],

	ajaxResponse: function (url, params, response) {
	  const total = response.total || 0;

	  if (comboPoolBox) {
	    comboPoolBox.textContent = total.toLocaleString();
	  }

	  if (total === 0) {
		setStatus("No top combinations match the selected filters.", "empty");
	  } else {
		setStatus("Matching combinations: " + total.toLocaleString(), "success");
	  }

	  if (correctCombosBox) {
		if (
		  response.correct_combos_pct === null ||
		  response.correct_combos_pct === undefined ||
		  !Number.isFinite(Number(response.correct_combos_pct))
		) {
		  correctCombosBox.textContent = "--";
		} else {
		  correctCombosBox.textContent =
			Number(response.correct_combos_pct).toFixed(0) + "%";
		}
	  }

	  return response;
	},

    ajaxError: function () {
      setStatus("Failed to load top combinations.", "error");
    },
  });

  [
    predictionDateSelect,
    teamSelect,
    resultSelect,
    minProbInput,
	minAccuracyInput,
    minPrecisionInput,
	minRecallInput,
    minF1Input,
	minLegEVInput,
	minComboEVInput,
	minWinProbInput,
  ].forEach(el => {
    el.addEventListener("change", reloadTable);
  });

  searchInput.addEventListener("input", function () {
    clearTimeout(searchInput._tsaTimer);

    searchInput._tsaTimer = setTimeout(() => {
      reloadTable();
    }, 300);
  });

  resetButton.addEventListener("click", function () {
    predictionDateSelect.value = "";
    searchInput.value = "";
    teamSelect.value = "";
    resultSelect.value = "";
    minProbInput.value = "";
	minAccuracyInput.value = "";
    minPrecisionInput.value = "";
	minRecallInput.value = "";
    minF1Input.value = "";
	minLegEVInput.value = "";
	minComboEVInput.value = "";
	minWinProbInput.value = "";

    topCombosTable.clearSort();
	topCombosTable.setSort([
	  { column: "predictionDate", dir: "desc" },
	  { column: "ev", dir: "desc" },
	]);

    reloadTable();
  });

});