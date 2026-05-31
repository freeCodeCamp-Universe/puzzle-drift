import type { Direction, GameState, Level, Position, TileType } from '../types/game';
import { canCompleteLevel } from './levelCompletion';

const DIRECTION_OFFSETS: Record<Direction, Position> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};

const WALKABLE_TILES = new Set<TileType>(['floor', 'exit', 'portal']);
const BLOCK_PUSH_TARGETS = new Set<TileType>(['floor', 'pressurePlate']);
const ICE_SLIDE_TARGETS = new Set<TileType>([
  'floor',
  'exit',
  'ice',
  'key',
  'portal',
  'pressurePlate',
  'spike',
]);

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

function getLinkedDoorCount(level: Level, sourceId: string) {
  return (
    level.links?.filter((link) => {
      if (link.sourceId !== sourceId) {
        return false;
      }

      const targetPosition = getPositionByTileId(level, link.targetId);

      return Boolean(targetPosition && getTileAt(level, targetPosition) === 'door');
    }).length ?? 0
  );
}

function getLinkedPortalPosition(level: Level, position: Position): Position | null {
  const portalId = getTileId(level, position);

  if (!portalId) {
    return null;
  }

  const link = level.links?.find(
    (candidate) => candidate.sourceId === portalId || candidate.targetId === portalId,
  );
  const linkedPortalId =
    link?.sourceId === portalId ? link.targetId : link?.targetId === portalId ? link.sourceId : undefined;

  if (!linkedPortalId) {
    return null;
  }

  const linkedPosition = getPositionByTileId(level, linkedPortalId);

  return linkedPosition && getTileAt(level, linkedPosition) === 'portal' ? linkedPosition : null;
}

function hasBlockAt(state: GameState, position: Position) {
  return state.pushBlocks.some((block) => positionsMatch(block, position));
}

function getInitialPushBlocks(level: Level) {
  return level.grid.flatMap((row, y) =>
    row.flatMap((tile, x) => (tile === 'pushBlock' ? [{ x, y }] : [])),
  );
}

export function getActivePressurePlateIds(level: Level, state: GameState) {
  return level.grid.flatMap((row, y) =>
    row.flatMap((tile, x) => {
      if (tile !== 'pressurePlate') {
        return [];
      }

      const position = { x, y };
      const id = getTileId(level, position);
      const isActive =
        positionsMatch(state.playerPosition, position) ||
        state.pushBlocks.some((block) => positionsMatch(block, position));

      return id && isActive ? [id] : [];
    }),
  );
}

function isLinkedDoorOpen(level: Level, state: GameState, position: Position) {
  const targetId = getTileId(level, position);
  const activeSourceIds = [...getActivePressurePlateIds(level, state), ...state.activeSwitchIds];

  return Boolean(
    targetId &&
      level.links?.some(
        (link) => link.targetId === targetId && activeSourceIds.includes(link.sourceId),
      ),
  );
}

function toggleSwitchId(activeSwitchIds: string[], switchId: string) {
  return activeSwitchIds.includes(switchId)
    ? activeSwitchIds.filter((activeSwitchId) => activeSwitchId !== switchId)
    : [...activeSwitchIds, switchId];
}

function setBlockPosition(state: GameState, from: Position, to: Position) {
  return state.pushBlocks.map((block) => (positionsMatch(block, from) ? to : block));
}

function applyTileArrival(
  level: Level,
  state: GameState,
  position: Position,
  tile: TileType,
): GameState {
  const portalDestination = tile === 'portal' ? getLinkedPortalPosition(level, position) : null;
  const destinationPosition = portalDestination ?? position;
  const collectsKey = tile === 'key';
  const opensDoor = tile === 'door';
  const opensLinkedDoor = opensDoor && isLinkedDoorOpen(level, state, position);
  const consumesKey = opensDoor && !opensLinkedDoor;
  const switchId = tile === 'switch' ? getTileId(level, position) : undefined;
  const activatesSwitch = Boolean(switchId && !state.activeSwitchIds.includes(switchId));
  const linkedDoorsOpened = switchId && activatesSwitch ? getLinkedDoorCount(level, switchId) : 0;
  const hitsSpike = tile === 'spike';

  const nextState = {
    ...state,
    activeSwitchIds: switchId ? toggleSwitchId(state.activeSwitchIds, switchId) : state.activeSwitchIds,
    activatedSwitches: switchId
      ? state.activatedSwitches.some((switchPosition) => positionsMatch(switchPosition, position))
        ? state.activatedSwitches.filter((switchPosition) => !positionsMatch(switchPosition, position))
        : [...state.activatedSwitches, position]
      : state.activatedSwitches,
    collectedKeys: state.collectedKeys + (collectsKey ? 1 : 0) - (consumesKey ? 1 : 0),
    collectedKeyPositions: collectsKey ? [...state.collectedKeyPositions, position] : state.collectedKeyPositions,
    doorsOpenedThisAttempt: state.doorsOpenedThisAttempt + (consumesKey ? 1 : 0),
    isComplete: false,
    isFailed: hitsSpike,
    keysCollectedThisAttempt: state.keysCollectedThisAttempt + (collectsKey ? 1 : 0),
    linkedDoorsOpenedThisAttempt: state.linkedDoorsOpenedThisAttempt + linkedDoorsOpened,
    openedDoorPositions: consumesKey ? [...state.openedDoorPositions, position] : state.openedDoorPositions,
    playerPosition: destinationPosition,
    switchesActivatedThisAttempt: state.switchesActivatedThisAttempt + (activatesSwitch ? 1 : 0),
  };

  return {
    ...nextState,
    activePressurePlateIds: getActivePressurePlateIds(level, nextState),
    isComplete: !hitsSpike && canCompleteLevel(level, nextState),
  };
}

function resolveIceSlide(level: Level, state: GameState, direction: Direction) {
  let currentState = state;
  let currentTile = getEffectiveTileAt(level, currentState, currentState.playerPosition);

  while (currentTile === 'ice' && !currentState.isComplete && !currentState.isFailed) {
    const nextPosition = getNextPosition(currentState.playerPosition, direction);
    const nextTile = getEffectiveTileAt(level, currentState, nextPosition);

    if (!nextTile || !ICE_SLIDE_TARGETS.has(nextTile) || !canMoveTo(level, currentState, nextPosition)) {
      break;
    }

    currentState = applyTileArrival(level, currentState, nextPosition, nextTile);
    currentTile = nextTile;
  }

  return currentState;
}

export function createInitialGameState(level: Level): GameState {
  const initialState: GameState = {
    activePressurePlateIds: [],
    activeSwitchIds: [],
    activatedSwitches: [],
    blocksPushedThisAttempt: 0,
    collectedKeys: 0,
    collectedKeyPositions: [],
    elapsedSeconds: 0,
    facing: 'down',
    doorsOpenedThisAttempt: 0,
    isComplete: false,
    isFailed: false,
    keysCollectedThisAttempt: 0,
    linkedDoorsOpenedThisAttempt: 0,
    levelId: level.id,
    moves: 0,
    openedDoorPositions: [],
    playerPosition: { ...level.playerStart },
    pushBlocks: getInitialPushBlocks(level),
    switchesActivatedThisAttempt: 0,
  };

  return {
    ...initialState,
    activePressurePlateIds: getActivePressurePlateIds(level, initialState),
  };
}

export function getDirectionFromKey(key: string): Direction | null {
  switch (key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      return 'up';
    case 'arrowright':
    case 'd':
      return 'right';
    case 'arrowdown':
    case 's':
      return 'down';
    case 'arrowleft':
    case 'a':
      return 'left';
    default:
      return null;
  }
}

export function getNextPosition(position: Position, direction: Direction): Position {
  const offset = DIRECTION_OFFSETS[direction];

  return {
    x: position.x + offset.x,
    y: position.y + offset.y,
  };
}

export function getTileAt(level: Level, position: Position): TileType | null {
  if (position.x < 0 || position.y < 0 || position.x >= level.width || position.y >= level.height) {
    return null;
  }

  return level.grid[position.y][position.x];
}

export function getEffectiveTileAt(level: Level, state: GameState, position: Position): TileType | null {
  const tile = getTileAt(level, position);

  if (!tile) {
    return null;
  }

  if (hasBlockAt(state, position)) {
    return 'pushBlock';
  }

  if (tile === 'pushBlock') {
    return 'floor';
  }

  if (tile === 'key' && state.collectedKeyPositions.some((keyPosition) => positionsMatch(keyPosition, position))) {
    return 'floor';
  }

  if (
    tile === 'door' &&
    (state.openedDoorPositions.some((doorPosition) => positionsMatch(doorPosition, position)) ||
      isLinkedDoorOpen(level, state, position))
  ) {
    return 'floor';
  }

  return tile;
}

export function canMoveTo(level: Level, state: GameState, position: Position) {
  const tile = getEffectiveTileAt(level, state, position);

  return (
    tile !== null &&
    (WALKABLE_TILES.has(tile) ||
      tile === 'key' ||
      tile === 'ice' ||
      tile === 'pressurePlate' ||
      tile === 'spike' ||
      tile === 'switch' ||
      (tile === 'door' && (state.collectedKeys > 0 || isLinkedDoorOpen(level, state, position))))
  );
}

export function movePlayer(level: Level, state: GameState, direction: Direction): GameState {
  if (state.isComplete || state.isFailed) {
    return state;
  }

  const nextPosition = getNextPosition(state.playerPosition, direction);
  const nextTile = getEffectiveTileAt(level, state, nextPosition);

  if (nextTile === 'pushBlock') {
    const blockDestination = getNextPosition(nextPosition, direction);
    const blockDestinationTile = getEffectiveTileAt(level, state, blockDestination);
    const blockDestinationBaseTile = getTileAt(level, blockDestination);

    if (
      !blockDestinationTile ||
      !blockDestinationBaseTile ||
      !BLOCK_PUSH_TARGETS.has(blockDestinationTile) ||
      !BLOCK_PUSH_TARGETS.has(blockDestinationBaseTile)
    ) {
      return {
        ...state,
        facing: direction,
      };
    }

    const nextState = {
      ...state,
      blocksPushedThisAttempt: state.blocksPushedThisAttempt + 1,
      facing: direction,
      moves: state.moves + 1,
      playerPosition: nextPosition,
      pushBlocks: setBlockPosition(state, nextPosition, blockDestination),
    };

    return {
      ...nextState,
      activePressurePlateIds: getActivePressurePlateIds(level, nextState),
    };
  }

  if (!nextTile || !canMoveTo(level, state, nextPosition)) {
    return {
      ...state,
      facing: direction,
    };
  }

  const nextState = applyTileArrival(level, state, nextPosition, nextTile);
  const resolvedState = nextTile === 'ice' ? resolveIceSlide(level, nextState, direction) : nextState;

  return {
    ...resolvedState,
    facing: direction,
    moves: state.moves + 1,
  };
}

export function calculateStars(level: Level, state: GameState) {
  if (state.moves <= level.targetMoves) {
    return state.elapsedSeconds <= level.targetTimeSeconds ? 3 : 2;
  }

  return 1;
}
