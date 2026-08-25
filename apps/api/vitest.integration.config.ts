import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../packages/config/vitest/vitest.config.ts';

// Load connection info from .env.integration when running locally (in CI, where the environment variables are already set, the file won't exist and this is skipped).
try {
  process.loadEnvFile('.env.integration');
} catch {
  // If the file doesn't exist, use the environment variables as-is
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      root: '.',
      include: ['integration/**/*.integration.test.ts'],
      setupFiles: ['./integration/setup.ts'],
      // All test files share the same real DB and reset state via TRUNCATE between tests, so allowing file-level parallelism would cause TRUNCATE to race with tests in other files.
      fileParallelism: false,
      // Since this targets only integration tests against the real DB, the coverage thresholds meant for unit tests do not apply.
      coverage: {
        enabled: false,
      },
    },
  })
);
