function weekdayLong(date) {
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

function weekdayShort(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

export function renderConsistencyFeature({
  state,
  el,
  todayKey,
  dateKeyFromLocalDate,
  formatLongDateWithOrdinal,
  formatDisplayDate,
  formatShortDate,
  escapeHtml,
  computeGoalStats,
  win = window
}) {
  const settings = getHeatmapSettings(el);
  if (el.heatmapRangeLabel) {
    el.heatmapRangeLabel.textContent = `Last ${settings.days} days`;
  }

  renderHeatmap(el, settings.days, settings.metric, {
    todayKey,
    formatLongDateWithOrdinal,
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate),
    win
  });

  renderWeeklyScorecard(el, {
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate),
    escapeHtml
  });

  renderTrendSparkline(el, {
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate),
    formatLongDateWithOrdinal,
    win
  });

  renderDayOfWeekPerformance(el, {
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate)
  });

  renderGoalReliabilityRanking(el, state, {
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate),
    escapeHtml
  });

  renderMissPatternInsights(el, state, {
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate),
    escapeHtml
  });

  renderStreakTimeline(el, state, {
    computeGoalStats,
    escapeHtml,
    formatDisplayDate
  });

  renderConsistencyMilestones(el, state, {
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate),
    computeGoalStats,
    escapeHtml
  });

  renderConsistencyProjection(el, state, {
    todayKey,
    dateKeyFromLocalDate
  });

  renderLast14Table(el, {
    collectDailyMetrics: (days) => collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate),
    escapeHtml,
    formatShortDate
  });
}

export function aggregateDailyOutcomesFeature(days, {
  state,
  todayKey,
  dateKeyFromLocalDate,
  metric = 'inclusive'
}) {
  return aggregateDailyOutcomes(
    days,
    metric,
    (count) => collectDailyMetrics(count, state, todayKey, dateKeyFromLocalDate)
  );
}

function getHeatmapSettings(el) {
  const days = Number.parseInt(el.heatmapPeriod?.value || '140', 10);
  const metric = el.heatmapMetric?.value === 'strict' ? 'strict' : 'inclusive';

  return {
    days: Number.isFinite(days) ? days : 140,
    metric
  };
}

function renderHeatmap(el, days, metric, { todayKey, formatLongDateWithOrdinal, collectDailyMetrics, win }) {
  const points = aggregateDailyOutcomes(days, metric, collectDailyMetrics);
  const today = todayKey();

  if (!el.heatmap) {
    return;
  }

  const isMobile = win.matchMedia('(max-width: 640px)').matches;
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

function aggregateDailyOutcomes(days, metric = 'inclusive', collectDailyMetrics) {
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

function collectDailyMetrics(days, state, todayKey, dateKeyFromLocalDate) {
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

function renderWeeklyScorecard(el, { collectDailyMetrics, escapeHtml }) {
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
      value: bestDay ? weekdayLong(new Date(`${bestDay.date}T12:00:00`)) : 'No data'
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

function renderTrendSparkline(el, { collectDailyMetrics, formatLongDateWithOrdinal, win }) {
  if (!el.consistencySparkline) {
    return;
  }

  const isMobile = win.matchMedia('(max-width: 640px)').matches;
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

function renderDayOfWeekPerformance(el, { collectDailyMetrics }) {
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
      const label = weekdayShort(sampleDate);
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

function renderGoalReliabilityRanking(el, state, { collectDailyMetrics, escapeHtml }) {
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

function renderMissPatternInsights(el, state, { collectDailyMetrics, escapeHtml }) {
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
    chips.push(`Most misses happen on ${weekdayLong(new Date(`2024-01-${String(missiest[0] === 0 ? 7 : missiest[0]).padStart(2, '0')}T12:00:00`))}.`);
  }

  if (strongest && strongest.rate > 0) {
    chips.push(
      `Strongest day is ${weekdayLong(new Date(`2024-01-${String(strongest.weekday === 0 ? 7 : strongest.weekday).padStart(2, '0')}T12:00:00`))} (${Math.round(strongest.rate * 100)}% completion).`
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

function renderStreakTimeline(el, state, { computeGoalStats, escapeHtml, formatDisplayDate }) {
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

function renderConsistencyMilestones(el, state, { collectDailyMetrics, computeGoalStats, escapeHtml }) {
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

function renderConsistencyProjection(el, state, { todayKey, dateKeyFromLocalDate }) {
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

function renderLast14Table(el, { collectDailyMetrics, escapeHtml, formatShortDate }) {
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
