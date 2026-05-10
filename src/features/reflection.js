export function hydrateReflectionFeature({ state, el, todayKey }) {
  el.reflection.value = state.reflections[todayKey()] || '';
}

export function renderReflectionHistoryFeature({
  state,
  el,
  todayKey,
  normalizeDateKey,
  escapeHtml,
  formatDisplayDate
}) {
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

export function setSelectedReflectionDateFeature(dateKey, {
  state,
  saveState,
  renderReflectionHistory,
  todayKey,
  normalizeDateKey
}) {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) {
    return;
  }

  const capped = normalized > todayKey() ? todayKey() : normalized;
  state.selectedReflectionDate = capped;
  saveState();
  renderReflectionHistory();
}

export function computeReflectionStreakFeature(reflections, startDateKey, previousDate) {
  let streak = 0;
  let cursor = startDateKey;

  while ((reflections[cursor] || '').trim().length > 0) {
    streak += 1;
    cursor = previousDate(cursor);
  }

  return streak;
}
