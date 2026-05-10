export function loadStateFromStorage({
  storageKey,
  todayKey,
  normalizeGoals,
  normalizePromptResponses,
  normalizePage,
  normalizeTheme,
  normalizeDateKey
}) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return createInitialState(todayKey);
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
    return createInitialState(todayKey);
  }
}

function createInitialState(todayKey) {
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

export function saveStateToStorage(storageKey, state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
