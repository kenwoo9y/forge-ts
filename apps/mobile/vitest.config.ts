import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../packages/config/vitest/vitest.config.ts';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: { '@': dirname },
    },
    test: {
      name: 'unit',
      clearMocks: true,
      include: [
        'features/**/*.test.ts',
        'features/**/*.test.tsx',
        'lib/**/*.test.ts',
        'lib/**/*.test.tsx',
      ],
      coverage: {
        include: ['features/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
        exclude: [
          '**/*.test.{ts,tsx}',
          '**/*.stories.{ts,tsx}',
          '**/components/**',
          '**/api/**',
          '**/types/**',
        ],
      },
    },
  })
);
