import { Footprints, KeyRound, ListOrdered, Pause, RotateCcw, Timer, Undo2, UserRound } from 'lucide-react';
import { getEffectiveTileAt } from '../logic/movement';
import type { GameState, Level, Position, TileType } from '../types/game';

type GameBoardProps = {
  level: Level;
  moves: number;
  elapsedSeconds: number;
  gameState: GameState;
  hazardFlash: boolean;
  playerPosition: Position;
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

function getPortalPairClass(level: Level, x: number, y: number) {
  const portalId = level.tileIds?.[`${x},${y}`];
  const linkIndex = level.links?.findIndex(
    (link) => link.sourceId === portalId || link.targetId === portalId,
  );

  return linkIndex !== undefined && linkIndex >= 0 ? ` portal-pair-${(linkIndex % 4) + 1}` : '';
}

export function GameBoard({
  level,
  moves,
  elapsedSeconds,
  gameState,
  hazardFlash,
  playerPosition,
  onLevelSelect,
  onPause,
  onReset,
  onUndo,
}: GameBoardProps) {
  return (
    <section
      className={`game-board-shell${hazardFlash ? ' hazard-flash' : ''}`}
      aria-labelledby="game-board-title"
      data-testid="game-board-shell"
    >
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
            <dd aria-label={`${moves} moves`}>{moves}</dd>
          </div>
          <div>
            <dt>
              <Timer aria-hidden="true" />
              Timer
            </dt>
            <dd aria-label={`${formatElapsedTime(elapsedSeconds)} elapsed`}>{formatElapsedTime(elapsedSeconds)}</dd>
          </div>
          <div>
            <dt>
              <KeyRound aria-hidden="true" />
              Keys
            </dt>
            <dd aria-label={`${gameState.collectedKeys} keys`}>{gameState.collectedKeys}</dd>
          </div>
          <div>
            <dt>Plates</dt>
            <dd aria-label={`${gameState.activePressurePlateIds.length} active plates`}>
              {gameState.activePressurePlateIds.length}
            </dd>
          </div>
          <div>
            <dt>Switches</dt>
            <dd aria-label={`${gameState.activeSwitchIds.length} active switches`}>
              {gameState.activeSwitchIds.length}
            </dd>
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
            const hasPlayer = playerPosition.x === x && playerPosition.y === y;
            const effectiveTile = getEffectiveTileAt(level, gameState, { x, y }) ?? tile;

            return (
              <div
                aria-label={`${TILE_LABELS[effectiveTile]} at ${x}, ${y}`}
                className={`board-tile tile-${effectiveTile}${
                  effectiveTile === 'pressurePlate' &&
                  gameState.activePressurePlateIds.includes(level.tileIds?.[`${x},${y}`] ?? '')
                    ? ' tile-active'
                    : ''
                }${
                  effectiveTile === 'switch' &&
                  gameState.activeSwitchIds.includes(level.tileIds?.[`${x},${y}`] ?? '')
                    ? ' tile-active'
                    : ''
                }${effectiveTile === 'portal' ? getPortalPairClass(level, x, y) : ''}`}
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
