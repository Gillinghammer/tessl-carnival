# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook to catch one as it passes.

## How to play

- Move the mouse to move the rod along the top of the booth.
- Click to cast: the hook drops to where you clicked, then comes back up.
- If a duck is within reach of the hook when it reaches the bottom, it comes up
  on the hook. Then it goes back on the stream on the far side of the loop.
- You have 10 casts. The round ends when the last cast is back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The
twelve ducks round the loop are numbered:

| Number | Ducks |
| ------ | ----- |
| 10     | 6     |
| 20     | 3     |
| 50     | 2     |
| 100    | 1     |

A cast that misses scores nothing. Your final score is saved to the carnival's
score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckAt`,
  `duckPosition`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
