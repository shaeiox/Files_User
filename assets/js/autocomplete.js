/* ═══════════════════════════════════════════════
   autocomplete.js — Search suggestions from /api/search
   ═══════════════════════════════════════════════ */

const Autocomplete = (function () {
    'use strict';

    let activeIndex = -1;
    let matches = [];
    let dropdownEl = null;
    let inputEl = null;
    let debounceTimer = null;
    let requestSeq = 0;

    function itemHref(item) {
        if (typeof ResourceService !== "undefined") {
            return item.type === "directory"
                ? ResourceService.browseHref(item.path)
                : ResourceService.downloadHref(item.path);
        }
        return item.path || "#";
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return String(text).replace(regex, '<span class="ac-highlight">$1</span>');
    }

    function renderDropdown(query) {
        const d = typeof getDict === "function" ? getDict() : {};
        if (!dropdownEl) return;

        if (!matches.length) {
            hide();
            return;
        }

        const listHtml = matches.map((item, index) => {
            const isActive = index === activeIndex;
            const href = itemHref(item);
            const iconSvg = item.type === 'directory'
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>`;

            return `
        <li class="ac-item ${isActive ? 'active' : ''}" id="ac-option-${index}" role="option" aria-selected="${isActive}" data-index="${index}" data-href="${href}" data-type="${item.type}"${item.locked ? ' data-locked-item="true"' : ''}>
          <div class="ac-item-left">
            <div class="ac-icon ${item.type === 'directory' ? 'ac-icon-dir' : 'ac-icon-file'}">
              ${iconSvg}
            </div>
            <div class="ac-info">
              <span class="ac-name">${highlightMatch(item.name, query)}</span>
              <span class="ac-path">${item.path || ""}</span>
            </div>
          </div>
          <span class="badge ${item.locked ? 'badge-locked' : item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
            ${item.locked ? (d.lockedBadge || 'Locked') : item.type === 'directory' ? (d.dirBadge || 'DIR') : (d.fileBadge || 'FILE')}
          </span>
        </li>
      `;
        }).join('');

        const footerHtml = `
      <div class="ac-footer">
        <span>${d.navNavigate || "Navigate"} <kbd>↑</kbd> <kbd>↓</kbd></span>
        <span>${d.navSelect || "Select"} <kbd>↵</kbd></span>
      </div>
    `;

        dropdownEl.innerHTML = `<ul class="ac-list">${listHtml}</ul>${footerHtml}`;
        dropdownEl.classList.add('show');
        if (inputEl) inputEl.setAttribute('aria-expanded', 'true');
        syncActiveDescendant();

        dropdownEl.querySelectorAll('.ac-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                selectItem(el.getAttribute('data-href'), el.getAttribute('data-type'), el.getAttribute('data-locked-item') === 'true');
            });
            el.addEventListener('mouseenter', () => {
                activeIndex = parseInt(el.getAttribute('data-index'), 10);
                updateActiveState();
            });
        });
    }

    function syncActiveDescendant() {
        if (!inputEl) return;
        const items = dropdownEl ? dropdownEl.querySelectorAll('.ac-item') : [];
        if (activeIndex >= 0 && items[activeIndex]) {
            inputEl.setAttribute('aria-activedescendant', items[activeIndex].id);
        } else {
            inputEl.removeAttribute('aria-activedescendant');
        }
    }

    function updateActiveState() {
        if (!dropdownEl) return;
        const items = dropdownEl.querySelectorAll('.ac-item');
        items.forEach((item, idx) => {
            if (idx === activeIndex) {
                item.classList.add('active');
                item.setAttribute('aria-selected', 'true');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            }
        });
        syncActiveDescendant();
    }

    function selectItem(href, type, locked) {
        hide();
        if (inputEl) inputEl.value = '';
        if (type === "file") {
            // Locked: sign in first. Otherwise preflight, so a 401/404 never shows raw JSON.
            if (typeof FileActions === "undefined") { window.location.href = href; return; }
            if (locked) FileActions.signIn();
            else FileActions.download(href);
            return;
        }
        if (typeof Router !== 'undefined') {
            Router.navigate(href);
        } else {
            window.location.href = href;
        }
    }

    async function search(query) {
        const q = query.trim();
        if (!q) {
            matches = [];
            hide();
            return;
        }
        if (typeof ResourceService === "undefined") return;

        const seq = ++requestSeq;
        try {
            const data = await ResourceService.search(q, { limit: 6 });
            if (seq !== requestSeq) return;
            matches = (data.results || []).slice(0, 6);
            activeIndex = -1;
            renderDropdown(q);
        } catch {
            if (seq !== requestSeq) return;
            matches = [];
            hide();
        }
    }

    function hide() {
        if (dropdownEl) dropdownEl.classList.remove('show');
        if (inputEl) inputEl.setAttribute('aria-expanded', 'false');
        activeIndex = -1;
        syncActiveDescendant();
    }

    function bindInput(input) {
        inputEl = input;
        const wrap = input.closest('.input-wrap');
        if (!wrap) return;

        dropdownEl = wrap.querySelector('.ac-dropdown');
        if (!dropdownEl) {
            dropdownEl = document.createElement('div');
            dropdownEl.className = 'ac-dropdown';
            wrap.appendChild(dropdownEl);
        }
        dropdownEl.id = 'acDropdown';
        dropdownEl.setAttribute('role', 'listbox');

        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                search(e.target.value);
            }, 150);
        });

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
                    const item = matches[activeIndex];
                    selectItem(itemHref(item), item.type, item.locked === true);
                }
            } else if (e.key === 'Escape') {
                hide();
            }
        });

        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) {
                hide();
            }
        });

        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                search(input.value);
            }
        });
    }

    return {
        bind: bindInput,
        hide: hide
    };
})();
