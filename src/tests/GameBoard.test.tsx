import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameBoard } from '../components/GameBoard';
import { LEVELS } from '../data/levels';

const level = LEVELS[0];
const noop = vi.fn();

describe('GameBoard', () => {
  it('renders the correct number of tiles', () => {
    render(
      <GameBoard
        elapsedSeconds={0}
        level={level}
        moves={0}
        onLevelSelect={noop}
        onPause={noop}
        onReset={noop}
        onUndo={noop}
        playerPosition={level.playerStart}
      />,
    );

    expect(screen.getAllByTestId('board-tile')).toHaveLength(level.width * level.height);
  });

  it('renders the player at the start position', () => {
    render(
      <GameBoard
        elapsedSeconds={0}
        level={level}
        moves={0}
        onLevelSelect={noop}
        onPause={noop}
        onReset={noop}
        onUndo={noop}
        playerPosition={level.playerStart}
      />,
    );

    expect(
      screen.getByLabelText(`Player at ${level.playerStart.x}, ${level.playerStart.y}`),
    ).toBeInTheDocument();
  });

  it('renders HUD level name, timer, and move counter', () => {
    render(
      <GameBoard
        elapsedSeconds={75}
        level={level}
        moves={8}
        onLevelSelect={noop}
        onPause={noop}
        onReset={noop}
        onUndo={noop}
        playerPosition={level.playerStart}
      />,
    );

    expect(screen.getByRole('heading', { name: level.name })).toBeInTheDocument();
    expect(screen.getByText('1:15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
