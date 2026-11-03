import { MoonIcon, SunIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "border border-border bg-background text-foreground hover:bg-muted",
  );

export function AppChrome() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <NavLink
            to="/employees"
            className="truncate text-lg font-semibold tracking-tight text-foreground"
          >
            {t("app.title")}
          </NavLink>
          <nav
            className="flex flex-wrap items-center gap-1.5"
            aria-label={t("nav.aria")}
          >
            <NavLink
              to="/employees"
              data-testid="nav-employees"
              className={navLinkClass}
              end
            >
              {t("nav.employees")}
            </NavLink>
            <NavLink
              to="/entries"
              data-testid="nav-entries"
              className={navLinkClass}
            >
              {t("nav.entries")}
            </NavLink>
            <NavLink
              to="/report"
              data-testid="nav-report"
              className={navLinkClass}
            >
              {t("nav.report")}
            </NavLink>
          </nav>
        </div>
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
