# Puzzle Drift

Puzzle Drift is a browser-based neon puzzle game built with React, TypeScript, and Vite. The game is fully client-side: there is no backend, no server persistence, and no external icon system beyond Lucide React.

Players move through compact puzzle boards, collect keys, open doors, push blocks, activate switches and pressure plates, avoid spikes, slide across ice, use portals, and chase better move and time scores across a 30-level campaign.

## Features

- 30 handcrafted levels with a gradual difficulty curve
- Start screen, continue flow, level select, settings, pause menu, and completion screen
- Keyboard controls with Arrow keys and WASD
- Touch-friendly on-screen directional controls
- Responsive game board for desktop and mobile
- LocalStorage persistence for progress, stats, unlocks, stars, and settings
- Level completion scoring with 1-3 stars
- Best moves and best time tracking
- Reset, undo, pause, retry, next level, and level select actions
- Lightweight hint system with 1-3 hints per level
- First hint is free; later hints unlock after failed resets or time thresholds
- Reduced motion support for major animations
- Theme support:
  - Rift Dark
  - Crystal Blue
  - Ember Grid
  - Forest Circuit
- Accessible HUD regions, labeled icon buttons, and screen-reader-friendly completion status
- Lucide React icons only

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- React Testing Library
- Lucide React
- Plain CSS
- LocalStorage

## Project Structure

```text
src/
  components/
    GameBoard.tsx
    GameScreen.tsx
    LevelSelectScreen.tsx
    SettingsDialog.tsx
    StartScreen.tsx
  data/
    defaultSettings.ts
    initialSave.ts
    levels.ts
  hooks/
    useLocalStorage.ts
  logic/
    gameState.ts
    movement.ts
  tests/
    App.test.tsx
    GameBoard.test.tsx
    finalQa.test.tsx
    levelPack.test.tsx
    levelValidation.test.ts
    movement.test.ts
    progressStorage.test.ts
    setup.ts
    testStorage.ts
  types/
    game.ts
  utils/
    levelValidation.ts
    progressStorage.ts
    storage.ts
  App.tsx
  main.tsx
  styles.css
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run the test suite once:

```bash
npm run test:run
```

Run tests in watch mode:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

## Gameplay

The goal of each level is to guide the player to the exit. Movement is grid-based and each successful move increments the move counter once. Some mechanics can chain within a single move, such as sliding on ice or entering a portal.

### Controls

- Move up: `ArrowUp` or `W`
- Move down: `ArrowDown` or `S`
- Move left: `ArrowLeft` or `A`
- Move right: `ArrowRight` or `D`
- Touch controls: use the on-screen directional buttons

### HUD Actions

- Hint: opens the level hint panel
- Reset: restarts the current attempt
- Undo: restores the previous successful move
- Pause: opens the pause menu and freezes the timer
- Level Select: returns to the level select screen

## Puzzle Mechanics

Current playable mechanics include:

- Floor: normal traversable tile
- Wall: blocks movement
- Exit: completes the level
- Key: collectible item used to open locked doors
- Door: blocks movement unless opened by key, switch, or pressure plate
- Switch: toggles linked doors open or closed
- Pressure plate: activates while the player or a block is on it
- Push block: movable block that can hold pressure plates
- Spike: resets the current attempt
- Ice: slides the player until the slide stops
- Portal: teleports the player to a linked portal

The supported tile type model also includes future-safe types such as cracked, fog, oneWay, mirror, laserEmitter, and laserReceiver, but those are not currently used as active gameplay mechanics.

## Level Data

Levels are defined in `src/data/levels.ts`.

Each level includes:

- `id`
- `name`
- `description`
- `width`
- `height`
- `grid`
- `playerStart`
- `targetMoves`
- `targetTimeSeconds`
- `mechanics`
- `hints`
- optional `tileIds`
- optional `links`

Tiles that need identity, such as switches, pressure plates, doors, and portals, use `tileIds`. Relationships between those tiles use `links`:

```ts
links: [{ sourceId: 'plate-a', targetId: 'door-a' }]
```

This allows pressure plates and switches to control doors, and portals to define their paired destination.

## Hint System

Every level can define 1-3 hints.

The first hint is always available. Later hints can unlock when either condition is met:

- the player has failed or reset enough times
- the player has spent enough time in the current attempt

Example:

```ts
hints: [
  { text: 'Collect the key before committing to the lower door route.' },
  { text: 'The key sits on the upper lane; the door waits below it.', unlockAfterFailedResets: 1 },
]
```

Hints are meant to nudge the player toward a strategy without immediately solving the whole puzzle.

## Progress And Persistence

Puzzle Drift stores progress and settings in LocalStorage.

Storage keys:

- `puzzle-drift:save`
- `puzzle-drift:settings`

Saved progress includes:

- current level
- active run flag
- unlocked levels
- completed levels
- best moves per level
- best time per level
- stars per level
- level stats

Settings include:

- sound effects toggle
- music toggle
- reduced motion toggle
- high contrast flag
- selected theme

Resetting progress clears only saved progress. Settings are intentionally preserved.

## Scoring

Stars are awarded on completion:

- 1 star: complete the level
- 2 stars: complete under or at the target move count
- 3 stars: complete under or at the target move count and target time

Best moves and best time only update when the new result improves the saved value. Worse results never overwrite better scores.

## Testing

The test suite covers UI behavior, core movement logic, level validation, LocalStorage persistence, scoring, accessibility affordances, and final QA flows.

Primary test areas:

- app render and navigation
- start screen buttons
- level select locking, unlocking, completion state, and stars
- all 30 levels validating and rendering
- simple solver path checks for all levels
- movement in all directions
- collision with walls and bounds
- move counting
- completion detection
- scoring and best-stat preservation
- LocalStorage save/load behavior
- reset, undo, pause, retry, next level, and level select actions
- keys and locked doors
- switches and linked doors
- pressure plates and linked doors
- push blocks
- spike attempt resets
- ice sliding
- portals
- hint rendering and unlock conditions
- settings persistence and global theme/reduced-motion classes
- accessible button labels and completion status
- console-error smoke checks during common navigation
- Lucide React icon dependency and lack of backend dependencies

Run all tests with:

```bash
npm run test:run
```

## Accessibility Notes

- Icon buttons use accessible names through `aria-label`
- HUD sections use semantic labels
- The board uses grid/gridcell roles
- Completion state is announced through a live status region
- Reduced motion disables major movement, hazard, and completion animations
- Touch controls are sized for mobile use
- Keyboard focus states are visible

## No Backend

Puzzle Drift is intentionally frontend-only. It does not depend on Express, databases, API servers, or server-side persistence. All state is held in React during play and persisted through LocalStorage between sessions.

## Known Limitations

- Sound and music settings are currently persisted toggles; no audio assets are implemented yet.
- The app does not sync progress across browsers or devices.
- Level hints are static level data rather than adaptive solver-generated hints.
- Some tile types are defined for future expansion but are not active mechanics yet.
- There is no backend, account system, leaderboard, or cloud save.

## Development Notes

- Keep icon usage limited to Lucide React.
- Keep game logic testable through pure functions in `src/logic`.
- Prefer adding mechanics to the type model, movement logic, level validation, and tests together.
- Keep levels solvable and validate the full level pack after level changes.
- Respect reduced motion for new animations.
- Avoid introducing backend dependencies unless the project direction explicitly changes.
