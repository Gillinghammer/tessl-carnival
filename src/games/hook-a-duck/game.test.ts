import { describe, expect, it } from 'vitest';
import {
  CASTS,
  CATCH_RADIUS,
  ROD_Y,
  cast,
  createState,
  duckAt,
  duckPosition,
  step,
  type Duck,
} from './game';

/** Runs the game until the hook is back at the rod. */
function finishCast(state: ReturnType<typeof createState>) {
  for (let i = 0; i < 200 && state.hook.phase !== 'ready'; i++) step(state, 0.02);
}

describe('hook a duck', () => {
  it('starts with every cast left and no score', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.hook.phase).toBe('ready');
  });

  it('uses one cast per drop of the hook', () => {
    const state = createState();
    expect(cast(state, 400, 300)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook.phase).toBe('down');
  });

  it('cannot cast again until the hook is back up', () => {
    const state = createState();
    cast(state, 400, 300);
    expect(cast(state, 400, 300)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts are used up', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 400, 300)).toBe(false);
  });

  it('scores the number on the duck it catches', () => {
    const state = createState();
    const duck: Duck = { t: 0.25, value: 50 };
    state.ducks = [duck];
    const pos = duckPosition(duck);
    cast(state, pos.x, pos.y);
    // Freeze the duck at the hook's landing spot so the catch is certain.
    state.hook.y = pos.y;
    step(state, 0);
    expect(state.score).toBe(50);
    expect(state.hook.caught).toBe(duck);
    expect(state.hook.phase).toBe('up');
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    state.ducks = [{ t: 0.25, value: 50 }];
    cast(state, 400, ROD_Y + 10);
    finishCast(state);
    expect(state.score).toBe(0);
    expect(state.hook.caught).toBeNull();
  });

  it('lets the caught duck go back on the stream when the hook is up', () => {
    const state = createState();
    const duck: Duck = { t: 0.25, value: 10 };
    state.ducks = [duck];
    state.hook.caught = duck;
    state.hook.phase = 'up';
    state.hook.y = ROD_Y + 1;
    step(state, 0.1);
    expect(state.hook.caught).toBeNull();
    expect(duck.t).toBeCloseTo(0.75);
  });

  it('ends the round when the last cast is back up', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 300);
    step(state, 0.01);
    expect(state.phase).toBe('playing');
    finishCast(state);
    step(state, 0);
    expect(state.phase).toBe('over');
  });

  it('moves the ducks round the loop', () => {
    const state = createState();
    const before = state.ducks[0].t;
    step(state, 1);
    expect(state.ducks[0].t).not.toBe(before);
  });

  it('catches a duck inside the hook radius and misses one outside it', () => {
    const duck: Duck = { t: 0, value: 10 };
    const pos = duckPosition(duck);
    expect(duckAt([duck], pos.x + CATCH_RADIUS - 1, pos.y)).toBe(duck);
    expect(duckAt([duck], pos.x + CATCH_RADIUS + 1, pos.y)).toBeUndefined();
  });
});
