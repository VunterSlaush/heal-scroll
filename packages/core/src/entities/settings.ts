export interface Settings {
  itemsPerSession: number;
  cooldownMinutes: number;
  /** ISO 639-1 content language; the app seeds it from the device locale. */
  language: string;
  /** Disables multi-card series in sessions (PLAN §2c). */
  preferShortCards: boolean;
  /** Quiet discipline stat, off by default (PLAN §2d). */
  disciplineStatEnabled: boolean;
  /** Globally muted source ids — a source serves items across topics, so muting is global. */
  disabledSources: string[];
}

export const SESSION_SIZE_LIMITS = { min: 5, max: 30 } as const;

export const DEFAULT_SETTINGS: Settings = {
  itemsPerSession: 7,
  cooldownMinutes: 10,
  language: 'en',
  preferShortCards: false,
  disciplineStatEnabled: false,
  disabledSources: [],
};
