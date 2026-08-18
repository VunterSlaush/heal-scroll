import { defineConfig } from 'drizzle-kit';

// driver: 'expo' also emits drizzle/migrations.js, which the app bundles
// and runs on device via useMigrations().
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/schema.ts',
  out: './drizzle',
});
