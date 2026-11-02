# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim, and click to throw a ring. The circle shows where the
  ring will land.
- Your throw sways a little from side to side, so time it: the circle drifts up
  to 24 px either way.
- One ring flies at a time. A ring scores when it lands within 12 px of the top
  of a bottle neck.
- You have 10 rings. The round ends when you are out of rings and the last ring
  has landed.
- Click again on the game over screen to play another round.

## Scoring

The bottles stand in three rows of five. Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A ring that misses every bottle scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `step`, `bottleAt`,
  `swayAt`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
