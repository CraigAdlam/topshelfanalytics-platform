document.addEventListener("DOMContentLoaded", function () {
  const statusBox = document.getElementById("tsa-status");

  const predictionDateSelect = document.getElementById("tsa-prediction-date");
  const searchInput = document.getElementById("tsa-search");
  const teamSelect = document.getElementById("tsa-team");
  const positionSelect = document.getElementById("tsa-position");
  const resultSelect = document.getElementById("tsa-result");

  const minProbInput = document.getElementById("tsa-min-prob");
  const minPrecisionInput = document.getElementById("tsa-min-precision");
  const minF1Input = document.getElementById("tsa-min-f1");
  const minConcentrationInput = document.getElementById("tsa-min-concentration");

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
      positionCode: positionSelect.value,
      resultLabel: resultSelect.value,
      minProb2Plus: getPercentParam(minProbInput),
      minPrecision2Plus: getPercentParam(minPrecisionInput),
      minF1Score2Plus: getPercentParam(minF1Input),
      minShotsConcentration: getPercentParam(minConcentrationInput),
    };
  }

  function reloadTable() {
    topPicksTable.setData();
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

  fetch("/wp-json/tsa/v1/top-picks-2plus-meta")
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

      populateSelect(
        positionSelect,
        meta.positions || [],
        "All Positions"
      );
    })
    .catch(() => {
      setStatus("Top picks metadata unavailable.", "error");
    });

  const topPicksTable = new Tabulator("#tsa-table", {
    ajaxURL: "/wp-json/tsa/v1/top-picks-2plus",
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
      { column: "predProb2Plus", dir: "desc" },
    ],

    columns: [
      {
        title: "Date",
        field: "predictionDate",
        sorter: "date",
        width: 110,
      },
	  {
	    title: "Player",
	    field: "skaterFullName",
	    width: 220,
	    frozen: true,
	  },
      {
        title: "Team",
        field: "teamAbbrev",
        width: 80,
      },
      {
        title: "Opp",
        field: "opponentTeamAbbrev",
        width: 80,
      },
      {
        title: "H/R",
        field: "homeRoad",
        width: 70,
      },
      {
        title: "Pos",
        field: "positionCode",
        width: 70,
      },
	  {
	    title: "2+ Prob",
	    field: "predProb2Plus",
	    width: 110,
	    formatter: cell => formatPercent(cell.getValue(), 1),
	    hozAlign: "center",
	  },
      {
        title: "Accuracy",
        field: "accuracy2Plus",
        formatter: cell => formatPercent(cell.getValue(), 1),
        hozAlign: "center",
      },
      {
        title: "Precision",
        field: "precision2Plus",
        formatter: cell => formatPercent(cell.getValue(), 1),
        hozAlign: "center",
      },
      {
        title: "Recall",
        field: "recall2Plus",
        formatter: cell => formatPercent(cell.getValue(), 1),
        hozAlign: "center",
      },
      {
        title: "F1",
        field: "f1Score2Plus",
        formatter: cell => formatPercent(cell.getValue(), 1),
        hozAlign: "center",
      },
      {
        title: "Mean",
        field: "shotsMean",
        formatter: cell => formatNumber(cell.getValue(), 2),
        hozAlign: "center",
      },
      {
        title: "Median",
        field: "shotsMedian",
        formatter: cell => formatNumber(cell.getValue(), 1),
        hozAlign: "center",
      },
      {
        title: "Mode",
        field: "shotsMode",
        formatter: cell => formatNumber(cell.getValue(), 0),
        hozAlign: "center",
      },
      {
        title: "Concentration",
        field: "shotsConcentration",
        formatter: cell => formatPercent(cell.getValue(), 1),
        hozAlign: "center",
      },
      {
        title: "Skew",
        field: "shotsSkew",
        formatter: cell => formatNumber(cell.getValue(), 2),
        hozAlign: "center",
      },
      {
        title: "Games",
        field: "gamesInDistribution",
        hozAlign: "center",
      },
      {
        title: "Actual Shots",
        field: "actualShots",
        hozAlign: "center",
      },
      {
        title: "Result",
        field: "resultLabel",
        formatter: resultFormatter,
        hozAlign: "center",
      },
    ],

	ajaxResponse: function (url, params, response) {
	  const total = response.total || 0;

	  if (total === 0) {
		setStatus("No top picks match the selected filters.", "empty");
	  } else {
		setStatus("Matching picks: " + total.toLocaleString(), "success");
	  }

	  return response;
	},

    ajaxError: function () {
      setStatus("Failed to load top picks.", "error");
    },
  });

  [
    predictionDateSelect,
    teamSelect,
    positionSelect,
    resultSelect,
    minProbInput,
    minPrecisionInput,
    minF1Input,
    minConcentrationInput,
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
    positionSelect.value = "";
    resultSelect.value = "";
    minProbInput.value = "";
    minPrecisionInput.value = "";
    minF1Input.value = "";
    minConcentrationInput.value = "";

    topPicksTable.clearSort();
    topPicksTable.setSort([
      { column: "predictionDate", dir: "desc" },
      { column: "predProb2Plus", dir: "desc" },
    ]);

    reloadTable();
  });
});