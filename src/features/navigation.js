export function normalizePage(value, pageIds) {
  const page = typeof value === 'string' ? value : '';
  return pageIds.includes(page) ? page : 'dashboard';
}

export function setActivePage(page, shouldScroll, {
  state,
  el,
  saveState,
  pageIds,
  updateDesktopFeatureLayout,
  win = window
}) {
  const nextPage = normalizePage(page, pageIds);
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
    win.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
