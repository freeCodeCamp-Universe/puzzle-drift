import { ArrowLeft, CheckCircle2, Footprints, Lock, Star, Timer } from 'lucide-react';
import { LEVELS } from '../data/levels';
import type { Level, SaveData, TileType } from '../types/game';
import {
  getLevelBestMoves,
  getLevelBestTimeSeconds,
  getLevelStars,
  isLevelCompleted,
  isLevelUnlocked,
} from '../utils/progressStorage';

type LevelSelectScreenProps = {
  progress: SaveData;
  onBack: () => void;
  onSelectLevel: (level: number) => void;
};

const MECHANIC_LABELS: Record<TileType, string> = {
  cracked: 'Cracked',
  door: 'Doors',
  exit: 'Exit',
  floor: 'Floor',
  fog: 'Fog',
  ice: 'Ice',
  key: 'Keys',
  laserEmitter: 'Emitter',
  laserReceiver: 'Receiver',
  mirror: 'Mirror',
  oneWay: 'One-way',
  portal: 'Portals',
  pressurePlate: 'Plates',
  pushBlock: 'Blocks',
  spike: 'Spikes',
  switch: 'Switches',
  wall: 'Walls',
};

function formatTime(seconds?: number) {
  if (seconds === undefined) {
    return '--';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function LevelStars({ count }: { count: number }) {
  return (
    <span className="level-stars" aria-label={`${count} stars`}>
      {Array.from({ length: 3 }, (_, index) => (
        <Star
          aria-hidden="true"
          className={index < count ? 'star-filled' : undefined}
          key={index}
        />
      ))}
    </span>
  );
}

function LevelCard({
  level,
  progress,
  onSelectLevel,
}: {
  level: Level;
  progress: SaveData;
  onSelectLevel: (level: number) => void;
}) {
  const unlocked = isLevelUnlocked(progress, level.id);
  const completed = isLevelCompleted(progress, level.id);
  const bestMoves = getLevelBestMoves(progress, level.id);
  const bestTimeSeconds = getLevelBestTimeSeconds(progress, level.id);
  const stars = getLevelStars(progress, level.id);

  return (
    <button
      type="button"
      aria-label={`Level ${level.id}: ${level.name}${unlocked ? '' : ' locked'}`}
      className={`level-card${unlocked ? '' : ' locked'}${completed ? ' completed' : ''}`}
      disabled={!unlocked}
      onClick={() => {
        if (unlocked) {
          onSelectLevel(level.id);
        }
      }}
    >
      <span className="level-card-header">
        <span className="level-number">#{level.id.toString().padStart(2, '0')}</span>
        <span className="level-state">
          {completed ? <CheckCircle2 aria-label="Completed" /> : null}
          {!unlocked ? <Lock aria-label="Locked" /> : null}
        </span>
      </span>

      <span className="level-card-title">{level.name}</span>
      <span className="level-card-description">{level.description}</span>

      <span className="mechanic-list" aria-label={`Mechanics: ${level.mechanics.join(', ')}`}>
        {level.mechanics
          .filter((mechanic) => mechanic !== 'floor' && mechanic !== 'wall')
          .map((mechanic) => (
            <span className="mechanic-chip" key={mechanic}>
              {MECHANIC_LABELS[mechanic]}
            </span>
          ))}
      </span>

      <span className="level-card-stats">
        <LevelStars count={stars} />
        <span>
          <Footprints aria-hidden="true" />
          {bestMoves ?? '--'}
        </span>
        <span>
          <Timer aria-hidden="true" />
          {formatTime(bestTimeSeconds)}
        </span>
      </span>
    </button>
  );
}

export function LevelSelectScreen({ progress, onBack, onSelectLevel }: LevelSelectScreenProps) {
  return (
    <section className="screen level-screen" aria-labelledby="level-select-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">route planner</p>
          <h2 id="level-select-title">Level Select</h2>
        </div>
      </header>

      <div className="level-card-grid" aria-label="Available levels">
        {LEVELS.map((level) => (
          <LevelCard
            key={level.id}
            level={level}
            progress={progress}
            onSelectLevel={onSelectLevel}
          />
        ))}
      </div>
    </section>
  );
}
