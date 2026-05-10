import { createElements } from './dom/elements.js';
import {
  dateKeyFromLocalDate,
  formatDisplayDate,
  formatLongDateWithOrdinal,
  formatShortDate,
  normalizeDateKey,
  previousDate,
  shiftDateKey,
  todayKey
} from './utils/date.js';
import { escapeHtml } from './utils/html.js';
import { loadStateFromStorage, saveStateToStorage } from './state/persistence.js';
import { normalizePage as normalizePageValue, setActivePage as setActivePageFeature } from './features/navigation.js';
import { applyTheme as applyThemeFeature, normalizeTheme as normalizeThemeValue } from './features/theme.js';
import {
  computeReflectionStreakFeature,
  hydrateReflectionFeature,
  renderReflectionHistoryFeature,
  setSelectedReflectionDateFeature
} from './features/reflection.js';
import {
  computeGoalStatsFeature,
  createGoalFeature,
  deleteGoalFeature,
  markGoalFeature,
  normalizeGoalCategoryFeature,
  normalizeGoalsFeature,
  recentHistoryFeature,
  renameGoalFeature,
  updateGoalDayNoteFeature
} from './features/goals.js';
import {
  animateStreaksFeature,
  renderGoalsFeature,
  wireGoalActionsFeature
} from './features/goals-ui.js';
import { aggregateDailyOutcomesFeature, renderConsistencyFeature } from './features/consistency.js';

const STORAGE_KEY = 'accountability-app';
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

const state = loadStateFromStorage({
  storageKey: STORAGE_KEY,
  todayKey,
  normalizeGoals,
  normalizePromptResponses,
  normalizePage,
  normalizeTheme,
  normalizeDateKey
});

const el = createElements();

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

function saveState() {
  saveStateToStorage(STORAGE_KEY, state);
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
  if (el.goalCategory) {
    el.goalCategory.value = '';
  }
  el.goalFeedback.textContent = 'Goal added. Keep it simple and keep it honest.';
  renderAll();
}

function createGoal(title, category) {
  const added = createGoalFeature(title, category, {
    state,
    todayKey,
    normalizeGoalCategory
  });

  if (added) {
    saveState();
  }

  return added;
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

  const weekPoints = aggregateDailyOutcomesFeature(7, {
    state,
    todayKey,
    dateKeyFromLocalDate
  }).reverse();
  el.dashboardWeekTrend.innerHTML = `
    <p class="text-xs uppercase tracking-wide text-zinc-500 mb-2">This Week's Trend</p>
    <div class="grid grid-cols-7 gap-2">
      ${weekPoints
        .map((point) => {
          const dayLabel = new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
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
  return computeReflectionStreakFeature(state.reflections, startDateKey, previousDate);
}

function setActivePage(page, shouldScroll) {
  setActivePageFeature(page, shouldScroll, {
    state,
    el,
    saveState,
    pageIds: PAGE_IDS,
    updateDesktopFeatureLayout
  });
}

function updateDesktopFeatureLayout(page) {
  if (!el.featureGrid || !el.featureMain || !el.featureAside) {
    return;
  }

  const isReflection = page === 'reflection';

  el.featureGrid.classList.toggle('lg:grid-cols-2', isReflection);
  el.featureGrid.classList.toggle('lg:grid-cols-3', !isReflection);

  el.featureMain.classList.toggle('lg:col-span-1', isReflection);
  el.featureMain.classList.toggle('lg:col-span-2', !isReflection);

  el.featureAside.classList.toggle('lg:col-span-1', isReflection);

  el.featureAside.classList.remove('lg:col-span-3');
}

function normalizePage(value) {
  return normalizePageValue(value, PAGE_IDS);
}

function normalizeTheme(value) {
  return normalizeThemeValue(value, THEME_IDS);
}

function applyTheme(theme) {
  applyThemeFeature(theme, {
    state,
    themeIds: THEME_IDS,
    sunIconSvg: SUN_ICON_SVG,
    moonIconSvg: MOON_ICON_SVG,
    toggleBtn: el.themeToggleBtn,
    toggleIcon: el.themeToggleIcon
  });
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
  hydrateReflectionFeature({ state, el, todayKey });
}

function renderReflectionHistory() {
  renderReflectionHistoryFeature({
    state,
    el,
    todayKey,
    normalizeDateKey,
    escapeHtml,
    formatDisplayDate
  });
}

function setSelectedReflectionDate(dateKey) {
  setSelectedReflectionDateFeature(dateKey, {
    state,
    saveState,
    renderReflectionHistory,
    todayKey,
    normalizeDateKey
  });
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

  const longDate = parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  return `${longDate} at ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
  return normalizeGoalCategoryFeature(value, GOAL_CATEGORY_IDS);
}

function normalizeGoals(value) {
  return normalizeGoalsFeature(value, GOAL_CATEGORY_IDS);
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
  return computeGoalStatsFeature(goal, { todayKey, previousDate });
}



function markGoal(goalId, status) {
  markGoalFeature(goalId, status, {
    state,
    todayKey,
    computeGoalStats,
    saveState,
    renderAll
  });
}

function updateGoalDayNote(goalId, note) {
  updateGoalDayNoteFeature(goalId, note, { state, todayKey, saveState });
}

function deleteGoal(goalId) {
  deleteGoalFeature(goalId, {
    state,
    expandedGoalIds,
    saveState,
    renderAll
  });
}

function renameGoal(goalId) {
  renameGoalFeature(goalId, {
    state,
    el,
    saveState,
    renderAll
  });
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
  renderGoalsFeature({
    state,
    el,
    expandedGoalIds,
    todayKey,
    computeGoalStats,
    recentHistory,
    escapeHtml,
    formatDisplayDate,
    wireGoalActions,
    animateStreaks,
    saveState
  });
}

function animateStreaks() {
  animateStreaksFeature();
}

function wireGoalActions() {
  wireGoalActionsFeature({
    onToggleGoal: (goalId) => {
      if (expandedGoalIds.has(goalId)) {
        expandedGoalIds.delete(goalId);
      } else {
        expandedGoalIds.add(goalId);
      }

      renderGoals();
    },
    onMarkGoal: (goalId, status) => {
      markGoal(goalId, status);
    },
    onDeleteGoal: (goalId) => {
      deleteGoal(goalId);
    },
    onRenameGoal: (goalId) => {
      renameGoal(goalId);
    },
    onGoalNoteInput: (goalId, note) => {
      updateGoalDayNote(goalId, note);
    }
  });
}

function recentHistory(goal, days) {
  return recentHistoryFeature(goal, days, { todayKey, dateKeyFromLocalDate });
}

function renderConsistency() {
  renderConsistencyFeature({
    state,
    el,
    todayKey,
    dateKeyFromLocalDate,
    formatLongDateWithOrdinal,
    formatDisplayDate,
    formatShortDate,
    escapeHtml,
    computeGoalStats
  });
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


