import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  ListOrdered,
  Lock,
  Play,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { LEVELS } from '../data/levels';
import type { Level, SaveData } from '../types/game';
import {
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
  endLevel: number;
  id: string;
  startLevel: number;
  title: string;
};

const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    endLevel: 10,
    id: 'training-grid',
    startLevel: 1,
    title: 'Training Grid',
  },
  {
    endLevel: 20,
    id: 'crystal-labyrinth',
    startLevel: 11,
    title: 'Crystal Labyrinth',
  },
  {
    endLevel: 30,
    id: 'rift-core',
    startLevel: 21,
    title: 'Rift Core',
  },
];

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

function LevelCard({
  isCurrentObjective,
  level,
  progress,
  onSelectLevel,
}: {
  isCurrentObjective: boolean;
  level: Level;
  progress: SaveData;
  onSelectLevel: (level: number) => void;
}) {
  const unlocked = isLevelUnlocked(progress, level.id);
  const completed = isLevelCompleted(progress, level.id);
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

      {!unlocked ? (
        <span className="locked-level-info">
          <span>{unlockRequirement}</span>
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
  const currentObjective = LEVELS.find((level) => level.id === currentObjectiveLevel) ?? LEVELS[0];
  const completedLevels = LEVELS.filter((level) => isLevelCompleted(progress, level.id));
  const levelsCompleted = completedLevels.length;
  const totalLevels = LEVELS.length;
  const starsEarned = LEVELS.reduce((totalStars, level) => totalStars + getLevelStars(progress, level.id), 0);
  const totalStars = totalLevels * 3;

  return {
    currentChapter: getCurrentChapterTitle(currentObjectiveLevel),
    currentObjective,
    levelsCompleted,
    starsEarned,
    totalLevels,
    totalStars,
  };
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
        <span>
          <span>
            <span className="campaign-chapter-kicker">Optional History</span>
            <strong>Puzzle Journal</strong>
          </span>
          <span>
            Best runs, hints used, and completion dates.
          </span>
        </span>
        <span>{isOpen ? 'Hide' : 'Show'}</span>
      </button>
      {isOpen ? (
        <ul className="puzzle-journal-list">
          {LEVELS.map((level) => {
            const stats = progress.levelStats.find((levelStats) => levelStats.levelId === level.id);
            const completed = Boolean(stats?.completed);

            return (
              <li
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
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export function LevelSelectScreen({ progress, onBack, onSelectLevel }: LevelSelectScreenProps) {
  const [isPuzzleJournalOpen, setIsPuzzleJournalOpen] = useState(false);
  const currentObjectiveLevel = getCurrentObjectiveLevel(progress);
  const campaignSummary = getCampaignSummary(progress, currentObjectiveLevel);
  const levelsByChapter = CAMPAIGN_CHAPTERS.map((chapter) => {
    const levels = LEVELS.filter((level) => level.id >= chapter.startLevel && level.id <= chapter.endLevel);
    const completedCount = levels.filter((level) => isLevelCompleted(progress, level.id)).length;

    return {
      ...chapter,
      completedCount,
      levels,
    };
  });

  return (
    <section className="screen level-screen" aria-labelledby="level-select-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <h1 id="level-select-title">Level Select</h1>
        </div>
      </header>

      {LEVELS.length > 0 ? (
        <>
          <section className="campaign-summary-panel" aria-label="Campaign summary">
            <div className="campaign-summary-heading">
              <div>
                <p className="campaign-chapter-kicker">Current Objective</p>
                <h2>
                  Level {campaignSummary.currentObjective.id}
                  <span>{campaignSummary.currentObjective.name}</span>
                </h2>
              </div>
            </div>
            <dl className="campaign-summary-grid">
              <div className="campaign-summary-stat">
                <dt>Levels Completed</dt>
                <dd>
                  {campaignSummary.levelsCompleted} / {campaignSummary.totalLevels}
                </dd>
              </div>
              <div className="campaign-summary-stat">
                <dt>Stars Earned</dt>
                <dd>
                  {campaignSummary.starsEarned} / {campaignSummary.totalStars}
                </dd>
              </div>
              <div className="campaign-summary-stat">
                <dt>Current Chapter</dt>
                <dd>{campaignSummary.currentChapter}</dd>
              </div>
            </dl>
          </section>

          <div className="campaign-chapter-list" aria-label="Campaign chapters">
            {levelsByChapter.map((chapter, chapterIndex) => {
              const totalLevels = chapter.levels.length;

              return (
                <section
                  className="campaign-chapter"
                  aria-labelledby={`${chapter.id}-title`}
                  key={chapter.id}
                >
                  <header className="campaign-chapter-header">
                    <div className="campaign-chapter-copy">
                      <p className="campaign-chapter-kicker">Chapter {chapterIndex + 1}</p>
                      <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
                    </div>
                    <div
                      className="campaign-progress"
                      aria-label={`${chapter.completedCount} of ${totalLevels} levels complete`}
                    >
                      <span>{chapter.completedCount} / {totalLevels} Complete</span>
                    </div>
                  </header>

                  <ul className="level-card-grid" aria-label={`${chapter.title} levels`}>
                    {chapter.levels.map((level) => (
                      <li className="level-card-list-item" key={level.id}>
                        <LevelCard
                          isCurrentObjective={level.id === currentObjectiveLevel}
                          level={level}
                          progress={progress}
                          onSelectLevel={onSelectLevel}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <PuzzleJournal
            isOpen={isPuzzleJournalOpen}
            onToggle={() => setIsPuzzleJournalOpen((currentValue) => !currentValue)}
            progress={progress}
          />
        </>
      ) : (
        <section
          className="empty-state"
          role="status"
          aria-label="No levels available"
          aria-live="polite"
          aria-atomic="true"
        >
          <ListOrdered aria-hidden="true" />
          <h2>No levels loaded</h2>
          <p>Check back after the level pack is available.</p>
        </section>
      )}
    </section>
  );
}
