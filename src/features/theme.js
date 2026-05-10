export function normalizeTheme(value, themeIds) {
  const theme = typeof value === 'string' ? value : '';
  return themeIds.includes(theme) ? theme : 'dark';
}

export function applyTheme(theme, {
  state,
  themeIds,
  sunIconSvg,
  moonIconSvg,
  toggleBtn,
  toggleIcon,
  doc = document
}) {
  const nextTheme = normalizeTheme(theme, themeIds);
  state.theme = nextTheme;
  doc.body.classList.toggle('theme-dark', nextTheme === 'dark');

  const isDark = nextTheme === 'dark';
  const themeColorMeta = doc.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? '#0a0f13' : '#ffffff');
  }

  toggleBtn.setAttribute('aria-pressed', String(isDark));
  toggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  toggleIcon.innerHTML = isDark ? sunIconSvg : moonIconSvg;

  return nextTheme;
}
