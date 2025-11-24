    // === CONFIG ===
    const BTC_ADDRESS = "bc1qa38m29hprs809kxnddsd03jwlq7p6sru7saw06";
    const API_URL =
      "https://solopooldash.jesf777.workers.dev/ckpool/" + BTC_ADDRESS;
    const BTC_DIFF_URL =
      "https://solopooldash.jesf777.workers.dev/difficulty/btc";
    const BCH_DIFF_URL =
      "https://solopooldash.jesf777.workers.dev/difficulty/bch";

    const REFRESH_INTERVAL_MS = 30000;

    document.getElementById("address").textContent = BTC_ADDRESS;

    function formatTimestamp(ts) {
      if (!ts) return "N/A";
      const d = new Date(ts * 1000);
      return d.toLocaleString();
    }

    function timeSince(ts) {
      if (!ts) return "N/A";
      const seconds = Math.floor(Date.now() / 1000) - ts;
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }

 // Turn big numbers into mining-style units: K, M, G, T, P, E
function formatMiningNumber(value) {
  if (value == null) return "N/A";
  const v = Number(value);
  if (!Number.isFinite(v)) return "N/A";

  const abs = Math.abs(v);
  let unit = "";
  let divisor = 1;

  if (abs >= 1e18) {
    unit = "E";
    divisor = 1e18;
  } else if (abs >= 1e15) {
    unit = "P";
    divisor = 1e15;
  } else if (abs >= 1e12) {
    unit = "T";
    divisor = 1e12;
  } else if (abs >= 1e9) {
    unit = "G";
    divisor = 1e9;
  } else if (abs >= 1e6) {
    unit = "M";
    divisor = 1e6;
  } else if (abs >= 1e3) {
    unit = "K";
    divisor = 1e3;
  }

  const short = (v / divisor)
    .toFixed(divisor === 1 ? 0 : 3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");

  return short + unit;
}


    // Generic card builder with optional green progress bar
    function createCard(title, value, subtitle = "", progress = null) {
      const div = document.createElement("div");
      div.className =
        "bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex flex-col gap-1";

      let progressHtml = "";
      if (progress && typeof progress.fraction === "number") {
        const pct = Math.max(0, Math.min(1, progress.fraction)) * 100;
        const colorClass = progress.colorClass || "bg-emerald-500";
        const labelHtml = progress.label
          ? `<p class="text-[11px] text-slate-400 mb-1">${progress.label}</p>`
          : "";
        progressHtml = `
          <div class="mt-3">
            ${labelHtml}
            <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div class="${colorClass} h-full" style="width:${pct}%;"></div>
            </div>
          </div>
        `;
      }

      div.innerHTML = `
        <p class="text-xs uppercase tracking-wide text-slate-400">${title}</p>
        <p class="text-xl font-semibold">${value}</p>
        ${
          subtitle
            ? `<p class="text-xs text-slate-400">${subtitle}</p>`
            : ""
        }
        ${progressHtml}
      `;
      return div;
    }

    async function loadStats() {
      const statusEl = document.getElementById("status");
      const difficultyEl = document.getElementById("difficulty-cards");
      const shareEl = document.getElementById("share-cards");
      const hashrateEl = document.getElementById("hashrate-cards");
      const workersEl = document.getElementById("workers");

      statusEl.textContent = "Loading latest stats…";

      try {
        const [statsRes, btcDiffRes, bchDiffRes] = await Promise.all([
          fetch(API_URL),
          fetch(BTC_DIFF_URL).catch(() => null),
          fetch(BCH_DIFF_URL).catch(() => null),
        ]);

        if (!statsRes.ok) throw new Error(`CKPool HTTP ${statsRes.status}`);

        const data = await statsRes.json();
        const btcDiffData =
          btcDiffRes && btcDiffRes.ok ? await btcDiffRes.json() : null;
        const bchDiffData =
          bchDiffRes && bchDiffRes.ok ? await bchDiffRes.json() : null;

        const btcDifficulty = btcDiffData?.difficulty || null;
        const bchDifficulty = bchDiffData?.difficulty || null;

        statusEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

        // Clear containers
        difficultyEl.innerHTML = "";
        shareEl.innerHTML = "";
        hashrateEl.innerHTML = "";
        workersEl.innerHTML = "";

        const bestShareSession = Number(data.bestshare) || 0;
        const bestShareAllTime = Number(data.bestever) || 0;

// === DIFFICULTY ROW ===
if (btcDifficulty) {
  difficultyEl.appendChild(
    createCard(
      "BTC Difficulty",
      formatMiningNumber(btcDifficulty),
      `Raw: ${btcDifficulty.toLocaleString()}`
    )
  );
}

if (bchDifficulty) {
  difficultyEl.appendChild(
    createCard(
      "BCH Difficulty",
      formatMiningNumber(bchDifficulty),
      `Raw: ${bchDifficulty.toLocaleString()}`
    )
  );
}


        // === SHARES ROW ===

        // 1) Current session vs all-time best (green bar)
        let sessionFraction = 0;
        if (bestShareAllTime > 0) {
          sessionFraction = bestShareSession / bestShareAllTime;
        }

        shareEl.appendChild(
          createCard(
            "Best Share (Current Session)",
            formatShare(bestShareSession),
            `Raw: ${bestShareSession.toLocaleString()}`,
            bestShareAllTime
              ? {
                  fraction: sessionFraction,
                  label: `${(sessionFraction * 100).toFixed(
                    2
                  )}% of your all-time best`,
                  colorClass: "bg-emerald-500",
                }
              : null
          )
        );

        // 2) All-time best vs BTC difficulty (green bar)
        let diffFraction = 0;
        let diffLabel = "";
        if (btcDifficulty && bestShareAllTime > 0) {
          diffFraction = bestShareAllTime / btcDifficulty;
          diffLabel = `${(diffFraction * 100).toPrecision(
            3
          )}% of BTC difficulty`;
        }

        shareEl.appendChild(
          createCard(
            "Best Share (All Time)",
            formatShare(bestShareAllTime),
            `Raw: ${bestShareAllTime.toLocaleString()}`,
            btcDifficulty
              ? {
                  fraction: diffFraction,
                  label: diffLabel,
                  colorClass: "bg-emerald-500",
                }
              : null
          )
        );

        // 3) Total shares
        shareEl.appendChild(
          createCard(
            "Total Shares",
            data.shares.toLocaleString(),
            `Workers: ${data.workers}`
          )
        );

        // === HASHRATE (1m, 1d, 7d only) ===
        const hrLabels = {
          hashrate1m: "1 min",
          hashrate1d: "1 day",
          hashrate7d: "7 days",
        };

        Object.entries(hrLabels).forEach(([field, label]) => {
          const val = data[field];
          if (!val) return;
          hashrateEl.appendChild(
            createCard(label, val, "reported by CKPool")
          );
        });

        // === WORKERS ===
        if (Array.isArray(data.worker)) {
          data.worker.forEach((w) => {
            const card = document.createElement("div");
            card.className =
              "bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex flex-col gap-2";

            card.innerHTML = `
              <p class="text-xs uppercase tracking-wide text-slate-400">Worker</p>
              <p class="font-mono text-sm break-all">${w.workername}</p>

              <div class="grid grid-cols-2 gap-2 text-sm mt-2">
                <div>
                  <p class="text-xs text-slate-400">1m</p>
                  <p class="font-semibold">${w.hashrate1m}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">1d</p>
                  <p class="font-semibold">${w.hashrate1d}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">7d</p>
                  <p class="font-semibold">${data.hashrate7d || "—"}</p>
                </div>
              </div>

              <div class="mt-3 text-xs text-slate-400">
                <p>Last share: <span class="text-slate-200">
                  ${timeSince(w.lastshare)} (${formatTimestamp(w.lastshare)})
                </span></p>
                <p>Session shares: <span class="text-slate-200">
                  ${w.shares.toLocaleString()}
                </span></p>
                <p>Best share: <span class="text-slate-200">
                  ${w.bestshare.toLocaleString()}
                </span></p>
              </div>
            `;

            workersEl.appendChild(card);
          });
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent =
          "Error loading stats (maybe CORS, network, or diff API). Check console.";
      }
    }

    loadStats();
    setInterval(loadStats, REFRESH_INTERVAL_MS);
