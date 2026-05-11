document.addEventListener("DOMContentLoaded", function () {
  const statusBox = document.getElementById("tsa-team-trends-status");
  const trendTeamSelect = document.getElementById("tsa-trend-team");
  const trendMetricSelect = document.getElementById("tsa-trend-metric");
  const trendSplitSelect = document.getElementById("tsa-trend-split");
  const trendCanvas = document.getElementById("tsa-team-trend-chart");
  const mainTrendChartWrap = document.getElementById("tsa-main-trend-chart-wrap");
  const sparklineSplitSelect = document.getElementById("tsa-sparkline-split");
  const sparklineMetricSelect = document.getElementById("tsa-sparkline-metric");
  const sparklineWindowSelect = document.getElementById("tsa-sparkline-window");
  const trendWindowSelect = document.getElementById("tsa-trend-window");
  const matchupWindowSelect = document.getElementById("tsa-matchup-window");

  const seasonModeSelect = document.getElementById("tsa-season-mode");
  const trendSeasonSelect = document.getElementById("tsa-trend-season");

  const compareSeasonsField = document.getElementById("tsa-compare-seasons-field");
  const compareSeasonsSelect = document.getElementById("tsa-compare-seasons");

  let compareSeasonsTomSelect = null;
  

  let trendChart = null;
  let trendRows = [];
  let trendTeamTomSelect = null;
  let roadTeamTomSelect = null;
  let homeTeamTomSelect = null;
  
  const modeTeamButton = document.getElementById("tsa-mode-team");
  const modeMatchupButton = document.getElementById("tsa-mode-matchup");
  const modeSparklinesButton = document.getElementById("tsa-mode-sparklines");

  const teamTrendControls = document.getElementById("tsa-team-trend-controls");
  const matchupLensControls = document.getElementById("tsa-matchup-lens-controls");
  const sparklineControls = document.getElementById("tsa-sparkline-controls");
  const sparklineGrid = document.getElementById("tsa-sparkline-grid");

  const roadTeamSelect = document.getElementById("tsa-road-team");
  const homeTeamSelect = document.getElementById("tsa-home-team");
  const matchupLensSelect = document.getElementById("tsa-matchup-lens");

  let chartMode = "team";

  function setStatus(message, type = "loading") {
    if (!statusBox) return;

    statusBox.textContent = message;
    statusBox.className = "tsa-status " + type;
  }

  function percentValue(value) {
    const num = Number(value);
    return Number.isFinite(num) ? +(num * 100).toFixed(1) : null;
  }

  function normalizeDate(value) {
    return String(value || "").slice(0, 10);
  }

  function updateTrendTeamPlaceholder() {
    if (!trendTeamTomSelect || !seasonModeSelect) return;

    const isCompare = seasonModeSelect.value === "compare";

    const placeholder = isCompare
      ? "Select up to 2 teams..."
      : "Select up to 5 teams...";

    trendTeamTomSelect.settings.placeholder = placeholder;
    trendTeamTomSelect.control_input.placeholder = placeholder;
    trendTeamTomSelect.inputState();
  }

  function populateTrendTeams(rows) {
    if (!trendTeamSelect) return;

    const teams = [...new Set(rows.map(row => row.teamAbbrev))]
      .filter(Boolean)
      .sort();

    trendTeamSelect.innerHTML = "";

    if (teams.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No teams available";
      trendTeamSelect.appendChild(option);
      return;
    }

    teams.forEach(team => {
      const option = document.createElement("option");
      option.value = team;
      option.textContent = team;
      trendTeamSelect.appendChild(option);
    });

	if (trendTeamTomSelect) {
	  trendTeamTomSelect.destroy();
	}

	trendTeamTomSelect = new TomSelect("#tsa-trend-team", {
	  plugins: ["remove_button"],
	  maxItems: 5,
	  persist: false,
	  create: false,
	  placeholder: "Select up to 5 teams...",
	  onChange: function () {
		updateTrendTeamPlaceholder();
		updateTrendChart();
	  }
	});

	trendSplitSelect.value = "R";
	trendMetricSelect.value = "sf_pct_diff";

	trendTeamTomSelect.setValue(["ANA", "COL"]);   /*teams.slice(0, 5));*/
  }
  
  function populateMatchupLensTeams(rows) {
    if (!roadTeamSelect || !homeTeamSelect) return;

    const teams = [...new Set(rows.map(row => row.teamAbbrev))]
      .filter(Boolean)
      .sort();

    roadTeamSelect.innerHTML = "";
    homeTeamSelect.innerHTML = "";

    teams.forEach(team => {
      const roadOption = document.createElement("option");
      roadOption.value = team;
      roadOption.textContent = team;
      roadTeamSelect.appendChild(roadOption);

      const homeOption = document.createElement("option");
      homeOption.value = team;
      homeOption.textContent = team;
      homeTeamSelect.appendChild(homeOption);
    });

	if (roadTeamTomSelect) {
	  roadTeamTomSelect.destroy();
	}

	if (homeTeamTomSelect) {
	  homeTeamTomSelect.destroy();
	}

	roadTeamTomSelect = new TomSelect("#tsa-road-team", {
	  maxItems: 1,
	  persist: false,
	  create: false,
	  placeholder: "Select road team...",
	  onChange: updateTrendChart
	});

	homeTeamTomSelect = new TomSelect("#tsa-home-team", {
	  maxItems: 1,
	  persist: false,
	  create: false,
	  placeholder: "Select home team...",
	  onChange: updateTrendChart
	});

	if (teams.length > 0) {
	  roadTeamTomSelect.setValue("TOR");
	  homeTeamTomSelect.setValue("ANA");

	  if (matchupLensSelect) {
		matchupLensSelect.value = "home";
	  }
	}
  }
  
  function getSelectedTeams() {
    if (!trendTeamTomSelect) return [];

    return trendTeamTomSelect.getValue().slice(0, 5);
  }

  function buildTrendChart() {
    if (!trendCanvas || !window.Chart) return;

    trendChart = new Chart(trendCanvas, {
      type: "line",
	  data: {
	    labels: [],
	    datasets: []
	  },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          y: {
            ticks: {
              callback: value => value + "%"
            },
            title: {
              display: true,
              text: "SF% / SA% Difference vs League Average"
            }
          },
          x: {
            title: {
              display: true,
              text: "Slate Date"
            }
          }
        },
        plugins: {
          legend: {
            display: true
          },
          tooltip: {
            callbacks: {
              label: context => {
                const label = context.dataset.label || "";
                const value = context.parsed.y;

                return label + ": " + value.toFixed(1) + "%";
              }
            }
          }
        }
      }
    });
  }

  function updateMatchupLensChart() {
	const selectedSeason = trendSeasonSelect ? trendSeasonSelect.value : "2025-26";
	const activeRows = trendRows.filter(row => row.season === selectedSeason);

    if (!trendChart || !roadTeamSelect || !homeTeamSelect || !matchupLensSelect) return;

	const roadTeam = roadTeamTomSelect ? roadTeamTomSelect.getValue() : roadTeamSelect.value;
	const homeTeam = homeTeamTomSelect ? homeTeamTomSelect.getValue() : homeTeamSelect.value;
    const lens = matchupLensSelect.value;

    let firstTeam;
    let firstSplit;
    let firstMetric;
    let firstLabel;

    let secondTeam;
    let secondSplit;
    let secondMetric;
    let secondLabel;

    if (lens === "road") {
      firstTeam = roadTeam;
      firstSplit = "R";
      firstMetric = "sf_pct_diff";
      firstLabel = roadTeam + " Road SF%";

      secondTeam = homeTeam;
      secondSplit = "H";
      secondMetric = "sa_pct_diff";
      secondLabel = homeTeam + " Home SA%";
    } else {
      firstTeam = homeTeam;
      firstSplit = "H";
      firstMetric = "sf_pct_diff";
      firstLabel = homeTeam + " Home SF%";

      secondTeam = roadTeam;
      secondSplit = "R";
      secondMetric = "sa_pct_diff";
      secondLabel = roadTeam + " Road SA%";
    }

    const rowsForPair = trendRows
      .filter(row =>
        (row.teamAbbrev === firstTeam && row.homeRoad === firstSplit) ||
        (row.teamAbbrev === secondTeam && row.homeRoad === secondSplit)
      )
      .sort((a, b) => normalizeDate(a.predictionDate).localeCompare(normalizeDate(b.predictionDate)));

    const labels = [...new Set(rowsForPair.map(row => normalizeDate(row.predictionDate)))]
      .filter(Boolean)
      .sort();

	const selectedWindow = matchupWindowSelect ? matchupWindowSelect.value : "all";

	const displayedLabels =
	  selectedWindow === "all"
		? labels
		: labels.slice(-Number(selectedWindow));

    function valuesFor(team, split, metric) {
      const valueByDate = trendRows
        .filter(row => row.teamAbbrev === team && row.homeRoad === split)
        .reduce((acc, row) => {
          acc[normalizeDate(row.predictionDate)] = percentValue(row[metric]);
          return acc;
        }, {});

      return displayedLabels.map(date => valueByDate[date] ?? null);
    }

    trendChart.data.labels = displayedLabels;
    trendChart.data.datasets = [
      {
        label: firstLabel,
        data: valuesFor(firstTeam, firstSplit, firstMetric),
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 5
      },
      {
        label: secondLabel,
        data: valuesFor(secondTeam, secondSplit, secondMetric),
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 5
      }
    ];

    trendChart.update();

    setStatus(
      "Showing " + firstLabel + " vs " + secondLabel +
      " across " + displayedLabels.length + " slate date(s).",
      "success"
    );
  }

  function renderSparklineGrid() {
	const selectedSeason = trendSeasonSelect ? trendSeasonSelect.value : "2025-26";
	const activeRows = trendRows.filter(row => row.season === selectedSeason);

    if (!sparklineGrid || !sparklineSplitSelect || !sparklineMetricSelect || !sparklineWindowSelect) return;

    const selectedSplit = sparklineSplitSelect.value;
    const selectedMetric = sparklineMetricSelect.value;
	const selectedWindow = sparklineWindowSelect.value;

    const metricLabel =
      selectedMetric === "sf_pct_diff" ? "SF%" :
      selectedMetric === "sa_pct_diff" ? "SA%" :
      "Net";

    const teams = [...new Set(trendRows.map(row => row.teamAbbrev))]
      .filter(Boolean)
      .sort();

	const labels = [...new Set(
	  trendRows
		.filter(row => row.homeRoad === selectedSplit)
		.map(row => normalizeDate(row.predictionDate))
	)]
	  .filter(Boolean)
	  .sort();

	const displayedLabels =
	  selectedWindow === "all" ? labels : labels.slice(-Number(selectedWindow));

    sparklineGrid.innerHTML = "";

    teams.forEach(team => {
	  let teamRows = trendRows
	    .filter(row => row.teamAbbrev === team && row.homeRoad === selectedSplit)
	    .sort((a, b) => normalizeDate(a.predictionDate).localeCompare(normalizeDate(b.predictionDate)));

	  if (selectedWindow !== "all") {
	    teamRows = teamRows.slice(-Number(selectedWindow));
	  }

      if (teamRows.length === 0) return;

      const values = teamRows.map(row => {
        if (selectedMetric === "net") {
          return Number(row[selectedMetric]);
        }

        return percentValue(row[selectedMetric]);
      }).filter(value => Number.isFinite(value));

      if (values.length === 0) return;

      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const points = values.map((value, index) => {
        const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
        const y = 36 - ((value - min) / range) * 28;
        return `${x},${y}`;
      }).join(" ");

      const latestValue = values[values.length - 1];

	  const firstValue = values[0];
	  const delta = latestValue - firstValue;

	  const isPositiveMetric = selectedMetric !== "sa_pct_diff";

	  const threshold =
	    selectedMetric === "net"
		  ? 1.5
		  : 5.0;

	  let sparklineColor = "#111827";

	  if (Math.abs(delta) >= threshold) {
	    const improved = isPositiveMetric ? delta > 0 : delta < 0;

	    sparklineColor = improved ? "#16a34a" : "#dc2626";
	  }

      const card = document.createElement("div");
      card.className = "tsa-sparkline-card";

      card.innerHTML = `
        <div class="tsa-sparkline-header">
          <strong>${team}</strong>
          <span>${latestValue.toFixed(1)}${selectedMetric === "net" ? "" : "%"}</span>
        </div>
        <svg class="tsa-sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
          <polyline points="${points}" fill="none" stroke="${sparklineColor}" stroke-width="2" />
        </svg>
        <div class="tsa-sparkline-footer">
          ${selectedSplit === "R" ? "Road" : "Home"} ${metricLabel}
        </div>
      `;

      sparklineGrid.appendChild(card);
    });

	setStatus(
	  "Showing league sparklines for " +
	  (selectedSplit === "R" ? "Road" : "Home") +
	  " " + metricLabel +
	  " across " + displayedLabels.length + " slate date(s).",
	  "success"
	);
  }

  function getSelectedCompareSeasons() {
    if (compareSeasonsTomSelect) {
      return compareSeasonsTomSelect.getValue();
    }

    return Array.from(compareSeasonsSelect?.selectedOptions || [])
      .map(option => option.value);
  }


  function updateCompareSeasonChart({ selectedTeams, selectedMetric, selectedSplit, metricLabel }) {
    if (!trendChart) return;

    const selectedSeasons = getSelectedCompareSeasons();

	if (selectedTeams.length === 0 || selectedTeams.length > 2) {
	  setStatus("For season comparison, select up to two teams.", "empty");
      trendChart.data.labels = [];
      trendChart.data.datasets = [];
      trendChart.update();
      return;
    }

	const rowsForCompare = trendRows
	  .filter(row =>
		selectedSeasons.includes(row.season) &&
		selectedTeams.includes(row.teamAbbrev) &&
		row.homeRoad === selectedSplit
	  )
	  .sort((a, b) => normalizeDate(a.predictionDate).localeCompare(normalizeDate(b.predictionDate)));

    const labels = [...new Set(rowsForCompare.map(row => normalizeDate(row.predictionDate)))]
      .filter(Boolean)
      .sort();

    const selectedWindow = trendWindowSelect ? trendWindowSelect.value : "all";

    const displayedLabels =
      selectedWindow === "all"
        ? labels
        : labels.slice(-Number(selectedWindow));

    trendChart.data.labels = displayedLabels;

	trendChart.data.datasets = [];

	selectedTeams.forEach(team => {
	  selectedSeasons.forEach(season => {

		const valueByDate = rowsForCompare
		  .filter(row =>
			row.teamAbbrev === team &&
			row.season === season
		  )
		  .reduce((acc, row) => {
			acc[normalizeDate(row.predictionDate)] = percentValue(row[selectedMetric]);
			return acc;
		  }, {});

		trendChart.data.datasets.push({
		  label: team + " " + season + " " + metricLabel,
		  data: displayedLabels.map(date => valueByDate[date] ?? null),

		  borderColor:
			selectedTeams.indexOf(team) === 0
			  ? "#36A2EB"
			  : "#FF6384",

		  backgroundColor:
			selectedTeams.indexOf(team) === 0
			  ? "#36A2EB"
			  : "#FF6384",

		  borderWidth: 2,
		  tension: 0.25,
		  pointRadius: 0,
		  pointHoverRadius: 5
		});

	  });
	});

    trendChart.update();

    setStatus(
      "Comparing " + selectedTeams.join(", ") + " " +
      (selectedSplit === "R" ? "road" : "home") + " " +
      metricLabel + " across " +
      selectedSeasons.join(", ") + ".",
      "success"
    );
  }

  function updateTrendChart() {
	const selectedSeason = trendSeasonSelect ? trendSeasonSelect.value : "2025-26";
	const activeRows = trendRows.filter(row => row.season === selectedSeason);

	if (chartMode === "matchup") {
	  updateMatchupLensChart();
	  return;
	}

	if (chartMode === "sparklines") {
	  renderSparklineGrid();
	  return;
	}
    if (!trendChart || !trendTeamSelect || !trendMetricSelect || !trendSplitSelect) return;

	const selectedTeams = getSelectedTeams();
	const selectedMetric = trendMetricSelect.value;
	const selectedSplit = trendSplitSelect.value;

	const metricLabel = selectedMetric === "sf_pct_diff" ? "SF%" : "SA%";

	const seasonMode = seasonModeSelect ? seasonModeSelect.value : "single";

	if (seasonMode === "compare") {
	  updateCompareSeasonChart({
		selectedTeams,
		selectedMetric,
		selectedSplit,
		metricLabel
	  });
	  return;
	}

	const rowsForSplit = activeRows
	  .filter(row => row.homeRoad === selectedSplit)
      .sort((a, b) => normalizeDate(a.predictionDate).localeCompare(normalizeDate(b.predictionDate)));

	const labels = [...new Set(rowsForSplit.map(row => normalizeDate(row.predictionDate)))]
	  .filter(Boolean)
	  .sort();

	const selectedWindow = trendWindowSelect ? trendWindowSelect.value : "all";

	const displayedLabels =
	  selectedWindow === "all"
		? labels
		: labels.slice(-Number(selectedWindow));

    trendChart.data.labels = displayedLabels;

    trendChart.data.datasets = selectedTeams.map(team => {
      const teamRows = rowsForSplit.filter(row => row.teamAbbrev === team);

	  const valueByDate = teamRows.reduce((acc, row) => {
	    acc[normalizeDate(row.predictionDate)] = percentValue(row[selectedMetric]);
	    return acc;
	  }, {});

      return {
        label: team + " " + metricLabel,
        data: displayedLabels.map(date => valueByDate[date] ?? null),
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 5
      };
    });

    trendChart.update();

    if (selectedTeams.length === 0) {
      setStatus("Select at least one team to display trend data.", "empty");
    } else {
      setStatus(
        "Showing " + metricLabel + " trends for " +
        selectedTeams.join(", ") + " " +
        (selectedSplit === "R" ? "road" : "home") +
        " splits across " + displayedLabels.length + " slate date(s).",
        "success"
      );
    }
  }
  
  function setChartMode(mode) {
    chartMode = mode;

    if (modeTeamButton) {
      modeTeamButton.classList.toggle("active", mode === "team");
    }

    if (modeMatchupButton) {
      modeMatchupButton.classList.toggle("active", mode === "matchup");
    }

	if (modeSparklinesButton) {
	  modeSparklinesButton.classList.toggle("active", mode === "sparklines");
	}

    if (teamTrendControls) {
      teamTrendControls.style.display = mode === "team" ? "" : "none";
    }

    if (matchupLensControls) {
      matchupLensControls.style.display = mode === "matchup" ? "" : "none";
    }

	if (sparklineControls) {
	  sparklineControls.style.display = mode === "sparklines" ? "" : "none";
	}

	if (sparklineGrid) {
	  sparklineGrid.style.display = mode === "sparklines" ? "" : "none";
	}

	if (mainTrendChartWrap) {
	  mainTrendChartWrap.style.display = mode === "sparklines" ? "none" : "";
	}

	if (trendChart) {
	  trendChart.resize();
	}

    updateTrendChart();
  }

  fetch("/wp-json/tsa/v1/matchup-team-trends-all-seasons")
    .then(res => {
      if (!res.ok) {
        throw new Error("Failed to load matchup team trends.");
      }

      return res.json();
    })
    .then(rows => {
      trendRows = Array.isArray(rows) ? rows : [];

      if (trendRows.length === 0) {
        setStatus("No team trend data available.", "empty");
        return;
      }

      populateTrendTeams(trendRows);

	  compareSeasonsTomSelect = new TomSelect("#tsa-compare-seasons", {
	    plugins: ["remove_button"],
	    maxItems: 3,
	    persist: false,
	    create: false,
	    placeholder: "Select seasons...",
	    onChange: updateTrendChart
	  });

	  compareSeasonsTomSelect.setValue(["2023-24", "2024-25", "2025-26"]);

	  populateMatchupLensTeams(trendRows);
      buildTrendChart();
      updateTrendChart();
    })
    .catch(() => {
      setStatus("Failed to load team trend data.", "error");
    });

  if (trendMetricSelect) {
    trendMetricSelect.addEventListener("change", updateTrendChart);
  }

  if (trendSplitSelect) {
    trendSplitSelect.addEventListener("change", updateTrendChart);
  }
  if (modeTeamButton) {
    modeTeamButton.addEventListener("click", function () {
      setChartMode("team");
    });
  }

  if (modeMatchupButton) {
    modeMatchupButton.addEventListener("click", function () {
      setChartMode("matchup");
    });
  }

  if (modeSparklinesButton) {
    modeSparklinesButton.addEventListener("click", function () {
      setChartMode("sparklines");
    });
  }

  if (matchupLensSelect) {
    matchupLensSelect.addEventListener("change", updateTrendChart);
  }

  if (sparklineSplitSelect) {
    sparklineSplitSelect.addEventListener("change", updateTrendChart);
  }

  if (sparklineMetricSelect) {
    sparklineMetricSelect.addEventListener("change", updateTrendChart);
  }

  if (sparklineWindowSelect) {
    sparklineWindowSelect.addEventListener("change", updateTrendChart);
  }

  if (trendWindowSelect) {
    trendWindowSelect.addEventListener("change", updateTrendChart);
  }

  if (matchupWindowSelect) {
    matchupWindowSelect.addEventListener("change", updateTrendChart);
  }

  if (seasonModeSelect) {
    seasonModeSelect.addEventListener("change", function () {
      const isCompare = this.value === "compare";

      if (compareSeasonsField) {
        compareSeasonsField.style.display = isCompare ? "" : "none";
      }

      if (trendSeasonSelect) {
        trendSeasonSelect.closest(".tsa-field").style.display = isCompare ? "none" : "";
      }

	  if (trendTeamTomSelect) {
	    trendTeamTomSelect.settings.maxItems = isCompare ? 2 : 5;
	    trendTeamTomSelect.settings.mode = "multi";

	    if (isCompare) {
		  trendTeamTomSelect.control_input.placeholder = "Select up to 2 teams...";
	    } else {
		  trendTeamTomSelect.control_input.placeholder = "Select up to 5 teams...";
	    }

	    trendTeamTomSelect.refreshOptions(false);
	    updateTrendTeamPlaceholder();
	  }

      updateTrendChart();
    });
  }

    if (trendSeasonSelect) {
      trendSeasonSelect.addEventListener("change", updateTrendChart);
    }
  });