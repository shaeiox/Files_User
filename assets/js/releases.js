/**
 * @file        releases.js
 * @module      ReleasePage
 * @brief       Releases page (/download/release): latest-release lead, el8/el9
 *              package list and deterministic per-shell CLI commands.
 *
 * All data comes from GET /api/releases?os=<tab> via ResourceService; the list is
 * newest-first from the same sort /releaseN/latest uses, so items[0] is "latest".
 * Download URLs are built only through ResourceService.downloadHref, so the same
 * file and shell always yield the same command.
 *
 * Dependencies: ResourceService, getDict(), getLang()
 */
const ReleasePage = (function () {
    'use strict';

    const TABS = ["el9", "el8"];
    const LATEST = { el9: "/release9/latest", el8: "/release8/latest" };
    const SHELLS = ["posix", "pwsh"];
    const SHELL_KEY = "rel_shell";
    const LIST_LIMIT = 50; // = RELEASES_MAX_CAP on the server
    const LOADING_DELAY = 150; // ms before the placeholder shows, so fast loads don't flash

    let activeOs = "el9";
    let shell = "posix";
    let items = [];
    let status = "loading"; // loading | ok | empty | error | locked
    let selectedPath = null;
    let requestId = 0;
    let loadingTimer = 0;
    // On-demand checksum for the selected file (same rule as the File Inspector:
    // nothing is hashed until the user asks). hashId drops answers for a file the
    // user has since moved away from.
    let digest = null;       // { path, value }
    let digestError = null;  // { path, err }
    let verifying = false;
    let hashId = 0;
    // applyLang() fires "i18n:changed" before persisting the choice, so getLang()
    // is stale inside that handler; the event's detail.lang is tracked here instead.
    let lang = null;
    const dict = () => getDict(lang || getLang());

    function escapeHtml(str) {
        return String(str ?? "").replace(/[&<>'"]/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[c]));
    }

    function humanSize(b) {
        if (!Number.isFinite(b) || b < 0) return "—";
        const u = ["B", "KB", "MB", "GB", "TB"];
        const i = b === 0 ? 0 : Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
        return (b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + u[i];
    }

    function fmtDate(ts) {
        if (!ts) return "—";
        try { return new Date(ts).toLocaleDateString((lang || getLang()) === "fa" ? "fa-IR" : "en-US"); }
        catch { return "—"; }
    }

    function readShell() {
        try {
            const v = localStorage.getItem(SHELL_KEY);
            return SHELLS.includes(v) ? v : "posix";
        } catch { return "posix"; }
    }

    function readOs() {
        const v = new URLSearchParams(window.location.search).get("os");
        return TABS.includes(v) ? v : "el9";
    }

    /* ── Commands ───────────────────────────────────────────────────────── */

    // Single-quoted for both shells; a literal ' in a path is percent-encoded so
    // it can never close the quote.
    function shellUrl(href) {
        return "'" + (window.location.origin + href).replace(/'/g, "%27") + "'";
    }

    // The filename `curl -O` writes: the download URL's last segment, as-is.
    function savedName(relPath) {
        return ResourceService.downloadHref(relPath).split("/").pop().replace(/'/g, "%27");
    }

    const CURL = { posix: "curl", pwsh: "curl.exe" };

    function fileCommand(relPath) {
        return CURL[shell] + " -fLO " + shellUrl(ResourceService.downloadHref(relPath));
    }

    function latestCommand() {
        return CURL[shell] + " -fLOJ " + shellUrl(LATEST[activeOs]);
    }

    function verifyCommand(relPath, value) {
        const name = savedName(relPath);
        return shell === "pwsh"
            ? "(Get-FileHash -Algorithm SHA256 '" + name + "').Hash -eq '" + value + "'"
            : "echo '" + value + "  " + name + "' | sha256sum -c -";
    }

    function hashErrorText(err) {
        const d = dict();
        if (err.code === "FILE_TOO_LARGE") return d.shaTooLarge || "This file is too large to verify.";
        if (err.code === "AUTH_REQUIRED" || err.status === 401 || err.status === 403) return d.shaForbidden || "You do not have access to this file.";
        if (err.code === "NOT_FOUND" || err.code === "NOT_HASHABLE" || err.status === 404) return d.shaUnavailable || "The file is no longer available.";
        return d.shaFailed || "The checksum could not be computed.";
    }

    /* ── Render ─────────────────────────────────────────────────────────── */

    function term(id, extra = "") {
        return `
          <div class="rel-term" ${extra}>
            <pre><code id="${id}"></code></pre>
            <button type="button" class="rel-copy" data-copy="${id}">${escapeHtml(dict().copy || "Copy")}</button>
          </div>`;
    }

    function render(container) {
        lang = null;
        activeOs = readOs();
        shell = readShell();
        selectedPath = null;
        resetVerify();
        const d = dict();
        document.title = d.relPageTitle || "Releases • CloudAvid";

        container.innerHTML = `
          <div class="release-layout">
            <header class="rel-head">
              <div class="rel-head-text">
                <h1 class="rel-title" data-i18n="relTitle">${d.relTitle}</h1>
                <p class="rel-desc" data-i18n="relDesc">${d.relDesc}</p>
              </div>
              <div class="rel-tabs" role="tablist" aria-label="${escapeHtml(d.relOsFamily || "OS family")}">
                ${TABS.map(os => `
                  <button type="button" class="rel-tab" role="tab" id="rel-tab-${os}" data-os="${os}"
                    aria-controls="relBody" aria-selected="${os === activeOs}" tabindex="${os === activeOs ? 0 : -1}">${os}</button>
                `).join("")}
              </div>
            </header>

            <section class="rel-lead" id="relLead" aria-labelledby="relLeadTitle" hidden></section>

            <div class="rel-work">
              <section class="rel-panel rel-list" aria-labelledby="relListTitle">
                <h2 class="rel-h2" id="relListTitle" data-i18n="relPackages">${d.relPackages}</h2>
                <div id="relBody" class="rel-body" role="tabpanel" aria-labelledby="rel-tab-${activeOs}"></div>
              </section>

              <aside class="rel-panel rel-side" aria-labelledby="relCliTitle">
                <h2 class="rel-h2" id="relCliTitle" data-i18n="relCliTitle">${d.relCliTitle}</h2>
                <p class="rel-desc" data-i18n="relCliDesc">${d.relCliDesc}</p>
                <div class="rel-shell" role="radiogroup" aria-labelledby="relShellLabel">
                  <span id="relShellLabel" class="rel-shell-label" data-i18n="relShell">${d.relShell || "Shell"}</span>
                  ${SHELLS.map(s => `
                    <label class="rel-shell-opt">
                      <input type="radio" name="relShell" value="${s}" ${s === shell ? "checked" : ""}>
                      <span data-i18n="relShell_${s}">${escapeHtml(d["relShell_" + s] || s)}</span>
                    </label>`).join("")}
                </div>
                <p class="rel-selected" id="relSelected"></p>
                ${term("relCmd")}
                <div class="rel-verify">
                  <button type="button" class="rel-btn" id="relVerifyBtn"></button>
                  <span id="relVerifyStatus" class="rel-verify-status" role="status" aria-live="polite"></span>
                </div>
                ${term("relShaCmd", 'id="relShaTerm" hidden')}
              </aside>
            </div>
            <div id="relAnnounce" class="sr-only" role="status" aria-live="polite"></div>
          </div>
        `;

        bindEvents(container);
        load();
    }

    function renderLead() {
        const lead = document.getElementById("relLead");
        if (!lead) return;
        const f = status === "ok" ? items[0] : null;
        lead.hidden = !f;
        if (!f) { lead.innerHTML = ""; return; }
        const d = dict();
        lead.innerHTML = `
          <div class="rel-lead-main">
            <p class="rel-lead-version">${escapeHtml(f.version || f.name)}</p>
            <h2 class="rel-lead-label" id="relLeadTitle">${escapeHtml((d.relLeadTitle || "Latest %s release").replace("%s", activeOs))}</h2>
            <p class="rel-lead-meta"><code class="rel-name">${escapeHtml(f.name)}</code>
              <span class="rel-num">${humanSize(f.size)} · ${fmtDate(f.mtime)}</span></p>
            <a class="rel-btn rel-btn-primary" data-file href="${escapeHtml(ResourceService.downloadHref(f.path))}">
              ${escapeHtml(d.btnDownload)} ${escapeHtml(f.version || "")}</a>
          </div>
          <div class="rel-lead-cli">
            <p class="rel-desc">${escapeHtml(d.relLatestDesc)}</p>
            ${term("relLatestCmd")}
          </div>`;
        document.getElementById("relLatestCmd").textContent = latestCommand();
    }

    function renderBody() {
        const body = document.getElementById("relBody");
        if (!body) return;
        const d = dict();
        clearTimeout(loadingTimer);
        body.removeAttribute("aria-busy");

        if (status === "locked") {
            body.innerHTML = `
              <div class="rel-state">
                <p class="rel-state-title">${escapeHtml(d.authRequired)}</p>
                <p class="rel-desc">${escapeHtml(d.authRequiredDesc)}</p>
                <button type="button" class="rel-btn rel-btn-primary" id="relAuthBtn">${escapeHtml(d.btnAuth || "Authenticate to Access")}</button>
              </div>`;
            document.getElementById("relAuthBtn").addEventListener("click", () => {
                if (typeof window.triggerAuthModal === "function") window.triggerAuthModal(load);
            });
        } else if (status === "error") {
            body.innerHTML = `
              <div class="rel-state" role="alert">
                <p class="rel-state-title">${escapeHtml(d.relError || "The release list could not be loaded.")}</p>
                <button type="button" class="rel-btn" id="relRetryBtn">${escapeHtml(d.relRetry || "Try again")}</button>
              </div>`;
            document.getElementById("relRetryBtn").addEventListener("click", load);
        } else if (status === "empty") {
            body.innerHTML = `<div class="rel-state" role="status">${escapeHtml((d.relEmpty || "No releases in %s.").replace("%s", activeOs))}</div>`;
        } else if (status === "ok") {
            const cols = { size: d.thSize, date: d.thUpdated, version: d.thVersion };
            body.innerHTML = `
              <table class="rel-table">
                <caption class="sr-only">${escapeHtml(d.relPackages + " · " + activeOs)}</caption>
                <thead><tr>
                  <th scope="col"><span class="sr-only">${escapeHtml(d.relSelect)}</span></th>
                  <th scope="col">${escapeHtml(d.relFile)}</th>
                  <th scope="col">${escapeHtml(cols.version)}</th>
                  <th scope="col">${escapeHtml(cols.size)}</th>
                  <th scope="col">${escapeHtml(cols.date)}</th>
                  <th scope="col"><span class="sr-only">${escapeHtml(d.thAction)}</span></th>
                </tr></thead>
                <tbody>
                  ${items.map((f, i) => `
                    <tr data-path="${escapeHtml(f.path)}" class="${f.path === selectedPath ? "is-selected" : ""}">
                      <td class="rel-pick"><input type="radio" name="relPick" id="relPick${i}" value="${escapeHtml(f.path)}" ${f.path === selectedPath ? "checked" : ""}></td>
                      <td class="rel-file"><label for="relPick${i}"><code class="rel-name">${escapeHtml(f.name)}</code></label></td>
                      <td class="rel-num" data-label="${escapeHtml(cols.version)}">${escapeHtml(f.version || "—")}${i === 0 ? ` <span class="rel-latest">${escapeHtml(d.relLatest)}</span>` : ""}</td>
                      <td class="rel-num" data-label="${escapeHtml(cols.size)}">${humanSize(f.size)}</td>
                      <td class="rel-num" data-label="${escapeHtml(cols.date)}">${fmtDate(f.mtime)}</td>
                      <td class="rel-act"><a class="rel-btn" data-file href="${escapeHtml(ResourceService.downloadHref(f.path))}"
                        aria-label="${escapeHtml(d.btnDownload + " " + f.name)}">${escapeHtml(d.btnDownload)}</a></td>
                    </tr>`).join("")}
                </tbody>
              </table>`;
        }
    }

    function renderLoading() {
        const body = document.getElementById("relBody");
        if (!body) return;
        body.setAttribute("aria-busy", "true");
        body.innerHTML = `<div class="rel-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>`;
    }

    function renderCommands() {
        const d = dict();
        const cmd = document.getElementById("relCmd");
        const sel = document.getElementById("relSelected");
        const file = items.find(f => f.path === selectedPath);
        if (sel) sel.textContent = file ? file.name : (d.relNoSelection || "Select a package to generate its command.");
        sel?.classList.toggle("is-empty", !file);
        if (cmd) cmd.textContent = file ? fileCommand(file.path) : "";
        cmd?.closest(".rel-term").toggleAttribute("hidden", !file);
        const latest = document.getElementById("relLatestCmd");
        if (latest) latest.textContent = latestCommand();
        renderVerify();
    }

    function renderVerify() {
        const btn = document.getElementById("relVerifyBtn");
        const statusEl = document.getElementById("relVerifyStatus");
        const shaTerm = document.getElementById("relShaTerm");
        if (!btn || !statusEl || !shaTerm) return;
        const d = dict();
        const ok = digest && digest.path === selectedPath ? digest : null;
        const fail = digestError && digestError.path === selectedPath ? digestError : null;

        btn.hidden = !selectedPath;
        btn.disabled = !selectedPath || verifying;
        btn.textContent = verifying ? (d.verifying || "Verifying…") : ok ? (d.reverify || "Verify again") : (d.verify || "Verify SHA-256");
        statusEl.classList.toggle("is-error", !!fail);
        if (ok) {
            statusEl.innerHTML = `${escapeHtml(d.sha256 || "SHA-256 Checksum")}: <code class="rel-digest">${escapeHtml(ok.value)}</code>`;
        } else {
            statusEl.textContent = fail ? hashErrorText(fail.err) : "";
        }
        shaTerm.hidden = !ok;
        if (ok) document.getElementById("relShaCmd").textContent = verifyCommand(ok.path, ok.value);
    }

    function paint() {
        renderLead();
        renderBody();
        renderCommands();
    }

    // A new selection or tab abandons any in-flight hash and clears the old digest.
    function resetVerify() {
        hashId++;
        verifying = false;
        digest = null;
        digestError = null;
    }

    async function verify() {
        const path = selectedPath;
        if (!path || verifying) return;
        const id = ++hashId;
        verifying = true;
        digest = null;
        digestError = null;
        renderVerify();
        try {
            const res = await fetch(ResourceService.hashHref(path), { cache: "no-store" });
            if (!res.ok) {
                const err = new Error("HTTP " + res.status);
                err.status = res.status;
                try { err.code = (await res.json()).code || null; } catch { err.code = null; }
                throw err;
            }
            const data = await res.json();
            // Only a well-formed digest may render as a result.
            if (!data || data.algorithm !== "sha256" || !/^[0-9a-f]{64}$/.test(data.digest || "")) {
                throw new Error("Malformed checksum response");
            }
            if (id === hashId) digest = { path, value: data.digest };
        } catch (err) {
            if (id === hashId) digestError = { path, err };
        } finally {
            if (id === hashId) {
                verifying = false;
                renderVerify();
            }
        }
    }

    /* ── Data ───────────────────────────────────────────────────────────── */

    async function load() {
        const id = ++requestId; // drop responses from a tab the user already left
        status = "loading";
        clearTimeout(loadingTimer);
        loadingTimer = setTimeout(() => { if (id === requestId && status === "loading") renderLoading(); }, LOADING_DELAY);
        try {
            const data = await ResourceService.getReleases(LIST_LIMIT, activeOs);
            if (id !== requestId) return;
            items = data.items;
            status = items.length ? "ok" : "empty";
            if (!items.some(f => f.path === selectedPath)) selectedPath = items[0]?.path || null;
        } catch (err) {
            if (id !== requestId) return;
            items = [];
            selectedPath = null;
            status = err.status === 401 || err.code === "AUTH_REQUIRED" ? "locked" : "error";
        }
        paint();
    }

    /* ── Events ─────────────────────────────────────────────────────────── */

    function selectTab(os) {
        if (os === activeOs) return;
        activeOs = os;
        resetVerify();
        document.querySelectorAll(".rel-tab").forEach(t => {
            const on = t.dataset.os === os;
            t.setAttribute("aria-selected", String(on));
            t.tabIndex = on ? 0 : -1;
        });
        document.getElementById("relBody")?.setAttribute("aria-labelledby", "rel-tab-" + os);
        // replaceState keeps the router's state.path, so Back still leaves the page.
        history.replaceState(history.state, "", window.location.pathname + "?os=" + os);
        load();
    }

    function selectRow(path) {
        if (path === selectedPath) return;
        selectedPath = path;
        resetVerify();
        document.querySelectorAll(".rel-table tr[data-path]").forEach(tr => {
            const on = tr.dataset.path === path;
            tr.classList.toggle("is-selected", on);
            tr.querySelector("input").checked = on;
        });
        renderCommands();
    }

    function bindEvents(container) {
        const tabs = container.querySelector(".rel-tabs");
        tabs.addEventListener("click", e => {
            const tab = e.target.closest(".rel-tab");
            if (tab) selectTab(tab.dataset.os);
        });

        // WAI-ARIA tabs: arrow keys move between tabs, activation follows focus.
        tabs.addEventListener("keydown", e => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
            e.preventDefault();
            const next = TABS[(TABS.indexOf(activeOs) + 1) % TABS.length];
            const target = e.key === "Home" ? TABS[0] : e.key === "End" ? TABS[TABS.length - 1] : next;
            selectTab(target);
            document.getElementById("rel-tab-" + target).focus();
        });

        container.addEventListener("change", e => {
            if (e.target.name === "relPick") selectRow(e.target.value);
            if (e.target.name === "relShell" && SHELLS.includes(e.target.value)) {
                shell = e.target.value;
                try { localStorage.setItem(SHELL_KEY, shell); } catch { }
                renderCommands(); // regenerates from the kept digest; no new hash request
            }
        });

        // Whole-row selection; the radio, its label and the Download link keep their own behavior.
        container.addEventListener("click", e => {
            const tr = e.target.closest(".rel-table tr[data-path]");
            if (tr && !e.target.closest("a, input, label")) selectRow(tr.dataset.path);
        });

        container.querySelector("#relVerifyBtn").addEventListener("click", verify);

        container.addEventListener("click", async e => {
            const btn = e.target.closest("[data-copy]");
            if (!btn || btn.disabled) return;
            const d = dict();
            const live = document.getElementById("relAnnounce");
            let msg;
            try {
                await navigator.clipboard.writeText(document.getElementById(btn.dataset.copy).textContent);
                msg = d.copied || "Copied";
            } catch {
                msg = d.copyFailed || "Copy failed";
            }
            btn.textContent = msg;
            if (live) { live.textContent = ""; live.textContent = msg; }
            setTimeout(() => { btn.textContent = dict().copy || "Copy"; }, 1500);
        });
    }

    // Re-render dynamic text on language change while the page is mounted.
    document.addEventListener("i18n:changed", e => {
        lang = e.detail?.lang || null;
        if (!document.getElementById("relBody")) return;
        if (status !== "loading") paint();
        document.querySelectorAll("[data-copy]").forEach(b => { b.textContent = dict().copy || "Copy"; });
    });

    return { render };
})();
