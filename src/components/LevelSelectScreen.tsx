import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Footprints,
  KeyRound,
  ListOrdered,
  Lock,
  Map,
  Play,
  Star,
  Timer,
  Trophy,
  Wand2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LEVELS } from '../data/levels';
import type { Level, SaveData, TileType } from '../types/game';
import { Tooltip } from './Tooltip';
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

type CampaignChapter = {
  description: string;
  endLevel: number;
  id: string;
  startLevel: number;
  title: string;
};

type StatusFilter = 'all' | 'incomplete' | 'completed' | 'locked';
type MechanicFilter = 'all' | 'key' | 'door' | 'switch' | 'pushBlock' | 'pressurePlate' | 'portal' | 'ice' | 'spike';

type LevelSelectFilters = {
  mechanic: MechanicFilter;
  status: StatusFilter;
};

type AchievementBadge = {
  readonly label: string;
  readonly tooltip: string;
};

const FILTER_STORAGE_KEY = 'puzzle-drift:level-select-filters';

const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    description: 'Learn the fundamentals of drifting, keys, doors, and clean route reading.',
    endLevel: 10,
    id: 'training-grid',
    startLevel: 1,
    title: 'Training Grid',
  },
  {
    description: 'Combine mechanics across longer routes with switches, portals, and pressure plates.',
    endLevel: 20,
    id: 'crystal-labyrinth',
    startLevel: 11,
    title: 'Crystal Labyrinth',
  },
  {
    description: 'Solve dense late-game chambers where every route decision matters.',
    endLevel: 30,
    id: 'rift-core',
    startLevel: 21,
    title: 'Rift Core',
  },
];

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Incomplete', value: 'incomplete' },
  { label: 'Completed', value: 'completed' },
  { label: 'Locked', value: 'locked' },
];

const MECHANIC_FILTERS: { label: string; value: MechanicFilter }[] = [
  { label: 'All Mechanics', value: 'all' },
  { label: 'Keys', value: 'key' },
  { label: 'Doors', value: 'door' },
  { label: 'Switches', value: 'switch' },
  { label: 'Blocks', value: 'pushBlock' },
  { label: 'Pressure Plates', value: 'pressurePlate' },
  { label: 'Portals', value: 'portal' },
  { label: 'Ice', value: 'ice' },
  { label: 'Spikes', value: 'spike' },
];

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

const PREVIEW_TILE_TYPES = new Set<TileType>(['door', 'exit', 'key', 'portal', 'spike', 'wall']);

const DEFAULT_FILTERS: LevelSelectFilters = {
  mechanic: 'all',
  status: 'all',
};

const ACHIEVEMENT_BADGES = {
  firstTry: {
    label: 'First Try Clear',
    tooltip: 'Completed without restarting or failing the level.',
  },
  perfectRoute: {
    label: 'Perfect Route',
    tooltip: 'Completed at or under the par move target.',
  },
  speedSolver: {
    label: 'Speed Solver',
    tooltip: 'Completed at or under the par time target.',
  },
  threeStar: {
    label: 'Three Star Clear',
    tooltip: 'Earned all three stars on this level.',
  },
} as const;

function isStatusFilter(value: unknown): value is StatusFilter {
  return STATUS_FILTERS.some((filter) => filter.value === value);
}

function isMechanicFilter(value: unknown): value is MechanicFilter {
  return MECHANIC_FILTERS.some((filter) => filter.value === value);
}

function loadLevelSelectFilters(): LevelSelectFilters {
  try {
    const storedFilters = window.sessionStorage.getItem(FILTER_STORAGE_KEY);

    if (!storedFilters) {
      return DEFAULT_FILTERS;
    }

    const parsedFilters = JSON.parse(storedFilters) as Partial<LevelSelectFilters>;

    return {
      mechanic: isMechanicFilter(parsedFilters.mechanic) ? parsedFilters.mechanic : DEFAULT_FILTERS.mechanic,
      status: isStatusFilter(parsedFilters.status) ? parsedFilters.status : DEFAULT_FILTERS.status,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveLevelSelectFilters(filters: LevelSelectFilters) {
  window.sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
}

function formatTime(seconds?: number) {
  if (seconds === undefined) {
    return '--';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatCompletionDate(date?: string) {
  if (!date) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
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

function AchievementBadges({
  badges,
}: {
  badges: AchievementBadge[];
}) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <span className="achievement-badge-list" aria-label="Achievement badges">
      {badges.map((badge) => (
        <Tooltip content={badge.tooltip} key={badge.label}>
          <span className="achievement-badge">{badge.label}</span>
        </Tooltip>
      ))}
    </span>
  );
}

function compactAchievementBadges(badges: (AchievementBadge | null)[]) {
  return badges.filter((badge): badge is AchievementBadge => badge !== null);
}

function LevelPreview({ level }: { level: Level }) {
  return (
    <span
      className="level-preview"
      aria-label={`${level.name} board preview`}
      style={{
        gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))`,
      }}
    >
      {level.grid.flatMap((row, rowIndex) =>
        row.map((tile, columnIndex) => {
          const previewTile = PREVIEW_TILE_TYPES.has(tile) ? tile : 'floor';

          return (
            <span
              aria-hidden="true"
              className={`preview-tile preview-${previewTile}`}
              key={`${rowIndex}-${columnIndex}`}
            />
          );
        }),
      )}
    </span>
  );
}

function LevelCard({
  chapterTitle,
  isCurrentObjective,
  level,
  progress,
  onSelectLevel,
}: {
  chapterTitle: string;
  isCurrentObjective: boolean;
  level: Level;
  progress: SaveData;
  onSelectLevel: (level: number) => void;
}) {
  const unlocked = isLevelUnlocked(progress, level.id);
  const completed = isLevelCompleted(progress, level.id);
  const bestMoves = getLevelBestMoves(progress, level.id);
  const bestTimeSeconds = getLevelBestTimeSeconds(progress, level.id);
  const stars = getLevelStars(progress, level.id);
  const levelStats = progress.levelStats.find((stats) => stats.levelId === level.id);
  const statusLabel = completed ? 'Completed' : unlocked ? 'Unlocked' : 'Locked';
  const lockedLabel = unlocked ? '' : ' locked';
  const stateClass = `${unlocked ? '' : ' locked'}${completed ? ' completed' : ''}`;
  const currentObjectiveClass = isCurrentObjective ? ' current-objective' : '';
  const unlockRequirement = `Complete Level ${level.id - 1} to unlock`;
  const statusIcon = completed ? (
    <CheckCircle2 aria-label="Completed" />
  ) : unlocked ? (
    <Play aria-hidden="true" />
  ) : (
    <Lock aria-label="Locked" />
  );
  const achievementBadges = completed
    ? compactAchievementBadges([
        bestMoves !== undefined && bestMoves <= level.targetMoves ? ACHIEVEMENT_BADGES.perfectRoute : null,
        bestTimeSeconds !== undefined && bestTimeSeconds <= level.targetTimeSeconds ? ACHIEVEMENT_BADGES.speedSolver : null,
        stars >= 3 ? ACHIEVEMENT_BADGES.threeStar : null,
        levelStats?.firstTryClear ? ACHIEVEMENT_BADGES.firstTry : null,
      ])
    : [];

  return (
    <button
      type="button"
      aria-disabled={!unlocked}
      aria-current={isCurrentObjective ? 'step' : undefined}
      aria-label={`Level ${level.id}: ${level.name}${lockedLabel}`}
      className={`level-card${stateClass}${currentObjectiveClass}`}
      data-status={statusLabel.toLowerCase()}
      onClick={() => {
        if (unlocked) {
          onSelectLevel(level.id);
        }
      }}
    >
      <span className="level-number">#{level.id.toString().padStart(2, '0')}</span>
      <span className="level-card-title">{level.name}</span>

      <span className="level-card-status-row">
        <span className="level-status">
          {statusIcon}
          {statusLabel}
        </span>
        {isCurrentObjective ? (
          <span className="continue-badge">
            <Play aria-hidden="true" />
            Continue Adventure
          </span>
        ) : null}
      </span>

      <LevelPreview level={level} />
      {unlocked ? <LevelStars count={stars} /> : null}
      <AchievementBadges badges={achievementBadges} />

      <span className="mechanic-list" aria-label={`Mechanics: ${level.mechanics.join(', ')}`}>
        {level.mechanics
          .filter((mechanic) => mechanic !== 'floor' && mechanic !== 'wall')
          .map((mechanic) => (
            <span className="mechanic-chip" key={mechanic}>
              {MECHANIC_LABELS[mechanic]}
            </span>
          ))}
      </span>

      {!unlocked ? (
        <span className="locked-level-info">
          <span>{unlockRequirement}</span>
          <span>{chapterTitle}</span>
        </span>
      ) : null}

      <span className="level-card-description">{level.description}</span>

      {unlocked ? (
        <span className="level-card-stats">
          <span>
            <Footprints aria-hidden="true" />
            {bestMoves ?? '--'}
          </span>
          <span>
            <Timer aria-hidden="true" />
            {formatTime(bestTimeSeconds)}
          </span>
        </span>
      ) : null}
    </button>
  );
}

function getCurrentObjectiveLevel(progress: SaveData) {
  const unlockedLevelIds = progress.unlockedLevels.filter((levelId) => LEVELS.some((level) => level.id === levelId));
  const highestUnlockedLevel = Math.max(...unlockedLevelIds, 1);
  const recentlyPlayedLevel = progress.currentLevel;

  if (isLevelUnlocked(progress, recentlyPlayedLevel) && !isLevelCompleted(progress, recentlyPlayedLevel)) {
    return recentlyPlayedLevel;
  }

  return (
    unlockedLevelIds
      .filter((levelId) => !isLevelCompleted(progress, levelId))
      .sort((firstLevel, secondLevel) => secondLevel - firstLevel)[0] ?? highestUnlockedLevel
  );
}

function getCurrentChapterTitle(levelId: number) {
  return CAMPAIGN_CHAPTERS.find((chapter) => levelId >= chapter.startLevel && levelId <= chapter.endLevel)?.title ?? 'Training Grid';
}

function getCampaignSummary(progress: SaveData, currentObjectiveLevel: number) {
  const completedLevels = LEVELS.filter((level) => isLevelCompleted(progress, level.id));
  const levelsCompleted = completedLevels.length;
  const totalLevels = LEVELS.length;
  const starsEarned = LEVELS.reduce((totalStars, level) => totalStars + getLevelStars(progress, level.id), 0);
  const totalStars = totalLevels * 3;
  const totalMoves = completedLevels.reduce(
    (moveTotal, level) => moveTotal + (getLevelBestMoves(progress, level.id) ?? 0),
    0,
  );
  const totalPlayTimeSeconds = completedLevels.reduce(
    (timeTotal, level) => timeTotal + (getLevelBestTimeSeconds(progress, level.id) ?? 0),
    0,
  );
  const completionRate = totalLevels === 0 ? 0 : Math.round((levelsCompleted / totalLevels) * 100);

  return {
    completionRate,
    currentChapter: getCurrentChapterTitle(currentObjectiveLevel),
    levelsCompleted,
    starsEarned,
    totalLevels,
    totalMoves,
    totalPlayTimeSeconds,
    totalStars,
  };
}

function levelMatchesStatusFilter(level: Level, progress: SaveData, statusFilter: StatusFilter) {
  const completed = isLevelCompleted(progress, level.id);
  const unlocked = isLevelUnlocked(progress, level.id);

  if (statusFilter === 'completed') {
    return completed;
  }

  if (statusFilter === 'incomplete') {
    return unlocked && !completed;
  }

  if (statusFilter === 'locked') {
    return !unlocked;
  }

  return true;
}

function levelMatchesMechanicFilter(level: Level, mechanicFilter: MechanicFilter) {
  return mechanicFilter === 'all' || level.mechanics.includes(mechanicFilter);
}

function PuzzleJournal({ isOpen, onToggle, progress }: { isOpen: boolean; onToggle: () => void; progress: SaveData }) {
  return (
    <section className="puzzle-journal-panel" aria-label="Puzzle Journal">
      <button
        type="button"
        className="puzzle-journal-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="campaign-summary-heading">
          <ListOrdered aria-hidden="true" />
          <span>
            <span className="campaign-chapter-kicker">Puzzle History</span>
            <strong>Puzzle Journal</strong>
          </span>
        </span>
        <span>{isOpen ? 'Hide' : 'Show'}</span>
      </button>
      {isOpen ? (
        <div className="puzzle-journal-list">
        {LEVELS.map((level) => {
          const stats = progress.levelStats.find((levelStats) => levelStats.levelId === level.id);
          const completed = Boolean(stats?.completed);

          return (
            <article
              className={`puzzle-journal-entry${completed ? '' : ' pending'}`}
              aria-label={`${level.name} journal entry`}
              key={level.id}
            >
              <div className="journal-level-title">
                <span>#{level.id.toString().padStart(2, '0')}</span>
                <strong>{level.name}</strong>
              </div>
              <dl className="journal-stat-grid">
                <div>
                  <dt>Completion date</dt>
                  <dd>{formatCompletionDate(stats?.completionDate)}</dd>
                </div>
                <div>
                  <dt>Best moves</dt>
                  <dd>{stats?.bestMoves ?? '--'}</dd>
                </div>
                <div>
                  <dt>Best time</dt>
                  <dd>{formatTime(stats?.bestTimeSeconds)}</dd>
                </div>
                <div>
                  <dt>Stars earned</dt>
                  <dd>{completed ? `${stats?.stars ?? 0} / 3` : '--'}</dd>
                </div>
                <div>
                  <dt>Hints used</dt>
                  <dd>{completed ? stats?.hintsUsed ?? 0 : '--'}</dd>
                </div>
              </dl>
              {completed ? (
                <div className="journal-mechanic-summary" aria-label={`${level.name} mechanic history`}>
                  <span>
                    <KeyRound aria-hidden="true" />
                    Keys {stats?.keysCollected ?? 0}
                  </span>
                  <span>
                    <Lock aria-hidden="true" />
                    Doors {stats?.doorsOpened ?? 0}
                  </span>
                  <span>
                    <Wand2 aria-hidden="true" />
                    Portals {stats?.portalsUsed ?? 0}
                  </span>
                </div>
              ) : (
                <p>Complete this puzzle to add it to your journal.</p>
              )}
            </article>
          );
        })}
        </div>
      ) : null}
    </section>
  );
}

export function LevelSelectScreen({ progress, onBack, onSelectLevel }: LevelSelectScreenProps) {
  const [filters, setFilters] = useState<LevelSelectFilters>(() => loadLevelSelectFilters());
  const [isPuzzleJournalOpen, setIsPuzzleJournalOpen] = useState(false);
  const currentObjectiveLevel = getCurrentObjectiveLevel(progress);
  const campaignSummary = getCampaignSummary(progress, currentObjectiveLevel);
  const levelsByChapter = CAMPAIGN_CHAPTERS.map((chapter) => {
    const levels = LEVELS.filter((level) => level.id >= chapter.startLevel && level.id <= chapter.endLevel);
    const filteredLevels = levels.filter(
      (level) =>
        levelMatchesStatusFilter(level, progress, filters.status) &&
        levelMatchesMechanicFilter(level, filters.mechanic),
    );
    const completedCount = levels.filter((level) => isLevelCompleted(progress, level.id)).length;

    return {
      ...chapter,
      completedCount,
      filteredLevels,
      levels,
    };
  });
  const visibleLevelCount = levelsByChapter.reduce((levelCount, chapter) => levelCount + chapter.filteredLevels.length, 0);

  useEffect(() => {
    saveLevelSelectFilters(filters);
  }, [filters]);

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
        <>
          <section className="campaign-summary-panel" aria-label="Campaign summary">
            <div className="campaign-summary-heading">
              <Trophy aria-hidden="true" />
              <div>
                <p className="campaign-chapter-kicker">Player Profile</p>
                <h3>Campaign Summary</h3>
              </div>
            </div>
            <div className="campaign-summary-grid">
              <div className="campaign-summary-stat">
                <CheckCircle2 aria-hidden="true" />
                <span>Levels Completed</span>
                <strong>
                  {campaignSummary.levelsCompleted} / {campaignSummary.totalLevels}
                </strong>
              </div>
              <div className="campaign-summary-stat">
                <Star aria-hidden="true" />
                <span>Stars Earned</span>
                <strong>
                  {campaignSummary.starsEarned} / {campaignSummary.totalStars}
                </strong>
              </div>
              <div className="campaign-summary-stat">
                <BarChart3 aria-hidden="true" />
                <span>Best Completion Rate</span>
                <strong>{campaignSummary.completionRate}%</strong>
              </div>
              <div className="campaign-summary-stat">
                <Footprints aria-hidden="true" />
                <span>Total Moves</span>
                <strong>{campaignSummary.totalMoves}</strong>
              </div>
              <div className="campaign-summary-stat">
                <Timer aria-hidden="true" />
                <span>Total Play Time</span>
                <strong>{formatTime(campaignSummary.totalPlayTimeSeconds)}</strong>
              </div>
              <div className="campaign-summary-stat">
                <Map aria-hidden="true" />
                <span>Current Chapter</span>
                <strong>{campaignSummary.currentChapter}</strong>
              </div>
            </div>
          </section>

          <section className="level-filter-panel" aria-label="Level filters">
            <div className="filter-group" aria-label="Progress filters">
              <span className="filter-label">Progress</span>
              <div className="filter-chip-row">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    type="button"
                    className={`filter-chip${filters.status === filter.value ? ' active' : ''}`}
                    aria-pressed={filters.status === filter.value}
                    key={filter.value}
                    onClick={() => setFilters((currentFilters) => ({ ...currentFilters, status: filter.value }))}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group" aria-label="Mechanic filters">
              <span className="filter-label">Mechanic</span>
              <div className="filter-chip-row">
                {MECHANIC_FILTERS.map((filter) => (
                  <button
                    type="button"
                    className={`filter-chip${filters.mechanic === filter.value ? ' active' : ''}`}
                    aria-pressed={filters.mechanic === filter.value}
                    key={filter.value}
                    onClick={() => setFilters((currentFilters) => ({ ...currentFilters, mechanic: filter.value }))}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <PuzzleJournal
            isOpen={isPuzzleJournalOpen}
            onToggle={() => setIsPuzzleJournalOpen((currentValue) => !currentValue)}
            progress={progress}
          />

          <div className="campaign-chapter-list" aria-label="Campaign chapters">
            {levelsByChapter.map((chapter, chapterIndex) => {
              if (chapter.filteredLevels.length === 0) {
                return null;
              }

              const totalLevels = chapter.levels.length;
              const progressPercent = totalLevels === 0 ? 0 : Math.round((chapter.completedCount / totalLevels) * 100);

              return (
                <section
                  className="campaign-chapter"
                  aria-labelledby={`${chapter.id}-title`}
                  key={chapter.id}
                >
                  <header className="campaign-chapter-header">
                    <div className="campaign-chapter-copy">
                      <p className="campaign-chapter-kicker">Chapter {chapterIndex + 1}</p>
                      <h3 id={`${chapter.id}-title`}>{chapter.title}</h3>
                      <p>{chapter.description}</p>
                    </div>
                    <div className="campaign-progress" aria-label={`${chapter.completedCount}/${totalLevels} Complete`}>
                      <span>{chapter.completedCount}/{totalLevels} Complete</span>
                      <span
                        className="campaign-progress-track"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={totalLevels}
                        aria-valuenow={chapter.completedCount}
                      >
                        <span style={{ width: `${progressPercent}%` }} />
                      </span>
                    </div>
                  </header>

                  <div className="level-card-grid" aria-label={`${chapter.title} levels`}>
                    {chapter.filteredLevels.map((level) => (
                      <LevelCard
                        key={level.id}
                        chapterTitle={chapter.title}
                        isCurrentObjective={level.id === currentObjectiveLevel}
                        level={level}
                        progress={progress}
                        onSelectLevel={onSelectLevel}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          {visibleLevelCount === 0 ? (
            <section className="empty-state" aria-label="No levels match filters">
              <ListOrdered aria-hidden="true" />
              <h3>No matching levels</h3>
              <p>Try a different progress or mechanic filter.</p>
            </section>
          ) : null}
        </>
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
