/* ═══════════════════════════════════════════════
   autocomplete.js — Smart Search Autocomplete Engine
   ═══════════════════════════════════════════════ */

const Autocomplete = (function () {
    'use strict';

    const rootsToPreCache = [
        "/download/download-User/",
        "/download/download-Avid/",
        "/download/download-User/Template/",
        "/download/download-User/ISO/",
        "/download/download-User/Sandbox/",
        "/download/download-User/LogDB/",
        "/download/download-User/imageClone/",
        "/download/download-User/Documents/",
        "/download/download-User/files/"
    ];

    let cache = []; // Cached file/folder index
    let activeIndex = -1;
    let matches = [];
    let dropdownEl = null;
    let inputEl = null;
    let debounceTimer = null;

    // Fetch directory list silently
    async function fetchDir(path) {
        try {
            const res = await fetch("/__list" + path, { cache: "force-cache" });
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];

            return data
                .filter(x => x && x.name && x.name !== "." && x.name !== "..")
                .map(x => ({
                    name: String(x.name),
                    type: x.type === "directory" ? "directory" : "file",
                    href: path + x.name + (x.type === "directory" ? "/" : "")
                }));
        } catch {
            return [];
        }
    }

    // Pre-load top-level directories into cache on boot
    async function initCache() {
        for (const root of rootsToPreCache) {
            const items = await fetchDir(root);
            items.forEach(item => {
                if (!cache.some(c => c.href === item.href)) {
                    cache.push(item);
                }
            });
        }
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<span class="ac-highlight">$1</span>');
    }

    function renderDropdown(query) {
        if (!dropdownEl) return;

        if (!matches.length) {
            hide();
            return;
        }

        const listHtml = matches.map((item, index) => {
            const isActive = index === activeIndex ? 'active' : '';
            const iconSvg = item.type === 'directory'
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>`;

            return `
        <li class="ac-item ${isActive}" data-index="${index}" data-href="${item.href}">
          <div class="ac-item-left">
            <div class="ac-icon ${item.type === 'directory' ? 'ac-icon-dir' : 'ac-icon-file'}">
              ${iconSvg}
            </div>
            <div class="ac-info">
              <span class="ac-name">${highlightMatch(item.name, query)}</span>
              <span class="ac-path">${item.href}</span>
            </div>
          </div>
          <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
            ${item.type === 'directory' ? 'DIR' : 'FILE'}
          </span>
        </li>
      `;
        }).join('');

        const footerHtml = `
      <div class="ac-footer">
        <span>Navigate <kbd>↑</kbd> <kbd>↓</kbd></span>
        <span>Select <kbd>↵</kbd></span>
      </div>
    `;

        dropdownEl.innerHTML = `<ul class="ac-list">${listHtml}</ul>${footerHtml}`;
        dropdownEl.classList.add('show');

        // Attach click events to items
        dropdownEl.querySelectorAll('.ac-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const href = el.getAttribute('data-href');
                selectItem(href);
            });
            el.addEventListener('mouseenter', () => {
                activeIndex = parseInt(el.getAttribute('data-index'), 10);
                updateActiveState();
            });
        });
    }

    function updateActiveState() {
        if (!dropdownEl) return;
        const items = dropdownEl.querySelectorAll('.ac-item');
        items.forEach((item, idx) => {
            if (idx === activeIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    function selectItem(href) {
        hide();
        if (inputEl) inputEl.value = '';
        if (typeof Router !== 'undefined') {
            Router.navigate(href);
        } else {
            window.location.href = href;
        }
    }

    function search(query) {
        const q = query.trim().toLowerCase();
        if (!q || q.length < 1) {
            matches = [];
            hide();
            return;
        }

        // Filter cache for top 6 matching items
        matches = cache
            .filter(item => item.name.toLowerCase().includes(q))
            .slice(0, 3);

        activeIndex = -1;
        renderDropdown(q);
    }

    function hide() {
        if (dropdownEl) dropdownEl.classList.remove('show');
        activeIndex = -1;
    }

    function bindInput(input) {
        inputEl = input;
        const wrap = input.closest('.input-wrap');
        if (!wrap) return;

        // Create dropdown container if not exists
        dropdownEl = wrap.querySelector('.ac-dropdown');
        if (!dropdownEl) {
            dropdownEl = document.createElement('div');
            dropdownEl.className = 'ac-dropdown';
            wrap.appendChild(dropdownEl);
        }

        // Typing listener with 150ms debounce
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                search(e.target.value);
            }, 150);
        });

        // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
        input.addEventListener('keydown', (e) => {
            if (!dropdownEl.classList.contains('show')) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % matches.length;
                updateActiveState();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + matches.length) % matches.length;
                updateActiveState();
            } else if (e.key === 'Enter') {
                if (activeIndex >= 0 && matches[activeIndex]) {
                    e.preventDefault();
                    e.stopPropagation();
                    selectItem(matches[activeIndex].href);
                }
            } else if (e.key === 'Escape') {
                hide();
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) {
                hide();
            }
        });

        // Re-open on focus if query exists
        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                search(input.value);
            }
        });
    }

    // Pre-fetch cache on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCache);
    } else {
        initCache();
    }

    return {
        bind: bindInput,
        hide: hide
    };
})();