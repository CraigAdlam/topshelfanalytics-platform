document.addEventListener("DOMContentLoaded", function () {
  console.log("NHL Top Combos Performance JS loaded");

  const lastUpdatedBox = document.getElementById("tsa-last-updated");
  const correctCombosBox = document.getElementById("tsa-correct-combos");
  const comboPoolBox = document.getElementById("tsa-combo-pool");

  const performanceCanvas = document.getElementById("tsa-top-combos-performance-chart");

  const chartMinProbInput = document.getElementById("tsa-chart-min-prob");
  const chartMinAccuracyInput = document.getElementById("tsa-chart-min-accuracy");
  const chartMinPrecisionInput = document.getElementById("tsa-chart-min-precision");
  const chartMinRecallInput = document.getElementById("tsa-chart-min-recall");
  const chartMinF1Input = document.getElementById("tsa-chart-min-f1");
  const chartMinLegEVInput = document.getElementById("tsa-chart-min-leg-ev");
  const chartMinComboEVInput = document.getElementById("tsa-chart-min-combo-ev");
  const chartMinWinProbInput = document.getElementById("tsa-chart-min-win-prob");
  const chartResetButton = document.getElementById("tsa-chart-reset");

  let performanceChart = null;

  function getPercentParam(input) {
    const value = Number(input.value);

    return Number.isFinite(value) && input.value !== ""
      ? value / 100
      : "";
  }

  function getDecimalParam(input) {
    const value = Number(input.value);

    return Number.isFinite(value) && input.value !== ""
      ? value
      : "";
  }

  function loadLastUpdated() {
    if (!lastUpdatedBox) return;

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

        lastUpdatedBox.textContent = "Top combinations updated: " + formatted;
      })
      .catch(() => {
        lastUpdatedBox.textContent = "Top combinations updated: Unavailable";
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
            label: "Correct Combinations %",
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
              text: "Correct Combinations"
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
                return "Correct Combinations: " + context.parsed.y.toFixed(1) + "%";
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
      minPredProb2Plus: getPercentParam(chartMinProbInput),
      minAccuracy2Plus: getPercentParam(chartMinAccuracyInput),
      minPrecision2Plus: getPercentParam(chartMinPrecisionInput),
      minRecall2Plus: getPercentParam(chartMinRecallInput),
      minF1Score2Plus: getPercentParam(chartMinF1Input),
      minLegEV2Plus: getDecimalParam(chartMinLegEVInput),
      minEV: getDecimalParam(chartMinComboEVInput),
      minWinProb: getPercentParam(chartMinWinProbInput)
    });

    fetch("/wp-json/tsa/v1/top-combos-2plus-performance?" + params.toString())
      .then(res => res.json())
      .then(rows => {
        const labels = rows.map(row => String(row.predictionDate).slice(0, 10));
        const values = rows.map(row => Number(row.correct_combos_pct));

        const totalPool = rows.reduce((sum, row) => {
          return sum + Number(row.completed_combos || 0);
        }, 0);

        if (comboPoolBox) {
          comboPoolBox.textContent = totalPool.toLocaleString();
        }

        performanceChart.data.labels = labels;
        performanceChart.data.datasets[0].data = values;
        performanceChart.update();

		if (correctCombosBox && rows.length > 0) {
		  const totalCompleted = rows.reduce((sum, row) => {
			return sum + Number(row.completed_combos || 0);
		  }, 0);

		  const totalCorrect = rows.reduce((sum, row) => {
			return sum + Number(row.correct_combos || 0);
		  }, 0);

		  if (totalCompleted > 0) {
			const overallPct = (totalCorrect / totalCompleted) * 100;
			correctCombosBox.textContent = overallPct.toFixed(0) + "%";
		  } else {
			correctCombosBox.textContent = "--";
		  }
		} else if (correctCombosBox) {
		  correctCombosBox.textContent = "--";
		}
      })
      .catch(() => {
        if (correctCombosBox) {
          correctCombosBox.textContent = "--";
        }
      });
  }

  [
    chartMinProbInput,
    chartMinAccuracyInput,
    chartMinPrecisionInput,
    chartMinRecallInput,
    chartMinF1Input,
    chartMinLegEVInput,
    chartMinComboEVInput,
    chartMinWinProbInput
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
      chartMinLegEVInput.value = "";
      chartMinComboEVInput.value = "";
      chartMinWinProbInput.value = "";

      loadPerformanceChart();
    });
  }

  loadLastUpdated();
  buildPerformanceChart();
  loadPerformanceChart();
});