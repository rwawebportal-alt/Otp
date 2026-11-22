// =========================================================
// RWA PAID TEST SERIES - PRO COACHING SUITE & 4-DB SYNC
// Matches 18-Slide Coaching App UI (Slides 1, 3, 5, 15, 16, 17)
// Backend: https://pdfsownlaoder.onrender.com (Dual-DB Safe)
// =========================================================

window.NEW_PRO_API_BASE = "https://pdfsownlaoder.onrender.com";
const TS_PRO_STORE_KEY = "rwa_paid_ts_pro_v1";

const TS_RAPID_QUIZ_BANK = [
    {
        q: "भारतीय संविधान के किस अनुच्छेद को डॉ. अम्बेडकर ने 'संविधान की आत्मा' कहा है?",
        opts: ["अनुच्छेद 14", "अनुच्छेद 19", "अनुच्छेद 32", "अनुच्छेद 51A"],
        ans: 2,
        exp: "अनुच्छेद 32 (संवैधानिक उपचारों का अधिकार) को संविधान का हृदय और आत्मा कहा गया है।"
    },
    {
        q: "यदि 25 और 45 का तृतीय समानुपाती (Third Proportional) x है, तो x का मान क्या होगा?",
        opts: ["75", "81", "85", "90"],
        ans: 1,
        exp: "तृतीय समानुपाती = (b × b) / a = (45 × 45) / 25 = 81."
    },
    {
        q: "सिंधु घाटी सभ्यता का प्रमुख बंदरगाह नगर 'लोथल' किस राज्य में स्थित है?",
        opts: ["राजस्थान", "पंजाब", "हरियाणा", "गुजरात"],
        ans: 3,
        exp: "लोथल गुजरात में भोगवा नदी के तट पर स्थित था।"
    },
    {
        q: "Choose the exact synonym of 'METICULOUS':",
        opts: ["Careless", "Thorough", "Hasty", "Lazy"],
        ans: 1,
        exp: "'Meticulous' means showing great attention to detail; 'Thorough' is its exact synonym."
    },
    {
        q: "एक वस्तु ₹800 में खरीदकर ₹920 में बेची गई। लाभ प्रतिशत कितना होगा?",
        opts: ["12%", "15%", "18%", "20%"],
        ans: 1,
        exp: "लाभ = 920 - 800 = ₹120; लाभ% = (120 / 800) × 100 = 15%."
    }
];

function createDefaultTsProStore() {
    return {
        mistake_bank: [],
        flashcards: [
            {
                id: "fc_ts_1",
                subject: "Maths Formula",
                front: "Third Proportional of a and b = ?",
                back: "(b × b) / a",
                createdAt: new Date().toLocaleDateString()
            },
            {
                id: "fc_ts_2",
                subject: "Profit & Loss",
                front: "Markup +x% and Discount -y% Net Gain %?",
                back: "x - y - (x × y) / 100",
                createdAt: new Date().toLocaleDateString()
            }
        ],
        planner_tasks: [],
        exam_countdown: { name: "SSC GD 2027", date: "" },
        study_stats: { dailyMinutes: {}, streak: 1, lastDate: "", totalMinutes: 0 },
        preferences: { theme: "sky", fontSize: 16 },
        daily_quiz_history: {},
        search_cache: { testSeries: [] }
    };
}

function loadTsProStore() {
    try {
        const raw = localStorage.getItem(TS_PRO_STORE_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            return {
                ...createDefaultTsProStore(),
                ...p,
                study_stats: {
                    dailyMinutes: {},
                    streak: 1,
                    lastDate: "",
                    totalMinutes: 0,
                    ...(p.study_stats || {})
                },
                preferences: {
                    theme: "sky",
                    fontSize: 16,
                    ...(p.preferences || {})
                },
                search_cache: {
                    testSeries: [],
                    ...(p.search_cache || {})
                }
            };
        }
    } catch {}
    return createDefaultTsProStore();
}

window.TS_PRO_STORE = loadTsProStore();
let _tsCloudSyncTimer = null;
let _activeVaultDetailTool = null;
let _tsFcIdx = 0;
let _tsRapidIdx = 0;
let _tsRapidScore = 0;
let _tsRapidAnswered = false;

let _tsPomo = {
    mode: "25",
    secondsLeft: 25 * 60,
    running: false,
    interval: null,
    audioCtx: null,
    noiseNode: null,
    soundOn: false
};

// =========================================================
// CORE HELPERS
// =========================================================
window.tsEscHtml = function(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
};

window.tsTodayKey = function() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

window.tsGetActiveUserId = function() {
    try {
        if (Array.isArray(window.USER_TOKENS) && window.USER_TOKENS[0]) {
            return String(window.USER_TOKENS[0].userId || "");
        }
        const raw = localStorage.getItem("rwa_user_tokens_v2");
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr[0]) return String(arr[0].userId || "");
        }
    } catch {}
    return "";
};

window.tsGetActiveUserName = function() {
    try {
        if (window.USER_PROFILE && window.USER_PROFILE.name) return window.USER_PROFILE.name;
        const raw = localStorage.getItem("rwa_user_profile_v2");
        if (raw) {
            const p = JSON.parse(raw);
            if (p && p.name) return p.name;
        }
    } catch {}
    return "RWA Student";
};

window.tsToast = function(msg, type = "info") {
    const stack = document.getElementById("proToastStack");
    if (!stack) return;
    const bgMap = {
        success: "bg-emerald-600",
        error: "bg-rose-600",
        warning: "bg-amber-600",
        info: "bg-blue-600"
    };
    const el = document.createElement("div");
    el.className = `pro-toast ${bgMap[type] || bgMap.info}`;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 0.25s";
        setTimeout(() => el.remove(), 260);
    }, 2800);
};

function saveTsProStoreLocal(pushCloud = true) {
    try {
        localStorage.setItem(TS_PRO_STORE_KEY, JSON.stringify(window.TS_PRO_STORE));
    } catch {}
    if (pushCloud) scheduleTsCloudSync();
}

function scheduleTsCloudSync() {
    if (_tsCloudSyncTimer) clearTimeout(_tsCloudSyncTimer);
    _tsCloudSyncTimer = setTimeout(() => {
        window.tsPushCloudSync();
    }, 3500);
}

// =========================================================
// 4-MONGODB LIVE ACTIVITY, ERROR LOGS & CLOUD AUTO-SYNC
// =========================================================
window.tsLogActivity = function(action, detail = "", meta = {}) {
    const uid = tsGetActiveUserId();
    if (!uid) return;
    fetch(`${window.NEW_PRO_API_BASE}/api/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: uid,
            action: `TS_${String(action || "VIEW").toUpperCase()}`,
            detail: `[PAID-TS] ${detail}`,
            meta: { name: tsGetActiveUserName(), source: "paid_test_series_app", ...meta }
        }),
        keepalive: true
    }).catch(() => {});
};

window.tsLogError = function(source, message, stack = "") {
    fetch(`${window.NEW_PRO_API_BASE}/api/error_log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            source: `[PAID-TS] ${source}`,
            message: String(message || "").slice(0, 500),
            user_id: tsGetActiveUserId() || "Guest",
            stack: String(stack || "").slice(0, 1000)
        }),
        keepalive: true
    }).catch(() => {});
};

window.addEventListener("error", (e) => {
    if (e && e.message) tsLogError("WindowError", e.message, e.filename || "");
});
window.addEventListener("unhandledrejection", (e) => {
    if (e && e.reason) tsLogError("PromiseRejection", String(e.reason));
});

window.tsPushCloudSync = async function() {
    const uid = tsGetActiveUserId();
    if (!uid) return;

    let pausedMap = {};
    try { pausedMap = JSON.parse(localStorage.getItem("rwa_paused_tests_v1") || "{}"); } catch {}

    const bookmarksCompact = (window.BOOKMARKED_QUESTIONS || []).slice(0, 150).map(b => ({
        qId: b.qKey,
        testTitle: b.testTitle,
        subject: b.subject,
        qNumber: b.qNumber,
        questionObj: {
            id: b.qKey,
            question: b.question,
            option_1: (b.options || [])[0] || "",
            option_2: (b.options || [])[1] || "",
            option_3: (b.options || [])[2] || "",
            option_4: (b.options || [])[3] || "",
            answer: b.answer,
            solution_text: b.solution
        },
        savedAt: b.savedAt
    }));

    try {
        await fetch(`${window.NEW_PRO_API_BASE}/api/sync/push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: uid,
                bookmarks: bookmarksCompact,
                mistake_bank: (TS_PRO_STORE.mistake_bank || []).slice(0, 200),
                flashcards: (TS_PRO_STORE.flashcards || []).slice(0, 150),
                planner_tasks: TS_PRO_STORE.planner_tasks || [],
                exam_countdown: TS_PRO_STORE.exam_countdown || {},
                study_stats: TS_PRO_STORE.study_stats || {},
                preferences: TS_PRO_STORE.preferences || {},
                daily_quiz_history: TS_PRO_STORE.daily_quiz_history || {},
                paused_tests: pausedMap
            }),
            keepalive: true
        });
    } catch {}
};

window.tsPullCloudSync = async function() {
    const uid = tsGetActiveUserId();
    if (!uid) return;
    try {
        const res = await fetch(`${window.NEW_PRO_API_BASE}/api/sync/pull?user_id=${encodeURIComponent(uid)}`);
        const json = await res.json();
        if (!json || json.status !== "success") return;

        if (json.blocked) {
            showTsLockOverlay("blocked", json.block_reason || "Admin ne aapka account temporarily restrict kiya hai.");
            return;
        }

        const remote = json.sync || {};
        if (Array.isArray(remote.mistake_bank) && remote.mistake_bank.length) {
            const map = new Map();
            [...remote.mistake_bank, ...(TS_PRO_STORE.mistake_bank || [])].forEach(m => {
                if (m && m.qId) map.set(String(m.qId), m);
            });
            TS_PRO_STORE.mistake_bank = Array.from(map.values()).slice(0, 250);
        }
        if (Array.isArray(remote.flashcards) && remote.flashcards.length) {
            const map = new Map();
            [...remote.flashcards, ...(TS_PRO_STORE.flashcards || [])].forEach(f => {
                if (f && f.id) map.set(String(f.id), f);
            });
            TS_PRO_STORE.flashcards = Array.from(map.values());
        }
        if (Array.isArray(remote.planner_tasks) && remote.planner_tasks.length && TS_PRO_STORE.planner_tasks.length === 0) {
            TS_PRO_STORE.planner_tasks = remote.planner_tasks;
        }
        if (remote.exam_countdown && remote.exam_countdown.date && !TS_PRO_STORE.exam_countdown.date) {
            TS_PRO_STORE.exam_countdown = remote.exam_countdown;
        }
        if (remote.study_stats) {
            TS_PRO_STORE.study_stats.streak = Math.max(TS_PRO_STORE.study_stats.streak || 1, remote.study_stats.streak || 1);
        }

        saveTsProStoreLocal(false);
        window.updateProDashboardStrip();
    } catch {}
};

// =========================================================
// MAINTENANCE MODE, BLOCK GUARD & LIVE NOTICES
// =========================================================
function showTsLockOverlay(type, message) {
    const ov = document.getElementById("portalLockOverlay");
    if (!ov) return;
    const icon = document.getElementById("portalLockIcon");
    const title = document.getElementById("portalLockTitle");
    const msgEl = document.getElementById("portalLockMsg");
    const logoutBtn = document.getElementById("portalLockLogoutBtn");

    if (type === "blocked") {
        icon.textContent = "🚫";
        title.textContent = "Account Restricted";
        msgEl.textContent = message || "Admin ne aapka account temporarily restrict kiya hai.";
        if (logoutBtn) logoutBtn.classList.remove("hidden");
    } else {
        icon.textContent = "🚧";
        title.textContent = "Portal Under Maintenance";
        msgEl.textContent = message || "Portal abhi update par hai. Kripya thodi der baad try karein.";
        if (logoutBtn) logoutBtn.classList.add("hidden");
    }
    ov.classList.remove("hidden");
}

window.forceSwitchBlockedAccount = function() {
    localStorage.removeItem("rwa_user_tokens_v2");
    localStorage.removeItem("rwa_user_profile_v2");
    if (window.USER_TOKENS) window.USER_TOKENS = [];
    if (window.USER_PROFILE) window.USER_PROFILE = null;
    document.getElementById("portalLockOverlay")?.classList.add("hidden");
    if (typeof window.openLoginModal === "function") window.openLoginModal();
};

window.checkTsPortalStatusAndNotices = async function() {
    const uid = tsGetActiveUserId();
    try {
        const res = await fetch(`${window.NEW_PRO_API_BASE}/api/portal/status?user_id=${encodeURIComponent(uid)}`);
        const json = await res.json();
        if (!json || json.status !== "success") return;

        if (json.maintenance_mode) {
            showTsLockOverlay("maintenance", json.maintenance_message);
            return;
        }
        if (json.user_blocked) {
            showTsLockOverlay("blocked", json.block_reason);
            return;
        }
        renderTsLiveNotice(json.notices || []);
    } catch {}
};

function renderTsLiveNotice(notices) {
    const box = document.getElementById("liveNoticeBanner");
    if (!box) return;
    if (!notices || !notices.length) {
        box.classList.add("hidden");
        return;
    }
    const n = notices[0];
    const gradMap = {
        urgent: "from-rose-600 to-red-700 border-rose-300",
        warning: "from-amber-500 to-orange-600 border-amber-300",
        success: "from-emerald-500 to-teal-600 border-emerald-300",
        info: "from-indigo-600 to-blue-700 border-sky-300"
    };
    box.className = `rounded-2xl p-3 text-white bg-gradient-to-r ${gradMap[n.level] || gradMap.info} border-2 shadow-md flex items-center justify-between gap-3 mb-3.5`;
    box.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-lg shrink-0">📢</span>
            <div class="min-w-0">
                <div class="font-black text-xs uppercase">${tsEscHtml(n.title)}</div>
                <div class="text-xs opacity-95 truncate sm:whitespace-normal">${tsEscHtml(n.message)}</div>
            </div>
        </div>
        <button onclick="document.getElementById('liveNoticeBanner').classList.add('hidden')" class="text-white/80 font-black text-sm bg-transparent border-0 cursor-pointer shrink-0">✕</button>`;
    box.classList.remove("hidden");
}

// =========================================================
// THEME, STREAK, COUNTDOWN, SLIDE 3 RING & SLIDE 5 BADGES
// =========================================================
window.toggleTsPortalTheme = function() {
    const isDark = document.body.classList.toggle("dark-mode");
    TS_PRO_STORE.preferences.theme = isDark ? "dark" : "sky";
    saveTsProStoreLocal(false);
    const btn = document.getElementById("themeSwitchBtn");
    if (btn) btn.textContent = isDark ? "☀️" : "🌙";
    const pToggle = document.getElementById("profileDarkModeBadge");
    if (pToggle) pToggle.textContent = isDark ? "ON" : "OFF";
    tsToast(isDark ? "🌙 Midnight Dark Mode ON" : "☀️ Sky Light Mode ON", "info");
};

(function initSavedTsTheme() {
    if (TS_PRO_STORE.preferences.theme === "dark") {
        document.body.classList.add("dark-mode");
        const btn = document.getElementById("themeSwitchBtn");
        if (btn) btn.textContent = "☀️";
    }
})();

window.tsAddStudyMinutes = function(mins) {
    const m = Math.max(0, Number(mins) || 0);
    if (!m) return;
    const today = tsTodayKey();
    const st = TS_PRO_STORE.study_stats;
    if (st.lastDate && st.lastDate !== today) {
        const diff = Math.round((new Date(today) - new Date(st.lastDate)) / 86400000);
        if (diff === 1) st.streak = (st.streak || 1) + 1;
        else if (diff > 1) st.streak = 1;
    }
    st.lastDate = today;
    st.dailyMinutes[today] = Number(((st.dailyMinutes[today] || 0) + m).toFixed(1));
    st.totalMinutes = Number(((st.totalMinutes || 0) + m).toFixed(1));
    saveTsProStoreLocal(true);
    window.updateProDashboardStrip();
};

window.tsAddMistakeQuestions = function(wrongList, testMeta = {}) {
    if (!Array.isArray(wrongList) || !wrongList.length) return;
    wrongList.forEach(({ qObj, chosenOption }) => {
        const qId = String(qObj.id || qObj.question_id || ("m_" + (qObj.question || "").slice(0, 28)));
        const idx = TS_PRO_STORE.mistake_bank.findIndex(m => String(m.qId) === qId);
        const entry = {
            qId,
            testId: String(testMeta.id || ""),
            testTitle: testMeta.title || "Paid Mock Test",
            subject: qObj._sectionName || qObj.subject || "General",
            wrongAns: chosenOption,
            questionObj: qObj,
            savedAt: new Date().toLocaleDateString()
        };
        if (idx >= 0) TS_PRO_STORE.mistake_bank[idx] = entry;
        else TS_PRO_STORE.mistake_bank.unshift(entry);
    });
    if (TS_PRO_STORE.mistake_bank.length > 250) TS_PRO_STORE.mistake_bank = TS_PRO_STORE.mistake_bank.slice(0, 250);
    saveTsProStoreLocal(true);
    window.updateProDashboardStrip();
};

window.tsAddFlashcard = function(front, back, subject = "Mock Revision") {
    if (!front || !back) return;
    TS_PRO_STORE.flashcards.unshift({
        id: "fc_" + Date.now(),
        subject,
        front: front.trim(),
        back: back.trim(),
        createdAt: new Date().toLocaleDateString()
    });
    saveTsProStoreLocal(true);
    window.updateProDashboardStrip();
    tsToast("🃏 Flashcard Saved in Vault!", "success");
};

window.updateProDashboardStrip = function() {
    const st = TS_PRO_STORE.study_stats || {};
    const streakDays = st.streak || 1;

    // Slide 1 Compact Stat Pills
    const streakPill = document.getElementById("dashStreakPill");
    if (streakPill) streakPill.textContent = `${streakDays}d Streak`;

    const cd = TS_PRO_STORE.exam_countdown || { name: "SSC GD 2027", date: "" };
    const cdLabel = document.getElementById("dashCountdownLabel");
    const vaultCdSub = document.getElementById("vaultCountdownSub");
    let cdText = cd.name || "SSC GD 2027";
    if (cd.date) {
        const diff = Math.ceil((new Date(cd.date) - new Date(tsTodayKey())) / 86400000);
        cdText = diff > 0 ? `${cd.name} (${diff}d)` : (diff === 0 ? `${cd.name} Today!` : cd.name);
    }
    if (cdLabel) cdLabel.textContent = cdText;
    if (vaultCdSub) vaultCdSub.textContent = cdText;

    // Slide 5 Vault Hub Badges
    const mBadge = document.getElementById("vaultMistakeBadge");
    if (mBadge) mBadge.textContent = `${(TS_PRO_STORE.mistake_bank || []).length} Qs`;
    const fcBadge = document.getElementById("vaultFlashcardBadge");
    if (fcBadge) fcBadge.textContent = `${(TS_PRO_STORE.flashcards || []).length} Cards`;
    const plBadge = document.getElementById("vaultPlannerBadge");
    if (plBadge) {
        const tasks = TS_PRO_STORE.planner_tasks || [];
        const done = tasks.filter(t => t.done).length;
        plBadge.textContent = tasks.length ? `${done}/${tasks.length} Done` : "0 Tasks";
    }

    // Slide 3 My Progress Circular Ring, Avg Accuracy, Streak & Last 10 Tests Bar Chart
    const attempts = Object.values(window.ATTEMPTED_TESTS || {});
    const avgAcc = attempts.length
        ? Math.round(attempts.reduce((sum, a) => sum + (Number(a.accuracy) || 0), 0) / attempts.length)
        : 0;
    const avgAccEl = document.getElementById("dashAvgAccuracy");
    if (avgAccEl) avgAccEl.textContent = `${avgAcc}%`;
    const progStreakEl = document.getElementById("dashProgressStreak");
    if (progStreakEl) progStreakEl.textContent = `${streakDays} Day${streakDays > 1 ? "s" : ""}`;

    const trendBars = document.getElementById("progressTrendBars");
    if (trendBars) {
        const last10 = attempts.slice(-10);
        if (last10.length > 0) {
            trendBars.innerHTML = last10.map((item, i) => {
                const scPct = Math.max(8, Math.min(100, Math.round((Number(item.score || 0) / (Number(item.maxMarks) || 100)) * 100)));
                const accPct = Math.max(8, Math.min(100, Math.round(Number(item.accuracy || 0))));
                return `
                    <div class="flex-1 min-w-[34px] flex flex-col items-center justify-end gap-1 h-full" title="${tsEscHtml(item.title)}: ${item.score}/${item.maxMarks} (${accPct}% Acc)">
                        <div class="flex items-end gap-1 h-28 justify-center">
                            <div class="w-2.5 sm:w-3 bg-blue-600 rounded-t-md" style="height:${scPct}%"></div>
                            <div class="w-2.5 sm:w-3 bg-emerald-500 rounded-t-md" style="height:${accPct}%"></div>
                        </div>
                        <span class="text-[11px] font-extrabold opacity-70">${i + 1}</span>
                    </div>`;
            }).join("");
        } else {
            trendBars.innerHTML = `<div class="w-full text-center py-8 text-xs font-bold opacity-60">Mock tests attempt karte hi aapka Score vs Accuracy trend graph yahan dikhega 📊</div>`;
        }
    }
};

// =========================================================
// EXAM COUNTDOWN MODAL
// =========================================================
window.openCountdownModal = function() {
    document.getElementById("cdExamName").value = TS_PRO_STORE.exam_countdown.name || "";
    document.getElementById("cdExamDate").value = TS_PRO_STORE.exam_countdown.date || "";
    document.getElementById("countdownModal").classList.remove("hidden");
};
window.closeCountdownModal = function() {
    document.getElementById("countdownModal").classList.add("hidden");
};
window.saveExamCountdown = function() {
    TS_PRO_STORE.exam_countdown = {
        name: document.getElementById("cdExamName").value.trim() || "SSC GD 2027",
        date: document.getElementById("cdExamDate").value
    };
    saveTsProStoreLocal(true);
    closeCountdownModal();
    window.updateProDashboardStrip();
    if (typeof window.renderProfileTabView === "function" && window.state && window.state.activeAppTab === "profile") {
        window.renderProfileTabView();
    }
    tsToast("🎯 Target Exam Saved!", "success");
};

// =========================================================
// SLIDE 17: SMART GLOBAL SEARCH & QUICK REPORT SCREEN
// =========================================================
window.openGlobalSearchModal = function(focusFeedback = false) {
    const modal = document.getElementById("globalSearchModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    const inp = document.getElementById("globalSearchInput");
    if (inp) {
        inp.value = "";
        if (!focusFeedback) setTimeout(() => inp.focus(), 80);
    }
    runGlobalSearch("");
    if (focusFeedback) {
        setTimeout(() => {
            document.getElementById("quickFeedbackBox")?.scrollIntoView({ behavior: "smooth" });
        }, 120);
    }
};
window.closeGlobalSearchModal = function() {
    document.getElementById("globalSearchModal")?.classList.add("hidden");
};
window.openReportIssueModal = function() {
    window.openGlobalSearchModal(true);
};

window.runGlobalSearch = function(query) {
    const q = String(query || "").trim().toLowerCase();
    const box = document.getElementById("globalSearchResults");
    if (!box) return;

    const hits = [];
    (TS_PRO_STORE.search_cache.testSeries || []).forEach(ts => {
        if (!q || (ts.title || "").toLowerCase().includes(q)) {
            hits.push({
                tag: "🏆 Series",
                tagCls: "bg-indigo-600 text-white",
                title: ts.title,
                sub: `Series #${ts.id}`,
                btn: "View Series",
                fn: `closeGlobalSearchModal(); switchAppTab('tests'); openTestSeriesSubjects('${ts.id}','${(ts.title || "").replace(/'/g, "")}');`
            });
        }
    });
    Object.values(window.ATTEMPTED_TESTS || {}).forEach(att => {
        if (!q || (att.title || "").toLowerCase().includes(q)) {
            hits.push({
                tag: "✅ Scorecard",
                tagCls: "bg-emerald-600 text-white",
                title: att.title,
                sub: `Score: ${att.score}/${att.maxMarks}`,
                btn: "View Scorecard",
                fn: `closeGlobalSearchModal(); openSavedTestScorecard('${att.testId}','${att.testKey || `test_${att.testId}`}');`
            });
        }
    });
    (window.BOOKMARKED_QUESTIONS || []).forEach((b, idx) => {
        const hay = `${b.subject || ""} ${b.testTitle || ""} ${b.question || ""}`.toLowerCase();
        if (!q || hay.includes(q)) {
            hits.push({
                tag: "🔖 Bookmark",
                tagCls: "bg-amber-100 text-amber-900",
                title: `${b.subject || "Subject"} — ${b.testTitle || "Test"}`,
                sub: `Q.${b.qNumber || idx + 1}`,
                btn: "View Question",
                fn: `closeGlobalSearchModal(); switchAppTab('bookmarks'); openBookmarkDetailView(${idx});`
            });
        }
    });

    const sliced = hits.slice(0, 12);
    box.innerHTML = sliced.length ? sliced.map(h => `
        <div onclick="${h.fn}" class="app-card p-3.5 cursor-pointer flex flex-col justify-between gap-2 hover:border-blue-500">
            <div>
                <div class="font-black text-sm leading-snug line-clamp-2">${tsEscHtml(h.title)}</div>
                <div class="text-[11px] opacity-70 font-bold mt-0.5">${tsEscHtml(h.sub)}</div>
                <span class="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black ${h.tagCls}">${h.tag}</span>
            </div>
            <div class="pt-2 border-t border-sky-200/50 text-center font-black text-blue-600 dark:text-sky-400 text-xs">${h.btn}</div>
        </div>`).join("") : `<div class="col-span-full app-card p-6 text-center opacity-70 font-bold">Koi match nahi mila.</div>`;
};

window.submitUserReport = async function() {
    const type = document.getElementById("repType").value;
    const subject = document.getElementById("repSubject").value.trim();
    const message = document.getElementById("repMessage").value.trim();
    if (!subject || !message) return tsToast("Subject aur Details dono likhein.", "warning");

    const phone = (window.USER_PROFILE && window.USER_PROFILE.phone) ? window.USER_PROFILE.phone : "N/A";
    try {
        const res = await fetch(`${window.NEW_PRO_API_BASE}/api/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: tsGetActiveUserId() || "Guest",
                user_name: tsGetActiveUserName(),
                phone,
                type: `[PAID-TS] ${type}`,
                subject,
                message
            })
        });
        if (res.ok) {
            document.getElementById("repSubject").value = "";
            document.getElementById("repMessage").value = "";
            closeGlobalSearchModal();
            window.showRwaPopup({
                title: "Sent to Admin",
                message: "Aapki request/report Admin ko bhej di gayi hai!",
                type: "success"
            });
        } else {
            tsToast("Server busy hai, thodi der baad retry karein.", "error");
        }
    } catch {
        tsToast("Network error! Please retry.", "error");
    }
};

// =========================================================
// SLIDES 5, 15, 16: PRO STUDY VAULT HUB & TOOL SUB-SCREENS
// =========================================================
window.closeVaultToolDetail = function() {
    _activeVaultDetailTool = null;
    document.getElementById("vaultToolDetailSubView")?.classList.add("hidden");
    document.getElementById("vaultHubSubView")?.classList.remove("hidden");
    window.updateProDashboardStrip();
};

window.openVaultToolDetail = function(tool) {
    _activeVaultDetailTool = tool;
    document.getElementById("vaultHubSubView")?.classList.add("hidden");
    document.getElementById("vaultToolDetailSubView")?.classList.remove("hidden");

    const titleEl = document.getElementById("vaultDetailTitle");
    const rightEl = document.getElementById("vaultDetailRightAction");
    const box = document.getElementById("proToolsBody");
    if (!box) return;
    if (rightEl) rightEl.innerHTML = "";

    if (tool === "mistakes") {
        const cnt = (TS_PRO_STORE.mistake_bank || []).length;
        if (titleEl) titleEl.textContent = `Mistake Bank (${cnt} Qs)`;
        if (rightEl && cnt > 0) {
            rightEl.innerHTML = `<button onclick="launchMistakesReTest()" class="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs border-0 shadow cursor-pointer">🔥 Re-Test All</button>`;
        }
        renderMistakesAndBuilderView(box);
    } else if (tool === "custom_mock") {
        if (titleEl) titleEl.textContent = "Custom Mock Builder";
        renderCustomMockOnlyView(box);
    } else if (tool === "flashcards") {
        if (titleEl) titleEl.textContent = "Flashcards & Focus";
        renderFlashcardsAndFocusView(box, true);
    } else if (tool === "pomodoro") {
        if (titleEl) titleEl.textContent = "Pomodoro Focus Timer";
        renderPomodoroOnlyView(box);
    } else if (tool === "planner") {
        if (titleEl) titleEl.textContent = "Daily Study Planner";
        renderPlannerView(box);
    } else if (tool === "rapid_quiz") {
        if (titleEl) titleEl.textContent = "Daily 5-Min Rapid Quiz";
        renderRapidQuizView(box);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
};

// SLIDE 15: Mistake Bank + Custom Mock Builder
function getCustomMockCardHtml() {
    const bCnt = (window.BOOKMARKED_QUESTIONS || []).length;
    const mCnt = (TS_PRO_STORE.mistake_bank || []).length;
    return `
        <div class="app-card p-5 space-y-3.5">
            <h4 class="font-black text-base flex items-center gap-2">🛠️ Custom Mock Test Builder</h4>
            <div>
                <label class="text-xs font-extrabold opacity-75">Source</label>
                <select id="tsCmSource" class="app-form-input mt-1">
                    <option value="mix">Mix (Mistakes + Bookmarks: ${mCnt + bCnt} Qs)</option>
                    <option value="mistakes">Only Mistake Bank (${mCnt} Qs)</option>
                    <option value="bookmarks">Only Bookmarks (${bCnt} Qs)</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <input id="tsCmCount" type="number" value="20" min="2" max="100" class="app-form-input text-center font-black">
                    <div class="text-[11px] font-bold opacity-65 text-center mt-1">Questions / Qs</div>
                </div>
                <div>
                    <input id="tsCmTime" type="number" value="15" min="2" max="120" class="app-form-input text-center font-black">
                    <div class="text-[11px] font-bold opacity-65 text-center mt-1">Mins / Minutes</div>
                </div>
            </div>
            <button onclick="buildAndStartTsCustomMock()" class="btn-watch w-full py-3 text-sm">Start Custom Mock Test</button>
        </div>`;
}

function renderMistakesAndBuilderView(box) {
    const list = TS_PRO_STORE.mistake_bank || [];
    box.innerHTML = `
        <div class="text-[11px] font-black uppercase tracking-wider opacity-65 px-1">MISTAKE QUESTIONS SECTION</div>
        <div class="space-y-3">
            ${list.length ? list.map((m, idx) => `
                <div class="app-card p-4 space-y-2.5">
                    <div class="flex justify-between items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black">${tsEscHtml(m.subject)} • ${tsEscHtml(m.testTitle)}</span>
                        <button onclick="markTsMistakeMastered('${tsEscHtml(m.qId)}')" class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border-0 cursor-pointer">✅ Mastered</button>
                    </div>
                    <div class="text-sm font-bold leading-relaxed">Q${idx + 1}. ${m.questionObj.question || ""}</div>
                    <details class="text-xs pt-2 border-t border-sky-200/50">
                        <summary class="cursor-pointer font-black text-indigo-700 dark:text-sky-400">💡 View Correct Solution</summary>
                        <div class="mt-2 p-3 rounded-xl bg-sky-50 dark:bg-slate-800">
                            <div class="font-black text-emerald-600 mb-1">Correct Option: #${tsEscHtml(m.questionObj.answer || "1")}</div>
                            <div>${m.questionObj.solution_text || m.questionObj.explanation || "Check official explanation."}</div>
                        </div>
                    </details>
                </div>`).join("") : `<div class="app-card p-8 text-center text-xs font-bold opacity-70">Koi pending mistake nahi hai — sab clear hai! 🎉</div>`}
        </div>
        <div class="text-[11px] font-black uppercase tracking-wider opacity-65 px-1 pt-2">CUSTOM MOCK BUILDER SECTION</div>
        ${getCustomMockCardHtml()}`;
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([box]).catch(() => {});
}

function renderCustomMockOnlyView(box) {
    box.innerHTML = getCustomMockCardHtml();
}

window.markTsMistakeMastered = function(qId) {
    TS_PRO_STORE.mistake_bank = TS_PRO_STORE.mistake_bank.filter(m => String(m.qId) !== String(qId));
    saveTsProStoreLocal(true);
    window.updateProDashboardStrip();
    openVaultToolDetail("mistakes");
    tsToast("✅ Marked as Mastered!", "success");
};

function convertBookmarksToQuestions() {
    return (window.BOOKMARKED_QUESTIONS || []).map(b => ({
        id: b.qKey,
        question: b.question || "",
        option_1: (b.options || [])[0] || "",
        option_2: (b.options || [])[1] || "",
        option_3: (b.options || [])[2] || "",
        option_4: (b.options || [])[3] || "",
        option_5: (b.options || [])[4] || "",
        answer: b.answer || "1",
        solution_text: b.solution || "",
        positive_marks: "2",
        negative_marks: "0.5",
        section_id: b.subject || "1",
        section_name: b.subject || "Bookmarked"
    }));
}

window.launchBookmarksPracticeTest = function() {
    const qs = convertBookmarksToQuestions();
    if (!qs.length) return tsToast("Pehle kuch questions bookmark karein!", "warning");
    if (typeof window.launchCustomQuestionsTcs === "function") {
        window.launchCustomQuestionsTcs("🔖 Bookmarked Questions Practice", qs, Math.max(5, Math.ceil(qs.length * 0.8)));
    }
};

window.launchMistakesReTest = function() {
    const qs = (TS_PRO_STORE.mistake_bank || []).map(m => m.questionObj).filter(Boolean);
    if (!qs.length) return tsToast("Mistake Bank abhi empty hai!", "warning");
    if (typeof window.launchCustomQuestionsTcs === "function") {
        window.launchCustomQuestionsTcs("❌ Mistake Notebook Re-Test", qs, Math.max(5, Math.ceil(qs.length * 0.8)));
    }
};

window.buildAndStartTsCustomMock = function() {
    const src = document.getElementById("tsCmSource").value;
    const cnt = Math.max(1, parseInt(document.getElementById("tsCmCount").value || "20", 10));
    const mins = Math.max(2, parseInt(document.getElementById("tsCmTime").value || "15", 10));
    let pool = [];
    if (src === "bookmarks") pool = convertBookmarksToQuestions();
    else if (src === "mistakes") pool = (TS_PRO_STORE.mistake_bank || []).map(x => x.questionObj);
    else pool = [...(TS_PRO_STORE.mistake_bank || []).map(x => x.questionObj), ...convertBookmarksToQuestions()];

    if (!pool.length) return tsToast("Pehle koi test dein ya questions bookmark karein!", "warning");
    pool = pool.sort(() => Math.random() - 0.5).slice(0, cnt);
    if (typeof window.launchCustomQuestionsTcs === "function") {
        window.launchCustomQuestionsTcs(`🛠️ Custom Revision Mock (${pool.length} Qs)`, pool, mins);
    }
};

// SLIDE 16: 3D Formula Flashcards + Pomodoro Focus Timer
function getPomodoroCardHtml() {
    const m = String(Math.floor(_tsPomo.secondsLeft / 60)).padStart(2, "0");
    const s = String(_tsPomo.secondsLeft % 60).padStart(2, "0");
    return `
        <div class="app-card p-5 text-center space-y-4">
            <h4 class="font-black text-base text-left">⏱️ Pomodoro Focus Timer</h4>
            <div class="flex justify-center gap-2">
                <button onclick="setTsPomo(25)" class="cat-pill ${_tsPomo.mode === "25" ? "active" : ""}">25m Focus</button>
                <button onclick="setTsPomo(50)" class="cat-pill ${_tsPomo.mode === "50" ? "active" : ""}">50m Deep</button>
                <button onclick="setTsPomo(5)" class="cat-pill ${_tsPomo.mode === "5" ? "active" : ""}">5m Break</button>
            </div>
            <div id="tsPomoClock" class="text-5xl sm:text-6xl font-black font-mono tracking-wider py-2">${m}:${s}</div>
            <div class="flex gap-2.5">
                <button onclick="toggleTsPomo()" class="btn-watch flex-1 py-3 text-sm">${_tsPomo.running ? "⏸ Pause Focus" : "▶ Start Focus"}</button>
                <button onclick="setTsPomo(parseInt(_tsPomo.mode)||25)" class="btn-nav bg-slate-200 text-slate-800 border-0 px-4">🔄</button>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-sky-200/50">
                <span class="font-extrabold text-xs">🌧️ Soft Rain Study Sound</span>
                <button onclick="toggleTsRainSound()" class="px-4 py-1.5 rounded-full font-black text-xs border-0 cursor-pointer ${_tsPomo.soundOn ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow" : "bg-slate-200 text-slate-700"}">${_tsPomo.soundOn ? "ON" : "OFF"}</button>
            </div>
        </div>`;
}

function renderFlashcardsAndFocusView(box, includePomo = true) {
    const cards = TS_PRO_STORE.flashcards || [];
    if (_tsFcIdx >= cards.length) _tsFcIdx = 0;
    const cur = cards[_tsFcIdx];

    box.innerHTML = `
        <div class="space-y-4">
            ${cur ? `
                <div class="flashcard-stage" onclick="this.classList.toggle('flipped')">
                    <div class="flashcard-inner">
                        <div class="flashcard-face flashcard-front">
                            <span class="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase mb-3">${tsEscHtml(cur.subject)} • TAP TO FLIP</span>
                            <div class="font-black text-lg sm:text-xl leading-snug">${tsEscHtml(cur.front)}</div>
                            <div class="text-[11px] opacity-75 mt-3 font-bold">${_tsFcIdx + 1} / ${cards.length}</div>
                        </div>
                        <div class="flashcard-face flashcard-back">
                            <span class="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase mb-3">ANSWER / TRICK</span>
                            <div class="font-black text-lg sm:text-xl leading-snug">${tsEscHtml(cur.back)}</div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-between items-center gap-2">
                    <button onclick="stepTsFlashcard(-1)" class="btn-nav bg-slate-900 text-white border-0 px-5">← Prev</button>
                    <button onclick="deleteTsFlashcard()" class="btn-nav bg-rose-100 text-rose-700 border-0 text-xs">🗑 Delete</button>
                    <button onclick="stepTsFlashcard(1)" class="btn-watch px-5">Next →</button>
                </div>` : `<div class="app-card p-6 text-center text-xs font-bold opacity-70">Niche se apna pehla flashcard add karein!</div>`}

            ${includePomo ? getPomodoroCardHtml() : ""}

            <div class="app-card p-4 space-y-2.5">
                <div class="font-black text-sm">➕ Add New Flashcard</div>
                <input id="tsFcSub" type="text" placeholder="Subject (e.g. Maths Formula / GK / Vocab)" class="app-form-input">
                <input id="tsFcFront" type="text" placeholder="Front: Question / Word / Formula Name" class="app-form-input">
                <textarea id="tsFcBack" rows="2" placeholder="Back: Answer / Short Trick" class="app-form-input"></textarea>
                <button onclick="submitTsFlashcard()" class="btn-watch w-full text-xs py-2.5">💾 Save Flashcard</button>
            </div>
        </div>`;
}

function renderPomodoroOnlyView(box) {
    box.innerHTML = getPomodoroCardHtml();
}

window.stepTsFlashcard = function(d) {
    const l = TS_PRO_STORE.flashcards.length;
    if (!l) return;
    _tsFcIdx = (_tsFcIdx + d + l) % l;
    openVaultToolDetail("flashcards");
};
window.deleteTsFlashcard = function() {
    if (!TS_PRO_STORE.flashcards.length) return;
    TS_PRO_STORE.flashcards.splice(_tsFcIdx, 1);
    saveTsProStoreLocal(true);
    openVaultToolDetail("flashcards");
};
window.submitTsFlashcard = function() {
    const s = document.getElementById("tsFcSub").value.trim() || "General";
    const f = document.getElementById("tsFcFront").value.trim();
    const b = document.getElementById("tsFcBack").value.trim();
    if (!f || !b) return tsToast("Front aur Back dono bharein.", "warning");
    tsAddFlashcard(f, b, s);
    _tsFcIdx = 0;
    openVaultToolDetail("flashcards");
};

window.setTsPomo = function(mins) {
    if (_tsPomo.interval) clearInterval(_tsPomo.interval);
    _tsPomo.running = false;
    _tsPomo.mode = String(mins);
    _tsPomo.secondsLeft = mins * 60;
    if (_activeVaultDetailTool) openVaultToolDetail(_activeVaultDetailTool);
};
window.toggleTsPomo = function() {
    if (_tsPomo.running) {
        clearInterval(_tsPomo.interval);
        _tsPomo.running = false;
        if (_activeVaultDetailTool) openVaultToolDetail(_activeVaultDetailTool);
        return;
    }
    _tsPomo.running = true;
    _tsPomo.interval = setInterval(() => {
        if (_tsPomo.secondsLeft <= 0) {
            clearInterval(_tsPomo.interval);
            _tsPomo.running = false;
            const mins = parseInt(_tsPomo.mode, 10) || 25;
            if (mins >= 15) {
                tsAddStudyMinutes(mins);
                tsLogActivity("POMODORO", `Completed ${mins}m Focus Session`);
            }
            tsToast("🎉 Focus Session Complete!", "success");
            if (_activeVaultDetailTool) openVaultToolDetail(_activeVaultDetailTool);
            return;
        }
        _tsPomo.secondsLeft--;
        const clk = document.getElementById("tsPomoClock");
        if (clk) clk.textContent = `${String(Math.floor(_tsPomo.secondsLeft / 60)).padStart(2, "0")}:${String(_tsPomo.secondsLeft % 60).padStart(2, "0")}`;
    }, 1000);
    if (_activeVaultDetailTool) openVaultToolDetail(_activeVaultDetailTool);
};
window.toggleTsRainSound = function() {
    if (_tsPomo.soundOn) {
        try { _tsPomo.noiseNode.stop(); _tsPomo.audioCtx.close(); } catch {}
        _tsPomo.soundOn = false;
        if (_activeVaultDetailTool) openVaultToolDetail(_activeVaultDetailTool);
        return;
    }
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const buf = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
        const out = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < out.length; i++) {
            const w = Math.random() * 2 - 1;
            out[i] = ((last + 0.02 * w) / 1.02) * 0.25;
            last = out[i] * 4;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0.16;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        _tsPomo.audioCtx = ctx;
        _tsPomo.noiseNode = src;
        _tsPomo.soundOn = true;
        if (_activeVaultDetailTool) openVaultToolDetail(_activeVaultDetailTool);
    } catch {}
};

// Daily Study Planner
function renderPlannerView(box) {
    const tasks = TS_PRO_STORE.planner_tasks || [];
    const done = tasks.filter(t => t.done).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    box.innerHTML = `
        <div class="app-card p-5 space-y-4">
            <div class="flex justify-between items-center">
                <h4 class="font-black text-base">📅 Today's Targets</h4>
                <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">${done}/${tasks.length} (${pct}%)</span>
            </div>
            <div class="flex gap-2">
                <input id="tsPlanInput" type="text" placeholder="e.g. 2 SSC GD Full Mocks + Revise Bookmarks" onkeydown="if(event.key==='Enter') addTsPlanTask()" class="app-form-input flex-1">
                <button onclick="addTsPlanTask()" class="btn-watch text-xs shrink-0">➕ Add</button>
            </div>
            <div class="space-y-2">
                ${tasks.length ? tasks.map(t => `
                    <div class="p-3 rounded-2xl bg-sky-50/70 dark:bg-slate-800 border border-sky-200/60 dark:border-slate-700 flex items-center justify-between gap-2">
                        <label class="flex items-center gap-2.5 cursor-pointer flex-1 text-xs font-bold ${t.done ? "line-through opacity-55" : ""}">
                            <input type="checkbox" ${t.done ? "checked" : ""} onchange="toggleTsPlanTask('${tsEscHtml(t.id)}')" class="w-4 h-4 accent-emerald-600">
                            <span>${tsEscHtml(t.text)}</span>
                        </label>
                        <button onclick="delTsPlanTask('${tsEscHtml(t.id)}')" class="text-rose-600 font-black bg-transparent border-0 cursor-pointer">✕</button>
                    </div>`).join("") : `<div class="text-center py-6 text-xs font-bold opacity-65">Aaj ka koi study target add nahi hai.</div>`}
            </div>
        </div>`;
}
window.addTsPlanTask = function() {
    const inp = document.getElementById("tsPlanInput");
    const txt = inp ? inp.value.trim() : "";
    if (!txt) return;
    TS_PRO_STORE.planner_tasks.unshift({ id: "tp_" + Date.now(), text: txt, done: false, date: tsTodayKey() });
    saveTsProStoreLocal(true);
    openVaultToolDetail("planner");
};
window.toggleTsPlanTask = function(id) {
    const t = TS_PRO_STORE.planner_tasks.find(x => x.id === id);
    if (t) t.done = !t.done;
    saveTsProStoreLocal(true);
    openVaultToolDetail("planner");
};
window.delTsPlanTask = function(id) {
    TS_PRO_STORE.planner_tasks = TS_PRO_STORE.planner_tasks.filter(x => x.id !== id);
    saveTsProStoreLocal(true);
    openVaultToolDetail("planner");
};

// Daily 5-Min Rapid Quiz
function renderRapidQuizView(box) {
    const today = tsTodayKey();
    const done = TS_PRO_STORE.daily_quiz_history[today];
    if (done && _tsRapidIdx === 0 && !_tsRapidAnswered) {
        box.innerHTML = `
            <div class="app-card p-8 text-center space-y-3">
                <div class="text-5xl">🏆</div>
                <h4 class="font-black text-xl">Today's Rapid Quiz Completed!</h4>
                <div class="text-2xl font-black text-emerald-600">${done.score} / ${done.total}</div>
                <button onclick="restartTsRapidQuiz()" class="btn-watch text-xs px-6">🔄 Play Again</button>
            </div>`;
        return;
    }
    const q = TS_RAPID_QUIZ_BANK[_tsRapidIdx];
    box.innerHTML = `
        <div class="app-card p-5 space-y-4">
            <div class="flex justify-between items-center">
                <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">⚡ Q${_tsRapidIdx + 1}/${TS_RAPID_QUIZ_BANK.length}</span>
                <span class="font-black text-xs text-emerald-600">Score: ${_tsRapidScore}</span>
            </div>
            <div class="p-4 rounded-2xl bg-sky-50 dark:bg-slate-800 font-extrabold text-sm">${tsEscHtml(q.q)}</div>
            <div id="tsRapidOpts" class="space-y-2">
                ${q.opts.map((o, idx) => `<button onclick="ansTsRapid(${idx})" class="w-full text-left p-3.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-sky-200 dark:border-slate-700 font-bold text-xs cursor-pointer">${["A", "B", "C", "D"][idx]}. ${tsEscHtml(o)}</button>`).join("")}
            </div>
            <div id="tsRapidExp" class="hidden p-3 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800"></div>
            <button id="tsRapidNextBtn" onclick="nextTsRapid()" class="hidden btn-watch w-full text-xs">Next Question ➔</button>
        </div>`;
}
window.restartTsRapidQuiz = function() {
    _tsRapidIdx = 0; _tsRapidScore = 0; _tsRapidAnswered = false;
    delete TS_PRO_STORE.daily_quiz_history[tsTodayKey()];
    openVaultToolDetail("rapid_quiz");
};
window.ansTsRapid = function(chosen) {
    if (_tsRapidAnswered) return;
    _tsRapidAnswered = true;
    const q = TS_RAPID_QUIZ_BANK[_tsRapidIdx];
    document.querySelectorAll("#tsRapidOpts button").forEach((b, i) => {
        if (i === q.ans) b.className = "w-full text-left p-3.5 rounded-xl bg-emerald-100 border-2 border-emerald-500 text-emerald-950 font-black text-xs";
        else if (i === chosen) b.className = "w-full text-left p-3.5 rounded-xl bg-rose-100 border-2 border-rose-500 text-rose-950 font-black text-xs";
    });
    if (chosen === q.ans) _tsRapidScore++;
    const exp = document.getElementById("tsRapidExp");
    exp.textContent = "💡 " + q.exp;
    exp.classList.remove("hidden");
    const nxt = document.getElementById("tsRapidNextBtn");
    nxt.textContent = _tsRapidIdx === TS_RAPID_QUIZ_BANK.length - 1 ? "🏁 Finish Quiz" : "Next Question ➔";
    nxt.classList.remove("hidden");
};
window.nextTsRapid = function() {
    _tsRapidAnswered = false;
    if (_tsRapidIdx < TS_RAPID_QUIZ_BANK.length - 1) {
        _tsRapidIdx++;
        openVaultToolDetail("rapid_quiz");
    } else {
        TS_PRO_STORE.daily_quiz_history[tsTodayKey()] = { score: _tsRapidScore, total: TS_RAPID_QUIZ_BANK.length };
        tsAddStudyMinutes(5);
        tsLogActivity("RAPID_QUIZ", `Scored ${_tsRapidScore}/${TS_RAPID_QUIZ_BANK.length}`);
        _tsRapidIdx = 0;
        openVaultToolDetail("rapid_quiz");
    }
};
