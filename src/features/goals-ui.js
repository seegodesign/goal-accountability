export function renderGoalsFeature({
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
}) {
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

export function animateStreaksFeature(doc = document) {
  const nodes = doc.querySelectorAll('.streak-value');
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

export function wireGoalActionsFeature({
  onToggleGoal,
  onMarkGoal,
  onDeleteGoal,
  onRenameGoal,
  onGoalNoteInput,
  doc = document
}) {
  doc.querySelectorAll('.toggle-goal').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.goalId;
      if (!goalId) {
        return;
      }

      onToggleGoal(goalId);
    });
  });

  doc.querySelectorAll('.mark-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      onMarkGoal(btn.dataset.goalId, btn.dataset.status);
    });
  });

  doc.querySelectorAll('.delete-goal').forEach((btn) => {
    btn.addEventListener('click', () => {
      onDeleteGoal(btn.dataset.goalId);
    });
  });

  doc.querySelectorAll('.rename-goal').forEach((btn) => {
    btn.addEventListener('click', () => {
      onRenameGoal(btn.dataset.goalId);
    });
  });

  doc.querySelectorAll('.goal-note').forEach((input) => {
    input.addEventListener('input', () => {
      onGoalNoteInput(input.dataset.goalId, input.value);
    });
  });
}
