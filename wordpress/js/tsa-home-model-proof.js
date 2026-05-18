document.addEventListener("DOMContentLoaded", function () {
  const modelBox = document.getElementById("tsa-home-correct-picks-model");
  const baselineBox = document.getElementById("tsa-home-correct-picks-baseline");
  const poolBox = document.getElementById("tsa-home-qualified-pool");

  if (!modelBox && !baselineBox && !poolBox) return;

  const modelParams = new URLSearchParams({
    season: "",
    minProb2Plus: "",
    minAccuracy2Plus: "",
    minPrecision2Plus: "",
    minRecall2Plus: "",
    minF1Score2Plus: "0.75"
  });

  const baselineParams = new URLSearchParams({
    season: ""
  });

  Promise.all([
    fetch("/wp-json/tsa/v1/top-picks-2plus-performance?" + modelParams.toString()).then(res => res.json()),
    fetch("/wp-json/tsa/v1/top-picks-2plus-performance?" + baselineParams.toString()).then(res => res.json())
  ])
    .then(([modelPayload, baselinePayload]) => {
      updatePercentBox(modelBox, modelPayload.correct_pick_pct);
      updatePercentBox(baselineBox, baselinePayload.correct_pick_pct);

      if (poolBox) {
        const modelPool = Number(modelPayload.completed_picks || 0);
        const baselinePool = Number(baselinePayload.completed_picks || 0);

        if (modelPool > 0 && baselinePool > 0) {
          poolBox.textContent =
            modelPool.toLocaleString() + " / " + baselinePool.toLocaleString();
        } else if (modelPool > 0) {
          poolBox.textContent = modelPool.toLocaleString();
        } else {
          poolBox.textContent = "--";
        }
      }
    })
    .catch(() => {
      if (modelBox) modelBox.textContent = "--";
      if (baselineBox) baselineBox.textContent = "--";
      if (poolBox) poolBox.textContent = "--";
    });

  function updatePercentBox(el, value) {
    if (!el) return;

    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      el.textContent = "--";
    } else {
      el.textContent = Number(value).toFixed(0) + "%";
    }
  }
});