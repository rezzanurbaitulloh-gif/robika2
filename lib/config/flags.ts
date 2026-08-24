export const flags = {
  PAYMENTS_ENABLED: false,
  GACHA_ENABLED: false,
  AI_ENABLED: true,
} as const;

export type FlagName = keyof typeof flags;
