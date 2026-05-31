import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  CircleDot,
  Compass,
  DoorClosed,
  DoorOpen,
  Footprints,
  KeyRound,
  Lightbulb,
  ListOrdered,
  Pause,
  RotateCcw,
  Snowflake,
  ToggleRight,
  Target,
  Timer,
  TriangleAlert,
  Undo2,
  X,
} from 'lucide-react';
import { getEffectiveTileAt } from '../logic/movement';
import type { Direction, GameState, Level, Position, TileType } from '../types/game';
import { Tooltip } from './Tooltip';

type GameBoardProps = {
  level: Level;
  moves: number;
  elapsedSeconds: number;
  gameState: GameState;
  hazardFlash: boolean;
  isHintPanelOpen: boolean;
  isPaused?: boolean;
  reducedMotion: boolean;
  animationClass?: string;
  playerPosition: Position;
  unlockedHintCount: number;
  onLevelSelect: () => void;
  onToggleHints: () => void;
  onMove: (direction: Direction) => void;
  onPause: () => void;
  onReset: () => void;
  onUndo: () => void;
};

const TILE_LABELS: Record<TileType, string> = {
  cracked: 'Cracked tile',
  door: 'Locked door',
  exit: 'Exit',
  floor: 'Floor',
  fog: 'Fog',
  ice: 'Ice',
  key: 'Collectible key',
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

function positionsMatch(first: Position, second: Position) {
  return first.x === second.x && first.y === second.y;
}

function isActiveTile(level: Level, gameState: GameState, x: number, y: number, tile: TileType) {
  const tileId = level.tileIds?.[`${x},${y}`] ?? '';

  if (tile === 'pressurePlate') {
    return gameState.activePressurePlateIds.includes(tileId);
  }

  if (tile === 'switch') {
    return gameState.activeSwitchIds.includes(tileId);
  }

  return false;
}

function getRenderedTile(tile: TileType, effectiveTile: TileType) {
  return tile === 'door' && effectiveTile === 'floor' ? 'door' : effectiveTile;
}

function getTileLabel(tile: TileType, renderedTile: TileType, effectiveTile: TileType) {
  if (tile === 'door' && effectiveTile === 'floor') {
    return 'Opened door';
  }

  return TILE_LABELS[renderedTile];
}

function renderObjectIcon(tile: TileType, isActive: boolean, isOpenedDoor: boolean) {
  switch (tile) {
    case 'door':
      return isOpenedDoor ? <DoorOpen aria-hidden="true" /> : <DoorClosed aria-hidden="true" />;
    case 'ice':
      return <Snowflake aria-hidden="true" />;
    case 'key':
      return <KeyRound aria-hidden="true" />;
    case 'pressurePlate':
      return <CircleDot aria-hidden="true" />;
    case 'pushBlock':
      return <Box aria-hidden="true" />;
    case 'spike':
      return <TriangleAlert aria-hidden="true" />;
    case 'switch':
      return <ToggleRight aria-hidden="true" className={isActive ? 'object-icon-active' : ''} />;
    default:
      return null;
  }
}

export function GameBoard({
  level,
  moves,
  elapsedSeconds,
  gameState,
  hazardFlash,
  isHintPanelOpen,
  isPaused = false,
  reducedMotion,
  animationClass = '',
  playerPosition,
  unlockedHintCount,
  onLevelSelect,
  onToggleHints,
  onMove,
  onPause,
  onReset,
  onUndo,
}: GameBoardProps) {
  const shouldShowKeys = level.mechanics.includes('key') || gameState.collectedKeys > 0;

  return (
    <section
      className={`game-board-shell${hazardFlash ? ' hazard-flash' : ''}${
        animationClass ? ` ${animationClass}` : ''
      }`}
      aria-labelledby="game-board-title"
      data-testid="game-board-shell"
    >
      <header className="game-hud" aria-label="Game heads-up display">
        <div className="game-hud-title">
          <h2 id="game-board-title">{level.name}</h2>
          <span className="level-badge">Level {level.id}</span>
        </div>

        <dl className="hud-stats" aria-label="Game status">
          <div className="hud-stat">
            <dt>
              <Footprints aria-hidden="true" />
              Moves
            </dt>
            <dd aria-label={`${moves} moves`}>{moves}</dd>
          </div>
          <div className="hud-stat">
            <dt>
              <Timer aria-hidden="true" />
              Timer
            </dt>
            <dd aria-label={`${formatElapsedTime(elapsedSeconds)} elapsed`}>{formatElapsedTime(elapsedSeconds)}</dd>
          </div>
          {shouldShowKeys ? (
            <div className="hud-stat">
              <dt>
                <KeyRound aria-hidden="true" />
                Keys
              </dt>
              <dd aria-label={`${gameState.collectedKeys} keys`}>{gameState.collectedKeys}</dd>
            </div>
          ) : null}
        </dl>

        <nav className="hud-actions" aria-label="Game controls">
          <Tooltip content="Undo Move" disabled={isPaused} reducedMotion={reducedMotion}>
            <button type="button" className="icon-button" onClick={onUndo} aria-label="Undo move" disabled={isPaused}>
              <Undo2 aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="Restart Level" disabled={isPaused} reducedMotion={reducedMotion}>
            <button type="button" className="icon-button" onClick={onReset} aria-label="Reset level" disabled={isPaused}>
              <RotateCcw aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="Pause Game" disabled={isPaused} reducedMotion={reducedMotion}>
            <button type="button" className="icon-button" onClick={onPause} aria-label="Pause game" disabled={isPaused}>
              <Pause aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="Level Select" disabled={isPaused} reducedMotion={reducedMotion}>
            <button
              type="button"
              className="icon-button"
              onClick={onLevelSelect}
              aria-label="Open level select"
              disabled={isPaused}
            >
              <ListOrdered aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={isHintPanelOpen ? 'Hide Hints' : 'Show Hints'} disabled={isPaused} reducedMotion={reducedMotion}>
            <button
              type="button"
              className="icon-button"
              onClick={onToggleHints}
              aria-label={isHintPanelOpen ? 'Hide hints' : 'Show hints'}
              aria-expanded={isHintPanelOpen}
              aria-controls="hint-panel"
              disabled={isPaused}
            >
              <Lightbulb aria-hidden="true" />
            </button>
          </Tooltip>
        </nav>
      </header>

      <section className="objective-panel" aria-label="Level objective">
        <div className="objective-heading">
          <Target aria-hidden="true" />
          <h3>Mission</h3>
        </div>
        <p>{level.description}</p>
      </section>

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
            const renderedTile = getRenderedTile(tile, effectiveTile);
            const isActive = isActiveTile(level, gameState, x, y, renderedTile);
            const isOpenedDoor = tile === 'door' && effectiveTile === 'floor';
            const objectIcon = renderObjectIcon(renderedTile, isActive, isOpenedDoor);
            const wasKeyCollected =
              tile === 'key' && gameState.collectedKeyPositions.some((position) => positionsMatch(position, { x, y }));

            return (
              <div
                aria-label={`${getTileLabel(tile, renderedTile, effectiveTile)} at ${x}, ${y}`}
                className={`board-tile tile-${renderedTile}${
                  objectIcon ? ' tile-object' : ''
                }${isActive ? ' tile-active' : ''}${isOpenedDoor ? ' tile-opened' : ''}${
                  wasKeyCollected ? ' tile-key-collected' : ''
                }${renderedTile === 'portal' ? getPortalPairClass(level, x, y) : ''}`}
                data-testid="board-tile"
                key={`${x}-${y}`}
                role="gridcell"
              >
                {objectIcon ? (
                  <span className="tile-object-icon" data-testid={`${isOpenedDoor ? 'opened-door' : renderedTile}-icon`}>
                    {objectIcon}
                  </span>
                ) : null}
                {hasPlayer ? (
                  <span
                    aria-label={`Player at ${x}, ${y}`}
                    className={`player-avatar${animationClass.includes('player-move') ? ' player-moving' : ''}`}
                    data-testid="player-avatar"
                  >
                    <Compass aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      {isHintPanelOpen ? (
        <section className="hint-panel" id="hint-panel" aria-label="Level hints">
          <div className="hint-panel-header">
            <Lightbulb aria-hidden="true" />
            <div>
              <p className="eyebrow">hints</p>
              <h3>Signal Boost</h3>
            </div>
            <button type="button" className="icon-button" onClick={onToggleHints} aria-label="Close hints">
              <X aria-hidden="true" />
            </button>
          </div>
          <ol>
            {level.hints.slice(0, unlockedHintCount).map((hint) => (
              <li key={hint.text}>{hint.text}</li>
            ))}
          </ol>
          {unlockedHintCount < level.hints.length ? (
            <p className="hint-locked" aria-live="polite">
              {level.hints.length - unlockedHintCount} more{' '}
              {level.hints.length - unlockedHintCount === 1 ? 'hint' : 'hints'} locked.
            </p>
          ) : null}
        </section>
      ) : null}

      <nav className="direction-controls" aria-label="Directional controls">
        <button type="button" className="direction-button direction-up" onClick={() => onMove('up')} aria-label="Move up" disabled={isPaused}>
          <ArrowUp aria-hidden="true" />
        </button>
        <button type="button" className="direction-button direction-left" onClick={() => onMove('left')} aria-label="Move left" disabled={isPaused}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <button type="button" className="direction-button direction-right" onClick={() => onMove('right')} aria-label="Move right" disabled={isPaused}>
          <ArrowRight aria-hidden="true" />
        </button>
        <button type="button" className="direction-button direction-down" onClick={() => onMove('down')} aria-label="Move down" disabled={isPaused}>
          <ArrowDown aria-hidden="true" />
        </button>
      </nav>
    </section>
  );
}
