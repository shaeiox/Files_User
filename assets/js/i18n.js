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
        releases: "Releases",

        // Releases page (/download/release)
        relPageTitle: "Releases • CloudAvid",
        relTitle: "Release Packages",
        relDesc: "Official PVM release artifacts, grouped by OS family. Newest version first.",
        relPackages: "Packages",
        relFile: "File",
        relSelect: "Select",
        relLatest: "Latest",
        relEmpty: "No release artifacts in %s yet.",
        relCliTitle: "Deterministic Automated Fetch",
        relCliDesc: "Download the selected package from a terminal. The same file always produces the same command.",
        relLatestDesc: "Always fetch the newest release for this OS family:",
        relNoSelection: "Select a package to generate its command.",
        relOsFamily: "OS family",
        relShell: "Shell",
        relShell_posix: "Linux / macOS",
        relShell_pwsh: "Windows PowerShell",
        relLeadTitle: "Latest %s release",
        relError: "The release list could not be loaded.",
        relRetry: "Try again",
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
        refresh: "Refresh",
        unavailable: "Unavailable",
        emptyFolder: "Empty",
        offline: "Offline",

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
        btnOpen: "Open",
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
        loadErrHint: "Check the file API and FILES_ROOT configuration.",
        resourcesLoadError: "Unable to load resources. Check FILES_ROOT and try again.",
        noReleases: "No files found yet.",
        categoryDesc: "Browse and download files in this category.",

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

        // ── Browse redesigned layout (browse-inspector-redesign) ──
        breadcrumb: "Breadcrumb",
        ctxSigned: "Signed by CloudAvid Core",
        filters: "Filters",
        viewMode: "View mode",
        viewList: "List view",
        viewGrid: "Grid view",
        select: "Select",
        selectAll: "Select all",
        folderSizeUnknown: "—",

        // ── Bulk selection & actions ──
        bulkSelected: "%n selected",
        bulkSize: "%s selected",
        bulkNoSize: "files only",
        bulkDownload: "Download Selected",
        bulkZip: "Download ZIP",
        bulkZipTitle: "Download as ZIP",
        bulkCopy: "Copy File List",
        bulkStarting: "Starting %s of %t…",
        bulkStarted: "%n started",
        bulkFailed: "Failed",
        bulkFailedCount: "%n failed",
        bulkFoldersSkipped: "%n folders skipped",
        bulkNothingToDownload: "Nothing to download",
        bulkNoFiles: "Select files first",
        bulkZipStarted: "ZIP started (%n)",
        bulkCopied: "Copied",

        // ── Metadata card ──
        bytes: "bytes",
        sha256: "SHA-256 Checksum",
        verify: "Verify SHA-256",
        reverify: "Verify again",
        verifying: "Verifying…",
        shaNotComputed: "Not verified yet.",
        shaTooLarge: "This file is too large to verify.",
        shaForbidden: "You do not have access to this file.",
        signInToVerify: "Sign in to verify this file.",
        signInToOpen: "Sign in to open",
        lockedBadge: "Locked",
        viewOnlyBadge: "View only",
        downloadUnavailable: "The download is temporarily unavailable. Try again shortly.",
        bulkUnavailable: "Selection is no longer available",
        shaUnavailable: "The file is no longer available.",
        shaFailed: "The checksum could not be computed.",
        digestTitle: "Full checksum",
        cmdFetch: "Command Line Fetch",
        copy: "Copy",
        copyDigest: "Copy checksum",
        copied: "Copied",
        copyFailed: "Copy failed",
        inspClose: "Close details",
        inspTabs: "Selected items",
        path: "Path",

        // ── NEW: Auth & 404 Messages ──
        authRequired: "Authentication Required",
        authRequiredDesc: "Access to the PVM release infrastructure requires clearance.",
        btnAuth: "Authenticate to Access",
        clearanceReq: "Clearance Required",
        lblUsername: "Username",
        lblPassword: "Password",
        btnSignIn: "Sign In",
        btnAuthenticating: "Authenticating...",
        btnSignOut: "Sign Out / Lock",
        error404Title: "Directory Not Found",
        error404Desc: "The requested path does not exist on CloudAvid infrastructure or you lack permission.",
        btnBackPortal: "Back to Downloads",
        errorServerLoad: "Failed to load directory.",
        errorServerSub: "Network or server error.",

        // Enterprise Footer (markup: Phase 5 / D10; keys: Phase 8)
        "footer.about": "CloudAvid cloud computing with over 15 years of experience, providing secure and scalable services in virtualization, cloud infrastructure, and enterprise support.",
        "footer.linksTitle": "Useful Links",
        "footer.linkHome": "Home",
        "footer.linkBrowse": "Browse Portal",
        "footer.linkDocs": "Documentation",
        "footer.linkMainSite": "CloudAvid Main Site",
        "footer.linkRakaard": "Rakaard",
        "footer.contactTitle": "Contact Us",
        "footer.phoneYazd": "Yazd:",
        "footer.phoneTehran": "Tehran:",
        "footer.emailLabel": "Email:",
        "footer.address": "Yazd, Safaieh, University Blvd, Mirdamad St, Mirdamad 3, No 12",
        "footer.socialTitle": "Connect With Us",
        "footer.socialTelegramPh": "Telegram",
        "footer.socialLinkedInPh": "LinkedIn",
        "footer.socialGithubPh": "GitHub",
        "footer.copyright": "All rights reserved for CloudAvid Technology Co."
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
        releases: "انتشارها",

        // Releases page (/download/release)
        relPageTitle: "انتشارها • کلودآوید",
        relTitle: "بسته‌های انتشار",
        relDesc: "فایل‌های رسمی انتشار PVM، دسته‌بندی‌شده بر اساس خانواده سیستم‌عامل. جدیدترین نسخه در ابتدا.",
        relPackages: "بسته‌ها",
        relFile: "فایل",
        relSelect: "انتخاب",
        relLatest: "آخرین",
        relEmpty: "هنوز فایل انتشاری در %s وجود ندارد.",
        relCliTitle: "دریافت خودکار قطعی",
        relCliDesc: "بسته انتخاب‌شده را از ترمینال دانلود کنید. یک فایل همیشه همان دستور را تولید می‌کند.",
        relLatestDesc: "همیشه جدیدترین انتشار این خانواده سیستم‌عامل را دریافت کنید:",
        relNoSelection: "برای ساخت دستور، یک بسته را انتخاب کنید.",
        relOsFamily: "خانواده سیستم‌عامل",
        relShell: "پوسته",
        relShell_posix: "لینوکس / macOS",
        relShell_pwsh: "Windows PowerShell",
        relLeadTitle: "آخرین انتشار %s",
        relError: "فهرست انتشارها بارگذاری نشد.",
        relRetry: "تلاش دوباره",
        home: "خانه",
        root: "خانه",
        pageTitle: "کلود آوید • پرتال فایل",
        browseTitle: "دانلودها • کلود آوید",

        // Hero Section
        portalStatus: "زیرساخت شما، با آوید",
        heroTitle: `<span class="avid">مرکز</span> <span class="accent">دانلود</span>&nbsp;<br>آوید`,
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
        refresh: "بروزرسانی",
        unavailable: "در دسترس نیست",
        emptyFolder: "خالی",
        offline: "آفلاین",

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
        btnOpen: "باز کن",
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
        loadErrHint: "رابط فایل و مقدار FILES_ROOT را بررسی کنید.",
        resourcesLoadError: "بارگذاری منابع ممکن نشد. FILES_ROOT را بررسی کنید.",
        noReleases: "هنوز فایلی پیدا نشد.",
        categoryDesc: "مرور و دانلود فایل‌های این دسته.",

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

        // ── Browse redesigned layout (browse-inspector-redesign) ──
        breadcrumb: "مسیر",
        ctxSigned: "امضا شده توسط CloudAvid Core",
        filters: "فیلترها",
        viewMode: "حالت نمایش",
        viewList: "نمایش فهرست",
        viewGrid: "نمایش شبکه‌ای",
        select: "انتخاب",
        selectAll: "انتخاب همه",
        folderSizeUnknown: "—",

        // ── Bulk selection & actions ──
        bulkSelected: "%n مورد انتخاب شده",
        bulkSize: "%s انتخاب شده",
        bulkNoSize: "فقط فایل",
        bulkDownload: "دانلود انتخاب‌شده‌ها",
        bulkZip: "دانلود ZIP",
        bulkZipTitle: "دانلود به‌صورت ZIP",
        bulkCopy: "کپی فهرست فایل‌ها",
        bulkStarting: "شروع %s از %t…",
        bulkStarted: "%n آغاز شد",
        bulkFailed: "ناموفق",
        bulkFailedCount: "%n ناموفق",
        bulkFoldersSkipped: "%n پوشه نادیده گرفته شد",
        bulkNothingToDownload: "موردی برای دانلود نیست",
        bulkNoFiles: "ابتدا فایل انتخاب کنید",
        bulkZipStarted: "آرشیو ZIP آغاز شد (%n)",
        bulkCopied: "کپی شد",

        // ── Metadata card ──
        bytes: "بایت",
        sha256: "جمع‌سنجی SHA-256",
        verify: "بررسی SHA-256",
        reverify: "بررسی دوباره",
        verifying: "در حال بررسی…",
        shaNotComputed: "هنوز بررسی نشده است.",
        shaTooLarge: "حجم این فایل برای بررسی بیش از حد است.",
        shaForbidden: "به این فایل دسترسی ندارید.",
        signInToVerify: "برای بررسی این فایل وارد شوید.",
        signInToOpen: "برای باز کردن وارد شوید",
        lockedBadge: "قفل‌شده",
        viewOnlyBadge: "فقط مشاهده",
        downloadUnavailable: "دانلود موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.",
        bulkUnavailable: "انتخاب دیگر در دسترس نیست",
        shaUnavailable: "این فایل دیگر در دسترس نیست.",
        shaFailed: "محاسبه‌ی جمع‌سنجی ممکن نشد.",
        digestTitle: "جمع‌سنجی کامل",
        cmdFetch: "دریافت با خط فرمان",
        copy: "کپی",
        copyDigest: "کپی جمع‌سنجی",
        copied: "کپی شد",
        copyFailed: "کپی ناموفق بود",
        inspClose: "بستن جزئیات",
        inspTabs: "موارد انتخاب‌شده",
        path: "مسیر",

        // ── NEW: Auth & 404 Messages ──
        authRequired: "نیاز به احراز هویت",
        authRequiredDesc: "دسترسی به زیرساخت ریلیزها مستلزم تایید هویت است.",
        btnAuth: "تایید هویت و ورود",
        clearanceReq: "تاییدیه امنیتی نیاز است",
        lblUsername: "نام کاربری",
        lblPassword: "کلمه عبور",
        btnSignIn: "ورود به سیستم",
        btnAuthenticating: "در حال ورود...",
        btnSignOut: "خروج / قفل",
        error404Title: "مسیر یافت نشد",
        error404Desc: "مسیر درخواستی در زیرساخت کلود آوید وجود ندارد یا سطح دسترسی شما کافی نیست.",
        btnBackPortal: "بازگشت به مرکز دانلود",
        errorServerLoad: "خطا در بارگذاری مسیر.",
        errorServerSub: "ارتباط با سرور قطع شده است.",
        // Enterprise Footer (markup: Phase 5 / D10; keys: Phase 8)
        "footer.about": "CloudAvid — بیش از ۱۵ سال تجربه در رایانش ابری، ارائه‌دهنده خدمات امن و مقیاس‌پذیر در حوزه مجازی‌سازی، زیرساخت ابری و پشتیبانی سازمانی.",
        "footer.linksTitle": "لینک‌های کاربردی",
        "footer.linkHome": "صفحه اصلی",
        "footer.linkBrowse": "پورتال فایل‌ها",
        "footer.linkDocs": "مستندات",
        "footer.linkMainSite": "سایت اصلی کلودآوید",
        "footer.linkRakaard": "راکارد",
        "footer.contactTitle": "با ما در تماس باشید",
        "footer.phoneYazd": "یزد:",
        "footer.phoneTehran": "تهران:",
        "footer.emailLabel": "ایمیل:",
        "footer.address": "یزد، صفائیه، بلوار دانشگاه، خیابان میرداماد، میرداماد ۳، پلاک ۱۲",
        "footer.socialTitle": "همراه ما باشید",
        "footer.socialTelegramPh": "تلگرام",
        "footer.socialLinkedInPh": "لینکدین",
        "footer.socialGithubPh": "گیت‌هاب",
        "footer.copyright": "تمامی حقوق برای شرکت رایانش ابری کلودآوید محفوظ است."
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
        const isPhElem = el.tagName === "INPUT" || el.tagName === "TEXTAREA";
        if (!isPhElem) {
            console.error(`[i18n] data-i18n-ph="${k}" applied to a non-input element (<${el.tagName.toLowerCase()}>); placeholder is unsupported and this hook has no effect. Use the appropriate hook instead.`, el);
            return;
        }
        if (d[k] != null) el.placeholder = d[k];
    });

    // 3a. Accessible-Name Translation (aria-label)
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
        const k = el.getAttribute("data-i18n-aria");
        if (d[k] != null) el.setAttribute("aria-label", d[k]);
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

    // 5a. Notify components that render their own markup.
    // `data-i18n` only covers static markup in index.html. Modules that build DOM at
    // render time (the Browse bulk bar and metadata card) hold no data-i18n nodes, so
    // they re-render themselves on this event instead of keeping stale-language text.
    try {
        document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: targetLang } }));
    } catch (e) {
        /* older engines without CustomEvent — components simply keep current text */
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

    /* Task 1.2 (a11y-ux-debt) - report the language menu's expanded state.
       CSS cannot write an attribute, so aria-expanded is hardcoded "false" in
       index.html and never updated, leaving assistive tech told "collapsed"
       even while the menu is open.
       This does NOT toggle the menu: visibility stays pure CSS (:hover /
       :focus-within), so the I8 freeze is preserved. This only mirrors that
       CSS state into the attribute. */
    const syncExpanded = (open) => {
        const btn = document.getElementById("langBtn");
        if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const wrap = document.querySelector(".lang-dropdown-wrap");
    if (wrap) {
        // Focus moves into the menu while the user tabs through the options,
        // so focusin/focusout on the wrapper tracks the whole open session.
        wrap.addEventListener("focusin", () => syncExpanded(true));
        wrap.addEventListener("focusout", (e) => {
            if (!wrap.contains(e.relatedTarget)) syncExpanded(false);
        });
        wrap.addEventListener("pointerenter", () => syncExpanded(true));
        wrap.addEventListener("pointerleave", () => {
            if (!wrap.contains(document.activeElement)) syncExpanded(false);
        });
    }
    syncExpanded(false);

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
