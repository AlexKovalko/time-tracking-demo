import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walkTsFiles(p, out);
    } else if (extname(name) === ".ts" || extname(name) === ".tsx") {
      out.push(p);
    }
  }
  return out;
}

/**
 * AC-37 (#71) — RU locale must use «Подразделение», not «Отдел».
 * Note: JS \\b is ASCII-word only — do not use it for Cyrillic.
 */
describe("structure · RU Подразделение i18n (AC-37 #71)", () => {
  it("ru.json replaces Отдел with Подразделение", () => {
    const path = resolve(root, "apps/web/src/locales/ru.json");
    expect(existsSync(path)).toBe(true);
    const ru = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
    const values = Object.values(ru);
    const offenders = values.filter((v) => /Отдел/.test(v));
    expect(offenders).toEqual([]);
    expect(values.join("\n")).toMatch(/Подразделен/);
  });

  it("apps/web source has no hardcoded RU «Отдел» strings", () => {
    const files = walkTsFiles(resolve(root, "apps/web/src"));
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (!text.includes("Отдел")) continue;
      hits.push(file.replace(root + "/", ""));
    }
    expect(hits).toEqual([]);
  });
});
