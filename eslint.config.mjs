// Root config for packages/*. apps/mobile has its own expo lint config.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'apps/**',
      '**/drizzle/**',
      '**/dist/**',
      '**/.expo/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Layer rule: core is pure TS — no React, no Expo, no infrastructure.
    files: ['packages/core/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react-native*', 'expo', 'expo-*', '@expo/*', 'drizzle-orm*'],
              message: 'packages/core must stay free of React/Expo/DB imports.',
            },
          ],
        },
      ],
    },
  },
  {
    // Layer rule: adapters never touch the DB.
    files: ['packages/sources/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@heal-scroll/data', 'drizzle-orm*', 'expo-sqlite*', 'better-sqlite3'],
              message: 'packages/sources must not touch the database.',
            },
          ],
        },
      ],
    },
  },
);
