import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function AppChrome() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">{t("app.title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-testid="theme-toggle"
            aria-label={t("app.theme.toggle")}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>
          <div
            data-testid="locale-switcher"
            className="flex items-center gap-1"
            role="group"
            aria-label={t("app.locale.label")}
          >
            <Button
              type="button"
              size="sm"
              variant={locale === "ru" ? "default" : "outline"}
              data-testid="locale-ru"
              aria-pressed={locale === "ru"}
              onClick={() => setLocale("ru")}
            >
              {t("app.locale.ru")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={locale === "en" ? "default" : "outline"}
              data-testid="locale-en"
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
            >
              {t("app.locale.en")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
