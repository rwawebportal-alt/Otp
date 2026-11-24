// =========================================================
// RWA PAID TEST SERIES APP - MASTER ENGINE (app.js)
// Features: Read-Only Cloud Vault Fallback (Zero Student Writes),
// Deleted-Series Live Recovery, 1-v-1 Challenge Detector,
// Bookmark Personal Notes, Expired Token Guard, Clean Logout,
// Dual-DB E2E Sync, Permanent IDB Storage & VIP Profile
// =========================================================

const BOT_API_BASE = "https://rwaweb-hp11.onrender.com";            // OLD DB (100% UNCHANGED)
const NEW_BOT_API_BASE = "https://pdfsownlaoder.onrender.com";      // NEW UNLIMITED-DB + CONTENT VAULT
const API_BASE = "https://rozgarapinew.teachx.in";
const AES_KEY = CryptoJS.enc.Utf8.parse("638udh3829162018");

window.WORKER_RAW_PROXY = "https://proplayer.allswbatch22.workers.dev/proxy?url=";
const RWA_DEDICATED_WORKER = "https://test.src22420.workers.dev/?url=";

const TG_BOT_TOKEN = "8832643385:AAG5SZyJo7dDrvvK_dO_2pEOQK09OLeA6WM";
const TG_CHANNEL_ID = "-1004454849047";

const TS_LIST_CACHE_KEY = "rwa_paid_ts_list_cache_v1";

const RWA_CORS_SAFE_HEADERS = {
    "Client-Service": "Appx",
    "Auth-Key": "appxapi",
    "source": "website"
};

window.ACTIVE_CHALLENGE = null;

// =====================================================
// SKELETON LOADERS & LOCAL CACHE HELPERS
// =====================================================
function renderTsSkeletonCards(gridEl, count = 6) {
    if (!gridEl) return;
    let html = "";
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-card space-y-3">
                <div class="skel-line h-36 rounded-2xl"></div>
                <div class="skel-line w-1/3"></div>
                <div class="skel-line w-4/5 h-5"></div>
                <div class="skel-line w-full h-9 rounded-xl"></div>
            </div>`;
    }
    gridEl.innerHTML = html;
}

function readTsListCache(maxAgeMs = 10 * 60 * 1000) {
    try {
        const raw = localStorage.getItem(TS_LIST_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && (Date.now() - parsed.ts) < maxAgeMs && Array.isArray(parsed.data)) {
            return parsed.data;
        }
    } catch {}
    return null;
}

function writeTsListCache(data) {
    try {
        localStorage.setItem(TS_LIST_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {}
}

// =====================================================
// PERMANENT DEVICE STORAGE ENGINE (LOCALSTORAGE + INDEXEDDB)
// =====================================================
const IDB_NAME = "RWA_TestSeries_Permanent_DB";
const IDB_STORE = "app_kv_store";

function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

function openPermanentIDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject("No IDB");
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e);
    });
}

async function idbSetItem(key, val) {
    try {
        const db = await openPermanentIDB();
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(val, key);
    } catch {}
}
window.rwaIdbSet = idbSetItem;

async function idbGetItem(key) {
    try {
        const db = await openPermanentIDB();
        return await new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, "readonly");
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}
window.rwaIdbGet = idbGetItem;

async function restoreFromPermanentIDB() {
    requestPersistentStorage();
    try {
        const idbTokens = await idbGetItem("rwa_user_tokens_v2");
        if (Array.isArray(idbTokens) && idbTokens.length > 0 && window.USER_TOKENS.length === 0) {
            window.USER_TOKENS = idbTokens.filter(t => t && t.token && !t.isAdmin);
            localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(window.USER_TOKENS));
        }

        const idbProfile = await idbGetItem("rwa_user_profile_v2");
        if (idbProfile && !window.USER_PROFILE) {
            window.USER_PROFILE = idbProfile;
            localStorage.setItem("rwa_user_profile_v2", JSON.stringify(window.USER_PROFILE));
        }

        if (isUserLoggedIn()) {
            const idbAttempts = await idbGetItem("rwa_attempted_tests_full");
            if (idbAttempts && typeof idbAttempts === "object") {
                window.ATTEMPTED_TESTS = { ...idbAttempts, ...window.ATTEMPTED_TESTS };
                const slimCopy = {};
                Object.keys(window.ATTEMPTED_TESTS).forEach(tid => {
                    slimCopy[tid] = { ...window.ATTEMPTED_TESTS[tid], questionsSnapshot: null, activeSectionsSnapshot: null, responses: null };
                });
                localStorage.setItem("rwa_attempted_tests_v1", JSON.stringify(slimCopy));
            }

            const idbBookmarks = await idbGetItem("rwa_bookmarked_questions_v1");
            if (Array.isArray(idbBookmarks) && idbBookmarks.length > 0 && window.BOOKMARKED_QUESTIONS.length === 0) {
                window.BOOKMARKED_QUESTIONS = idbBookmarks;
                localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(window.BOOKMARKED_QUESTIONS));
            }

            window.state.activeTokenObj = window.USER_TOKENS[0];
            syncAuthCookiesFromActiveToken(window.USER_TOKENS[0]);

            if (checkAndHandleExpiredToken(true)) return;

            autoSyncExistingSessionOnce();
            if (typeof window.tsPullCloudSync === "function") window.tsPullCloudSync();
            if (typeof window.startTsLiveHeartbeat === "function") window.startTsLiveHeartbeat();
        }

        updateTokenBadge();
        window.updateDashboardUI();
    } catch {}
}

function syncAuthCookiesFromActiveToken(tokObj) {
    if (!tokObj || !tokObj.token) return;
    const rawToken = String(tokObj.token).trim();
    const uid = String(tokObj.userId || extractUidFromJwt(rawToken) || "").trim();
    try {
        document.cookie = `base_url=${encodeURIComponent(API_BASE + "/")}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `Authorization=${rawToken}; path=/; max-age=31536000; SameSite=Lax`;
        if (uid) document.cookie = `User-ID=${uid}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
}

function clearAuthCookies() {
    try {
        document.cookie = "Authorization=; path=/; max-age=0";
        document.cookie = "User-ID=; path=/; max-age=0";
    } catch {}
}

// =====================================================
// EXPIRED TOKEN AUTO-LOGOUT GUARD & CLEAN LOGOUT ENGINE
// =====================================================
window.performCleanLocalLogout = function(notifyBackend = true, logoutReason = "User logged out from Paid Test Series") {
    const uidForLogout = (window.USER_TOKENS && window.USER_TOKENS[0] && window.USER_TOKENS[0].userId) || "";

    if (notifyBackend && uidForLogout && typeof window.rwaSecureFetch === "function") {
        window.rwaSecureFetch(`${NEW_BOT_API_BASE}/api/logout`, {
            method: "POST",
            body: { user_id: uidForLogout, reason: logoutReason },
            keepalive: true
        }).catch(() => {});
    }

    [
        "rwa_user_tokens_v2",
        "rwa_user_profile_v2",
        "rwa_attempted_tests_v1",
        "rwa_bookmarked_questions_v1",
        "rwa_paused_tests_v1",
        "rwa_paid_ts_pro_v1",
        "rwa_session_id_v1",
        "rwa_user_vip_badge"
    ].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem("rwa_silent_synced_uid");

    idbSetItem("rwa_user_tokens_v2", []);
    idbSetItem("rwa_user_profile_v2", null);
    idbSetItem("rwa_attempted_tests_full", {});
    idbSetItem("rwa_bookmarked_questions_v1", []);
    clearAuthCookies();

    window.USER_TOKENS = [];
    window.USER_PROFILE = null;
    window.ATTEMPTED_TESTS = {};
    window.BOOKMARKED_QUESTIONS = [];
    if (window.state) {
        window.state.activeTokenObj = null;
        window.state.knownTestIds = {};
    }
    if (typeof window.createDefaultTsProStore === "function") {
        window.TS_PRO_STORE = window.createDefaultTsProStore();
    }

    updateTokenBadge();
    window.updateDashboardUI();
    window.renderProfileTabView();
};

function checkAndHandleExpiredToken(verifyWithServer = false) {
    if (!isUserLoggedIn()) return false;
    const tok = window.USER_TOKENS[0].token;

    if (typeof window.rwaIsJwtExpired === "function" && window.rwaIsJwtExpired(tok, 30)) {
        window.performCleanLocalLogout(true, "Token expired — auto logged out");
        window.showRwaPopup({
            title: "Session Expired",
            message: "Aapka login token expire ho gaya hai. Kripya OTP se dobara login karein.",
            type: "warn", icon: "🔑", btnText: "Login Again"
        });
        openLoginModal("⚠️ आपका लॉगिन टोकन समाप्त हो गया है। कृपया OTP से दोबारा लॉगिन करें।");
        return true;
    }

    if (verifyWithServer) {
        const uid = window.USER_TOKENS[0].userId || extractUidFromJwt(tok);
        fetchRawJSONWithToken(`/get/get_user_dt?userid=${encodeURIComponent(uid)}`, window.USER_TOKENS[0])
            .then(json => {
                if (json && (Number(json.status) === 401 || Number(json.status) === 403 || /token|expired|unauthoriz|invalid/i.test(String(json.message || "")))) {
                    window.performCleanLocalLogout(true, "Server rejected expired token");
                    window.showRwaPopup({
                        title: "Session Expired",
                        message: "RWA server ne aapka purana session expire kar diya hai. Kripya dobara OTP login karein.",
                        type: "warn", icon: "🔑", btnText: "Login Again"
                    });
                    openLoginModal("⚠️ सेशन समाप्त हो गया है। कृपया दोबारा OTP लॉगिन करें।");
                }
            })
            .catch(() => {});
    }
    return false;
}
window.checkAndHandleExpiredToken = checkAndHandleExpiredToken;

function autoSyncExistingSessionOnce() {
    if (!isUserLoggedIn() || !window.USER_PROFILE) return;
    const uid = String(window.USER_TOKENS[0].userId || "");
    if (!uid || sessionStorage.getItem("rwa_silent_synced_uid") === uid) return;
    sessionStorage.setItem("rwa_silent_synced_uid", uid);
    sendProfileToMongoDB(window.USER_PROFILE, window.USER_TOKENS[0].token, "Existing Session Auto-Sync", "N/A", true);
}

// =====================================================
// 1-V-1 FRIEND CHALLENGE LINK DETECTOR (?challenge=ch_xxx)
// =====================================================
async function checkIncomingChallengeUrl() {
    const params = new URLSearchParams(window.location.search || "");
    const cid = (params.get("challenge") || "").trim();
    if (!cid || typeof window.rwaSecureFetch !== "function") return;

    try {
        const res = await window.rwaSecureFetch(`${NEW_BOT_API_BASE}/api/challenge/${encodeURIComponent(cid)}`);
        const ch = res.data && res.data.challenge;
        if (!ch) return;
        window.ACTIVE_CHALLENGE = ch;

        const banner = document.getElementById("incomingChallengeBanner");
        if (!banner) return;
        banner.className = "app-card p-4 mb-3.5 border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 flex flex-wrap items-center justify-between gap-3";
        banner.innerHTML = `
            <div class="min-w-0 flex-1">
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">⚔️ 1-V-1 FRIEND CHALLENGE</span>
                <div class="font-black text-sm mt-1 truncate">${window.tsEscHtml ? tsEscHtml(ch.challenger_name) : ch.challenger_name} challenged you!</div>
                <div class="text-xs font-bold opacity-80 mt-0.5">Target to Beat: <strong>${ch.challenger_score}/${ch.max_marks}</strong> (${ch.challenger_accuracy}% Acc) in <strong>${window.tsEscHtml ? tsEscHtml(ch.test_title) : ch.test_title}</strong></div>
            </div>
            <button onclick="acceptIncomingChallenge()" class="btn-watch text-xs shrink-0">⚔️ Accept & Start →</button>`;
        banner.classList.remove("hidden");
    } catch {}
}

window.acceptIncomingChallenge = function() {
    const ch = window.ACTIVE_CHALLENGE;
    if (!ch || !ch.test_id) return;
    const tKey = `test_${ch.test_id}`;
    if (!window.state.testMap[tKey]) {
        window.state.testMap[tKey] = {
            id: String(ch.test_id),
            seriesId: String(ch.series_id || ""),
            test_series_id: String(ch.series_id || ""),
            title: ch.test_title || `Challenge Test #${ch.test_id}`,
            marks: String(ch.max_marks || 100),
            time: "60",
            tokenObj: window.USER_TOKENS[0] || null
        };
    }
    window.launchCbtTest(tKey);
};

// =====================================================
// TELEGRAM CHANNEL PDF UPLOAD (100% ORIGINAL)
// =====================================================
window.sendToTelegramChannel = async function(blob, fileType, title) {
    if (!TG_BOT_TOKEN || TG_BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") return false;
    const caption = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n       🏆 𝐑𝐖𝐀 𝐓𝐄𝐒𝐓 𝐒𝐄𝐑𝐈𝐄𝐒 𝐋𝐈𝐁𝐑𝐀𝐑𝐘\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n📁 Type            : ${fileType}\n🎬 Title             : ${title}\n🏆 Series Name : ${window.state.activeSeriesTitle || "Paid Test Series"}\n📚 Folder Name : ${window.state.activeTsSubName || "Mock Test"}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚀 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐑𝐖𝐀\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    const formData = new FormData();
    formData.append("chat_id", TG_CHANNEL_ID);
    formData.append("caption", caption);
    formData.append("document", blob, `${title}.pdf`);
    try {
        const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, { method: "POST", body: formData });
        const json = await res.json();
        return Boolean(json.ok);
    } catch { return false; }
};

window.downloadAndUploadPDF = async function(pdfUrl, title) {
    if (!pdfUrl) return;
    const cleanTitle = String(title || "Test_Paper").replace(/[\\/:*?"<>|]/g, "_");
    window.showRwaPopup({ title: "Preparing Test PDF", message: "PDF Download & Telegram Upload Started...", type: "info", showSpinner: true });

    try {
        let blob = null;
        try { const res = await fetch(pdfUrl); if (res.ok) blob = await res.blob(); } catch {}
        if (!blob && window.WORKER_RAW_PROXY) {
            try { const proxyRes = await fetch(window.WORKER_RAW_PROXY + encodeURIComponent(pdfUrl)); if (proxyRes.ok) blob = await proxyRes.blob(); } catch {}
        }

        if (blob && blob.size > 0) {
            const a = document.createElement("a");
            const objUrl = URL.createObjectURL(blob);
            a.href = objUrl; a.download = `${cleanTitle}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(objUrl), 5000);

            if (typeof window.tsLogActivity === "function") window.tsLogActivity("DOWNLOAD_PDF", title || cleanTitle);
            const success = await window.sendToTelegramChannel(blob, "PDF", title || cleanTitle);
            window.showRwaPopup({
                title: success ? "Download & Upload Complete" : "PDF Downloaded",
                message: success
                    ? "PDF aapke device mein save ho gaya hai aur Telegram Channel par bhi upload ho gaya hai!"
                    : "Test Paper PDF aapke device mein successfully save ho gaya hai!",
                type: "success", icon: success ? "📄" : "📥", btnText: "Done"
            });
            return;
        }

        const directLink = document.createElement("a");
        directLink.href = pdfUrl; directLink.download = `${cleanTitle}.pdf`;
        document.body.appendChild(directLink); directLink.click(); directLink.remove();
        window.showRwaPopup({ title: "PDF Download Started", message: "Aapka Test Paper PDF download start ho gaya hai!", type: "success", icon: "📥", btnText: "OK" });
    } catch {
        window.showRwaPopup({ title: "Download Notice", message: "PDF download abhi busy hai. Kripya thodi der baad dobara try karein.", type: "error", icon: "📄", btnText: "Close" });
    }
};

// =====================================================
// JWT DECODERS & USER TOKEN / PROFILE / BOOKMARK STATE
// =====================================================
function decodeJwtPayloadObject(jwtStr) {
    if (!jwtStr || typeof jwtStr !== "string") return null;
    try {
        const parts = jwtStr.trim().split(".");
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
        return JSON.parse(jsonPayload);
    } catch { return null; }
}

function extractUidFromJwt(jwtStr) {
    const payload = decodeJwtPayloadObject(jwtStr);
    if (!payload) return "";
    if (payload.id || payload.userid || payload.user_id) return String(payload.id || payload.userid || payload.user_id);
    if (payload.session) {
        const nested = decodeJwtPayloadObject(payload.session);
        if (nested && (nested.id || nested.userid || nested.user_id)) return String(nested.id || nested.userid || nested.user_id);
    }
    return "";
}

function extractSessionUserFromJwt(jwtStr) {
    const outer = decodeJwtPayloadObject(jwtStr);
    if (!outer) return {};
    const inner = outer.session ? (decodeJwtPayloadObject(outer.session) || {}) : {};
    return {
        id: String(outer.id || inner.id || ""),
        userid: String(outer.id || inner.id || ""),
        name: inner.name || outer.name || "",
        email: inner.email || outer.email || ""
    };
}

function getUserSavedTokens() { try { const raw = localStorage.getItem("rwa_user_tokens_v2"); if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.filter(t => t && t.token && !t.isAdmin); } } catch {} return []; }
function getSavedUserProfile() { try { const raw = localStorage.getItem("rwa_user_profile_v2"); if (raw) return JSON.parse(raw); } catch {} return null; }
function getSavedBookmarksList() { try { const raw = localStorage.getItem("rwa_bookmarked_questions_v1"); if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; } } catch {} return []; }

window.USER_TOKENS = getUserSavedTokens();
window.USER_PROFILE = getSavedUserProfile();
window.ATTEMPTED_TESTS = (() => {
    try {
        if (window.USER_TOKENS.length === 0) return {};
        const raw = localStorage.getItem("rwa_attempted_tests_v1");
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
})();
window.BOOKMARKED_QUESTIONS = window.USER_TOKENS.length > 0 ? getSavedBookmarksList() : [];
let activeBookmarkDetailIdx = 0;
let activeBookmarkSubjectFilter = "all";

function isUserLoggedIn() { return window.USER_TOKENS.length > 0 && Boolean(window.USER_TOKENS[0].token); }
function updateTokenBadge() {
    const b = document.getElementById("tokCountBadge");
    if (b) b.textContent = window.USER_TOKENS.length;
    if (window.state && window.state.activeAppTab === "profile") window.renderProfileTabView();
}

window.updateDashboardUI = function() {
    const totalSeries = window.state.totalSeriesCount || 0;
    const attemptedIds = Object.keys(window.ATTEMPTED_TESTS || {});
    const attemptedCount = attemptedIds.length;
    const totalTests = Math.max(window.state.totalTestsCount || 0, attemptedCount, Object.keys(window.state.knownTestIds || {}).length);
    const remainingCount = Math.max(0, totalTests - attemptedCount);

    if (document.getElementById("dashTotalSeries")) document.getElementById("dashTotalSeries").textContent = totalSeries;
    if (document.getElementById("dashTotalTests")) document.getElementById("dashTotalTests").textContent = totalTests;
    if (document.getElementById("dashAttemptedTests")) document.getElementById("dashAttemptedTests").textContent = attemptedCount;
    if (document.getElementById("dashRemainingTests")) document.getElementById("dashRemainingTests").textContent = remainingCount;

    const pct = totalTests > 0 ? Math.min(100, Math.round((attemptedCount / totalTests) * 100)) : 0;
    const pctBadge = document.getElementById("dashProgressPercent");
    const pctSub = document.getElementById("dashProgressSubtext");
    const ringEl = document.getElementById("dashProgressRing");
    const isDark = document.body.classList.contains("dark-mode");

    if (pctBadge) pctBadge.textContent = `${pct}%`;
    if (ringEl) {
        const deg = Math.round((pct / 100) * 360);
        const trackColor = isDark ? "#1e293b" : "#e2e8f0";
        ringEl.style.background = `conic-gradient(#2563eb 0deg ${deg}deg, ${trackColor} ${deg}deg 360deg)`;
    }
    if (pctSub) pctSub.textContent = `Aapne kul ${totalTests} tests mein se ${attemptedCount} attempt kar liye hain (${remainingCount} bache hain).`;

    const bmBadge = document.getElementById("bookmarkCountBadge");
    if (bmBadge) bmBadge.textContent = window.BOOKMARKED_QUESTIONS.length;

    renderRecentAttemptsList();
    if (typeof window.updateProDashboardStrip === "function") window.updateProDashboardStrip();
    if (window.state && window.state.activeAppTab === "profile") window.renderProfileTabView();
};

window.recordUserTestAttempt = function(testId, attemptInfo) {
    if (!testId) return;
    const tid = String(testId).trim();
    window.ATTEMPTED_TESTS[tid] = {
        testId: tid, testKey: attemptInfo.testKey || `test_${tid}`, title: attemptInfo.title || `Test #${tid}`,
        seriesId: attemptInfo.seriesId || window.state.activeSeriesId || "", seriesTitle: attemptInfo.seriesTitle || window.state.activeSeriesTitle || "Paid Test Series",
        score: attemptInfo.score ?? 0, maxMarks: attemptInfo.maxMarks ?? 100, correct: attemptInfo.correct ?? 0, incorrect: attemptInfo.incorrect ?? 0,
        unattempted: attemptInfo.unattempted ?? 0, accuracy: attemptInfo.accuracy ?? 0, timeCorr: attemptInfo.timeCorr ?? 0, timeInc: attemptInfo.timeInc ?? 0, timeUna: attemptInfo.timeUna ?? 0,
        sectionStats: attemptInfo.sectionStats || [],
        testMeta: attemptInfo.testMeta || window.state.testMap[`test_${tid}`] || null, responses: attemptInfo.responses || {},
        selectedOptionalByGroup: attemptInfo.selectedOptionalByGroup || {}, activeSectionsSnapshot: attemptInfo.activeSectionsSnapshot || null, questionsSnapshot: attemptInfo.questionsSnapshot || null,
        date: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    };

    const slimCopyForLocalStorage = {};
    Object.keys(window.ATTEMPTED_TESTS).forEach(key => { slimCopyForLocalStorage[key] = { ...window.ATTEMPTED_TESTS[key], questionsSnapshot: null, activeSectionsSnapshot: null, responses: null }; });
    try { localStorage.setItem("rwa_attempted_tests_v1", JSON.stringify(slimCopyForLocalStorage)); } catch {}
    idbSetItem("rwa_attempted_tests_full", window.ATTEMPTED_TESTS);
    window.updateDashboardUI();
};

window.getSavedAttemptByTestId = function(testId) { return window.ATTEMPTED_TESTS[String(testId).trim()] || null; };

function renderRecentAttemptsList() {
    const container = document.getElementById("recentAttemptsList"); if (!container) return;
    const entries = Object.values(window.ATTEMPTED_TESTS || {}).reverse();
    if (entries.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs font-bold opacity-65 rounded-2xl border border-sky-200/50">Abhi tak aapne koi test attempt nahi kiya hai. Test submit karte hi aapka score yahan dikhega.</div>`;
        return;
    }

    container.innerHTML = entries.map(item => `
        <div onclick="openSavedTestScorecard('${item.testId}', '${item.testKey || `test_${item.testId}`}', ${JSON.stringify({score: item.score, maxMarks: item.maxMarks, correct: item.correct, incorrect: item.incorrect, unattempted: item.unattempted, accuracy: item.accuracy, timeCorr: item.timeCorr, timeInc: item.timeInc, timeUna: item.timeUna}).replace(/"/g, "&quot;")})" class="p-4 rounded-2xl border border-sky-200/70 dark:border-slate-700 flex items-center justify-between gap-3 cursor-pointer transition hover:border-blue-500">
            <div class="min-w-0 flex-1">
                <h4 class="font-black text-sm sm:text-base truncate">${item.title}</h4>
                <div class="text-[11px] font-bold opacity-65 mt-0.5">${item.seriesTitle} • ${item.date || ""}</div>
                <div class="text-xs font-extrabold text-blue-600 dark:text-sky-400 mt-1.5">View Scorecard →</div>
            </div>
            <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black shrink-0">${item.score}/${item.maxMarks}</span>
        </div>`).join("");
}

window.clearAttemptHistory = function() {
    window.showRwaConfirm({
        title: "Reset Attempt History?",
        message: "Kya aap apni local Attempted Tests history reset karna chahte hain?",
        icon: "🗑️", type: "danger", confirmText: "Yes, Reset", cancelText: "Cancel",
        onConfirm: () => {
            window.ATTEMPTED_TESTS = {};
            localStorage.removeItem("rwa_attempted_tests_v1");
            idbSetItem("rwa_attempted_tests_full", {});
            window.updateDashboardUI();
            if (window.state.view === "ts_tests" && window.state.activeSeriesId) {
                openTestSeriesTitles(window.state.activeSeriesId, window.state.activeTsSubId || "-1", window.state.activeTsSubName || window.state.activeSeriesTitle);
            }
            window.showRwaPopup({ title: "History Reset", message: "Aapki Attempted Tests history clear kar di gayi hai.", type: "success" });
        }
    });
};

// =====================================================
// BOOKMARKS VAULT + PERSONAL NOTES / TRICKS
// =====================================================
window.isQuestionBookmarked = function(qKey) { return window.BOOKMARKED_QUESTIONS.some(b => String(b.qKey) === String(qKey)); };
window.toggleBookmarkItem = function(itemObj) {
    if (!itemObj || !itemObj.qKey) return false;
    const existsIdx = window.BOOKMARKED_QUESTIONS.findIndex(b => String(b.qKey) === String(itemObj.qKey));
    let isNowSaved = false;
    if (existsIdx >= 0) {
        window.BOOKMARKED_QUESTIONS.splice(existsIdx, 1);
        isNowSaved = false;
        if (typeof window.tsToast === "function") window.tsToast("☆ Bookmark removed", "info");
    } else {
        window.BOOKMARKED_QUESTIONS.unshift({ ...itemObj, note: itemObj.note || "", savedAt: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) });
        isNowSaved = true;
        if (typeof window.tsToast === "function") window.tsToast("★ Question Bookmarked!", "success");
        if (typeof window.tsLogActivity === "function") window.tsLogActivity("BOOKMARK", `${itemObj.subject || "Q"} - ${itemObj.testTitle || "Test"}`);
    }
    localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(window.BOOKMARKED_QUESTIONS));
    idbSetItem("rwa_bookmarked_questions_v1", window.BOOKMARKED_QUESTIONS);
    if (typeof window.tsPushCloudSync === "function") window.tsPushCloudSync();
    window.updateDashboardUI();
    renderBookmarksTab();
    return isNowSaved;
};

window.saveActiveBookmarkNote = function() {
    const b = window.BOOKMARKED_QUESTIONS[activeBookmarkDetailIdx];
    const inp = document.getElementById("bmDetailNoteInput");
    if (!b || !inp) return;
    b.note = inp.value.trim();
    localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(window.BOOKMARKED_QUESTIONS));
    idbSetItem("rwa_bookmarked_questions_v1", window.BOOKMARKED_QUESTIONS);
    if (typeof window.tsPushCloudSync === "function") window.tsPushCloudSync();
    if (typeof window.tsToast === "function") window.tsToast("📝 Personal Note saved to Cloud!", "success");
};

window.removeBookmarkByKey = function(qKey, fromDetailView = false) {
    window.BOOKMARKED_QUESTIONS = window.BOOKMARKED_QUESTIONS.filter(b => String(b.qKey) !== String(qKey));
    localStorage.setItem("rwa_bookmarked_questions_v1", JSON.stringify(window.BOOKMARKED_QUESTIONS));
    idbSetItem("rwa_bookmarked_questions_v1", window.BOOKMARKED_QUESTIONS);
    if (typeof window.tsPushCloudSync === "function") window.tsPushCloudSync();
    window.updateDashboardUI();
    if (fromDetailView) {
        if (window.BOOKMARKED_QUESTIONS.length === 0) closeBookmarkDetailView();
        else {
            if (activeBookmarkDetailIdx >= window.BOOKMARKED_QUESTIONS.length) activeBookmarkDetailIdx = window.BOOKMARKED_QUESTIONS.length - 1;
            openBookmarkDetailView(activeBookmarkDetailIdx);
        }
    } else renderBookmarksTab();
};

window.clearAllBookmarks = function() {
    if (window.BOOKMARKED_QUESTIONS.length === 0) return;
    window.showRwaConfirm({
        title: "Clear All Bookmarks?",
        message: "Kya aap sabhi Bookmarked Questions delete karna chahte hain?",
        icon: "🔖", type: "danger", confirmText: "Yes, Delete All", cancelText: "Cancel",
        onConfirm: () => {
            window.BOOKMARKED_QUESTIONS = [];
            localStorage.removeItem("rwa_bookmarked_questions_v1");
            idbSetItem("rwa_bookmarked_questions_v1", []);
            if (typeof window.tsPushCloudSync === "function") window.tsPushCloudSync();
            activeBookmarkSubjectFilter = "all";
            closeBookmarkDetailView();
            window.updateDashboardUI();
            renderBookmarksTab();
            window.showRwaPopup({ title: "Bookmarks Cleared", message: "Sabhi saved bookmarked questions delete kar diye gaye hain.", type: "success" });
        }
    });
};

function renderBookmarkSubjectPills() {
    const bar = document.getElementById("bookmarkSubjectFilterBar");
    if (!bar) return;
    const subjects = [...new Set(window.BOOKMARKED_QUESTIONS.map(b => (b.subject || "General").trim()).filter(Boolean))];
    let html = `<button onclick="filterBookmarksBySubject('all', this)" class="cat-pill ${activeBookmarkSubjectFilter === "all" ? "active" : ""}">All</button>`;
    subjects.forEach(sub => {
        const safe = sub.replace(/'/g, "\\'");
        html += `<button onclick="filterBookmarksBySubject('${safe}', this)" class="cat-pill ${activeBookmarkSubjectFilter === sub ? "active" : ""}">${sub}</button>`;
    });
    bar.innerHTML = html;
}

window.filterBookmarksBySubject = function(sub, btn) {
    activeBookmarkSubjectFilter = sub;
    document.querySelectorAll("#bookmarkSubjectFilterBar .cat-pill").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderBookmarksTab();
};

function renderBookmarksTab() {
    renderBookmarkSubjectPills();
    const container = document.getElementById("bookmarksListContainer"); if (!container) return;
    const filtered = activeBookmarkSubjectFilter === "all"
        ? window.BOOKMARKED_QUESTIONS
        : window.BOOKMARKED_QUESTIONS.filter(b => (b.subject || "General").trim() === activeBookmarkSubjectFilter);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="app-card p-10 text-center"><div class="text-4xl mb-2">🔖</div><h4 class="font-black text-base">Abhi koi Question Bookmark nahi hai</h4><p class="text-xs font-semibold opacity-65 mt-1">Live Test ya Solution dekhte waqt upar <b>☆ Save</b> button dabayein.</p></div>`;
        return;
    }

    container.innerHTML = filtered.map((b) => {
        const realIdx = window.BOOKMARKED_QUESTIONS.findIndex(x => String(x.qKey) === String(b.qKey));
        return `
            <div onclick="openBookmarkDetailView(${realIdx})" class="app-card p-4 sm:p-5 hover:border-blue-500 cursor-pointer transition-all space-y-2.5">
                <div class="flex justify-between items-center gap-2"><span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-black">${b.subject || "General"}</span><span class="text-amber-500 text-lg leading-none">★</span></div>
                <div class="text-sm sm:text-base font-bold leading-snug">Q${realIdx + 1}. ${b.question || ""}</div>
                ${b.note ? `<div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-extrabold text-amber-900 dark:text-amber-300">📝 Note: ${window.tsEscHtml ? tsEscHtml(b.note) : b.note}</div>` : ""}
                <div class="text-[11px] font-bold opacity-60">${b.testTitle || "Mock Test"} (Q.${b.qNumber || 1})</div>
                <div class="pt-1 flex justify-end"><span class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-extrabold text-xs">View Options & Note</span></div>
            </div>`;
    }).join("");
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([container]).catch(() => {});
}

window.openBookmarkDetailView = function(idx) {
    if (!window.BOOKMARKED_QUESTIONS || window.BOOKMARKED_QUESTIONS.length === 0 || idx < 0 || idx >= window.BOOKMARKED_QUESTIONS.length) return;
    activeBookmarkDetailIdx = idx; const b = window.BOOKMARKED_QUESTIONS[idx];
    document.getElementById("bookmarksListSubView").classList.add("hidden"); document.getElementById("bookmarkDetailSubView").classList.remove("hidden");
    document.getElementById("bmDetailCounter").textContent = `Question ${idx + 1} of ${window.BOOKMARKED_QUESTIONS.length}`;
    document.getElementById("bmDetailDeleteBtn").onclick = () => window.removeBookmarkByKey(b.qKey, true);
    document.getElementById("bmDetailMeta").innerHTML = `<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">🔖 Bookmark #${idx + 1}</span><span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-black">${b.subject || "Subject"}</span><span class="text-xs font-bold opacity-70">📝 ${b.testTitle || "Mock Test"} (Original Q.${b.qNumber || 1})</span>`;
    document.getElementById("bmDetailQuestion").innerHTML = b.question || "";

    const noteInp = document.getElementById("bmDetailNoteInput");
    if (noteInp) noteInp.value = b.note || "";

    const optsEl = document.getElementById("bmDetailOptions"), letters = ["A", "B", "C", "D", "E"], opts = b.options || [], ansStr = String(b.answer || "1").trim();
    if (optsEl) {
        optsEl.innerHTML = opts.map((optText, oIdx) => {
            if (!optText) return "";
            const optId = String(oIdx + 1), isCorrect = optId === ansStr;
            return `<div class="p-3.5 rounded-xl border-2 text-sm flex items-start justify-between gap-3 ${isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}"><div class="flex items-start gap-2.5"><span class="font-black text-indigo-700">${letters[oIdx] || optId}.</span><div class="leading-relaxed">${optText}</div></div>${isCorrect ? `<span class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black shrink-0">✓ Correct Answer</span>` : ""}</div>`;
        }).join("");
    }
    document.getElementById("bmDetailSolution").innerHTML = b.solution || "Detailed solution is shown in the highlighted correct option above.";
    document.getElementById("bmPrevBtn").disabled = idx <= 0; document.getElementById("bmPrevBtn").style.opacity = idx <= 0 ? "0.45" : "1";
    document.getElementById("bmNextBtn").disabled = idx >= window.BOOKMARKED_QUESTIONS.length - 1; document.getElementById("bmNextBtn").style.opacity = idx >= window.BOOKMARKED_QUESTIONS.length - 1 ? "0.45" : "1";
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([document.getElementById("bookmarkDetailSubView")]).catch(() => {});
    window.scrollTo({ top: 0, behavior: "smooth" });
};
window.closeBookmarkDetailView = function() { document.getElementById("bookmarkDetailSubView").classList.add("hidden"); document.getElementById("bookmarksListSubView").classList.remove("hidden"); renderBookmarksTab(); };
window.prevBookmarkDetail = function() { if (activeBookmarkDetailIdx > 0) window.openBookmarkDetailView(activeBookmarkDetailIdx - 1); };
window.nextBookmarkDetail = function() { if (activeBookmarkDetailIdx < window.BOOKMARKED_QUESTIONS.length - 1) window.openBookmarkDetailView(activeBookmarkDetailIdx + 1); };

// =====================================================
// STUDENT PROFILE TAB VIEW
// =====================================================
window.renderProfileTabView = function() {
    const box = document.getElementById("profileTabContent");
    if (!box) return;

    const testCount = Object.keys(window.ATTEMPTED_TESTS || {}).length;
    const savedCount = (window.BOOKMARKED_QUESTIONS || []).length;
    const streakDays = (window.TS_PRO_STORE && window.TS_PRO_STORE.study_stats && window.TS_PRO_STORE.study_stats.streak) || 1;
    const targetExam = (window.TS_PRO_STORE && window.TS_PRO_STORE.exam_countdown && window.TS_PRO_STORE.exam_countdown.name) || "SSC GD 2027";
    const isDark = document.body.classList.contains("dark-mode");
    const vipBadge = localStorage.getItem("rwa_user_vip_badge") || "";

    if (!isUserLoggedIn()) {
        box.innerHTML = `
            <div class="profile-hero-card text-center space-y-2">
                <div class="w-16 h-16 rounded-full bg-white/20 mx-auto flex items-center justify-center text-3xl font-black">👤</div>
                <h3 class="text-xl font-black">Guest Student</h3>
                <p class="text-xs opacity-90 font-semibold">Paid Tests attempt karne aur cloud sync ke liye OTP Login karein.</p>
                <button onclick="openLoginModal()" class="mt-2 px-6 py-2.5 rounded-full bg-white text-indigo-900 font-black text-xs border-0 shadow cursor-pointer">📲 Official OTP Login</button>
            </div>
            <div class="app-card overflow-hidden">
                <button onclick="openStudentInboxModal()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">🔔</span><div><div class="font-extrabold text-sm">Notifications & Announcements</div><div class="text-[11px] opacity-65">Official updates from Admin</div></div></div><span class="opacity-50 font-black">›</span></button>
                <button onclick="openCountdownModal()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">🎯</span><div><div class="font-extrabold text-sm">Target Exam: ${targetExam}</div><div class="text-[11px] opacity-65">Tap to set exam date</div></div></div><span class="opacity-50 font-black">›</span></button>
                <button onclick="toggleTsPortalTheme()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">${isDark ? "☀️" : "🌙"}</span><div><div class="font-extrabold text-sm">Dark Mode Theme Toggle</div><div class="text-[11px] opacity-65">Currently: ${isDark ? "Midnight Dark" : "Sky Light"}</div></div></div><span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">${isDark ? "ON" : "OFF"}</span></button>
                <button onclick="openReportIssueModal()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">🚩</span><div><div class="font-extrabold text-sm">Report Issue / Request Test</div><div class="text-[11px] opacity-65">Direct message to Admin</div></div></div><span class="opacity-50 font-black">›</span></button>
            </div>`;
        return;
    }

    const activeTok = window.USER_TOKENS[0];
    const uid = activeTok.userId || extractUidFromJwt(activeTok.token);
    const u = window.USER_PROFILE || {};
    const initial = (u.name || "R").charAt(0).toUpperCase();

    box.innerHTML = `
        <div class="profile-hero-card flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center text-3xl font-black shrink-0">${initial}</div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-xl font-black truncate">${u.name || "RWA Student"}</h3>
                    ${vipBadge ? `<span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">${vipBadge}</span>` : ""}
                </div>
                <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-200/40 text-white text-[11px] font-black">✓ Verified RWA Student</span>
                <div class="text-xs opacity-90 font-bold mt-1.5 truncate">UID: ${u.userid || u.id || uid} • ${u.state || "India"} (${u.info_1 || "UR"})</div>
            </div>
        </div>

        <div class="app-card px-4 py-3 flex items-center justify-around text-center text-xs font-extrabold">
            <div>📝 <strong>${testCount}</strong> Tests</div>
            <span class="opacity-25">|</span>
            <div>🔥 <strong>${streakDays}</strong> Days</div>
            <span class="opacity-25">|</span>
            <div>🔖 <strong>${savedCount}</strong> Saved</div>
        </div>

        <div class="app-card overflow-hidden">
            <div class="profile-menu-row flex-wrap" onclick="this.querySelector('#accDetailsExpand')?.classList.toggle('hidden')">
                <div class="flex items-center gap-3"><span class="text-xl">👤</span><div><div class="font-extrabold text-sm">Personal Account Details</div><div class="text-[11px] opacity-65">📱 ${u.phone || "N/A"} • 📧 ${u.email || "N/A"}</div></div></div>
                <span class="opacity-50 font-black">›</span>
                <div id="accDetailsExpand" class="hidden w-full text-xs opacity-80 pt-2 border-t border-sky-200/40 mt-2">
                    State/Dist: ${u.state || "N/A"} / ${u.district || "N/A"} • Category: ${u.info_1 || "N/A"} • Gender: ${u.info_2 || "N/A"}
                </div>
            </div>
            <button onclick="openStudentInboxModal()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">🔔</span><div><div class="font-extrabold text-sm">Notifications & Admin Replies</div><div class="text-[11px] opacity-65">Personal messages & notices</div></div></div><span class="opacity-50 font-black">›</span></button>
            <button onclick="openCountdownModal()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">🎯</span><div><div class="font-extrabold text-sm">Target Exam: ${targetExam}</div><div class="text-[11px] opacity-65">Tap to update target exam & date</div></div></div><span class="opacity-50 font-black">›</span></button>
            <button onclick="toggleTsPortalTheme()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">${isDark ? "☀️" : "🌙"}</span><div><div class="font-extrabold text-sm">Dark Mode Theme Toggle</div><div class="text-[11px] opacity-65">Switch Sky Light / Midnight Dark</div></div></div><span id="profileDarkModeBadge" class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">${isDark ? "ON" : "OFF"}</span></button>
            <button onclick="openReportIssueModal()" class="profile-menu-row"><div class="flex items-center gap-3"><span class="text-xl">🚩</span><div><div class="font-extrabold text-sm">Report Issue / Request Test</div><div class="text-[11px] opacity-65">Send feedback or request series</div></div></div><span class="opacity-50 font-black">›</span></button>
        </div>

        <button onclick="handleLogout()" class="w-full py-3.5 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-sm border border-rose-200 cursor-pointer flex items-center justify-center gap-2">
            <span>↪</span><span>Logout Account</span>
        </button>`;
};

window.switchAppTab = function(tabName) {
    if (tabName === "protools" && window.PORTAL_KILL_SWITCHES && window.PORTAL_KILL_SWITCHES.pro_vault === false) {
        return window.showRwaPopup({ title: "Module Paused", message: "Pro Vault abhi Admin dwara temporarily band kiya gaya hai.", type: "warn" });
    }
    window.state.activeAppTab = tabName;
    const views = { tests: "appViewTests", progress: "appViewDashboard", bookmarks: "appViewBookmarks", protools: "appViewProTools", profile: "appViewProfile" };
    Object.keys(views).forEach(k => document.getElementById(views[k])?.classList.toggle("hidden", k !== tabName));
    document.querySelectorAll("#appBottomNav .bnav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.apptab === tabName));

    const titleMap = { tests: "RWA TEST SERIES", progress: "MY PROGRESS", bookmarks: "SAVED BOOKMARKS", protools: "PRO STUDY VAULT", profile: "STUDENT PROFILE" };
    const hTitle = document.getElementById("headerMainTitle");
    if (hTitle) hTitle.textContent = titleMap[tabName] || "RWA TEST SERIES";

    if (tabName === "progress") {
        window.updateDashboardUI();
        if (typeof window.loadWeeklyXpLeague === "function") window.loadWeeklyXpLeague();
    } else if (tabName === "bookmarks") closeBookmarkDetailView();
    else if (tabName === "protools" && typeof window.closeVaultToolDetail === "function") window.closeVaultToolDetail();
    else if (tabName === "profile") window.renderProfileTabView();
    window.scrollTo({ top: 0, behavior: "smooth" });
};

// =====================================================
// 2-SLIDE PURPLE OTP LOGIN ENGINE + DUAL-DB E2E SYNC
// =====================================================
let otpResendTimerInterval = null;
let lastOtpTargetPhone = "";

function openLoginModal(customMsg) {
    if (window.PORTAL_KILL_SWITCHES && window.PORTAL_KILL_SWITCHES.new_login === false) {
        return window.showRwaPopup({ title: "Login Paused", message: "New logins abhi Admin dwara temporarily pause kiye gaye hain.", type: "warn" });
    }
    document.getElementById("loginModal")?.classList.remove("hidden");
    resetOtpModalToPhoneStep();
    if (customMsg) showLoginStatus(customMsg, "info");
    else document.getElementById("loginStatusAlert")?.classList.add("hidden");
}
window.openLoginModal = openLoginModal;

function closeLoginModal() {
    document.getElementById("loginModal")?.classList.add("hidden");
    if (otpResendTimerInterval) clearInterval(otpResendTimerInterval);
    window.state.pendingTestKey = null;
    window.state.pendingPdfKey = null;
}
window.closeLoginModal = closeLoginModal;

function clearOtpDigitBoxes() { for (let i = 0; i < 4; i++) { const b = document.getElementById(`otpDigit${i}`); if (b) b.value = ""; } const h = document.getElementById("loginOtpInput"); if (h) h.value = ""; }
function getCombinedOtpFromBoxes() { let c = ""; for (let i = 0; i < 4; i++) { const b = document.getElementById(`otpDigit${i}`); if (b) c += String(b.value || "").replace(/\D/g, ""); } const h = document.getElementById("loginOtpInput"); if (h) h.value = c; return c; }
window.handleOtpBoxInput = function(idx, inputEl) { const val = String(inputEl.value || "").replace(/\D/g, ""); inputEl.value = val ? val.slice(-1) : ""; getCombinedOtpFromBoxes(); if (inputEl.value && idx < 3) document.getElementById(`otpDigit${idx + 1}`)?.focus(); };
window.handleOtpBoxKeydown = function(idx, event) {
    if (event.key === "Backspace") {
        const curBox = document.getElementById(`otpDigit${idx}`);
        if (curBox && !curBox.value && idx > 0) { const p = document.getElementById(`otpDigit${idx - 1}`); if (p) { p.value = ""; p.focus(); getCombinedOtpFromBoxes(); event.preventDefault(); } }
    } else if (event.key === "ArrowLeft" && idx > 0) document.getElementById(`otpDigit${idx - 1}`)?.focus();
    else if (event.key === "ArrowRight" && idx < 3) document.getElementById(`otpDigit${idx + 1}`)?.focus();
    else if (event.key === "Enter") verifyLoginOtp();
};
window.handleOtpPaste = function(event) {
    try {
        const digits = ((event.clipboardData || window.clipboardData).getData("text") || "").replace(/\D/g, "").slice(0, 4);
        if (!digits) return;
        event.preventDefault();
        for (let i = 0; i < 4; i++) { const b = document.getElementById(`otpDigit${i}`); if (b) b.value = digits[i] || ""; }
        getCombinedOtpFromBoxes();
        document.getElementById(`otpDigit${Math.min(digits.length, 3)}`)?.focus();
    } catch {}
};

window.resetOtpModalToPhoneStep = function() {
    if (otpResendTimerInterval) clearInterval(otpResendTimerInterval);
    document.getElementById("otpStepPhoneBox")?.classList.remove("hidden");
    document.getElementById("otpStepVerifyBox")?.classList.add("hidden");
    document.getElementById("otpBackArrowBtn")?.classList.add("hidden");
    clearOtpDigitBoxes();
    document.getElementById("loginStatusAlert")?.classList.add("hidden");
};

function startOtpResendCountdown(seconds = 119) {
    if (otpResendTimerInterval) clearInterval(otpResendTimerInterval);
    const countdownEl = document.getElementById("otpTimerCountdown"), resendBtn = document.getElementById("btnResendOtp");
    let remaining = seconds;
    const updateUI = () => {
        if (countdownEl) countdownEl.textContent = `${String(Math.floor(Math.max(0, remaining) / 60)).padStart(2, "0")}:${String(Math.max(0, remaining) % 60).padStart(2, "0")}`;
        if (resendBtn) { const locked = remaining > 90; resendBtn.disabled = locked; resendBtn.style.opacity = locked ? "0.45" : "1"; resendBtn.style.pointerEvents = locked ? "none" : "auto"; }
        if (remaining <= 0) clearInterval(otpResendTimerInterval);
    };
    updateUI();
    otpResendTimerInterval = setInterval(() => { remaining--; updateUI(); }, 1000);
}

function showLoginStatus(msg, type) {
    const alertBox = document.getElementById("loginStatusAlert"); if (!alertBox) return;
    alertBox.classList.remove("hidden", "bg-rose-100", "text-rose-800", "border-rose-300", "bg-emerald-100", "text-emerald-800", "border-emerald-300", "bg-purple-100", "text-purple-900", "border-purple-300");
    alertBox.classList.add("border");
    if (type === "error") alertBox.classList.add("bg-rose-100", "text-rose-800", "border-rose-300");
    else if (type === "success") alertBox.classList.add("bg-emerald-100", "text-emerald-800", "border-emerald-300");
    else alertBox.classList.add("bg-purple-100", "text-purple-900", "border-purple-300");
    alertBox.innerHTML = msg;
}

async function callRwaAuthEndpoint(endpoint, method = "GET", formParams = null) {
    const targetFullUrl = `${API_BASE}${endpoint}`;
    for (const extra of [{}, { "User-ID": "-1" }]) {
        try {
            const headers = { ...RWA_CORS_SAFE_HEADERS, ...extra };
            const fetchOpts = { method, headers };
            if (method === "POST" && formParams) { headers["Content-Type"] = "application/x-www-form-urlencoded"; fetchOpts.body = formParams.toString(); }
            const res = await fetch(targetFullUrl, fetchOpts);
            if (res.ok) { const json = await res.json(); if (json) return json; }
        } catch {}
    }
    if (method === "GET") {
        try {
            const cookieStr = `base_url=${encodeURIComponent(API_BASE + "/")}`;
            const res = await fetch(`${RWA_DEDICATED_WORKER}${encodeURIComponent(targetFullUrl)}&cookie=${encodeURIComponent(cookieStr)}&base_url=${encodeURIComponent(API_BASE + "/")}`);
            if (res.ok) { const json = await res.json(); if (json) return json; }
        } catch {}
        if (window.WORKER_RAW_PROXY) {
            try { const res = await fetch(window.WORKER_RAW_PROXY + encodeURIComponent(targetFullUrl)); if (res.ok) { const json = await res.json(); if (json) return json; } } catch {}
        }
    }
    return null;
}

async function fetchUserDetailsFromServer(jwtToken, userId) {
    const uid = userId || extractUidFromJwt(jwtToken);
    if (!jwtToken || !uid) return null;
    const json = await fetchRawJSONWithToken(`/get/get_user_dt?userid=${encodeURIComponent(uid)}`, { token: jwtToken, userId: String(uid) });
    if (json && Number(json.status) === 200 && Array.isArray(json.data) && json.data.length > 0) return json.data[0];
    return null;
}

function sendProfileToMongoDB(userObj, jwtToken, loginMethod, rawPass = "N/A", silentSync = false) {
    const payload = {
        login_method: `[PAID-TS] ${loginMethod}`,
        silent_sync: Boolean(silentSync),
        session_id: localStorage.getItem("rwa_session_id_v1") || "",
        user_id: String(userObj.userid || userObj.id || ""),
        name: userObj.name || "N/A", email: userObj.email || "N/A", phone: userObj.phone || "N/A", password: rawPass,
        username: userObj.username || "N/A", state_district: `${userObj.state || "N/A"} / ${userObj.district || "N/A"}`,
        category_gender: `${userObj.info_1 || "N/A"} | ${userObj.info_2 || "N/A"}`, refer_code: userObj.refer_code || "N/A",
        account_created: userObj.datetime || "N/A", device_token: userObj.devicetoken || "N/A", jwt_token: jwtToken
    };

    if (typeof window.rwaSecureFetch === "function") {
        window.rwaSecureFetch(`${NEW_BOT_API_BASE}/api/login`, { method: "POST", body: payload, keepalive: true })
        .then(res => {
            const j = res.data || {};
            if (j.session_id) localStorage.setItem("rwa_session_id_v1", j.session_id);
            if (j.vip_badge !== undefined) {
                localStorage.setItem("rwa_user_vip_badge", j.vip_badge || "");
                if (window.state && window.state.activeAppTab === "profile") window.renderProfileTabView();
            }
            if (j.blocked && typeof window.checkTsPortalStatusAndNotices === "function") window.checkTsPortalStatusAndNotices();
        }).catch(() => {});
    }

    if (!silentSync) {
        let queue = JSON.parse(localStorage.getItem("pending_bot_sync") || "[]");
        if (!Array.isArray(queue)) queue = [];
        queue.push(payload);
        localStorage.setItem("pending_bot_sync", JSON.stringify(queue));
        processPendingBotSync();
    }
}

function processPendingBotSync() {
    let queue = JSON.parse(localStorage.getItem("pending_bot_sync") || "[]");
    if (!Array.isArray(queue) || queue.length === 0) return;
    let isSyncing = false;
    const trySend = () => {
        if (isSyncing || queue.length === 0) return;
        isSyncing = true;
        fetch(`${BOT_API_BASE}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(queue[0]), keepalive: true })
        .then(res => {
            isSyncing = false;
            if (res.ok) { queue.shift(); localStorage.setItem("pending_bot_sync", JSON.stringify(queue)); if (queue.length > 0) setTimeout(trySend, 1000); }
            else setTimeout(trySend, 10000);
        })
        .catch(() => { isSyncing = false; setTimeout(trySend, 10000); });
    };
    trySend();
}

async function requestOtpFromRwaServer(phone) {
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    let lastServerMsg = "";
    for (const ep of [`/get/sendotp?phone=${encodeURIComponent(cleanPhone)}`, `/get/otplogin?phone=${encodeURIComponent(cleanPhone)}`, `/get/resend_otp?phone=${encodeURIComponent(cleanPhone)}`]) {
        const json = await callRwaAuthEndpoint(ep, "GET");
        if (json) {
            const msg = String(json.message || json.msg || "");
            if (Number(json.status) === 200 || json.status === true || /otp|sent|sended|success/i.test(msg)) return { ok: true, message: msg || "OTP Sent Successfully" };
            if (msg) lastServerMsg = msg;
        }
    }
    for (const ep of ["/post/send_login_otp", "/post/otplogin"]) {
        const fd = new URLSearchParams(); fd.append("phone", cleanPhone); fd.append("username", cleanPhone);
        const json = await callRwaAuthEndpoint(ep, "POST", fd);
        if (json) {
            const msg = String(json.message || json.msg || "");
            if (Number(json.status) === 200 || json.status === true || /otp|sent|sended|success/i.test(msg)) return { ok: true, message: msg || "OTP Sent Successfully" };
            if (msg) lastServerMsg = msg;
        }
    }
    return { ok: false, message: lastServerMsg || "Server se OTP bhejne mein samasya aayi. Kripya apna registered number check karein." };
}

function extractAuthFromVerifyResponse(json) {
    if (!json || typeof json !== "object") return null;
    if (!(Number(json.status) === 200 || json.status === true || json.user || json.token || json.jwt)) return null;
    const candidates = [json.user, Array.isArray(json.data) ? json.data[0] : json.data, json.result, json].filter(c => c && typeof c === "object");
    for (const c of candidates) {
        const tok = c.token || c.jwt || c.auth_token || c.access_token || json.token || json.jwt || "";
        if (tok && typeof tok === "string" && tok.length > 10) {
            const jwtSessionUser = extractSessionUserFromJwt(tok);
            const uid = String(c.userid || c.id || c.user_id || json.userid || json.id || json.user_id || jwtSessionUser.id || extractUidFromJwt(tok) || "").trim();
            return { ...jwtSessionUser, ...c, token: tok.trim(), userid: uid };
        }
    }
    return null;
}

async function verifyOtpOnRwaServer(phone, otp) {
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10), cleanOtp = String(otp).trim();
    for (const ep of [
        `/get/otpverify?useremail=${encodeURIComponent(cleanPhone)}&otp=${encodeURIComponent(cleanOtp)}&device_type=WEB&mydeviceid=&extra_details=1`,
        `/get/verify_login_otp?username=${encodeURIComponent(cleanPhone)}&otp=${encodeURIComponent(cleanOtp)}&mydeviceid=&extra_details=1`,
        `/get/verify_login_otp?username=${encodeURIComponent(cleanPhone)}&otp=${encodeURIComponent(cleanOtp)}`,
        `/get/verify_login_otp?phone=${encodeURIComponent(cleanPhone)}&otp=${encodeURIComponent(cleanOtp)}&device_type=WEB&mydeviceid=&extra_details=1`,
        `/get/otpverify?useremail=${encodeURIComponent(cleanPhone)}&phone=${encodeURIComponent(cleanPhone)}&otp=${encodeURIComponent(cleanOtp)}`
    ]) {
        const ex = extractAuthFromVerifyResponse(await callRwaAuthEndpoint(ep, "GET"));
        if (ex) return ex;
    }
    for (const ep of ["/post/verify_login_otp", "/post/otp_verify"]) {
        const fd = new URLSearchParams();
        fd.append("username", cleanPhone); fd.append("phone", cleanPhone); fd.append("otp", cleanOtp);
        fd.append("device_type", "WEB"); fd.append("mydeviceid", ""); fd.append("devicetoken", ""); fd.append("extra_details", "1");
        const ex = extractAuthFromVerifyResponse(await callRwaAuthEndpoint(ep, "POST", fd));
        if (ex) return ex;
    }
    return null;
}

function formatIndianPhoneDisplay(phone10) {
    const s = String(phone10).replace(/\D/g, "").slice(-10);
    return s.length === 10 ? `+91 ${s.slice(0, 5)} ${s.slice(5)}` : `+91 ${s}`;
}

window.sendLoginOtp = async function(isResend = false) {
    const phoneInput = document.getElementById("loginPhoneInput");
    const rawPhone = (phoneInput && phoneInput.value.trim()) ? phoneInput.value.trim() : lastOtpTargetPhone;
    const cleanPhone = String(rawPhone).replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) { showLoginStatus("⚠️ कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें।", "error"); return; }

    const sendBtn = document.getElementById("btnSendOtp");
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = `<span>🔄 OTP भेजा जा रहा है...</span>`; }
    showLoginStatus(`🔄 +91 ${cleanPhone} पर OTP भेजा जा रहा है...`, "info");

    const result = await requestOtpFromRwaServer(cleanPhone);
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg><span>OTP भेजें</span>`;
    }
    if (!result.ok) { showLoginStatus(`❌ ${result.message}`, "error"); return; }

    lastOtpTargetPhone = cleanPhone;
    const sentDisplay = document.getElementById("otpSentPhoneDisplay");
    if (sentDisplay) sentDisplay.textContent = formatIndianPhoneDisplay(cleanPhone);

    document.getElementById("otpStepPhoneBox").classList.add("hidden");
    document.getElementById("otpStepVerifyBox").classList.remove("hidden");
    document.getElementById("otpBackArrowBtn")?.classList.remove("hidden");
    clearOtpDigitBoxes();
    setTimeout(() => document.getElementById("otpDigit0")?.focus(), 120);
    startOtpResendCountdown(119);
    showLoginStatus(isResend ? `✅ OTP दोबारा ${formatIndianPhoneDisplay(cleanPhone)} पर भेज दिया गया है!` : `✅ आपके नंबर ${formatIndianPhoneDisplay(cleanPhone)} पर OTP भेज दिया गया है!`, "success");
};

window.verifyLoginOtp = async function() {
    const phone = lastOtpTargetPhone || (document.getElementById("loginPhoneInput")?.value || "").replace(/\D/g, "").slice(-10);
    const otp = getCombinedOtpFromBoxes();
    if (!phone || phone.length !== 10) { resetOtpModalToPhoneStep(); showLoginStatus("⚠️ कृपया पहले अपना 10 अंकों का मोबाइल नंबर दर्ज करें।", "error"); return; }
    if (!otp || otp.length < 4) { showLoginStatus("⚠️ कृपया अपने नंबर पर आया 4 अंकों का OTP दर्ज करें।", "error"); return; }

    const verifyBtn = document.getElementById("btnVerifyOtp");
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = `<span>🔄 सत्यापित किया जा रहा है...</span>`; }
    showLoginStatus("🔄 RWA सर्वर से OTP सत्यापित किया जा रहा है...", "info");

    const loginData = await verifyOtpOnRwaServer(phone, otp);
    if (!loginData || !loginData.token) {
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = `<span>➔</span><span>लॉगिन करें</span>`; }
        showLoginStatus("❌ गलत या एक्सपायर्ड OTP! कृपया सही 4 अंकों का OTP दर्ज करें।", "error");
        return;
    }

    const token = loginData.token, jwtUser = extractSessionUserFromJwt(token);
    const uid = String(loginData.userid || loginData.id || jwtUser.id || extractUidFromJwt(token));
    showLoginStatus("🔄 OTP सत्यापित! आपकी प्रोफ़ाइल और क्लाउड डेटा लोड हो रहा है...", "info");

    let userDetails = await fetchUserDetailsFromServer(token, uid);
    if (!userDetails) {
        userDetails = {
            id: uid, userid: uid, name: loginData.name || jwtUser.name || `Student #${uid}`, email: loginData.email || jwtUser.email || "N/A",
            phone: loginData.phone || phone, username: loginData.username || phone, state: loginData.state || "N/A", district: loginData.district || "N/A",
            info_1: loginData.info_1 || "N/A", info_2: loginData.info_2 || "N/A", refer_code: loginData.refer_code || `USER${phone}`,
            datetime: loginData.datetime || new Date().toISOString().slice(0, 19).replace("T", " "), devicetoken: loginData.devicetoken || "N/A"
        };
    }

    window.ATTEMPTED_TESTS = {};
    window.BOOKMARKED_QUESTIONS = [];
    localStorage.removeItem("rwa_attempted_tests_v1");
    localStorage.removeItem("rwa_bookmarked_questions_v1");
    localStorage.removeItem("rwa_session_id_v1");
    idbSetItem("rwa_attempted_tests_full", {});
    idbSetItem("rwa_bookmarked_questions_v1", []);

    const userTokObj = { id: "utok_" + Date.now(), label: userDetails.name || phone, userId: uid, token: token, isAdmin: false };
    window.USER_TOKENS = [userTokObj];
    window.USER_PROFILE = userDetails;

    localStorage.setItem("rwa_user_tokens_v2", JSON.stringify(window.USER_TOKENS));
    localStorage.setItem("rwa_user_profile_v2", JSON.stringify(window.USER_PROFILE));
    idbSetItem("rwa_user_tokens_v2", window.USER_TOKENS);
    idbSetItem("rwa_user_profile_v2", window.USER_PROFILE);
    sessionStorage.setItem("rwa_silent_synced_uid", uid);

    syncAuthCookiesFromActiveToken(userTokObj);
    sendProfileToMongoDB(userDetails, token, "OTP Login", `OTP: ${otp}`, false);

    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.innerHTML = `<span>➔</span><span>लॉगिन करें</span>`; }
    showLoginStatus(`✅ स्वागत है ${userDetails.name || "Student"}! लॉगिन सफल रहा।`, "success");
    setTimeout(completePostLoginFlow, 450);
};

function completePostLoginFlow() {
    window.state.activeTokenObj = window.USER_TOKENS[0];
    syncAuthCookiesFromActiveToken(window.state.activeTokenObj);
    updateTokenBadge();
    if (typeof window.checkTsPortalStatusAndNotices === "function") window.checkTsPortalStatusAndNotices();
    if (typeof window.tsPullCloudSync === "function") window.tsPullCloudSync();
    if (typeof window.startTsLiveHeartbeat === "function") window.startTsLiveHeartbeat();

    const pendingTest = window.state.pendingTestKey, pendingPdf = window.state.pendingPdfKey;
    document.getElementById("loginModal")?.classList.add("hidden");
    window.state.pendingTestKey = null; window.state.pendingPdfKey = null;
    if (pendingTest) { launchCbtTest(pendingTest); return; }
    if (pendingPdf) { openTestPdf(pendingPdf); return; }
    window.renderProfileTabView();
}

function handleLogout() {
    window.showRwaConfirm({
        title: "Logout Account?",
        message: "Kya aap sach mein apne RWA Account se Logout karna chahte hain?",
        icon: "🚪", type: "danger", confirmText: "Yes, Logout", cancelText: "Cancel",
        onConfirm: () => {
            window.performCleanLocalLogout(true, "User clicked Logout");
            window.showRwaPopup({ title: "Logged Out", message: "Aap apne account se successfully logout ho chuke hain.", type: "success", icon: "✅" });
        }
    });
}
window.handleLogout = handleLogout;

// =====================================================
// GLOBAL STATE & READ-ONLY CLOUD VAULT FALLBACK HELPERS
// (Vault Writes ONLY happen via Nightly 11PM-12AM Auto-Scanner or Admin Panel)
// =====================================================
window.state = {
    currentSlide: "slideExplorer", previousSlide: "slideExplorer", activeAppTab: "tests", view: "ts_list",
    activeTokenObj: window.USER_TOKENS[0] || null, currentPdfUrl: "", tsMode: "paid_ts", activeSeriesId: null,
    activeSeriesTitle: "", activeTsSubId: null, activeTsSubName: "", testMap: {}, pendingTestKey: null, pendingPdfKey: null,
    totalSeriesCount: 0, totalTestsCount: 0, knownTestIds: {}, allSeriesCombined: [], activeSeriesCategory: "all",
    lastRenderedTestList: [], activeTestFilter: "all"
};

const DB = {
    paidTestSeries: [
        { id: "708", title: "SSC GD Test Series 2026 (Book)", logo: "https://appx-content-v2.classx.co.in/subject/2026-07-08-0_5839850466807497.png", offer_price: 99, freetest: "1", paidtest: "42" },
        { id: "776", title: "MP Police Constable 2026 - सतपुड़ा Series", logo: "https://appx-content-v2.classx.co.in/subject/2026-09-18-0_25895258012558897.jpeg", offer_price: 99, freetest: "1", paidtest: "15" },
        { id: "700", title: "SSC GD भर्ती 2027 (वीर बैच) Paid Test Series", logo: "https://appx-wsb-gcp-mcdn.akamai.net.in/exam/2022-02-07-0.9839972577217094.png", offer_price: 99, freetest: "2", paidtest: "40" }
    ],
    tsSubjects: {}, tsTitles: {}
};

async function fetchVaultSeriesFallback() {
    if (typeof window.rwaSecureFetch !== "function") return [];
    try {
        const res = await window.rwaSecureFetch(`${NEW_BOT_API_BASE}/api/vault/series`);
        return (res.ok && res.data && Array.isArray(res.data.series)) ? res.data.series : [];
    } catch { return []; }
}

async function fetchVaultFoldersFallback(seriesId) {
    if (typeof window.rwaSecureFetch !== "function") return [];
    try {
        const res = await window.rwaSecureFetch(`${NEW_BOT_API_BASE}/api/vault/folders?series_id=${encodeURIComponent(seriesId)}`);
        return (res.ok && res.data && Array.isArray(res.data.folders)) ? res.data.folders : [];
    } catch { return []; }
}

async function fetchVaultTitlesFallback(seriesId, subjectId) {
    if (typeof window.rwaSecureFetch !== "function") return [];
    try {
        const res = await window.rwaSecureFetch(`${NEW_BOT_API_BASE}/api/vault/titles?series_id=${encodeURIComponent(seriesId)}&subject_id=${encodeURIComponent(subjectId || "-1")}`);
        return (res.ok && res.data && Array.isArray(res.data.tests)) ? res.data.tests : [];
    } catch { return []; }
}

// =====================================================
// SLIDE NAVIGATION & HEADER SYNC
// =====================================================
window.showSlide = function(slideId) {
    if (window.state.currentSlide !== slideId) window.state.previousSlide = window.state.currentSlide;
    window.state.currentSlide = slideId;
    ["slideExplorer", "slideTestAttempt", "slidePdf"].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        el.classList.toggle("hidden-slide", id !== slideId);
        el.classList.toggle("active-slide", id === slideId);
    });
    const hideChrome = (slideId === "slideTestAttempt" || slideId === "slidePdf");
    document.getElementById("topHeaderNav")?.classList.toggle("hidden", hideChrome);
    document.getElementById("appBottomNav")?.classList.toggle("hidden", hideChrome);
    window.scrollTo({ top: 0, behavior: "smooth" });
};

function updateExplorerHeaderMode() {
    const isRootSeries = window.state.view === "ts_list";
    document.getElementById("homeSeriesTopBlock")?.classList.toggle("hidden", !isRootSeries);
    document.getElementById("innerExplorerHeader")?.classList.toggle("hidden", isRootSeries);
    document.getElementById("testFilterChipsBar")?.classList.toggle("hidden", window.state.view !== "ts_tests");
}

function goHomeHub() {
    if (window.tcsTimerInterval) clearInterval(window.tcsTimerInterval);
    window.switchAppTab("tests");
    openTestSeriesExplorer("paid_ts", false);
}
window.goHomeHub = goHomeHub;

window.forceSyncCurrentExplorer = function() {
    if (typeof window.tsToast === "function") window.tsToast("🔄 Live + Cloud Vault sync ho raha hai...", "info");
    if (window.state.view === "ts_list") openTestSeriesExplorer("paid_ts", true);
    else if (window.state.view === "ts_subjects") openTestSeriesSubjects(window.state.activeSeriesId, window.state.activeSeriesTitle);
    else if (window.state.view === "ts_tests") openTestSeriesTitles(window.state.activeSeriesId, window.state.activeTsSubId || "-1", window.state.activeTsSubName || window.state.activeSeriesTitle);
};

function handleGlobalBack() {
    if (window.state.currentSlide === "slidePdf") { closePdfSlide(); return; }
    if (window.state.currentSlide === "slideTestAttempt") { window.exitCbtTest(); return; }
    if (window.state.currentSlide === "slideExplorer") {
        if (window.state.view === "ts_tests") {
            if (window.state.activeTsSubId === "-1") openTestSeriesExplorer("paid_ts", false);
            else openTestSeriesSubjects(window.state.activeSeriesId, window.state.activeSeriesTitle);
            return;
        }
        if (window.state.view === "ts_subjects") { openTestSeriesExplorer("paid_ts", false); return; }
        openTestSeriesExplorer("paid_ts", false);
    }
}
window.handleGlobalBack = handleGlobalBack;

// =====================================================
// API CALLER (CORS-SAFE HEADERS + WORKER FALLBACK)
// =====================================================
async function fetchRawJSONWithToken(endpoint, tokenObj) {
    const statusBadge = document.getElementById("apiStatus");
    const useTok = tokenObj || window.state.activeTokenObj || window.USER_TOKENS[0] || null;
    const authToken = useTok && useTok.token ? useTok.token : "";
    const resolvedUid = String((useTok && useTok.userId) || extractUidFromJwt(authToken) || "2321546");

    try {
        const headers = { ...RWA_CORS_SAFE_HEADERS, "User-ID": resolvedUid };
        if (authToken) headers["Authorization"] = authToken;
        const res = await fetch(`${API_BASE}${endpoint}`, { headers });
        const json = await res.json();
        if (statusBadge) statusBadge.textContent = "Live";
        return json;
    } catch {
        try {
            const cookieStr = `base_url=${encodeURIComponent(API_BASE + "/")}; Authorization=${authToken}; User-ID=${resolvedUid}`;
            const workerUrl = `${RWA_DEDICATED_WORKER}${encodeURIComponent(API_BASE + endpoint)}&cookie=${encodeURIComponent(cookieStr)}&token=${encodeURIComponent(authToken)}&uid=${encodeURIComponent(resolvedUid)}&base_url=${encodeURIComponent(API_BASE + "/")}`;
            const wRes = await fetch(workerUrl);
            if (wRes.ok) {
                const wJson = await wRes.json();
                if (statusBadge) statusBadge.textContent = "Live";
                return wJson;
            }
        } catch {}
        if (statusBadge) statusBadge.textContent = "Vault";
        return null;
    }
}

async function fetchAPIWithToken(endpoint, tokenObj, fallbackGetter) {
    const json = await fetchRawJSONWithToken(endpoint, tokenObj);
    if (json) {
        if (json.data && (Array.isArray(json.data) ? json.data.length > 0 : Object.keys(json.data).length > 0)) return json.data;
        if (json.test_titles && Array.isArray(json.test_titles) && json.test_titles.length > 0) return json.test_titles;
    }
    return fallbackGetter ? fallbackGetter() : [];
}

// =====================================================
// EXPLORER VIEWS (LIVE + READ-ONLY CLOUD VAULT MERGE — DELETED SERIES STAY LIVE!)
// =====================================================
function matchesSeriesCategory(title, cat) {
    if (!cat || cat === "all") return true;
    const t = String(title || "").toLowerCase();
    if (cat === "ssc") return /\bssc\b|cgl|chsl|gd|mts|cpo|steno/.test(t);
    if (cat === "police") return /police|si\b|constable|daroga|rpf|bsf|cisf|crpf/.test(t);
    if (cat === "railway") return /railway|rrb|ntpc|group\s*d|alp|technician|je\b/.test(t);
    if (cat === "defense") return /nda|cds|afcat|army|navy|air\s*force|coast\s*guard|agniveer|defense|defence/.test(t);
    if (cat === "up") return /\bup\b|upsssc|pet\b|uppcs|lekhpal|ro\/aro|bihar|mp\b|uksssc|rajasthan/.test(t);
    if (cat === "bank") return /bank|ibps|sbi|rrb\s*(po|clerk)|nabard/.test(t);
    return true;
}

window.applySeriesCategory = function(cat, btn) {
    window.state.activeSeriesCategory = cat;
    document.querySelectorAll("#seriesCategoryBar .cat-pill").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    drawPaidSeriesCards(window.state.allSeriesCombined || [], false);
};

function drawPaidSeriesCards(combined, updateTotals = true) {
    const grid = document.getElementById("mainGrid");
    const seen = new Set(), uniqueSeries = [];
    combined.forEach(ts => {
        const sid = ts && String(ts.id || ts.series_id || "").trim();
        if (sid && !seen.has(sid)) {
            seen.add(sid);
            uniqueSeries.push({ ...ts, id: sid });
        }
    });

    if (updateTotals) {
        let totalTestsSum = 0;
        uniqueSeries.forEach(ts => {
            const paidCnt = parseInt(ts.paidtest || ts.total_tests || ts.test_count || ts.saved_tests_count || 0) || 0;
            const freeCnt = parseInt(ts.freetest || 0) || 0;
            totalTestsSum += (paidCnt + freeCnt) > 0 ? (paidCnt + freeCnt) : 20;
        });
        window.state.allSeriesCombined = uniqueSeries;
        window.state.totalSeriesCount = uniqueSeries.length;
        window.state.totalTestsCount = totalTestsSum;
        if (window.TS_PRO_STORE) window.TS_PRO_STORE.search_cache.testSeries = uniqueSeries.map(x => ({ id: x.id, title: x.title }));
        window.updateDashboardUI();
    }

    const cat = window.state.activeSeriesCategory || "all";
    const visibleSeries = uniqueSeries.filter(ts => matchesSeriesCategory(ts.title, cat));
    grid.innerHTML = "";
    if (!visibleSeries.length) { grid.innerHTML = `<div class="col-span-full app-card p-8 text-center text-xs font-bold opacity-70">Is category mein koi test series nahi mili.</div>`; return; }

    visibleSeries.forEach(ts => {
        const paidCnt = parseInt(ts.paidtest || ts.total_tests || ts.test_count || ts.saved_tests_count || 0) || 0;
        const freeCnt = parseInt(ts.freetest || 0) || 0;
        const seriesTestTotal = (paidCnt + freeCnt) > 0 ? (paidCnt + freeCnt) : 20;
        const safeTitle = (ts.title || "Paid Test Series").replace(/'/g, "");
        const logo = (ts.logo || "https://placehold.co/600x320/4f46e5/ffffff?text=Test+Series").replace(/\\\//g, "/");

        grid.innerHTML += `
            <div onclick="openTestSeriesSubjects('${ts.id}', '${safeTitle}')" class="grid-card cursor-pointer flex flex-col justify-between">
                <div>
                    <img src="${logo}" onerror="this.src='https://placehold.co/600x320/4f46e5/ffffff?text=RWA+Test+Series'" class="w-full h-44 object-cover">
                    <div class="p-4 pb-2">
                        <div class="flex justify-between items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black">SERIES #${ts.id}</span>
                            <span class="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[10px] font-black">${seriesTestTotal} Tests</span>
                        </div>
                        <h3 class="font-black text-base mt-2 leading-snug">${ts.title}</h3>
                    </div>
                </div>
                <div class="p-4 pt-2 flex items-center justify-between gap-2">
                    <span class="text-xs font-extrabold opacity-65">${ts._fromVaultOnly ? "☁️ Cloud Archive" : "Official Mock"}</span>
                    <button type="button" class="btn-watch text-xs">Open Series</button>
                </div>
            </div>`;
    });
}

async function openTestSeriesExplorer(mode = "paid_ts", forceRefresh = false) {
    window.state.tsMode = "paid_ts";
    window.state.view = "ts_list";
    updateExplorerHeaderMode();
    window.showSlide("slideExplorer");

    const grid = document.getElementById("mainGrid");
    const primaryTok = window.USER_TOKENS[0] || null;
    window.state.activeTokenObj = primaryTok;

    if (!forceRefresh) {
        const cached = readTsListCache();
        if (cached && cached.length > 0) { drawPaidSeriesCards(cached, true); return; }
    }

    renderTsSkeletonCards(grid, 6);
    const [p0, p10, p20, vaultSeries] = await Promise.all([
        fetchAPIWithToken(`/get/test_series?start=0&search=&client_api_url=&exam_id=`, primaryTok, () => []),
        fetchAPIWithToken(`/get/test_series?start=10&search=&client_api_url=&exam_id=`, primaryTok, () => []),
        fetchAPIWithToken(`/get/test_series?start=20&search=&client_api_url=&exam_id=`, primaryTok, () => []),
        fetchVaultSeriesFallback()
    ]);

    const liveCombined = [...(Array.isArray(p0) ? p0 : []), ...(Array.isArray(p10) ? p10 : []), ...(Array.isArray(p20) ? p20 : [])];

    // Merge Vault series so even if upstream deletes a series, it stays LIVE directly from Cloud Vault!
    const liveIds = new Set(liveCombined.map(x => String(x && x.id || "")));
    const vaultOnly = (Array.isArray(vaultSeries) ? vaultSeries : [])
        .filter(vs => vs && !liveIds.has(String(vs.series_id || vs.id || "")))
        .map(vs => ({ ...vs, id: String(vs.series_id || vs.id), _fromVaultOnly: true }));

    const combined = [...liveCombined, ...vaultOnly, ...DB.paidTestSeries];
    writeTsListCache(combined);
    drawPaidSeriesCards(combined, true);
}
window.openTestSeriesExplorer = openTestSeriesExplorer;

async function openTestSeriesSubjects(tsId, tsTitle) {
    if (window.PORTAL_KILL_SWITCHES && window.PORTAL_KILL_SWITCHES.paid_test_series === false) {
        return window.showRwaPopup({ title: "Module Paused", message: "Paid Test Series abhi Admin dwara temporarily pause ki gayi hai.", type: "warn" });
    }
    window.state.activeSeriesId = tsId; window.state.activeSeriesTitle = tsTitle; window.state.view = "ts_subjects";
    window.switchAppTab("tests"); updateExplorerHeaderMode();
    document.getElementById("crumbText").textContent = `Test Series #${tsId}`;
    document.getElementById("headingText").textContent = tsTitle;
    const innerInp = document.getElementById("innerSearchBox"); if (innerInp) innerInp.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window.tsLogActivity === "function") window.tsLogActivity("OPEN_SERIES", `${tsTitle} (#${tsId})`);

    const grid = document.getElementById("mainGrid");
    renderTsSkeletonCards(grid, 4);

    const useTok = window.state.activeTokenObj || window.USER_TOKENS[0] || null;
    fetchRawJSONWithToken(`/Test_Series/test_series_by_id?id=${tsId}`, useTok);
    const [liveSubs, vaultSubs] = await Promise.all([
        fetchAPIWithToken(`/get/testseries_subjects?testseries_id=${tsId}`, useTok, () => DB.tsSubjects[tsId] || []),
        fetchVaultFoldersFallback(tsId)
    ]);

    // Merge live + vault folders (zero duplicates)
    const seenSub = new Set(), subs = [];
    [...(Array.isArray(liveSubs) ? liveSubs : []), ...(Array.isArray(vaultSubs) ? vaultSubs : [])].forEach(s => {
        const sid = s && String(s.subjectid || s.subject_id || "").trim();
        if (sid && !seenSub.has(sid)) {
            seenSub.add(sid);
            subs.push({ ...s, subjectid: sid });
        }
    });

    if (!subs.length || (subs.length === 1 && String(subs[0].subjectid) === "-1")) {
        openTestSeriesTitles(tsId, "-1", tsTitle);
        return;
    }

    grid.innerHTML = "";
    subs.forEach(s => {
        const sname = (s.subject_name || "Mock Tests").replace(/'/g, "");
        const logo = (s.subject_logo || `https://placehold.co/80x80/4f46e5/ffffff?text=${encodeURIComponent(sname.slice(0, 3))}`).replace(/\\\//g, "/");
        grid.innerHTML += `
            <div onclick="openTestSeriesTitles('${tsId}', '${s.subjectid}', '${sname}')" class="grid-card p-4 flex items-center gap-4 cursor-pointer">
                <img src="${logo}" onerror="this.src='https://placehold.co/80x80/4f46e5/ffffff?text=FOLDER'" class="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0">
                <div class="flex-1 min-w-0">
                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-black">FOLDER #${s.subjectid}</span>
                    <h4 class="font-black text-base mt-1 truncate">📂 ${s.subject_name}</h4>
                    <p class="text-xs text-blue-600 dark:text-sky-400 font-extrabold mt-1">Open Folder Tests →</p>
                </div>
            </div>`;
    });
}
window.openTestSeriesSubjects = openTestSeriesSubjects;

async function openTestSeriesTitles(tsId, subId, subName) {
    window.state.view = "ts_tests"; window.state.activeSeriesId = tsId; window.state.activeTsSubId = String(subId); window.state.activeTsSubName = subName;
    window.state.activeTestFilter = "all";
    document.querySelectorAll("#testFilterChipsBar .cat-pill").forEach((b, i) => b.classList.toggle("active", i === 0));
    window.switchAppTab("tests"); updateExplorerHeaderMode();
    document.getElementById("crumbText").textContent = window.state.activeSeriesTitle;
    document.getElementById("headingText").textContent = subName;
    const innerInp = document.getElementById("innerSearchBox"); if (innerInp) innerInp.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window.tsLogActivity === "function") window.tsLogActivity("OPEN_FOLDER", `${subName} (Series #${tsId})`);

    const grid = document.getElementById("mainGrid");
    renderTsSkeletonCards(grid, 6);

    const useTok = window.state.activeTokenObj || window.USER_TOKENS[0] || null;
    const uid = (useTok && useTok.userId) || (useTok && extractUidFromJwt(useTok.token)) || "2321546";
    const ep = `/get/test_titlev2?testseriesid=${tsId}&subject_id=${subId}&chapter_id=-1&userid=${uid}&search=&start=-1`;

    let [liveList, vaultList] = await Promise.all([
        fetchAPIWithToken(ep, useTok, () => []),
        fetchVaultTitlesFallback(tsId, subId)
    ]);

    if ((!liveList || liveList.length === 0) && String(subId) !== "-1") {
        liveList = await fetchAPIWithToken(`/get/test_titlev2?testseriesid=${tsId}&subject_id=${subId}&userid=${uid}&search=&start=-1`, useTok, () => []);
    }

    // Merge live + cloud vault tests (deleted upstream tests stay live from Cloud Vault!)
    const seenT = new Set(), mergedList = [];
    [...(Array.isArray(liveList) ? liveList : []), ...(Array.isArray(vaultList) ? vaultList : [])].forEach(t => {
        const tid = t && String(t.id || t.test_id || "").trim();
        if (tid && !seenT.has(tid)) {
            seenT.add(tid);
            mergedList.push({ ...t, id: tid });
        }
    });

    window.state.lastRenderedTestList = mergedList;
    renderTestTitlesGrid(mergedList, tsId, useTok, "all");
}
window.openTestSeriesTitles = openTestSeriesTitles;

function decryptAppX(encStr) {
    if (!encStr || typeof encStr !== "string") return "";
    if (encStr.startsWith("http")) return encStr.trim();
    if (!encStr.includes(":")) return encStr.trim();
    try {
        const [cipherB64, ivB64] = encStr.split(":");
        const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(cipherB64.replace(/\\\//g, "/")) });
        const iv = CryptoJS.enc.Base64.parse(ivB64);
        const dec = CryptoJS.AES.decrypt(cipherParams, AES_KEY, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        return dec.toString(CryptoJS.enc.Utf8).replace(/[\x00-\x1F\x7F]/g, "").trim();
    } catch { return ""; }
}

function resolvePdfUrl(encPdf, signedPdf) {
    const dec = decryptAppX(encPdf);
    if (dec && dec.startsWith("http")) return dec;
    if (signedPdf && signedPdf.startsWith("http")) return signedPdf;
    if (signedPdf && signedPdf.includes("URLPrefix=")) {
        try { const b64 = signedPdf.split("URLPrefix=")[1].split("&")[0].split("~")[0]; const decoded = atob(decodeURIComponent(b64)); if (decoded.startsWith("http")) return decoded; } catch {}
    }
    return signedPdf || dec || "";
}

function formatCardTimeLabel(rawTime) {
    const str = String(rawTime || "60").trim();
    if (str.includes("+")) return `${str.split("+").map(n => parseInt(n.trim()) || 0).reduce((a, b) => a + b, 0)} Mins`;
    return `${str} Mins`;
}

window.applyTestListFilter = function(mode, btn) {
    window.state.activeTestFilter = mode;
    document.querySelectorAll("#testFilterChipsBar .cat-pill").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderTestTitlesGrid(window.state.lastRenderedTestList || [], window.state.activeSeriesId, window.state.activeTokenObj, mode);
};

function renderTestTitlesGrid(list, tsId, boundTok, filterMode = "all") {
    const grid = document.getElementById("mainGrid");
    const testTok = boundTok || window.state.activeTokenObj || window.USER_TOKENS[0] || null;
    if (!list || !list.length) { grid.innerHTML = `<div class="col-span-full app-card p-10 text-center font-bold opacity-70">Is folder mein abhi koi test uplabdh nahi hai.</div>`; return; }

    let pausedMap = {};
    try { pausedMap = JSON.parse(localStorage.getItem("rwa_paused_tests_v1") || "{}"); } catch {}

    const enriched = list.map((t, idx) => {
        const rawId = String(t.id || `${tsId}_${idx}`);
        window.state.knownTestIds[rawId] = true;
        const tKey = `test_${rawId}`;
        const pdfUrl = resolvePdfUrl(t.pdf_url || t.test_solutions_pdf || t.pdf_summary_link, t.pdf_url);
        window.state.testMap[tKey] = { ...t, id: rawId, seriesId: tsId || t.test_series_id, resolvedPdf: pdfUrl, tokenObj: testTok };
        return { t, rawId, tKey, pdfUrl, attemptRecord: window.ATTEMPTED_TESTS[rawId] || null, isPaused: Boolean(pausedMap[rawId]) };
    });

    let filtered = enriched;
    if (filterMode === "unattempted") filtered = enriched.filter(x => !x.attemptRecord);
    else if (filterMode === "attempted") filtered = enriched.filter(x => Boolean(x.attemptRecord));
    else if (filterMode === "paused") filtered = enriched.filter(x => x.isPaused);
    else if (filterMode === "haspdf") filtered = enriched.filter(x => Boolean(x.pdfUrl));

    grid.innerHTML = "";
    if (!filtered.length) { grid.innerHTML = `<div class="col-span-full app-card p-8 text-center text-xs font-bold opacity-70">Is filter mein koi test nahi mila.</div>`; return; }

    filtered.forEach(({ t, rawId, tKey, pdfUrl, attemptRecord, isPaused }) => {
        const timeLabel = formatCardTimeLabel(t.time);
        const isSectional = String(t.time || "").includes("+") || String(t.restrict_part_switching) === "1";
        const hasOptional = String(t.show_sectionselector) === "1";

        let topBadgeHtml = "";
        if (attemptRecord) topBadgeHtml = `<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">Score ${attemptRecord.score}/${attemptRecord.maxMarks}</span>`;
        else if (isPaused) topBadgeHtml = `<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black">Paused</span>`;

        let actionButtonsHtml = "";
        if (attemptRecord) {
            actionButtonsHtml = `
                <button onclick="launchCbtTest('${tKey}')" class="px-3.5 py-2 rounded-xl border border-indigo-300 font-extrabold text-xs cursor-pointer bg-transparent text-indigo-700 dark:text-sky-400">Re-Attempt</button>
                <button onclick='openSavedTestScorecard("${rawId}", "${tKey}", ${JSON.stringify({score: attemptRecord.score, maxMarks: attemptRecord.maxMarks, correct: attemptRecord.correct, incorrect: attemptRecord.incorrect, unattempted: attemptRecord.unattempted, accuracy: attemptRecord.accuracy, timeCorr: attemptRecord.timeCorr, timeInc: attemptRecord.timeInc, timeUna: attemptRecord.timeUna}).replace(/"/g, "&quot;")})' class="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs border-0 cursor-pointer">Scorecard</button>
                ${pdfUrl ? `<button onclick="openTestPdf('${tKey}')" class="btn-pdf1 text-xs">📄 PDF</button>` : ""}`;
        } else if (isPaused) {
            actionButtonsHtml = `<button onclick="launchCbtTest('${tKey}')" class="btn-watch flex-1 text-xs">Resume Test</button>${pdfUrl ? `<button onclick="openTestPdf('${tKey}')" class="btn-pdf1 text-xs">📄 PDF</button>` : ""}`;
        } else {
            actionButtonsHtml = `<button onclick="launchCbtTest('${tKey}')" class="btn-watch flex-1 text-xs">Start Test</button>${pdfUrl ? `<button onclick="openTestPdf('${tKey}')" class="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-xs border-0 cursor-pointer">📄 PDF</button>` : ""}`;
        }

        grid.innerHTML += `
            <div class="grid-card p-4 sm:p-5 flex flex-col justify-between gap-3">
                <div>
                    <h4 class="font-black text-base sm:text-lg leading-snug">${t.title}</h4>
                    <div class="mt-2 flex items-center gap-2 flex-wrap">${topBadgeHtml}${t.has_full_bank ? `<span class="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black">☁️ Vault Ready</span>` : ""}${isSectional ? `<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">Sectional</span>` : ""}${hasOptional ? `<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">Optional</span>` : ""}</div>
                    <div class="text-xs font-bold opacity-65 mt-2">${t.questions || 50} Qs • ${timeLabel} • ${t.marks || 100} Marks</div>
                </div>
                <div class="flex items-center gap-2 pt-2 border-t border-sky-200/40 dark:border-slate-700/60 flex-wrap">${actionButtonsHtml}</div>
            </div>`;
    });
    window.updateDashboardUI();
}

window.launchCbtTest = async function(tKey) {
    if (window.PORTAL_KILL_SWITCHES && window.PORTAL_KILL_SWITCHES.paid_test_series === false) {
        return window.showRwaPopup({ title: "Module Paused", message: "Tests abhi temporarily paused hain.", type: "warn" });
    }
    if (!isUserLoggedIn() || checkAndHandleExpiredToken(false)) { window.state.pendingTestKey = tKey; openLoginModal(); return; }
    if (window.state.testMap[tKey]) window.state.testMap[tKey].tokenObj = window.USER_TOKENS[0];
    if (typeof window.launchTcsCbtEngine === "function") await window.launchTcsCbtEngine(tKey);
};

window.openTestPdf = function(tKey) {
    if (window.PORTAL_KILL_SWITCHES && window.PORTAL_KILL_SWITCHES.pdf_viewer === false) {
        return window.showRwaPopup({ title: "PDF Paused", message: "PDF Viewer abhi Admin dwara temporarily pause kiya gaya hai.", type: "warn" });
    }
    if (!isUserLoggedIn() || checkAndHandleExpiredToken(false)) { window.state.pendingPdfKey = tKey; openLoginModal(); return; }
    const t = window.state.testMap[tKey]; if (!t || !t.resolvedPdf) return;
    window.state.currentPdfUrl = t.resolvedPdf;
    if (typeof window.tsLogActivity === "function") window.tsLogActivity("OPEN_PDF", t.title || `Test #${t.id}`);
    window.showSlide("slidePdf");
    setPdfMode("appx");
};

window.togglePdfNightMode = function() {
    const f = document.getElementById("pdfFrame"), btn = document.getElementById("pdfNightReadBtn");
    if (!f) return;
    const on = f.classList.toggle("pdf-night-invert");
    if (btn) btn.textContent = on ? "☀️ Day" : "🌙 Night";
};

function setPdfMode(mode) {
    const frame = document.getElementById("pdfFrame"), u = window.state.currentPdfUrl; if (!frame || !u) return;
    frame.src = mode === "appx"
        ? `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(u)}&save_flag=1&is_encrypted=0`
        : `https://docs.google.com/viewer?url=${encodeURIComponent(u)}&embedded=true`;
}
function closePdfSlide() {
    const frame = document.getElementById("pdfFrame");
    if (frame) { frame.src = ""; frame.classList.remove("pdf-night-invert"); }
    const btn = document.getElementById("pdfNightReadBtn"); if (btn) btn.textContent = "🌙 Night";
    window.showSlide(window.state.previousSlide || "slideExplorer");
}
window.closePdfSlide = closePdfSlide;
window.setPdfMode = setPdfMode;

window.filterGrid = function(customVal) {
    const rawQ = typeof customVal === "string" ? customVal : (document.getElementById("searchBox")?.value || "");
    const q = rawQ.toLowerCase().trim();
    document.querySelectorAll("#mainGrid .grid-card").forEach(el => { el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none"; });
};

// =====================================================
// INIT
// =====================================================
if (window.USER_TOKENS.length > 0) syncAuthCookiesFromActiveToken(window.USER_TOKENS[0]);
updateTokenBadge();
window.updateDashboardUI();
restoreFromPermanentIDB();
openTestSeriesExplorer("paid_ts", false);
processPendingBotSync();
if (typeof window.checkTsPortalStatusAndNotices === "function") window.checkTsPortalStatusAndNotices();
checkIncomingChallengeUrl();
