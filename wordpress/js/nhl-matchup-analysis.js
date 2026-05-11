document.addEventListener("DOMContentLoaded", function () {

  const statusBox = document.getElementById("tsa-status");
  const lastUpdatedBox = document.getElementById("tsa-last-updated");
  const slateMetaBox = document.getElementById("tsa-slate-meta");

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

  function addCellClass(cell, field) {
    const value = cell.getRow().getData()[field];

    if (value && typeof value === "string" && value.trim() !== "") {
      cell.getElement().classList.add(value.trim());
    }
  }
  
  const predictionDateSelect = document.getElementById("tsa-prediction-date");
  
  let matchupMetaByDate = {};

  fetch("/wp-content/uploads/tsa-data/reports/wp_matchup_refresh_meta.json")
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

      lastUpdatedBox.textContent = "Matchup analysis updated: " + formatted;
    })
    .catch(() => {
      lastUpdatedBox.textContent = "Matchup analysis updated: Unavailable";
    });

  function updateSlateMeta(predictionDate) {
    const meta = matchupMetaByDate[predictionDate];

    if (!meta) {
      slateMetaBox.textContent =
        "Slate: " + predictionDate + " | Team data used: Unavailable";
      return;
    }

    slateMetaBox.textContent =
      "Slate: " + meta.predictionDate +
	  " | Team data included: " + meta.teamDataStartDate +
	  " through " + meta.teamDataEndDate;
  }

  fetch("/wp-content/uploads/tsa-data/reports/matchup_analysis_preview_meta.json")
    .then(res => res.json())
    .then(meta => {
      const slates = meta.slates || [];

      matchupMetaByDate = slates.reduce((acc, slate) => {
        acc[slate.predictionDate] = slate;
        return acc;
      }, {});
    })
    .catch(() => {
      matchupMetaByDate = {};
    });

  const matchupTable = new Tabulator("#tsa-table", {
    ajaxURL: "/wp-json/tsa/v1/matchup-analysis",
    layout: window.innerWidth <= 768 ? "fitDataStretch" : "fitColumns",
    pagination: false,
    autoColumns: false,
	
    initialSort: [
      { column: "sortId", dir: "asc" }
    ],

	columns: [
	  {
		title: "Sort ID",
		field: "sortId",
		visible: false
	  },
	  {
		title: "Net",
		field: "road_net",
        formatter: cell => {
          addCellClass(cell, "road_net_class");
          return formatNumber(cell.getValue(), 2);
        }
      },
      {
        title: "SF%",
        field: "road_sf_pct_diff",
        formatter: cell => {
          addCellClass(cell, "road_sf_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
      {
        title: "SA%",
        field: "road_sa_pct_diff",
        formatter: cell => {
          addCellClass(cell, "road_sa_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
	  {
	    title: "Road",
	    field: "roadTeams",
	    formatter: cell => {
		  addCellClass(cell, "road_ml_class");
		  return cell.getValue();
	    }
	  },
	  {
	    title: "Road ML",
	    field: "roadML",
	    formatter: cell => {
		  addCellClass(cell, "road_ml_class");
		  return cell.getValue();
	    }
	  },

	  {
	    title: "O/U",
	    field: "overUnder",
	    formatter: cell => formatNumber(cell.getValue(), 1)
	  },

	  {
	    title: "Home ML",
	    field: "homeML",
	    formatter: cell => {
		  addCellClass(cell, "home_ml_class");
		  return cell.getValue();
	    }
	  },
	  {
	    title: "Home",
	    field: "homeTeams",
	    formatter: cell => {
		  addCellClass(cell, "home_ml_class");
		  return cell.getValue();
	    }
	  },
      {
        title: "SF%",
        field: "home_sf_pct_diff",
        formatter: cell => {
          addCellClass(cell, "home_sf_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
      {
        title: "SA%",
        field: "home_sa_pct_diff",
        formatter: cell => {
          addCellClass(cell, "home_sa_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
      {
        title: "Net",
        field: "home_net",
        formatter: cell => {
          addCellClass(cell, "home_net_class");
          return formatNumber(cell.getValue(), 2);
        }
      },
    ],

    ajaxResponse: function (url, params, response) {
      const data = Array.isArray(response) ? response : response.data || [];
	  
	  loadPredictionDateOptions(data);

      const total = data.length;

      if (total === 0) {
        setStatus("No matchup data available.", "empty");
      } else {
        setStatus("Games: " + total, "success");
      }

      return data;
    },

    ajaxError: function () {
      setStatus("Failed to load matchup data.", "error");
    }
  });
  
  function loadPredictionDateOptions(data) {
    if (!predictionDateSelect) return;

	const dates = [...new Set(
	  data.map(row => String(row.predictionDate).slice(0, 10))
	)]
      .filter(Boolean)
      .sort()
      .reverse();

    predictionDateSelect.innerHTML = "";

    dates.forEach(date => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = date;
      predictionDateSelect.appendChild(option);
    });

    if (dates.length > 0) {
      predictionDateSelect.value = dates[0];
      matchupTable.setFilter("predictionDate", "=", dates[0]);
	  updateSlateMeta(dates[0]);
    }
  }

  if (predictionDateSelect) {
    predictionDateSelect.addEventListener("change", function () {
      matchupTable.setFilter("predictionDate", "=", this.value);
      matchupTable.setSort("sortId", "asc");
	  updateSlateMeta(this.value);
    });
  }

  const resetSortButton = document.getElementById("tsa-reset-sort");

  if (resetSortButton) {
    resetSortButton.addEventListener("click", function () {
      matchupTable.setSort("sortId", "asc");
    });
  }

});