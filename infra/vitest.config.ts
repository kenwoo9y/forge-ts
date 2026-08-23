import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../packages/config/vitest/vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      root: '.',
      exclude: ['node_modules', 'cdk.out'],
      coverage: {
        include: ['lib/**'],
        exclude: ['lib/**/*.test.ts', 'lib/**/*-types.ts'],
      },
    },
  })
);
