export function normalizeGoalCategoryFeature(value, categoryIds) {
  const category = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return categoryIds.includes(category) ? category : null;
}

export function normalizeGoalsFeature(value, categoryIds) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((goal) => goal && typeof goal === 'object')
    .map((goal) => ({
      ...goal,
      category: normalizeGoalCategoryFeature(goal.category, categoryIds)
    }));
}

export function createGoalFeature(title, category, {
  state,
  todayKey,
  normalizeGoalCategory,
  uuidFn = () => crypto.randomUUID()
}) {
  const normalized = title.trim().toLowerCase();
  if (state.goals.some((g) => g.title.trim().toLowerCase() === normalized)) {
    return false;
  }

  state.goals.unshift({
    id: uuidFn(),
    title: title.trim(),
    category: normalizeGoalCategory(category),
    createdDate: todayKey(),
    completionHistory: {},
    streakCount: 0,
    longestStreak: 0
  });

  return true;
}

export function addGoalFromInputFeature({ el, createGoal, renderAll }) {
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
  el.goalFeedback.textContent = 'Goal added. Mark progress today.';
  renderAll();
}

export function computeGoalStatsFeature(goal, { todayKey, previousDate }) {
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

export function markGoalFeature(goalId, status, {
  state,
  todayKey,
  computeGoalStats,
  saveState,
  renderAll
}) {
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

export function updateGoalDayNoteFeature(goalId, note, { state, todayKey, saveState }) {
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

export function deleteGoalFeature(goalId, {
  state,
  expandedGoalIds,
  saveState,
  renderAll,
  confirmFn = (message) => confirm(message)
}) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) {
    return;
  }

  const ok = confirmFn(`Delete "${goal.title}"? This cannot be undone.`);
  if (!ok) {
    return;
  }

  state.goals = state.goals.filter((g) => g.id !== goalId);
  expandedGoalIds.delete(goalId);
  saveState();
  renderAll();
}

export function renameGoalFeature(goalId, {
  state,
  el,
  saveState,
  renderAll,
  promptFn = (message, value) => prompt(message, value)
}) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) {
    return;
  }

  const nextTitle = promptFn('Edit goal title:', goal.title);
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

export function recentHistoryFeature(goal, days, { todayKey, dateKeyFromLocalDate }) {
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
