export type AppView = 'start' | 'game' | 'levels';

export type TileType =
  | 'floor'
  | 'wall'
  | 'exit'
  | 'key'
  | 'door'
  | 'switch'
  | 'pressurePlate'
  | 'pushBlock'
  | 'portal'
  | 'spike'
  | 'ice'
  | 'cracked'
  | 'fog'
  | 'oneWay'
  | 'mirror'
  | 'laserEmitter'
  | 'laserReceiver';

export type Position = {
  x: number;
  y: number;
};

export type Direction = 'up' | 'right' | 'down' | 'left';

export type Level = {
  id: number;
  name: string;
  description: string;
  width: number;
  height: number;
  grid: TileType[][];
  hints: LevelHint[];
  completionRequirements?: LevelCompletionRequirements;
  tileIds?: Record<string, string>;
  links?: LevelLink[];
  playerStart: Position;
  targetMoves: number;
  targetTimeSeconds: number;
  mechanics: TileType[];
};

export type LevelHint = {
  text: string;
};

export type LevelLink = {
  sourceId: string;
  targetId: string;
};

export type LevelCompletionRequirements = {
  requiresKeyCollection?: boolean;
  requiresDoorOpened?: boolean;
  requiresSwitchActivation?: boolean;
  requiresLinkedDoorOpened?: boolean;
  requiresBlockPush?: boolean;
  requiresPressurePlateActivation?: boolean;
  requiresPortalUsage?: boolean;
  requiresPortalUse?: boolean;
  requiresIceTraversal?: boolean;
  requiresIceSlide?: boolean;
  requiresSpikeAvoidance?: boolean;
  requiresExitReach?: boolean;
  requiredKeysCollected?: number;
  requiredDoorsOpened?: number;
  requiredSwitchesActivated?: number;
  requiredLinkedDoorsOpened?: number;
  requiredBlocksPushed?: number;
  requiredPressurePlatesActivated?: number;
  requiredPortalsUsed?: number;
  requiredIceTilesTraversed?: number;
  requiredIceSlides?: number;
};

export type GameState = {
  levelId: number;
  playerPosition: Position;
  facing: Direction;
  moves: number;
  elapsedSeconds: number;
  collectedKeys: number;
  collectedKeyPositions: Position[];
  openedDoorPositions: Position[];
  activatedSwitches: Position[];
  activePressurePlateIds: string[];
  activeSwitchIds: string[];
  pushBlocks: Position[];
  keysCollectedThisAttempt: number;
  doorsOpenedThisAttempt: number;
  switchesActivatedThisAttempt: number;
  linkedDoorsOpenedThisAttempt: number;
  blocksPushedThisAttempt: number;
  pressurePlatesActivatedThisAttempt: number;
  portalsUsedThisAttempt: number;
  iceTilesTraversedThisAttempt: number;
  iceSlidesThisAttempt: number;
  isComplete: boolean;
  isFailed: boolean;
};

export type LevelStats = {
  levelId: number;
  completed: boolean;
  bestMoves?: number;
  bestTimeSeconds?: number;
  completionDate?: string;
  doorsOpened?: number;
  firstTryClear?: boolean;
  hintsUsed?: number;
  keysCollected?: number;
  portalsUsed?: number;
  stars: number;
};

export type SaveData = {
  currentLevel: number;
  hasActiveRun: boolean;
  unlockedLevels: number[];
  completedLevels: number[];
  bestMoves: Record<number, number>;
  bestTimeSeconds: Record<number, number>;
  stars: Record<number, number>;
  unlockedHints: Record<number, number[]>;
  levelStats: LevelStats[];
};

export type SaveState = SaveData;

export type GameSettings = {
  reducedMotion: boolean;
  highContrast: boolean;
  hintNudgesEnabled: boolean;
  confirmRestart: boolean;
};
