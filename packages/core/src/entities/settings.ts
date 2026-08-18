export interface Settings {
  itemsPerSession: number;
  cooldownMinutes: number;
  /** Disables multi-card series in sessions (PLAN §2c). */
  preferShortCards: boolean;
  /** Quiet discipline stat, off by default (PLAN §2d). */
  disciplineStatEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  itemsPerSession: 7,
  cooldownMinutes: 10,
  preferShortCards: false,
  disciplineStatEnabled: false,
};
