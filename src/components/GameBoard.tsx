import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
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
import type { ControlStyle, Direction, GameState, Level, Position, TileType } from '../types/game';
import { getHintTierStatus, isHintTierUnlocked } from '../utils/hints';
import { Tooltip } from './Tooltip';

type GameBoardProps = {
  level: Level;
  moves: number;
  elapsedSeconds: number;
  gameState: GameState;
  hazardFlash: boolean;
  failedAttemptCount?: number;
  isHintPanelOpen: boolean;
  hintNudge?: {
    message: string;
  } | null;
  unlockedHintTiers?: number[];
  isPaused?: boolean;
  reducedMotion: boolean;
  animationClass?: string;
  controlStyle: ControlStyle;
  playerPosition: Position;
  onLevelSelect: () => void;
  onDismissHintNudge?: () => void;
  onOpenHintJournal?: () => void;
  onSelectHintTier?: (tierNumber: number) => void;
  onToggleHints: () => void;
  onMove: (direction: Direction) => void;
  onPause: () => void;
  onReset: () => void;
  onUndo: () => void;
};

type SafeRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type OverlaySize = {
  width: number;
  height: number;
};

export type HintOverlayPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'hud-docked';

type HintOverlayCandidate = Exclude<HintOverlayPlacement, 'hud-docked'>;

type SafeHintPlacementOptions = {
  containerRect: SafeRect;
  importantRects: SafeRect[];
  overlaySize: OverlaySize;
  playerRect: SafeRect;
  safePadding?: number;
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

const SAFE_HINT_PADDING = 12;
const HINT_OVERLAY_CORNERS: HintOverlayCandidate[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const VISUAL_HINT_DURATION_MS = 2600;
const SWIPE_MIN_DISTANCE = 36;
const SWIPE_AXIS_DOMINANCE = 1.55;

function rectsOverlap(first: SafeRect, second: SafeRect, padding = 0) {
  return !(
    first.right + padding <= second.left ||
    first.left - padding >= second.right ||
    first.bottom + padding <= second.top ||
    first.top - padding >= second.bottom
  );
}

function getRectCenter(rect: SafeRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getCandidateRect(
  placement: HintOverlayCandidate,
  containerRect: SafeRect,
  overlaySize: OverlaySize,
  safePadding: number,
): SafeRect {
  const left = placement.endsWith('left')
    ? containerRect.left + safePadding
    : containerRect.right - overlaySize.width - safePadding;
  const top = placement.startsWith('top')
    ? containerRect.top + safePadding
    : containerRect.bottom - overlaySize.height - safePadding;

  return {
    bottom: top + overlaySize.height,
    height: overlaySize.height,
    left,
    right: left + overlaySize.width,
    top,
    width: overlaySize.width,
  };
}

function getDistanceBetweenRects(first: SafeRect, second: SafeRect) {
  const firstCenter = getRectCenter(first);
  const secondCenter = getRectCenter(second);
  const deltaX = firstCenter.x - secondCenter.x;
  const deltaY = firstCenter.y - secondCenter.y;

  return Math.hypot(deltaX, deltaY);
}

export function chooseSafeHintPlacement({
  containerRect,
  importantRects,
  overlaySize,
  playerRect,
  safePadding = SAFE_HINT_PADDING,
}: SafeHintPlacementOptions): HintOverlayPlacement {
  const sortedCorners = [...HINT_OVERLAY_CORNERS].sort((firstCorner, secondCorner) => {
    const firstRect = getCandidateRect(firstCorner, containerRect, overlaySize, safePadding);
    const secondRect = getCandidateRect(secondCorner, containerRect, overlaySize, safePadding);

    return getDistanceBetweenRects(secondRect, playerRect) - getDistanceBetweenRects(firstRect, playerRect);
  });

  const allImportantRects = [playerRect, ...importantRects];

  return (
    sortedCorners.find((corner) => {
      const candidateRect = getCandidateRect(corner, containerRect, overlaySize, safePadding);

      return !allImportantRects.some((importantRect) => rectsOverlap(candidateRect, importantRect, safePadding));
    }) ?? 'hud-docked'
  );
}

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

function positionKey(position: Position) {
  return `${position.x},${position.y}`;
}

function getTileId(level: Level, position: Position) {
  return level.tileIds?.[positionKey(position)];
}

function getPositionByTileId(level: Level, tileId: string): Position | null {
  const matchingEntry = Object.entries(level.tileIds ?? {}).find(([, id]) => id === tileId);

  if (!matchingEntry) {
    return null;
  }

  const [x, y] = matchingEntry[0].split(',').map(Number);

  return { x, y };
}

function getTileAt(level: Level, position: Position) {
  return level.grid[position.y]?.[position.x] ?? null;
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

function addVisualHintPosition(positions: Map<string, Position>, position: Position | null) {
  if (position) {
    positions.set(positionKey(position), position);
  }
}

function getVisualHintPositions(level: Level) {
  const positions = new Map<string, Position>();
  const linkedDoorIds = new Set(level.links?.map((link) => link.targetId) ?? []);

  level.grid.forEach((row, y) => {
    row.forEach((tile, x) => {
      const position = { x, y };

      if (tile === 'portal') {
        const tileId = getTileId(level, position);
        const portalLink = level.links?.find(
          (link) => tileId && (link.sourceId === tileId || link.targetId === tileId),
        );

        if (portalLink) {
          addVisualHintPosition(positions, position);
          addVisualHintPosition(
            positions,
            getPositionByTileId(
              level,
              portalLink.sourceId === tileId ? portalLink.targetId : portalLink.sourceId,
            ),
          );
        }
      }

      if (tile === 'door' && level.mechanics.includes('key')) {
        const tileId = getTileId(level, position);

        if (!tileId || !linkedDoorIds.has(tileId)) {
          addVisualHintPosition(positions, position);
        }
      }

      if (tile !== 'switch' && tile !== 'pressurePlate') {
        return;
      }

      const tileId = getTileId(level, position);

      level.links
        ?.filter((link) => link.sourceId === tileId)
        .forEach((link) => {
          const linkedPosition = getPositionByTileId(level, link.targetId);

          if (linkedPosition && getTileAt(level, linkedPosition) === 'door') {
            addVisualHintPosition(positions, linkedPosition);
          }
        });
    });
  });

  return positions;
}

export function GameBoard({
  level,
  moves,
  elapsedSeconds,
  gameState,
  hazardFlash,
  failedAttemptCount = 0,
  isHintPanelOpen,
  hintNudge = null,
  unlockedHintTiers = [],
  isPaused = false,
  reducedMotion,
  animationClass = '',
  controlStyle,
  playerPosition,
  onLevelSelect,
  onDismissHintNudge,
  onOpenHintJournal = () => undefined,
  onSelectHintTier = () => undefined,
  onToggleHints,
  onMove,
  onPause,
  onReset,
  onUndo,
}: GameBoardProps) {
  const [selectedHintTier, setSelectedHintTier] = useState<number | null>(null);
  const [visualHintPulseId, setVisualHintPulseId] = useState(0);
  const [visualHintAnnouncement, setVisualHintAnnouncement] = useState('');
  const swipeDescriptionId = useId();
  const touchStartRef = useRef<Position | null>(null);
  const shouldShowKeys = level.mechanics.includes('key') || gameState.collectedKeys > 0;
  const canSwipe = controlStyle === 'swipe' || controlStyle === 'both';
  const canUseButtons = controlStyle === 'buttons' || controlStyle === 'both';
  const visualHintPositions = useMemo(() => getVisualHintPositions(level), [level]);
  const hasVisualHints = visualHintPositions.size > 0;
  const hintTiers = level.hints.map((hint, hintIndex) => ({
    isUnlocked:
      unlockedHintTiers.includes(hintIndex + 1) ||
      isHintTierUnlocked(hintIndex + 1, elapsedSeconds, failedAttemptCount),
    label: ['Direction', 'Mechanic', 'Route', 'Plan'][hintIndex] ?? `Step ${hintIndex + 1}`,
    number: hintIndex + 1,
    status: getHintTierStatus(
      hintIndex + 1,
      elapsedSeconds,
      failedAttemptCount,
      unlockedHintTiers.includes(hintIndex + 1),
    ),
    text: hint.text,
  }));
  const selectedHint = hintTiers.find((hintTier) => hintTier.number === selectedHintTier && hintTier.isUnlocked);

  useEffect(() => {
    if (visualHintPulseId === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVisualHintPulseId(0);
    }, VISUAL_HINT_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [visualHintPulseId]);

  const handleSwipeStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!canSwipe || isPaused || gameState.isComplete || gameState.isFailed) {
      touchStartRef.current = null;

      return;
    }

    const touch = event.touches[0];

    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleSwipeEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;

    touchStartRef.current = null;

    if (!start || !canSwipe || isPaused || gameState.isComplete || gameState.isFailed) {
      return;
    }

    const touch = event.changedTouches[0];

    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absoluteX = Math.abs(deltaX);
    const absoluteY = Math.abs(deltaY);

    if (Math.max(absoluteX, absoluteY) < SWIPE_MIN_DISTANCE) {
      return;
    }

    if (absoluteX >= absoluteY * SWIPE_AXIS_DOMINANCE) {
      onMove(deltaX > 0 ? 'right' : 'left');

      return;
    }

    if (absoluteY >= absoluteX * SWIPE_AXIS_DOMINANCE) {
      onMove(deltaY > 0 ? 'down' : 'up');
    }
  };

  return (
    <section
      className={`game-board-shell${hazardFlash ? ' hazard-flash' : ''}${
        isHintPanelOpen ? ' assist-drawer-open' : ''
      }${
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
            <button
              type="button"
              className="icon-button hud-undo-action"
              onClick={onUndo}
              aria-label="Undo move"
              disabled={isPaused}
            >
              <Undo2 aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="Restart Level" disabled={isPaused} reducedMotion={reducedMotion}>
            <button
              type="button"
              className="icon-button hud-reset-action"
              onClick={onReset}
              aria-label="Reset level"
              disabled={isPaused}
            >
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
              className="icon-button hud-level-select-action"
              onClick={onLevelSelect}
              aria-label="Open level select"
              disabled={isPaused}
            >
              <ListOrdered aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="Hint Journal" disabled={isPaused} reducedMotion={reducedMotion}>
            <button
              type="button"
              className="icon-button hud-hint-journal-action"
              onClick={onOpenHintJournal}
              aria-label="Open hint journal"
              disabled={isPaused}
            >
              <BookOpen aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content={isHintPanelOpen ? 'Close Assist' : 'Open Assist'} disabled={isPaused} reducedMotion={reducedMotion}>
            <button
              type="button"
              className={`icon-button assist-button${hintNudge ? ' assist-ready' : ''}`}
              onClick={onToggleHints}
              aria-label={isHintPanelOpen ? 'Close puzzle assist' : 'Open puzzle assist'}
              aria-expanded={isHintPanelOpen}
              aria-controls="hint-panel"
              disabled={isPaused}
            >
              <Lightbulb aria-hidden="true" />
            </button>
          </Tooltip>
        </nav>

        {hintNudge ? (
          <aside
            className="assist-nudge"
            aria-label="Puzzle assist nudge"
            aria-live="polite"
            aria-atomic="true"
          >
            <Lightbulb className="assist-nudge-icon" aria-hidden="true" />
            <div className="assist-nudge-copy">
              <p className="assist-kicker">Need a nudge?</p>
              <p className="assist-nudge-message">{hintNudge.message}</p>
            </div>
            <div className="assist-nudge-actions">
              <button type="button" className="assist-link-button" onClick={onToggleHints}>
                View Hint
              </button>
              <button type="button" className="icon-button" onClick={onDismissHintNudge} aria-label="Dismiss assist nudge">
                <X aria-hidden="true" />
              </button>
            </div>
          </aside>
        ) : null}
      </header>

      <section className="objective-panel" aria-label="Level objective">
        <div className="objective-heading">
          <Target aria-hidden="true" />
          <h3>Mission</h3>
        </div>
        <p>{level.description}</p>
      </section>

      <div className={`game-board-assist-layout${isHintPanelOpen ? ' assist-drawer-open' : ''}`}>
        {canSwipe ? (
          <p className="sr-only" id={swipeDescriptionId}>
            Swipe across the board to move. Diagonal swipes are ignored.
          </p>
        ) : null}
        <div
          className={`game-board${canSwipe ? ' swipe-enabled' : ''}`}
          role="grid"
          aria-label={`${level.name} board`}
          aria-describedby={canSwipe ? swipeDescriptionId : undefined}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
          style={{
            gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))`,
          }}
        >
          {level.grid.map((row, y) =>
            <div className="board-row" key={y} role="row">
              {row.map((tile, x) => {
                const hasPlayer = playerPosition.x === x && playerPosition.y === y;
                const effectiveTile = getEffectiveTileAt(level, gameState, { x, y }) ?? tile;
                const renderedTile = getRenderedTile(tile, effectiveTile);
                const isActive = isActiveTile(level, gameState, x, y, renderedTile);
                const isOpenedDoor = tile === 'door' && effectiveTile === 'floor';
                const objectIcon = renderObjectIcon(renderedTile, isActive, isOpenedDoor);
                const wasKeyCollected =
                  tile === 'key' && gameState.collectedKeyPositions.some((position) => positionsMatch(position, { x, y }));
                const isVisualHinted = visualHintPulseId > 0 && visualHintPositions.has(positionKey({ x, y }));

                return (
                  <div
                    aria-label={`${getTileLabel(tile, renderedTile, effectiveTile)} at ${x}, ${y}`}
                    className={`board-tile tile-${renderedTile}${
                      objectIcon ? ' tile-object' : ''
                    }${isActive ? ' tile-active' : ''}${isOpenedDoor ? ' tile-opened' : ''}${
                      wasKeyCollected ? ' tile-key-collected' : ''
                    }${isVisualHinted ? ` visual-hint-tile visual-hint-pulse-${visualHintPulseId % 2}` : ''}${
                      isVisualHinted && reducedMotion ? ' visual-hint-static' : ''
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
              })}
            </div>,
          )}
        </div>
        {isHintPanelOpen ? (
          <section className="hint-panel assist-panel assist-drawer" id="hint-panel" aria-label="Puzzle assist">
            <div className="hint-panel-header">
              <Lightbulb aria-hidden="true" />
              <div>
                <p className="eyebrow">choose your help level</p>
                <h3>Puzzle Assist</h3>
              </div>
              <button type="button" className="icon-button" onClick={onToggleHints} aria-label="Close puzzle assist">
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="assist-tier-picker" aria-label="Hint tiers">
              {hintTiers.map((hintTier) => (
                <button
                  type="button"
                  className="assist-tier-button"
                  disabled={!hintTier.isUnlocked}
                  key={hintTier.number}
                  onClick={() => {
                    setSelectedHintTier(hintTier.number);
                    onSelectHintTier(hintTier.number);
                  }}
                  aria-pressed={selectedHintTier === hintTier.number}
                >
                  <span>Tier {hintTier.number}</span>
                  {hintTier.label}
                  <em>{hintTier.status}</em>
                </button>
              ))}
            </div>
            {selectedHint ? (
              <div
                className="assist-tier-answer"
                role="status"
                aria-label={`Tier ${selectedHint.number} ${selectedHint.label} hint. ${selectedHint.text}`}
                aria-live="polite"
                aria-atomic="true"
              >
                <span>
                  Tier {selectedHint.number} · {selectedHint.label}
                </span>
                <p>{selectedHint.text}</p>
              </div>
            ) : (
              <p className="assist-tier-prompt">Start with Direction for a gentle nudge, or jump ahead if you want more help.</p>
            )}
            {hasVisualHints ? (
              <div className="visual-hint-controls">
                <button
                  type="button"
                  className="assist-link-button visual-hint-button"
                  onClick={() => {
                    setVisualHintPulseId((currentValue) => currentValue + 1);
                    setVisualHintAnnouncement(`${visualHintPositions.size} related puzzle objects highlighted.`);
                  }}
                >
                  Show visual hint
                </button>
                <p>Highlights related puzzle objects once, without showing a route.</p>
              </div>
            ) : null}
            {visualHintAnnouncement ? (
              <p
                className="sr-only"
                role="status"
                aria-label={visualHintAnnouncement}
                aria-live="polite"
                aria-atomic="true"
              >
                {visualHintAnnouncement}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className={`mobile-control-dock${canUseButtons ? '' : ' buttons-hidden'}`}>
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

        <nav className="mobile-quick-actions" aria-label="Quick attempt controls">
          <button type="button" className="mobile-quick-action" onClick={onUndo} aria-label="Undo last move" disabled={isPaused}>
            <Undo2 aria-hidden="true" />
            <span>Undo</span>
          </button>
          <button type="button" className="mobile-quick-action" onClick={onReset} aria-label="Restart level" disabled={isPaused}>
            <RotateCcw aria-hidden="true" />
            <span>Restart</span>
          </button>
        </nav>
      </div>
    </section>
  );
}
