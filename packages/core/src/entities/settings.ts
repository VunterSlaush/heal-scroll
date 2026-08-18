export interface Settings {
  itemsPerSession: number;
  cooldownMinutes: number;
  /** ISO 639-1 content language; the app seeds it from the device locale. */
  language: string;
  /** Disables multi-card series in sessions (PLAN §2c). */
  preferShortCards: boolean;
  /** Quiet discipline stat, off by default (PLAN §2d). */
  disciplineStatEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  itemsPerSession: 7,
  cooldownMinutes: 10,
  language: 'en',
  preferShortCards: false,
  disciplineStatEnabled: false,
};
