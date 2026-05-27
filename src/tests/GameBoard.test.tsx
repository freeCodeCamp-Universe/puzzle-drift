import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('1:15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
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

  it('renders the unlocked level hints when the hint panel is open', () => {
    renderBoard({ isHintPanelOpen: true, unlockedHintCount: 1 });

    expect(screen.getByRole('region', { name: /level hints/i })).toBeInTheDocument();
    expect(screen.getByText(level.hints[0].text)).toBeInTheDocument();
  });
});
