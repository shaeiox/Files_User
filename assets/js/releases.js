/**
 * @file        releases.js
 * @module      ReleasePage
 * @brief       Releases page (/download/release): el8/el9 package list and
 *              deterministic CLI download commands.
 *
 * Layout follows template/release/code.html; all data comes from
 * GET /api/releases?os=<tab> via ResourceService. Download URLs are built only
 * through ResourceService.downloadHref, so the same file always yields the same
 * command.
 *
 * Dependencies: ResourceService, getDict(), getLang()
 */
const ReleasePage = (function () {
    'use strict';

    const TABS = ["el9", "el8"];
    const LATEST = { el9: "/release9/latest", el8: "/release8/latest" };
    const LIST_LIMIT = 50; // = RELEASES_MAX_CAP on the server

    let activeOs = "el9";
    let items = [];
    let selectedPath = null;
    let requestId = 0;
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

    // Single-quoted for the shell; a literal ' in a path is percent-encoded so it
    // can never close the quote.
    function shellUrl(href) {
        return "'" + (window.location.origin + href).replace(/'/g, "%27") + "'";
    }

    function fileCommand(relPath) {
        return "curl.exe -fLO " + shellUrl(ResourceService.downloadHref(relPath));
    }

    // The filename `curl -O` writes: the download URL's last segment, as-is.
    function savedName(relPath) {
        return ResourceService.downloadHref(relPath).split("/").pop().replace(/'/g, "%27");
    }

    function verifyCommand(relPath, value) {
        return "echo '" + value + "  " + savedName(relPath) + "' | sha256sum -c -";
    }

    function hashErrorText(err) {
        const d = dict();
        if (err.code === "FILE_TOO_LARGE") return d.shaTooLarge || "This file is too large to verify.";
        if (err.code === "AUTH_REQUIRED" || err.status === 401 || err.status === 403) return d.shaForbidden || "You do not have access to this file.";
        if (err.code === "NOT_FOUND" || err.code === "NOT_HASHABLE" || err.status === 404) return d.shaUnavailable || "The file is no longer available.";
        return d.shaFailed || "The checksum could not be computed.";
    }

    /* ── Render ─────────────────────────────────────────────────────────── */

    function render(container) {
        lang = null;
        const d = dict();
        document.title = d.relPageTitle || "Releases • CloudAvid";

        container.innerHTML = `
          <div class="release-layout">
            <header class="rel-ctx">
              <h1 class="rel-title" data-i18n="relTitle">${d.relTitle}</h1>
              <p class="rel-desc" data-i18n="relDesc">${d.relDesc}</p>
            </header>

            <section class="rel-panel" aria-labelledby="relListTitle">
              <div class="rel-panel-head">
                <h2 class="rel-h2" id="relListTitle" data-i18n="relPackages">${d.relPackages}</h2>
                <div class="rel-tabs" role="tablist" aria-labelledby="relListTitle">
                  ${TABS.map(os => `
                    <button type="button" class="rel-tab" role="tab" id="rel-tab-${os}" data-os="${os}"
                      aria-controls="relBody" aria-selected="${os === activeOs}" tabindex="${os === activeOs ? 0 : -1}">${os}</button>
                  `).join("")}
                </div>
              </div>
              <div id="relBody" class="rel-body" role="tabpanel" aria-labelledby="rel-tab-${activeOs}" aria-live="polite"></div>
            </section>

            <section class="rel-panel" aria-labelledby="relCliTitle">
              <h2 class="rel-h2" id="relCliTitle" data-i18n="relCliTitle">${d.relCliTitle}</h2>
              <p class="rel-desc" data-i18n="relCliDesc">${d.relCliDesc}</p>
              <div class="rel-term">
                <pre><code id="relCmd"></code></pre>
                <button type="button" class="btn btn-sm" data-copy="relCmd" id="relCopyFile">${d.copy || "Copy"}</button>
              </div>
              <div class="rel-verify">
                <button type="button" class="btn btn-sm" id="relVerifyBtn"></button>
                <span id="relVerifyStatus" class="rel-verify-status" role="status" aria-live="polite"></span>
              </div>
              <div class="rel-term" id="relShaTerm" hidden>
                <pre><code id="relShaCmd"></code></pre>
                <button type="button" class="btn btn-sm" data-copy="relShaCmd">${d.copy || "Copy"}</button>
              </div>
              <p class="rel-desc" data-i18n="relLatestDesc">${d.relLatestDesc}</p>
              <div class="rel-term">
                <pre><code id="relLatestCmd"></code></pre>
                <button type="button" class="btn btn-sm" data-copy="relLatestCmd">${d.copy || "Copy"}</button>
              </div>
            </section>
          </div>
        `;

        bindEvents(container);
        load();
    }

    function renderBody() {
        const body = document.getElementById("relBody");
        if (!body) return;
        const d = dict();

        if (!items.length) {
            body.innerHTML = `<div class="rel-empty" role="status">${escapeHtml((d.relEmpty || "No releases in %s.").replace("%s", activeOs))}</div>`;
        } else {
            body.innerHTML = `
              <div class="rel-table-wrap">
                <table class="rel-table">
                  <thead><tr>
                    <th scope="col"><span class="sr-only">${escapeHtml(d.relSelect)}</span></th>
                    <th scope="col">${escapeHtml(d.relFile)}</th>
                    <th scope="col">${escapeHtml(d.thVersion)}</th>
                    <th scope="col" class="rel-hide-sm">${escapeHtml(d.thSize)}</th>
                    <th scope="col" class="rel-hide-sm">${escapeHtml(d.thUpdated)}</th>
                    <th scope="col"><span class="sr-only">${escapeHtml(d.thAction)}</span></th>
                  </tr></thead>
                  <tbody>
                    ${items.map((f, i) => `
                      <tr data-path="${escapeHtml(f.path)}" class="${f.path === selectedPath ? "is-selected" : ""}">
                        <td><input type="radio" name="relPick" id="relPick${i}" value="${escapeHtml(f.path)}" ${f.path === selectedPath ? "checked" : ""}></td>
                        <td><label for="relPick${i}" class="rel-name">${escapeHtml(f.name)}</label>
                          ${i === 0 ? `<span class="rel-badge">${escapeHtml(d.relLatest)}</span>` : ""}</td>
                        <td class="rel-mono">${escapeHtml(f.version || "—")}</td>
                        <td class="rel-mono rel-hide-sm">${humanSize(f.size)}</td>
                        <td class="rel-hide-sm">${fmtDate(f.mtime)}</td>
                        <td><a class="btn btn-sm" data-file href="${escapeHtml(ResourceService.downloadHref(f.path))}"
                          aria-label="${escapeHtml(d.btnDownload + " " + f.name)}">${escapeHtml(d.btnDownload)}</a></td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>`;
        }
        renderCommands();
    }

    function renderCommands() {
        const d = dict();
        const cmd = document.getElementById("relCmd");
        const latest = document.getElementById("relLatestCmd");
        if (cmd) cmd.textContent = selectedPath ? fileCommand(selectedPath) : (d.relNoSelection || "Select a package above.");
        if (latest) latest.textContent = "curl.exe -fLOJ " + shellUrl(LATEST[activeOs]);
        const copyBtn = document.getElementById("relCopyFile");
        if (copyBtn) copyBtn.disabled = !selectedPath;
        renderVerify();
    }

    function renderVerify() {
        const btn = document.getElementById("relVerifyBtn");
        const status = document.getElementById("relVerifyStatus");
        const term = document.getElementById("relShaTerm");
        if (!btn || !status || !term) return;
        const d = dict();
        const ok = digest && digest.path === selectedPath ? digest : null;
        const fail = digestError && digestError.path === selectedPath ? digestError : null;

        btn.disabled = !selectedPath || verifying;
        btn.textContent = verifying ? (d.verifying || "Verifying…") : ok ? (d.reverify || "Verify again") : (d.verify || "Verify SHA-256");
        status.classList.toggle("is-error", !!fail);
        if (ok) {
            status.innerHTML = `${escapeHtml(d.sha256 || "SHA-256 Checksum")}: <code class="rel-digest">${escapeHtml(ok.value)}</code>`;
        } else {
            status.textContent = fail ? hashErrorText(fail.err) : "";
        }
        term.hidden = !ok;
        if (ok) document.getElementById("relShaCmd").textContent = verifyCommand(ok.path, ok.value);
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

    function renderLocked() {
        const body = document.getElementById("relBody");
        if (!body) return;
        const d = dict();
        body.innerHTML = `
          <div class="locked-state">
            <div class="locked-title">${escapeHtml(d.authRequired)}</div>
            <div class="locked-desc">${escapeHtml(d.authRequiredDesc)}</div>
            <button type="button" class="btn btn-primary" id="relAuthBtn">${escapeHtml(d.btnAuth || "Authenticate to Access")}</button>
          </div>`;
        document.getElementById("relAuthBtn").addEventListener("click", () => {
            if (typeof window.triggerAuthModal === "function") window.triggerAuthModal(load);
        });
    }

    /* ── Data ───────────────────────────────────────────────────────────── */

    async function load() {
        const id = ++requestId; // drop responses from a tab the user already left
        const body = document.getElementById("relBody");
        if (body) body.setAttribute("aria-busy", "true");
        try {
            const data = await ResourceService.getReleases(LIST_LIMIT, activeOs);
            if (id !== requestId) return;
            items = data.items;
            if (!items.some(f => f.path === selectedPath)) selectedPath = items[0]?.path || null;
            renderBody();
        } catch (err) {
            if (id !== requestId) return;
            items = [];
            selectedPath = null;
            if (err.status === 401 || err.code === "AUTH_REQUIRED") renderLocked();
            else renderBody(); // missing RELEASE_PVM / FILES_ROOT degrades to the empty state
            renderCommands();
        } finally {
            if (id === requestId && body) body.removeAttribute("aria-busy");
        }
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
        load();
    }

    function bindEvents(container) {
        container.querySelector(".rel-tabs").addEventListener("click", e => {
            const tab = e.target.closest(".rel-tab");
            if (tab) selectTab(tab.dataset.os);
        });

        // WAI-ARIA tabs: arrow keys move between tabs, activation follows focus.
        container.querySelector(".rel-tabs").addEventListener("keydown", e => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
            e.preventDefault();
            const next = TABS[(TABS.indexOf(activeOs) + 1) % TABS.length];
            const target = e.key === "Home" ? TABS[0] : e.key === "End" ? TABS[TABS.length - 1] : next;
            selectTab(target);
            document.getElementById("rel-tab-" + target).focus();
        });

        container.addEventListener("change", e => {
            if (e.target.name !== "relPick") return;
            selectedPath = e.target.value;
            resetVerify();
            container.querySelectorAll(".rel-table tr[data-path]").forEach(tr =>
                tr.classList.toggle("is-selected", tr.dataset.path === selectedPath));
            renderCommands();
        });

        container.querySelector("#relVerifyBtn").addEventListener("click", verify);

        container.addEventListener("click", async e => {
            const btn = e.target.closest("[data-copy]");
            if (!btn || btn.disabled) return;
            const d = dict();
            try {
                await navigator.clipboard.writeText(document.getElementById(btn.dataset.copy).textContent);
                btn.textContent = d.copied || "Copied";
            } catch {
                btn.textContent = d.copyFailed || "Copy failed";
            }
            setTimeout(() => { btn.textContent = dict().copy || "Copy"; }, 1500);
        });
    }

    // Re-render dynamic text on language change while the page is mounted.
    document.addEventListener("i18n:changed", e => {
        lang = e.detail?.lang || null;
        if (!document.getElementById("relBody")) return;
        if (document.getElementById("relAuthBtn")) renderLocked(); else renderBody();
        renderCommands();
        document.querySelectorAll("[data-copy]").forEach(b => { b.textContent = dict().copy || "Copy"; });
    });

    return { render };
})();
