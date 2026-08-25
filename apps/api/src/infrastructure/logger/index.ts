import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Logger instance used throughout the application.
 * Outputs JSON in production, and a human-readable format using `pino-pretty` in development.
 * The log level is controlled by the `LOG_LEVEL` environment variable, defaulting to `'info'` if unset.
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
