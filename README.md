# Puzzle Drift

Puzzle Drift is a fully client-side puzzle game built with React, TypeScript, and Vite.

Players move through compact grid puzzles, collect keys, open doors, push blocks, hold pressure plates, activate switches, avoid spikes, slide across ice, use portals, and replay levels for stronger star ratings.

There is no backend. Progress, settings, hint history, puzzle journal entries, and local developer analytics are stored in `localStorage`.

## Highlights

- 30 handcrafted campaign levels grouped into three chapters
- Level Select with campaign summary, chapter progression, current objective highlighting, and a collapsible Puzzle Journal
- Grid-based movement with keyboard and touch controls
- 1-3 star scoring based on completion, target moves, and target time
- Personal best tracking for moves and time
- Level completion screen with compact performance summary and optional details
- Puzzle Assist side drawer with tiered hints and visual hint highlights
- Hint Journal for revisiting unlocked hints
- Star Guide available from key game screens
- Local hint analytics report for debugging hint strength and level difficulty
- Settings for reduced motion, high contrast, hint nudges, focus mode, and restart confirmation
- Accessible dialogs, labeled controls, live regions, focus management, skip link support, and keyboard operation

## Campaign Structure

The campaign is organized around mechanic introduction, reinforcement, subversion, and mastery.

```text
Chapter 1: Training Grid
Levels 1-10
Readable onboarding puzzles with compact lessons and memorable first twists.

Chapter 2: Crystal Labyrinth
Levels 11-20
More deceptive, interconnected puzzles introducing spikes, ice, and portals.

Chapter 3: Rift Core
Levels 21-30
Dense multi-mechanic puzzles that ask players to decompose routes into stages.
```

Major mechanics are mapped through callback arcs in `CAMPAIGN_MECHANIC_CALLBACKS` inside `src/data/levels.ts`.

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

Run the full test suite once:

```bash
npm test -- run
```

Run tests in watch mode:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

## Controls

- Move: `Arrow Keys` or `WASD`
- Undo: `U` or `Backspace`
- Restart: `R`
- Pause: `P` or `Esc`
- Hints: `H`
- Next level or continue: `Spacebar` or `Enter`
- Touch: use the on-screen directional controls

Single-character shortcuts are suppressed inside editable fields and with modifier keys.

## Scoring

Stars are awarded when a level is completed:

- 1 star: complete the level
- 2 stars: complete within the target move count
- 3 stars: complete within the target move count and target time

Stars never decrease. Replaying can improve a saved star rating, best move count, or best time, but worse results do not overwrite better records.

## Puzzle Mechanics

Current playable mechanics:

- Floor: normal traversable tile
- Wall: blocks movement
- Exit: completes the level when requirements are satisfied
- Key: collectible item used to open locked doors
- Door: blocks movement unless opened by a key, switch, or pressure plate
- Switch: toggles linked doors
- Pressure plate: activates while the player or a block is on it
- Push block: movable block that can hold pressure plates
- Spike: fails the current attempt
- Ice: slides the player until the slide stops
- Portal: teleports the player to a linked portal

The tile type model also includes future-safe types such as `cracked`, `fog`, `oneWay`, `mirror`, `laserEmitter`, and `laserReceiver`, but those are not active campaign mechanics.

## Hints And Assist

Puzzle Assist is a side drawer so players can read hints while keeping the board visible.

Hint behavior:

- Levels 1-25 have three hint tiers.
- Levels 26-30 have four decomposition hints.
- Tier 1 is available immediately.
- Later tiers unlock through time, failed attempts, or saved unlocked hint state.
- Unlocked hints persist in `localStorage`.
- Hint nudges can appear in the HUD when enabled.
- Focus Mode suppresses automatic nudges while keeping manual Puzzle Assist available.
- Visual hint highlights can be requested explicitly.

The Hint Journal lets players revisit unlocked hints from the HUD, pause menu, and completion screen.

## Local Analytics

Hint analytics are stored locally only. There is no backend.

The debug report tracks:

- hint opens
- hint tiers used
- failures before hints
- completion after hints
- level-level hint usage and completion rates

Storage key:

- `puzzle-drift:hint-analytics`

## Progress And Persistence

Storage keys:

- `puzzle-drift:save`
- `puzzle-drift:settings`
- `puzzle-drift:hint-analytics`

Saved progress includes:

- current level
- unlocked and completed levels
- best moves and best times
- stars
- unlocked hint tiers
- level stats and puzzle journal data

Settings include:

- reduced motion
- high contrast
- hint nudges
- focus mode
- confirm restart

Resetting progress clears saved campaign data and preserves settings.

## Level Data

Levels are defined in `src/data/levels.ts`.

Each level includes:

- `id`
- `name`
- `description`
- optional `signature`
- `width`
- `height`
- `grid`
- `completionRequirements`
- `tileIds`
- `links`
- `playerStart`
- `targetMoves`
- `targetTimeSeconds`
- `mechanics`
- `hints`

Example link:

```ts
links: [{ sourceId: 'plate-a', targetId: 'door-a' }]
```

Switches and pressure plates can control linked doors. Portals use the same link model to define paired destinations.

## Project Structure

```text
src/
  components/
    GameBoard.tsx
    GameScreen.tsx
    HowToPlayDialog.tsx
    LevelSelectScreen.tsx
    SettingsDialog.tsx
    StarTooltip.tsx
    StartScreen.tsx
    Tooltip.tsx
  data/
    defaultSettings.ts
    initialSave.ts
    levels.ts
  hooks/
    useGameShortcuts.ts
    useLocalStorage.ts
    useModalAccessibility.ts
  logic/
    gameState.ts
    levelCompletion.ts
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
    chapterMilestones.ts
    hintAnalytics.ts
    hints.ts
    levelValidation.ts
    progressStorage.ts
    storage.ts
  App.tsx
  main.tsx
  styles.css
```

## Testing

The test suite covers:

- app navigation and UI flows
- keyboard shortcuts and focus behavior
- settings persistence and reset behavior
- level select campaign state
- puzzle journal rendering
- hint journals, hint analytics, and visual hints
- star scoring and personal best comparisons
- movement rules for every mechanic
- level validation and route solvability
- accessibility affordances for dialogs, controls, live regions, and reduced motion

Run all tests:

```bash
npm test -- run
```
