import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
export const MOLE_RADIUS = 40;
const COLUMNS = 3;
const ROWS = 3;
/** Seconds between pop-ups, and how long a mole stays up, at the start and end of a round. */
const SPAWN_INTERVAL = { start: 1, end: 0.4 };
const UP_TIME = { start: 1.4, end: 0.6 };
const BONK_SECONDS = 0.3;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole in this hole stays up; 0 when the hole is empty. */
  up: number;
}

export interface Bonk {
  x: number;
  y: number;
  age: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  bonks: Bonk[];
  /** Seconds left in the round. */
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextMole: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes = Array.from({ length: COLUMNS * ROWS }, (_, i) => ({
    x: (WIDTH / COLUMNS) * ((i % COLUMNS) + 0.5),
    y: 130 + Math.floor(i / COLUMNS) * 120,
    up: 0,
  }));
  return {
    holes,
    bonks: [],
    timeLeft: ROUND_SECONDS,
    nextMole: SPAWN_INTERVAL.start,
    score: 0,
    phase: 'playing',
  };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_SECONDS, 0), 1);
}

/** Seconds between pop-ups; it shrinks as the round goes on. */
export function spawnInterval(state: WhackAMoleState): number {
  return SPAWN_INTERVAL.start + (SPAWN_INTERVAL.end - SPAWN_INTERVAL.start) * progress(state);
}

/** Seconds a new mole stays up; it shrinks as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return UP_TIME.start + (UP_TIME.end - UP_TIME.start) * progress(state);
}

/** Pops a mole up in a random empty hole. Returns false if every hole is taken. */
export function popMole(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((hole) => hole.up === 0);
  if (empty.length === 0) return false;
  empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)].up = upTime(state);
  return true;
}

/** Whacks at a point on the canvas. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find(
    (h) => h.up > 0 && Math.hypot(x - h.x, y - (h.y - MOLE_RADIUS / 2)) <= MOLE_RADIUS,
  );
  if (!hole) return false;
  hole.up = 0;
  state.score += POINTS_PER_MOLE;
  state.bonks.push({ x: hole.x, y: hole.y - MOLE_RADIUS / 2, age: 0 });
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  for (const bonk of state.bonks) bonk.age += dt;
  state.bonks = state.bonks.filter((b) => b.age < BONK_SECONDS);
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  for (const hole of state.holes) hole.up = Math.max(hole.up - dt, 0);

  if (state.timeLeft === 0) {
    for (const hole of state.holes) hole.up = 0;
    state.phase = 'over';
    return;
  }

  state.nextMole -= dt;
  if (state.nextMole <= 0) {
    popMole(state, random);
    state.nextMole = spawnInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  ctx.fillStyle = colors.wood;
  ctx.fillRect(20, 60, WIDTH - 40, HEIGHT - 120);

  for (const hole of state.holes) {
    if (hole.up > 0) {
      // The mole, peeking out of its hole.
      ctx.fillStyle = colors.muted;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y - MOLE_RADIUS / 2, MOLE_RADIUS * 0.8, Math.PI, 0);
      ctx.lineTo(hole.x + MOLE_RADIUS * 0.8, hole.y);
      ctx.lineTo(hole.x - MOLE_RADIUS * 0.8, hole.y);
      ctx.fill();
      ctx.fillStyle = colors.background;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hole.x + side * 12, hole.y - MOLE_RADIUS / 2 - 8, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = colors.danger;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y - MOLE_RADIUS / 2 + 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // The front lip of the hole, drawn over the mole's base.
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, MOLE_RADIUS, MOLE_RADIUS * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  for (const bonk of state.bonks) {
    ctx.globalAlpha = 1 - bonk.age / BONK_SECONDS;
    ctx.beginPath();
    ctx.arc(bonk.x, bonk.y, 10 + bonk.age * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They pop up faster as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
