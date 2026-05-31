import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameBoard } from '../components/GameBoard';
import { LEVELS } from '../data/levels';
import { createInitialGameState } from '../logic/movement';

const level = LEVELS[0];
const noop = vi.fn();
const gameState = createInitialGameState(level);
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
      unlockedHintCount={1}
      {...overrides}
    />,
  );

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
    expect(within(controls).getByRole('button', { name: /show hints/i })).toBeInTheDocument();
  });

  it('renders objective text once in a separate section below the HUD', () => {
    renderBoard();

    const objective = screen.getByRole('region', { name: /level objective/i });

    expect(within(objective).getByRole('heading', { name: /mission/i })).toBeInTheDocument();
    expect(objective).toHaveTextContent(level.description);
    expect(screen.getAllByText(level.description)).toHaveLength(1);
  });

  it('keeps hints collapsed by default and exposes a quick dismiss control when open', () => {
    const { rerender } = renderBoard();

    expect(screen.queryByRole('region', { name: /level hints/i })).not.toBeInTheDocument();

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
        unlockedHintCount={1}
      />,
    );

    const hints = screen.getByRole('region', { name: /level hints/i });

    expect(within(hints).getByRole('button', { name: /close hints/i })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /show hints/i })).toBeInTheDocument();
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

    await user.hover(screen.getByRole('button', { name: /show hints/i }));
    expect(screen.getByRole('tooltip', { name: 'Show Hints' })).toBeInTheDocument();

    await user.unhover(screen.getByRole('button', { name: /show hints/i }));
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
        unlockedHintCount={1}
      />,
    );

    await user.hover(screen.getByRole('button', { name: /hide hints/i }));
    expect(screen.getByRole('tooltip', { name: 'Hide Hints' })).toBeInTheDocument();
  });

  it('removes tooltip animation when reduced motion is enabled', async () => {
    const user = userEvent.setup();
    renderBoard({ reducedMotion: true });

    await user.hover(screen.getByRole('button', { name: /level select/i }));
    expect(screen.getByRole('tooltip', { name: 'Level Select' })).toHaveClass('no-motion');
  });

  it('renders the unlocked level hints when the hint panel is open', () => {
    renderBoard({ isHintPanelOpen: true, unlockedHintCount: 1 });

    expect(screen.getByRole('region', { name: /level hints/i })).toBeInTheDocument();
    expect(screen.getByText(level.hints[0].text)).toBeInTheDocument();
  });
});
