import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { chooseSafeHintPlacement, GameBoard } from '../components/GameBoard';
import { LEVELS } from '../data/levels';
import { createInitialGameState } from '../logic/movement';

const level = LEVELS[0];
const keyline = LEVELS[2];
const switchPrimer = LEVELS[5];
const plateHold = LEVELS[7];
const portalPair = LEVELS[15];
const finalDrift = LEVELS[29];
const noop = vi.fn();
const gameState = createInitialGameState(level);
const rect = (left: number, top: number, width: number, height: number) => ({
  bottom: top + height,
  height,
  left,
  right: left + width,
  top,
  width,
});
const renderBoard = (overrides = {}) =>
  render(
    <GameBoard
      elapsedSeconds={0}
      gameState={gameState}
      hazardFlash={false}
      isHintPanelOpen={false}
      level={level}
      moves={0}
      reducedMotion={false}
      onLevelSelect={noop}
      onMove={noop}
      onPause={noop}
      onReset={noop}
      onToggleHints={noop}
      onUndo={noop}
      playerPosition={level.playerStart}
      {...overrides}
    />,
  );

const renderKeyline = (overrides = {}) => {
  const keylineState = createInitialGameState(keyline);

  return renderBoard({
    gameState: keylineState,
    level: keyline,
    playerPosition: keyline.playerStart,
    ...overrides,
  });
};

const renderLevel = (targetLevel: typeof LEVELS[number], overrides = {}) => {
  const targetState = createInitialGameState(targetLevel);

  return renderBoard({
    gameState: targetState,
    level: targetLevel,
    playerPosition: targetLevel.playerStart,
    ...overrides,
  });
};

describe('chooseSafeHintPlacement', () => {
  const containerRect = rect(0, 0, 400, 400);
  const overlaySize = { height: 100, width: 100 };

  it('prefers the corner furthest from the player', () => {
    expect(
      chooseSafeHintPlacement({
        containerRect,
        importantRects: [],
        overlaySize,
        playerRect: rect(20, 20, 40, 40),
      }),
    ).toBe('bottom-right');
  });

  it('chooses another corner when the preferred corner overlaps a protected tile', () => {
    expect(
      chooseSafeHintPlacement({
        containerRect,
        importantRects: [rect(280, 280, 80, 80)],
        overlaySize,
        playerRect: rect(20, 20, 40, 40),
      }),
    ).toBe('top-right');
  });

  it('falls back to the HUD dock when every corner overlaps protected gameplay', () => {
    expect(
      chooseSafeHintPlacement({
        containerRect,
        importantRects: [
          rect(0, 0, 130, 130),
          rect(270, 0, 130, 130),
          rect(0, 270, 130, 130),
          rect(270, 270, 130, 130),
        ],
        overlaySize,
        playerRect: rect(185, 185, 30, 30),
      }),
    ).toBe('hud-docked');
  });
});

describe('GameBoard', () => {
  it('renders the correct number of tiles', () => {
    renderBoard();

    expect(screen.getAllByTestId('board-tile')).toHaveLength(level.width * level.height);
  });

  it('renders the player at the start position', () => {
    renderBoard();

    expect(
      screen.getByLabelText(`Player at ${level.playerStart.x}, ${level.playerStart.y}`),
    ).toBeInTheDocument();
  });

  it('renders HUD level name, timer, and move counter', () => {
    renderBoard({ elapsedSeconds: 75, moves: 8 });

    expect(screen.getByRole('heading', { name: level.name })).toBeInTheDocument();
    expect(screen.getByText(`Level ${level.id}`)).toBeInTheDocument();
    expect(screen.getByLabelText('8 moves')).toBeInTheDocument();
    expect(screen.getByLabelText('1:15 elapsed')).toBeInTheDocument();
  });

  it('renders available HUD action buttons with accessible labels', () => {
    renderBoard();

    const controls = screen.getByLabelText('Game controls');

    expect(within(controls).getByRole('button', { name: /undo move/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /reset level/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /pause game/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /open level select/i })).toBeInTheDocument();
    expect(within(controls).getByRole('button', { name: /open puzzle assist/i })).toBeInTheDocument();
  });

  it('renders objective text once in a separate section below the HUD', () => {
    renderBoard();

    const objective = screen.getByRole('region', { name: /level objective/i });

    expect(within(objective).getByRole('heading', { name: /mission/i })).toBeInTheDocument();
    expect(objective).toHaveTextContent(level.description);
    expect(screen.getAllByText(level.description)).toHaveLength(1);
  });

  it('keeps puzzle assist collapsed by default and exposes a quick dismiss control when open', () => {
    const { rerender } = renderBoard();

    expect(screen.queryByRole('region', { name: /puzzle assist/i })).not.toBeInTheDocument();

    rerender(
      <GameBoard
        elapsedSeconds={0}
        gameState={gameState}
        hazardFlash={false}
        isHintPanelOpen={true}
        level={level}
        moves={0}
        reducedMotion={false}
        onLevelSelect={noop}
        onMove={noop}
        onPause={noop}
        onReset={noop}
        onToggleHints={noop}
        onUndo={noop}
        playerPosition={level.playerStart}
      />,
    );

    const hints = screen.getByRole('region', { name: /puzzle assist/i });
    const board = screen.getByRole('grid', { name: `${level.name} board` });
    const assistLayout = board.parentElement;

    expect(within(hints).getByRole('button', { name: /close puzzle assist/i })).toBeInTheDocument();
    expect(assistLayout).toHaveClass('game-board-assist-layout');
    expect(assistLayout).toContainElement(hints);
    expect(hints).toHaveClass('assist-drawer');
    expect(hints).not.toHaveClass('hint-overlay');
  });

  it('renders directional buttons for touch controls', () => {
    renderBoard();

    expect(screen.getByRole('button', { name: /move up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move down/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move left/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move right/i })).toBeInTheDocument();
  });

  it('icon buttons have aria labels', () => {
    renderBoard();

    expect(screen.getByRole('button', { name: /reset level/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo move/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open level select/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open puzzle assist/i })).toBeInTheDocument();
  });

  it('shows and hides HUD tooltips on hover', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.hover(screen.getByRole('button', { name: /undo move/i }));
    expect(screen.getByRole('tooltip', { name: 'Undo Move' })).toBeInTheDocument();

    await user.unhover(screen.getByRole('button', { name: /undo move/i }));
    expect(screen.queryByRole('tooltip', { name: 'Undo Move' })).not.toBeInTheDocument();
  });

  it('shows and hides HUD tooltips on keyboard focus', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.tab();
    expect(screen.getByRole('tooltip', { name: 'Undo Move' })).toBeInTheDocument();

    await user.tab();
    expect(screen.queryByRole('tooltip', { name: 'Undo Move' })).not.toBeInTheDocument();
    expect(screen.getByRole('tooltip', { name: 'Restart Level' })).toBeInTheDocument();
  });

  it('closes HUD tooltips with Escape', async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.hover(screen.getByRole('button', { name: /pause game/i }));
    expect(screen.getByRole('tooltip', { name: 'Pause Game' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip', { name: 'Pause Game' })).not.toBeInTheDocument();
  });

  it('updates the hint tooltip dynamically', async () => {
    const user = userEvent.setup();
    const { rerender } = renderBoard();

    await user.hover(screen.getByRole('button', { name: /open puzzle assist/i }));
    expect(screen.getByRole('tooltip', { name: 'Open Assist' })).toBeInTheDocument();

    await user.unhover(screen.getByRole('button', { name: /open puzzle assist/i }));
    rerender(
      <GameBoard
        elapsedSeconds={0}
        gameState={gameState}
        hazardFlash={false}
        isHintPanelOpen={true}
        level={level}
        moves={0}
        reducedMotion={false}
        onLevelSelect={noop}
        onMove={noop}
        onPause={noop}
        onReset={noop}
        onToggleHints={noop}
        onUndo={noop}
        playerPosition={level.playerStart}
      />,
    );

    await user.hover(within(screen.getByLabelText('Game controls')).getByRole('button', { name: /close puzzle assist/i }));
    expect(screen.getByRole('tooltip', { name: 'Close Assist' })).toBeInTheDocument();
  });

  it('removes tooltip animation when reduced motion is enabled', async () => {
    const user = userEvent.setup();
    renderBoard({ reducedMotion: true });

    await user.hover(screen.getByRole('button', { name: /level select/i }));
    expect(screen.getByRole('tooltip', { name: 'Level Select' })).toHaveClass('no-motion');
  });

  it('renders tiered puzzle assist choices when the hint panel is open', async () => {
    const user = userEvent.setup();
    renderBoard({ isHintPanelOpen: true });

    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
    expect(screen.getByText(/choose your help level/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 1 direction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 2 mechanic/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /tier 3 route/i })).toBeDisabled();
    expect(screen.queryByText(level.hints[0].text)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tier 1 direction/i }));

    expect(screen.getByText(level.hints[0].text)).toBeInTheDocument();
  });

  it('unlocks hint tiers by time or failed attempts', async () => {
    const user = userEvent.setup();
    const { rerender } = renderBoard({ elapsedSeconds: 59, failedAttemptCount: 1, isHintPanelOpen: true });

    expect(screen.getByRole('button', { name: /tier 2 mechanic/i })).toBeDisabled();

    rerender(
      <GameBoard
        elapsedSeconds={60}
        failedAttemptCount={1}
        gameState={gameState}
        hazardFlash={false}
        isHintPanelOpen={true}
        level={level}
        moves={0}
        reducedMotion={false}
        onLevelSelect={noop}
        onMove={noop}
        onPause={noop}
        onReset={noop}
        onToggleHints={noop}
        onUndo={noop}
        playerPosition={level.playerStart}
      />,
    );

    expect(screen.getByRole('button', { name: /tier 2 mechanic/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /tier 3 route/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /tier 2 mechanic/i }));
    expect(screen.getByText(level.hints[1].text)).toBeInTheDocument();

    rerender(
      <GameBoard
        elapsedSeconds={0}
        failedAttemptCount={5}
        gameState={gameState}
        hazardFlash={false}
        isHintPanelOpen={true}
        level={level}
        moves={0}
        reducedMotion={false}
        onLevelSelect={noop}
        onMove={noop}
        onPause={noop}
        onReset={noop}
        onToggleHints={noop}
        onUndo={noop}
        playerPosition={level.playerStart}
      />,
    );

    expect(screen.getByRole('button', { name: /tier 3 route/i })).toBeEnabled();
  });

  it('shows tier 4 only on late-game levels and unlocks it later', async () => {
    const user = userEvent.setup();

    const { unmount } = renderBoard({ isHintPanelOpen: true });
    expect(screen.queryByRole('button', { name: /tier 4/i })).not.toBeInTheDocument();

    unmount();
    const { rerender } = renderLevel(finalDrift, { elapsedSeconds: 179, failedAttemptCount: 7, isHintPanelOpen: true });

    expect(screen.getByRole('button', { name: /tier 4 plan/i })).toBeDisabled();

    rerender(
      <GameBoard
        elapsedSeconds={180}
        failedAttemptCount={7}
        gameState={createInitialGameState(finalDrift)}
        hazardFlash={false}
        isHintPanelOpen={true}
        level={finalDrift}
        moves={0}
        reducedMotion={false}
        onLevelSelect={noop}
        onMove={noop}
        onPause={noop}
        onReset={noop}
        onToggleHints={noop}
        onUndo={noop}
        playerPosition={finalDrift.playerStart}
      />,
    );

    await user.click(screen.getByRole('button', { name: /tier 4 plan/i }));

    expect(screen.getByText(finalDrift.hints[3].text)).toBeInTheDocument();
  });

  it('only shows visual hints after the player explicitly requests them', async () => {
    const user = userEvent.setup();
    renderKeyline({ isHintPanelOpen: true });

    const lockedDoor = screen.getByLabelText('Locked door at 3, 3');

    expect(lockedDoor).not.toHaveClass('visual-hint-tile');

    await user.click(screen.getByRole('button', { name: /show visual hint/i }));

    expect(lockedDoor).toHaveClass('visual-hint-tile');
    expect(lockedDoor).toHaveClass('visual-hint-pulse-1');
    expect(screen.getByLabelText('Player at 1, 3')).not.toHaveClass('visual-hint-tile');
  });

  it('visually hints portal pairs without drawing a route', async () => {
    const user = userEvent.setup();
    renderLevel(portalPair, { isHintPanelOpen: true });

    await user.click(screen.getByRole('button', { name: /show visual hint/i }));

    expect(screen.getByLabelText('Portal at 3, 1')).toHaveClass('visual-hint-tile');
    expect(screen.getByLabelText('Portal at 5, 5')).toHaveClass('visual-hint-tile');
    expect(screen.getByLabelText('Floor at 2, 1')).not.toHaveClass('visual-hint-tile');
  });

  it('visually hints switch-linked and pressure-plate-linked gates', async () => {
    const user = userEvent.setup();
    const { unmount } = renderLevel(switchPrimer, { isHintPanelOpen: true });

    await user.click(screen.getByRole('button', { name: /show visual hint/i }));
    expect(screen.getByLabelText('Locked door at 6, 1')).toHaveClass('visual-hint-tile');

    unmount();
    renderLevel(plateHold, { isHintPanelOpen: true });

    await user.click(screen.getByRole('button', { name: /show visual hint/i }));
    expect(screen.getByLabelText('Locked door at 6, 1')).toHaveClass('visual-hint-tile');
  });

  it('uses a static visual hint state when reduced motion is enabled', async () => {
    const user = userEvent.setup();
    renderKeyline({ isHintPanelOpen: true, reducedMotion: true });

    await user.click(screen.getByRole('button', { name: /show visual hint/i }));

    expect(screen.getByLabelText('Locked door at 3, 3')).toHaveClass('visual-hint-static');
  });

  it('clears visual hint highlighting after a short window', () => {
    vi.useFakeTimers();

    try {
      renderKeyline({ isHintPanelOpen: true });

      fireEvent.click(screen.getByRole('button', { name: /show visual hint/i }));

      const lockedDoor = screen.getByLabelText('Locked door at 3, 3');

      expect(lockedDoor).toHaveClass('visual-hint-tile');

      act(() => {
        vi.advanceTimersByTime(2600);
      });

      expect(lockedDoor).not.toHaveClass('visual-hint-tile');
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders a contextual assist nudge without opening the full panel', () => {
    renderBoard({ hintNudge: { message: 'You are circling the same few tiles.' } });

    const nudge = screen.getByRole('complementary', { name: /puzzle assist nudge/i });
    const hud = screen.getByLabelText('Game heads-up display');

    expect(nudge).toBeInTheDocument();
    expect(hud).toContainElement(nudge);
    expect(nudge).not.toHaveClass('hint-overlay');
    expect(screen.getByText(/need a nudge/i)).toBeInTheDocument();
    expect(screen.getByText(/circling the same few tiles/i)).toBeInTheDocument();
    expect(within(nudge).getByRole('button', { name: /view hint/i })).toBeInTheDocument();
    expect(within(nudge).getByRole('button', { name: /dismiss assist nudge/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /puzzle assist/i })).not.toBeInTheDocument();
  });

  it('renders key and door Lucide object icons with clear labels', () => {
    renderKeyline();

    expect(screen.getByLabelText('Collectible key at 3, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 3, 3')).toBeInTheDocument();
    expect(screen.getByTestId('key-icon').querySelector('.lucide-key-round')).toBeInTheDocument();
    expect(screen.getByTestId('door-icon').querySelector('.lucide-door-closed')).toBeInTheDocument();
  });

  it('renders opened doors differently from locked doors', () => {
    const openedState = {
      ...createInitialGameState(keyline),
      doorsOpenedThisAttempt: 1,
      openedDoorPositions: [{ x: 3, y: 3 }],
    };

    renderKeyline({ gameState: openedState });

    const openedDoor = screen.getByLabelText('Opened door at 3, 3');

    expect(openedDoor).toHaveClass('tile-opened');
    expect(screen.getByTestId('opened-door-icon').querySelector('.lucide-door-open')).toBeInTheDocument();
  });

  it('renders collected keys as floor while preserving the pickup animation hook', () => {
    const collectedState = {
      ...createInitialGameState(keyline),
      collectedKeyPositions: [{ x: 3, y: 1 }],
      keysCollectedThisAttempt: 1,
    };

    renderKeyline({ animationClass: 'key-collect', gameState: collectedState });

    expect(screen.getByLabelText('Floor at 3, 1')).toHaveClass('tile-key-collected');
    expect(screen.getByTestId('game-board-shell')).toHaveClass('key-collect');
  });

  it('renders door unlock animation hook when a door opens', () => {
    const openedState = {
      ...createInitialGameState(keyline),
      doorsOpenedThisAttempt: 1,
      openedDoorPositions: [{ x: 3, y: 3 }],
    };

    renderKeyline({ animationClass: 'door-unlock', gameState: openedState });

    expect(screen.getByTestId('game-board-shell')).toHaveClass('door-unlock');
    expect(screen.getByLabelText('Opened door at 3, 3')).toHaveClass('tile-opened');
  });

  it('omits key and door animation classes when reduced motion state is supplied', () => {
    renderKeyline({ animationClass: '', reducedMotion: true });

    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('key-collect');
    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('door-unlock');
  });
});
