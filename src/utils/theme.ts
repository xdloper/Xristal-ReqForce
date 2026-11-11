export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export function detectSystemTheme(): ResolvedTheme {
  try {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      return 'light';
    }
  } catch {
    // ignore
  }
  return 'dark';
}

export function resolveTheme(pref: ThemePreference | undefined): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  return detectSystemTheme();
}

export function applyThemeToDocument(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
