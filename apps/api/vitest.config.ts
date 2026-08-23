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
          // DIコンポジションルート。実DBに対するIntegrationテスト（integration/*.integration.test.ts）が実際の配線ごと検証する
          'src/app.ts',
          // 実Honoコンテキストがないと振る舞いとして検証できない（モックしたContextでの検証はロンドン学派的になるため避ける）。
          // Integrationテスト（integration/task.integration.test.ts の「JWT保護」）が実HTTPリクエスト経由で検証する
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
