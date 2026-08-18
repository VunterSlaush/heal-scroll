import type { Settings } from '../entities/settings';

export interface SettingsRepo {
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
  /** Internal string values (e.g. weekly-summary bookkeeping). */
  getValue(key: string): Promise<string | undefined>;
  setValue(key: string, value: string): Promise<void>;
}
