import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n";

describe("D09 i18n", () => {
  it("kunci id tersedia (fallback default locale)", () => {
    expect(t("gate.opened")).toContain("Gerbang");
  });

  it("kunci tidak dikenal dikembalikan mentah", () => {
    expect(t("tidak.ada.key")).toBe("tidak.ada.key");
  });

  it("placeholder {x} diganti", () => {
    expect(t("combat.killed", { name: "X", xp: 1, credits: 2 })).toContain("X");
    expect(t("combat.killed", { name: "X", xp: 1, credits: 2 })).toContain("+1 XP");
  });
});
