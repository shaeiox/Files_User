// home.js — Home page logic (global search)
(function () {
    'use strict';

    const rootsToScan = ["/download/download-User/", "/download/download-Avid/"];

    const resultsBox = document.getElementById("resultsBox");
    const resultsList = document.getElementById("resultsList");
    const resultsTitle = document.getElementById("resultsTitle");
    const progressEl = document.getElementById("progress");
    const qInput = document.getElementById("globalSearch");
    const searchBtn = document.getElementById("searchBtn");
    const stopBtn = document.getElementById("stopBtn");

    let stopFlag = false;

    function isHidden(n) {
        const l = (n || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
    }

    function clearResults() {
        resultsList.innerHTML = "";
        resultsBox.style.display = "none";
        progressEl.textContent = "";
    }

    function addResult(item) {
        const row = document.createElement("div");
        row.className = "res-row";
        row.innerHTML = `
      <div class="res-info">
        <a href="${item.href}" title="${item.name}">${item.name}</a>
        <span class="res-path">${item.href}</span>
      </div>
      <div>
        <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
          ${item.type === 'directory' ? 'DIR' : 'FILE'}
        </span>
      </div>`;
        resultsList.appendChild(row);
    }

    async function listDir(path) {
        const r = await fetch("/__list" + path, { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const d = await r.json();
        if (!Array.isArray(d)) throw new Error("Bad JSON");
        return d;
    }

    async function scanAll(query) {
        stopFlag = false;
        resultsList.innerHTML = "";
        resultsBox.style.display = "block";

        const d = getDict();
        resultsTitle.textContent = d.results;
        progressEl.textContent = d.scanning;
        stopBtn.style.display = "inline-flex";
        searchBtn.disabled = true;
        qInput.disabled = true;

        const q = query.trim().toLowerCase();
        const maxResults = 200;
        let found = 0;
        const queue = [...rootsToScan];
        let scanned = 0;

        while (queue.length) {
            if (stopFlag) break;
            const dir = queue.shift();
            scanned++;

            try {
                const entries = await listDir(dir);
                for (const e of entries) {
                    if (stopFlag) break;
                    if (!e || !e.name || e.name === "." || e.name === "..") continue;
                    if (isHidden(e.name)) continue;

                    const type = e.type === "directory" ? "directory" : "file";
                    const href = dir + e.name + (type === "directory" ? "/" : "");

                    if (type === "directory") queue.push(href);

                    if (!q || e.name.toLowerCase().includes(q)) {
                        addResult({ name: e.name, href, type });
                        found++;
                        if (found >= maxResults) { stopFlag = true; break; }
                    }
                }
            } catch (err) {
                console.warn("scan error:", dir, err);
            }

            progressEl.textContent = `${d.scanning} ${scanned}`;
        }

        progressEl.textContent = d.done + ` · ${found}`;
        stopBtn.style.display = "none";
        searchBtn.disabled = false;
        qInput.disabled = false;
    }

    // Keyboard shortcuts
    window.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            qInput.focus();
        }
    });

    searchBtn.addEventListener("click", () => scanAll(qInput.value || ""));
    stopBtn.addEventListener("click", () => { stopFlag = true; });
    qInput.addEventListener("keydown", e => {
        if (e.key === "Enter") scanAll(qInput.value || "");
        if (e.key === "Escape") clearResults();
    });

    // Language
    applyLang(getLang());
    document.title = getDict().pageTitle;

    document.getElementById("langBtn").addEventListener("click", () => {
        const next = getLang() === "en" ? "fa" : "en";
        applyLang(next);
        document.title = getDict().pageTitle;
    });
})();