import type { Settings, SettingsRepo } from '@heal-scroll/core';
import { DEFAULT_SETTINGS, SESSION_SIZE_LIMITS } from '@heal-scroll/core';
import { eq } from 'drizzle-orm';
import { settings } from './schema';
import type { Database } from './sqlite-card-repo';

const SETTINGS_KEY = 'settings';

/** User settings live as one JSON row; internal bookkeeping uses plain keys. */
export class SqliteSettingsRepo implements SettingsRepo {
  constructor(private readonly db: Database) {}

  async getSettings(): Promise<Settings> {
    const raw = await this.getValue(SETTINGS_KEY);
    const settings = raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
      : { ...DEFAULT_SETTINGS };
    // Values stored before the slider existed may be out of its range.
    settings.itemsPerSession = Math.min(
      SESSION_SIZE_LIMITS.max,
      Math.max(SESSION_SIZE_LIMITS.min, settings.itemsPerSession),
    );
    return settings;
  }

  async saveSettings(patch: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    await this.setValue(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
  }

  async getValue(key: string): Promise<string | undefined> {
    const rows = await this.db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return rows[0]?.value;
  }

  async setValue(key: string, value: string): Promise<void> {
    await this.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}
