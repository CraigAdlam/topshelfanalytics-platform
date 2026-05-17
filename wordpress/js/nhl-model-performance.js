document.addEventListener("DOMContentLoaded", function () {
  console.log("NHL Model Performance JS loaded");

  const lastUpdatedBox = document.getElementById("tsa-last-updated");
  const correctPicksBox = document.getElementById("tsa-correct-picks");
  const baselineCorrectPicksBox = document.getElementById("tsa-correct-picks-baseline");
  const playerPoolBox = document.getElementById("tsa-player-pool");

  const performanceCanvas = document.getElementById("tsa-top-picks-performance-chart");
  const chartSeasonSelect = document.getElementById("tsa-chart-season");
  const chartMinProbInput = document.getElementById("tsa-chart-min-prob");
  const chartMinAccuracyInput = document.getElementById("tsa-chart-min-accuracy");
  const chartMinPrecisionInput = document.getElementById("tsa-chart-min-precision");
  const chartMinRecallInput = document.getElementById("tsa-chart-min-recall");
  const chartMinF1Input = document.getElementById("tsa-chart-min-f1");
  const chartResetButton = document.getElementById("tsa-chart-reset");

  let performanceChart = null;

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

        lastUpdatedBox.textContent = "Top picks updated: " + formatted;
      })
      .catch(() => {
        lastUpdatedBox.textContent = "Top picks updated: Unavailable";
      });
  }

  function buildPerformanceChart() {
    if (!performanceCanvas || !window.Chart) return;

    performanceChart = new Chart(performanceCanvas, {
      type: "line",
      data: {
        labels: [],
		datasets: [
		  {
			label: "Qualified Model Picks",
			data: [],
			borderWidth: 2,
			tension: 0.25,
			pointRadius: 0,
			pointHoverRadius: 5
		  },
		  {
			label: "Raw Baseline",
			data: [],
			borderWidth: 2,
			borderDash: [6, 4],
			tension: 0.25,
			pointRadius: 0,
			pointHoverRadius: 5
		  }
		]
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
            min: 0,
            max: 100,
            ticks: {
              callback: value => value + "%"
            },
            title: {
              display: true,
              text: "Correct Picks"
            }
          },
          x: {
            title: {
              display: true,
              text: "Prediction Date"
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: context => {
                return "Correct Picks: " + context.parsed.y.toFixed(1) + "%";
              }
            }
          }
        }
      }
    });
  }

  function loadSeasonOptions() {
    if (!chartSeasonSelect) return;

    fetch("/wp-json/tsa/v1/top-picks-2plus-meta")
      .then(res => res.json())
      .then(meta => {
        chartSeasonSelect.innerHTML = "";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "All Seasons";
        chartSeasonSelect.appendChild(defaultOption);

        (meta.seasons || []).forEach(season => {
          if (!season) return;

          const option = document.createElement("option");
          option.value = season;
          option.textContent = season;
          chartSeasonSelect.appendChild(option);
        });
      });
  }

  function loadPerformanceChart() {
    if (!performanceChart || !chartMinF1Input) return;

    const selectedParams = new URLSearchParams({
      season: chartSeasonSelect ? chartSeasonSelect.value : "",
      minProb2Plus: getPercentParam(chartMinProbInput),
      minAccuracy2Plus: getPercentParam(chartMinAccuracyInput),
      minPrecision2Plus: getPercentParam(chartMinPrecisionInput),
      minRecall2Plus: getPercentParam(chartMinRecallInput),
      minF1Score2Plus: getPercentParam(chartMinF1Input)
    });

    const baselineParams = new URLSearchParams({
      season: chartSeasonSelect ? chartSeasonSelect.value : ""
    });

    Promise.all([
      fetch("/wp-json/tsa/v1/top-picks-2plus-performance?" + selectedParams.toString()).then(res => res.json()),
      fetch("/wp-json/tsa/v1/top-picks-2plus-performance?" + baselineParams.toString()).then(res => res.json())
    ])
      .then(([selectedPayload, baselinePayload]) => {
        const selectedRows = selectedPayload.data || [];
        const baselineRows = baselinePayload.data || [];

        const allLabels = Array.from(new Set([
          ...selectedRows.map(row => String(row.predictionDate).slice(0, 10)),
          ...baselineRows.map(row => String(row.predictionDate).slice(0, 10))
        ])).sort();

        const selectedMap = new Map(
          selectedRows.map(row => [
            String(row.predictionDate).slice(0, 10),
            Number(row.correct_pick_pct)
          ])
        );

        const baselineMap = new Map(
          baselineRows.map(row => [
            String(row.predictionDate).slice(0, 10),
            Number(row.correct_pick_pct)
          ])
        );

        performanceChart.data.labels = allLabels;
        performanceChart.data.datasets[0].data = allLabels.map(date =>
          selectedMap.has(date) ? selectedMap.get(date) : null
        );

        performanceChart.data.datasets[1].data = allLabels.map(date =>
          baselineMap.has(date) ? baselineMap.get(date) : null
        );

        performanceChart.update();

        if (playerPoolBox) {
          playerPoolBox.textContent =
            Number(selectedPayload.completed_picks || 0).toLocaleString();
        }

        if (correctPicksBox) {
          if (
            selectedPayload.correct_pick_pct === null ||
            selectedPayload.correct_pick_pct === undefined ||
            !Number.isFinite(Number(selectedPayload.correct_pick_pct))
          ) {
            correctPicksBox.textContent = "--";
          } else {
            correctPicksBox.textContent =
              Number(selectedPayload.correct_pick_pct).toFixed(0) + "%";
          }
        }

		if (baselineCorrectPicksBox) {
		  if (
			baselinePayload.correct_pick_pct === null ||
			baselinePayload.correct_pick_pct === undefined ||
			!Number.isFinite(Number(baselinePayload.correct_pick_pct))
		  ) {
			baselineCorrectPicksBox.textContent = "--";
		  } else {
			baselineCorrectPicksBox.textContent =
			  Number(baselinePayload.correct_pick_pct).toFixed(0) + "%";
		  }
		}
      })
      .catch(() => {
        if (correctPicksBox) correctPicksBox.textContent = "--";
        if (playerPoolBox) playerPoolBox.textContent = "--";
      });
  }

  function getPercentParam(input) {
    const value = Number(input.value);

    return Number.isFinite(value) && input.value !== ""
      ? value / 100
      : "";
  }

  [
	chartSeasonSelect,
	chartMinProbInput,
    chartMinAccuracyInput,
    chartMinPrecisionInput,
    chartMinRecallInput,
    chartMinF1Input
  ].forEach(el => {
    if (el) {
      el.addEventListener("change", loadPerformanceChart);
    }
  });

  if (chartResetButton) {
    chartResetButton.addEventListener("click", function () {
	  if (chartSeasonSelect) chartSeasonSelect.value = "";
      chartMinProbInput.value = "";
      chartMinAccuracyInput.value = "";
      chartMinPrecisionInput.value = "";
      chartMinRecallInput.value = "";
      chartMinF1Input.value = "";

      loadPerformanceChart();
    });
  }

  loadLastUpdated();
  buildPerformanceChart();
  loadSeasonOptions();
  loadPerformanceChart();
});