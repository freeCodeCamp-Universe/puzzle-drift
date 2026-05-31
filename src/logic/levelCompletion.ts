import type { GameState, Level, Position } from '../types/game';

function getTileAt(level: Level, position: Position) {
  if (position.x < 0 || position.y < 0 || position.x >= level.width || position.y >= level.height) {
    return null;
  }

  return level.grid[position.y][position.x];
}

export function canCompleteLevel(level: Level, state: GameState) {
  const requirements = level.completionRequirements;
  const requiresExitReach = requirements?.requiresExitReach ?? true;

  if (requiresExitReach && getTileAt(level, state.playerPosition) !== 'exit') {
    return false;
  }

  if (requirements?.requiresSpikeAvoidance && state.isFailed) {
    return false;
  }

  if (!requirements) {
    return true;
  }

  const requiredKeysCollected = requirements.requiredKeysCollected ?? (requirements.requiresKeyCollection ? 1 : 0);
  const requiredDoorsOpened = requirements.requiredDoorsOpened ?? (requirements.requiresDoorOpened ? 1 : 0);
  const requiredSwitchesActivated =
    requirements.requiredSwitchesActivated ?? (requirements.requiresSwitchActivation ? 1 : 0);
  const requiredLinkedDoorsOpened =
    requirements.requiredLinkedDoorsOpened ?? (requirements.requiresLinkedDoorOpened ? 1 : 0);
  const requiredBlocksPushed = requirements.requiredBlocksPushed ?? (requirements.requiresBlockPush ? 1 : 0);
  const requiredPressurePlatesActivated =
    requirements.requiredPressurePlatesActivated ?? (requirements.requiresPressurePlateActivation ? 1 : 0);
  const requiredPortalsUsed =
    requirements.requiredPortalsUsed ??
    (requirements.requiresPortalUsage || requirements.requiresPortalUse ? 1 : 0);
  const requiredIceTilesTraversed =
    requirements.requiredIceTilesTraversed ??
    requirements.requiredIceSlides ??
    (requirements.requiresIceTraversal || requirements.requiresIceSlide ? 1 : 0);

  return (
    state.keysCollectedThisAttempt >= requiredKeysCollected &&
    state.doorsOpenedThisAttempt >= requiredDoorsOpened &&
    state.switchesActivatedThisAttempt >= requiredSwitchesActivated &&
    state.linkedDoorsOpenedThisAttempt >= requiredLinkedDoorsOpened &&
    state.blocksPushedThisAttempt >= requiredBlocksPushed &&
    state.pressurePlatesActivatedThisAttempt >= requiredPressurePlatesActivated &&
    state.portalsUsedThisAttempt >= requiredPortalsUsed &&
    state.iceTilesTraversedThisAttempt >= requiredIceTilesTraversed
  );
}
