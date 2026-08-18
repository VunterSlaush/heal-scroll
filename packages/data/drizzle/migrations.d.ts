// Hand-written types for the drizzle-kit-generated migrations bundle,
// consumed by useMigrations() in the app. Regenerate SQL with `pnpm generate`;
// this declaration stays valid as long as the shape below doesn't change.
interface MigrationJournal {
  version: string;
  dialect: string;
  entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
}

declare const migrations: {
  journal: MigrationJournal;
  migrations: Record<string, string>;
};

export default migrations;
