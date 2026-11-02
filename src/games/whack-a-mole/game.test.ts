import { describe, expect, it } from 'vitest';
import {
  MOLE_RADIUS,
  POINTS_PER_MOLE,
  ROUND_SECONDS,
  createState,
  popMole,
  spawnInterval,
  step,
  upTime,
  whack,
} from './game';

/** The point a player clicks to hit the mole in a hole. */
const moleCenter = (hole: { x: number; y: number }) => ({ x: hole.x, y: hole.y - MOLE_RADIUS / 2 });

describe('whack-a-mole', () => {
  it('starts a full round with no score and every hole empty', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes.length).toBeGreaterThan(1);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('pops a mole up after a short wait', () => {
    const state = createState();
    step(state, 1.01, () => 0);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    state.holes[0].up = 0.5;
    state.nextMole = 10;
    step(state, 0.6);
    expect(state.holes[0].up).toBe(0);
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    state.holes[4].up = 1;
    const { x, y } = moleCenter(state.holes[4]);
    expect(whack(state, x, y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(state.holes[4].up).toBe(0);
  });

  it('scores nothing for a whack on an empty hole or a miss', () => {
    const state = createState();
    state.holes[0].up = 1;
    const empty = moleCenter(state.holes[1]);
    expect(whack(state, empty.x, empty.y)).toBe(false);
    expect(whack(state, state.holes[0].x + MOLE_RADIUS * 2, state.holes[0].y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('only pops moles into empty holes', () => {
    const state = createState();
    for (const hole of state.holes) hole.up = 1;
    expect(popMole(state)).toBe(false);
    state.holes[3].up = 0;
    expect(popMole(state, () => 0.99)).toBe(true);
    expect(state.holes[3].up).toBeGreaterThan(0);
  });

  it('pops moles up faster, for less time, as the round goes on', () => {
    const early = createState();
    const late = createState();
    late.timeLeft = 2;
    expect(spawnInterval(late)).toBeLessThan(spawnInterval(early));
    expect(upTime(late)).toBeLessThan(upTime(early));
  });

  it('ends the round when time runs out and stops scoring', () => {
    const state = createState();
    state.holes[0].up = 5;
    step(state, ROUND_SECONDS);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
    state.holes[0].up = 1;
    const { x, y } = moleCenter(state.holes[0]);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
