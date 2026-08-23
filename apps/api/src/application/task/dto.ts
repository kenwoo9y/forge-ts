/**
 * タスク作成ユースケースの入力データ型。
 */
export type CreateTaskInput = {
  /** タスクのタイトル */
  title: string;
  /** タスクの説明。未指定の場合は `null` */
  description: string | null;
  /** 期日。未指定の場合は `null` */
  dueDate: Date | null;
  /** ステータス文字列（'todo' | 'doing' | 'done'） */
  status: string;
  /** 所有ユーザーのID */
  ownerId: bigint;
};

/**
 * タスク作成ユースケースの出力データ型。
 */
export type CreateTaskOutput = {
  /** 外部公開用のUUID */
  publicId: string;
  /** タスクのタイトル */
  title: string;
  /** タスクの説明。未設定の場合は `null` */
  description: string | null;
  /** 期日。未設定の場合は `null` */
  dueDate: Date | null;
  /** ステータス文字列 */
  status: string;
  /** 所有ユーザーのID */
  ownerId: bigint;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
};

/**
 * タスク更新ユースケースの入力データ型。
 * 各フィールドはオプショナルで、指定したフィールドのみ更新する。
 */
export type UpdateTaskInput = {
  /** 新しいタスクのタイトル */
  title?: string;
  /** 新しいタスクの説明。`null` でクリア */
  description?: string | null;
  /** 新しい期日。`null` でクリア */
  dueDate?: Date | null;
  /** 新しいステータス文字列 */
  status?: string;
  /** 新しい所有ユーザーのID */
  ownerId?: bigint;
};

/**
 * タスク更新ユースケースの出力データ型。
 */
export type UpdateTaskOutput = {
  /** 外部公開用のUUID */
  publicId: string;
  /** タスクのタイトル */
  title: string;
  /** タスクの説明。未設定の場合は `null` */
  description: string | null;
  /** 期日。未設定の場合は `null` */
  dueDate: Date | null;
  /** ステータス文字列 */
  status: string;
  /** 所有ユーザーのID */
  ownerId: bigint;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
};

/**
 * タスクの読み取り専用モデル。
 * クエリサービスがデータストアから直接返すフラットなデータ構造。
 */
export type TaskReadModel = {
  /** 外部公開用のUUID */
  publicId: string;
  /** タスクのタイトル */
  title: string;
  /** タスクの説明。未設定の場合は `null` */
  description: string | null;
  /** 期日。未設定の場合は `null` */
  dueDate: Date | null;
  /** ステータス文字列 */
  status: string;
  /** 所有ユーザーのID */
  ownerId: bigint;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
};
