/* ═══════════════════════════════════════════════════════════════
   i18n.js — Shared Internationalization & Language System
   Skill: UI UX Pro Max — Multi-language Engine & Dropdown Controller
   ═══════════════════════════════════════════════════════════════ */

const i18n = {
    en: {
        dir: "ltr",
        lang: "en",

        // Global Header / Navbar
        brand: "CloudAvid",
        subtitle: "File Portal",
        website: "Website",
        docs: "Docs",
        downloads: "Downloads",
        home: "Home",
        root: "Home",
        pageTitle: "CloudAvid • File Portal",
        browseTitle: "Downloads • CloudAvid",

        // Hero Section
        portalStatus: "YOUR INFRASTRUCTURE. WITH AVID.",
        heroTitle: `<span class="avid">AVID</span> <span class="accent">Download</span><br>Infrastructure`,
        desc: "Access software packages, ISO images, templates and system logs — provided by CloudAvid infrastructure team.",
        searchPh: "Search for files, packages, templates...",
        searchBtn: "Search",
        stopBtn: "Stop",

        // Infrastructure Resources Cards
        infraTitle: "Infrastructure Resources",
        infraSub: "Browse and download all available infrastructure resources and packages.",
        allCategories: "All categories",
        sortLatest: "Sort by: Latest",
        sysFiles: "System Files",
        sysFilesDesc: "Public system files and essential packages for infrastructure.",
        template: "Templates",
        templateDesc: "Common templates and configuration files for deployment.",
        sandbox: "Sandbox",
        sandboxDesc: "Isolated environment packages and test files.",
        logServer: "Log Server",
        logServerDesc: "Database exports and system logs for troubleshooting.",
        iso: "ISO Images",
        isoDesc: "Operating systems and installation images.",
        docsTitle: "Documentation",
        docsDesc: "Guides, manuals and technical documentation.",
        files: "files",
        folders: "folders",
        folder: "Folder",
        file: "File",
        updated: "Updated",

        // Latest Releases & Quick Access
        latestReleases: "Latest Releases",
        latestSub: "Recently published packages and updates.",
        viewAll: "View all",
        thVersion: "Version",
        thType: "Package Type",
        thUpdated: "Updated",
        thSize: "Size",
        thChecksum: "Checksum",
        thAction: "Action",
        badgeNew: "NEW",
        btnDownload: "Download",
        quickAccess: "Quick Access",
        quickSub: "Frequently used downloads.",

        // Status Bar
        statusInfra: "Infrastructure Status",
        statusOperational: "All systems operational",
        statusMalware: "Malware Scanning",
        statusEngines: "engines active",
        statusStorage: "Storage",
        statusUsed: "used",
        statusSync: "Last Sync",

        // Search Overlay & Autocomplete
        results: "Results",
        scanning: "Scanning…",
        scannedDirs: "Scanned",
        foundText: "found",
        done: "Done",
        empty: "This folder is empty.",
        emptySearch: "No files matched.",
        dirBadge: "DIR",
        fileBadge: "FILE",
        navNavigate: "Navigate",
        navSelect: "Select",

        // Table & Browse Page
        name: "Name",
        type: "Type",
        modified: "Modified",
        size: "Size",
        loadErrTitle: "Failed to load",
        loadErrHint: "Check /__list/ endpoint.",

        perfLabel: "Performance",
        perfAuto: "Auto Detect",
        perfHigh: "High Power",
        perfMed: "Balanced",
        perfLow: "Power Saver",
        perfPotato: "Potato Mode",

        // Browse Page Filters & Sorting
        searchFolderPh: "Search in folder...",
        allTypes: "All Types",
        sortName: "Name (A-Z)",
        sortNameDesc: "Name (Z-A)",
        sortOldest: "Oldest First",
        sortSize: "Largest First",
    },

    fa: {
        dir: "rtl",
        lang: "fa",

        // Global Header / Navbar
        brand: "کلود آوید",
        subtitle: "پرتال فایل",
        website: "وب‌سایت",
        docs: "مستندات",
        downloads: "دانلودها",
        home: "خانه",
        root: "خانه",
        pageTitle: "کلود آوید • پرتال فایل",
        browseTitle: "دانلودها • کلود آوید",

        // Hero Section
        portalStatus: "زیرساخت شما، با آوید",
        heroTitle: `<span class="avid">مرکز</span> <span class="accent">دانلود</span><br>آوید`,
        desc: "دسترسی به بسته‌های نرم‌افزاری، ایمیج‌های ISO، قالب‌ها و لاگ‌های سیستمی — ارائه شده توسط تیم زیرساخت کلود آوید.",
        searchPh: "جستجو در فایل‌ها، بسته‌ها، قالب‌ها...",
        searchBtn: "جستجو",
        stopBtn: "توقف",

        // Infrastructure Resources Cards
        infraTitle: "منابع زیرساخت",
        infraSub: "مرور و دانلود تمام منابع و بسته‌های زیرساختی موجود.",
        allCategories: "همه دسته‌بندی‌ها",
        sortLatest: "مرتب‌سازی: جدیدترین",
        sysFiles: "فایل‌های سیستمی",
        sysFilesDesc: "فایل‌های عمومی سیستم و بسته‌های ضروری زیرساخت.",
        template: "قالب‌ها",
        templateDesc: "قالب‌های عمومی و فایل‌های پیکربندی راه‌اندازی.",
        sandbox: "سندباکس",
        sandboxDesc: "بسته‌های محیط ایزوله و فایل‌های آزمایشی.",
        logServer: "لاگ سرور",
        logServerDesc: "خروجی‌های دیتابیس و لاگ‌های سیستم برای عیب‌یابی.",
        iso: "ایمیج‌های ISO",
        isoDesc: "ایمیج‌های سیستم‌عامل و نصب‌کننده‌ها.",
        docsTitle: "مستندات فنی",
        docsDesc: "راهنماها، دفترچه‌ها و مستندات فنی.",
        files: "فایل",
        folders: "پوشه",
        folder: "پوشه",
        file: "فایل",
        updated: "به‌روزرسانی شد",

        // Latest Releases & Quick Access
        latestReleases: "آخرین انتشارها",
        latestSub: "بسته‌ها و به‌روزرسانی‌های اخیر.",
        viewAll: "مشاهده همه",
        thVersion: "نسخه",
        thType: "نوع بسته",
        thUpdated: "تاریخ به‌روزرسانی",
        thSize: "حجم",
        thChecksum: "چک‌سام",
        thAction: "عملیات",
        badgeNew: "جدید",
        btnDownload: "دانلود",
        quickAccess: "دسترسی سریع",
        quickSub: "دانلودهای پرکاربرد.",

        // Status Bar
        statusInfra: "وضعیت زیرساخت",
        statusOperational: "همه سیستم‌ها فعال هستند",
        statusMalware: "اسکن بدافزار",
        statusEngines: "موتور فعال",
        statusStorage: "فضای ذخیره‌سازی",
        statusUsed: "استفاده شده",
        statusSync: "آخرین همگام‌سازی",

        // Search Overlay & Autocomplete
        results: "نتایج",
        scanning: "در حال اسکن…",
        scannedDirs: "اسکن شد",
        foundText: "مورد یافت شد",
        done: "پایان",
        empty: "این پوشه خالی است.",
        emptySearch: "فایلی پیدا نشد.",
        dirBadge: "پوشه",
        fileBadge: "فایل",
        navNavigate: "جابه‌جایی",
        navSelect: "انتخاب",

        // Table & Browse Page
        name: "نام",
        type: "نوع",
        modified: "آخرین تغییر",
        size: "حجم",
        loadErrTitle: "بارگذاری ناموفق",
        loadErrHint: "مسیر /__list/ را بررسی کنید.",

        perfLabel: "عملکرد سیستم",
        perfAuto: "تشخیص خودکار",
        perfHigh: "حداکثر گرافیک",
        perfMed: "عملکرد متعادل",
        perfLow: "کاهش مصرف باتری",
        perfPotato: "بسیار سبک (سیب‌زمینی)",

        // Browse Page Filters & Sorting
        searchFolderPh: "جستجو در این پوشه...",
        allTypes: "همه موارد",
        sortName: "نام (الف - ی)",
        sortNameDesc: "نام (ی - الف)",
        sortOldest: "قدیمی‌ترین",
        sortSize: "بیشترین حجم",
    }
};

/* ── Core Language Getters ── */
function getLang() {
    try {
        return localStorage.getItem("ui_lang") || "en";
    } catch {
        return "en";
    }
}

function getDict(lang) {
    return i18n[lang || getLang()] || i18n.en;
}

/* ── Main Language Applicator ── */
function applyLang(lang) {
    const targetLang = lang || getLang();
    const d = getDict(targetLang);

    // 1. Set HTML Direction & Language
    document.documentElement.lang = d.lang;
    document.documentElement.dir = d.dir;

    // 2. Standard Text Translation
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const k = el.getAttribute("data-i18n");
        if (d[k] != null) el.textContent = d[k];
    });

    // 3. Input Placeholders Translation
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const k = el.getAttribute("data-i18n-ph");
        if (d[k] != null) el.placeholder = d[k];
    });

    // 4. HTML Content Translation (Preserves tags like <span>)
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const k = el.getAttribute("data-i18n-html");
        if (d[k] != null) el.innerHTML = d[k];
    });

    // 5. Update Language Pill Label in Header
    const currentLangLabel = document.getElementById("currentLangLabel");
    if (currentLangLabel) {
        currentLangLabel.textContent = targetLang === "fa" ? "FA" : "EN";
    }

    // 6. Highlight Active Language in Dropdown
    document.querySelectorAll(".lang-option").forEach(btn => {
        if (btn.getAttribute("data-lang") === targetLang) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // 7. Save Preference
    try {
        localStorage.setItem("ui_lang", targetLang);
    } catch { }
}

function setupLanguageDropdown() {
    applyLang(getLang());

    document.addEventListener("click", (e) => {
        const langOption = e.target.closest(".lang-option");
        if (langOption) {
            const selectedLang = langOption.getAttribute("data-lang");

            if (selectedLang && selectedLang !== getLang()) {
                applyLang(selectedLang);

                if (typeof Router !== "undefined") {
                    Router.refresh();
                } else {
                    window.location.reload();
                }
            }
        }
    });
}

/* ── Auto-Boot on DOM Ready ── */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLanguageDropdown);
} else {
    setupLanguageDropdown();
}