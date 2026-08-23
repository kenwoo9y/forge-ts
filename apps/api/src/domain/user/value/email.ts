import { ValueObject } from '../../shared/valueObject.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * メールアドレスを表す値オブジェクト。
 * 正規表現によるフォーマット検証を行う。
 */
export class Email extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * メールアドレス文字列から `Email` 値オブジェクトを生成する。
   * @param value メールアドレス文字列
   * @returns 生成された `Email` インスタンス
   * @throws フォーマットが不正な場合にエラーをスローする
   */
  static create(value: string): Email {
    /* c8 ignore next 3 -- validated by Zod schema before reaching domain */
    if (!EMAIL_REGEX.test(value)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    return new Email(value);
  }

  /**
   * メールアドレスの文字列表現を返す。
   * @returns メールアドレス文字列
   */
  toString(): string {
    return this.value;
  }
}
