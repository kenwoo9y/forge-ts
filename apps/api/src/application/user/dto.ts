/**
 * ユーザー作成ユースケースの入力データ型。
 */
export type CreateUserInput = {
  /** ユーザー名 */
  username: string;
  /** 平文パスワード */
  password: string;
};

/**
 * ユーザー作成ユースケースの出力データ型。
 */
export type CreateUserOutput = {
  /** ユーザー名 */
  username: string;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
};

/**
 * ユーザーの読み取り専用モデル。
 * クエリサービスがデータストアから直接返すフラットなデータ構造。
 */
export type UserReadModel = {
  /** 内部ID */
  id: bigint;
  /** ユーザー名 */
  username: string;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
};
