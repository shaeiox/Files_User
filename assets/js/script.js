// ---------------- I18N (default EN) ----------------
const i18n = {
    en: {
        dir: "ltr", lang: "en",
        brand: "CloudAvid",
        subtitle: "File Portal",
        openDownloads: "Downloads",
        title: "CloudAvid Files",
        desc: "Browse directories or search across all downloads.",
        template: "Template", templateDesc: "Common templates & files",
        sandbox: "Sandbox", sandboxDesc: "Internal sandbox downloads",
        logServer: "Log Server", logServerDesc: "Logs & database exports",
        iso: "ISO", isoDesc: "OS images & installers",
        searchPh: "Search all files (name)...",
        searchBtn: "Search",
        stopBtn: "Stop",
        results: "Results",
        scanning: "Scanning…",
        done: "Done",
        langBtn: "FA",
        pageTitle: "CloudAvid • File Portal"
    },
    fa: {
        dir: "rtl", lang: "fa",
        brand: "کلوداوید",
        subtitle: "پرتال فایل",
        openDownloads: "دانلودها",
        title: "فایل‌های کلوداوید",
        desc: "دایرکتوری‌ها را باز کنید یا در همه دانلودها جستجو کنید.",
        template: "تمپلیت", templateDesc: "قالب‌ها و فایل‌های عمومی",
        sandbox: "سندباکس", sandboxDesc: "دانلودهای محیط آزمایشی",
        logServer: "لاگ سرور", logServerDesc: "لاگ‌ها و خروجی دیتابیس",
        iso: "ایزو", isoDesc: "ایمیج سیستم‌عامل و نصب‌کننده‌ها",
        searchPh: "جستجو در همه فایل‌ها (نام)...",
        searchBtn: "جستجو",
        stopBtn: "توقف",
        results: "نتایج",
        scanning: "در حال اسکن…",
        done: "تمام شد",
        langBtn: "EN",
        pageTitle: "کلوداوید • پرتال فایل"
    }
};

function getLang() { return localStorage.getItem("ui_lang") || "en"; }
function applyLang(lang) {
    const dict = i18n[lang] || i18n.en;
    document.documentElement.lang = dict.lang;
    document.documentElement.dir = dict.dir;
    document.title = dict.pageTitle;

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const k = el.getAttribute("data-i18n");
        if (dict[k] != null) el.textContent = dict[k];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const k = el.getAttribute("data-i18n-ph");
        if (dict[k] != null) el.placeholder = dict[k];
    });

    document.getElementById("langBtn").textContent = dict.langBtn;
    localStorage.setItem("ui_lang", lang);
}

// ---------------- Global search across directories ----------------
const rootsToScan = [
    "/download/download-User/",
    "/download/download-Avid/"
];

const resultsBox = document.getElementById("resultsBox");
const resultsList = document.getElementById("resultsList");
const resultsTitle = document.getElementById("resultsTitle");
const progressEl = document.getElementById("progress");
const qInput = document.getElementById("globalSearch");
const searchBtn = document.getElementById("searchBtn");
const stopBtn = document.getElementById("stopBtn");

let stopFlag = false;

function isHiddenName(name) {
    const n = (name || "").toLowerCase();
    // hide indexes + dotfiles
    if (n === "index.html" || n === "index.php") return true;
    if (n.startsWith(".")) return true;
    return false;
}

function clearResults() {
    resultsList.innerHTML = "";
    resultsBox.style.display = "none";
    progressEl.textContent = "";
}

function addResult(item) {
    const row = document.createElement("div");
    row.className = "r-item";

    row.innerHTML = `
        <div class="r-left">
          <a href="${item.href}" title="${item.name}">${item.name}</a>
          <div class="sub">${item.href}</div>
        </div>
        <div class="r-right">
          <span class="badge ${item.type === "directory" ? "folder" : "file"}">${item.type === "directory" ? "DIR" : "FILE"}</span>
        </div>
      `;
    resultsList.appendChild(row);
}

async function listDir(path) {
    const url = "/__list" + path; // nginx JSON endpoint
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid JSON");
    return data;
}

async function scanAll(query) {
    stopFlag = false;
    resultsList.innerHTML = "";
    resultsBox.style.display = "block";

    const lang = getLang();
    const dict = i18n[lang] || i18n.en;

    resultsTitle.textContent = dict.results;
    progressEl.textContent = dict.scanning;

    stopBtn.style.display = "inline-flex";
    searchBtn.disabled = true;
    qInput.disabled = true;

    const q = query.trim().toLowerCase();
    const maxResults = 200;
    let found = 0;

    // BFS traversal
    const queue = [...rootsToScan];
    let scannedDirs = 0;

    while (queue.length) {
        if (stopFlag) break;

        const dir = queue.shift();
        scannedDirs++;

        try {
            const entries = await listDir(dir);

            for (const e of entries) {
                if (stopFlag) break;
                if (!e || !e.name) continue;
                if (e.name === "." || e.name === "..") continue;
                if (isHiddenName(e.name)) continue;

                const type = (e.type === "directory") ? "directory" : "file";
                const href = dir + e.name + (type === "directory" ? "/" : "");

                // enqueue subdirs
                if (type === "directory") {
                    queue.push(href);
                }

                // match
                if (!q || e.name.toLowerCase().includes(q)) {
                    addResult({ name: e.name, href, type });
                    found++;
                    if (found >= maxResults) {
                        progressEl.textContent = dict.done + ` • ${found}+`;
                        stopFlag = true;
                        break;
                    }
                }
            }
        } catch (err) {
            // ignore directory errors (permission / missing), keep scanning
            console.warn("scan error:", dir, err);
        }

        progressEl.textContent = `${dict.scanning} ${scannedDirs}`;
    }

    if (stopFlag && found === 0 && query.trim()) {
        // nothing found
    }

    progressEl.textContent = (i18n[getLang()] || i18n.en).done + ` • ${found}`;
    stopBtn.style.display = "none";
    searchBtn.disabled = false;
    qInput.disabled = false;
}

// Ctrl+K focus
window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        qInput.focus();
    }
});

// Buttons
searchBtn.addEventListener("click", () => {
    const q = qInput.value || "";
    scanAll(q);
});

stopBtn.addEventListener("click", () => {
    stopFlag = true;
});

// Enter to search
qInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") scanAll(qInput.value || "");
    if (e.key === "Escape") clearResults();
});

// Language
applyLang(getLang());
document.getElementById("langBtn").addEventListener("click", () => {
    const next = getLang() === "en" ? "fa" : "en";
    applyLang(next);
});