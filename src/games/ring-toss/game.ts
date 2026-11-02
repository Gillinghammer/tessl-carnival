import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 10;
/** How far a ring can land from the centre of a bottle neck and still score. */
export const NECK_RADIUS = 12;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, the throw sways sideways from the aim. */
export const SWAY = 24;
/** Radians per second the sway moves at. */
const SWAY_SPEED = 2.4;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
const COLUMNS = 5;
/** Back row first. Bottles further back score more. */
const ROWS = [
  { y: 110, points: 30 },
  { y: 180, points: 20 },
  { y: 250, points: 10 },
];

export interface Bottle {
  x: number;
  /** Where the top of the neck is, which is where a ring has to land. */
  y: number;
  points: number;
  ringed: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  ring: Ring | null;
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway. */
  time: number;
  /** Where the last ring landed, and whether it scored. */
  lastLanding: { x: number; y: number; scored: boolean; age: number } | null;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = WIDTH / (COLUMNS + 1);
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: COLUMNS }, (_, i) => ({
      x: spacing * (i + 1),
      y: row.y,
      points: row.points,
      ringed: 0,
    })),
  );
  return {
    bottles,
    ring: null,
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    lastLanding: null,
    phase: 'playing',
  };
}

/** How far the throw drifts sideways from the aim at this moment. */
export function swayAt(time: number): number {
  return Math.sin(time * SWAY_SPEED) * SWAY;
}

/** The bottle a ring landing at (x, y) rings, if any. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/**
 * Throws one ring towards the aim, drifted by the current sway. Only one ring
 * is in the air at a time. Returns false if nothing was thrown.
 */
export function throwRing(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  state.ring = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + swayAt(state.time),
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  if (state.lastLanding) {
    state.lastLanding.age += dt;
    if (state.lastLanding.age > 0.6) state.lastLanding = null;
  }

  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
      if (bottle) {
        state.score += bottle.points;
        bottle.ringed += 1;
      }
      state.lastLanding = { x: ring.toX, y: ring.toY, scored: !!bottle, age: 0 };
      state.ring = null;
    }
  }

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(40, row.y + 44, WIDTH - 80, 8);
  }

  for (const bottle of state.bottles) {
    // Body, shoulder and neck, standing on the shelf below the neck.
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 14, bottle.y + 16, 28, 28);
    ctx.beginPath();
    ctx.arc(bottle.x, bottle.y + 16, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(bottle.x - 4, bottle.y, 8, 12);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('small', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(bottle.points), bottle.x, bottle.y + 38);
    for (let i = 0; i < bottle.ringed; i++) drawRing(ctx, bottle.x, bottle.y + 8 + i * 3, 0.6);
  }

  if (state.lastLanding && !state.lastLanding.scored) {
    ctx.globalAlpha = 1 - state.lastLanding.age / 0.6;
    drawRing(ctx, state.lastLanding.x, state.lastLanding.y, 0.6);
    ctx.globalAlpha = 1;
  }

  // Where the next ring would land, swaying.
  if (state.phase === 'playing' && !state.ring) {
    const x = aim.x + swayAt(state.time);
    const y = Math.min(aim.y, THROWER.y - 1);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, NECK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.ring) {
    const t = Math.min(state.ring.age / FLIGHT_TIME, 1);
    const x = state.ring.fromX + (state.ring.toX - state.ring.fromX) * t;
    // An arc up and over, shrinking as it flies away.
    const y =
      state.ring.fromY + (state.ring.toY - state.ring.fromY) * t - Math.sin(t * Math.PI) * 80;
    drawRing(ctx, x, y, 1 - t * 0.4);
  }

  if (state.phase === 'playing' && state.rings > 0 && !state.ring) {
    drawRing(ctx, THROWER.x, THROWER.y, 1);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description:
    'Land rings on the bottle necks before you run out. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwRing(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
