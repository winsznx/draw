export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'draw-theme';

// Runs in <head> before first paint so the page never flashes the wrong theme.
export const THEME_BOOT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage is blocked. The choice lasts for this page only.
  }
}

export function currentTheme(): ThemeChoice {
  const value = document.documentElement.dataset.theme;
  return value === 'light' || value === 'dark' ? value : 'system';
}
