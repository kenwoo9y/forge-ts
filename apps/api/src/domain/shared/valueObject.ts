/**
 * 値オブジェクトの抽象基底クラス。
 * 不変性と値に基づく等値比較を提供する。
 * @template T 値の型
 */
export abstract class ValueObject<T> {
  constructor(protected readonly value: T) {}

  /**
   * 別の値オブジェクトと等値かどうかを比較する。
   * @param other 比較対象の値オブジェクト
   * @returns 値が等しい場合は `true`、それ以外は `false`
   */
  equals(other: ValueObject<T>): boolean {
    return this.value === other.value;
  }

  /**
   * 内包する値を返す。
   * @returns 保持している値
   */
  getValue(): T {
    return this.value;
  }
}
