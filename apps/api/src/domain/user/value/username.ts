import { ValueObject } from '../../shared/valueObject.js';

const USERNAME_MAX_LENGTH = 30;

/**
 * ユーザー名を表す値オブジェクト。
 * 1文字以上・30文字以内の検証を行う。
 */
export class Username extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * 文字列から `Username` 値オブジェクトを生成する。
   * @param value ユーザー名文字列
   * @returns 生成された `Username` インスタンス
   * @throws 空文字または最大文字数超過の場合にエラーをスローする
   */
  static create(value: string): Username {
    /* c8 ignore start -- validated by Zod schema before reaching domain */
    if (value.length === 0) {
      throw new Error('Username must not be empty');
    }
    if (value.length > USERNAME_MAX_LENGTH) {
      throw new Error(`Username must be at most ${USERNAME_MAX_LENGTH} characters`);
    }
    /* c8 ignore stop */
    return new Username(value);
  }

  /**
   * ユーザー名の文字列表現を返す。
   * @returns ユーザー名文字列
   */
  toString(): string {
    return this.value;
  }
}
