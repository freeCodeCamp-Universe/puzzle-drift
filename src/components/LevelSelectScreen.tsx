import { ArrowLeft, CheckCircle2, CircleDot, Footprints, ListOrdered, Lock, Star, Timer } from 'lucide-react';
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
    <span className="level-stars" aria-label={`${count} stars`} data-testid="level-stars">
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
  const statusLabel = completed ? 'Completed' : unlocked ? 'Unlocked' : 'Locked';

  return (
    <button
      type="button"
      aria-label={`Level ${level.id}: ${level.name}${unlocked ? '' : ' locked'}`}
      className={`level-card${unlocked ? '' : ' locked'}${completed ? ' completed' : ''}`}
      data-status={statusLabel.toLowerCase()}
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
          {unlocked && !completed ? <PlayState /> : null}
        </span>
      </span>

      <span className="level-status">{statusLabel}</span>

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

function PlayState() {
  return <CircleDot className="level-ready" aria-label="Unlocked" />;
}

export function LevelSelectScreen({ progress, onBack, onSelectLevel }: LevelSelectScreenProps) {
  return (
    <section className="screen level-screen" aria-labelledby="level-select-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <h2 id="level-select-title">Level Select</h2>
        </div>
      </header>

      {LEVELS.length > 0 ? (
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
      ) : (
        <section className="empty-state" aria-label="No levels available">
          <ListOrdered aria-hidden="true" />
          <h3>No levels loaded</h3>
          <p>Check back after the level pack is available.</p>
        </section>
      )}
    </section>
  );
}
