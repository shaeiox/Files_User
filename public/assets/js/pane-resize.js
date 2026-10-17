/**
 * @file        pane-resize.js
 * @brief       Drag/keyboard splitter for the Browse panes (browse-split-explorer D2).
 *
 * One handle resizes one pane by writing a CSS custom property on a host element;
 * the grid reads it. Nothing measures layout per pointer move, and no easing runs
 * while dragging, so the boundary follows the pointer 1:1. Sizes persist per browser.
 */

const STORE_KEY = "browse.panes";

/** @brief Clamps `v` into [min, max]; `min` wins if the range is inverted. */
function clamp(v, min, max) {
    return Math.max(min, Math.min(v, max));
}

/**
 * @brief Width change for a pointer delta.
 * @param {number} dx       pointer movement in px, positive = rightward
 * @param {boolean} rtl     document is right-to-left
 * @param {boolean} trailing  the pane sits after the handle in reading order (inspector)
 */
function widthDelta(dx, rtl, trailing) {
    return dx * (rtl ? -1 : 1) * (trailing ? -1 : 1);
}

function load() {
    try {
        const v = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
        return v && typeof v === "object" ? v : {};
    } catch { return {}; }
}

function save(patch) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...load(), ...patch })); } catch { }
}

/**
 * @brief Binds a `role="separator"` handle.
 * @param {HTMLElement} handle
 * @param {object} o
 * @param {HTMLElement} o.host       element carrying the custom property
 * @param {string} o.prop            e.g. "--tree-w"
 * @param {string} o.key             storage key in the saved object
 * @param {number} o.def             default width
 * @param {() => [number, number]} o.range  live [min, max]
 * @param {boolean} [o.trailing]     pane follows the handle in reading order
 * @returns {{ set: (w:number, animate?:boolean) => void, get: () => number }}
 */
function attach(handle, o) {
    const rtl = () => document.documentElement.dir === "rtl";
    let width = Number(load()[o.key]) || o.def;

    // Discrete changes ease through the grid's own transition; only an active
    // drag (body.is-resizing) switches it off.
    function apply(w) {
        const [min, max] = o.range();
        width = Math.round(clamp(w, min, max));
        o.host.style.setProperty(o.prop, width + "px");
        handle.setAttribute("aria-valuemin", String(Math.round(min)));
        handle.setAttribute("aria-valuemax", String(Math.round(max)));
        handle.setAttribute("aria-valuenow", String(width));
    }

    let startX = 0, startW = 0, frame = 0, nextX = 0;

    handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        startX = nextX = e.clientX;
        startW = width;
        document.body.classList.add("is-resizing");
        handle.classList.add("is-dragging");
    });

    handle.addEventListener("pointermove", (e) => {
        if (!handle.hasPointerCapture(e.pointerId)) return;
        nextX = e.clientX;
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            apply(startW + widthDelta(nextX - startX, rtl(), o.trailing));
        });
    });

    const end = (e) => {
        if (!handle.hasPointerCapture(e.pointerId)) return;
        handle.releasePointerCapture(e.pointerId);
        document.body.classList.remove("is-resizing");
        handle.classList.remove("is-dragging");
        save({ [o.key]: width });
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("lostpointercapture", () => {
        document.body.classList.remove("is-resizing");
        handle.classList.remove("is-dragging");
    });

    handle.addEventListener("dblclick", () => { apply(o.def); save({ [o.key]: width }); });

    handle.addEventListener("keydown", (e) => {
        const [min, max] = o.range();
        const step = e.shiftKey ? 64 : 16;
        // Arrow keys move the handle the way they point on screen.
        const grow = widthDelta(1, rtl(), o.trailing);
        let w = null;
        if (e.key === "ArrowRight") w = width + step * grow;
        else if (e.key === "ArrowLeft") w = width - step * grow;
        else if (e.key === "Home") w = min;
        else if (e.key === "End") w = max;
        else if (e.key === "Enter") w = o.def;
        if (w === null) return;
        e.preventDefault();
        apply(w);
        save({ [o.key]: width });
    });

    apply(width);
    return { set: apply, get: () => width };
}

const PaneResize = { attach, load, save, clamp, widthDelta };

export { PaneResize };
