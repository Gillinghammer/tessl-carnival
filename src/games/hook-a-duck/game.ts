import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** Pixels per second the hook moves, down and up. */
export const HOOK_SPEED = 600;
/** How close the hook has to land to a duck to catch it. */
export const CATCH_RADIUS = 26;
/** The rod's tip: the hook hangs here between casts. */
export const ROD_Y = 70;
/** The stream: an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 290, rx: 310, ry: 120 } as const;
/** The number on each duck's base, in order round the loop. */
export const DUCK_VALUES = [10, 20, 10, 50, 10, 20, 10, 100, 10, 20, 10, 50] as const;
/** Loops per second. */
const DUCK_SPEED = 0.06;

export interface Duck {
  /** Position round the loop, from 0 to 1. */
  t: number;
  /** The number on its base, and what it scores. */
  value: number;
}

export interface Hook {
  x: number;
  y: number;
  /** How deep this cast goes. */
  targetY: number;
  phase: 'ready' | 'down' | 'up';
  /** The duck riding up on the hook, if this cast caught one. */
  caught: Duck | null;
}

export interface Catch {
  value: number;
  x: number;
  y: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({ t: i / DUCK_VALUES.length, value }));
  return {
    ducks,
    hook: { x: WIDTH / 2, y: ROD_Y, targetY: ROD_Y, phase: 'ready', caught: null },
    catches: [],
    casts: CASTS,
    score: 0,
    phase: 'playing',
  };
}

/** Where a duck is on the canvas. */
export function duckPosition(duck: Duck): { x: number; y: number } {
  const angle = duck.t * Math.PI * 2;
  return { x: STREAM.x + STREAM.rx * Math.cos(angle), y: STREAM.y + STREAM.ry * Math.sin(angle) };
}

/** The duck closest to the point, if one is within reach of the hook. */
export function duckAt(ducks: readonly Duck[], x: number, y: number): Duck | undefined {
  let best: Duck | undefined;
  let bestDistance = CATCH_RADIUS;
  for (const duck of ducks) {
    const pos = duckPosition(duck);
    const distance = Math.hypot(pos.x - x, pos.y - y);
    if (distance <= bestDistance) {
      best = duck;
      bestDistance = distance;
    }
  }
  return best;
}

/** Lowers the hook towards the aim point. Returns false if nothing was cast. */
export function cast(state: HookADuckState, aimX: number, aimY: number): boolean {
  const { hook } = state;
  if (state.phase !== 'playing' || state.casts === 0 || hook.phase !== 'ready') return false;
  hook.x = Math.min(Math.max(aimX, 0), WIDTH);
  hook.targetY = Math.min(Math.max(aimY, ROD_Y), HEIGHT - 20);
  hook.phase = 'down';
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  const { hook } = state;

  for (const duck of state.ducks) {
    if (duck === hook.caught) continue;
    duck.t = (duck.t + DUCK_SPEED * dt) % 1;
  }

  if (hook.phase === 'down') {
    hook.y = Math.min(hook.y + HOOK_SPEED * dt, hook.targetY);
    if (hook.y === hook.targetY) {
      const duck = duckAt(state.ducks, hook.x, hook.y);
      if (duck) {
        hook.caught = duck;
        state.score += duck.value;
        state.catches.push({ value: duck.value, x: hook.x, y: hook.y, age: 0 });
      }
      hook.phase = 'up';
    }
  } else if (hook.phase === 'up') {
    hook.y = Math.max(hook.y - HOOK_SPEED * dt, ROD_Y);
    if (hook.y === ROD_Y) {
      hook.phase = 'ready';
      if (hook.caught) {
        // Put the duck back on the far side of the stream.
        hook.caught.t = (hook.caught.t + 0.5) % 1;
        hook.caught = null;
      }
    }
  }

  for (const c of state.catches) c.age += dt;
  state.catches = state.catches.filter((c) => c.age < 0.8);

  if (state.casts === 0 && hook.phase === 'ready') state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, value?: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, y - 14, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + 20, y - 16);
  ctx.lineTo(x + 28, y - 13);
  ctx.lineTo(x + 20, y - 10);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + 14, y - 16, 2, 0, Math.PI * 2);
  ctx.fill();
  if (value !== undefined) {
    // Turned over on the hook, so its number shows.
    ctx.fillStyle = colors.background;
    ctx.font = canvasFont('small', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x, y + 5);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;
  const { hook } = state;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream, with a wooden bank on each side.
  ctx.lineWidth = 64;
  ctx.strokeStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 50;
  ctx.strokeStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (const duck of state.ducks) {
    if (duck === hook.caught) continue;
    const pos = duckPosition(duck);
    drawDuck(ctx, pos.x, pos.y);
  }

  // The rod follows the aim between casts, and the line drops from its tip.
  const rodX = hook.phase === 'ready' ? Math.min(Math.max(aim.x, 0), WIDTH) : hook.x;
  const hookY = hook.phase === 'ready' ? ROD_Y : hook.y;
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(rodX, ROD_Y);
  ctx.lineTo(rodX, 44);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rodX, ROD_Y);
  ctx.lineTo(rodX, hookY);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(rodX - 6, hookY, 6, 0, Math.PI);
  ctx.stroke();
  if (hook.caught) drawDuck(ctx, rodX, hookY + 22, hook.caught.value);

  ctx.textAlign = 'center';
  ctx.font = canvasFont('title', 'bold');
  ctx.fillStyle = colors.accent;
  for (const c of state.catches) {
    ctx.globalAlpha = 1 - c.age / 0.8;
    ctx.fillText(`+${c.value}`, c.x, c.y - 30 - c.age * 40);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float by. The number on each duck is its score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y };

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
        cast(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
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

export default hookADuck;
