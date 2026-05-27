import { Footprints, ListOrdered, Pause, RotateCcw, Timer, Undo2, UserRound } from 'lucide-react';
import type { Level, TileType } from '../types/game';

type GameBoardProps = {
  level: Level;
  moves: number;
  elapsedSeconds: number;
  onLevelSelect: () => void;
  onPause: () => void;
  onReset: () => void;
  onUndo: () => void;
};

const TILE_LABELS: Record<TileType, string> = {
  cracked: 'Cracked tile',
  door: 'Door',
  exit: 'Exit',
  floor: 'Floor',
  fog: 'Fog',
  ice: 'Ice',
  key: 'Key',
  laserEmitter: 'Laser emitter',
  laserReceiver: 'Laser receiver',
  mirror: 'Mirror',
  oneWay: 'One-way tile',
  portal: 'Portal',
  pressurePlate: 'Pressure plate',
  pushBlock: 'Push block',
  spike: 'Spike',
  switch: 'Switch',
  wall: 'Wall',
};

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function GameBoard({
  level,
  moves,
  elapsedSeconds,
  onLevelSelect,
  onPause,
  onReset,
  onUndo,
}: GameBoardProps) {
  return (
    <section className="game-board-shell" aria-labelledby="game-board-title">
      <header className="game-hud">
        <div className="game-hud-title">
          <p className="eyebrow">level {level.id}</p>
          <h2 id="game-board-title">{level.name}</h2>
        </div>

        <dl className="hud-stats" aria-label="Game stats">
          <div>
            <dt>
              <Footprints aria-hidden="true" />
              Moves
            </dt>
            <dd>{moves}</dd>
          </div>
          <div>
            <dt>
              <Timer aria-hidden="true" />
              Timer
            </dt>
            <dd>{formatElapsedTime(elapsedSeconds)}</dd>
          </div>
        </dl>

        <div className="hud-actions" aria-label="Game controls">
          <button type="button" className="icon-button" onClick={onReset} aria-label="Reset level">
            <RotateCcw aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" onClick={onUndo} aria-label="Undo move">
            <Undo2 aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" onClick={onPause} aria-label="Pause game">
            <Pause aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onLevelSelect}
            aria-label="Open level select"
          >
            <ListOrdered aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="objective-panel">
        <p className="eyebrow">objective</p>
        <p>{level.description}</p>
      </div>

      <div
        className="game-board"
        role="grid"
        aria-label={`${level.name} board`}
        style={{
          gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))`,
        }}
      >
        {level.grid.map((row, y) =>
          row.map((tile, x) => {
            const hasPlayer = level.playerStart.x === x && level.playerStart.y === y;

            return (
              <div
                aria-label={`${TILE_LABELS[tile]} at ${x}, ${y}`}
                className={`board-tile tile-${tile}`}
                data-testid="board-tile"
                key={`${x}-${y}`}
                role="gridcell"
              >
                {hasPlayer ? (
                  <span
                    aria-label={`Player at ${x}, ${y}`}
                    className="player-avatar"
                    data-testid="player-avatar"
                  >
                    <UserRound aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </section>
  );
}
