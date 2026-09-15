# Pallankuzhi (Pazhanguli)

A calm, traditional digital version of the South Indian seed-and-well game,
played against a single balanced AI opponent. Built with React, TypeScript,
Tailwind CSS, and Zustand — no backend, no database, no accounts.

## Folder structure

```
pallankuzhi/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.tsx                 # app entry point
    ├── App.tsx                  # screen router (welcome/rules/game/result)
    ├── index.css                # theme, layout, animations (Tailwind + custom)
    ├── lib/
    │   └── gameLogic.ts         # pure game rules + AI move selection
    ├── store/
    │   └── gameStore.ts         # Zustand store wiring logic to the UI
    └── components/
        ├── WelcomeScreen.tsx
        ├── RulesScreen.tsx
        ├── GameScreen.tsx
        ├── ResultScreen.tsx
        ├── Pit.tsx
        ├── Seeds.tsx
        └── WoodBoardIllustration.tsx
```

## Running it locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

To create a production build:

```bash
npm run build
npm run preview
```

## How the game works

- The board has 12 wells: 6 belong to you, 6 belong to the AI.
- Each well starts with 4 seeds (48 seeds total).
- On your turn, tap one of your wells. Its seeds are sown one by one into
  each following well, moving counter-clockwise around the board.
- If your last seed lands in one of your own empty wells, you capture that
  seed plus everything in the well directly opposite it.
- Captured seeds move to your store and are out of play for good.
- The game ends the moment one side's six wells are completely empty; the
  other side then keeps whatever seeds remain on their own side.
- Whoever has captured the most seeds wins.

## The AI opponent

There is a single, balanced AI — no difficulty settings. For each legal
move, it simulates the result and looks one reply ahead to see the best
capture you could make in response, then favors the move that captures the
most while leaving you the smallest opening. It "thinks" for about a
second before moving, shown with an "AI is thinking…" indicator.

## Notes on scope

This project intentionally stays close to the traditional tabletop game:
one board, one opponent, one way to play. There are no tournaments,
achievements, leaderboards, in-game currencies, or multiplayer modes.
