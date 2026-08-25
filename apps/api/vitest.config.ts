import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../packages/config/vitest/vitest.config.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      root: '.',
      exclude: ['node_modules', 'dist', 'src/infrastructure/prisma/**', 'integration/**'],
      coverage: {
        include: ['src/**'],
        exclude: [
          'src/infrastructure/prisma/**',
          'src/infrastructure/logger/**',
          'src/index.ts',
          // DI composition root. Integration tests against the real DB (integration/*.integration.test.ts) verify the actual wiring.
          'src/app.ts',
          // Cannot be verified as behavior without a real Hono context (verifying against a mocked Context would be too London-school, so we avoid it).
          'src/infrastructure/auth/jwtMiddleware.ts',
          'src/**/dto.ts',
          'src/**/repository.ts',
          'src/**/queryService.ts',
          'src/domain/shared/valueObject.ts',
        ],
      },
    },
  })
);
