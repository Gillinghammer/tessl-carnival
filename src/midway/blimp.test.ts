import { describe, expect, it } from 'vitest';
import {
  BLIMP_ALTITUDE,
  BLIMP_CEILING,
  BLIMP_HALF_HEIGHT,
  BLIMP_HALF_WIDTH,
  BLIMP_SPEED,
  blimpPlace,
  onBlimp,
} from './blimp';

describe('blimpPlace', () => {
  it('drifts slowly to the right', () => {
    const a = blimpPlace(10, 600, 200, false);
    const b = blimpPlace(11, 600, 200, false);
    expect(b.x - a.x).toBeCloseTo(BLIMP_SPEED);
  });

  it('loops back in from the left after leaving the view', () => {
    const xs = Array.from({ length: 2000 }, (_, i) => blimpPlace(i * 0.1, 600, 200, false).x);
    expect(Math.min(...xs)).toBeLessThan(-BLIMP_HALF_WIDTH);
    expect(Math.max(...xs)).toBeGreaterThan(600 + BLIMP_HALF_WIDTH);
    // It wraps around at least once in that time.
    expect(xs.some((x, i) => i > 0 && x < xs[i - 1])).toBe(true);
  });

  it('floats above the horizon', () => {
    for (const t of [0, 3, 50]) {
      expect(blimpPlace(t, 600, 200, false).y).toBeLessThan(200 - BLIMP_ALTITUDE / 2);
    }
  });

  it('stays below the top of the view when the horizon is near it', () => {
    // At 1280x720 the horizon sits about 52 world pixels below the top of the view.
    for (const t of [0, 2, 3, 50]) {
      const { y } = blimpPlace(t, 985, 52, false);
      // The fins reach 6 past the envelope; all of it stays in sight.
      expect(y - BLIMP_HALF_HEIGHT - 6).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(52);
    }
    expect(blimpPlace(0, 985, 52, true).y).toBe(BLIMP_CEILING);
  });

  it('holds still in the middle of the view for reduced motion', () => {
    const a = blimpPlace(0, 600, 200, true);
    const b = blimpPlace(42, 600, 200, true);
    expect(a).toEqual(b);
    expect(a).toEqual({ x: 300, y: 200 - BLIMP_ALTITUDE });
  });
});

describe('onBlimp', () => {
  const place = { x: 100, y: 50 };

  it('hits the envelope and the gondola', () => {
    expect(onBlimp(place, 100, 50)).toBe(true);
    expect(onBlimp(place, 100 + BLIMP_HALF_WIDTH - 2, 50)).toBe(true);
    expect(onBlimp(place, 100, 50 + 22)).toBe(true);
  });

  it('misses the sky around it', () => {
    expect(onBlimp(place, 100 + BLIMP_HALF_WIDTH + 5, 50)).toBe(false);
    expect(onBlimp(place, 100, 50 - 30)).toBe(false);
    expect(onBlimp(place, 100 - 40, 50 + 20)).toBe(false);
  });
});
