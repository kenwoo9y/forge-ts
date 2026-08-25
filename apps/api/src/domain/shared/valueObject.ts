/**
 * Abstract base class for value objects.
 * Provides immutability and value-based equality comparison.
 * @template T The type of the value
 */
export abstract class ValueObject<T> {
  constructor(protected readonly value: T) {}

  /**
   * Compares whether this is equal to another value object.
   * @param other The value object to compare against
   * @returns `true` if the values are equal, `false` otherwise
   */
  equals(other: ValueObject<T>): boolean {
    return this.value === other.value;
  }

  /**
   * Returns the contained value.
   * @returns The held value
   */
  getValue(): T {
    return this.value;
  }
}
