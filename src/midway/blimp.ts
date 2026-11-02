/**
 * The Picture.Repair blimp that drifts across the sky above the midway. Plain
 * functions with no canvas or DOM, so Vitest can run them.
 *
 * Positions are in world pixels relative to the top-left of the view, the same
 * space the clouds are drawn in.
 */

export const BLIMP_URL = 'https://picture.repair/';
/** Half the envelope's size, in world pixels. */
export const BLIMP_HALF_WIDTH = 58;
export const BLIMP_HALF_HEIGHT = 17;
/** World pixels per second: slow enough to read as it passes. */
export const BLIMP_SPEED = 9;
/** How far above the horizon the envelope's centre floats. */
export const BLIMP_ALTITUDE = 66;

export interface BlimpPlace {
  x: number;
  y: number;
}

/**
 * Where the blimp floats at time `t` seconds, in a view `viewWidth` wide whose
 * horizon sits at `horizon`. It enters on the left, leaves on the right and
 * loops. With `calm` (reduced motion) it holds still in the middle of the view,
 * clear of the overlays in the corners.
 */
export function blimpPlace(
  t: number,
  viewWidth: number,
  horizon: number,
  calm: boolean,
): BlimpPlace {
  const y = horizon - BLIMP_ALTITUDE + (calm ? 0 : Math.sin(t * 0.8) * 2);
  if (calm) return { x: viewWidth / 2, y };
  // The tail is longer than the nose, so give it room to leave the view fully.
  const margin = BLIMP_HALF_WIDTH + 16;
  const span = viewWidth + margin * 2;
  return { x: ((((t * BLIMP_SPEED) % span) + span) % span) - margin, y };
}

/** Whether a point, in the same space as `place`, is on the blimp. */
export function onBlimp(place: BlimpPlace, x: number, y: number): boolean {
  const dx = (x - place.x) / BLIMP_HALF_WIDTH;
  const dy = (y - place.y) / BLIMP_HALF_HEIGHT;
  // The envelope, plus the gondola hanging under it.
  return (
    dx * dx + dy * dy <= 1 ||
    (Math.abs(x - place.x) <= 14 && y >= place.y && y <= place.y + BLIMP_HALF_HEIGHT + 9)
  );
}
