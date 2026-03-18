/**
 * RandomService — Centralized, testable random number generation.
 * Provides dice rolls and random item selection for dice and draw features.
 */
class RandomService {
  /**
   * Roll `count` dice each with `sides` faces.
   * @param count  Number of dice to roll. Returns [] when count is 0 or negative.
   * @param sides  Number of sides on each die (default 6). Must be ≥ 1.
   * @returns      Array of `count` integers, each in the range [1, sides].
   */
  rollDice(count: number, sides: number = 6): number[] {
    if (count <= 0) {
      return [];
    }

    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      // Math.random() is in [0, 1), so this yields integers in [1, sides].
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    return results;
  }

  /**
   * Select one item from the provided array uniformly at random.
   * @param items  Array of items to choose from.
   * @returns      A randomly selected element, or `null` if the array is empty.
   */
  selectRandomItem<T>(items: T[]): T | null {
    if (items.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }
}

export default new RandomService();
