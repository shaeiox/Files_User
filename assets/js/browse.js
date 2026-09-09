// browse.js — File browser logic
(function () {
    'use strict';

    const rowsEl = document.getElementById("rows");
    const emptyEl = document.getElementById("empty");
    const searchEl = document.getElementById("search-input");
    const tableEl = document.getElementById("tableContainer");
    let allFiles = [];

    // ── Helpers ──
    function isHidden(n) {
        const l = (n || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
    }

    function humanSize(b, lang) {
        if (!Number.isFinite(b) || b < 0) return "—";
        if (b === 0) return lang === "fa" ? "0 بایت" : "0 B";
        const k = 1024;
        const u = lang === "fa" ? ["بایت", "KB", "MB", "GB", "TB"] : ["B", "KB", "MB", "GB", "TB"];
        const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), u.length - 1);
        return (b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + " " + u[i];
    }

    function fmtDate(ts, lang) {
        if (!ts) return "—";
        try {
            const d = new Date(ts);
            const l = lang === "fa" ? "fa-IR" : "en-US";
            return d.toLocaleDateString(l) + " " + d.toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" });
        } catch { return "—"; }
    }

    function svgIcon(type) {
        return type === "directory"
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>`;
    }

    // ── Path ──
    function getPath() {
        let p = window.location.pathname;
        if (!p.endsWith("/")) p += "/";
        return p;
    }

    function buildCrumbs(path) {
        const d = getDict();
        const el = document.getElementById("breadcrumb");
        el.innerHTML = "";

        const home = document.createElement("a");
        home.href = "/";
        home.className = "crumb";
        home.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>${d.root}</span>`;
        el.appendChild(home);

        const parts = path.split("/").filter(Boolean);
        let acc = "";

        parts.forEach((part, i) => {
            acc += "/" + part;

            const sep = document.createElement("span");
            sep.className = "crumb-sep";
            sep.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
            el.appendChild(sep);

            if (i === parts.length - 1) {
                const cur = document.createElement("span");
                cur.className = "crumb crumb-active";
                cur.textContent = decodeURIComponent(part);
                el.appendChild(cur);
                document.getElementById("folderName").textContent = decodeURIComponent(part);
            } else {
                const link = document.createElement("a");
                link.href = acc + "/";
                link.className = "crumb";
                link.textContent = decodeURIComponent(part);
                el.appendChild(link);
            }
        });

        if (!parts.length) document.getElementById("folderName").textContent = d.root;
    }

    // ── Display ──
    function showEmpty(msg, isErr) {
        emptyEl.style.display = "flex";
        emptyEl.innerHTML = `
      <div class="empty-circle${isErr ? ' err' : ''}">
        ${isErr
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`
            }
      </div>
      <div class="empty-text">${msg}</div>`;
    }

    function hideEmpty() { emptyEl.style.display = "none"; }

    function render(files) {
        const lang = getLang();
        const d = getDict();
        allFiles = files;
        rowsEl.innerHTML = "";

        files.sort((a, b) => {
            if (a.type === "directory" && b.type !== "directory") return -1;
            if (a.type !== "directory" && b.type === "directory") return 1;
            return a.name.localeCompare(b.name);
        });

        const dirs = files.filter(f => f.type === "directory").length;
        document.getElementById("folderCount").textContent = dirs;
        document.getElementById("fileCount").textContent = files.length - dirs;

        if (!files.length) { showEmpty(d.empty); return; }
        hideEmpty();

        const base = getPath();
        const frag = document.createDocumentFragment();

        files.forEach((f, idx) => {
            const href = base + f.name + (f.type === "directory" ? "/" : "");
            const row = document.createElement("div");
            row.className = "trow";
            row.dataset.name = f.name.toLowerCase();
            row.style.animationDelay = Math.min(idx * 30, 300) + "ms";
            row.classList.add("anim-fade-up");

            row.innerHTML = `
        <div class="f-icon ${f.type === 'directory' ? 'f-icon-dir' : 'f-icon-file'}">${svgIcon(f.type)}</div>
        <div class="f-name"><a class="f-link" href="${href}" title="${f.name}">${f.name}</a></div>
        <div><span class="badge ${f.type === 'directory' ? 'badge-dir' : 'badge-file'}">${f.type === 'directory' ? d.folder : d.file}</span></div>
        <div class="f-sub">${fmtDate(f.modified, lang)}</div>
        <div class="f-sub">${f.type === 'directory' ? '—' : humanSize(f.size, lang)}</div>`;

            frag.appendChild(row);
        });

        rowsEl.appendChild(frag);
        filterRows();
    }

    function filterRows() {
        const d = getDict();
        const q = (searchEl.value || "").trim().toLowerCase();
        const rows = rowsEl.querySelectorAll(".trow");
        let shown = 0;

        rows.forEach(r => {
            const ok = !q || (r.dataset.name || "").includes(q);
            r.style.display = ok ? "" : "none";
            if (ok) shown++;
        });

        if (!shown && rows.length) showEmpty(q ? d.emptySearch : d.empty);
        else if (shown) hideEmpty();
    }

    async function fetchList() {
        const path = getPath();
        try {
            const r = await fetch("/__list" + path, { cache: "no-store" });
            if (!r.ok) throw new Error("HTTP " + r.status);
            const data = await r.json();
            if (!Array.isArray(data)) throw new Error("Bad JSON");

            const items = data
                .filter(x => x && x.name && x.name !== "." && x.name !== "..")
                .filter(x => !isHidden(x.name))
                .map(x => ({
                    name: String(x.name),
                    type: x.type === "directory" ? "directory" : "file",
                    size: Number(x.size || 0),
                    modified: x.mtime || x.modified || x.time || ""
                }));

            render(items);
        } catch (e) {
            console.error(e);
            const d = getDict();
            showEmpty(`<strong>${d.loadErrTitle}</strong><div style="margin-top:8px">${d.loadErrHint}</div><div style="margin-top:12px"><kbd>/__list${getPath()}</kbd></div>`, true);
        }
    }

    // ── View toggle ──
    const listBtn = document.getElementById("viewList");
    const gridBtn = document.getElementById("viewGrid");

    listBtn.addEventListener("click", () => {
        tableEl.classList.remove("grid-mode");
        listBtn.classList.add("active");
        gridBtn.classList.remove("active");
        localStorage.setItem("view_mode", "list");
    });

    gridBtn.addEventListener("click", () => {
        tableEl.classList.add("grid-mode");
        gridBtn.classList.add("active");
        listBtn.classList.remove("active");
        localStorage.setItem("view_mode", "grid");
    });

    if (localStorage.getItem("view_mode") === "grid") gridBtn.click();

    // ── Keyboard ──
    window.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            searchEl.focus();
        }
    });

    searchEl.addEventListener("input", filterRows);

    // ── Init ──
    applyLang(getLang());
    document.title = getDict().browseTitle;
    buildCrumbs(getPath());

    document.getElementById("langBtn").addEventListener("click", () => {
        const next = getLang() === "en" ? "fa" : "en";
        applyLang(next);
        document.title = getDict().browseTitle;
        buildCrumbs(getPath());
        render(allFiles);
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fetchList);
    } else {
        fetchList();
    }
})();