document.addEventListener("DOMContentLoaded", function () {
  console.log("NHL Model Performance JS loaded");

  const lastUpdatedBox = document.getElementById("tsa-last-updated");
  const correctPicksBox = document.getElementById("tsa-correct-picks");
  const playerPoolBox = document.getElementById("tsa-player-pool");

  const performanceCanvas = document.getElementById("tsa-top-picks-performance-chart");
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
            label: "Correct Picks %",
            data: [],
            borderWidth: 2,
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

  function loadPerformanceChart() {
    if (!performanceChart || !chartMinF1Input) return;

	const params = new URLSearchParams({
	  minProb2Plus: getPercentParam(chartMinProbInput),
	  minAccuracy2Plus: getPercentParam(chartMinAccuracyInput),
	  minPrecision2Plus: getPercentParam(chartMinPrecisionInput),
	  minRecall2Plus: getPercentParam(chartMinRecallInput),
	  minF1Score2Plus: getPercentParam(chartMinF1Input)
	});

	fetch("/wp-json/tsa/v1/top-picks-2plus-performance?" + params.toString())
	  .then(res => res.json())
	  .then(payload => {
		const rows = payload.data || [];

		const labels = rows.map(row => String(row.predictionDate).slice(0, 10));
		const values = rows.map(row => Number(row.correct_pick_pct));

		if (playerPoolBox) {
		  playerPoolBox.textContent =
			Number(payload.completed_picks || 0).toLocaleString();
		}

		performanceChart.data.labels = labels;
		performanceChart.data.datasets[0].data = values;
		performanceChart.update();

		if (correctPicksBox) {
		  if (
			payload.correct_pick_pct === null ||
			payload.correct_pick_pct === undefined ||
			!Number.isFinite(Number(payload.correct_pick_pct))
		  ) {
			correctPicksBox.textContent = "--";
		  } else {
			correctPicksBox.textContent =
			  Number(payload.correct_pick_pct).toFixed(0) + "%";
		  }
		}
	  })
      .catch(() => {
        if (correctPicksBox) {
          correctPicksBox.textContent = "--";
        }
      });
  }

  function getPercentParam(input) {
    const value = Number(input.value);

    return Number.isFinite(value) && input.value !== ""
      ? value / 100
      : "";
  }

  [
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
  loadPerformanceChart();
});