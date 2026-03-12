import { buildMeta, examCatalog, sourceAnalysis } from "./assets/content.js";

const QUESTION_COUNTS = [5, 10, 20];

const elements = {
  heroStats: document.querySelector("#hero-stats"),
  yearSelect: document.querySelector("#year-select"),
  countSelect: document.querySelector("#count-select"),
  examDescription: document.querySelector("#exam-description"),
  startButton: document.querySelector("#start-button"),
  sourceSummary: document.querySelector("#source-summary"),
  researchNote: document.querySelector("#research-note"),
  quizRoot: document.querySelector("#quiz-root"),
  buildDate: document.querySelector("#build-date")
};

const exams = [...examCatalog.exams].sort((left, right) => right.yearSort - left.yearSort);

let session = null;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getSelectedExam() {
  return exams.find((exam) => exam.id === elements.yearSelect.value) ?? exams[0];
}

function populateHeroStats() {
  const sectionCount = new Set(exams.flatMap((exam) => exam.sections)).size;
  const source = sourceAnalysis.sources[0];
  elements.heroStats.innerHTML = `
    <div class="stat">
      <span class="stat-value">${source.questionCount}</span>
      <span class="stat-label">公開論点から再構成した問題数</span>
    </div>
    <div class="stat">
      <span class="stat-value">${source.pageCount}</span>
      <span class="stat-label">解析済み PDF ページ数</span>
    </div>
    <div class="stat">
      <span class="stat-value">${sectionCount}</span>
      <span class="stat-label">出題分野</span>
    </div>
  `;
}

function populateExamSelect() {
  elements.yearSelect.innerHTML = exams
    .map(
      (exam) =>
        `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.year)} / ${escapeHtml(exam.label)}</option>`
    )
    .join("");
}

function populateCountSelect() {
  const exam = getSelectedExam();
  elements.countSelect.innerHTML = QUESTION_COUNTS.map((count) => {
    const disabled = count > exam.questions.length ? " disabled" : "";
    return `<option value="${count}"${disabled}>${count}問</option>`;
  }).join("");

  if (Number(elements.countSelect.value) > exam.questions.length) {
    elements.countSelect.value = String(QUESTION_COUNTS.find((count) => count <= exam.questions.length) ?? 5);
  }
}

function renderExamDescription() {
  const exam = getSelectedExam();
  elements.examDescription.textContent = `${exam.description} 現在は ${exam.questions.length} 問から 5 / 10 / 20 問を選べます。`;
}

function renderSourceSummary() {
  elements.sourceSummary.innerHTML = sourceAnalysis.sources
    .map(
      (source) => `
        <article class="source-card">
          <span class="meta-label">Source PDF</span>
          <strong>${escapeHtml(source.title)}</strong>
          <p class="result-explanation">
            ${escapeHtml(source.yearLabel)} / ${source.pageCount} ページ / ${source.questionCount} 問 / 解答 ${source.answerCount} 件
          </p>
        </article>
      `
    )
    .join("");
  elements.researchNote.textContent = `${sourceAnalysis.searchSummary} 最終確認: ${sourceAnalysis.searchCheckedAt}`;
}

function syncBuildDate() {
  elements.buildDate.textContent = formatDate(buildMeta.builtAt);
}

function createSession() {
  const exam = getSelectedExam();
  const requestedCount = Number(elements.countSelect.value);
  const selectedQuestions = shuffle(exam.questions)
    .slice(0, requestedCount)
    .map((question) => ({
      ...question,
      presentedChoices: shuffle(question.choices)
    }));

  session = {
    examId: exam.id,
    examLabel: `${exam.year} / ${exam.label}`,
    questionCount: requestedCount,
    currentIndex: 0,
    questions: selectedQuestions,
    answers: []
  };
}

function getCurrentQuestion() {
  if (!session) {
    return null;
  }
  return session.questions[session.currentIndex] ?? null;
}

function getChoiceText(question, choiceId) {
  return question.presentedChoices.find((choice) => choice.id === choiceId)?.text ?? "";
}

function renderEmptyState() {
  elements.quizRoot.innerHTML = `
    <div class="empty-state">
      <div>
        <p class="section-kicker">Ready</p>
        <h2>年度と問題数を選んで開始してください</h2>
        <p class="hero-copy">開始すると、同じ年度でも毎回ランダムな問題順で出題します。</p>
      </div>
    </div>
  `;
}

function renderQuestion() {
  const question = getCurrentQuestion();
  if (!question || !session) {
    renderEmptyState();
    return;
  }

  const answer = session.answers[session.currentIndex];
  const progress = ((session.currentIndex + (answer ? 1 : 0)) / session.questionCount) * 100;

  const choicesMarkup = question.presentedChoices
    .map((choice) => {
      const checked = answer?.selectedChoiceId === choice.id ? " checked" : "";
      const disabled = answer ? " disabled" : "";
      const selectedClass = answer?.selectedChoiceId === choice.id ? " is-selected" : "";
      return `
        <li>
          <label class="choice-label${selectedClass}">
            <input type="radio" name="choice" value="${choice.id}"${checked}${disabled} />
            <span class="choice-pill">${choice.id}</span>
            <span>${escapeHtml(choice.text)}</span>
          </label>
        </li>
      `;
    })
    .join("");

  const feedbackMarkup = answer
    ? `
      <div class="feedback-box ${answer.isCorrect ? "good" : "bad"}">
        <h3 class="feedback-title">${answer.isCorrect ? "正解" : "不正解"}</h3>
        <p class="feedback-copy">
          正答は ${question.correctChoiceId}：${escapeHtml(getChoiceText(question, question.correctChoiceId))}
        </p>
        <p class="feedback-copy">${escapeHtml(question.explanation)}</p>
      </div>
    `
    : "";

  elements.quizRoot.innerHTML = `
    <div class="quiz-header">
      <div>
        <p class="question-index">Question ${session.currentIndex + 1} / ${session.questionCount}</p>
        <span class="question-section">${escapeHtml(question.section)}</span>
      </div>
      <button class="ghost-button" id="reshuffle-button" type="button">設定に戻る</button>
    </div>

    <div class="progress-track">
      <div class="progress-bar" style="width: ${progress}%"></div>
    </div>

    <h2 class="question-title">${escapeHtml(question.prompt)}</h2>

    <form id="answer-form">
      <ol class="choice-list">${choicesMarkup}</ol>
      <div class="question-actions">
        ${
          answer
            ? `<button class="secondary-button" id="next-button" type="button">${
                session.currentIndex === session.questionCount - 1 ? "結果を見る" : "次の問題へ"
              }</button>`
            : '<button class="primary-button" type="submit">この回答で判定</button>'
        }
      </div>
    </form>

    ${feedbackMarkup}
  `;

  elements.quizRoot.querySelector("#reshuffle-button")?.addEventListener("click", () => {
    session = null;
    renderEmptyState();
  });

  elements.quizRoot.querySelector("#answer-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedChoiceId = formData.get("choice");
    if (!selectedChoiceId || !session) {
      return;
    }

    session.answers[session.currentIndex] = {
      questionId: question.id,
      selectedChoiceId,
      isCorrect: selectedChoiceId === question.correctChoiceId
    };
    renderQuestion();
  });

  elements.quizRoot.querySelector("#next-button")?.addEventListener("click", () => {
    if (!session) {
      return;
    }
    session.currentIndex += 1;
    if (session.currentIndex >= session.questionCount) {
      renderResults();
      return;
    }
    renderQuestion();
  });
}

function summarizeBySection() {
  const sectionMap = new Map();
  for (const [index, question] of session.questions.entries()) {
    const answer = session.answers[index];
    const current = sectionMap.get(question.section) ?? { total: 0, correct: 0 };
    current.total += 1;
    current.correct += answer?.isCorrect ? 1 : 0;
    sectionMap.set(question.section, current);
  }
  return [...sectionMap.entries()];
}

function renderResults() {
  if (!session) {
    renderEmptyState();
    return;
  }

  const correctCount = session.answers.filter((answer) => answer?.isCorrect).length;
  const percent = Math.round((correctCount / session.questionCount) * 100);

  const sectionMarkup = summarizeBySection()
    .map(
      ([section, summary]) => `
        <div class="summary-cell">
          <strong>${summary.correct}/${summary.total}</strong>
          <span>${escapeHtml(section)}</span>
        </div>
      `
    )
    .join("");

  const reviewMarkup = session.questions
    .map((question, index) => {
      const answer = session.answers[index];
      return `
        <article class="review-item">
          <div class="review-meta">
            <span class="badge">${index + 1}</span>
            <span class="tag ${answer?.isCorrect ? "good" : "bad"}">${answer?.isCorrect ? "正解" : "要復習"}</span>
            <span class="tag">${escapeHtml(question.section)}</span>
          </div>
          <h3>${escapeHtml(question.prompt)}</h3>
          <p class="result-explanation">あなたの回答: ${answer?.selectedChoiceId ?? "-"} ${escapeHtml(getChoiceText(question, answer?.selectedChoiceId))}</p>
          <p class="result-explanation">正答: ${question.correctChoiceId} ${escapeHtml(getChoiceText(question, question.correctChoiceId))}</p>
          <p class="result-explanation">${escapeHtml(question.explanation)}</p>
        </article>
      `;
    })
    .join("");

  elements.quizRoot.innerHTML = `
    <div class="result-hero">
      <div class="score-card">
        <p class="score-label">Result</p>
        <div class="score-value">${correctCount} / ${session.questionCount}</div>
        <p class="result-explanation">${escapeHtml(session.examLabel)} で ${percent}% の正答率でした。</p>
      </div>
      <div class="summary-grid">${sectionMarkup}</div>
      <div class="result-actions">
        <button class="primary-button" id="retry-button" type="button">同じ条件でもう一度</button>
        <button class="ghost-button" id="reset-button" type="button">設定に戻る</button>
      </div>
    </div>
    <section class="review-list">${reviewMarkup}</section>
  `;

  elements.quizRoot.querySelector("#retry-button")?.addEventListener("click", () => {
    createSession();
    renderQuestion();
  });

  elements.quizRoot.querySelector("#reset-button")?.addEventListener("click", () => {
    session = null;
    renderEmptyState();
  });
}

function initialize() {
  populateHeroStats();
  populateExamSelect();
  populateCountSelect();
  renderExamDescription();
  renderSourceSummary();
  syncBuildDate();
  renderEmptyState();

  elements.yearSelect.addEventListener("change", () => {
    populateCountSelect();
    renderExamDescription();
  });

  elements.startButton.addEventListener("click", () => {
    createSession();
    renderQuestion();
  });
}

initialize();

