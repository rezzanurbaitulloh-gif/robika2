import { describe, expect, it } from "vitest";
import { validateTests } from "@/lib/coding/ChallengeRunner";
import { playerDamage } from "@/lib/game/combatMath";
import type { ChallengeTest } from "@/lib/coding/ChallengeRunner";
import type { BridgeEffect } from "@/lib/coding/sandboxSource";

describe("D07 validateTests", () => {
  const tests: ChallengeTest[] = [
    { name: "3 denyut", expectPulses: 3 },
    { name: "target benar", expectTarget: "gate_bridge" },
  ];

  it("lolos saat efek tepat", () => {
    const effects: BridgeEffect[] = [
      { verb: "pulse", args: ["gate_bridge"] },
      { verb: "pulse", args: ["gate_bridge"] },
      { verb: "pulse", args: ["gate_bridge"] },
    ];
    expect(validateTests(tests, effects)).toBeNull();
  });

  it("gagal saat jumlah denyut salah", () => {
    const effects: BridgeEffect[] = [
      { verb: "pulse", args: ["gate_bridge"] },
      { verb: "pulse", args: ["gate_bridge"] },
    ];
    expect(validateTests(tests, effects)?.name).toBe("3 denyut");
  });

  it("gagal saat target salah", () => {
    const effects: BridgeEffect[] = [
      { verb: "pulse", args: ["gate_lain"] },
      { verb: "pulse", args: ["gate_bridge"] },
      { verb: "pulse", args: ["gate_bridge"] },
    ];
    expect(validateTests(tests, effects)?.name).toBe("target benar");
  });
});

describe("D13 damage formula", () => {
  it("8 + power*0.8", () => {
    expect(playerDamage(5)).toBe(12);
    expect(playerDamage(10)).toBe(16);
    expect(playerDamage(1)).toBe(8);
  });
});
