export const ErrorCode = {
  // 認証
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // ユーザー
  USERNAME_REQUIRED: 'USERNAME_REQUIRED',
  USERNAME_DUPLICATE: 'USERNAME_DUPLICATE',
  EMAIL_DUPLICATE: 'EMAIL_DUPLICATE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  // タスク
  PUBLIC_ID_REQUIRED: 'PUBLIC_ID_REQUIRED',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  // 汎用
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const errorMessages: Record<ErrorCode, string> = {
  INVALID_CREDENTIALS: 'ユーザー名またはパスワードが正しくありません',
  USERNAME_REQUIRED: 'ユーザー名は必須です',
  USERNAME_DUPLICATE: 'このユーザー名はすでに使用されています',
  EMAIL_DUPLICATE: 'このメールアドレスはすでに使用されています',
  USER_NOT_FOUND: 'ユーザーが見つかりません',
  PUBLIC_ID_REQUIRED: 'IDは必須です',
  TASK_NOT_FOUND: 'ToDoが見つかりません',
  INTERNAL_SERVER_ERROR: '予期しないエラーが発生しました',
};
