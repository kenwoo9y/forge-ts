import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * アプリケーション全体で使用するロガーインスタンス。
 * 本番環境ではJSON形式、開発環境では `pino-pretty` を使用して見やすい形式で出力する。
 * ログレベルは環境変数 `LOG_LEVEL` で制御し、未設定の場合は `'info'` を使用する。
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
        },
      }),
});
