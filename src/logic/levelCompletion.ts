import type { GameState, Level, Position } from '../types/game';

function getTileAt(level: Level, position: Position) {
  if (position.x < 0 || position.y < 0 || position.x >= level.width || position.y >= level.height) {
    return null;
  }

  return level.grid[position.y][position.x];
}

export function canCompleteLevel(level: Level, state: GameState) {
  if (getTileAt(level, state.playerPosition) !== 'exit') {
    return false;
  }

  const requirements = level.completionRequirements;

  if (!requirements) {
    return true;
  }

  const requiredKeysCollected = requirements.requiredKeysCollected ?? (requirements.requiresKeyCollection ? 1 : 0);
  const requiredDoorsOpened = requirements.requiredDoorsOpened ?? (requirements.requiresDoorOpened ? 1 : 0);

  return (
    state.keysCollectedThisAttempt >= requiredKeysCollected &&
    state.doorsOpenedThisAttempt >= requiredDoorsOpened
  );
}
