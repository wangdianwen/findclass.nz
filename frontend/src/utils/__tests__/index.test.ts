import {
  formatPrice,
  formatRating,
  formatReviewCount,
  truncate,
  stripHtml,
  delay,
  debounce,
  throttle,
  generateId,
  isEmpty,
  safeJsonParse,
  uniqueArray,
  sortBy,
} from '../index';

describe('Utility Functions', () => {
  describe('formatPrice', () => {
    it('formats price with NZD currency', () => {
      expect(formatPrice(100)).toBe('$100');
      expect(formatPrice(99.99)).toBe('$100');
    });

    it('formats price with custom currency', () => {
      expect(formatPrice(100, 'USD')).toBe('US$100');
      expect(formatPrice(50, 'EUR')).toBe('€50');
    });

    it('handles zero and large numbers', () => {
      expect(formatPrice(0)).toBe('$0');
      expect(formatPrice(1000000)).toBe('$1,000,000');
    });
  });

  describe('formatRating', () => {
    it('formats rating to one decimal place', () => {
      expect(formatRating(4.56)).toBe('4.6');
      expect(formatRating(5)).toBe('5.0');
      expect(formatRating(3.999)).toBe('4.0');
    });
  });

  describe('formatReviewCount', () => {
    it('formats review count with k suffix for thousands', () => {
      expect(formatReviewCount(1500)).toBe('1.5k');
      expect(formatReviewCount(999)).toBe('999');
      expect(formatReviewCount(1000)).toBe('1.0k');
    });

    it('handles zero and small numbers', () => {
      expect(formatReviewCount(0)).toBe('0');
      expect(formatReviewCount(100)).toBe('100');
    });
  });

  describe('truncate', () => {
    it('truncates text longer than max length', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('returns original text if shorter than max length', () => {
      expect(truncate('Hi', 10)).toBe('Hi');
    });

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
      expect(stripHtml('<div><span>Test</span></div>')).toBe('Test');
    });

    it('handles text without HTML tags', () => {
      expect(stripHtml('Plain text')).toBe('Plain text');
    });

    it('handles nested tags', () => {
      expect(stripHtml('<div><p>Nested</p></div>')).toBe('Nested');
    });
  });

  describe('delay', () => {
    it('resolves after specified milliseconds', async () => {
      const start = Date.now();
      await delay(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounces function calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('only calls function once for multiple rapid calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 50);

      for (let i = 0; i < 10; i++) {
        debouncedFn();
      }

      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('throttles function calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('generates IDs with prefix', () => {
      const id = generateId('user');
      expect(id.startsWith('user-')).toBe(true);
    });

    it('includes timestamp and random parts', () => {
      const id = generateId();
      const parts = id.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('isEmpty', () => {
    it('returns true for null and undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
    });

    it('returns true for empty array and object', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it('returns false for non-empty values', () => {
      expect(isEmpty('text')).toBe(false);
      expect(isEmpty([1, 2])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('safeJsonParse', () => {
    it('parses valid JSON', () => {
      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
      expect(safeJsonParse('["a","b"]', [])).toEqual(['a', 'b']);
    });

    it('returns fallback for invalid JSON', () => {
      expect(safeJsonParse('invalid', { fallback: true })).toEqual({ fallback: true });
    });

    it('handles empty string', () => {
      expect(safeJsonParse('', null)).toBe(null);
    });
  });

  describe('uniqueArray', () => {
    it('removes duplicates from simple array', () => {
      expect(uniqueArray([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('removes duplicates by key', () => {
      const arr = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 1, name: 'a' },
      ];
      const result = uniqueArray(arr, 'id');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  describe('sortBy', () => {
    interface TestItem {
      id: number;
      name: string;
    }

    it('sorts array in ascending order', () => {
      const arr: TestItem[] = [
        { id: 3, name: 'c' },
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      const result = sortBy(arr, 'id');
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(3);
    });

    it('sorts array in descending order', () => {
      const arr: TestItem[] = [
        { id: 3, name: 'c' },
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      const result = sortBy(arr, 'id', 'desc');
      expect(result[0].id).toBe(3);
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(1);
    });

    it('handles objects with string keys', () => {
      const arr: TestItem[] = [
        { id: 1, name: 'Charlie' },
        { id: 2, name: 'Alice' },
        { id: 3, name: 'Bob' },
      ];
      const result = sortBy(arr, 'name');
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    it('does not mutate original array', () => {
      const original: TestItem[] = [
        { id: 3, name: 'c' },
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      sortBy(original, 'id');
      expect(original[0].id).toBe(3);
    });
  });
});
