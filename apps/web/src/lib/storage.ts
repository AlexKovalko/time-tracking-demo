export const STORAGE_KEYS = {
  theme: "falconai.theme",
  locale: "falconai.locale",
  hideConfirmDone: "falconai.timer.hideConfirmDone",
  preferCollapsed: "falconai.timer.preferCollapsed",
} as const;

export type ThemeMode = "light" | "dark";
export type LocaleCode = "ru" | "en";

export function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.theme);
    if (v === "dark" || v === "light") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "light";
}

export function writeTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* ignore */
  }
}

export function readLocale(): LocaleCode {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.locale);
    if (v === "ru" || v === "en") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "ru";
}

export function writeLocale(locale: LocaleCode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.locale, locale);
  } catch {
    /* ignore */
  }
}

export function isHideConfirmDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.hideConfirmDone) === "true";
  } catch {
    return false;
  }
}

export function setHideConfirmDone(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.hideConfirmDone, "true");
  } catch {
    /* ignore */
  }
}

export function isPreferCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.preferCollapsed) === "true";
  } catch {
    return false;
  }
}

export function setPreferCollapsed(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEYS.preferCollapsed, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.preferCollapsed);
    }
  } catch {
    /* ignore */
  }
}
