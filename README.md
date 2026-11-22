# Skill Issue

It's not bad luck. It's a skill issue.

Search any chess.com player and get:

- **Blunder flashcards.** Stockfish checks their games right in the browser and finds the moves that threw the game. Each blunder becomes a card: the position before it, and you find the move that should have been played. Cards you miss come back sooner (spaced repetition, like Quizlet's Learn mode).
- **Opening lessons.** Every opening they play, as White and as Black, with their record in each line. Each line has a lesson: step through it move by move, then practice playing your side from memory. It also shows how the line went in their own games and what came next.

No sign-in and no server: everything runs in the browser and is saved on that device.

## How it works

- **Games** come from [chess.com's public API](https://www.chess.com/news/view/published-data-api) (free, no key): the last 6 months, up to 400 games. Past months are saved in IndexedDB so they're only downloaded once.
- **Openings** are named with [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (public domain), matched by position so transpositions count. `npm run openings` rebuilds `src/lib/data/openings.json`.
- **Blunders**: [Stockfish 19](https://github.com/nmrugg/stockfish.js) (lite, single-threaded WebAssembly) evaluates every position in a Web Worker, up to 3 at once. A move that drops the player's winning chances by 15 points or more, using Lichess's formula, and wasn't the engine's choice becomes a card.
- **Board**: [chessground](https://github.com/lichess-org/chessground), with [chess.js](https://github.com/jhlywa/chess.js) for the rules.

## Getting started

Requires Node 20+.

```sh
npm install   # also copies Stockfish into static/engine/
npm run dev
```

Before a PR: `npm run lint` and `npm run check`.

## Deploying

Netlify reads `netlify.toml`: it builds with `npm run build` and publishes `build/` as a single-page app. There are no environment variables to set.

## License

GPL-3.0-or-later, since Stockfish and chessground are GPL. Not affiliated with chess.com.
