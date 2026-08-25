export const ErrorCode = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // User
  USERNAME_REQUIRED: 'USERNAME_REQUIRED',
  USERNAME_DUPLICATE: 'USERNAME_DUPLICATE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const errorMessages: Record<ErrorCode, string> = {
  INVALID_CREDENTIALS: 'Incorrect username or password',
  USERNAME_REQUIRED: 'Username is required',
  USERNAME_DUPLICATE: 'This username is already taken',
  USER_NOT_FOUND: 'User not found',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
};
