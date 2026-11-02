# Whack-a-Mole

Whack the moles as they pop up from the nine holes, before they duck back down.

## How to play

- A mole pops up from one of the holes, stays up for a moment, then drops back down.
- Click a mole while it's up to whack it.
- The round lasts 30 seconds. Moles pop up faster and stay up for less time as
  the round goes on: at the start a new mole appears every second and stays up
  for 1.4 seconds, and by the end one appears every 0.4 seconds and stays up for
  0.6 seconds.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `popMole`,
  `spawnInterval`, `upTime`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
