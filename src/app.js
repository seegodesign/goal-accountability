const STORAGE_KEY = 'accountability-app';
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const WEEKDAY_SHORT_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long' });
const APP_MESSAGES = globalThis.MESSAGES;
const APP_DAILY_PROMPTS = globalThis.DAILY_PROMPTS;
const APP_GOAL_IDEAS = globalThis.GOAL_IDEAS;
const GOAL_CATEGORY_IDS = Object.keys(APP_GOAL_IDEAS);
const SUN_ICON_SVG = '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 3.5V6"></path><path d="M12 18V20.5"></path><path d="M3.5 12H6"></path><path d="M18 12H20.5"></path><path d="m5.9 5.9 1.8 1.8"></path><path d="m16.3 16.3 1.8 1.8"></path><path d="m18.1 5.9-1.8 1.8"></path><path d="m7.7 16.3-1.8 1.8"></path></svg>';
const MOON_ICON_SVG = '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const EFFORT_MINUTES = {
  tiny: 10,
  steady: 20,
  deep: 40
};

const PAGE_IDS = ['dashboard', 'goals', 'consistency', 'reflection', 'about'];
const THEME_IDS = ['light', 'dark'];

const state = loadState();

const el = {
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeToggleIcon: document.getElementById('theme-toggle-icon'),
  todayDate: document.getElementById('today-date'),
  motivation: document.getElementById('motivation'),
  statsGrid: document.getElementById('stats-grid'),
  goalsList: document.getElementById('goals-list'),
  goalsEmptyLabel: document.getElementById('goals-empty-label'),
  goalTitle: document.getElementById('goal-title'),
  goalCategory: document.getElementById('goal-category'),
  addGoalBtn: document.getElementById('add-goal-btn'),
  goalFeedback: document.getElementById('goal-feedback'),
  heatmap: document.getElementById('heatmap'),
  heatmapPeriod: document.getElementById('heatmap-period'),
  heatmapMetric: document.getElementById('heatmap-metric'),
  heatmapRangeLabel: document.getElementById('heatmap-range-label'),
  consistencyWeeklyScorecard: document.getElementById('consistency-weekly-scorecard'),
  consistencySparkline: document.getElementById('consistency-sparkline'),
  consistencyDowPerformance: document.getElementById('consistency-dow-performance'),
  consistencyReliability: document.getElementById('consistency-reliability'),
  consistencyInsights: document.getElementById('consistency-insights'),
  consistencyStreakTimeline: document.getElementById('consistency-streak-timeline'),
  consistencyMilestones: document.getElementById('consistency-milestones'),
  consistencyProjection: document.getElementById('consistency-projection'),
  consistencyLast14Table: document.getElementById('consistency-last14-table'),
  reflection: document.getElementById('daily-reflection'),
  reflectionStatus: document.getElementById('reflection-status'),
  reflectionHistoryDate: document.getElementById('reflection-history-date'),
  reflectionPrevDayBtn: document.getElementById('reflection-prev-day-btn'),
  reflectionNextDayBtn: document.getElementById('reflection-next-day-btn'),
  reflectionHistoryToggleBtn: document.getElementById('reflection-history-toggle-btn'),
  reflectionHistoryPanel: document.getElementById('reflection-history-panel'),
  reflectionHistoryView: document.getElementById('reflection-history-view'),
  reflectionHistoryList: document.getElementById('reflection-history-list'),
  promptBox: document.getElementById('prompt-box'),
  promptResponseInput: document.getElementById('prompt-response-input'),
  savePromptResponseBtn: document.getElementById('save-prompt-response-btn'),
  promptResponseStatus: document.getElementById('prompt-response-status'),
  promptResponseHistory: document.getElementById('prompt-response-history'),
  promptHistoryToggleBtn: document.getElementById('prompt-history-toggle-btn'),
  promptHistoryPanel: document.getElementById('prompt-history-panel'),
  nextPromptBtn: document.getElementById('next-prompt-btn'),
  dashboardFocusBadge: document.getElementById('dashboard-focus-badge'),
  dashboardFocusSummary: document.getElementById('dashboard-focus-summary'),
  dashboardWeekTrend: document.getElementById('dashboard-week-trend'),
  dashboardStreakSpotlight: document.getElementById('dashboard-streak-spotlight'),
  dashboardInProgressCount: document.getElementById('dashboard-in-progress-count'),
  dashboardInProgressList: document.getElementById('dashboard-in-progress-list'),
  dashboardPromptPreview: document.getElementById('dashboard-prompt-preview'),
  dashboardReflectionPulse: document.getElementById('dashboard-reflection-pulse'),
  featureGrid: document.getElementById('feature-grid'),
  featureAside: document.getElementById('feature-aside'),
  pageTabs: Array.from(document.querySelectorAll('.page-tab')),
  pageSections: Array.from(document.querySelectorAll('[data-pages]')),
  confettiLayer: document.getElementById('confetti-layer'),
  ideaFocus: document.getElementById('idea-focus'),
  ideaEffort: document.getElementById('idea-effort'),
  refreshIdeasBtn: document.getElementById('refresh-ideas-btn'),
  ideaResults: document.getElementById('idea-results'),
  ideaHelperNote: document.getElementById('idea-helper-note')
};

let promptTimer = null;
let consistencyResizeRaf = null;
const expandedGoalIds = new Set();

init();

function init() {
  requestPersistentStorage();
  applyTheme(state.theme || 'dark');
  bindEvents();
  renderAll();
  rotateMotivation(true);
}

async function requestPersistentStorage() {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') {
    return;
  }

  try {
    const alreadyPersistent =
      typeof navigator.storage.persisted === 'function' ? await navigator.storage.persisted() : false;

    if (alreadyPersistent) {
      return;
    }

    await navigator.storage.persist();
  } catch {
    // Ignore failures; persistence support depends on browser policy and user settings.
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      goals: [],
      reflections: {},
      selectedPromptIndex: 0,
      promptResponses: [],
      promptDraft: '',
      selectedPage: 'dashboard',
      theme: 'dark',
      selectedReflectionDate: todayKey(),
      lastCelebrationDate: null
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      goals: normalizeGoals(parsed.goals),
      reflections: parsed.reflections && typeof parsed.reflections === 'object' ? parsed.reflections : {},
      selectedPromptIndex: Number.isInteger(parsed.selectedPromptIndex) ? parsed.selectedPromptIndex : 0,
      promptResponses: normalizePromptResponses(parsed.promptResponses),
      promptDraft: typeof parsed.promptDraft === 'string' ? parsed.promptDraft : '',
      selectedPage: normalizePage(parsed.selectedPage),
      theme: normalizeTheme(parsed.theme),
      selectedReflectionDate: normalizeDateKey(parsed.selectedReflectionDate) || todayKey(),
      lastCelebrationDate: typeof parsed.lastCelebrationDate === 'string' ? parsed.lastCelebrationDate : null
    };
  } catch {
    return {
      goals: [],
      reflections: {},
      selectedPromptIndex: 0,
      promptResponses: [],
      promptDraft: '',
      selectedPage: 'dashboard',
      theme: 'dark',
      selectedReflectionDate: todayKey(),
      lastCelebrationDate: null
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKeyFromLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return dateKeyFromLocalDate(new Date());
}

function formatDisplayDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return DATE_FORMATTER.format(d);
}

function ordinalSuffix(day) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }

  const mod10 = day % 10;
  if (mod10 === 1) {
    return 'st';
  }
  if (mod10 === 2) {
    return 'nd';
  }
  if (mod10 === 3) {
    return 'rd';
  }
  return 'th';
}

function formatLongDateWithOrdinal(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  const weekday = WEEKDAY_FORMATTER.format(d);
  const month = MONTH_FORMATTER.format(d);
  const day = d.getDate();
  const year = d.getFullYear();
  return `${weekday}, ${month} ${day}${ordinalSuffix(day)}, ${year}`;
}

function formatShortDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  const weekday = WEEKDAY_SHORT_FORMATTER.format(d);
  const month = MONTH_FORMATTER.format(d);
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}

function bindEvents() {
  el.themeToggleBtn.addEventListener('click', () => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    saveState();
  });

  el.addGoalBtn.addEventListener('click', addGoalFromInput);
  el.goalTitle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addGoalFromInput();
    }
  });

  el.reflection.addEventListener('input', () => {
    state.reflections[todayKey()] = el.reflection.value;
    saveState();
    el.reflectionStatus.textContent = `Saved locally at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    renderReflectionHistory();
  });

  el.reflectionHistoryToggleBtn?.addEventListener('click', () => {
    toggleHistoryPanel(el.reflectionHistoryPanel, el.reflectionHistoryToggleBtn);
  });

  el.promptHistoryToggleBtn?.addEventListener('click', () => {
    toggleHistoryPanel(el.promptHistoryPanel, el.promptHistoryToggleBtn);
  });

  el.reflectionHistoryDate.addEventListener('change', () => {
    setSelectedReflectionDate(el.reflectionHistoryDate.value);
  });

  el.reflectionPrevDayBtn.addEventListener('click', () => {
    setSelectedReflectionDate(shiftDateKey(state.selectedReflectionDate || todayKey(), -1));
  });

  el.reflectionNextDayBtn.addEventListener('click', () => {
    const next = shiftDateKey(state.selectedReflectionDate || todayKey(), 1);
    const capped = next > todayKey() ? todayKey() : next;
    setSelectedReflectionDate(capped);
  });

  el.reflectionHistoryList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-reflection-date]');
    if (!btn) {
      return;
    }
    setSelectedReflectionDate(btn.dataset.reflectionDate);
  });

  el.nextPromptBtn.addEventListener('click', () => {
    state.selectedPromptIndex = (state.selectedPromptIndex + 1) % APP_DAILY_PROMPTS.length;
    state.promptDraft = '';
    saveState();
    renderPrompt();
    hydratePromptResponseInput();
    el.promptResponseStatus.textContent = 'Prompt refreshed. Ready when you are.';
  });

  el.savePromptResponseBtn.addEventListener('click', submitPromptResponse);
  el.promptResponseInput.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submitPromptResponse();
    }
  });

  el.promptResponseInput.addEventListener('input', () => {
    state.promptDraft = el.promptResponseInput.value;
    saveState();
    el.promptResponseStatus.textContent = 'Draft saved locally.';
  });

  el.pageTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActivePage(tab.dataset.pageTarget, true);
    });
  });

  el.heatmapPeriod?.addEventListener('change', renderConsistency);
  el.heatmapMetric?.addEventListener('change', renderConsistency);

  document.addEventListener('click', (event) => {
    const jumpBtn = event.target.closest('[data-page-jump]');
    if (jumpBtn) {
      setActivePage(jumpBtn.dataset.pageJump, true);
      return;
    }

    const markBtn = event.target.closest('[data-dashboard-mark-id]');
    if (!markBtn) {
      return;
    }

    markGoal(markBtn.dataset.dashboardMarkId, markBtn.dataset.status);
  });

  el.refreshIdeasBtn.addEventListener('click', renderGoalIdeas);
  el.ideaFocus.addEventListener('change', renderGoalIdeas);
  el.ideaEffort.addEventListener('change', renderGoalIdeas);
  window.addEventListener('resize', () => {
    updateIdeaChipOverflowState();
    if (consistencyResizeRaf) {
      cancelAnimationFrame(consistencyResizeRaf);
    }
    consistencyResizeRaf = requestAnimationFrame(() => {
      consistencyResizeRaf = null;
      renderConsistency();
    });
  });
  el.ideaResults.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-idea-title]');
    if (!btn) {
      return;
    }

    const added = createGoal(btn.dataset.ideaTitle, btn.dataset.ideaCategory);
    if (added) {
      el.goalFeedback.textContent = 'Idea added as a new goal.';
    } else {
      el.goalFeedback.textContent = 'That goal already exists.';
    }

    renderAll();
  });
}

function startPromptRotation() {
  if (promptTimer) {
    clearInterval(promptTimer);
  }

  promptTimer = setInterval(() => {
    if (el.promptResponseInput.value.trim()) {
      return;
    }

    state.selectedPromptIndex = (state.selectedPromptIndex + 1) % APP_DAILY_PROMPTS.length;
    saveState();
    renderPrompt();
    rotateMotivation(false);
  }, 20000);
}

function addGoalFromInput() {
  const title = el.goalTitle.value.trim();
  const category = el.goalCategory?.value || '';
  if (!title) {
    el.goalFeedback.textContent = 'Name a commitment you want to keep.';
    return;
  }

  const added = createGoal(title, category);
  if (!added) {
    el.goalFeedback.textContent = 'That goal already exists. Try a slightly different wording.';
    return;
  }

  el.goalTitle.value = '';
  el.goalFeedback.textContent = 'Goal added. Keep it simple and keep it honest.';
  renderAll();
}

function createGoal(title, category) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return false;
  }

  const exists = state.goals.some((g) => g.title.toLowerCase() === cleanTitle.toLowerCase());
  if (exists) {
    return false;
  }

  state.goals.unshift({
    id: crypto.randomUUID(),
    title: cleanTitle,
    category: normalizeGoalCategory(category),
    createdDate: todayKey(),
    streakCount: 0,
    longestStreak: 0,
    completionHistory: {}
  });

  saveState();
  return true;
}

function renderAll() {
  hydrateReflection();
  renderReflectionHistory();
  renderPrompt();
  renderDashboard();
  hydratePromptResponseInput();
  renderPromptResponseHistory();
  renderGoalIdeas();
  renderStats();
  renderGoals();
  renderConsistency();
  setActivePage(state.selectedPage || 'dashboard', false);
  maybeCelebrate();
}

function renderDashboard() {
  const today = todayKey();
  const activeGoals = state.goals.length;
  const doneToday = state.goals.filter((goal) => goal.completionHistory[today]?.status === 'done').length;
  const pendingGoals = state.goals.filter((goal) => !goal.completionHistory[today]?.status);
  const isComplete = activeGoals > 0 && pendingGoals.length === 0;
  const isDark = state.theme === 'dark';

  el.dashboardFocusBadge.classList.remove(
    'bg-transparent',
    'text-white',
    'border-white',
    'text-teal-700',
    'border-teal-300',
    'text-teal-300',
    'border-tide-300',
    'bg-tide-50',
    'text-tide-700',
    'border-tide-200'
  );

  if (isComplete) {
    el.dashboardFocusBadge.classList.add('bg-transparent');
    if (isDark) {
      el.dashboardFocusBadge.classList.add('text-teal-300', 'border-teal-300');
    } else {
      el.dashboardFocusBadge.classList.add('text-teal-700', 'border-teal-300');
    }
  } else {
    el.dashboardFocusBadge.classList.add('bg-transparent');
    if (isDark) {
      el.dashboardFocusBadge.classList.add('text-teal-300', 'border-teal-300');
    } else {
      el.dashboardFocusBadge.classList.add('text-tide-700', 'border-tide-200');
    }
  }

  if (activeGoals === 0) {
    el.dashboardFocusBadge.textContent = 'Start here';
    el.dashboardFocusSummary.textContent = 'Add your first goal to unlock daily focus, streak insights, and weekly trends.';
  } else if (pendingGoals.length === 0) {
    el.dashboardFocusBadge.textContent = 'Complete';
    el.dashboardFocusSummary.textContent = `All ${activeGoals} goals are marked today. Nice follow-through.`;
  } else {
    el.dashboardFocusBadge.textContent = `${pendingGoals.length} left`;
    el.dashboardFocusSummary.textContent = `${doneToday}/${activeGoals} marked today. Next up: ${pendingGoals[0].title}.`;
  }

  const weekPoints = aggregateDailyOutcomes(7).reverse();
  el.dashboardWeekTrend.innerHTML = `
    <p class="text-xs uppercase tracking-wide text-zinc-500 mb-2">This Week's Trend</p>
    <div class="grid grid-cols-7 gap-2">
      ${weekPoints
        .map((point) => {
          const dayLabel = WEEKDAY_SHORT_FORMATTER.format(new Date(`${point.date}T12:00:00`));
          const colorClass =
            point.type === 'done'
              ? 'bg-teal-500'
              : point.type === 'partial'
                ? 'bg-amber-500'
                : point.type === 'missed'
                  ? 'bg-red-500'
                  : 'bg-zinc-300';

          return `
            <div class="text-center">
              <div class="mx-auto w-full max-w-10 h-2 rounded-full ${colorClass}" title="${formatLongDateWithOrdinal(point.date)}: ${point.label}"></div>
              <p class="mt-1 text-[11px] text-zinc-500">${dayLabel}</p>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  const bestGoal =
    state.goals
      .map((goal) => ({ goal, stats: computeGoalStats(goal) }))
      .sort((a, b) => b.stats.currentStreak - a.stats.currentStreak)[0] || null;
  const atRiskGoal = pendingGoals[0] || null;

  el.dashboardStreakSpotlight.innerHTML = `
    <p><span class="text-zinc-500">Best active streak:</span> ${bestGoal ? `${escapeHtml(bestGoal.goal.title)} (${bestGoal.stats.currentStreak} days)` : 'No streak yet'}</p>
    <p class="mt-2"><span class="text-zinc-500">At risk today:</span> ${atRiskGoal ? escapeHtml(atRiskGoal.title) : 'None'}</p>
  `;

  el.dashboardInProgressCount.textContent = pendingGoals.length ? `${pendingGoals.length} unmarked` : 'All marked';
  if (pendingGoals.length === 0) {
    el.dashboardInProgressList.innerHTML = '<p class="text-sm text-zinc-500">Everything is marked for today. Keep the momentum.</p>';
  } else {
    el.dashboardInProgressList.innerHTML = pendingGoals
      .map(
        (goal) => `
          <div class="rounded-xl border border-zinc-200 bg-white p-3">
            <p class="text-sm font-semibold text-zinc-800">${escapeHtml(goal.title)}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button class="focus-ring text-xs rounded-lg px-3 py-1.5 bg-teal-600 text-white hover:bg-teal-500 transition-colors" data-dashboard-mark-id="${goal.id}" data-status="done">Done</button>
              <button class="focus-ring text-xs rounded-lg px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-red-100 transition-colors" data-dashboard-mark-id="${goal.id}" data-status="missed">Missed</button>
            </div>
          </div>
        `
      )
      .join('');
  }

  el.dashboardPromptPreview.textContent = getCurrentPrompt();

  const reflectionToday = (state.reflections[today] || '').trim().length > 0;
  const reflectionStreak = computeReflectionStreak(today);
  el.dashboardReflectionPulse.innerHTML = `
    <p><span class="text-zinc-500">Today:</span> ${reflectionToday ? 'Written' : 'Not written yet'}</p>
    <p class="mt-2"><span class="text-zinc-500">Current reflection streak:</span> ${reflectionStreak} day${reflectionStreak === 1 ? '' : 's'}</p>
  `;
}

function computeReflectionStreak(startDateKey) {
  let streak = 0;
  let cursor = startDateKey;

  while ((state.reflections[cursor] || '').trim().length > 0) {
    streak += 1;
    cursor = previousDate(cursor);
  }

  return streak;
}

function setActivePage(page, shouldScroll) {
  const nextPage = normalizePage(page);
  state.selectedPage = nextPage;

  for (const section of el.pageSections) {
    const pages = section.dataset.pages
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    section.classList.toggle('hidden', !pages.includes(nextPage));
  }

  for (const tab of el.pageTabs) {
    const isActive = tab.dataset.pageTarget === nextPage;
    tab.setAttribute('aria-pressed', String(isActive));
    tab.classList.toggle('bg-tide-600', isActive);
    tab.classList.toggle('text-white', isActive);
    tab.classList.toggle('border-tide-600', isActive);
    tab.classList.toggle('shadow-warm', isActive);
    tab.classList.toggle('bg-white', !isActive);
    tab.classList.toggle('text-zinc-600', !isActive);
    tab.classList.toggle('border-zinc-200', !isActive);
  }

  updateDesktopFeatureLayout(nextPage);

  saveState();

  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updateDesktopFeatureLayout(page) {
  if (!el.featureAside) {
    return;
  }

  // Keep a consistent two-column desktop layout across pages.
  el.featureAside.classList.remove('lg:col-span-3');
}

function normalizePage(value) {
  const page = typeof value === 'string' ? value : '';
  return PAGE_IDS.includes(page) ? page : 'dashboard';
}

function normalizeTheme(value) {
  const theme = typeof value === 'string' ? value : '';
  return THEME_IDS.includes(theme) ? theme : 'dark';
}

function applyTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  state.theme = nextTheme;
  document.body.classList.toggle('theme-dark', nextTheme === 'dark');

  const isDark = nextTheme === 'dark';
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? '#0a0f13' : '#ffffff');
  }

  el.themeToggleBtn.setAttribute('aria-pressed', String(isDark));
  el.themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  el.themeToggleIcon.innerHTML = isDark ? SUN_ICON_SVG : MOON_ICON_SVG;
}

function renderGoalIdeas() {
  const focus = el.ideaFocus.value;
  const effort = el.ideaEffort.value;
  const minutes = EFFORT_MINUTES[effort] || 20;
  const existingTitles = new Set(state.goals.map((g) => g.title.trim().toLowerCase()));

  const basePool =
    focus === 'all'
      ? Object.entries(APP_GOAL_IDEAS).flatMap(([category, ideas]) => ideas.map((idea) => ({ category, idea })))
      : (APP_GOAL_IDEAS[focus] || APP_GOAL_IDEAS.health).map((idea) => ({ category: focus, idea }));

  const seenIdeas = new Set();
  const shuffled = [...basePool]
    .map((entry) => ({
      category: entry.category,
      idea: entry.idea.replaceAll('{minutes}', String(minutes)),
      sort: Math.random()
    }))
    .sort((a, b) => a.sort - b.sort)
    .filter((entry) => {
      if (seenIdeas.has(entry.idea)) {
        return false;
      }
      seenIdeas.add(entry.idea);
      return true;
    })
    .filter((entry) => !existingTitles.has(entry.idea.trim().toLowerCase()))
    .slice(0, 6);

  if (shuffled.length === 0) {
    el.ideaResults.innerHTML = '<p class="text-sm text-zinc-500">All current suggestions are already in your goals. Try another focus or effort level.</p>';
  } else {
    el.ideaResults.innerHTML = shuffled
      .map((entry) => {
        const escaped = escapeHtml(entry.idea);

        return `<button class="idea-chip focus-ring rounded-full px-3 py-2 text-sm bg-white border border-zinc-300 hover:border-teal-400 hover:bg-teal-50 text-zinc-700 transition-colors" data-idea-title="${escaped}" data-idea-category="${entry.category}" title="${escaped}"><span class="idea-chip__prefix" aria-hidden="true">+</span><span class="idea-chip__viewport"><span class="idea-chip__text">${escaped}</span></span></button>`;
      })
      .join('');

    // Measure actual overflow after render so marquee only runs when text exceeds chip width.
    requestAnimationFrame(updateIdeaChipOverflowState);
  }

  if (state.goals.length === 0) {
    el.ideaHelperNote.textContent = 'No goals yet. Tap one suggestion to begin.';
  } else {
    el.ideaHelperNote.textContent = 'Suggestions stay available any time you want to add a new commitment.';
  }
}

function updateIdeaChipOverflowState() {
  const chips = el.ideaResults.querySelectorAll('.idea-chip');

  for (const chip of chips) {
    const viewport = chip.querySelector('.idea-chip__viewport');
    const text = chip.querySelector('.idea-chip__text');
    if (!viewport || !text) {
      continue;
    }

    const overflow = Math.max(0, Math.ceil(text.scrollWidth - viewport.clientWidth));
    if (overflow > 2) {
      const duration = Math.min(5.2, Math.max(1.8, 1.2 + overflow / 110));
      chip.classList.add('is-scrollable');
      chip.style.setProperty('--scroll-distance', `${overflow}px`);
      chip.style.setProperty('--scroll-duration', `${duration.toFixed(1)}s`);
    } else {
      chip.classList.remove('is-scrollable');
      chip.style.setProperty('--scroll-distance', '0px');
      chip.style.setProperty('--scroll-duration', '6s');
      text.style.transform = 'translateX(0)';
    }
  }
}

function hydrateReflection() {
  el.reflection.value = state.reflections[todayKey()] || '';
}

function renderReflectionHistory() {
  const today = todayKey();
  const selected = normalizeDateKey(state.selectedReflectionDate) || today;
  state.selectedReflectionDate = selected;

  el.reflectionHistoryDate.value = selected;
  el.reflectionHistoryDate.max = today;
  el.reflectionNextDayBtn.disabled = selected >= today;
  el.reflectionNextDayBtn.classList.toggle('opacity-50', selected >= today);
  el.reflectionNextDayBtn.classList.toggle('cursor-not-allowed', selected >= today);

  const selectedText = state.reflections[selected] || '';
  if (selectedText.trim()) {
    const safeText = escapeHtml(selectedText).replace(/\n/g, '<br>');
    el.reflectionHistoryView.innerHTML = `
      <p class="text-xs uppercase tracking-wide text-zinc-500">${escapeHtml(formatDisplayDate(selected))}</p>
      <p class="mt-2 leading-relaxed">${safeText}</p>
    `;
  } else {
    el.reflectionHistoryView.innerHTML = `
      <p class="text-xs uppercase tracking-wide text-zinc-500">${escapeHtml(formatDisplayDate(selected))}</p>
      <p class="mt-2 text-zinc-500">No reflection saved for this day.</p>
    `;
  }

  const reflectionDates = Object.keys(state.reflections)
    .filter((key) => typeof state.reflections[key] === 'string' && state.reflections[key].trim())
    .sort((a, b) => b.localeCompare(a));

  if (reflectionDates.length === 0) {
    el.reflectionHistoryList.innerHTML = `
      <div class="rounded-xl border border-dashed border-zinc-300 p-3 text-sm text-zinc-500 bg-white/70">
        No past reflections yet.
      </div>
    `;
    return;
  }

  el.reflectionHistoryList.innerHTML = reflectionDates
    .map((dateKey) => {
      const isActive = dateKey === selected;
      const preview = state.reflections[dateKey].trim().slice(0, 100);
      const suffix = state.reflections[dateKey].trim().length > 100 ? '...' : '';

      return `
        <button class="focus-ring w-full text-left rounded-xl border p-3 transition-colors ${isActive ? 'border-tide-500 bg-transparent' : 'border-zinc-200 bg-white hover:bg-zinc-50'}" data-reflection-date="${dateKey}">
          <p class="text-xs uppercase tracking-wide text-zinc-500">${escapeHtml(formatDisplayDate(dateKey))}</p>
          <p class="mt-1 text-sm text-zinc-700">${escapeHtml(preview)}${suffix}</p>
        </button>
      `;
    })
    .join('');
}

function setSelectedReflectionDate(dateKey) {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) {
    return;
  }

  const capped = normalized > todayKey() ? todayKey() : normalized;
  state.selectedReflectionDate = capped;
  saveState();
  renderReflectionHistory();
}

function shiftDateKey(dateKey, deltaDays) {
  const normalized = normalizeDateKey(dateKey) || todayKey();
  const d = new Date(`${normalized}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return dateKeyFromLocalDate(d);
}

function toggleHistoryPanel(panel, button) {
  if (!panel || !button) {
    return;
  }

  const isOpen = panel.classList.toggle('is-open');
  panel.setAttribute('aria-hidden', String(!isOpen));
  button.setAttribute('aria-expanded', String(isOpen));
  button.textContent = isOpen ? 'Hide history' : 'Show history';
}

function normalizeDateKey(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function renderPrompt() {
  el.promptBox.textContent = getCurrentPrompt();
}

function getCurrentPrompt() {
  const idx = state.selectedPromptIndex % APP_DAILY_PROMPTS.length;
  return APP_DAILY_PROMPTS[idx];
}

function hydratePromptResponseInput() {
  el.promptResponseInput.value = state.promptDraft || '';
}

function submitPromptResponse() {
  const response = el.promptResponseInput.value.trim();
  if (!response) {
    el.promptResponseStatus.textContent = 'Write a response before saving.';
    return;
  }

  state.promptResponses.unshift({
    id: crypto.randomUUID(),
    dateKey: todayKey(),
    prompt: getCurrentPrompt(),
    response,
    createdAt: new Date().toISOString()
  });

  if (state.promptResponses.length > 250) {
    state.promptResponses = state.promptResponses.slice(0, 250);
  }

  state.promptDraft = '';
  saveState();

  el.promptResponseInput.value = '';
  el.promptResponseStatus.textContent = 'Response saved to your prompt journal.';
  renderPromptResponseHistory();
}

function renderPromptResponseHistory() {
  if (state.promptResponses.length === 0) {
    el.promptResponseHistory.innerHTML = `
      <div class="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 bg-white/70">
        No prompt responses yet. Save your first one above.
      </div>
    `;
    return;
  }

  el.promptResponseHistory.innerHTML = state.promptResponses
    .map((entry) => {
      const safeResponse = escapeHtml(entry.response).replace(/\n/g, '<br>');
      return `
        <article class="rounded-xl bg-white border border-zinc-200 p-3">
          <p class="text-xs uppercase tracking-wide text-zinc-500">${escapeHtml(formatPromptResponseTimestamp(entry))}</p>
          <p class="mt-2 text-sm text-zinc-600">${escapeHtml(entry.prompt)}</p>
          <p class="mt-2 text-zinc-800 leading-relaxed">${safeResponse}</p>
        </article>
      `;
    })
    .join('');
}

function formatPromptResponseTimestamp(entry) {
  const fallbackDate = typeof entry.dateKey === 'string' ? `${entry.dateKey}T12:00:00` : null;
  const source = typeof entry.createdAt === 'string' ? entry.createdAt : fallbackDate;
  const parsed = source ? new Date(source) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return entry.dateKey || 'Unknown date';
  }

  return `${DATE_FORMATTER.format(parsed)} at ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function normalizePromptResponses(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
      dateKey: typeof entry.dateKey === 'string' ? entry.dateKey : todayKey(),
      prompt: typeof entry.prompt === 'string' ? entry.prompt : '',
      response: typeof entry.response === 'string' ? entry.response : '',
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null
    }))
    .filter((entry) => entry.prompt && entry.response);
}

function normalizeGoalCategory(value) {
  const category = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return GOAL_CATEGORY_IDS.includes(category) ? category : null;
}

function normalizeGoals(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((goal) => goal && typeof goal === 'object')
    .map((goal) => ({
      ...goal,
      category: normalizeGoalCategory(goal.category)
    }));
}

function rotateMotivation(instant) {
  const index = Math.floor(Math.random() * APP_MESSAGES.length);
  if (instant) {
    el.motivation.textContent = APP_MESSAGES[index];
    return;
  }

  el.motivation.animate(
    [
      { opacity: 1, transform: 'translateY(0px)' },
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 0, transform: 'translateY(-6px)' },
      { opacity: 1, transform: 'translateY(0px)' }
    ],
    { duration: 700, easing: 'ease-out' }
  );
  setTimeout(() => {
    el.motivation.textContent = APP_MESSAGES[index];
  }, 260);
}

function computeGoalStats(goal) {
  // History is keyed by YYYY-MM-DD, so lexical sort preserves calendar order.
  const entries = Object.entries(goal.completionHistory || {}).sort((a, b) => a[0].localeCompare(b[0]));

  let current = 0;
  let longest = 0;
  let running = 0;
  let doneCount = 0;
  let trackedCount = 0;

  for (const [, value] of entries) {
    if (value.status === 'done') {
      doneCount += 1;
      trackedCount += 1;
      running += 1;
      longest = Math.max(longest, running);
    } else if (value.status === 'missed') {
      trackedCount += 1;
      running = 0;
    }
  }

  const today = todayKey();
  const doneDates = entries.filter(([, v]) => v.status === 'done').map(([date]) => date);

  if (doneDates.length > 0) {
    const doneSet = new Set(doneDates);
    let cursor = today;
    if (!doneSet.has(cursor)) {
      cursor = previousDate(cursor);
    }

    while (doneSet.has(cursor)) {
      current += 1;
      cursor = previousDate(cursor);
    }
  }

  return {
    currentStreak: current,
    longestStreak: Math.max(goal.longestStreak || 0, longest),
    completionPct: trackedCount ? Math.round((doneCount / trackedCount) * 100) : 0,
    doneCount,
    trackedCount
  };
}

function previousDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return dateKeyFromLocalDate(d);
}

function markGoal(goalId, status) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) {
    return;
  }

  const key = todayKey();
  const existing = goal.completionHistory[key] || {};
  goal.completionHistory[key] = {
    status,
    note: existing.note || ''
  };

  const stats = computeGoalStats(goal);
  goal.streakCount = stats.currentStreak;
  goal.longestStreak = stats.longestStreak;

  saveState();
  renderAll();
}

function updateGoalDayNote(goalId, note) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) {
    return;
  }

  const key = todayKey();
  const existing = goal.completionHistory[key] || { status: null, note: '' };
  goal.completionHistory[key] = {
    status: existing.status,
    note
  };

  saveState();
}

function deleteGoal(goalId) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) {
    return;
  }

  const ok = confirm(`Delete "${goal.title}"? This cannot be undone.`);
  if (!ok) {
    return;
  }

  state.goals = state.goals.filter((g) => g.id !== goalId);
  expandedGoalIds.delete(goalId);
  saveState();
  renderAll();
}

function renameGoal(goalId) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) {
    return;
  }

  const nextTitle = prompt('Edit goal title:', goal.title);
  if (nextTitle == null) {
    return;
  }

  const cleanTitle = String(nextTitle).trim();
  if (!cleanTitle) {
    el.goalFeedback.textContent = 'Goal title cannot be empty.';
    return;
  }

  if (cleanTitle.toLowerCase() === goal.title.toLowerCase()) {
    el.goalFeedback.textContent = 'Goal title unchanged.';
    return;
  }

  const duplicate = state.goals.some((g) => g.id !== goalId && g.title.toLowerCase() === cleanTitle.toLowerCase());
  if (duplicate) {
    el.goalFeedback.textContent = 'Another goal already has that title.';
    return;
  }

  goal.title = cleanTitle;
  el.goalFeedback.textContent = 'Goal title updated.';
  saveState();
  renderAll();
}

function renderStats() {
  const key = todayKey();
  const activeGoals = state.goals.length;

  let completedToday = 0;
  let totalDone = 0;
  let totalTracked = 0;
  let bestStreak = 0;

  for (const goal of state.goals) {
    const stats = computeGoalStats(goal);
    totalDone += stats.doneCount;
    totalTracked += stats.trackedCount;
    bestStreak = Math.max(bestStreak, stats.longestStreak);

    if (goal.completionHistory[key]?.status === 'done') {
      completedToday += 1;
    }
  }

  const consistency = totalTracked ? Math.round((totalDone / totalTracked) * 100) : 0;

  const cards = [
    { label: 'Done today', value: `${completedToday}/${activeGoals || 0}` },
    { label: 'Consistency', value: `${consistency}%` },
    { label: 'Best streak', value: `${bestStreak} days` },
    { label: 'Active goals', value: `${activeGoals}` }
  ];

  el.statsGrid.innerHTML = cards
    .map(
      (item, index) => `
        <div class="glass rounded-2xl p-4 sm:p-5 card-enter" style="animation-delay: ${index * 50}ms">
          <p class="text-xs uppercase tracking-wider text-zinc-500">${item.label}</p>
          <p class="mt-2 text-2xl sm:text-3xl font-bold text-teal-700 stat-number" data-target="${numberPart(item.value)}">${item.value}</p>
        </div>
      `
    )
    .join('');

  animateStatNumbers();
}

function numberPart(value) {
  const parsed = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function animateStatNumbers() {
  const nodes = document.querySelectorAll('.stat-number');
  for (const node of nodes) {
    const text = node.textContent || '';
    // Animate only simple numeric formats to avoid mutating values like 1/3.
    const canAnimate = /^\d+(%| days)?$/.test(text.trim());
    if (!canAnimate) {
      continue;
    }

    const target = Number(node.dataset.target || 0);
    if (!target) {
      continue;
    }

    const suffix = text.replace(/^\d+/, '');
    const start = performance.now();
    const duration = 500;

    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(target * eased);
      node.textContent = `${current}${suffix}`;
      if (t < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }
}

function renderGoals() {
  if (state.goals.length === 0) {
    el.goalsList.innerHTML = `
      <div class="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 bg-white/70">
        <p class="text-xl text-zinc-700 mb-2">No goals yet.</p>
        <p>Start with one promise you can keep today.</p>
      </div>
    `;
    el.goalsEmptyLabel.textContent = 'Add your first goal';
    return;
  }

  el.goalsEmptyLabel.textContent = `${state.goals.length} active`;
  const key = todayKey();

  el.goalsList.innerHTML = state.goals
    .map((goal, idx) => {
      const isDark = state.theme === 'dark';
      const stats = computeGoalStats(goal);
      const isExpanded = expandedGoalIds.has(goal.id);
      goal.streakCount = stats.currentStreak;
      goal.longestStreak = stats.longestStreak;
      const status = goal.completionHistory[key]?.status;
      const statusMeta =
        status === 'done'
          ? {
              label: 'Done',
              classes: isDark ? 'bg-transparent text-teal-300 border-teal-300' : 'bg-transparent text-teal-800 border-teal-300'
            }
          : status === 'missed'
            ? {
                label: 'Missed',
                classes: isDark ? 'bg-transparent text-red-300 border-red-300' : 'bg-transparent text-red-700 border-red-300'
              }
            : null;
      const note = goal.completionHistory[key]?.note || '';
      const miniHistory = recentHistory(goal, 14);

      return `
        <section class="rounded-2xl bg-white border border-zinc-200 p-2 sm:p-4 card-enter shadow-sm" style="animation-delay:${idx * 40}ms">
          <button class="focus-ring toggle-goal w-full rounded-xl p-2 sm:p-4 text-left hover:bg-zinc-50 transition-colors" data-goal-id="${goal.id}" aria-expanded="${isExpanded}" aria-controls="goal-panel-${goal.id}">
            <div class="flex gap-3 items-start justify-between">
              <div>
                <h3 class="text-xl sm:text-2xl font-semibold text-zinc-900">${escapeHtml(goal.title)}</h3>
                <p class="text-xs text-zinc-500 mt-1">Created ${formatDisplayDate(goal.createdDate)}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs uppercase tracking-wide text-zinc-500">${stats.completionPct}% done</p>
                <p class="mt-1 text-sm font-semibold text-teal-700">Streak: ${goal.streakCount} day${goal.streakCount === 1 ? '' : 's'}<span class="hidden sm:inline"> in a row</span></p>
              </div>
            </div>
            ${statusMeta ? `<div class="mt-2"><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusMeta.classes}">${statusMeta.label}</span></div>` : ''}
          </button>

          ${!status ? `
          <div class="${isExpanded ? 'hidden' : 'mt-2 px-2 sm:px-4 pb-2'}">
            <div class="flex flex-wrap gap-2">
              <button class="focus-ring mark-btn inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all bg-transparent border-teal-300 text-teal-700 hover:border-teal-500 hover:text-teal-800" data-goal-id="${goal.id}" data-status="done">
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 8.5 6.2 11.5 13 4.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Done</span>
              </button>
              <button class="focus-ring mark-btn inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all bg-transparent border-red-300 text-red-700 hover:border-red-500 hover:text-red-800" data-goal-id="${goal.id}" data-status="missed">
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M4 4 12 12" stroke-linecap="round"/>
                  <path d="M12 4 4 12" stroke-linecap="round"/>
                </svg>
                <span>Missed</span>
              </button>
            </div>
          </div>
          ` : ''}

          <div id="goal-panel-${goal.id}" class="${isExpanded ? 'mt-4' : 'hidden'}">
            <div class="flex justify-end gap-1">
              <button class="focus-ring rename-goal inline-flex items-center gap-1.5 text-zinc-500 hover:text-tide-700 transition-colors px-2 py-1" data-goal-id="${goal.id}" aria-label="Rename goal ${escapeHtml(goal.title)}">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M4 20h4l9.7-9.7a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4Z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Rename</span>
              </button>
              <button class="focus-ring delete-goal inline-flex items-center gap-1.5 text-zinc-500 hover:text-red-600 transition-colors px-2 py-1" data-goal-id="${goal.id}" aria-label="Delete goal ${escapeHtml(goal.title)}">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M4.5 7.5h15" stroke-linecap="round"/>
                  <path d="M9.5 7.5v-1a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v1" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M7 7.5l.8 11a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9l.8-11" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Delete</span>
              </button>
            </div>

            <div class="grid md:grid-cols-3 gap-3 mt-2">
              <div class="rounded-xl bg-teal-50 p-3 border border-teal-200">
                <p class="text-xs uppercase tracking-wide text-zinc-600">Current streak</p>
                <p class="text-2xl font-bold text-teal-700 streak-value" data-target="${goal.streakCount}">${goal.streakCount}</p>
              </div>
              <div class="rounded-xl bg-teal-50 p-3 border border-teal-200">
                <p class="text-xs uppercase tracking-wide text-zinc-600">Longest</p>
                <p class="text-2xl font-bold text-teal-700">${goal.longestStreak}</p>
              </div>
              <div class="rounded-xl bg-teal-50 p-3 border border-teal-200">
                <p class="text-xs uppercase tracking-wide text-zinc-600">Completion</p>
                <p class="text-2xl font-bold text-teal-700">${stats.completionPct}%</p>
              </div>
            </div>

            <div class="mt-4">
              <div class="h-2 rounded-full bg-zinc-200 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.completionPct}" aria-label="Goal completion percentage">
                <div class="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500" style="width:${stats.completionPct}%"></div>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button class="focus-ring mark-btn rounded-lg px-4 py-2 text-sm font-semibold transition-all ${status === 'done' ? 'bg-teal-600 text-white animate-pulseSoft' : 'bg-zinc-100 hover:bg-teal-100 text-zinc-700'}" data-goal-id="${goal.id}" data-status="done">
                Done ✅
              </button>
              <button class="focus-ring mark-btn rounded-lg px-4 py-2 text-sm font-semibold transition-all ${status === 'missed' ? 'bg-red-500 text-white' : 'bg-zinc-100 hover:bg-red-100 text-zinc-700'}" data-goal-id="${goal.id}" data-status="missed">
                Missed ✕
              </button>
            </div>

            <label class="block mt-4 text-sm text-zinc-600" for="note-${goal.id}">Today note (optional)</label>
            <textarea id="note-${goal.id}" data-goal-id="${goal.id}" class="goal-note focus-ring mt-2 w-full rounded-xl bg-white border border-zinc-300 p-3 text-zinc-900 placeholder-zinc-400" rows="2" placeholder="A quick reflection for this goal...">${escapeHtml(note)}</textarea>

            <div class="mt-4 flex items-center gap-1.5" aria-label="Recent history">
              ${miniHistory
                .map((entry) => {
                  const color =
                    entry.status === 'done'
                      ? 'bg-teal-500'
                      : entry.status === 'missed'
                        ? 'bg-red-500'
                        : 'bg-zinc-300';
                  return `<span class="mini-cell w-3 h-3 ${color}" title="${entry.date}: ${entry.status || 'no data'}"></span>`;
                })
                .join('')}
            </div>
          </div>
        </section>
      `;
    })
    .join('');

  wireGoalActions();
  animateStreaks();
  saveState();
}

function animateStreaks() {
  const nodes = document.querySelectorAll('.streak-value');
  for (const node of nodes) {
    const target = Number(node.dataset.target || 0);
    const start = performance.now();
    const duration = 420;

    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const value = Math.round(target * (1 - Math.pow(1 - t, 3)));
      node.textContent = String(value);
      if (t < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }
}

function wireGoalActions() {
  document.querySelectorAll('.toggle-goal').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.goalId;
      if (!goalId) {
        return;
      }

      if (expandedGoalIds.has(goalId)) {
        expandedGoalIds.delete(goalId);
      } else {
        expandedGoalIds.add(goalId);
      }

      renderGoals();
    });
  });

  document.querySelectorAll('.mark-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      markGoal(btn.dataset.goalId, btn.dataset.status);
    });
  });

  document.querySelectorAll('.delete-goal').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteGoal(btn.dataset.goalId);
    });
  });

  document.querySelectorAll('.rename-goal').forEach((btn) => {
    btn.addEventListener('click', () => {
      renameGoal(btn.dataset.goalId);
    });
  });

  document.querySelectorAll('.goal-note').forEach((input) => {
    input.addEventListener('input', () => {
      updateGoalDayNote(input.dataset.goalId, input.value);
    });
  });
}

function recentHistory(goal, days) {
  const list = [];
  const today = new Date(`${todayKey()}T12:00:00`);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKeyFromLocalDate(d);
    list.push({
      date: key,
      status: goal.completionHistory[key]?.status || null
    });
  }

  return list;
}

function renderConsistency() {
  const settings = getHeatmapSettings();
  if (el.heatmapRangeLabel) {
    el.heatmapRangeLabel.textContent = `Last ${settings.days} days`;
  }

  renderHeatmap(settings.days, settings.metric);
  renderWeeklyScorecard();
  renderTrendSparkline();
  renderDayOfWeekPerformance();
  renderGoalReliabilityRanking();
  renderMissPatternInsights();
  renderStreakTimeline();
  renderConsistencyMilestones();
  renderConsistencyProjection();
  renderLast14Table();
}

function getHeatmapSettings() {
  const days = Number.parseInt(el.heatmapPeriod?.value || '140', 10);
  const metric = el.heatmapMetric?.value === 'strict' ? 'strict' : 'inclusive';

  return {
    days: Number.isFinite(days) ? days : 140,
    metric
  };
}

function renderHeatmap(days, metric) {
  const points = aggregateDailyOutcomes(days, metric);
  const today = todayKey();

  if (!el.heatmap) {
    return;
  }

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const columnCount = isMobile ? 14 : 20;
  el.heatmap.style.gridTemplateColumns = `repeat(${columnCount}, max-content)`;

  el.heatmap.innerHTML = points
    .map((point) => {
      const colorClass =
        point.type === 'done'
          ? 'bg-teal-500'
          : point.type === 'partial'
            ? 'bg-amber-500'
          : point.type === 'missed'
            ? 'bg-red-500'
            : 'bg-zinc-300';
      const textColorClass = point.type === 'none' ? 'text-zinc-900' : 'text-white';
      const todayRing = point.date === today ? 'ring-1 ring-inset ring-teal-300' : '';
      const longDate = formatLongDateWithOrdinal(point.date);

      return `<button class="heat-cell w-4 h-4 sm:w-6 sm:h-6 ${colorClass} ${textColorClass} ${todayRing} focus-ring inline-flex items-center justify-center text-[9px] sm:text-[10px] font-semibold" title="${longDate}: ${point.label}" aria-label="${longDate} ${point.label}">${point.dayNumber}</button>`;
    })
    .join('');
}

function aggregateDailyOutcomes(days, metric = 'inclusive') {
  const daily = collectDailyMetrics(days);
  return daily.map((entry) => {
    let type = entry.type;
    let label = entry.label;

    if (metric === 'strict' && entry.type === 'partial') {
      type = 'missed';
      label = `Missed (${entry.missed} missed, ${entry.done} done)`;
    }

    return {
      date: entry.date,
      dayNumber: entry.dayNumber,
      done: entry.done,
      missed: entry.missed,
      tracked: entry.tracked,
      completionPct: entry.completionPct,
      type,
      label
    };
  });
}

function collectDailyMetrics(days) {
  const today = new Date(`${todayKey()}T12:00:00`);
  const points = [];

  for (let i = 0; i < days; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKeyFromLocalDate(d);
    const dayNumber = d.getDate();

    let done = 0;
    let missed = 0;

    for (const goal of state.goals) {
      const status = goal.completionHistory[key]?.status;
      if (status === 'done') {
        done += 1;
      } else if (status === 'missed') {
        missed += 1;
      }
    }

    let type = 'none';
    let label = 'No data';
    if (done > 0 && missed > 0) {
      type = 'partial';
      label = `Partial (${done} done, ${missed} missed)`;
    } else if (done > 0) {
      type = 'done';
      label = `Done (${done})`;
    } else if (missed > 0) {
      type = 'missed';
      label = `Missed (${missed})`;
    }

    const tracked = done + missed;
    const completionPct = tracked ? Math.round((done / tracked) * 100) : 0;

    points.push({ date: key, dayNumber, done, missed, tracked, completionPct, type, label });
  }

  return points;
}

function renderWeeklyScorecard() {
  if (!el.consistencyWeeklyScorecard) {
    return;
  }

  const week = collectDailyMetrics(7);
  const done = week.reduce((sum, day) => sum + day.done, 0);
  const missed = week.reduce((sum, day) => sum + day.missed, 0);
  const tracked = done + missed;
  const completionRate = tracked ? Math.round((done / tracked) * 100) : 0;
  const bestDay =
    week
      .filter((day) => day.tracked > 0)
      .sort((a, b) => b.completionPct - a.completionPct || b.done - a.done)[0] || null;

  const cards = [
    { label: 'Done in last week', value: String(done) },
    { label: 'Missed in last week', value: String(missed) },
    { label: 'Completion rate', value: `${completionRate}%` },
    {
      label: 'Best day',
      value: bestDay ? WEEKDAY_FORMATTER.format(new Date(`${bestDay.date}T12:00:00`)) : 'No data'
    }
  ];

  el.consistencyWeeklyScorecard.innerHTML = cards
    .map(
      (card) => `
        <div class="rounded-xl border border-zinc-200 bg-transparent p-3">
          <p class="text-xs uppercase tracking-wide text-zinc-500">${escapeHtml(card.label)}</p>
          <p class="mt-1 text-xl font-semibold text-zinc-900">${escapeHtml(card.value)}</p>
        </div>
      `
    )
    .join('');
}

function renderTrendSparkline() {
  if (!el.consistencySparkline) {
    return;
  }

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const trendDays = isMobile ? 14 : 30;
  const points = collectDailyMetrics(trendDays).reverse();
  const bars = points
    .map((point) => {
      const height = Math.max(8, point.completionPct);
      const colorClass =
        point.completionPct >= 80 ? 'bg-teal-500' : point.completionPct >= 50 ? 'bg-amber-500' : point.tracked > 0 ? 'bg-rose-500' : 'bg-zinc-300';

      return `<span class="flex-1 rounded-sm ${colorClass}" style="height:${height}%" title="${formatLongDateWithOrdinal(point.date)}: ${point.completionPct}% (${point.done} done, ${point.missed} missed)"></span>`;
    })
    .join('');

  el.consistencySparkline.innerHTML = bars || '<p class="text-sm text-zinc-500">No tracked days yet.</p>';
}

function renderDayOfWeekPerformance() {
  if (!el.consistencyDowPerformance) {
    return;
  }

  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
  const weekdayData = new Map(weekdayOrder.map((d) => [d, { done: 0, missed: 0 }]));

  for (const point of collectDailyMetrics(140)) {
    const weekday = new Date(`${point.date}T12:00:00`).getDay();
    const bucket = weekdayData.get(weekday);
    if (!bucket) {
      continue;
    }

    bucket.done += point.done;
    bucket.missed += point.missed;
  }

  el.consistencyDowPerformance.innerHTML = weekdayOrder
    .map((weekday) => {
      const sampleDate = new Date(`2024-01-${String(weekday === 0 ? 7 : weekday).padStart(2, '0')}T12:00:00`);
      const label = WEEKDAY_SHORT_FORMATTER.format(sampleDate);
      const bucket = weekdayData.get(weekday) || { done: 0, missed: 0 };
      const tracked = bucket.done + bucket.missed;
      const rate = tracked ? Math.round((bucket.done / tracked) * 100) : 0;

      return `
        <div class="rounded-lg border border-zinc-200 px-2 py-2">
          <p class="text-[11px] uppercase tracking-wide text-zinc-500">${label}</p>
          <p class="text-sm font-semibold text-zinc-800 mt-1">${rate}%</p>
          <div class="mt-1 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
            <div class="h-full bg-teal-500" style="width:${rate}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderGoalReliabilityRanking() {
  if (!el.consistencyReliability) {
    return;
  }

  if (state.goals.length === 0) {
    el.consistencyReliability.innerHTML = '<p class="text-sm text-zinc-500">Add goals to rank reliability.</p>';
    return;
  }

  const points = collectDailyMetrics(30);
  const dateSet = new Set(points.map((point) => point.date));

  const ranked = state.goals
    .map((goal) => {
      let done = 0;
      let missed = 0;

      for (const [date, value] of Object.entries(goal.completionHistory || {})) {
        if (!dateSet.has(date)) {
          continue;
        }

        if (value.status === 'done') {
          done += 1;
        } else if (value.status === 'missed') {
          missed += 1;
        }
      }

      const tracked = done + missed;
      const reliability = tracked ? Math.round((done / tracked) * 100) : 0;

      return { goal, done, missed, tracked, reliability };
    })
    .sort((a, b) => b.reliability - a.reliability || b.tracked - a.tracked || a.goal.title.localeCompare(b.goal.title));

  el.consistencyReliability.innerHTML = ranked
    .map(
      (entry, index) => `
        <div class="rounded-lg border border-zinc-200 p-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-zinc-900">${index + 1}. ${escapeHtml(entry.goal.title)}</p>
            <p class="text-sm font-semibold text-teal-700">${entry.reliability}%</p>
          </div>
          <p class="mt-1 text-xs text-zinc-500">${entry.done} done, ${entry.missed} missed</p>
        </div>
      `
    )
    .join('');
}

function renderMissPatternInsights() {
  if (!el.consistencyInsights) {
    return;
  }

  const isDark = state.theme === 'dark';

  const recent = collectDailyMetrics(90);
  const weekdayMisses = new Map();
  const weekdayRates = new Map();

  for (const day of recent) {
    const weekday = new Date(`${day.date}T12:00:00`).getDay();
    weekdayMisses.set(weekday, (weekdayMisses.get(weekday) || 0) + day.missed);

    const stats = weekdayRates.get(weekday) || { done: 0, missed: 0 };
    stats.done += day.done;
    stats.missed += day.missed;
    weekdayRates.set(weekday, stats);
  }

  const missiest = [...weekdayMisses.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  const strongest = [...weekdayRates.entries()]
    .map(([weekday, stats]) => {
      const tracked = stats.done + stats.missed;
      const rate = tracked ? stats.done / tracked : 0;
      return { weekday, rate };
    })
    .sort((a, b) => b.rate - a.rate)[0] || null;

  const recoveryGaps = [];
  for (const goal of state.goals) {
    const entries = Object.entries(goal.completionHistory || {})
      .filter(([, value]) => value.status === 'done' || value.status === 'missed')
      .sort((a, b) => a[0].localeCompare(b[0]));

    for (let i = 0; i < entries.length; i += 1) {
      if (entries[i][1].status !== 'missed') {
        continue;
      }

      for (let j = i + 1; j < entries.length; j += 1) {
        if (entries[j][1].status !== 'done') {
          continue;
        }

        const start = new Date(`${entries[i][0]}T12:00:00`);
        const end = new Date(`${entries[j][0]}T12:00:00`);
        const gap = Math.max(0, Math.round((end - start) / 86400000));
        recoveryGaps.push(gap);
        break;
      }
    }
  }

  const avgRecovery =
    recoveryGaps.length > 0 ? Math.max(1, Math.round(recoveryGaps.reduce((sum, gap) => sum + gap, 0) / recoveryGaps.length)) : null;

  const chips = [];
  if (missiest && missiest[1] > 0) {
    chips.push(`Most misses happen on ${WEEKDAY_FORMATTER.format(new Date(`2024-01-${String(missiest[0] === 0 ? 7 : missiest[0]).padStart(2, '0')}T12:00:00`))}.`);
  }

  if (strongest && strongest.rate > 0) {
    chips.push(
      `Strongest day is ${WEEKDAY_FORMATTER.format(new Date(`2024-01-${String(strongest.weekday === 0 ? 7 : strongest.weekday).padStart(2, '0')}T12:00:00`))} (${Math.round(strongest.rate * 100)}% completion).`
    );
  }

  if (avgRecovery) {
    chips.push(`Average recovery after a miss is ${avgRecovery} day${avgRecovery === 1 ? '' : 's'}.`);
  }

  if (chips.length === 0) {
    chips.push('Track a few more days to unlock pattern insights.');
  }

  el.consistencyInsights.innerHTML = chips
    .map((chip) => {
      const chipClasses = isDark
        ? 'border-teal-300/60 bg-transparent text-teal-200'
        : 'border-teal-200 bg-teal-50 text-teal-800';
      return `<span class="inline-flex max-w-full whitespace-normal break-words rounded-2xl border px-3 py-1.5 text-sm leading-relaxed ${chipClasses}">${escapeHtml(chip)}</span>`;
    })
    .join('');
}

function renderStreakTimeline() {
  if (!el.consistencyStreakTimeline) {
    return;
  }

  if (state.goals.length === 0) {
    el.consistencyStreakTimeline.innerHTML = '<p class="text-sm text-zinc-500">No goals yet.</p>';
    return;
  }

  const topGoals = [...state.goals]
    .map((goal) => ({ goal, stats: computeGoalStats(goal) }))
    .sort((a, b) => b.stats.longestStreak - a.stats.longestStreak)
    .slice(0, 3);

  el.consistencyStreakTimeline.innerHTML = topGoals
    .map(({ goal }) => {
      const events = buildStreakEvents(goal).slice(0, 3);
      const eventHtml =
        events.length === 0
          ? '<p class="text-xs text-zinc-500">No streak events yet.</p>'
          : events
              .map(
                (event) => `
                  <div class="rounded-lg border border-zinc-200 p-2">
                    <p class="text-xs text-zinc-500">${escapeHtml(formatDisplayDate(event.start))} to ${escapeHtml(formatDisplayDate(event.end))}</p>
                    <p class="text-sm text-zinc-800 font-medium">${event.length} day streak</p>
                  </div>
                `
              )
              .join('');

      return `
        <div class="rounded-xl border border-zinc-200 bg-transparent p-3">
          <p class="text-sm font-semibold text-zinc-900 mb-2">${escapeHtml(goal.title)}</p>
          <div class="space-y-2">${eventHtml}</div>
        </div>
      `;
    })
    .join('');
}

function buildStreakEvents(goal) {
  const entries = Object.entries(goal.completionHistory || {})
    .filter(([, value]) => value.status === 'done' || value.status === 'missed')
    .sort((a, b) => a[0].localeCompare(b[0]));

  const events = [];
  let runStart = null;
  let runLength = 0;
  let lastDoneDate = null;

  for (const [date, value] of entries) {
    if (value.status === 'done') {
      if (!runStart) {
        runStart = date;
        runLength = 1;
      } else {
        runLength += 1;
      }
      lastDoneDate = date;
      continue;
    }

    if (runStart) {
      events.push({ start: runStart, end: lastDoneDate || runStart, length: runLength });
      runStart = null;
      runLength = 0;
      lastDoneDate = null;
    }
  }

  if (runStart) {
    events.push({ start: runStart, end: lastDoneDate || runStart, length: runLength });
  }

  return events.sort((a, b) => b.end.localeCompare(a.end));
}

function renderConsistencyMilestones() {
  if (!el.consistencyMilestones) {
    return;
  }

  const isDark = state.theme === 'dark';

  const week = collectDailyMetrics(7);
  const weekDone = week.reduce((sum, day) => sum + day.done, 0);
  const weekMissed = week.reduce((sum, day) => sum + day.missed, 0);
  const weekTracked = weekDone + weekMissed;
  const weekRate = weekTracked ? Math.round((weekDone / weekTracked) * 100) : 0;
  const bestStreak = state.goals.reduce((max, goal) => Math.max(max, computeGoalStats(goal).longestStreak), 0);

  const milestones = [
    { label: '7-day completion above 80%', achieved: weekRate >= 80, meta: `${weekRate}% this week` },
    { label: 'Reached a 7-day streak', achieved: bestStreak >= 7, meta: `Best: ${bestStreak} days` },
    { label: 'Reached a 14-day streak', achieved: bestStreak >= 14, meta: `Best: ${bestStreak} days` },
    { label: 'Reached a 30-day streak', achieved: bestStreak >= 30, meta: `Best: ${bestStreak} days` }
  ];

  el.consistencyMilestones.innerHTML = milestones
    .map((milestone) => {
      const containerClasses = milestone.achieved
        ? isDark
          ? 'border-teal-300/60 bg-transparent'
          : 'border-teal-300 bg-teal-50'
        : 'border-zinc-200';
      const titleClasses = milestone.achieved
        ? isDark
          ? 'text-teal-200'
          : 'text-teal-800'
        : 'text-zinc-700';

      return `
        <div class="rounded-lg border ${containerClasses} px-3 py-2">
          <p class="text-sm font-medium ${titleClasses}">${milestone.achieved ? 'Completed' : 'In progress'}: ${escapeHtml(milestone.label)}</p>
          <p class="text-xs text-zinc-500 mt-1">${escapeHtml(milestone.meta)}</p>
        </div>
      `;
    })
    .join('');
}

function renderConsistencyProjection() {
  if (!el.consistencyProjection) {
    return;
  }

  const today = new Date(`${todayKey()}T12:00:00`);
  const monthStart = new Date(today);
  monthStart.setDate(1);

  const daysElapsed = today.getDate();
  let done = 0;
  let missed = 0;

  for (let i = 0; i < daysElapsed; i += 1) {
    const d = new Date(monthStart);
    d.setDate(monthStart.getDate() + i);
    const key = dateKeyFromLocalDate(d);

    for (const goal of state.goals) {
      const status = goal.completionHistory[key]?.status;
      if (status === 'done') {
        done += 1;
      } else if (status === 'missed') {
        missed += 1;
      }
    }
  }

  const tracked = done + missed;
  const rate = tracked ? Math.round((done / tracked) * 100) : 0;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  el.consistencyProjection.textContent =
    tracked === 0
      ? 'Start tracking this month to unlock a projection.'
      : `At current pace, expected completion this month is ${rate}% across about ${daysInMonth} days of tracking.`;
}

function renderLast14Table() {
  if (!el.consistencyLast14Table) {
    return;
  }

  const rows = collectDailyMetrics(14);

  el.consistencyLast14Table.innerHTML = rows
    .map((day) => {
      const dominant =
        day.done > day.missed ? 'Done' : day.missed > day.done ? 'Missed' : day.done > 0 && day.missed > 0 ? 'Partial' : 'No data';

      return `
        <tr class="border-b border-zinc-100">
          <td class="py-2 pr-2 sm:pr-3 text-zinc-700">${escapeHtml(formatShortDate(day.date))}</td>
          <td class="py-2 pr-2 sm:pr-3 text-zinc-800 font-medium">${day.done}</td>
          <td class="py-2 pr-2 sm:pr-3 text-zinc-800 font-medium">${day.missed}</td>
          <td class="hidden sm:table-cell py-2 text-zinc-600">${dominant}</td>
        </tr>
      `;
    })
    .join('');
}

function maybeCelebrate() {
  const key = todayKey();
  if (state.goals.length === 0) {
    return;
  }

  const allDone = state.goals.every((goal) => goal.completionHistory[key]?.status === 'done');
  if (!allDone || state.lastCelebrationDate === key) {
    return;
  }

  state.lastCelebrationDate = key;
  saveState();
  launchConfetti();
}

function launchConfetti() {
  const colors = ['#fb923c', '#f59e0b', '#34d399', '#ef4444', '#fde68a'];
  const pieces = 100;

  for (let i = 0; i < pieces; i += 1) {
    const bit = document.createElement('span');
    const size = Math.random() * 8 + 4;
    bit.style.position = 'absolute';
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.top = '-10vh';
    bit.style.width = `${size}px`;
    bit.style.height = `${size * 0.65}px`;
    bit.style.background = colors[Math.floor(Math.random() * colors.length)];
    bit.style.opacity = '0';
    bit.style.transform = `rotate(${Math.random() * 360}deg)`;
    bit.style.animation = `confettiFall ${Math.random() * 1.8 + 2.2}s ease-out forwards`;
    bit.style.animationDelay = `${Math.random() * 0.7}s`;
    bit.style.borderRadius = '3px';

    el.confettiLayer.appendChild(bit);
    setTimeout(() => bit.remove(), 4500);
  }
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
