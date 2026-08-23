/**
 * ユーザー作成ユースケースの入力データ型。
 */
export type CreateUserInput = {
  /** ユーザー名 */
  username: string;
  /** メールアドレス。未指定の場合は `null` */
  email: string | null;
  /** 名。未指定の場合は `null` */
  firstName: string | null;
  /** 姓。未指定の場合は `null` */
  lastName: string | null;
  /** 平文パスワード */
  password: string;
};

/**
 * ユーザー作成ユースケースの出力データ型。
 */
export type CreateUserOutput = {
  /** ユーザー名 */
  username: string;
  /** メールアドレス。未設定の場合は `null` */
  email: string | null;
  /** 名。未設定の場合は `null` */
  firstName: string | null;
  /** 姓。未設定の場合は `null` */
  lastName: string | null;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
};

/**
 * ユーザー更新ユースケースの入力データ型。
 * 各フィールドはオプショナルで、`null` を渡すとその値をクリアする。
 */
export type UpdateUserInput = {
  /** 新しいユーザー名。`null` でクリア */
  username?: string | null;
  /** 新しいメールアドレス。`null` でクリア */
  email?: string | null;
  /** 新しい名。`null` でクリア */
  firstName?: string | null;
  /** 新しい姓。`null` でクリア */
  lastName?: string | null;
  /** 新しい平文パスワード。指定時にハッシュ化して更新する */
  password?: string;
};

/**
 * ユーザー更新ユースケースの出力データ型。
 */
export type UpdateUserOutput = {
  /** ユーザー名 */
  username: string;
  /** メールアドレス。未設定の場合は `null` */
  email: string | null;
  /** 名。未設定の場合は `null` */
  firstName: string | null;
  /** 姓。未設定の場合は `null` */
  lastName: string | null;
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
  /** メールアドレス。未設定の場合は `null` */
  email: string | null;
  /** 名。未設定の場合は `null` */
  firstName: string | null;
  /** 姓。未設定の場合は `null` */
  lastName: string | null;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
};
