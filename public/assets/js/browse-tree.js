/**
 * @file        browse-tree.js
 * @module      BrowseTree
 * @brief       Persistent, lazily-loaded folder tree for the Browse page
 *              (browse-split-explorer: specs/browse-explorer).
 *
 * Data contract
 * -------------
 * A folder's children are fetched only when it is first expanded or becomes the
 * current folder, through `ResourceService.listFiles(rel)`, and are kept for the
 * life of the page. `load(rel, { force })` is also what the Browse table uses for
 * its own listing, so opening a folder costs one request, shared by both panes.
 * Nothing is ever scanned recursively.
 *
 * The pane is mounted once and survives folder navigation; BrowsePage calls
 * `setCurrent(rel)` on every render. Expansion state lives in module scope, so
 * leaving /browse and returning restores it.
 */

import { BrowseIcons } from "./browse-icons.js?v=4.5.2";
import { toEntries, byFoldersThenName } from "./browse-entries.js?v=4.5.2";

const BrowseTree = (function () {
    'use strict';

    /** @type {Map<string, {status:'loading'|'ready'|'error', children:Array, promise:Promise}>} */
    const cache = new Map();
    /** Folders the user has open. '' is the root and is always open. */
    const expanded = new Set([""]);

    let treeEl = null;     // <ul role="tree">
    let scrollEl = null;   // scroll container, positioning context for the marker
    let markerEl = null;
    let current = "";
    let onActivate = () => { };
    let typeBuf = "", typeTimer = 0;

    const dict = () => (typeof window.getDict === "function" ? window.getDict() : {});
    const esc = (s) => String(s ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
    const parentOf = (rel) => rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
    const motionOk = () => typeof Motion === "undefined" || Motion.allowsMotion();

    const ICON = {
        chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
        lock: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><polyline points="21 3 21 8 16 8"/></svg>',
        rail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></svg>',
    };

    /* ── DATA ─────────────────────────────────────────────────────────────── */

    /**
     * @brief Fetches (or reuses) one folder's listing.
     * @returns {Promise<Array>} the raw listing; rejects with the service error.
     */
    function load(rel, { force = false } = {}) {
        const hit = cache.get(rel);
        // A request already in flight is as fresh as a forced one.
        if (hit && hit.status === "loading") return hit.promise;
        if (hit && !force && hit.status === "ready") return hit.promise;

        const entry = { status: "loading", children: hit ? hit.children : [], promise: null };
        entry.promise = ResourceService.listFiles(rel).then((data) => {
            if (!Array.isArray(data)) throw new Error("Bad JSON");
            entry.status = "ready";
            entry.children = toEntries(data, rel).sort(byFoldersThenName);
            if (cache.get(rel) === entry) syncNode(rel);
            return data;
        }, (err) => {
            entry.status = "error";
            if (cache.get(rel) === entry) syncNode(rel);
            throw err;
        });
        cache.set(rel, entry);
        syncNode(rel);
        return entry.promise;
    }

    /** @brief Drops `rel` and its ancestors so the next open refetches them. */
    function invalidate(rel) {
        for (let r = rel; ; r = parentOf(r)) {
            cache.delete(r);
            if (!r) break;
        }
    }

    /* ── RENDER ───────────────────────────────────────────────────────────── */

    /** @brief Builds `<li role="treeitem">` for one entry (recursing into open folders). */
    function nodeHtml(e, level, pos, size) {
        const d = dict();
        const isDir = e.type === "directory";
        const open = isDir && !e.locked && expanded.has(e.relPath);
        const label = e.name + (e.locked ? " (" + (d.lockedBadge || "Locked") + ")" : "");
        const attrs = [
            `role="treeitem"`, `class="tree-node${isDir ? " is-dir" : " is-file"}${e.locked ? " is-locked" : ""}"`,
            `data-rel="${esc(e.relPath)}"`, `data-type="${e.type}"`,
            `aria-level="${level}"`, `aria-setsize="${size}"`, `aria-posinset="${pos}"`,
            `aria-label="${esc(label)}"`, `tabindex="-1"`,
            isDir && !e.locked ? `aria-expanded="${open}"` : "",
            e.relPath === current ? `aria-current="page"` : "",
        ].join(" ");

        return `<li ${attrs}>
            <div class="tree-row" style="--lvl:${level - 1}" title="${esc(e.name)}">
              <span class="tree-chev" aria-hidden="true">${isDir && !e.locked ? ICON.chev : ""}</span>
              <span class="tree-ico">${BrowseIcons.forItem(e, 16, open)}</span>
              <span class="tree-name">${esc(e.name)}</span>
              ${e.locked ? `<span class="tree-lock" aria-hidden="true">${ICON.lock}</span>` : ""}
            </div>
            ${isDir && !e.locked ? `<div class="tree-kids"><ul role="group">${open ? kidsHtml(e.relPath, level + 1) : ""}</ul></div>` : ""}
          </li>`;
    }

    function kidsHtml(rel, level) {
        const d = dict();
        const c = cache.get(rel);
        if (!c || c.status === "loading" && !c.children.length) {
            return `<li role="none" class="tree-status" style="--lvl:${level - 1}"><span class="tree-spin" aria-hidden="true"></span><span>${esc(d.treeLoading || "Loading…")}</span></li>`;
        }
        if (c.status === "error") {
            return `<li role="none" class="tree-status is-err" style="--lvl:${level - 1}"><span>${esc(d.treeLoadError || "Couldn't load")}</span>
                <button type="button" class="tree-retry" tabindex="-1" data-retry="${esc(rel)}">${esc(d.treeRetry || "Retry")}</button></li>`;
        }
        if (!c.children.length) {
            return level === 1
                ? `<li role="none" class="tree-status">${esc(d.treeEmpty || "Nothing published yet")}</li>`
                : `<li role="none" class="tree-status is-muted" style="--lvl:${level - 1}">${esc(d.empty || "This folder is empty.")}</li>`;
        }
        const n = c.children.length;
        return c.children.map((e, i) => nodeHtml(e, level, i + 1, n)).join("");
    }

    /** @brief Full repaint, keeping the focused node and the scroll offset. */
    function paint() {
        if (!treeEl) return;
        const focused = document.activeElement && treeEl.contains(document.activeElement)
            ? document.activeElement.dataset.rel : null;
        const top = scrollEl.scrollTop;
        treeEl.innerHTML = kidsHtml("", 1);
        scrollEl.scrollTop = top;
        ensureTabStop(focused);
        if (focused) { const n = nodeFor(focused); if (n) n.focus({ preventScroll: true }); }
        placeMarker();
    }

    /** @brief Refreshes one folder's children in place after its data changed. */
    function syncNode(rel) {
        if (!treeEl) return;
        if (rel === "") { paint(); return; }
        const li = nodeFor(rel);
        if (!li || li.getAttribute("aria-expanded") !== "true") return;
        const ul = li.querySelector(":scope > .tree-kids > ul");
        const hadFocus = li.contains(document.activeElement) && document.activeElement !== li
            ? document.activeElement.dataset.rel : null;
        ul.innerHTML = kidsHtml(rel, Number(li.getAttribute("aria-level")) + 1);
        enterKids(ul);
        if (hadFocus) ensureTabStop(hadFocus);
        else ensureTabStop();
        placeMarker();
    }

    function nodeFor(rel) {
        return treeEl ? treeEl.querySelector(`[role="treeitem"][data-rel="${CSS.escape(rel)}"]`) : null;
    }

    /** @brief Children rise in, a few at a time; never for reduced motion/potato. */
    function enterKids(ul) {
        if (!motionOk() || typeof Motion === "undefined") return;
        [...ul.children].slice(0, 8).forEach((li, i) => Motion.enter(li, i));
    }

    /* ── EXPAND / COLLAPSE / CURRENT ──────────────────────────────────────── */

    function setExpanded(li, open) {
        const rel = li.dataset.rel;
        if (li.dataset.type !== "directory" || li.classList.contains("is-locked")) return;
        if ((li.getAttribute("aria-expanded") === "true") === open) return;
        if (open) expanded.add(rel); else expanded.delete(rel);
        li.setAttribute("aria-expanded", String(open));
        const ico = li.querySelector(":scope > .tree-row .tree-ico");
        if (ico) ico.innerHTML = BrowseIcons.forItem({ type: "directory", name: rel }, 16, open);
        if (open) {
            const ul = li.querySelector(":scope > .tree-kids > ul");
            ul.innerHTML = kidsHtml(rel, Number(li.getAttribute("aria-level")) + 1);
            enterKids(ul);
            load(rel).catch(() => { });
        }
        placeMarker();
    }

    /**
     * @brief Marks `rel` as the current folder: loads and opens every ancestor
     *        (root first), opens `rel`, moves the marker and scrolls it into view.
     */
    async function setCurrent(rel) {
        current = rel;
        const chain = [""];
        rel.split("/").filter(Boolean).reduce((acc, p) => { const r = acc ? acc + "/" + p : p; chain.push(r); return r; }, "");

        for (const r of chain) {
            expanded.add(r);
            try { await load(r); } catch { /* the error row says so; keep going */ }
            if (current !== rel) return; // a newer navigation took over
            if (r === "") continue; // load('') repaints the whole tree itself
            const li = nodeFor(r);
            if (li) setExpanded(li, true);
        }

        treeEl.querySelectorAll('[aria-current="page"]').forEach(n => n.removeAttribute("aria-current"));
        const li = rel ? nodeFor(rel) : null;
        if (li) {
            li.setAttribute("aria-current", "page");
            ensureTabStop(rel);
            li.querySelector(".tree-row").scrollIntoView({ block: "nearest" });
        }
        placeMarker();
    }

    /** @brief The travelling current-folder marker (the page's signature move). */
    function placeMarker() {
        if (!markerEl) return;
        const li = current ? nodeFor(current) : null;
        const row = li && li.querySelector(":scope > .tree-row");
        // Not laid out (rail, hidden pane): place it once the pane shows again.
        const hidden = !row || !row.offsetHeight || li.parentElement.closest('[aria-expanded="false"]');
        if (hidden) { markerEl.classList.remove("is-on"); return; }
        const y = row.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop;
        markerEl.style.height = row.offsetHeight + "px";
        markerEl.style.transform = `translateY(${Math.round(y)}px)`;
        // First placement must not glide in from the top of the pane.
        if (!markerEl.classList.contains("is-on")) {
            markerEl.classList.add("no-anim");
            void markerEl.offsetWidth;
            markerEl.classList.remove("no-anim");
            markerEl.classList.add("is-on");
        }
    }

    /* ── KEYBOARD (WAI-ARIA tree) ─────────────────────────────────────────── */

    /** Treeitems not hidden inside a collapsed folder, in visual order. */
    function visibleNodes() {
        return [...treeEl.querySelectorAll('[role="treeitem"]')]
            .filter(li => !li.parentElement.closest('[aria-expanded="false"]'));
    }

    /** @brief Keeps exactly one tab stop: `rel`, else the current node, else the first. */
    function ensureTabStop(rel) {
        const nodes = visibleNodes();
        const target = (rel && nodes.find(n => n.dataset.rel === rel))
            || nodes.find(n => n.dataset.rel === current) || nodes[0];
        treeEl.querySelectorAll('[role="treeitem"][tabindex="0"]').forEach(n => { n.tabIndex = -1; });
        if (target) {
            target.tabIndex = 0;
            if (rel && document.activeElement && treeEl.contains(document.activeElement) && document.activeElement !== target) target.focus();
        }
    }

    function focusNode(li) {
        if (!li) return;
        treeEl.querySelectorAll('[role="treeitem"][tabindex="0"]').forEach(n => { n.tabIndex = -1; });
        li.tabIndex = 0;
        li.focus();
        li.querySelector(".tree-row").scrollIntoView({ block: "nearest" });
    }

    function onKeydown(e) {
        const li = e.target.closest('[role="treeitem"]');
        if (!li || e.altKey || e.ctrlKey || e.metaKey) return;
        const nodes = visibleNodes();
        const i = nodes.indexOf(li);
        const rtl = document.documentElement.dir === "rtl";
        const key = rtl && e.key === "ArrowRight" ? "ArrowLeft" : rtl && e.key === "ArrowLeft" ? "ArrowRight" : e.key;
        const isOpen = li.getAttribute("aria-expanded") === "true";

        switch (key) {
            case "ArrowDown": focusNode(nodes[i + 1]); break;
            case "ArrowUp": focusNode(nodes[i - 1]); break;
            case "Home": focusNode(nodes[0]); break;
            case "End": focusNode(nodes[nodes.length - 1]); break;
            case "ArrowRight":
                if (li.hasAttribute("aria-expanded") && !isOpen) setExpanded(li, true);
                else if (isOpen) {
                    const first = li.querySelector(':scope > .tree-kids [role="treeitem"]');
                    if (first) focusNode(first);
                    else if (cache.get(li.dataset.rel)?.status === "error") load(li.dataset.rel).catch(() => { });
                }
                break;
            case "ArrowLeft":
                if (isOpen) setExpanded(li, false);
                else focusNode(li.parentElement.closest('[role="treeitem"]'));
                break;
            case "Enter": activate(li); break;
            default:
                if (e.key.length === 1 && e.key !== " ") {
                    clearTimeout(typeTimer);
                    typeBuf += e.key.toLowerCase();
                    typeTimer = setTimeout(() => { typeBuf = ""; }, 500);
                    const order = nodes.slice(i + 1).concat(nodes.slice(0, i + 1));
                    const hit = order.find(n => n.querySelector(".tree-name").textContent.toLowerCase().startsWith(typeBuf));
                    if (hit) focusNode(hit);
                    break;
                }
                return;
        }
        e.preventDefault();
    }

    /* ── POINTER ──────────────────────────────────────────────────────────── */

    function activate(li) {
        const rel = li.dataset.rel;
        const entry = {
            relPath: rel, type: li.dataset.type, locked: li.classList.contains("is-locked"),
            name: li.querySelector(".tree-name").textContent,
        };
        if (entry.type === "directory" && !entry.locked) {
            if (cache.get(rel)?.status === "error") load(rel).catch(() => { });
            setExpanded(li, true);
        }
        onActivate(entry);
    }

    function onClick(e) {
        const retry = e.target.closest("[data-retry]");
        if (retry) { load(retry.dataset.retry).catch(() => { }); return; }
        const li = e.target.closest('[role="treeitem"]');
        if (!li) return;
        focusNode(li);
        // The chevron only toggles; the label navigates.
        if (e.target.closest(".tree-chev") && li.hasAttribute("aria-expanded")) {
            setExpanded(li, li.getAttribute("aria-expanded") !== "true");
            return;
        }
        activate(li);
    }

    /* ── MOUNT ────────────────────────────────────────────────────────────── */

    /**
     * @brief Builds the pane into `host` (once per Browse shell).
     * @param {HTMLElement} host
     * @param {object} o
     * @param {(entry:object) => void} o.onActivate  folder/file activation
     * @param {() => void} o.onCollapse              rail toggle
     */
    function mount(host, o) {
        onActivate = o.onActivate;
        host.innerHTML = `
          <div class="tree-head">
            <a class="tree-title" href="/browse/" data-i18n="treeTitle">${esc(dict().treeTitle || "Folders")}</a>
            <button type="button" class="tree-btn" id="treeRefresh" title="${esc(dict().treeRefresh || "Refresh")}"
              aria-label="${esc(dict().treeRefresh || "Refresh")}" data-i18n-aria="treeRefresh">${ICON.refresh}</button>
            <button type="button" class="tree-btn tree-collapse" id="treeCollapse" aria-expanded="true" aria-controls="browseTree"
              title="${esc(dict().treeCollapse || "Collapse folders")}" aria-label="${esc(dict().treeCollapse || "Collapse folders")}">${ICON.rail}</button>
          </div>
          <!-- data-lenis-prevent: smooth scroll (Lenis) must not take this pane's wheel. -->
          <div class="tree-scroll" data-lenis-prevent>
            <span class="tree-marker" aria-hidden="true"></span>
            <ul role="tree" class="tree" id="browseTree" aria-label="${esc(dict().treeTitle || "Folders")}" data-i18n-aria="treeTitle"></ul>
          </div>`;
        treeEl = host.querySelector(".tree");
        scrollEl = host.querySelector(".tree-scroll");
        markerEl = host.querySelector(".tree-marker");

        treeEl.addEventListener("keydown", onKeydown);
        treeEl.addEventListener("click", onClick);
        host.querySelector("#treeRefresh").addEventListener("click", () => refresh());
        host.querySelector("#treeCollapse").addEventListener("click", () => o.onCollapse());
        if (typeof ResizeObserver !== "undefined") {
            const ro = new ResizeObserver(() => placeMarker());
            ro.observe(treeEl);   // rows move as folders open and close
            ro.observe(scrollEl); // the pane reappears from the rail
        }

        paintedLang = typeof window.getLang === "function" ? window.getLang() : null;
        paint();
    }

    /** @brief Refetches the current folder and its ancestors, keeping what is open. */
    function refresh() {
        invalidate(current);
        return setCurrent(current);
    }

    function onAuthChanged() {
        if (!treeEl || !treeEl.isConnected) return;
        cache.clear();
        paint();
        // What a visitor may see changed; refetch every folder that is open.
        setCurrent(current).then(() => {
            for (const r of expanded) if (!cache.has(r)) load(r).catch(() => { });
        });
    }

    // applyLang() runs on every route commit, so repaint only when the language
    // really changed; otherwise each folder hop would rebuild the tree.
    let paintedLang = null;
    function onLang(e) {
        const lang = e && e.detail && e.detail.lang;
        if (!treeEl || !treeEl.isConnected || lang === paintedLang) return;
        paintedLang = lang;
        paint();
    }

    document.addEventListener("auth:changed", onAuthChanged);
    document.addEventListener("i18n:changed", onLang);

    return { mount, load, setCurrent, refresh, invalidate, isMounted: () => !!(treeEl && treeEl.isConnected) };
})();

export { BrowseTree };