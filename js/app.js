const STORAGE_HINTS = "jp_hints";
const STORAGE_PROGRESS = "jp_progress";
const STORAGE_UI_LANG = "jp_ui_lang";
const STORAGE_DAILY = "jp_daily";

let currentLang = "id";

function t(key, vars) {
  const dict = I18N[currentLang] || I18N.id;
  let str = dict[key] !== undefined ? dict[key] : (I18N.id[key] || key);
  if (vars) {
    Object.keys(vars).forEach(k => { str = str.replace("{" + k + "}", vars[k]); });
  }
  return str;
}

function loadHints() {
  return parseInt(localStorage.getItem(STORAGE_HINTS) || "0", 10);
}
function saveHints(n) {
  localStorage.setItem(STORAGE_HINTS, String(Math.max(0, n)));
  updateHintUI();
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PROGRESS)) || {}; }
  catch (e) { return {}; }
}
function getPoints(cat) {
  const p = loadProgress();
  return (p[cat] && typeof p[cat].points === "number") ? p[cat].points : 0;
}
function addPoints(cat, amount) {
  const p = loadProgress();
  const current = (p[cat] && typeof p[cat].points === "number") ? p[cat].points : 0;
  p[cat] = { points: Math.max(0, current + amount) };
  localStorage.setItem(STORAGE_PROGRESS, JSON.stringify(p));
  updatePointUI();
}
function getUnlockedStage(cat) {
  return 1 + Math.floor(getPoints(cat) / POINTS_PER_STAGE);
}
function getStageFor(cat) {
  return getUnlockedStage(cat);
}
function totalPointsAllCategories() {
  return Object.keys(CATEGORY_LABELS).reduce((sum, cat) => sum + getPoints(cat), 0);
}

function updateHintUI() {
  const n = loadHints();
  document.getElementById("hintCount").textContent = n;
  document.getElementById("hintFabBadge").textContent = n;
  const fab = document.getElementById("btnHint");
  if (fab) fab.disabled = n <= 0;
}
function updatePointUI() {
  document.getElementById("pointCount").textContent = totalPointsAllCategories();
}

const state = {
  category: "hiragana",
  tutorialSteps: [],
  tutorialIndex: 0,
  stageNumber: 1,
  questions: [],
  qIndex: 0,
  score: 0,
  pointsThisStage: 0,
  answered: false,
  revealedCount: 0,
  disabledWrongCount: 0,
  hintsUsedThisQuestion: 0,
};

const CATEGORY_LABELS = { hiragana: "Hiragana", katakana: "Katakana", kanji: "Kanji", romaji: "Romaji" };

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + id).classList.add("active");
  document.getElementById("stageBadge").classList.toggle("show", id === "test");
  document.getElementById("btnHint").style.display = id === "test" ? "flex" : "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
  document.getElementById("menuToggle").classList.remove("open");
}

function updateProgressPills() {
  Object.keys(CATEGORY_LABELS).forEach(cat => {
    const pill = document.querySelector(`[data-progress-pill="${cat}"]`);
    if (pill) pill.textContent = t("stagePillPrefix") + " " + getUnlockedStage(cat);
  });
}

function renderStagePicker(cat) {
  const unlocked = getUnlockedStage(cat);
  const points = getPoints(cat);
  const row = document.getElementById("stageChipRow");
  document.getElementById("stagePickerPoints").textContent = "⭐ " + points + " " + t("stagePickerPointsPrefix");
  const chips = [];
  for (let i = 1; i <= unlocked; i++) {
    const isCurrent = i === unlocked;
    chips.push(`<button class="stage-chip ${isCurrent ? "current" : "done"}" data-stage="${i}">
        <span class="num">${i}</span>
        <span class="tag">${isCurrent ? t("stageChipCurrent") : t("stageChipDone")}</span>
      </button>`);
  }
  const nextStage = unlocked + 1;
  const nextNeed = (nextStage - 1) * POINTS_PER_STAGE;
  const have = points;
  chips.push(`<button class="stage-chip locked" data-locked="1">
      <span class="num">🔒 ${nextStage}</span>
      <span class="tag">${t("stageChipLocked")}</span>
      <span class="req">${have}/${nextNeed}</span>
    </button>`);
  row.innerHTML = chips.join("");
  row.querySelectorAll(".stage-chip:not(.locked)").forEach(btn => {
    btn.addEventListener("click", () => startStage(parseInt(btn.getAttribute("data-stage"), 10)));
  });
}

function goCategory(cat) {
  state.category = cat;
  document.getElementById("modeSelectTitle").textContent = CATEGORY_LABELS[cat];
  renderStagePicker(cat);
  showView("mode-select");
}

function go(target) {
  if (target === "home") {
    updateProgressPills();
    showView("select-lang");
  } else if (CATEGORY_LABELS[target]) {
    goCategory(target);
  } else if (target === "mode-select") {
    renderStagePicker(state.category);
    showView("mode-select");
  }
  closeSidebar();
}

document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-nav]");
  if (navBtn) { go(navBtn.getAttribute("data-nav")); return; }
  const catBtn = e.target.closest("[data-select-cat]");
  if (catBtn) { goCategory(catBtn.getAttribute("data-select-cat")); return; }
});

document.getElementById("menuToggle").addEventListener("click", () => {
  const open = document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show", open);
  document.getElementById("menuToggle").classList.toggle("open", open);
});
document.getElementById("overlay").addEventListener("click", closeSidebar);

function romajiTutorialSteps() {
  const vowelTable = `<div class="char-table">
      ${["a","i","u","e","o"].map(v => `<div class="char-tile"><span class="jp">${v}</span><span class="rj">${currentLang === "en" ? "vowel" : "vokal"}</span></div>`).join("")}
    </div>`;
  const consonantTable = `<div class="char-table">
      ${[["か","ka"],["き","ki"],["く","ku"],["け","ke"],["こ","ko"]].map(([j,r]) => `<div class="char-tile"><span class="jp">${j}</span><span class="rj">${r}</span></div>`).join("")}
    </div>`;
  const longVowelTable = `<div class="char-table">
      <div class="char-tile"><span class="jp">コーヒー</span><span class="rj">koohii</span></div>
      <div class="char-tile"><span class="jp">おかあさん</span><span class="rj">okaasan</span></div>
    </div>`;
  const doubleConsonantTable = `<div class="char-table">
      <div class="char-tile"><span class="jp">きって</span><span class="rj">kitte</span></div>
      <div class="char-tile"><span class="jp">がっこう</span><span class="rj">gakkou</span></div>
    </div>`;
  const particleTable = `<div class="char-table">
      <div class="char-tile"><span class="jp">は</span><span class="rj">→ wa</span></div>
      <div class="char-tile"><span class="jp">へ</span><span class="rj">→ e</span></div>
      <div class="char-tile"><span class="jp">を</span><span class="rj">→ o</span></div>
    </div>`;

  if (currentLang === "en") {
    return [
      { title: "What is Romaji?", desc: "Romaji is a way of writing Japanese sounds using Latin letters (a, b, c...) so beginners can read more easily before getting comfortable with Hiragana/Katakana.", html: vowelTable },
      { title: "Consonant + Vowel", desc: "Most Japanese syllables are a consonant combined with one of the 5 vowels above. Example, the K row:", html: consonantTable },
      { title: "Long Vowels", desc: "A long dash mark (ー in Katakana) or a doubled vowel means the sound is held longer. Example: 'ookii' (big) is read with a long 'o', which changes the meaning compared to 'okii'.", html: longVowelTable },
      { title: "Double Consonants (っ / ッ)", desc: "A small tsu (っ) before a consonant means that consonant is held briefly, then pronounced doubled. Example: 'kitte' (postage stamp), 'gakkou' (school).", html: doubleConsonantTable },
      { title: "Particles With Different Readings", desc: "These three characters become grammar particles and are read differently than usual: は is read 'wa', へ is read 'e', and を is read 'o'.", html: particleTable },
    ];
  }
  return [
    { title: "Apa itu Romaji?", desc: "Romaji adalah cara menuliskan bunyi Jepang memakai huruf latin (a, b, c...) supaya pemula lebih mudah membaca sebelum lancar dengan Hiragana/Katakana.", html: vowelTable },
    { title: "Konsonan + Vokal", desc: "Kebanyakan suku kata Jepang adalah konsonan yang digabung salah satu dari 5 vokal di atas. Contoh baris K:", html: consonantTable },
    { title: "Vokal Panjang", desc: "Tanda garis panjang (ー di Katakana) atau vokal ganda artinya bunyi tersebut diucapkan lebih panjang. Contoh: 'ookii' (besar) dibaca dengan 'o' yang panjang, berbeda arti dengan 'okii'.", html: longVowelTable },
    { title: "Konsonan Ganda (っ / ッ)", desc: "Huruf tsu kecil (っ) sebelum konsonan berarti konsonan tersebut ditahan sejenak lalu diucapkan dobel. Contoh: 'kitte' (perangko), 'gakkou' (sekolah).", html: doubleConsonantTable },
    { title: "Partikel yang Bacaannya Berubah", desc: "Tiga huruf ini jadi partikel tata bahasa dan dibaca beda dari biasanya: は dibaca 'wa', へ dibaca 'e', dan を dibaca 'o'.", html: particleTable },
  ];
}

function buildTutorialSteps(cat) {
  if (cat === "romaji") return romajiTutorialSteps();
  if (cat === "kanji") {
    return KANJI_GROUPS.map(g => ({
      title: g.label[currentLang] || g.label.id,
      desc: g.desc[currentLang] || g.desc.id,
      html: `<div class="kanji-table">${KANJI.filter(k => k.group === g.key).map(k =>
        `<div class="kanji-tile"><div class="jp">${k.char}</div><div class="rj">${k.romaji}</div><div class="mn">${k.meaning[currentLang] || k.meaning.id}</div></div>`
      ).join("")}</div>`
    }));
  }
  const pool = cat === "hiragana" ? HIRAGANA : KATAKANA;
  return KANA_GROUPS.map(g => ({
    title: g.label[currentLang] || g.label.id,
    desc: g.desc[currentLang] || g.desc.id,
    html: `<div class="char-table">${pool.filter(c => c.group === g.key).map(c =>
      `<div class="char-tile"><span class="jp">${c.char}</span><span class="rj">${c.romaji}</span></div>`
    ).join("")}</div>`
  }));
}

document.getElementById("btnBasic").addEventListener("click", () => {
  state.tutorialSteps = buildTutorialSteps(state.category);
  state.tutorialIndex = 0;
  renderTutorialStep();
  showView("tutorial");
});

function renderTutorialStep() {
  const step = state.tutorialSteps[state.tutorialIndex];
  document.getElementById("tutorialGroupTitle").textContent = step.title;
  document.getElementById("tutorialGroupDesc").textContent = step.desc;
  document.getElementById("tutorialTableWrap").innerHTML = step.html;
  const dots = state.tutorialSteps.map((s, i) =>
    `<span class="${i < state.tutorialIndex ? "done" : i === state.tutorialIndex ? "current" : ""}"></span>`
  ).join("");
  document.getElementById("tutorialProgress").innerHTML = dots;
  const isLast = state.tutorialIndex === state.tutorialSteps.length - 1;
  document.getElementById("btnTutorialNext").textContent = isLast ? t("tutorialNextLast") : t("tutorialNextDefault");
}

document.getElementById("btnTutorialNext").addEventListener("click", () => {
  if (state.tutorialIndex < state.tutorialSteps.length - 1) {
    state.tutorialIndex++;
    renderTutorialStep();
  } else {
    startStage(getUnlockedStage(state.category));
  }
});

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function getPool(cat) {
  if (cat === "hiragana") return HIRAGANA;
  if (cat === "katakana") return KATAKANA;
  if (cat === "kanji") return KANJI;
  return HIRAGANA.concat(KATAKANA);
}

function makeChoiceSet(pool, correctItem, key) {
  const distractors = sample(pool.filter(p => p[key] !== correctItem[key]), 3);
  return shuffle([correctItem, ...distractors]);
}

function generateQuestion(cat) {
  const pool = getPool(cat);
  const item = pool[Math.floor(Math.random() * pool.length)];

  if (cat === "kanji") {
    const type = Math.random() < 0.5 ? "A" : "B";
    if (type === "A") return { type: "A", item, cat };
    return { type: "B_KANJI", item, cat, choices: makeChoiceSet(pool, item, "char") };
  }
  const type = Math.random() < 0.5 ? "A" : "B";
  if (type === "A") return { type: "A", item, cat };
  return { type: "B", item, cat, choices: makeChoiceSet(pool, item, "romaji") };
}

function generateStageQuestions(cat) {
  return Array.from({ length: 10 }, () => generateQuestion(cat));
}

function startStage(n) {
  state.stageNumber = n;
  state.questions = generateStageQuestions(state.category);
  state.qIndex = 0;
  state.score = 0;
  state.pointsThisStage = 0;
  showView("test");
  renderQuestion();
}

document.getElementById("btnDirectTest").addEventListener("click", () => {
  startStage(getUnlockedStage(state.category));
});

function updateStageBadge() {
  document.getElementById("stageNum").textContent = state.stageNumber;
  document.getElementById("qNum").textContent = state.qIndex + 1;
}

function renderQuestion() {
  state.answered = false;
  state.revealedCount = 0;
  state.disabledWrongCount = 0;
  state.hintsUsedThisQuestion = 0;
  updateStageBadge();
  updateHintUI();

  const q = state.questions[state.qIndex];
  const kicker = document.getElementById("qKicker");
  const promptArea = document.getElementById("qPromptArea");
  const answerArea = document.getElementById("qAnswerArea");
  const actionsArea = document.getElementById("testActionsArea");
  document.getElementById("hintReveal").textContent = "";
  document.getElementById("feedbackLine").textContent = "";
  document.getElementById("feedbackLine").className = "feedback-line";

  if (q.type === "A") {
    kicker.textContent = q.cat === "kanji" ? t("kickerTypeAKanji") : t("kickerTypeA");
    promptArea.innerHTML = `<div class="q-prompt-jp">${q.item.char}</div>` +
      (q.cat === "kanji" ? `<div class="q-meaning-clue">${t("meaningPrefix")} ${q.item.meaning[currentLang] || q.item.meaning.id}</div>` : "");
    answerArea.innerHTML = `<div class="answer-input-row">
        <input type="text" class="answer-input" id="answerInput" placeholder="${t("inputPlaceholder")}" autocomplete="off">
      </div>`;
    actionsArea.innerHTML = `<button class="btn" id="btnCheckAnswer">${t("btnCheckAnswer")}</button>`;
    document.getElementById("btnCheckAnswer").addEventListener("click", () => checkTypedAnswer(q));
    const inputEl = document.getElementById("answerInput");
    inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") checkTypedAnswer(q); });
    inputEl.focus();
  } else if (q.type === "B") {
    kicker.textContent = t("kickerTypeB");
    promptArea.innerHTML = `<div class="q-prompt-romaji">${q.item.romaji}</div>`;
    answerArea.innerHTML = `<div class="choice-grid">${q.choices.map((c, i) =>
      `<button class="choice-btn" data-idx="${i}">${c.char}</button>`).join("")}</div>`;
    actionsArea.innerHTML = "";
    document.querySelectorAll(".choice-btn").forEach(btn =>
      btn.addEventListener("click", () => checkChoiceAnswer(q, btn, "char")));
  } else if (q.type === "B_KANJI") {
    kicker.textContent = t("kickerTypeBKanji");
    promptArea.innerHTML = `<div class="q-prompt-romaji" style="font-family:var(--font-body); font-size:1.5rem;">${q.item.meaning[currentLang] || q.item.meaning.id}</div>`;
    answerArea.innerHTML = `<div class="choice-grid">${q.choices.map((c, i) =>
      `<button class="choice-btn" data-idx="${i}">${c.char}</button>`).join("")}</div>`;
    actionsArea.innerHTML = "";
    document.querySelectorAll(".choice-btn").forEach(btn =>
      btn.addEventListener("click", () => checkChoiceAnswer(q, btn, "char")));
  }
}

function pointsForAnswer(isCorrect) {
  if (!isCorrect) return POINT_WRONG;
  const raw = POINT_CORRECT_BASE - (state.hintsUsedThisQuestion * POINT_HINT_PENALTY);
  return Math.max(POINT_MIN_CORRECT, raw);
}

function finishAnswer(isCorrect) {
  state.answered = true;
  const earned = pointsForAnswer(isCorrect);
  if (isCorrect) {
    state.score++;
    state.pointsThisStage += earned;
    saveHints(loadHints() + 1);
    addPoints(state.category, earned);
  }
  const fb = document.getElementById("feedbackLine");
  fb.textContent = isCorrect ? `${t("feedbackCorrect")} +${earned} ⭐ / +1 💡` : t("feedbackWrong");
  fb.className = "feedback-line " + (isCorrect ? "correct" : "wrong");

  const isLast = state.qIndex === state.questions.length - 1;
  document.getElementById("testActionsArea").innerHTML =
    `<button class="btn" id="btnNextQuestion">${isLast ? t("btnSeeResult") : t("btnNext")}</button>`;
  document.getElementById("btnNextQuestion").addEventListener("click", nextQuestion);
}

function checkTypedAnswer(q) {
  if (state.answered) return;
  const val = document.getElementById("answerInput").value.trim().toLowerCase();
  document.getElementById("answerInput").disabled = true;
  const target = q.item.romaji.toLowerCase();
  finishAnswer(val === target);
  if (val !== target) {
    document.getElementById("hintReveal").textContent = t("answerPrefix") + " " + q.item.romaji;
  }
}

function checkChoiceAnswer(q, btn, key) {
  if (state.answered) return;
  const correctVal = q.item[key];
  document.querySelectorAll(".choice-btn").forEach(b => {
    b.disabled = true;
    if (b.textContent === correctVal) b.classList.add("correct");
  });
  const isCorrect = btn.textContent === correctVal;
  if (!isCorrect) btn.classList.add("wrong");
  finishAnswer(isCorrect);
}

function nextQuestion() {
  if (state.qIndex < state.questions.length - 1) {
    state.qIndex++;
    renderQuestion();
  } else {
    endStage();
  }
}

function endStage() {
  document.getElementById("completeTitle").textContent = t("stageCompleteTitle", { n: state.stageNumber });
  document.getElementById("scoreLine").textContent = `${state.score}/10`;
  document.getElementById("pointsEarnedLine").textContent = `+${state.pointsThisStage} ⭐`;

  const unlockedNow = getUnlockedStage(state.category);
  const nextStage = state.stageNumber + 1;
  const lockNoteEl = document.getElementById("lockNote");
  const nextBtn = document.getElementById("btnNextStage");
  if (nextStage <= unlockedNow) {
    lockNoteEl.textContent = "";
    nextBtn.style.display = "";
    nextBtn.disabled = false;
  } else {
    const need = (nextStage - 1) * POINTS_PER_STAGE - getPoints(state.category);
    lockNoteEl.textContent = t("lockNoteLocked", { need: need, n: nextStage });
    nextBtn.style.display = "none";
  }
  showView("stage-complete");
}

document.getElementById("btnRetryStage").addEventListener("click", () => startStage(state.stageNumber));
document.getElementById("btnNextStage").addEventListener("click", () => startStage(state.stageNumber + 1));
document.getElementById("btnGoHomeFromComplete").addEventListener("click", () => go("home"));

document.getElementById("btnHint").addEventListener("click", () => {
  if (state.answered || loadHints() <= 0) return;
  const q = state.questions[state.qIndex];

  if (q.type === "A") {
    const target = q.item.romaji;
    if (state.revealedCount >= target.length) return;
    state.revealedCount++;
    state.hintsUsedThisQuestion++;
    saveHints(loadHints() - 1);
    const revealed = target.split("").map((ch, i) => i < state.revealedCount ? ch : "_").join(" ");
    document.getElementById("hintReveal").textContent = revealed;
  } else {
    const wrongBtns = Array.from(document.querySelectorAll(".choice-btn"))
      .filter(b => !b.disabled && !b.classList.contains("disabled-hint") && b.textContent !== q.item.char);
    const maxDisable = q.choices.length - 2;
    if (wrongBtns.length === 0 || state.disabledWrongCount >= maxDisable) return;
    const pick = wrongBtns[Math.floor(Math.random() * wrongBtns.length)];
    pick.classList.add("disabled-hint");
    pick.disabled = true;
    state.disabledWrongCount++;
    state.hintsUsedThisQuestion++;
    saveHints(loadHints() - 1);
  }
});

document.getElementById("btnResetProgress").addEventListener("click", () => {
  const sure = confirm(t("resetConfirm"));
  if (sure) {
    localStorage.removeItem(STORAGE_HINTS);
    localStorage.removeItem(STORAGE_PROGRESS);
    localStorage.removeItem(STORAGE_DAILY);
    location.reload();
  }
});

function applyStaticI18n() {
  const map = {
    switchLangLabel: currentLang === "id" ? "Bahasa: Indonesia" : "Language: English",
    sidebarMenuTitle: t("sidebarMenuTitle"),
    navHomeLabel: t("navHomeLabel"),
    resetProgressLabel: t("resetProgressLabel"),
    stageBadgeLabel: t("stageBadgeLabel"),
    stageBadgeSoal: t("stageBadgeSoal"),
    landingTitlePre: t("landingTitlePre"),
    landingTitlePost: t("landingTitlePost"),
    landingSub: t("landingSub"),
    btnStartLearning: t("btnStartLearning"),
    selectLangEyebrow: t("selectLangEyebrow"),
    selectLangTitle: t("selectLangTitle"),
    selectLangSub: t("selectLangSub"),
    descHiragana: t("descHiragana"),
    descKatakana: t("descKatakana"),
    descKanji: t("descKanji"),
    descRomaji: t("descRomaji"),
    backLinkHomeLabel: t("backLinkHomeLabel"),
    modeSelectEyebrow: t("modeSelectEyebrow"),
    modeSelectSub: t("modeSelectSub"),
    basicTitle: t("basicTitle"),
    basicDesc: t("basicDesc"),
    directTestTitle: t("directTestTitle"),
    directTestDesc: t("directTestDesc"),
    stagePickerLabel: t("stagePickerLabel"),
    backLinkModeLabel: t("backLinkModeLabel"),
    scoreLineLabel: t("scoreLineLabel"),
    btnRetryStage: t("btnRetryStage"),
    btnGoHomeFromComplete: t("btnGoHome"),
    btnNextStage: t("btnNextStage"),
    autoSaveNote: t("autoSaveNote"),
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = map[id];
  });
  document.getElementById("btnHint").title = t("hintTitle");
  document.documentElement.lang = currentLang;
  if (document.getElementById("view-mode-select").classList.contains("active")) {
    renderStagePicker(state.category);
  }
  if (document.getElementById("view-tutorial").classList.contains("active")) {
    const keepIndex = state.tutorialIndex;
    state.tutorialSteps = buildTutorialSteps(state.category);
    state.tutorialIndex = Math.min(keepIndex, state.tutorialSteps.length - 1);
    renderTutorialStep();
  }
  if (document.getElementById("view-test").classList.contains("active") && state.questions.length) {
    renderQuestion();
  }
}

function setUiLang(lang) {
  currentLang = lang;
  localStorage.setItem(STORAGE_UI_LANG, lang);
  applyStaticI18n();
}

document.querySelectorAll("[data-set-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    setUiLang(btn.getAttribute("data-set-lang"));
    showView("landing");
  });
});

document.getElementById("btnSwitchLang").addEventListener("click", () => {
  setUiLang(currentLang === "id" ? "en" : "id");
  closeSidebar();
});

function showDailyToast(msg) {
  const el = document.getElementById("dailyToast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4500);
}

function checkDailyBonus() {
  let daily;
  try { daily = JSON.parse(localStorage.getItem(STORAGE_DAILY)) || {}; }
  catch (e) { daily = {}; }
  const today = new Date().toISOString().slice(0, 10);
  if (daily.lastDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = daily.lastDate === yesterday ? (daily.streak || 0) + 1 : 1;

  Object.keys(CATEGORY_LABELS).forEach(cat => addPoints(cat, DAILY_BONUS_POINTS));
  localStorage.setItem(STORAGE_DAILY, JSON.stringify({ lastDate: today, streak: streak }));

  setTimeout(() => {
    showDailyToast(t("dailyBonusToast", { pts: DAILY_BONUS_POINTS, streak: streak }));
  }, 600);
}

function setupAntiCopy() {
  document.body.classList.add("no-select");
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("copy", (e) => {
    if (!["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) e.preventDefault();
  });
  document.addEventListener("cut", (e) => {
    if (!["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) e.preventDefault();
  });
  document.addEventListener("keydown", (e) => {
    const key = e.key ? e.key.toUpperCase() : "";
    const blocked =
      key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(key)) ||
      (e.metaKey && e.altKey && ["I", "J", "C"].includes(key)) ||
      (e.ctrlKey && key === "U");
    if (blocked) e.preventDefault();
  });
}

function setupBlurOnLeave() {
  const shell = document.getElementById("appShell");
  document.addEventListener("visibilitychange", () => {
    shell.classList.toggle("blurred", document.hidden);
  });
  window.addEventListener("blur", () => shell.classList.add("blurred"));
  window.addEventListener("focus", () => shell.classList.remove("blurred"));
}

setupAntiCopy();
setupBlurOnLeave();

const storedLang = localStorage.getItem(STORAGE_UI_LANG);
if (storedLang) {
  currentLang = storedLang;
  applyStaticI18n();
  showView("landing");
} else {
  showView("lang-select");
}

updateHintUI();
updatePointUI();
updateProgressPills();
checkDailyBonus();
