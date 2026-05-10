const STORAGE_KEY = 'accountability-app';
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

const MESSAGES = [
  'Small honest actions beat perfect plans.',
  'You are building proof, not just intention.',
  'Consistency grows quietly before it feels loud.',
  'Keep the promise in front of you, not all promises forever.',
  'One deliberate check-in can reset an entire week.',
  'Progress is often private first, obvious later.',
  'Today is enough to practice who you want to be.',
  'Momentum starts with a single marked square.'
];

const DAILY_PROMPTS = [
  'What commitment mattered most today?',
  'What almost pulled you off track, and what kept you grounded?',
  'What made today easier than yesterday?',
  'Where did you choose honesty over comfort?',
  'What is one tiny action tomorrow-you will be grateful for?',
  'What did you learn about your resistance today?',
  'If today had a theme, what was it?',
  'What standard are you quietly raising?'
];

const GOAL_IDEAS = {
  energy: [
    'Walk {minutes} minutes outside',
    'Do a {minutes}-minute bodyweight workout',
    'Sleep plan: in bed before 11:00 PM',
    'Stretch for {minutes} minutes',
    'Drink water before coffee',
    'No phone during first {minutes} minutes after waking'
  ],
  mind: [
    'Meditate for {minutes} minutes',
    'Journal for {minutes} minutes',
    'Read one chapter before bed',
    'Take a {minutes}-minute no-screen reset',
    'Write 3 things I am grateful for',
    'Do 10 minutes of breathwork'
  ],
  learning: [
    'Study a skill for {minutes} minutes',
    'Practice coding for {minutes} minutes',
    'Review notes for {minutes} minutes',
    'Watch one lesson and summarize it',
    'Learn 10 new words',
    'Build one tiny project step'
  ],
  relationships: [
    'Send one thoughtful message',
    'Call family for {minutes} minutes',
    'Have one device-free meal with someone',
    'Give one sincere compliment',
    'Ask one better question today',
    'Check in with one friend'
  ],
  organization: [
    'Tidy one area for {minutes} minutes',
    'Plan top 3 priorities for tomorrow',
    'Inbox zero sprint for {minutes} minutes',
    'Review budget for {minutes} minutes',
    'Prep tomorrow clothes and workspace',
    'Delete 20 unnecessary files/emails'
  ]
};

const EFFORT_MINUTES = {
  tiny: 10,
  steady: 20,
  deep: 40
};

const state = loadState();

const el = {
  greeting: document.getElementById('greeting'),
  todayDate: document.getElementById('today-date'),
  motivation: document.getElementById('motivation'),
  statsGrid: document.getElementById('stats-grid'),
  goalsList: document.getElementById('goals-list'),
  goalsEmptyLabel: document.getElementById('goals-empty-label'),
  goalTitle: document.getElementById('goal-title'),
  addGoalBtn: document.getElementById('add-goal-btn'),
  goalFeedback: document.getElementById('goal-feedback'),
  heatmap: document.getElementById('heatmap'),
  reflection: document.getElementById('daily-reflection'),
  reflectionStatus: document.getElementById('reflection-status'),
  promptBox: document.getElementById('prompt-box'),
  nextPromptBtn: document.getElementById('next-prompt-btn'),
  confettiLayer: document.getElementById('confetti-layer'),
  ideaFocus: document.getElementById('idea-focus'),
  ideaEffort: document.getElementById('idea-effort'),
  refreshIdeasBtn: document.getElementById('refresh-ideas-btn'),
  ideaResults: document.getElementById('idea-results'),
  ideaHelperNote: document.getElementById('idea-helper-note')
};

let promptTimer = null;

init();

function init() {
  paintHeader();
  bindEvents();
  renderAll();
  rotateMotivation(true);
  startPromptRotation();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      goals: [],
      reflections: {},
      selectedPromptIndex: 0,
      lastCelebrationDate: null
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      reflections: parsed.reflections && typeof parsed.reflections === 'object' ? parsed.reflections : {},
      selectedPromptIndex: Number.isInteger(parsed.selectedPromptIndex) ? parsed.selectedPromptIndex : 0,
      lastCelebrationDate: typeof parsed.lastCelebrationDate === 'string' ? parsed.lastCelebrationDate : null
    };
  } catch {
    return {
      goals: [],
      reflections: {},
      selectedPromptIndex: 0,
      lastCelebrationDate: null
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return DATE_FORMATTER.format(d);
}

function paintHeader() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  el.greeting.textContent = `${greeting} - show up gently, show up fully.`;
  el.todayDate.textContent = formatDisplayDate(todayKey());
}

function bindEvents() {
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
  });

  el.nextPromptBtn.addEventListener('click', () => {
    state.selectedPromptIndex = (state.selectedPromptIndex + 1) % DAILY_PROMPTS.length;
    saveState();
    renderPrompt();
  });

  el.refreshIdeasBtn.addEventListener('click', renderGoalIdeas);
  el.ideaFocus.addEventListener('change', renderGoalIdeas);
  el.ideaEffort.addEventListener('change', renderGoalIdeas);
  el.ideaResults.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-idea-title]');
    if (!btn) {
      return;
    }

    const added = createGoal(btn.dataset.ideaTitle);
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
    state.selectedPromptIndex = (state.selectedPromptIndex + 1) % DAILY_PROMPTS.length;
    saveState();
    renderPrompt();
    rotateMotivation(false);
  }, 20000);
}

function addGoalFromInput() {
  const title = el.goalTitle.value.trim();
  if (!title) {
    el.goalFeedback.textContent = 'Name a commitment you want to keep.';
    return;
  }

  const added = createGoal(title);
  if (!added) {
    el.goalFeedback.textContent = 'That goal already exists. Try a slightly different wording.';
    return;
  }

  el.goalTitle.value = '';
  el.goalFeedback.textContent = 'Goal added. Keep it simple and keep it honest.';
  renderAll();
}

function createGoal(title) {
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
  renderPrompt();
  renderGoalIdeas();
  renderStats();
  renderGoals();
  renderHeatmap();
  maybeCelebrate();
}

function renderGoalIdeas() {
  const focus = el.ideaFocus.value;
  const effort = el.ideaEffort.value;
  const minutes = EFFORT_MINUTES[effort] || 20;

  const basePool =
    focus === 'all'
      ? Object.values(GOAL_IDEAS).flat()
      : GOAL_IDEAS[focus] || GOAL_IDEAS.energy;

  const shuffled = [...basePool]
    .map((idea) => ({ idea, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 6)
    .map((entry) => entry.idea.replaceAll('{minutes}', String(minutes)));

  el.ideaResults.innerHTML = shuffled
    .map(
      (idea) =>
        `<button class="focus-ring rounded-full px-3 py-2 text-sm bg-white border border-zinc-300 hover:border-teal-400 hover:bg-teal-50 text-zinc-700 transition-colors" data-idea-title="${escapeHtml(idea)}">+ ${escapeHtml(idea)}</button>`
    )
    .join('');

  if (state.goals.length === 0) {
    el.ideaHelperNote.textContent = 'No goals yet. Tap one suggestion to begin.';
  } else {
    el.ideaHelperNote.textContent = 'Suggestions stay available any time you want to add a new commitment.';
  }
}

function hydrateReflection() {
  el.reflection.value = state.reflections[todayKey()] || '';
}

function renderPrompt() {
  const idx = state.selectedPromptIndex % DAILY_PROMPTS.length;
  el.promptBox.textContent = DAILY_PROMPTS[idx];
}

function rotateMotivation(instant) {
  const index = Math.floor(Math.random() * MESSAGES.length);
  if (instant) {
    el.motivation.textContent = MESSAGES[index];
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
    el.motivation.textContent = MESSAGES[index];
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
  return d.toISOString().slice(0, 10);
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
      const stats = computeGoalStats(goal);
      goal.streakCount = stats.currentStreak;
      goal.longestStreak = stats.longestStreak;
      const status = goal.completionHistory[key]?.status;
      const note = goal.completionHistory[key]?.note || '';
      const miniHistory = recentHistory(goal, 14);

      return `
        <section class="rounded-2xl bg-white border border-zinc-200 p-4 sm:p-5 card-enter shadow-sm" style="animation-delay:${idx * 40}ms">
          <div class="flex gap-3 justify-between items-start">
            <div>
              <h3 class="text-xl sm:text-2xl font-semibold text-zinc-900">${escapeHtml(goal.title)}</h3>
              <p class="text-xs text-zinc-500 mt-1">Created ${formatDisplayDate(goal.createdDate)}</p>
            </div>
            <button class="focus-ring delete-goal text-zinc-500 hover:text-red-600 transition-colors px-2 py-1" data-goal-id="${goal.id}" aria-label="Delete goal ${escapeHtml(goal.title)}">
              Delete
            </button>
          </div>

          <div class="grid sm:grid-cols-3 gap-3 mt-4">
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
              Missed ❌
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
    const key = d.toISOString().slice(0, 10);
    list.push({
      date: key,
      status: goal.completionHistory[key]?.status || null
    });
  }

  return list;
}

function renderHeatmap() {
  const points = aggregateDailyOutcomes(140);
  const today = todayKey();
  el.heatmap.innerHTML = points
    .map((point) => {
      const colorClass =
        point.type === 'done'
          ? 'bg-teal-500'
          : point.type === 'missed'
            ? 'bg-red-500'
            : 'bg-zinc-300';
      const todayRing = point.date === today ? 'ring-1 ring-teal-300' : '';

      return `<button class="heat-cell w-3.5 h-3.5 sm:w-4 sm:h-4 ${colorClass} ${todayRing} focus-ring" title="${point.date}: ${point.label}" aria-label="${point.date} ${point.label}"></button>`;
    })
    .join('');
}

function aggregateDailyOutcomes(days) {
  const today = new Date(`${todayKey()}T12:00:00`);
  const points = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);

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
    if (done > 0 && done >= missed) {
      type = 'done';
      label = `Done (${done})`;
    } else if (missed > 0) {
      type = 'missed';
      label = `Missed (${missed})`;
    }

    points.push({ date: key, type, label });
  }

  return points;
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
