document.addEventListener("DOMContentLoaded", function () {
  console.log("NHL Model Performance JS loaded");

  const lastUpdatedBox = document.getElementById("tsa-last-updated");
  const correctPicksBox = document.getElementById("tsa-correct-picks");
  const performanceCanvas = document.getElementById("tsa-top-picks-performance-chart");
  const chartMinF1Input = document.getElementById("tsa-chart-min-f1");

  let performanceChart = null;

  function loadLastUpdated() {
    if (!lastUpdatedBox) return;

    fetch("/wp-content/uploads/tsa-data/top_picks/wp_top_picks_refresh_meta.json")
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

    const minF1 = Number(chartMinF1Input.value || 75) / 100;

    fetch("/wp-json/tsa/v1/top-picks-2plus-performance?minF1Score2Plus=" + minF1)
      .then(res => res.json())
      .then(rows => {
        const labels = rows.map(row => String(row.predictionDate).slice(0, 10));
        const values = rows.map(row => Number(row.correct_pick_pct));

        performanceChart.data.labels = labels;
        performanceChart.data.datasets[0].data = values;
        performanceChart.update();

        if (correctPicksBox && values.length > 0) {
          const latestValue = values[values.length - 1];
          correctPicksBox.textContent = latestValue.toFixed(0) + "%";
        }
      })
      .catch(() => {
        if (correctPicksBox) {
          correctPicksBox.textContent = "--";
        }
      });
  }

  if (chartMinF1Input) {
    chartMinF1Input.addEventListener("change", loadPerformanceChart);
  }

  loadLastUpdated();
  buildPerformanceChart();
  loadPerformanceChart();
});