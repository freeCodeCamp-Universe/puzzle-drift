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
  playerStart: Position;
  targetMoves: number;
  targetTimeSeconds: number;
  mechanics: TileType[];
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
  pushBlocks: Position[];
  isComplete: boolean;
  isFailed: boolean;
};

export type LevelStats = {
  levelId: number;
  completed: boolean;
  bestMoves?: number;
  bestTimeSeconds?: number;
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
  levelStats: LevelStats[];
};

export type SaveState = SaveData;

export type GameSettings = {
  reducedMotion: boolean;
  soundEnabled: boolean;
  highContrast: boolean;
};
