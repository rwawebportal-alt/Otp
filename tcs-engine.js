// =========================================================
// RWA PAID TEST SERIES - PRO DYNAMIC TCS CBT ENGINE (tcs-engine.js)
// ALL ORIGINAL FEATURES INTACT + REAL 4-DB LEADERBOARD, TIME-TRAP,
// NIGHT EXAM, FONT ZOOM, SHORTCUTS, CUSTOM MOCK, FLASHCARD & PDF PRINT
// =========================================================

let NEXT_BUILD_ID = localStorage.getItem("rwa_next_build_id") || "TDvVxPHlB8LGPavKJeaEV";
const RWA_TERMS_WORKER = "https://test.src22420.workers.dev/?url=";
const PAUSED_TESTS_STORAGE_KEY = "rwa_paused_tests_v1";

(function injectExactTcsStyles() {
    if (document.getElementById("tcs-exact-fix-styles")) return;
    const st = document.createElement("style");
    st.id = "tcs-exact-fix-styles";
    st.innerHTML = `
        #slideTestAttempt, #slideTestAttempt.active-slide { animation: none !important; transform: none !important; padding: 0 !important; margin: 0 !important; }
        .tcs-fullscreen-shell { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100dvh !important; background: #eff6ff; z-index: 99999 !important; overflow: hidden; }

        .tcs-sec-heading { font-size: 15px; font-weight: 800; color: #1a237e; margin: 10px 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 6px; }
        #subjects-selection-container { display: flex !important; flex-direction: column !important; gap: 10px !important; position: relative !important; width: 100% !important; margin-bottom: 14px !important; }
        .tcs-sub-row { position: relative !important; width: 100% !important; display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 13px 15px !important; border-radius: 12px !important; font-size: 14px !important; transition: all 0.18s ease !important; margin: 0 !important; }
        .tcs-sub-row.fixed-sub { background: #e0f2fe !important; border: 1.5px solid #bae6fd !important; }
        .tcs-sub-row.opt-sub { background: #ffffff !important; border: 1.5px solid #cbd5e1 !important; cursor: pointer !important; }
        .tcs-sub-row.opt-sub.selected { background: #dcfce7 !important; border: 2px solid #22c55e !important; }
        .tcs-sub-left { display: flex !important; align-items: center !important; gap: 9px !important; font-weight: 800 !important; color: #0f172a !important; text-align: left !important; line-height: 1.35 !important; }
        .tcs-sub-pill { background: rgba(255,255,255,0.85) !important; color: #1e293b !important; font-size: 12px !important; font-weight: 800 !important; padding: 4px 11px !important; border-radius: 14px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
        .tcs-opt-heading { font-size: 14px !important; font-weight: 900 !important; color: #0f172a !important; margin: 10px 0 4px 0 !important; }

        /* INLINE MATH, NUMBERS & QUESTION TEXT FIX */
        .tcs-q-text, .sol-q-txt, .fs-q-txt, .fs-exp-text { font-size: 16.5px; line-height: 1.7 !important; color: #0f172a; font-weight: 600 !important; word-break: break-word !important; }
        .tcs-q-para { margin: 0 0 10px 0 !important; padding: 0 !important; display: block !important; line-height: 1.7 !important; }
        .tcs-q-para:last-child { margin-bottom: 0 !important; }
        .tcs-q-text p, .sol-q-txt p, .fs-q-txt p, .fs-exp-text p { margin: 0 0 8px 0 !important; padding: 0 !important; line-height: 1.7 !important; }
        .tcs-q-text p:last-child, .sol-q-txt p:last-child, .fs-q-txt p:last-child, .fs-exp-text p:last-child { margin-bottom: 0 !important; }
        #live-test-screen .tcs-option p, #live-test-screen .tcs-option div, .fs-opt p, .fs-opt div { margin: 0 !important; padding: 0 !important; display: inline !important; line-height: 1.5 !important; }
        .tcs-opt-letter { font-weight: 900 !important; color: #1e293b !important; margin-right: 12px !important; min-width: 22px !important; flex-shrink: 0 !important; }
        .tcs-option.selected .tcs-opt-letter { color: #2563eb !important; }

        .tcs-q-text mjx-container, .sol-q-txt mjx-container, .fs-q-txt mjx-container, .fs-exp-text mjx-container,
        .tcs-option mjx-container, .fs-opt mjx-container,
        mjx-container[jax="CHTML"], mjx-container[display="true"],
        .MathJax, .math-tex, math, .katex, .katex-html {
            display: inline-block !important; vertical-align: middle !important; margin: 0 2px !important; padding: 0 !important; line-height: 1.2 !important; text-align: left !important; font-style: normal !important;
        }
        .tcs-q-text img, .sol-q-txt img, .fs-q-txt img, .fs-exp-text img,
        .tcs-option img, .fs-opt img,
        .tcs-q-text svg, .sol-q-txt svg, .fs-q-txt svg, .fs-exp-text svg,
        .tcs-option svg, .fs-opt svg,
        #bmDetailQuestion img, #bmDetailOptions img, #bmDetailSolution img, #bookmarksListContainer img {
            display: inline-block !important; vertical-align: middle !important; max-width: 100% !important; height: auto !important; margin: 2px 3px !important;
        }

        /* PAUSE / CLOSE MODAL */
        .tcs-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .tcs-modal-card { background: #ffffff; width: 100%; max-width: 390px; border-radius: 22px; padding: 22px 20px; box-shadow: 0 20px 45px rgba(0,0,0,0.35); text-align: center; color: #0f172a; }
    `;
    document.head.appendChild(st);
})();

let tcsState = {
    activeTestKey: null,
    testMeta: null,
    pagePropsMeta: null,
    isCustomMode: false,
    rawAllQuestions: [],
    allParsedSections: [],
    selectedOptionalByGroup: {},
    activeSections: [],
    questions: [],
    currentQIdx: 0,
    responses: {},
    activeSectionIndex: 0,
    timerInterval: null,
    secondsLeft: 0,
    isSectionalTiming: false,
    isPartSwitchingRestricted: false,
    sectionTimeAllocated: [],
    sectionSecondsLeft: [],
    isSubmitted: false,
    lang: "en",
    fontSizePx: (window.TS_PRO_STORE && TS_PRO_STORE.preferences && TS_PRO_STORE.preferences.fontSize) || 16,
    tabSwitchWarnings: 0,
    activeSolFilter: "all",
    activeFullSolIdx: 0,
    lastSubmittedScore: 0,
    lastMaxMarks: 0,
    lastWrongQuestions: []
};

function stripPlainText(html) {
    if (!html) return "";
    return String(html).replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

// =========================================================
// SMART QUESTION, MATH & OPTION HTML NORMALIZER (100% ORIGINAL)
// =========================================================
function cleanQuestionHtml(rawHtml, isOption = false) {
    if (!rawHtml) return "";
    let str = String(rawHtml).trim();
    if (!str) return "";

    str = str
        .replace(/font-size:\s*\d+(\.\d+)?(pt|px|em|rem)\s*;?/gi, "")
        .replace(/font-family:\s*['"]?KOKILA['"]?\s*;?/gi, "")
        .replace(/line-height:\s*[^;"]+;?/gi, "")
        .replace(/&nbsp;/gi, " ");

    str = str
        .replace(/\\\[([\s\S]*?)\\\]/g, "\\($1\\)")
        .replace(/\$\$([\s\S]*?)\$\$/g, "\\($1\\)");

    str = str
        .replace(/\\\(\s*([+-]?\d+(?:[.,:/]\d+)*(?:\s*\\?%)?)\s*\\\)/g, (_, num) => num.replace(/\\%/g, "%"))
        .replace(/\$\s*([+-]?\d+(?:[.,:/]\d+)*(?:\s*\\?%)?)\s*\$/g, (_, num) => num.replace(/\\%/g, "%"));

    const temp = document.createElement("div");
    temp.innerHTML = str;
    temp.querySelectorAll("style, script, meta, link").forEach(el => el.remove());

    temp.querySelectorAll("math").forEach(mathEl => {
        mathEl.setAttribute("display", "inline");
        mathEl.style.display = "inline-block";
        mathEl.style.verticalAlign = "middle";
        mathEl.querySelectorAll("mi").forEach(mi => {
            if (/^[\s\d.,+%₹:-]+$/.test(mi.textContent || "")) {
                const mn = document.createElement("mn");
                mn.textContent = mi.textContent.trim();
                mi.replaceWith(mn);
            }
        });
        if (!mathEl.querySelector("mfrac, msqrt, mroot, msup, msub, msubsup, munder, mover, munderover, mtable, mmultiscripts")) {
            const span = document.createElement("span");
            span.textContent = (mathEl.textContent || "").replace(/\s+/g, " ").trim();
            mathEl.replaceWith(span);
        }
    });

    temp.querySelectorAll(".katex").forEach(kEl => {
        const htmlPart = kEl.querySelector(".katex-html");
        const mmlPart = kEl.querySelector(".katex-mathml");
        if (htmlPart && mmlPart) htmlPart.remove();
    });
    temp.querySelectorAll("mjx-container").forEach(mjx => {
        mjx.removeAttribute("display");
        mjx.style.display = "inline-block";
        mjx.style.margin = "0 2px";
    });

    temp.querySelectorAll("i, em, var, dfn, cite, address, blockquote").forEach(el => {
        const txt = (el.textContent || "").trim();
        if (/^[\s\d.,:;%₹+-]+$/.test(txt) && !el.querySelector("img, svg")) {
            const span = document.createElement("span");
            span.textContent = txt;
            el.replaceWith(span);
        } else if (el.tagName === "BLOCKQUOTE" || el.tagName === "ADDRESS") {
            const span = document.createElement("span");
            span.innerHTML = el.innerHTML;
            el.replaceWith(span);
        }
    });

    if (temp.querySelector("table")) return temp.innerHTML;

    let workingHtml = temp.innerHTML
        .replace(/<\s*br\s*\/?\s*>/gi, "___RWA_LINE_BREAK___")
        .replace(/<\/\s*(p|div|h[1-6]|li)\s*>/gi, "___RWA_LINE_BREAK___")
        .replace(/<\s*(p|div|h[1-6]|li)(\s[^>]*)?>/gi, "___RWA_LINE_BREAK___");

    const rawSegments = workingHtml
        .split("___RWA_LINE_BREAK___")
        .map(s => s.replace(/\s+/g, " ").trim())
        .filter(s => {
            if (!s) return false;
            const plain = s.replace(/<[^>]+>/g, "").trim();
            return Boolean(plain) || /<(img|svg|math|mjx-container)/i.test(s);
        });

    if (rawSegments.length === 0) return temp.innerHTML;
    if (isOption) return rawSegments.join(" ").replace(/\s+([.,;?!।%])/g, "$1").trim();

    const getPlain = (htmlSeg) => htmlSeg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const isPureNumOrMath = (plainStr, htmlSeg) => {
        if (!plainStr && /<(img|svg|math|mjx-container)/i.test(htmlSeg)) return true;
        return /^[+-]?[\d.,:%₹/()+-]+$/.test(plainStr) || (plainStr.length <= 12 && /^\\\(.*\\\)$/.test(plainStr));
    };
    const hasDevanagari = (s) => /[\u0900-\u097F]/.test(s);
    const hasLatinWords = (s) => /[a-zA-Z]{3,}/.test(s);
    const endsWithSentencePunct = (plainStr) => {
        if (!plainStr) return false;
        if (/\b(Rs|Dr|Mr|Mrs|Ms|Prof|St|No|Fig|Eq|vs|etc|i\.e|e\.g)\.$/i.test(plainStr)) return false;
        return /[.?!।:…]["')\]}]*$/.test(plainStr);
    };
    const startsWithListMarker = (plainStr) => /^(?:\(?\d+[.)]\s+|\(?[a-eA-E][.)]\s+|\(?[ivxIVX]+[.)]\s+|[-•*]\s+|Statement\b|Conclusion\b|Assertion\b|Reason\b|Direction\b|Note\b|कथन\b|निष्कर्ष\b|अभिकथन\b|कारण\b|निर्देश\b|नोट\b)/i.test(plainStr);

    const mergedParagraphs = [];
    for (let i = 0; i < rawSegments.length; i++) {
        const segHtml = rawSegments[i];
        const segPlain = getPlain(segHtml);
        if (mergedParagraphs.length === 0) { mergedParagraphs.push(segHtml); continue; }

        const prevHtml = mergedParagraphs[mergedParagraphs.length - 1];
        const prevPlain = getPlain(prevHtml);
        const nextSegPlain = (i + 1 < rawSegments.length) ? getPlain(rawSegments[i + 1]) : "";
        const startsWithPunct = /^[.,;?!।%)}\]]/.test(segPlain);
        const isNumberStartingHindiSentence = isPureNumOrMath(segPlain, segHtml) && hasDevanagari(nextSegPlain) && hasLatinWords(prevPlain) && !hasDevanagari(prevPlain);
        const isLanguageSwitch = hasLatinWords(prevPlain) && !hasDevanagari(prevPlain) && hasDevanagari(segPlain);

        let shouldJoin = false;
        if (startsWithPunct) shouldJoin = true;
        else if (isNumberStartingHindiSentence || isLanguageSwitch || startsWithListMarker(segPlain)) shouldJoin = false;
        else if (!endsWithSentencePunct(prevPlain)) shouldJoin = true;

        if (shouldJoin) {
            mergedParagraphs[mergedParagraphs.length - 1] = `${prevHtml}${startsWithPunct ? "" : " "}${segHtml}`.replace(/\s+([.,;?!।])/g, "$1");
        } else {
            mergedParagraphs.push(segHtml);
        }
    }
    return mergedParagraphs.length === 1 ? mergedParagraphs[0] : mergedParagraphs.map(p => `<div class="tcs-q-para">${p}</div>`).join("");
}
window.cleanQuestionHtml = cleanQuestionHtml;

function isLanguageOrOptionalTitle(titleStr) {
    const s = String(titleStr || "").toLowerCase().trim();
    return /\b(hindi|english|sanskrit|urdu|bengali|marathi|gujarati|punjabi|tamil|telugu|kannada|malayalam|odia|assamese|optional|language)\b/i.test(s) || /(हिन्दी|हिंदी|अंग्रेजी|संस्कृत)/.test(s);
}

// =========================================================
// PAUSE / RESUME STORAGE ENGINE
// =========================================================
function getCurrentTestStorageId() {
    const t = tcsState.testMeta || {};
    return String(t.id || tcsState.activeTestKey || "").trim();
}

function getAllPausedTestsMap() {
    try {
        const raw = localStorage.getItem(PAUSED_TESTS_STORAGE_KEY);
        if (raw) { const p = JSON.parse(raw); if (p && typeof p === "object") return p; }
    } catch {}
    return {};
}

function getPausedTestState(testId) {
    const tid = String(testId || "").trim();
    return tid ? (getAllPausedTestsMap()[tid] || null) : null;
}

function savePausedTestState() {
    if (tcsState.isCustomMode) return;
    const tid = getCurrentTestStorageId();
    if (!tid || tcsState.isSubmitted || !tcsState.questions || tcsState.questions.length === 0) return;
    const map = getAllPausedTestsMap();
    map[tid] = {
        testId: tid,
        activeTestKey: tcsState.activeTestKey,
        selectedOptionalByGroup: tcsState.selectedOptionalByGroup,
        currentQIdx: tcsState.currentQIdx,
        activeSectionIndex: tcsState.activeSectionIndex,
        secondsLeft: tcsState.secondsLeft,
        isSectionalTiming: tcsState.isSectionalTiming,
        isPartSwitchingRestricted: tcsState.isPartSwitchingRestricted,
        sectionTimeAllocated: tcsState.sectionTimeAllocated,
        sectionSecondsLeft: tcsState.sectionSecondsLeft,
        responses: tcsState.responses,
        lang: tcsState.lang,
        savedAt: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    };
    try { localStorage.setItem(PAUSED_TESTS_STORAGE_KEY, JSON.stringify(map)); } catch {}
}

function clearPausedTestState(testId) {
    const tid = String(testId || getCurrentTestStorageId() || "").trim();
    if (!tid) return;
    const map = getAllPausedTestsMap();
    if (map[tid]) {
        delete map[tid];
        try { localStorage.setItem(PAUSED_TESTS_STORAGE_KEY, JSON.stringify(map)); } catch {}
    }
}

function ensureCloseResumeUI() {
    const headerRight = document.querySelector("#live-test-screen .tcs-header > div:last-child");
    if (headerRight && !document.getElementById("tcs-close-resume-btn")) {
        const btn = document.createElement("button");
        btn.id = "tcs-close-resume-btn";
        btn.className = "px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] border-0 cursor-pointer shadow-sm";
        btn.innerHTML = "⏸ Pause";
        btn.onclick = () => window.openCloseOrResumeModal();
        headerRight.insertBefore(btn, headerRight.firstChild);
    }

    const liveScreen = document.getElementById("live-test-screen");
    if (liveScreen && !document.getElementById("tcs-action-modal")) {
        const modal = document.createElement("div");
        modal.id = "tcs-action-modal";
        modal.className = "tcs-modal-backdrop tcs-hidden";
        modal.innerHTML = `<div class="tcs-modal-card" id="tcs-action-modal-content"></div>`;
        liveScreen.appendChild(modal);
    }
}

window.openCloseOrResumeModal = function() {
    ensureCloseResumeUI();
    const modal = document.getElementById("tcs-action-modal");
    const box = document.getElementById("tcs-action-modal-content");
    if (!modal || !box) return;
    box.innerHTML = `
        <div style="font-size:34px; margin-bottom:8px;">⏸️</div>
        <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin:0 0 6px 0;">Test Close ya Resume?</h3>
        <p style="font-size:13px; color:#475569; font-weight:600; line-height:1.5; margin-bottom:18px;">
            Kya aap is test ko <b>Resume</b> ke liye save rakhna chahte hain ya <b>Close</b> karna chahte hain?
        </p>
        <div style="display:flex; flex-direction:column; gap:10px;">
            ${!tcsState.isCustomMode ? `<button onclick="saveAndExitForResume()" style="width:100%; padding:13px; border-radius:11px; border:none; background:#16a34a; color:#fff; font-weight:800; font-size:14px; cursor:pointer;">💾 Save & Resume Later</button>` : ""}
            <button onclick="discardAndCloseTest()" style="width:100%; padding:12px; border-radius:11px; border:none; background:#e11d48; color:#fff; font-weight:800; font-size:14px; cursor:pointer;">🚪 Test Close (Exit)</button>
            <button onclick="closeTcsActionModal()" style="width:100%; padding:11px; border-radius:11px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#1e293b; font-weight:800; font-size:13px; cursor:pointer;">▶️ Continue Test</button>
        </div>`;
    modal.classList.remove("tcs-hidden");
};

window.closeTcsActionModal = function() { document.getElementById("tcs-action-modal")?.classList.add("tcs-hidden"); };
window.saveAndExitForResume = function() {
    savePausedTestState();
    if (typeof window.tsPushCloudSync === "function") window.tsPushCloudSync();
    if (typeof window.tsLogActivity === "function") window.tsLogActivity("PAUSE_TEST", (tcsState.testMeta && tcsState.testMeta.title) || "Mock Test");
    window.closeTcsActionModal();
    window.exitCbtTest();
};
window.discardAndCloseTest = function() { clearPausedTestState(); window.closeTcsActionModal(); window.exitCbtTest(); };

// =========================================================
// DYNAMIC USER AUTH, COOKIE EXTRACTOR & DEDICATED WORKER
// =========================================================
function getLoggedInUserAuthDetails() {
    let tokObj = (tcsState.testMeta && tcsState.testMeta.tokenObj) || (window.state && window.state.activeTokenObj) || (Array.isArray(window.USER_TOKENS) && window.USER_TOKENS[0]) || null;
    if (!tokObj) { try { const saved = JSON.parse(localStorage.getItem("rwa_user_tokens_v2") || "[]"); if (Array.isArray(saved) && saved.length > 0) tokObj = saved[0]; } catch {} }
    let profileObj = window.USER_PROFILE || null;
    if (!profileObj) { try { profileObj = JSON.parse(localStorage.getItem("rwa_user_profile_v2") || "null"); } catch {} }

    const token = (tokObj && tokObj.token) ? String(tokObj.token).replace(/^Bearer\s+/i, "").trim() : "";
    const userId = String((profileObj && (profileObj.userid || profileObj.id)) || (tokObj && tokObj.userId) || (typeof extractUidFromJwt === "function" ? extractUidFromJwt(token) : "") || "").trim();
    const rawBaseUrl = (typeof API_BASE !== "undefined" && API_BASE) ? API_BASE : "https://rozgarapinew.teachx.in";
    const normalizedBaseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;

    const cookieParts = [`base_url=${encodeURIComponent(normalizedBaseUrl)}`, `Authorization=${token}`, `User-ID=${userId}`];
    if (document.cookie && document.cookie.trim()) {
        document.cookie.split(";").forEach(pair => {
            const trimmed = pair.trim();
            if (trimmed && !/^(base_url|Authorization|User-ID)=/i.test(trimmed)) cookieParts.push(trimmed);
        });
    }
    return { token, userId, baseUrl: normalizedBaseUrl, cookieString: cookieParts.join("; ") };
}

async function fetchOnlyRwaTermsViaDedicatedWorker(targetUrl) {
    try {
        const userAuth = getLoggedInUserAuthDetails();
        const workerUrl = `${RWA_TERMS_WORKER}${encodeURIComponent(targetUrl)}&cookie=${encodeURIComponent(userAuth.cookieString)}&token=${encodeURIComponent(userAuth.token)}&uid=${encodeURIComponent(userAuth.userId)}&base_url=${encodeURIComponent(userAuth.baseUrl)}`;
        const res = await fetch(workerUrl);
        if (!res.ok) return null;
        const json = await res.json();
        if (json && json.buildId && json.buildId !== NEXT_BUILD_ID) {
            NEXT_BUILD_ID = json.buildId;
            localStorage.setItem("rwa_next_build_id", NEXT_BUILD_ID);
        }
        return json;
    } catch { return null; }
}

async function fetchRwaNextTermsData(t) {
    const testId = t.id;
    if (!testId) return null;
    const uniqueSeriesIds = [...new Set([t.seriesId, t.test_series_id, window.state && window.state.activeSeriesId].filter(Boolean).map(s => String(s).trim()))];
    for (const tsId of uniqueSeriesIds) {
        const termsUrl = `https://rojgarwithankit.co.in/_next/data/${NEXT_BUILD_ID}/test-series/${tsId}/test-ssc/${testId}/terms.json?id=${tsId}&testId=${testId}`;
        let data = await fetchOnlyRwaTermsViaDedicatedWorker(termsUrl);
        if (data && data.pageProps && (data.pageProps.test || data.pageProps.testSections)) return data;

        const attemptUrl = `https://rojgarwithankit.co.in/_next/data/${NEXT_BUILD_ID}/test-series/${tsId}/test-ssc/${testId}/attempt.json?id=${tsId}&testId=${testId}`;
        data = await fetchOnlyRwaTermsViaDedicatedWorker(attemptUrl);
        if (data && data.pageProps && (data.pageProps.test || data.pageProps.testSections)) return data;
    }
    return null;
}

async function fetchQuestionsAndSectionsForMeta(t) {
    let exactTestMeta = null, pagePropsObj = null, loadedQuestions = [], externalSecMap = {}, orderedServerSections = [];
    const rawJsonData = await fetchRwaNextTermsData(t);

    if (rawJsonData && rawJsonData.pageProps) {
        pagePropsObj = rawJsonData.pageProps;
        exactTestMeta = pagePropsObj.test || {};
        const rawSectionsArray =
            (Array.isArray(pagePropsObj.testSections) && pagePropsObj.testSections) ||
            (Array.isArray(pagePropsObj.test_sections) && pagePropsObj.test_sections) ||
            (Array.isArray(exactTestMeta.testSections) && exactTestMeta.testSections) ||
            (Array.isArray(exactTestMeta.test_sections) && exactTestMeta.test_sections) || [];

        rawSectionsArray.forEach((sec, idx) => {
            const sidPrimary = String(sec.section_id || sec.id || sec.subjectid || (idx + 1)).trim();
            const sidSecondary = String(sec.id || sec.section_id || (idx + 1)).trim();
            const secTitle = String(sec.section_title || sec.section_name || sec.title || sec.part_title || `Section ${sidPrimary}`).trim();

            const secInfo = {
                secId: sidPrimary, name: secTitle, partTitle: String(sec.part_title || "").trim(),
                rawIsOptional: String(sec.is_optional || "0") === "1",
                fixedTiming: parseFloat(sec.fixed_timing || 0) || 0,
                cutoffScore: parseFloat(sec.cutoff_score || 0) || 0,
                numberOfQuestions: parseInt(sec.numberOfQuestions || sec.no_of_questions || 0) || 0,
                maximumMarks: parseFloat(sec.maximumMarks || sec.max_marks || 0) || 0,
                optGroup: sec.optional_group || "A", orderIndex: idx
            };
            orderedServerSections.push(secInfo);
            externalSecMap[sidPrimary] = secInfo;
            externalSecMap[sidSecondary] = secInfo;

            if (Array.isArray(sec.questions) && sec.questions.length > 0) {
                sec.questions.forEach(q => loadedQuestions.push({ ...q, section_id: sidPrimary, section_name: secTitle }));
            }
        });
    }

    const rawQField = (exactTestMeta && (exactTestMeta.test_questions_url || exactTestMeta.test_questions_url_2)) || t.test_questions_url || t.questions_url || "";
    const qUrlToFetch = (typeof decryptAppX === "function" && rawQField && !String(rawQField).startsWith("http"))
        ? (decryptAppX(rawQField) || rawQField)
        : String(rawQField).replace(/\\\//g, "/").trim();

    if (loadedQuestions.length === 0 && qUrlToFetch) {
        let qJson = null;
        try { const directRes = await fetch(qUrlToFetch); if (directRes.ok) qJson = await directRes.json(); } catch {}
        if (!qJson && window.WORKER_RAW_PROXY) {
            try { const proxyRes = await fetch(window.WORKER_RAW_PROXY + encodeURIComponent(qUrlToFetch)); if (proxyRes.ok) qJson = await proxyRes.json(); } catch {}
        }
        if (qJson) loadedQuestions = Array.isArray(qJson) ? qJson : (qJson.data || qJson.questions || []);
    }

    return { loadedQuestions, externalSecMap, orderedServerSections, exactTestMeta, pagePropsObj };
}

// =========================================================
// LAUNCH REGULAR & CUSTOM MOCK TESTS
// =========================================================
window.launchCustomQuestionsTcs = function(title, questionsArr, mins = 15) {
    if (!Array.isArray(questionsArr) || !questionsArr.length) return;
    const customId = "custom_" + Date.now();
    const meta = {
        id: customId, title: title || "Custom Revision Test",
        time: String(mins), questions: String(questionsArr.length), marks: String(questionsArr.length * 2), isCustom: true
    };
    tcsState.activeTestKey = `test_${customId}`;
    tcsState.testMeta = meta;
    tcsState.isCustomMode = true;
    tcsState.isSubmitted = false;
    tcsState.responses = {};
    tcsState.currentQIdx = 0;
    tcsState.activeSectionIndex = 0;
    tcsState.selectedOptionalByGroup = {};
    tcsState.tabSwitchWarnings = 0;
    tcsState.rawAllQuestions = questionsArr;

    window.showSlide("slideTestAttempt");
    ["live-test-screen", "submit-screen", "analysis-screen", "solutions-screen", "full-sol-screen"].forEach(id => document.getElementById(id)?.classList.add("tcs-hidden"));
    document.getElementById("start-screen")?.classList.remove("tcs-hidden");
    document.getElementById("tcs-start-title").textContent = meta.title;
    if (typeof window.tsLogActivity === "function") window.tsLogActivity("START_CUSTOM_MOCK", meta.title);
    prepareAllSectionsAndRenderStart({}, [], true);
};

window.launchTcsCbtEngine = async function(tKey) {
    const t = window.state.testMap[tKey];
    if (!t) return;

    tcsState.activeTestKey = tKey;
    tcsState.testMeta = { ...t };
    tcsState.pagePropsMeta = null;
    tcsState.isCustomMode = Boolean(t.isCustom);
    tcsState.isSubmitted = false;
    tcsState.responses = {};
    tcsState.currentQIdx = 0;
    tcsState.activeSectionIndex = 0;
    tcsState.selectedOptionalByGroup = {};
    tcsState.tabSwitchWarnings = 0;

    window.showSlide("slideTestAttempt");
    ["live-test-screen", "submit-screen", "analysis-screen", "solutions-screen", "full-sol-screen"].forEach(id => document.getElementById(id)?.classList.add("tcs-hidden"));
    document.getElementById("start-screen")?.classList.remove("tcs-hidden");

    document.getElementById("tcs-start-title").textContent = t.title || "";
    document.getElementById("subjects-selection-container").innerHTML = `<div style="text-align:center; padding:22px; font-weight:800; color:#1a237e;">🔄 Test Loading...</div>`;
    const statsBox = document.querySelector("#start-screen .stats-box");
    if (statsBox) statsBox.style.display = "none";
    const startBtn = document.getElementById("tcs-start-btn");
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = "Test Loading..."; }
    document.getElementById("tcs-resume-banner-box")?.remove();

    if (typeof window.tsLogActivity === "function") window.tsLogActivity("OPEN_TEST", t.title || `Test #${t.id}`);

    const { loadedQuestions, externalSecMap, orderedServerSections, exactTestMeta, pagePropsObj } = await fetchQuestionsAndSectionsForMeta(t);
    tcsState.rawAllQuestions = loadedQuestions || [];
    tcsState.pagePropsMeta = pagePropsObj || null;

    if (!tcsState.rawAllQuestions || tcsState.rawAllQuestions.length === 0) {
        document.getElementById("subjects-selection-container").innerHTML = `<div style="text-align:center; padding:18px; font-weight:700; color:#e53935;">⚠️ Test data load nahi ho paya. Kripya dobara try karein.</div>`;
        if (typeof window.tsLogError === "function") window.tsLogError("TestLoadFail", `Empty questions for Test #${t.id}`);
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = "Retry"; startBtn.onclick = () => window.launchTcsCbtEngine(tKey); }
        return;
    }

    if (exactTestMeta && typeof exactTestMeta === "object") {
        tcsState.testMeta = { ...tcsState.testMeta, ...exactTestMeta };
        const dynamicPdf = exactTestMeta.pdf_url || exactTestMeta.pdf_summary_link || exactTestMeta.solution_pdf_summary_link || exactTestMeta.test_solutions_pdf || "";
        if (dynamicPdf && typeof resolvePdfUrl === "function") tcsState.testMeta.resolvedPdf = resolvePdfUrl(dynamicPdf, exactTestMeta.pdf_url);
        if (exactTestMeta.language) tcsState.lang = String(exactTestMeta.language).toLowerCase().startsWith("hi") ? "hi" : "en";
        else if (Array.isArray(exactTestMeta.test_languages) && exactTestMeta.test_languages.length === 1) tcsState.lang = String(exactTestMeta.test_languages[0]).toLowerCase().includes("hindi") ? "hi" : "en";
    }

    document.getElementById("tcs-start-title").textContent = tcsState.testMeta.title || "";
    if (statsBox) statsBox.style.display = "block";
    if (startBtn) startBtn.disabled = false;

    prepareAllSectionsAndRenderStart(externalSecMap, orderedServerSections, true);
};

// =========================================================
// DEEP JSON ANALYZER FOR COMPULSORY vs OPTIONAL SECTIONS
// =========================================================
function prepareAllSectionsAndRenderStart(externalSecMap = {}, orderedServerSections = [], shouldRenderUI = true) {
    const groupMap = new Map();
    if (Array.isArray(orderedServerSections) && orderedServerSections.length > 0) {
        orderedServerSections.forEach(secInfo => groupMap.set(String(secInfo.secId), { secId: String(secInfo.secId), name: secInfo.name, secMeta: secInfo, questions: [] }));
    }

    tcsState.rawAllQuestions.forEach((q, idx) => {
        const secId = String(q.section_id || q.part_id || q.subject_id || "1").trim();
        const ext = externalSecMap[secId];
        const canonicalSecId = ext ? String(ext.secId) : secId;
        if (!groupMap.has(canonicalSecId)) {
            const dynamicName = (ext && ext.name) || q.section_name || q.section_title || q.subject_name || q.part_title || q.subject || `Section ${canonicalSecId}`;
            groupMap.set(canonicalSecId, { secId: canonicalSecId, name: String(dynamicName).trim(), secMeta: ext || null, questions: [] });
        }
        groupMap.get(canonicalSecId).questions.push({ ...q, rawIndex: idx });
    });

    const parsedSections = [];
    let orderCounter = 0;
    groupMap.forEach((secObj, secId) => {
        if (!secObj.questions || secObj.questions.length === 0) return;
        const ext = secObj.secMeta || externalSecMap[secId] || {};
        let secQuestionMarksSum = 0;
        secObj.questions.forEach(q => { secQuestionMarksSum += parseFloat(q.positive_marks || 0) || 0; });
        const rawIsOpt = Boolean(ext.rawIsOptional) || secObj.questions.some(q => String(q.is_optional || q.optional || "0") === "1");
        parsedSections.push({
            secId, name: secObj.name, questions: secObj.questions, rawIsOptional: rawIsOpt, isOptional: false,
            fixedTiming: parseFloat(ext.fixedTiming || 0) || 0, numberOfQuestions: ext.numberOfQuestions || secObj.questions.length,
            maximumMarks: ext.maximumMarks || secQuestionMarksSum || 0, cutoffScore: ext.cutoffScore || 0,
            optGroup: ext.optGroup || "A", orderIndex: typeof ext.orderIndex === "number" ? ext.orderIndex : orderCounter++
        });
    });

    parsedSections.sort((a, b) => a.orderIndex - b.orderIndex);

    const meta = tcsState.testMeta || {};
    const totalSecCount = parsedSections.length;
    const showSelector = String(meta.show_sectionselector || "0") === "1";
    const maxSecCount = parseInt(meta.maximumsection || meta.minimumsection || 0) || 0;
    const declaredTestMarks = parseFloat(meta.marks || 0) || 0;
    const sumAllSectionMarks = parsedSections.reduce((acc, s) => acc + (parseFloat(s.maximumMarks) || 0), 0);
    const flaggedOptSections = parsedSections.filter(s => s.rawIsOptional);

    if (!tcsState.isCustomMode && totalSecCount > 1) {
        if (flaggedOptSections.length > 0 && flaggedOptSections.length < totalSecCount) {
            if (declaredTestMarks === 0 || sumAllSectionMarks > declaredTestMarks) flaggedOptSections.forEach(s => { s.isOptional = true; });
        } else if (maxSecCount > 0 && maxSecCount < totalSecCount) {
            if (maxSecCount === 1) parsedSections.forEach(s => { s.isOptional = true; });
            else {
                const optionalPoolSize = totalSecCount - maxSecCount + 1;
                const langSecs = parsedSections.filter(s => isLanguageOrOptionalTitle(s.name));
                if (langSecs.length === optionalPoolSize) langSecs.forEach(s => { s.isOptional = true; });
                else parsedSections.forEach((s, idx) => { if (idx >= maxSecCount - 1) s.isOptional = true; });
            }
        } else if (declaredTestMarks > 0 && sumAllSectionMarks > declaredTestMarks) {
            const excessMarks = sumAllSectionMarks - declaredTestMarks;
            const matchingSecs = parsedSections.filter(s => Math.abs((parseFloat(s.maximumMarks) || 0) - excessMarks) < 0.5);
            const langMatching = matchingSecs.filter(s => isLanguageOrOptionalTitle(s.name));
            if (langMatching.length >= 2) langMatching.slice(-2).forEach(s => { s.isOptional = true; });
            else if (matchingSecs.length >= 2 && showSelector) matchingSecs.slice(-2).forEach(s => { s.isOptional = true; });
        }
    }

    const fixedSecs = parsedSections.filter(s => !s.isOptional);
    const optionalSecs = parsedSections.filter(s => s.isOptional);
    tcsState.allParsedSections = [...fixedSecs, ...optionalSecs];

    const pausedData = !tcsState.isCustomMode ? getPausedTestState(getCurrentTestStorageId()) : null;
    if (pausedData && pausedData.selectedOptionalByGroup && pausedData.selectedOptionalByGroup["A"]) {
        tcsState.selectedOptionalByGroup["A"] = pausedData.selectedOptionalByGroup["A"];
    } else if (optionalSecs.length > 0 && !tcsState.selectedOptionalByGroup["A"]) {
        tcsState.selectedOptionalByGroup["A"] = optionalSecs[0].secId;
    }

    if (shouldRenderUI) renderStartScreenUI();
}

function renderStartScreenUI() {
    const t = tcsState.testMeta || {};
    const container = document.getElementById("subjects-selection-container");
    const fixedSecs = tcsState.allParsedSections.filter(s => !s.isOptional);
    const optionalSecs = tcsState.allParsedSections.filter(s => s.isOptional);

    let html = `<div class="tcs-sec-heading">Subjects in this Test</div>`;
    fixedSecs.forEach(sec => {
        html += `<div class="tcs-sub-row fixed-sub"><div class="tcs-sub-left"><span class="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-black">✓</span><span>${sec.name}</span></div><span class="tcs-sub-pill">${sec.questions.length} Qs</span></div>`;
    });

    if (optionalSecs.length > 0) {
        const chosenSecId = tcsState.selectedOptionalByGroup["A"];
        html += `<div class="tcs-opt-heading">Select Any One Optional Subject</div><div class="grid grid-cols-2 gap-2.5">`;
        optionalSecs.forEach(sec => {
            const isSel = String(sec.secId) === String(chosenSecId);
            html += `<div class="tcs-sub-row opt-sub ${isSel ? "selected" : ""}" onclick="selectOptionalSubject('A', '${sec.secId}')"><div class="tcs-sub-left">${isSel ? `<span class="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-black">✓</span>` : ""}<span>${sec.name}</span></div><span class="tcs-sub-pill">${sec.questions.length} Qs</span></div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;

    const activeSecs = getActiveChosenSections();
    let totalActiveQs = 0, computedMarksFromQs = 0, computedMarksFromSecs = 0, samplePos = null, sampleNeg = null;
    activeSecs.forEach(sec => {
        totalActiveQs += sec.questions.length;
        computedMarksFromSecs += parseFloat(sec.maximumMarks || 0);
        sec.questions.forEach(q => {
            const p = parseFloat(q.positive_marks), n = parseFloat(q.negative_marks);
            if (!isNaN(p)) { computedMarksFromQs += p; if (samplePos === null) samplePos = p; }
            if (!isNaN(n) && sampleNeg === null) sampleNeg = n;
        });
    });

    const finalMaxMarks = computedMarksFromQs > 0 ? computedMarksFromQs : ((!isNaN(parseFloat(t.marks)) && parseFloat(t.marks) > 0) ? parseFloat(t.marks) : computedMarksFromSecs);
    const rawTimeStr = String(t.time || "").trim();
    const hasPlusTime = rawTimeStr.includes("+");
    const hasFixedSecTiming = activeSecs.some(s => parseFloat(s.fixedTiming || 0) > 0);
    let totalMins = 0, timingMode = "Overall Timing";

    if (hasPlusTime) { totalMins = rawTimeStr.split("+").reduce((acc, v) => acc + (parseInt(v.trim()) || 0), 0); timingMode = "Sectional Timing"; }
    else if (hasFixedSecTiming) { totalMins = activeSecs.reduce((acc, s) => acc + (parseFloat(s.fixedTiming) || 0), 0); timingMode = "Sectional Timing"; }
    else { totalMins = parseInt(rawTimeStr) || 0; timingMode = "Overall Timing"; }

    const fmtNum = (n) => Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
    const markingSchemeText = `${samplePos !== null ? `+${fmtNum(samplePos)}` : "+2"} / ${sampleNeg !== null ? `-${fmtNum(sampleNeg)}` : "-0.5"}`;

    const statsBox = document.querySelector("#start-screen .stats-box");
    if (statsBox) {
        statsBox.style.display = "block";
        statsBox.innerHTML = `
            <div class="font-black text-sm text-slate-900 mb-2.5">Test Summary</div>
            <div class="grid grid-cols-2 gap-2.5 text-xs font-bold text-slate-700">
                <div>• Total Questions: <strong class="text-slate-950">${totalActiveQs}</strong></div>
                <div>• Total Time: <strong class="text-slate-950">${totalMins} mins</strong></div>
                <div>• Max Marks: <strong class="text-slate-950">${fmtNum(finalMaxMarks)}</strong></div>
                <div>• Marking: <strong class="text-slate-950">${markingSchemeText}</strong></div>
            </div>
            <div class="mt-2 pt-2 border-t border-slate-200 flex justify-between text-xs font-bold">
                <span>Timing Mode:</span>
                <span style="color:${timingMode === "Sectional Timing" ? "#e65100" : "#1e3a8a"};font-weight:900;">${timingMode}</span>
            </div>`;
    }

    const startBtn = document.getElementById("tcs-start-btn");
    document.getElementById("tcs-resume-banner-box")?.remove();
    const pausedData = !tcsState.isCustomMode ? getPausedTestState(getCurrentTestStorageId()) : null;

    if (pausedData && startBtn) {
        startBtn.disabled = false;
        startBtn.style.background = "linear-gradient(135deg, #16a34a, #059669)";
        startBtn.textContent = `▶️ Resume Test (Q.${(pausedData.currentQIdx || 0) + 1} • ${formatHHMMSS(pausedData.secondsLeft || 0)}) →`;
        startBtn.onclick = () => window.resumeSavedTest();

        const freshWrap = document.createElement("div");
        freshWrap.id = "tcs-resume-banner-box";
        freshWrap.style.marginTop = "10px";
        freshWrap.innerHTML = `<button onclick="startFreshTest()" style="width:100%; padding:11px; border-radius:12px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#334155; font-weight:800; font-size:13px; cursor:pointer;">🔄 Start Fresh Test</button>`;
        startBtn.parentNode.appendChild(freshWrap);
    } else if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.background = "linear-gradient(135deg, #2563eb, #3730a3)";
        startBtn.textContent = "Start Test →";
        startBtn.onclick = () => window.startTest();
    }
}

window.startFreshTest = function() { clearPausedTestState(); window.startTest(); };

window.resumeSavedTest = function() {
    const pausedData = getPausedTestState(getCurrentTestStorageId());
    if (!pausedData) { window.startTest(); return; }
    if (pausedData.selectedOptionalByGroup) tcsState.selectedOptionalByGroup = pausedData.selectedOptionalByGroup;
    populateActiveQuestionsFromChosenSections();

    tcsState.responses = pausedData.responses || {};
    tcsState.isSectionalTiming = Boolean(pausedData.isSectionalTiming);
    tcsState.isPartSwitchingRestricted = tcsState.isSectionalTiming || Boolean(pausedData.isPartSwitchingRestricted);
    tcsState.sectionTimeAllocated = Array.isArray(pausedData.sectionTimeAllocated) ? pausedData.sectionTimeAllocated : [];
    tcsState.sectionSecondsLeft = Array.isArray(pausedData.sectionSecondsLeft) ? pausedData.sectionSecondsLeft : [];
    tcsState.activeSectionIndex = Math.min(pausedData.activeSectionIndex || 0, Math.max(0, tcsState.activeSections.length - 1));
    tcsState.secondsLeft = pausedData.secondsLeft || 60;
    tcsState.currentQIdx = Math.min(pausedData.currentQIdx || 0, Math.max(0, tcsState.questions.length - 1));
    if (pausedData.lang) tcsState.lang = pausedData.lang;

    document.getElementById("start-screen").classList.add("tcs-hidden");
    document.getElementById("live-test-screen").classList.remove("tcs-hidden");
    ensureCloseResumeUI();
    renderTcsTabs();
    updateDynamicSubmitBtnLabel();
    loadQuestion(tcsState.currentQIdx);
    startTcsTimer();
    applyTcsFontSize();
    if (typeof window.tsLogActivity === "function") window.tsLogActivity("RESUME_TEST", (tcsState.testMeta && tcsState.testMeta.title) || "Test");
};

window.selectOptionalSubject = function(groupKey, secId) { tcsState.selectedOptionalByGroup[groupKey] = String(secId); renderStartScreenUI(); };

function getActiveChosenSections() {
    const chosenOptId = tcsState.selectedOptionalByGroup["A"];
    return tcsState.allParsedSections.filter(sec => !sec.isOptional || String(sec.secId) === String(chosenOptId));
}

function populateActiveQuestionsFromChosenSections() {
    const chosenSecs = getActiveChosenSections();
    const flatQuestions = [];
    tcsState.activeSections = chosenSecs.map(sec => {
        const mappedQs = sec.questions.map(q => {
            const newGlobalIdx = flatQuestions.length;
            const qCopy = { ...q, originalIndex: newGlobalIdx, _sectionName: sec.name };
            flatQuestions.push(qCopy);
            return qCopy;
        });
        return { secId: sec.secId, name: sec.name, fixedTiming: sec.fixedTiming || 0, maximumMarks: sec.maximumMarks || 0, cutoffScore: sec.cutoffScore || 0, questions: mappedQs };
    });
    tcsState.questions = flatQuestions;
}

// =========================================================
// LIVE CBT TEST + NIGHT EXAM + FONT ZOOM + TAB-SWITCH + SHORTCUTS
// =========================================================
window.startTest = function() {
    const t = tcsState.testMeta || {};
    populateActiveQuestionsFromChosenSections();
    tcsState.responses = {};
    tcsState.currentQIdx = 0;
    tcsState.activeSectionIndex = 0;
    tcsState.tabSwitchWarnings = 0;
    document.getElementById("tcsTabSwitchBadge")?.classList.add("hidden");

    const tStr = String(t.time || "").trim();
    const hasPlusTime = tStr.includes("+");
    const hasFixedSecTiming = tcsState.activeSections.some(s => parseFloat(s.fixedTiming || 0) > 0);

    if (hasPlusTime) {
        const parts = tStr.split("+").map(n => (parseInt(n.trim()) || 0) * 60);
        tcsState.isSectionalTiming = true;
        tcsState.sectionTimeAllocated = tcsState.activeSections.map((_, i) => parts[i] || parts[0] || 0);
        tcsState.sectionSecondsLeft = [...tcsState.sectionTimeAllocated];
        tcsState.secondsLeft = tcsState.sectionSecondsLeft[0];
    } else if (hasFixedSecTiming) {
        tcsState.isSectionalTiming = true;
        tcsState.sectionTimeAllocated = tcsState.activeSections.map(s => (parseFloat(s.fixedTiming) || 0) * 60);
        tcsState.sectionSecondsLeft = [...tcsState.sectionTimeAllocated];
        tcsState.secondsLeft = tcsState.sectionSecondsLeft[0];
    } else {
        tcsState.isSectionalTiming = false;
        tcsState.secondsLeft = (parseInt(tStr) || 60) * 60;
    }

    tcsState.isPartSwitchingRestricted = tcsState.isSectionalTiming || String(t.restrict_part_switching || "0") === "1";

    document.getElementById("start-screen").classList.add("tcs-hidden");
    document.getElementById("live-test-screen").classList.remove("tcs-hidden");
    ensureCloseResumeUI();
    renderTcsTabs();
    updateDynamicSubmitBtnLabel();
    loadQuestion(0);
    startTcsTimer();
    applyTcsFontSize();
    if (typeof window.tsLogActivity === "function") window.tsLogActivity("START_TEST", t.title || `Test #${t.id}`);
};

function applyTcsFontSize() {
    const qEl = document.getElementById("tcs-q-text");
    const optEl = document.getElementById("tcs-options-container");
    if (qEl) qEl.style.fontSize = `${tcsState.fontSizePx}px`;
    if (optEl) optEl.style.fontSize = `${Math.max(13, tcsState.fontSizePx - 1)}px`;
}

window.adjustTcsFont = function(delta) {
    tcsState.fontSizePx = Math.min(24, Math.max(13, tcsState.fontSizePx + delta));
    if (window.TS_PRO_STORE && TS_PRO_STORE.preferences) TS_PRO_STORE.preferences.fontSize = tcsState.fontSizePx;
    applyTcsFontSize();
};

window.toggleTcsNightMode = function() {
    const shell = document.getElementById("tcs-app-wrapper");
    if (!shell) return;
    const isNight = shell.classList.toggle("tcs-night-exam");
    const btn = document.getElementById("tcsNightBtn");
    if (btn) btn.textContent = isNight ? "☀️" : "🌙";
};

document.addEventListener("visibilitychange", () => {
    const liveEl = document.getElementById("live-test-screen");
    if (document.hidden && liveEl && !liveEl.classList.contains("tcs-hidden") && !tcsState.isSubmitted) {
        tcsState.tabSwitchWarnings++;
        savePausedTestState();
        const badge = document.getElementById("tcsTabSwitchBadge");
        if (badge) { badge.textContent = `⚠️ ${tcsState.tabSwitchWarnings}`; badge.classList.remove("hidden"); }
        if (typeof window.tsToast === "function") window.tsToast(`⚠️ Tab switch #${tcsState.tabSwitchWarnings} detected!`, "warning");
    }
});

document.addEventListener("keydown", (e) => {
    const liveEl = document.getElementById("live-test-screen");
    if (!liveEl || liveEl.classList.contains("tcs-hidden") || tcsState.isSubmitted) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (["1", "2", "3", "4"].includes(e.key)) selectTcsOption(e.key);
    else if (e.key === "Enter") { e.preventDefault(); saveAndNext(); }
    else if (e.key.toLowerCase() === "m") markForReview();
    else if (e.key.toLowerCase() === "c") clearResponse();
    else if (e.key === "ArrowRight") nextQuestion();
    else if (e.key === "ArrowLeft") prevQuestion();
});

function updateDynamicSubmitBtnLabel() {
    const btn = document.getElementById("btn-submit-dynamic");
    if (!btn) return;
    btn.textContent = (tcsState.isSectionalTiming && tcsState.activeSectionIndex < tcsState.activeSections.length - 1) ? "Submit Section" : "Submit";
}

function advanceToNextLockedSection() {
    if (tcsState.activeSectionIndex < tcsState.activeSections.length - 1) {
        tcsState.sectionSecondsLeft[tcsState.activeSectionIndex] = 0;
        tcsState.activeSectionIndex++;
        tcsState.secondsLeft = tcsState.sectionSecondsLeft[tcsState.activeSectionIndex];
        renderTcsTabs();
        updateDynamicSubmitBtnLabel();
        const firstQ = tcsState.activeSections[tcsState.activeSectionIndex].questions[0];
        if (firstQ) loadQuestion(firstQ.originalIndex);
        savePausedTestState();
    } else {
        submitTest();
    }
}

function formatMMSS(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function formatHHMMSS(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    return `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

let _tcsAutoSaveCounter = 0;
function startTcsTimer() {
    if (tcsState.timerInterval) clearInterval(tcsState.timerInterval);
    tcsState.timerInterval = setInterval(() => {
        if (tcsState.isSubmitted) return;
        const curIdx = tcsState.currentQIdx;
        if (!tcsState.responses[curIdx]) tcsState.responses[curIdx] = { status: "unattempted", chosenOption: null, timeSpent: 0 };
        tcsState.responses[curIdx].timeSpent = (tcsState.responses[curIdx].timeSpent || 0) + 1;

        const qTimeEl = document.getElementById("tcs-q-time");
        if (qTimeEl) qTimeEl.textContent = formatMMSS(tcsState.responses[curIdx].timeSpent);

        _tcsAutoSaveCounter++;
        if (_tcsAutoSaveCounter % 15 === 0) savePausedTestState();

        if (tcsState.secondsLeft <= 0) {
            if (tcsState.isSectionalTiming && tcsState.activeSectionIndex < tcsState.activeSections.length - 1) {
                window.closeTcsActionModal();
                advanceToNextLockedSection();
                return;
            }
            clearInterval(tcsState.timerInterval);
            submitTest();
            return;
        }
        tcsState.secondsLeft--;
        if (tcsState.isSectionalTiming) tcsState.sectionSecondsLeft[tcsState.activeSectionIndex] = tcsState.secondsLeft;
        const timerEl = document.getElementById("tcs-timer-display");
        if (timerEl) timerEl.textContent = formatHHMMSS(tcsState.secondsLeft);
    }, 1000);
}

function renderTcsTabs() {
    const wrap = document.getElementById("tcs-tabs-container");
    if (!wrap) return;
    wrap.innerHTML = "";
    tcsState.activeSections.forEach((sec, idx) => {
        const isActive = idx === tcsState.activeSectionIndex;
        const isLocked = tcsState.isPartSwitchingRestricted && !isActive;
        const cls = isActive ? "tcs-tab active" : (isLocked ? "tcs-tab locked" : "tcs-tab");
        const lockIcon = isLocked ? (idx < tcsState.activeSectionIndex ? "✅ " : "🔒 ") : "";
        wrap.innerHTML += `<div class="${cls}" onclick="switchTcsSection(${idx})">${lockIcon}${sec.name}</div>`;
    });
}

window.switchTcsSection = function(secIdx) {
    if (tcsState.isPartSwitchingRestricted && secIdx !== tcsState.activeSectionIndex) return;
    if (tcsState.isSectionalTiming) {
        tcsState.sectionSecondsLeft[tcsState.activeSectionIndex] = tcsState.secondsLeft;
        tcsState.secondsLeft = tcsState.sectionSecondsLeft[secIdx];
    }
    tcsState.activeSectionIndex = secIdx;
    renderTcsTabs();
    updateDynamicSubmitBtnLabel();
    const firstQInSec = tcsState.activeSections[secIdx].questions[0];
    if (firstQInSec) loadQuestion(firstQInSec.originalIndex);
};

function loadQuestion(globalIdx) {
    const q = tcsState.questions[globalIdx];
    if (!q) return;

    let foundSecIdx = tcsState.activeSectionIndex;
    tcsState.activeSections.forEach((sec, sIdx) => {
        if (sec.questions.some(sq => sq.originalIndex === globalIdx)) foundSecIdx = sIdx;
    });

    if (foundSecIdx !== tcsState.activeSectionIndex) {
        if (tcsState.isPartSwitchingRestricted) return;
        if (tcsState.isSectionalTiming) {
            tcsState.sectionSecondsLeft[tcsState.activeSectionIndex] = tcsState.secondsLeft;
            tcsState.secondsLeft = tcsState.sectionSecondsLeft[foundSecIdx];
        }
        tcsState.activeSectionIndex = foundSecIdx;
        renderTcsTabs();
        updateDynamicSubmitBtnLabel();
    }

    tcsState.currentQIdx = globalIdx;
    if (!tcsState.responses[globalIdx]) tcsState.responses[globalIdx] = { status: "unattempted", chosenOption: null, timeSpent: 0 };

    const activeSecObj = tcsState.activeSections[tcsState.activeSectionIndex];
    const footerSecEl = document.getElementById("tcs-footer-sec-info");
    if (footerSecEl && activeSecObj) footerSecEl.textContent = activeSecObj.name;

    document.getElementById("tcs-q-num").textContent = globalIdx + 1;
    document.getElementById("tcs-q-time").textContent = formatMMSS(tcsState.responses[globalIdx].timeSpent || 0);

    const posNum = parseFloat(q.positive_marks ?? 2), negNum = parseFloat(q.negative_marks ?? 0.5);
    document.getElementById("tcs-live-pos").textContent = `+${Number.isInteger(posNum) ? posNum : posNum.toFixed(2)}`;
    document.getElementById("tcs-live-neg").textContent = `-${Number.isInteger(negNum) ? negNum : negNum}`;

    const qKey = `test_${(tcsState.testMeta && tcsState.testMeta.id) || tcsState.activeTestKey}_q_${q.id || globalIdx}`;
    const bmBtn = document.getElementById("tcs-bookmark-btn");
    if (bmBtn) {
        const isSaved = typeof window.isQuestionBookmarked === "function" && window.isQuestionBookmarked(qKey);
        bmBtn.textContent = isSaved ? "★ Saved" : "☆ Save";
        bmBtn.className = isSaved
            ? "px-2.5 py-1 rounded-lg bg-amber-500 text-white border border-amber-600 font-extrabold text-xs cursor-pointer"
            : "px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs cursor-pointer";
    }

    const qTxtBox = document.getElementById("tcs-q-text");
    const rawQHtml = (tcsState.lang === "hi" && (q.question_hi || q.question_hindi)) ? (q.question_hi || q.question_hindi) : (q.question || q.question_text || "");
    qTxtBox.innerHTML = cleanQuestionHtml(rawQHtml, false);

    const optBox = document.getElementById("tcs-options-container");
    optBox.innerHTML = "";
    const chosen = (tcsState.responses[globalIdx] || {}).chosenOption;

    const getOptText = (idx) => {
        if (tcsState.lang === "hi" && (q[`option_${idx}_hi`] || q[`option_${idx}_hindi`] || q[`opt${idx}_hi`])) {
            return q[`option_${idx}_hi`] || q[`option_${idx}_hindi`] || q[`opt${idx}_hi`];
        }
        return q[`option_${idx}`] || q[`opt${idx}`] || "";
    };

    const opts = [
        { id: "1", text: getOptText(1) }, { id: "2", text: getOptText(2) },
        { id: "3", text: getOptText(3) }, { id: "4", text: getOptText(4) },
        getOptText(5) ? { id: "5", text: getOptText(5) } : null
    ].filter(o => o && o.text !== "");

    opts.forEach((opt, oIdx) => {
        const isSel = String(chosen) === String(opt.id);
        optBox.innerHTML += `
            <div class="${isSel ? "tcs-option selected" : "tcs-option"}" data-optid="${opt.id}" onclick="selectTcsOption('${opt.id}')">
                <span class="tcs-opt-letter">${["A", "B", "C", "D", "E"][oIdx] || opt.id}.</span>
                <div style="flex: 1; word-break: break-word;">${cleanQuestionHtml(opt.text || "", true)}</div>
            </div>`;
    });

    applyTcsFontSize();
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([qTxtBox, optBox]).catch(() => {});
}

window.selectTcsOption = function(optId) {
    const idx = tcsState.currentQIdx;
    tcsState.responses[idx] = { status: "attempted", chosenOption: optId, timeSpent: (tcsState.responses[idx] && tcsState.responses[idx].timeSpent) || 0 };
    const options = document.getElementById("tcs-options-container").children;
    for (let i = 0; i < options.length; i++) {
        options[i].className = options[i].getAttribute("data-optid") === String(optId) ? "tcs-option selected" : "tcs-option";
    }
};

window.toggleCurrentQuestionBookmark = function() {
    const q = tcsState.questions[tcsState.currentQIdx];
    if (!q) return;
    const qKey = `test_${(tcsState.testMeta && tcsState.testMeta.id) || tcsState.activeTestKey}_q_${q.id || tcsState.currentQIdx}`;
    const optsArr = [q.option_1 || q.opt1, q.option_2 || q.opt2, q.option_3 || q.opt3, q.option_4 || q.opt4, q.option_5 || q.opt5].filter(Boolean).map(o => cleanQuestionHtml(o, true));
    const expText = (tcsState.lang === "hi" && (q.explanation_hi || q.solution_hi)) ? (q.explanation_hi || q.solution_hi) : (q.solution_text || q.explanation || q.solution || "");
    const isNowSaved = window.toggleBookmarkItem({
        qKey, testTitle: tcsState.testMeta.title || "", subject: q._sectionName || "", qNumber: tcsState.currentQIdx + 1,
        question: cleanQuestionHtml(q.question || q.question_text || "", false), options: optsArr,
        answer: String(q.answer || q.correct_option || "1"), solution: cleanQuestionHtml(expText, false)
    });
    const bmBtn = document.getElementById("tcs-bookmark-btn");
    if (bmBtn) {
        bmBtn.textContent = isNowSaved ? "★ Saved" : "☆ Save";
        bmBtn.className = isNowSaved
            ? "px-2.5 py-1 rounded-lg bg-amber-500 text-white border border-amber-600 font-extrabold text-xs cursor-pointer"
            : "px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs cursor-pointer";
    }
};

window.toggleSolutionQuestionBookmark = function() {
    const q = tcsState.questions[tcsState.activeFullSolIdx];
    if (!q) return;
    const qKey = `test_${(tcsState.testMeta && tcsState.testMeta.id) || tcsState.activeTestKey}_q_${q.id || tcsState.activeFullSolIdx}`;
    const optsArr = [q.option_1 || q.opt1, q.option_2 || q.opt2, q.option_3 || q.opt3, q.option_4 || q.opt4, q.option_5 || q.opt5].filter(Boolean).map(o => cleanQuestionHtml(o, true));
    const expText = (tcsState.lang === "hi" && (q.explanation_hi || q.solution_hi)) ? (q.explanation_hi || q.solution_hi) : (q.solution_text || q.explanation || q.solution || "");
    const isNowSaved = window.toggleBookmarkItem({
        qKey, testTitle: tcsState.testMeta.title || "", subject: q._sectionName || "", qNumber: tcsState.activeFullSolIdx + 1,
        question: cleanQuestionHtml(q.question || q.question_text || "", false), options: optsArr,
        answer: String(q.answer || q.correct_option || "1"), solution: cleanQuestionHtml(expText, false)
    });
    const bmBtn = document.getElementById("fs-bookmark-btn");
    if (bmBtn) {
        bmBtn.textContent = isNowSaved ? "★ Saved" : "☆ Save";
        bmBtn.className = isNowSaved
            ? "px-2.5 py-1 rounded-lg bg-amber-500 text-white border border-amber-600 font-extrabold text-xs cursor-pointer"
            : "px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs cursor-pointer";
    }
};

window.saveAndNext = function() {
    const cur = tcsState.responses[tcsState.currentQIdx] || { timeSpent: 0 };
    cur.status = cur.chosenOption ? "attempted" : "unattempted";
    tcsState.responses[tcsState.currentQIdx] = cur;
    nextQuestion();
};
window.markForReview = function() {
    const cur = tcsState.responses[tcsState.currentQIdx] || { timeSpent: 0 };
    tcsState.responses[tcsState.currentQIdx] = { ...cur, status: cur.chosenOption ? "marked_attempted" : "marked" };
    nextQuestion();
};
window.clearResponse = function() {
    tcsState.responses[tcsState.currentQIdx] = { status: "unattempted", chosenOption: null, timeSpent: (tcsState.responses[tcsState.currentQIdx] && tcsState.responses[tcsState.currentQIdx].timeSpent) || 0 };
    loadQuestion(tcsState.currentQIdx);
};

window.nextQuestion = function() {
    if (tcsState.isPartSwitchingRestricted) {
        const curSec = tcsState.activeSections[tcsState.activeSectionIndex];
        if (curSec && curSec.questions.length > 0 && tcsState.currentQIdx >= curSec.questions[curSec.questions.length - 1].originalIndex) return;
    }
    if (tcsState.currentQIdx < tcsState.questions.length - 1) loadQuestion(tcsState.currentQIdx + 1);
};

window.prevQuestion = function() {
    if (tcsState.isPartSwitchingRestricted) {
        const curSec = tcsState.activeSections[tcsState.activeSectionIndex];
        if (curSec && curSec.questions.length > 0 && tcsState.currentQIdx <= curSec.questions[0].originalIndex) return;
    }
    if (tcsState.currentQIdx > 0) loadQuestion(tcsState.currentQIdx - 1);
};

window.toggleTcsLangMode = function() {
    tcsState.lang = tcsState.lang === "en" ? "hi" : "en";
    if (!document.getElementById("live-test-screen").classList.contains("tcs-hidden")) loadQuestion(tcsState.currentQIdx);
    else if (!document.getElementById("solutions-screen").classList.contains("tcs-hidden")) renderSolutionsList(tcsState.activeSolFilter);
    else if (!document.getElementById("full-sol-screen").classList.contains("tcs-hidden")) renderFullSolutionContent(tcsState.activeFullSolIdx);
};

window.toggleTcsFullScreen = function() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.exitFullscreen) document.exitFullscreen();
};

window.toggleTcsPalette = function() {
    const palette = document.getElementById("tcs-palette");
    palette.classList.toggle("show");
    if (palette.classList.contains("show")) renderTcsAccordionGrid();
};

function renderTcsAccordionGrid() {
    const cont = document.getElementById("tcs-accordion-container");
    cont.innerHTML = "";
    tcsState.activeSections.forEach((sec, sIdx) => {
        const isLockedSec = tcsState.isPartSwitchingRestricted && sIdx !== tcsState.activeSectionIndex;
        let att = 0, una = 0, mar = 0;
        let gridHtml = `<div class="tcs-q-grid ${isLockedSec ? "" : "open"}" id="grid_sec_${sIdx}">`;
        sec.questions.forEach(sq => {
            const r = tcsState.responses[sq.originalIndex];
            let boxCls = "tcs-q-box st-not-ans";
            if (r) {
                if (r.status === "attempted") { boxCls = "tcs-q-box st-ans"; att++; }
                else if (r.status === "marked") { boxCls = "tcs-q-box st-mark"; mar++; }
                else if (r.status === "marked_attempted") { boxCls = "tcs-q-box st-mark-ans"; att++; }
                else una++;
            } else una++;
            const clickAttr = isLockedSec ? `style="opacity:0.5;cursor:not-allowed;"` : `onclick="jumpToQuestion(${sq.originalIndex})"`;
            gridHtml += `<div class="${boxCls}" ${clickAttr}>${sq.originalIndex + 1}</div>`;
        });
        gridHtml += `</div>`;
        const lockLabel = isLockedSec ? (sIdx < tcsState.activeSectionIndex ? "✅ " : "🔒 ") : "";
        cont.innerHTML += `<div class="tcs-accordion"><div class="tcs-acc-header" onclick="toggleGridSec(${sIdx})"><span>${lockLabel}${sec.name}</span><span>${isLockedSec ? "🔒" : "▼"}</span></div><div class="tcs-acc-stats"><span>Att: ${att}</span><span>Marked: ${mar}</span><span>Un-Att: ${una}</span></div>${gridHtml}</div>`;
    });
}
window.toggleGridSec = function(sIdx) { if (tcsState.isPartSwitchingRestricted && sIdx !== tcsState.activeSectionIndex) return; document.getElementById(`grid_sec_${sIdx}`)?.classList.toggle("open"); };
window.jumpToQuestion = function(globalIdx) {
    if (tcsState.isPartSwitchingRestricted) {
        const curSec = tcsState.activeSections[tcsState.activeSectionIndex];
        if (curSec && !curSec.questions.some(sq => sq.originalIndex === globalIdx)) return;
    }
    toggleTcsPalette();
    loadQuestion(globalIdx);
};

// =========================================================
// SUBMIT SECTION / QUIZ + REAL 4-DB LEADERBOARD & TIME-TRAP
// =========================================================
window.handleDynamicSubmit = function() {
    if (tcsState.isSectionalTiming && tcsState.activeSectionIndex < tcsState.activeSections.length - 1) {
        ensureCloseResumeUI();
        const curSec = tcsState.activeSections[tcsState.activeSectionIndex];
        const nextSec = tcsState.activeSections[tcsState.activeSectionIndex + 1];
        const modal = document.getElementById("tcs-action-modal"), box = document.getElementById("tcs-action-modal-content");
        if (modal && box) {
            box.innerHTML = `
                <div style="font-size:32px; margin-bottom:8px;">🔒</div>
                <h3 style="font-size:17px; font-weight:800; color:#0f172a; margin:0 0 6px 0;">Submit Current Section?</h3>
                <p style="font-size:13px; color:#475569; font-weight:600; line-height:1.5; margin-bottom:18px;">
                    Kya aap <b>${curSec ? curSec.name : "Current Section"}</b> ko submit karke agle section (<b>${nextSec ? nextSec.name : "Next Section"}</b>) mein jana chahte hain?<br>
                    <span style="color:#dc2626; font-size:12px;">Submit karne ke baad aap wapas is section mein nahi aa sakenge.</span>
                </p>
                <div style="display:flex; gap:10px;">
                    <button onclick="closeTcsActionModal()" style="flex:1; padding:12px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#1e293b; font-weight:800; font-size:13px; cursor:pointer;">Cancel</button>
                    <button onclick="confirmSectionSubmit()" style="flex:1; padding:12px; border-radius:10px; border:none; background:#1a237e; color:#fff; font-weight:800; font-size:13px; cursor:pointer;">Yes, Next Section ➔</button>
                </div>`;
            modal.classList.remove("tcs-hidden");
        }
        return;
    }
    prepareSubmit();
};

window.confirmSectionSubmit = function() { window.closeTcsActionModal(); advanceToNextLockedSection(); };

window.prepareSubmit = function() {
    if (tcsState.isSectionalTiming && tcsState.activeSectionIndex < tcsState.activeSections.length - 1) { window.handleDynamicSubmit(); return; }
    document.getElementById("tcs-palette").classList.remove("show");
    document.getElementById("live-test-screen").classList.add("tcs-hidden");
    document.getElementById("submit-screen").classList.remove("tcs-hidden");
    const cont = document.getElementById("submit-summary-container");
    cont.innerHTML = tcsState.activeSections.map(sec => {
        let att = 0, una = 0, mar = 0;
        sec.questions.forEach(sq => {
            const r = tcsState.responses[sq.originalIndex];
            if (r && (r.status === "attempted" || r.status === "marked_attempted")) att++;
            else if (r && r.status === "marked") mar++;
            else una++;
        });
        return `
            <div class="section-summary-card">
                <h3 class="font-black text-base text-slate-900 mb-3">${sec.name}</h3>
                <div class="grid grid-cols-2 gap-2.5 text-xs font-black">
                    <div class="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-center">Total: ${sec.questions.length}</div>
                    <div class="px-3 py-2 rounded-xl bg-blue-600 text-white text-center">Attempted: ${att}</div>
                    <div class="px-3 py-2 rounded-xl bg-amber-400 text-slate-900 text-center">Marked: ${mar}</div>
                    <div class="px-3 py-2 rounded-xl bg-slate-500 text-white text-center">Unattempted: ${una}</div>
                </div>
            </div>`;
    }).join("");
};

window.closeSubmit = function() {
    document.getElementById("submit-screen").classList.add("tcs-hidden");
    document.getElementById("live-test-screen").classList.remove("tcs-hidden");
};

window.submitTest = function(isRestoringSaved = false, fallbackSavedStats = null) {
    if (tcsState.timerInterval) clearInterval(tcsState.timerInterval);
    tcsState.isSubmitted = true;
    if (!isRestoringSaved) clearPausedTestState();

    ["start-screen", "submit-screen", "live-test-screen", "solutions-screen", "full-sol-screen"].forEach(id => document.getElementById(id)?.classList.add("tcs-hidden"));
    document.getElementById("analysis-screen").classList.remove("tcs-hidden");

    let correct = 0, incorrect = 0, unattempted = 0, score = 0, timeCorr = 0, timeInc = 0, timeUna = 0, maxMarks = 0;
    const hasResponses = tcsState.responses && Object.keys(tcsState.responses).length > 0;
    const wrongForMistakes = [], timeTraps = [], fastGuesses = [];

    tcsState.questions.forEach((q, i) => {
        const pos = parseFloat(q.positive_marks ?? 2), neg = parseFloat(q.negative_marks ?? 0.5);
        maxMarks += pos;
        const r = tcsState.responses[i] || {}, spent = r.timeSpent || 0, correctAns = String(q.answer || q.correct_option || "1").trim();
        if (!r.chosenOption) { unattempted++; timeUna += spent; }
        else if (String(r.chosenOption) === correctAns) { correct++; score += pos; timeCorr += spent; }
        else {
            incorrect++; score -= neg; timeInc += spent;
            wrongForMistakes.push({ qObj: q, chosenOption: r.chosenOption });
            if (spent >= 60) timeTraps.push({ idx: i, spent });
            if (spent > 0 && spent <= 5) fastGuesses.push({ idx: i, spent });
        }
    });

    if (maxMarks === 0 && tcsState.testMeta && !isNaN(parseFloat(tcsState.testMeta.marks))) maxMarks = parseFloat(tcsState.testMeta.marks);
    score = parseFloat(score.toFixed(2));
    maxMarks = Math.round(maxMarks);

    if (isRestoringSaved && !hasResponses && fallbackSavedStats) {
        score = fallbackSavedStats.score ?? score; maxMarks = fallbackSavedStats.maxMarks ?? maxMarks;
        correct = fallbackSavedStats.correct ?? correct; incorrect = fallbackSavedStats.incorrect ?? incorrect;
        unattempted = fallbackSavedStats.unattempted ?? unattempted;
        timeCorr = fallbackSavedStats.timeCorr ?? timeCorr; timeInc = fallbackSavedStats.timeInc ?? timeInc; timeUna = fallbackSavedStats.timeUna ?? timeUna;
    }
    const accuracy = (correct + incorrect) > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
    const totalSpentSec = timeCorr + timeInc + timeUna;

    tcsState.lastSubmittedScore = score;
    tcsState.lastMaxMarks = maxMarks;
    tcsState.lastWrongQuestions = wrongForMistakes.map(x => x.qObj);

    if (!isRestoringSaved) {
        if (!tcsState.isCustomMode && typeof window.recordUserTestAttempt === "function") {
            window.recordUserTestAttempt(tcsState.testMeta.id || tcsState.activeTestKey, {
                testKey: tcsState.activeTestKey, title: tcsState.testMeta.title || "",
                seriesId: tcsState.testMeta.seriesId || tcsState.testMeta.test_series_id || window.state.activeSeriesId || "",
                seriesTitle: window.state.activeSeriesTitle || "",
                score, maxMarks, correct, incorrect, unattempted, accuracy, timeCorr, timeInc, timeUna,
                testMeta: tcsState.testMeta, responses: tcsState.responses, selectedOptionalByGroup: tcsState.selectedOptionalByGroup,
                activeSectionsSnapshot: tcsState.activeSections, questionsSnapshot: tcsState.questions
            });
        }
        if (wrongForMistakes.length && typeof window.tsAddMistakeQuestions === "function") {
            window.tsAddMistakeQuestions(wrongForMistakes, tcsState.testMeta || {});
        }
        if (totalSpentSec >= 20 && typeof window.tsAddStudyMinutes === "function") {
            window.tsAddStudyMinutes(totalSpentSec / 60);
        }
    }

    document.getElementById("res-score").textContent = `${score}/${maxMarks}`;
    document.getElementById("res-correct").textContent = correct;
    document.getElementById("res-incorrect").textContent = incorrect;
    document.getElementById("res-unatt").textContent = unattempted;
    document.getElementById("res-acc").textContent = `${accuracy}%`;
    document.getElementById("res-rank").textContent = "Syncing...";
    document.getElementById("res-perc").textContent = "--";

    document.getElementById("cmp-score").textContent = score;
    document.getElementById("cmp-top").textContent = (maxMarks * 0.88).toFixed(1);
    document.getElementById("cmp-avg").textContent = (maxMarks * 0.48).toFixed(1);
    document.getElementById("cmp-acc").textContent = `${accuracy}%`;
    document.getElementById("cmp-c").textContent = correct;
    document.getElementById("cmp-top-c").textContent = Math.round(tcsState.questions.length * 0.9);
    document.getElementById("cmp-avg-c").textContent = Math.round(tcsState.questions.length * 0.52);
    document.getElementById("cmp-w").textContent = incorrect;
    document.getElementById("cmp-top-w").textContent = Math.round(tcsState.questions.length * 0.04);
    document.getElementById("cmp-avg-w").textContent = Math.round(tcsState.questions.length * 0.18);

    const totalQ = tcsState.questions.length || (correct + incorrect + unattempted) || 1;
    const cDeg = (correct / totalQ) * 360, wDeg = cDeg + (incorrect / totalQ) * 360;
    const donut = document.getElementById("res-donut");
    if (donut) donut.style.background = `conic-gradient(#22c55e 0deg ${cDeg}deg, #ef4444 ${cDeg}deg ${wDeg}deg, #6366f1 ${wDeg}deg 360deg)`;
    document.getElementById("ts-box-corr").innerHTML = `Correct<br>${formatMMSS(timeCorr)}`;
    document.getElementById("ts-box-una").innerHTML = `Unattempted: ${formatMMSS(timeUna)}`;
    document.getElementById("ts-box-inc").innerHTML = `Incorrect<br>${formatMMSS(timeInc)}`;

    const trapBox = document.getElementById("tcsTimeTrapList");
    if (trapBox) {
        let tHtml = "";
        if (timeTraps.length) {
            tHtml += `<div class="p-3 rounded-xl bg-rose-50 border border-rose-200"><div class="font-black text-rose-700 mb-1.5">⏳ ${timeTraps.length} Time Traps (>60s Wrong)</div><div class="flex flex-wrap gap-1.5">${timeTraps.map(x => `<button onclick="openFullSolution(${x.idx})" class="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] border-0 cursor-pointer">Q${x.idx + 1} (${x.spent}s)</button>`).join("")}</div></div>`;
        }
        if (fastGuesses.length) {
            tHtml += `<div class="p-3 rounded-xl bg-amber-50 border border-amber-200"><div class="font-black text-amber-800 mb-1.5">🎲 ${fastGuesses.length} Fast Guess (≤5s Wrong)</div><div class="flex flex-wrap gap-1.5">${fastGuesses.map(x => `<button onclick="openFullSolution(${x.idx})" class="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] border-0 cursor-pointer">Q${x.idx + 1} (${x.spent}s)</button>`).join("")}</div></div>`;
        }
        trapBox.innerHTML = tHtml || `<div class="p-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold">✅ Great Exam Discipline! Koi major Time-Trap ya Fast Guess detect nahi hua.</div>`;
    }

    const rem = document.getElementById("dynamic-remark");
    if (rem) {
        rem.style.display = "block";
        if (accuracy >= 80 && correct > 0) { rem.className = "remark-banner rem-excellent"; rem.textContent = "🎉 Excellent Performance! Keep it up!"; }
        else if (accuracy >= 50 && correct > 0) { rem.className = "remark-banner rem-great"; rem.textContent = "👍 Good Attempt! Practice more to reach the top."; }
        else { rem.className = "remark-banner rem-poor"; rem.textContent = "⚠️ Needs Improvement! Review Time-Traps & Mistake Notebook."; }
    }

    const sCont = document.getElementById("analysis-sections-container");
    const weakCard = document.getElementById("weak-areas-card"), weakList = document.getElementById("weak-areas-list");
    sCont.innerHTML = "";
    const weakSubjects = [], secStatsPayload = [];

    tcsState.activeSections.forEach(sec => {
        let sCorr = 0, sInc = 0, sUna = 0, sScore = 0, stCorr = 0, stInc = 0, stUna = 0;
        sec.questions.forEach(sq => {
            const r = tcsState.responses[sq.originalIndex] || {}, ans = String(sq.answer || sq.correct_option || "1").trim();
            const pos = parseFloat(sq.positive_marks ?? 2), neg = parseFloat(sq.negative_marks ?? 0.5), sp = r.timeSpent || 0;
            if (!r.chosenOption) { sUna++; stUna += sp; }
            else if (String(r.chosenOption) === ans) { sCorr++; sScore += pos; stCorr += sp; }
            else { sInc++; sScore -= neg; stInc += sp; }
        });
        if (isRestoringSaved && !hasResponses && tcsState.activeSections.length === 1 && fallbackSavedStats) {
            sCorr = correct; sInc = incorrect; sUna = unattempted; sScore = score;
        }
        const sAcc = (sCorr + sInc) > 0 ? Math.round((sCorr / (sCorr + sInc)) * 100) : 0;
        if (sAcc < 50 || sCorr < sec.questions.length * 0.35) weakSubjects.push(`${sec.name} (Accuracy: ${sAcc}%, Correct: ${sCorr}/${sec.questions.length})`);
        secStatsPayload.push({ name: sec.name, score: Number(sScore.toFixed(1)), correct: sCorr, incorrect: sInc, unattempted: sUna, accuracy: sAcc });

        sCont.innerHTML += `
            <div class="a-card">
                <div class="subj-header"><div class="subj-name">${sec.name}</div><div class="black-circle"><span>Score</span><span>${sScore.toFixed(1)}</span></div></div>
                <div class="subj-q-stats">Total Questions: ${sec.questions.length} • Accuracy: ${sAcc}%</div>
                <div class="time-split">
                    <div class="col"><div class="c-green">Correct</div><div class="val-num">${sCorr}</div><div class="val-time">${formatMMSS(stCorr)}</div></div>
                    <div class="col"><div class="c-red">Incorrect</div><div class="val-num">${sInc}</div><div class="val-time">${formatMMSS(stInc)}</div></div>
                    <div class="col"><div class="c-grey">Unattempted</div><div class="val-num">${sUna}</div><div class="val-time">${formatMMSS(stUna)}</div></div>
                </div>
            </div>`;
    });

    if (weakCard && weakList) {
        weakCard.style.display = weakSubjects.length ? "block" : "none";
        weakList.innerHTML = weakSubjects.map(w => `<li>${w}</li>`).join("");
    }

    const uid = typeof window.tsGetActiveUserId === "function" ? window.tsGetActiveUserId() : "guest";
    const uname = typeof window.tsGetActiveUserName === "function" ? window.tsGetActiveUserName() : "RWA Student";
    const testIdStr = String((tcsState.testMeta && tcsState.testMeta.id) || "custom");

    const attemptPayload = {
        user_id: uid, user_name: uname, test_id: testIdStr,
        test_title: `[PAID-TS] ${(tcsState.testMeta && tcsState.testMeta.title) || "Mock Test"}`,
        series_id: String((tcsState.testMeta && (tcsState.testMeta.seriesId || tcsState.testMeta.test_series_id)) || ""),
        score, max_marks: maxMarks, correct, incorrect, unattempted, accuracy,
        time_taken_sec: totalSpentSec, section_stats: secStatsPayload,
        time_traps_count: timeTraps.length, fast_guesses_count: fastGuesses.length
    };
    syncScoreAndLoadLeaderboard(attemptPayload, isRestoringSaved, score, maxMarks);
};

async function syncScoreAndLoadLeaderboard(attemptPayload, isRestoringSaved, score, maxMarks) {
    const apiBase = window.NEW_PRO_API_BASE || "https://pdfsownlaoder.onrender.com";
    const lbBody = document.getElementById("tcsLeaderboardBody");
    const lbBadge = document.getElementById("lbParticipantsBadge");

    try {
        let json = null;
        if (!isRestoringSaved) {
            const res = await fetch(`${apiBase}/api/test/submit`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(attemptPayload)
            });
            json = await res.json();
        } else {
            const res = await fetch(`${apiBase}/api/test/leaderboard?test_id=${encodeURIComponent(attemptPayload.test_id)}&user_id=${encodeURIComponent(attemptPayload.user_id)}`);
            json = await res.json();
        }

        if (json && json.status === "success" && json.leaderboard) {
            const lb = json.leaderboard;
            document.getElementById("res-rank").textContent = lb.my_rank ? `#${lb.my_rank}/${lb.total_participants}` : "#1";
            document.getElementById("res-perc").textContent = `${lb.my_percentile ?? 100}%ile`;

            if (lb.topper) {
                document.getElementById("cmp-top").textContent = lb.topper.score;
                document.getElementById("cmp-top-a").textContent = `${lb.topper.accuracy}%`;
                document.getElementById("cmp-top-c").textContent = lb.topper.correct;
                document.getElementById("cmp-top-w").textContent = lb.topper.incorrect;
            }
            if (lb.total_participants > 0) {
                document.getElementById("cmp-avg").textContent = lb.avg_score;
                document.getElementById("cmp-avg-a").textContent = `${lb.avg_accuracy}%`;
            }

            if (lbBadge) lbBadge.textContent = `${lb.total_participants} Students`;
            if (lbBody) {
                const myUid = String(attemptPayload.user_id);
                const rows = lb.top_10 || [];
                lbBody.innerHTML = rows.length ? rows.map(row => {
                    const isMe = String(row.user_id) === myUid;
                    const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`;
                    return `
                        <div class="flex justify-between items-center p-2.5 rounded-xl ${isMe ? "bg-indigo-100/90 border border-indigo-400 font-black" : "bg-slate-50 border border-slate-200/80"}">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="font-black text-indigo-800 w-7">${medal}</span>
                                <span class="truncate font-bold text-slate-900">${typeof tsEscHtml === "function" ? tsEscHtml(row.user_name) : row.user_name}${isMe ? " (You)" : ""}</span>
                            </div>
                            <div class="text-right shrink-0">
                                <span class="font-black text-blue-700">${row.score}/${row.max_marks}</span>
                                <span class="text-[10px] text-emerald-700 ml-1">(${row.accuracy}%)</span>
                            </div>
                        </div>`;
                }).join("") : `<div class="text-slate-500 font-bold text-center py-2">First rank recorded!</div>`;
            }
            return;
        }
    } catch {}

    document.getElementById("res-rank").textContent = score >= maxMarks * 0.75 ? "#12" : "#148";
    document.getElementById("res-perc").textContent = `${Math.min(99.8, Math.max(15, (score / (maxMarks || 1)) * 100 + 12)).toFixed(1)}%ile`;
    if (lbBody) lbBody.innerHTML = `<div class="text-slate-500 font-bold text-center py-2">Offline mode: Live leaderboard next sync par update hoga.</div>`;
}

window.reAttemptWrongOnlyFromCurrent = function() {
    if (!tcsState.lastWrongQuestions || !tcsState.lastWrongQuestions.length) {
        if (typeof window.tsToast === "function") window.tsToast("🎉 Koi wrong question nahi hai!", "success");
        return;
    }
    window.launchCustomQuestionsTcs(`❌ Wrong Only: ${(tcsState.testMeta && tcsState.testMeta.title) || "Test"}`, tcsState.lastWrongQuestions, Math.max(5, Math.ceil(tcsState.lastWrongQuestions.length * 0.8)));
};

window.exportTestPdfSheet = function() {
    const title = (tcsState.testMeta && tcsState.testMeta.title) || "RWA Mock Test Scorecard";
    const rowsHtml = tcsState.questions.map((q, i) => {
        const r = tcsState.responses[i] || {}, ans = String(q.answer || q.correct_option || "1").trim();
        const status = !r.chosenOption ? "Unattempted" : (String(r.chosenOption) === ans ? "Correct ✓" : `Wrong ✕ (Your: ${r.chosenOption})`);
        return `<div style="margin-bottom:14px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;page-break-inside:avoid;"><div style="font-weight:bold;color:#1a237e;font-size:13px;">Q${i + 1}. [${q._sectionName || "General"}] — ${status}</div><div style="margin:6px 0;font-size:13px;">${cleanQuestionHtml(q.question || q.question_text || "", false)}</div><div style="font-size:12px;color:#334155;">A) ${cleanQuestionHtml(q.option_1 || "", true)} &nbsp;|&nbsp; B) ${cleanQuestionHtml(q.option_2 || "", true)} &nbsp;|&nbsp; C) ${cleanQuestionHtml(q.option_3 || "", true)} &nbsp;|&nbsp; D) ${cleanQuestionHtml(q.option_4 || "", true)}</div><div style="margin-top:6px;font-size:12px;color:#15803d;"><b>Correct Option: ${ans}</b> — ${cleanQuestionHtml(q.solution_text || q.explanation || "", false)}</div></div>`;
    }).join("");
    const win = window.open("", "_blank");
    if (!win) return window.showRwaPopup({ title: "Popup Blocked", message: "PDF print karne ke liye browser popups allow karein.", type: "warn" });
    win.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#0f172a;} img{max-width:260px;height:auto;}</style></head><body><h2 style="color:#1a237e;margin-bottom:4px;">${title}</h2><p style="font-size:13px;font-weight:bold;">Score: ${tcsState.lastSubmittedScore}/${tcsState.lastMaxMarks} • Student: ${typeof tsGetActiveUserName === "function" ? tsGetActiveUserName() : "RWA Student"}</p><hr style="margin:14px 0;">${rowsHtml}<script>setTimeout(()=>window.print(), 450);</script></body></html>`);
    win.document.close();
};

window.openSavedTcsScorecard = async function(testId, tKey, savedRecord) {
    const fullSaved = (typeof window.getSavedAttemptByTestId === "function" && window.getSavedAttemptByTestId(testId)) || savedRecord || {};
    const resolvedKey = tKey || fullSaved.testKey || `test_${testId}`;
    const meta = window.state.testMap[resolvedKey] || fullSaved.testMeta || { id: testId, title: fullSaved.title || `Test #${testId}` };
    window.state.testMap[resolvedKey] = meta;
    tcsState.activeTestKey = resolvedKey;
    tcsState.testMeta = meta;
    tcsState.isCustomMode = false;
    tcsState.responses = fullSaved.responses || {};
    tcsState.selectedOptionalByGroup = fullSaved.selectedOptionalByGroup || {};
    tcsState.isSubmitted = true;
    window.showSlide("slideTestAttempt");

    if (fullSaved.questionsSnapshot && fullSaved.questionsSnapshot.length > 0) {
        tcsState.questions = fullSaved.questionsSnapshot;
        tcsState.activeSections = fullSaved.activeSectionsSnapshot;
        window.submitTest(true, fullSaved);
        return;
    }

    const { loadedQuestions, externalSecMap, orderedServerSections, exactTestMeta } = await fetchQuestionsAndSectionsForMeta(meta);
    if (exactTestMeta) tcsState.testMeta = { ...tcsState.testMeta, ...exactTestMeta };
    tcsState.rawAllQuestions = loadedQuestions;
    prepareAllSectionsAndRenderStart(externalSecMap, orderedServerSections, false);
    if (fullSaved.selectedOptionalByGroup && fullSaved.selectedOptionalByGroup["A"]) tcsState.selectedOptionalByGroup["A"] = fullSaved.selectedOptionalByGroup["A"];
    populateActiveQuestionsFromChosenSections();
    window.submitTest(true, fullSaved);
};
window.openSavedTestScorecard = window.openSavedTcsScorecard;

window.reAttemptTcsTest = function() {
    if (tcsState.isCustomMode) window.launchCustomQuestionsTcs(tcsState.testMeta.title, tcsState.rawAllQuestions, parseInt(tcsState.testMeta.time || "15", 10));
    else window.launchTcsCbtEngine(tcsState.activeTestKey);
};
window.reAttemptCbtTest = window.reAttemptTcsTest;

window.exitCbtTest = function() {
    if (tcsState.timerInterval) clearInterval(tcsState.timerInterval);
    ["start-screen", "submit-screen", "live-test-screen", "solutions-screen", "full-sol-screen", "analysis-screen"].forEach(id => document.getElementById(id)?.classList.add("tcs-hidden"));
    if (typeof window.showSlide === "function") window.showSlide("slideExplorer");
};

// =========================================================
// SOLUTIONS, FULL SOLUTION, FLASHCARD & COPY DOUBT
// =========================================================
window.openSolutions = function() {
    document.getElementById("analysis-screen").classList.add("tcs-hidden");
    document.getElementById("solutions-screen").classList.remove("tcs-hidden");
    tcsState.activeSolFilter = "all";
    renderSolutionsList("all");
};
window.closeSolutions = function() {
    document.getElementById("solutions-screen").classList.add("tcs-hidden");
    document.getElementById("analysis-screen").classList.remove("tcs-hidden");
};
window.filterSol = function(filterType, btnEl) {
    document.querySelectorAll(".flt-btn").forEach(b => b.classList.remove("flt-active"));
    if (btnEl) btnEl.classList.add("flt-active");
    tcsState.activeSolFilter = filterType;
    renderSolutionsList(filterType);
};

function renderSolutionsList(filter) {
    const cont = document.getElementById("sol-list-container");
    cont.innerHTML = "";
    tcsState.questions.forEach((q, idx) => {
        const r = tcsState.responses[idx], correctAns = String(q.answer || q.correct_option || "1").trim(), hasChosen = r && r.chosenOption;
        const isCorr = hasChosen && String(r.chosenOption) === correctAns, isInc = hasChosen && !isCorr, isUna = !hasChosen;
        if ((filter === "correct" && !isCorr) || (filter === "incorrect" && !isInc) || (filter === "unattempted" && !isUna)) return;
        let badgeClass = isCorr ? "st-corr" : (isInc ? "st-wr" : "st-una"), iconHtml = isCorr ? "✓" : (isInc ? "✕" : "−");
        const qText = (tcsState.lang === "hi" && (q.question_hi || q.question_hindi)) ? (q.question_hi || q.question_hindi) : (q.question || q.question_text || "");
        cont.innerHTML += `<div class="sol-item" onclick="openFullSolution(${idx})" style="cursor:pointer;"><div class="sol-num-col"><div class="sol-num">Q${idx + 1}<div class="sol-status-icon ${badgeClass}">${iconHtml}</div></div><div class="sol-line"></div></div><div class="sol-card"><span class="sol-sec-badge">${q._sectionName || ""}</span><div class="sol-q-txt">${cleanQuestionHtml(qText, false)}</div><div class="text-right"><span class="text-xs font-black text-blue-600">View Full Solution →</span></div></div></div>`;
    });
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([cont]).catch(() => {});
}

window.openFullSolution = function(idx) {
    tcsState.activeFullSolIdx = idx;
    ["analysis-screen", "solutions-screen"].forEach(id => document.getElementById(id)?.classList.add("tcs-hidden"));
    document.getElementById("full-sol-screen").classList.remove("tcs-hidden");
    renderFullSolutionContent(idx);
};

function renderFullSolutionContent(idx) {
    const q = tcsState.questions[idx];
    if (!q) return;
    const r = tcsState.responses[idx] || {}, correctAns = String(q.answer || q.correct_option || "1").trim();
    document.getElementById("fs-q-num").textContent = `Question ${idx + 1} (${q._sectionName || ""})`;
    document.getElementById("fs-q-time-compare").innerHTML = `<span class="time-compare-badge">⏱ ${formatMMSS(r.timeSpent || 0)}</span>`;

    const qKey = `test_${(tcsState.testMeta && tcsState.testMeta.id) || tcsState.activeTestKey}_q_${q.id || idx}`;
    const bmBtn = document.getElementById("fs-bookmark-btn");
    if (bmBtn) {
        const isSaved = typeof window.isQuestionBookmarked === "function" && window.isQuestionBookmarked(qKey);
        bmBtn.textContent = isSaved ? "★ Saved" : "☆ Save";
        bmBtn.className = isSaved
            ? "px-2.5 py-1 rounded-lg bg-amber-500 text-white border border-amber-600 font-extrabold text-xs cursor-pointer"
            : "px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs cursor-pointer";
    }

    const qTxt = (tcsState.lang === "hi" && (q.question_hi || q.question_hindi)) ? (q.question_hi || q.question_hindi) : (q.question || q.question_text || "");
    document.getElementById("fs-q-txt").innerHTML = cleanQuestionHtml(qTxt, false);

    const optBox = document.getElementById("fs-options-container");
    optBox.innerHTML = "";
    const opts = [
        { id: "1", text: q.option_1 || q.opt1 }, { id: "2", text: q.option_2 || q.opt2 },
        { id: "3", text: q.option_3 || q.opt3 }, { id: "4", text: q.option_4 || q.opt4 },
        q.option_5 ? { id: "5", text: q.option_5 } : null
    ].filter(Boolean);

    opts.forEach((opt, oIdx) => {
        const isCorrectOpt = String(opt.id) === correctAns, isUserChosen = r.chosenOption && String(r.chosenOption) === String(opt.id);
        let cls = isCorrectOpt ? "fs-opt correct" : (isUserChosen ? "fs-opt wrong" : "fs-opt");
        optBox.innerHTML += `<div class="${cls}"><div style="display:flex; align-items:center; gap:10px;"><strong style="color:#1e293b;">${["A", "B", "C", "D", "E"][oIdx] || opt.id}.</strong><div>${cleanQuestionHtml(opt.text || "", true)}</div></div>${isCorrectOpt ? `<span class="fs-opt-perc">✓ Correct</span>` : ""}${isUserChosen && !isCorrectOpt ? `<span style="font-size:11px;font-weight:800;color:#dc2626;background:#fee2e2;padding:3px 8px;border-radius:99px;">✕ Your Ans</span>` : ""}</div>`;
    });

    const expText = (tcsState.lang === "hi" && (q.explanation_hi || q.solution_hi)) ? (q.explanation_hi || q.solution_hi) : (q.solution_text || q.explanation || q.solution || "");
    document.getElementById("fs-exp-text").innerHTML = cleanQuestionHtml(expText, false);
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([document.getElementById("full-sol-screen")]).catch(() => {});
}

window.makeFlashcardFromFullSol = function() {
    const q = tcsState.questions[tcsState.activeFullSolIdx];
    if (!q || typeof window.tsAddFlashcard !== "function") return;
    const front = stripPlainText(q.question || q.question_text || "").slice(0, 260);
    const ansId = String(q.answer || q.correct_option || "1").trim();
    const ansText = stripPlainText(q[`option_${ansId}`] || "");
    const exp = stripPlainText(q.solution_text || q.explanation || "").slice(0, 240);
    window.tsAddFlashcard(front, `Ans: ${ansText}\n${exp}`, q._sectionName || "Mock Revision");
};

window.copyCurrentQuestionDoubt = function() {
    const q = tcsState.questions[tcsState.activeFullSolIdx];
    if (!q) return;
    const txt = [
        `❓ Question (${q._sectionName || "Mock"}):`,
        stripPlainText(q.question || q.question_text || ""),
        `A) ${stripPlainText(q.option_1 || "")}`,
        `B) ${stripPlainText(q.option_2 || "")}`,
        `C) ${stripPlainText(q.option_3 || "")}`,
        `D) ${stripPlainText(q.option_4 || "")}`,
        `✅ Official Ans: Option ${q.answer || "1"}`
    ].join("\n");
    navigator.clipboard.writeText(txt).then(() => {
        if (typeof window.tsToast === "function") window.tsToast("📋 Question copied!", "success");
    });
};

window.closeFullSol = function() {
    document.getElementById("full-sol-screen").classList.add("tcs-hidden");
    document.getElementById("solutions-screen").classList.remove("tcs-hidden");
};
window.nextFullSol = function() { if (tcsState.activeFullSolIdx < tcsState.questions.length - 1) renderFullSolutionContent(++tcsState.activeFullSolIdx); };
window.prevFullSol = function() { if (tcsState.activeFullSolIdx > 0) renderFullSolutionContent(--tcsState.activeFullSolIdx); };
