// i18n.js — Shared language system
const i18n = {
    en: {
        dir: "ltr", lang: "en",
        brand: "CloudAvid", subtitle: "File Portal", website: "Website", home: "Home",
        portalStatus: "Your Infrastructure. With Avid.",
        heroTitle: "AVID <span>Download</span> Infrastructure",
        desc: "Access software packages, ISO images, templates and system logs — provided by CloudAvid infrastructure team.",
        categories: "Directories",
        template: "Template", templateDesc: "Common templates & starter files",
        sandbox: "Sandbox", sandboxDesc: "Internal sandbox downloads",
        logServer: "Log Server", logServerDesc: "Logs & database exports",
        iso: "ISO Images", isoDesc: "OS images & installers",
        imageClone: "VM Images", images: "Virtual machine disk images",
        searchPh: "Search all files…", searchBtn: "Search", stopBtn: "Stop",
        results: "Results", scanning: "Scanning…", done: "Done",
        name: "Name", type: "Type", modified: "Modified", size: "Size",
        folder: "Folder", file: "File", folders: "folders", files: "files",
        empty: "This folder is empty.", emptySearch: "No files matched.",
        loadErrTitle: "Failed to load", loadErrHint: "Check /__list/ endpoint.",
        root: "Home",
        pageTitle: "CloudAvid • File Portal",
        browseTitle: "Downloads • CloudAvid"
    },
    fa: {
        dir: "rtl", lang: "fa",
        brand: "کلوداوید", subtitle: "پرتال فایل", website: "وبسایت", home: "خانه",
        portalStatus: "زیرساخت شما، با آوید",
        heroTitle: "مرکز <span>دانلود</span> آوید",
        desc: "دسترسی به بسته‌های نرم‌افزاری، ایمیج‌های ISO، قالب‌ها و لاگ‌های سیستمی — ارائه شده توسط تیم زیرساخت کلوداوید.",
        categories: "دسته‌بندی‌ها",
        template: "تمپلیت", templateDesc: "قالب‌ها و فایل‌های عمومی",
        sandbox: "سندباکس", sandboxDesc: "دانلودهای محیط آزمایشی",
        logServer: "لاگ سرور", logServerDesc: "لاگ‌ها و خروجی دیتابیس",
        iso: "ایمیج ISO", isoDesc: "ایمیج سیستم‌عامل و نصب‌کننده‌ها",
        imageClone: "ایمیج VM", images: "دیسک‌های ماشین مجازی",
        searchPh: "جستجو در همه فایل‌ها…", searchBtn: "جستجو", stopBtn: "توقف",
        results: "نتایج", scanning: "در حال اسکن…", done: "تمام",
        name: "نام", type: "نوع", modified: "آخرین تغییر", size: "اندازه",
        folder: "پوشه", file: "فایل", folders: "پوشه", files: "فایل",
        empty: "این پوشه خالی است.", emptySearch: "فایلی پیدا نشد.",
        loadErrTitle: "بارگذاری ناموفق", loadErrHint: "مسیر /__list/ را بررسی کنید.",
        root: "خانه",
        pageTitle: "کلوداوید • پرتال فایل",
        browseTitle: "دانلودها • کلوداوید"
    }
};
function getLang() {
    return localStorage.getItem("ui_lang") || "en";
}

function getDict(lang) {
    return i18n[lang || getLang()] || i18n.en;
}

function applyLang(lang) {
    const d = getDict(lang);
    document.documentElement.lang = d.lang;
    document.documentElement.dir = d.dir;

    // 1. Standard text translation
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const k = el.getAttribute("data-i18n");
        if (d[k] != null) el.textContent = d[k];
    });

    // 2. Input placeholders
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const k = el.getAttribute("data-i18n-ph");
        if (d[k] != null) el.placeholder = d[k];
    });

    // 3. 🔥 HTML content translation (Preserves <span> styling for titles)
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const k = el.getAttribute("data-i18n-html");
        if (d[k] != null) el.innerHTML = d[k];
    });

    localStorage.setItem("ui_lang", lang);
}