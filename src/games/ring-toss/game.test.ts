import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SWAY,
  THROWER,
  bottleAt,
  createState,
  step,
  swayAt,
  throwRing,
} from './game';

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 200)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    throwRing(state, 400, 200);
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.ring).toBeNull();
  });

  it('never throws behind the player', () => {
    const state = createState();
    throwRing(state, 400, THROWER.y + 100);
    expect(state.ring!.toY).toBeLessThan(THROWER.y);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwRing(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(1);
    expect(state.ring).toBeNull();
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    throwRing(state, 5, 300);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
  });

  it('scores only when the ring has landed', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwRing(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('rings a bottle only near its neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    expect(bottleAt(state.bottles, bottle.x + NECK_RADIUS - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(state.bottles, bottle.x + NECK_RADIUS + 1, bottle.y)).toBeUndefined();
  });

  it('sways the throw, but never further than the sway', () => {
    for (let t = 0; t < 10; t += 0.1) expect(Math.abs(swayAt(t))).toBeLessThanOrEqual(SWAY);
    const state = createState();
    state.time = 0.6;
    throwRing(state, 400, 200);
    expect(state.ring!.toX).toBeCloseTo(400 + swayAt(0.6));
  });

  it('keeps playing while the last ring is in the air', () => {
    const state = createState();
    state.rings = 1;
    throwRing(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
  });

  it('ends the round when the rings run out and the last ring has landed', () => {
    const state = createState();
    state.rings = 1;
    throwRing(state, 400, 200);
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });
});
