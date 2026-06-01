import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Check,
  CircleCheck,
  Footprints,
  ListOrdered,
  LockKeyhole,
  Play,
  RotateCcw,
  Settings,
  Star,
  Timer,
  TriangleAlert,
  X,
} from 'lucide-react';
import { LEVELS } from '../data/levels';
import { canCompleteLevel } from '../logic/levelCompletion';
import {
  calculateStars,
  createInitialGameState,
  getEffectiveTileAt,
  getNextPosition,
  movePlayer,
} from '../logic/movement';
import { useGameShortcuts } from '../hooks/useGameShortcuts';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import type { Direction, GameSettings, GameState, Level, SaveData } from '../types/game';
import {
  createHintAnalyticsReport,
  loadHintAnalytics,
  recordHintAnalyticsAttempt,
  recordHintAnalyticsCompletion,
  recordHintAnalyticsOpen,
  recordHintAnalyticsTierUse,
  saveHintAnalytics,
  type HintAnalyticsData,
} from '../utils/hintAnalytics';
import { getChapterCompletionMilestone } from '../utils/chapterMilestones';
import { isHintTierUnlocked } from '../utils/hints';
import { GameBoard } from './GameBoard';
import { StarTooltip } from './StarTooltip';

type CompletionPayload = {
  completedLevelId: number;
  doorsOpened: number;
  firstTryClear: boolean;
  hintsUsed: number;
  keysCollected: number;
  moves: number;
  portalsUsed: number;
  stars: number;
  timeSeconds: number;
};

type GameScreenProps = {
  currentLevel: number;
  isSettingsOpen: boolean;
  onBack: () => void;
  onCompleteLevel: (payload: CompletionPayload) => void;
  onLevelSelect: () => void;
  onNextLevel: () => void;
  onSettings: () => void;
  onUnlockHintTier: (levelId: number, tierNumber: number) => void;
  progress: SaveData;
  reducedMotion: boolean;
  settings: GameSettings;
};

const LOCKED_DOOR_MESSAGE = 'Locked. Find a key.';
const LINKED_DOOR_MESSAGE = 'Door closed. Use the switch.';
const DOOR_OPENED_MESSAGE = 'Door opened.';
const BLOCK_MOVED_MESSAGE = 'Block moved.';
const LOCKED_DOOR_MESSAGE_MS = 1400;
const STUCK_NUDGE_SECONDS = 35;

type StuckNudge = {
  key: string;
  message: string;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function isNearMiss(overage: number, target: number) {
  return overage > 0 && overage <= Math.ceil(target * 0.1);
}

function getStarResultExplanation(level: Level, gameState: GameState) {
  const moveOverage = Math.max(0, gameState.moves - level.targetMoves);
  const timeOverage = Math.max(0, gameState.elapsedSeconds - level.targetTimeSeconds);

  if (moveOverage > 0) {
    if (isNearMiss(moveOverage, level.targetMoves)) {
      return {
        heading: 'So Close',
        message:
          moveOverage === 1
            ? 'One fewer move would have earned another star. Replay it and chase the cleaner route.'
            : `${moveOverage} fewer moves would have earned another star. Replay it and chase the cleaner route.`,
      };
    }

    return {
      heading: 'Missed 2 and 3 Stars',
      message:
        timeOverage > 0
          ? `Reduce your move count by ${moveOverage} and your time by ${pluralize(timeOverage, 'second')}.`
          : `Reduce your move count by ${moveOverage}.`,
    };
  }

  if (timeOverage > 0) {
    if (isNearMiss(timeOverage, level.targetTimeSeconds)) {
      return {
        heading: 'So Close',
        message: `You were only ${pluralize(timeOverage, 'second')} away from 3 stars. Replay it and chase the faster clear.`,
      };
    }

    return {
      heading: 'Missed 3 Stars',
      message: `Reduce your time by ${pluralize(timeOverage, 'second')}.`,
    };
  }

  return {
    heading: '3 Star Clear',
    message: 'You met both the move and time targets.',
  };
}

function getTargetProgress(actual: number, target: number) {
  if (actual <= target) {
    return 100;
  }

  return Math.max(8, Math.round((target / actual) * 100));
}

function positionKey(position: { x: number; y: number }) {
  return `${position.x},${position.y}`;
}

function isLinkedDoor(level: Level, position: { x: number; y: number }) {
  const doorId = level.tileIds?.[positionKey(position)];

  return Boolean(doorId && level.links?.some((link) => link.targetId === doorId));
}

function getTrailStats(positionTrail: string[]) {
  const visits = positionTrail.reduce<Record<string, number>>((counts, position) => {
    counts[position] = (counts[position] ?? 0) + 1;

    return counts;
  }, {});
  const uniqueTiles = Object.keys(visits).length;
  const highestVisitCount = Math.max(0, ...Object.values(visits));

  return {
    highestVisitCount,
    uniqueTiles,
  };
}

function hasRecentMovementLoop(positionTrail: string[]) {
  if (positionTrail.length < 6) {
    return false;
  }

  const recent = positionTrail.slice(-6);
  const alternatesBetweenTwoTiles =
    recent[0] === recent[2] &&
    recent[2] === recent[4] &&
    recent[1] === recent[3] &&
    recent[3] === recent[5] &&
    recent[0] !== recent[1];
  const repeatsThreeStepLoop =
    recent[0] === recent[3] &&
    recent[1] === recent[4] &&
    recent[2] === recent[5] &&
    new Set(recent.slice(0, 3)).size > 1;

  return alternatesBetweenTwoTiles || repeatsThreeStepLoop;
}

function getStuckNudge({
  failedRouteCount,
  failedResetCount,
  gameState,
  isHintNudgeDismissed,
  isHintPanelOpen,
  isPaused,
  level,
  positionTrail,
  spikeDeathCount,
}: {
  failedRouteCount: number;
  failedResetCount: number;
  gameState: GameState;
  isHintNudgeDismissed: string | null;
  isHintPanelOpen: boolean;
  isPaused: boolean;
  level: Level;
  positionTrail: string[];
  spikeDeathCount: number;
}): StuckNudge | null {
  if (gameState.isComplete || gameState.isFailed || isPaused || isHintPanelOpen) {
    return null;
  }

  const candidates: StuckNudge[] = [];
  const trailStats = getTrailStats(positionTrail);

  if (spikeDeathCount >= 3) {
    candidates.push({
      key: 'spike-deaths',
      message: 'You seem to be running into hazards.',
    });
  }

  if (level.mechanics.includes('portal') && gameState.elapsedSeconds >= 90 && gameState.portalsUsedThisAttempt === 0) {
    candidates.push({
      key: 'unused-portal',
      message: 'The portal may be more important than it looks.',
    });
  }

  if (hasRecentMovementLoop(positionTrail)) {
    candidates.push({
      key: 'movement-loop',
      message: 'You are circling the same few tiles.',
    });
  }

  if (gameState.moves >= 14 && trailStats.uniqueTiles <= Math.ceil(gameState.moves * 0.45)) {
    candidates.push({
      key: 'revisited-tiles',
      message: 'You keep revisiting the same area.',
    });
  }

  if (gameState.moves >= 12 && trailStats.highestVisitCount >= 4) {
    candidates.push({
      key: 'backtracking',
      message: 'This route is causing a lot of backtracking.',
    });
  }

  if (failedRouteCount >= 4) {
    candidates.push({
      key: 'failed-routes',
      message: 'That path keeps getting blocked.',
    });
  }

  if (failedResetCount >= 3) {
    candidates.push({
      key: 'repeated-resets',
      message: 'A small nudge may help you reset your plan.',
    });
  }

  if (gameState.elapsedSeconds >= STUCK_NUDGE_SECONDS && gameState.moves <= 2) {
    candidates.push({
      key: 'slow-start',
      message: 'Take a moment to read the board before committing.',
    });
  }

  return candidates.find((candidate) => candidate.key !== isHintNudgeDismissed) ?? null;
}

function CompletionStars({
  count,
  reducedMotion,
}: {
  count: number;
  reducedMotion: boolean;
}) {
  return (
    <div
      className={`completion-stars${reducedMotion ? '' : ' star-reveal'}`}
      aria-label={`${count} stars earned`}
    >
      {[1, 2, 3].map((starNumber) => (
        <StarTooltip
          className="completion-star"
          earned={starNumber <= count}
          key={starNumber}
          reducedMotion={reducedMotion}
          tier={starNumber as 1 | 2 | 3}
        />
      ))}
    </div>
  );
}

function CompletionStarBreakdown({
  gameState,
  level,
  starsEarned,
}: {
  gameState: GameState;
  level: Level;
  starsEarned: number;
}) {
  const explanation = getStarResultExplanation(level, gameState);
  const moveTargetMet = gameState.moves <= level.targetMoves;
  const timeTargetMet = gameState.elapsedSeconds <= level.targetTimeSeconds;
  const targetRows = [
    {
      actual: gameState.moves.toString(),
      icon: <Footprints aria-hidden="true" />,
      label: 'Moves',
      progress: getTargetProgress(gameState.moves, level.targetMoves),
      target: level.targetMoves.toString(),
      targetMet: moveTargetMet,
    },
    {
      actual: formatTime(gameState.elapsedSeconds),
      icon: <Timer aria-hidden="true" />,
      label: 'Time',
      progress: getTargetProgress(gameState.elapsedSeconds, level.targetTimeSeconds),
      target: formatTime(level.targetTimeSeconds),
      targetMet: timeTargetMet,
    },
  ];

  return (
    <section className="completion-star-breakdown" aria-labelledby="completion-star-breakdown-title">
      <div className="completion-target-grid">
        {targetRows.map((targetRow) => (
          <div
            className={`completion-target-card ${targetRow.targetMet ? 'met' : 'missed'}`}
            key={targetRow.label}
          >
            {targetRow.icon}
            <span>{targetRow.label}</span>
            <strong>{`${targetRow.actual} / ${targetRow.target}`}</strong>
            <em>{`Target: ${targetRow.target}`}</em>
            <span className="completion-target-result">
              {targetRow.targetMet ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
              {targetRow.targetMet ? 'Met' : 'Missed'}
            </span>
            <span
              className="completion-progress"
              role="progressbar"
              aria-label={`${targetRow.label} target ${targetRow.targetMet ? 'met' : 'missed'}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={targetRow.progress}
            >
              <span style={{ width: `${targetRow.progress}%` }} />
            </span>
          </div>
        ))}
      </div>

      <div className="completion-star-explanation">
        <span id="completion-star-breakdown-title">Stars Earned</span>
        <strong aria-label={`Star breakdown: ${starsEarned} stars`}>
          {Array.from({ length: 3 }, (_, index) => (
            <StarTooltip
              earned={index < starsEarned}
              key={index}
              tier={(index + 1) as 1 | 2 | 3}
            />
          ))}
        </strong>
        <p>
          <b>{explanation.heading}:</b> {explanation.message}
        </p>
      </div>
    </section>
  );
}

function PersonalBestComparison({
  bestMoves,
  bestTimeSeconds,
  level,
}: {
  bestMoves: number;
  bestTimeSeconds: number;
  level: Level;
}) {
  const moveTargetMet = bestMoves <= level.targetMoves;
  const timeTargetMet = bestTimeSeconds <= level.targetTimeSeconds;
  const allTargetsMet = moveTargetMet && timeTargetMet;

  return (
    <section className="personal-best-comparison" aria-label="Personal best comparison">
      <span className="personal-best-title">Personal Best</span>
      <div className={`personal-best-row${moveTargetMet ? ' met' : ' missed'}`}>
        <span>Best Moves</span>
        <strong>{bestMoves} / {level.targetMoves}</strong>
        {moveTargetMet ? <Check aria-label="Best Moves target met" /> : <X aria-label="Best Moves target missed" />}
      </div>
      <div className={`personal-best-row${timeTargetMet ? ' met' : ' missed'}`}>
        <span>Best Time</span>
        <strong>{formatTime(bestTimeSeconds)} / {formatTime(level.targetTimeSeconds)}</strong>
        {timeTargetMet ? <Check aria-label="Best Time target met" /> : <X aria-label="Best Time target missed" />}
      </div>
      <p>
        {allTargetsMet
          ? 'Your best run beats the star targets. Replay to polish the route or chase speed.'
          : 'Replay to bring your personal best under the remaining target.'}
      </p>
    </section>
  );
}

function HintJournal({
  level,
  onClose,
  unlockedHintTiers,
}: {
  level: Level;
  onClose: () => void;
  unlockedHintTiers: number[];
}) {
  return (
    <section className="hint-journal" aria-label="Hint journal">
      <header className="hint-journal-header">
        <div className="dialog-title">
          <BookOpen aria-hidden="true" />
          <div>
            <p className="eyebrow">hint journal</p>
            <h3>{level.name}</h3>
          </div>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close hint journal">
          <X aria-hidden="true" />
        </button>
      </header>

      <ul className="hint-journal-list">
        {level.hints.map((hint, hintIndex) => {
          const tierNumber = hintIndex + 1;
          const isUnlocked = unlockedHintTiers.includes(tierNumber);

          return (
            <li className={`hint-journal-item${isUnlocked ? ' unlocked' : ' locked'}`} key={tierNumber}>
              <div className="hint-journal-tier">
                {isUnlocked ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
                <span>{isUnlocked ? 'Unlocked' : 'Locked'}</span>
                <strong>Hint {tierNumber}</strong>
              </div>
              {isUnlocked ? <p>{hint.text}</p> : <p>Keep exploring to unlock this hint.</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function HintAnalyticsReport({
  analytics,
  onClose,
}: {
  analytics: HintAnalyticsData;
  onClose: () => void;
}) {
  const reportRows = createHintAnalyticsReport(analytics, LEVELS);

  return (
    <section className="hint-analytics-report" aria-label="Hint analytics report">
      <header className="hint-journal-header">
        <div className="dialog-title">
          <BarChart3 aria-hidden="true" />
          <div>
            <p className="eyebrow">developer debug</p>
            <h3>Hint Analytics</h3>
          </div>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close hint analytics">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">Hint Usage %</th>
              <th scope="col">Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row) => (
              <tr key={row.levelId}>
                <td>
                  Level {row.levelId}: {row.levelName}
                </td>
                <td>{formatPercent(row.hintUsageRate)}</td>
                <td>{formatPercent(row.completionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function GameScreen({
  currentLevel,
  isSettingsOpen,
  onBack,
  onCompleteLevel,
  onLevelSelect,
  onNextLevel,
  onSettings,
  onUnlockHintTier,
  progress,
  reducedMotion,
  settings,
}: GameScreenProps) {
  const level = LEVELS.find((candidate) => candidate.id === currentLevel) ?? LEVELS[0];
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(level));
  const [, setHistory] = useState<GameState[]>([]);
  const [hazardFlashCount, setHazardFlashCount] = useState(0);
  const [boardAnimationClass, setBoardAnimationClass] = useState('');
  const [failedRouteCount, setFailedRouteCount] = useState(0);
  const [failedResetCount, setFailedResetCount] = useState(0);
  const [isHintPanelOpen, setIsHintPanelOpen] = useState(false);
  const [isHintJournalOpen, setIsHintJournalOpen] = useState(false);
  const [isHintAnalyticsOpen, setIsHintAnalyticsOpen] = useState(false);
  const [isConfirmingRestart, setIsConfirmingRestart] = useState(false);
  const [hintAnalytics, setHintAnalytics] = useState<HintAnalyticsData>(() => loadHintAnalytics());
  const [dismissedHintNudgeKey, setDismissedHintNudgeKey] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [positionTrail, setPositionTrail] = useState<string[]>(() => [positionKey(level.playerStart)]);
  const [spikeDeathCount, setSpikeDeathCount] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const lockedDoorTimeoutRef = useRef<number | null>(null);
  const completionPanelRef = useRef<HTMLElement | null>(null);
  const completionPrimaryActionRef = useRef<HTMLButtonElement | null>(null);
  const failurePanelRef = useRef<HTMLElement | null>(null);
  const failureRetryRef = useRef<HTMLButtonElement | null>(null);
  const pauseDialogRef = useRef<HTMLElement | null>(null);
  const pauseReturnFocusRef = useRef<HTMLElement | null>(null);
  const restartConfirmPanelRef = useRef<HTMLElement | null>(null);
  const restartCancelRef = useRef<HTMLButtonElement | null>(null);
  const restartReturnFocusRef = useRef<HTMLElement | null>(null);
  const savedCompletionRef = useRef(false);
  const selectedHintTiersThisAttemptRef = useRef<Set<number>>(new Set());
  const usedHintThisAttemptRef = useRef(false);
  const unlockedHintTiers = useMemo(
    () => progress.unlockedHints[level.id] ?? [],
    [level.id, progress.unlockedHints],
  );

  const clearFeedbackMessage = useCallback(() => {
    if (lockedDoorTimeoutRef.current !== null) {
      window.clearTimeout(lockedDoorTimeoutRef.current);
      lockedDoorTimeoutRef.current = null;
    }

    setFeedbackMessage('');
  }, []);

  const showFeedbackMessage = useCallback((message: string) => {
    if (lockedDoorTimeoutRef.current !== null) {
      window.clearTimeout(lockedDoorTimeoutRef.current);
    }

    setFeedbackMessage(message);
    lockedDoorTimeoutRef.current = window.setTimeout(() => {
      setFeedbackMessage('');
      lockedDoorTimeoutRef.current = null;
    }, LOCKED_DOOR_MESSAGE_MS);
  }, []);

  const triggerBoardAnimation = useCallback(
    (animationClass: string) => {
      if (reducedMotion) {
        setBoardAnimationClass('');

        return;
      }

      setBoardAnimationClass(animationClass);
    },
    [reducedMotion],
  );

  const updateHintAnalytics = useCallback((update: (analytics: HintAnalyticsData) => HintAnalyticsData) => {
    setHintAnalytics((currentAnalytics) => {
      const nextAnalytics = update(currentAnalytics);

      saveHintAnalytics(nextAnalytics);

      return nextAnalytics;
    });
  }, []);

  const recordNewAttempt = useCallback(
    (levelId: number) => {
      selectedHintTiersThisAttemptRef.current = new Set();
      usedHintThisAttemptRef.current = false;
      updateHintAnalytics((currentAnalytics) => recordHintAnalyticsAttempt(currentAnalytics, levelId));
    },
    [updateHintAnalytics],
  );

  const moveInDirection = useCallback(
    (direction: Direction) => {
      if (isPaused) {
        return;
      }

      setGameState((currentState) => {
        const attemptedPosition = getNextPosition(currentState.playerPosition, direction);
        const attemptedTile = getEffectiveTileAt(level, currentState, attemptedPosition);

        if (
          attemptedTile === 'door' &&
          currentState.collectedKeys === 0 &&
          level.mechanics.includes('key') &&
          !isLinkedDoor(level, attemptedPosition)
        ) {
          showFeedbackMessage(LOCKED_DOOR_MESSAGE);
        }

        if (attemptedTile === 'door' && isLinkedDoor(level, attemptedPosition)) {
          showFeedbackMessage(LINKED_DOOR_MESSAGE);
        }

        const nextState = movePlayer(level, currentState, direction);

        if (nextState.isFailed) {
          setHistory([]);
          setHazardFlashCount((currentCount) => currentCount + 1);
          setFailedResetCount((currentCount) => currentCount + 1);
          setSpikeDeathCount((currentCount) => currentCount + 1);
          savedCompletionRef.current = false;

          return nextState;
        }

        if (nextState === currentState || nextState.moves === currentState.moves) {
          setFailedRouteCount((currentCount) => currentCount + 1);

          return nextState;
        }

        clearFeedbackMessage();

        const collectedKey = nextState.collectedKeyPositions.length > currentState.collectedKeyPositions.length;
        const openedDoor = nextState.openedDoorPositions.length > currentState.openedDoorPositions.length;
        const openedLinkedDoor =
          nextState.linkedDoorsOpenedThisAttempt > currentState.linkedDoorsOpenedThisAttempt;
        const pushedBlock = nextState.blocksPushedThisAttempt > currentState.blocksPushedThisAttempt;
        const teleported =
          Math.abs(nextState.playerPosition.x - currentState.playerPosition.x) +
            Math.abs(nextState.playerPosition.y - currentState.playerPosition.y) >
          1;
        const animationClass = collectedKey
          ? 'key-collect'
          : openedDoor || openedLinkedDoor
            ? 'door-unlock'
            : pushedBlock
              ? 'block-move'
              : teleported
                ? 'portal-teleport'
                : 'player-move';

        if (openedLinkedDoor) {
          showFeedbackMessage(DOOR_OPENED_MESSAGE);
        }

        if (pushedBlock) {
          showFeedbackMessage(BLOCK_MOVED_MESSAGE);
        }

        triggerBoardAnimation(animationClass);
        setHistory((currentHistory) => [...currentHistory, currentState]);
        setPositionTrail((currentTrail) => [...currentTrail, positionKey(nextState.playerPosition)]);

        return nextState;
      });
    },
    [clearFeedbackMessage, isPaused, level, showFeedbackMessage, triggerBoardAnimation],
  );

  const pauseGame = useCallback(() => {
    if (gameState.isComplete || gameState.isFailed || isPaused) {
      return;
    }

    pauseReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBoardAnimationClass('');
    setHazardFlashCount(0);
    setIsPaused(true);
  }, [gameState.isComplete, gameState.isFailed, isPaused]);

  const resumeGame = useCallback(() => {
    setIsHintJournalOpen(false);
    setIsHintAnalyticsOpen(false);
    setIsPaused(false);
    window.setTimeout(() => {
      pauseReturnFocusRef.current?.focus();
      pauseReturnFocusRef.current = null;
    }, 0);
  }, []);

  useEffect(() => {
    clearFeedbackMessage();
    setGameState(createInitialGameState(level));
    setHistory([]);
    setHazardFlashCount(0);
    setBoardAnimationClass('');
    setFailedRouteCount(0);
    setFailedResetCount(0);
    setIsHintPanelOpen(false);
    setIsHintJournalOpen(false);
    setIsHintAnalyticsOpen(false);
    setIsConfirmingRestart(false);
    setDismissedHintNudgeKey(null);
    setIsPaused(false);
    setPositionTrail([positionKey(level.playerStart)]);
    setSpikeDeathCount(0);
    savedCompletionRef.current = false;
    recordNewAttempt(level.id);
  }, [clearFeedbackMessage, level, recordNewAttempt]);

  useEffect(() => clearFeedbackMessage, [clearFeedbackMessage]);

  useEffect(() => {
    if (isPaused || gameState.isComplete || gameState.isFailed) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setGameState((currentState) => ({
        ...currentState,
        elapsedSeconds: currentState.elapsedSeconds + 1,
      }));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [gameState.isComplete, gameState.isFailed, isPaused]);

  useEffect(() => {
    level.hints.forEach((_, hintIndex) => {
      const tierNumber = hintIndex + 1;

      if (
        !unlockedHintTiers.includes(tierNumber) &&
        isHintTierUnlocked(tierNumber, gameState.elapsedSeconds, failedResetCount)
      ) {
        onUnlockHintTier(level.id, tierNumber);
      }
    });
  }, [failedResetCount, gameState.elapsedSeconds, level, onUnlockHintTier, unlockedHintTiers]);

  useEffect(() => {
    if (!gameState.isComplete || savedCompletionRef.current) {
      return;
    }

    if (gameState.levelId !== level.id || !canCompleteLevel(level, gameState)) {
      console.warn('Ignoring stale level completion state.', {
        completedLevelId: gameState.levelId,
        currentLevelId: level.id,
      });

      return;
    }

    savedCompletionRef.current = true;
    updateHintAnalytics((currentAnalytics) =>
      recordHintAnalyticsCompletion(currentAnalytics, level.id, usedHintThisAttemptRef.current),
    );
    onCompleteLevel({
      completedLevelId: level.id,
      doorsOpened: gameState.doorsOpenedThisAttempt,
      firstTryClear: failedResetCount === 0,
      hintsUsed: selectedHintTiersThisAttemptRef.current.size,
      keysCollected: gameState.keysCollectedThisAttempt,
      moves: gameState.moves,
      portalsUsed: gameState.portalsUsedThisAttempt,
      stars: calculateStars(level, gameState),
      timeSeconds: gameState.elapsedSeconds,
    });
  }, [failedResetCount, gameState, level, onCompleteLevel, updateHintAnalytics]);

  useEffect(() => {
    if (isPaused && !isSettingsOpen) {
      setIsHintPanelOpen(false);
    }
  }, [isPaused, isSettingsOpen]);

  const resetLevel = useCallback(() => {
    if (!gameState.isComplete && (gameState.moves > 0 || gameState.elapsedSeconds > 0)) {
      setFailedResetCount((currentCount) => currentCount + 1);
    }

    setGameState(createInitialGameState(level));
    setHistory([]);
    setHazardFlashCount(0);
    setBoardAnimationClass('');
    setFailedRouteCount(0);
    clearFeedbackMessage();
    setIsHintJournalOpen(false);
    setIsHintAnalyticsOpen(false);
    setIsConfirmingRestart(false);
    setDismissedHintNudgeKey(null);
    setIsPaused(false);
    setPositionTrail([positionKey(level.playerStart)]);
    savedCompletionRef.current = false;
    recordNewAttempt(level.id);
  }, [clearFeedbackMessage, gameState.elapsedSeconds, gameState.isComplete, gameState.moves, level, recordNewAttempt]);

  const requestRestart = useCallback(() => {
    if (settings.confirmRestart && !gameState.isComplete && !gameState.isFailed) {
      restartReturnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setIsHintPanelOpen(false);
      setIsHintJournalOpen(false);
      setIsHintAnalyticsOpen(false);
      setIsConfirmingRestart(true);

      return;
    }

    resetLevel();
  }, [gameState.isComplete, gameState.isFailed, resetLevel, settings.confirmRestart]);

  const cancelRestart = useCallback(() => {
    setIsConfirmingRestart(false);
    window.setTimeout(() => {
      restartReturnFocusRef.current?.focus();
      restartReturnFocusRef.current = null;
    }, 0);
  }, []);

  const undoMove = useCallback(() => {
    setHistory((currentHistory) => {
      const previousState = currentHistory[currentHistory.length - 1];

      if (!previousState) {
        return currentHistory;
      }

      setGameState(previousState);
      setPositionTrail((currentTrail) => currentTrail.slice(0, -1));

      return currentHistory.slice(0, -1);
    });
  }, []);

  const toggleHints = useCallback(() => {
    setIsHintJournalOpen(false);
    setIsHintAnalyticsOpen(false);
    setIsHintPanelOpen((currentValue) => {
      const shouldOpen = !currentValue;

      if (shouldOpen) {
        const isFirstHintThisAttempt = !usedHintThisAttemptRef.current;

        usedHintThisAttemptRef.current = true;
        updateHintAnalytics((currentAnalytics) =>
          recordHintAnalyticsOpen(currentAnalytics, level.id, failedResetCount, isFirstHintThisAttempt),
        );
      }

      return shouldOpen;
    });
  }, [failedResetCount, level.id, updateHintAnalytics]);

  const toggleHintJournal = useCallback(() => {
    setIsHintPanelOpen(false);
    setIsHintAnalyticsOpen(false);
    setIsHintJournalOpen((currentValue) => !currentValue);
  }, []);

  const closeHintJournal = useCallback(() => {
    setIsHintJournalOpen(false);
  }, []);

  const toggleHintAnalytics = useCallback(() => {
    setIsHintPanelOpen(false);
    setIsHintJournalOpen(false);
    setIsHintAnalyticsOpen((currentValue) => !currentValue);
  }, []);

  const closeHintAnalytics = useCallback(() => {
    setIsHintAnalyticsOpen(false);
  }, []);

  const selectHintTier = useCallback(
    (tierNumber: number) => {
      selectedHintTiersThisAttemptRef.current.add(tierNumber);
      updateHintAnalytics((currentAnalytics) =>
        recordHintAnalyticsTierUse(currentAnalytics, level.id, tierNumber),
      );
    },
    [level.id, updateHintAnalytics],
  );

  const dismissHintNudge = useCallback(() => {
    const nudge = getStuckNudge({
      failedRouteCount,
      failedResetCount,
      gameState,
      isHintNudgeDismissed: null,
      isHintPanelOpen,
      isPaused,
      level,
      positionTrail,
      spikeDeathCount,
    });

    setDismissedHintNudgeKey(nudge?.key ?? null);
  }, [
    failedRouteCount,
    failedResetCount,
    gameState,
    isHintPanelOpen,
    isPaused,
    level,
    positionTrail,
    spikeDeathCount,
  ]);

  const goToCompletionPrimaryAction = useCallback(() => {
    if (level.id >= LEVELS.length) {
      onLevelSelect();

      return;
    }

    onNextLevel();
  }, [level.id, onLevelSelect, onNextLevel]);

  useModalAccessibility({
    dialogRef: pauseDialogRef,
    isOpen: isPaused && !isSettingsOpen && !isConfirmingRestart,
    onEscape: resumeGame,
  });

  useModalAccessibility({
    dialogRef: completionPanelRef,
    initialFocusRef: completionPrimaryActionRef,
    isOpen: gameState.isComplete,
    onEscape: goToCompletionPrimaryAction,
  });

  useModalAccessibility({
    dialogRef: failurePanelRef,
    initialFocusRef: failureRetryRef,
    isOpen: gameState.isFailed,
    onEscape: resetLevel,
  });

  useModalAccessibility({
    dialogRef: restartConfirmPanelRef,
    initialFocusRef: restartCancelRef,
    isOpen: isConfirmingRestart,
    onEscape: cancelRestart,
  });

  useGameShortcuts({
    isComplete: gameState.isComplete,
    isFailed: gameState.isFailed,
    isPaused,
    isSettingsOpen,
    onLevelSelect,
    onMove: moveInDirection,
    onNextLevel: goToCompletionPrimaryAction,
    onPause: pauseGame,
    onReset: requestRestart,
    onResume: resumeGame,
    onRetry: resetLevel,
    onToggleHints: toggleHints,
    onUndo: undoMove,
  });

  const starsEarned = calculateStars(level, gameState);
  const bestMoves = progress.bestMoves[level.id] ?? gameState.moves;
  const bestTimeSeconds = progress.bestTimeSeconds[level.id] ?? gameState.elapsedSeconds;
  const bestMovesAfterRun = Math.min(bestMoves, gameState.moves);
  const bestTimeSecondsAfterRun = Math.min(bestTimeSeconds, gameState.elapsedSeconds);
  const isMoveRecord = gameState.isComplete && gameState.moves <= bestMoves;
  const isTimeRecord = gameState.isComplete && gameState.elapsedSeconds <= bestTimeSeconds;
  const hintNudge = getStuckNudge({
    failedRouteCount,
    failedResetCount,
    gameState,
    isHintNudgeDismissed: dismissedHintNudgeKey,
    isHintPanelOpen,
    isPaused,
    level,
    positionTrail,
    spikeDeathCount,
  });
  const activeHintNudge = settings.hintNudgesEnabled ? hintNudge : null;
  const isFinalLevel = level.id >= LEVELS.length;
  const completionPrimaryLabel = isFinalLevel ? 'Level Select' : 'Next Level';
  const chapterMilestone = getChapterCompletionMilestone(level.id);
  const completionTitle = chapterMilestone ? 'Chapter Complete' : 'Level Complete';
  const completionSubtitle = chapterMilestone
    ? `${chapterMilestone.chapterTitle} complete. ${chapterMilestone.nextMessage}`
    : isFinalLevel ? 'Campaign complete.' : `Level ${level.id + 1} unlocked.`;
  const completionAriaLabel = chapterMilestone ? 'Chapter completed' : 'Level completed';

  return (
    <section className={`screen game-screen${isPaused ? ' paused' : ''}`} aria-labelledby="game-screen-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">current drift</p>
          <h1 id="game-screen-title">Level {level.id}</h1>
        </div>
      </header>

      <div className={`game-play-area${gameState.isComplete ? ' complete' : ''}${gameState.isFailed ? ' failed' : ''}`}>
        <GameBoard
          elapsedSeconds={gameState.elapsedSeconds}
          failedAttemptCount={failedResetCount}
          animationClass={boardAnimationClass}
          gameState={gameState}
          hazardFlash={hazardFlashCount > 0 && !reducedMotion}
          hintNudge={activeHintNudge}
          isHintPanelOpen={isHintPanelOpen}
          isPaused={isPaused}
          level={level}
          moves={gameState.moves}
          reducedMotion={reducedMotion}
          unlockedHintTiers={unlockedHintTiers}
          onLevelSelect={onLevelSelect}
          onMove={moveInDirection}
          onOpenHintJournal={toggleHintJournal}
          onPause={pauseGame}
          onReset={requestRestart}
          onDismissHintNudge={dismissHintNudge}
          onSelectHintTier={selectHintTier}
          onToggleHints={toggleHints}
          onUndo={undoMove}
          playerPosition={gameState.playerPosition}
        />

        {isHintJournalOpen && !isPaused && !gameState.isComplete ? (
          <HintJournal level={level} unlockedHintTiers={unlockedHintTiers} onClose={closeHintJournal} />
        ) : null}

        {isHintAnalyticsOpen && !isPaused && !gameState.isComplete ? (
          <HintAnalyticsReport analytics={hintAnalytics} onClose={closeHintAnalytics} />
        ) : null}

        {gameState.isComplete ? (
          <section
            className={`completion-panel${chapterMilestone ? ' chapter-complete' : ''}${reducedMotion ? '' : ' level-complete-pop'}`}
            ref={completionPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
            aria-describedby="completion-summary"
          >
            <p
              className="sr-only"
              id="completion-summary"
              role="status"
              aria-label={`${completionAriaLabel}. ${starsEarned} stars earned in ${gameState.moves} moves and ${formatTime(
                gameState.elapsedSeconds,
              )}.`}
              aria-live="polite"
              aria-atomic="true"
            >
              {completionAriaLabel} with {starsEarned} stars, {gameState.moves} moves, and a time of{' '}
              {formatTime(gameState.elapsedSeconds)}.
            </p>
            <header className="completion-header">
              <CircleCheck aria-hidden="true" />
              <div>
                {chapterMilestone ? <span className="chapter-complete-badge">{chapterMilestone.chapterTitle}</span> : null}
                <h2 id="completion-title">{completionTitle}</h2>
                <p>{completionSubtitle}</p>
              </div>
            </header>

            <CompletionStars count={starsEarned} reducedMotion={reducedMotion} />
            <CompletionStarBreakdown gameState={gameState} level={level} starsEarned={starsEarned} />
            <PersonalBestComparison
              bestMoves={bestMovesAfterRun}
              bestTimeSeconds={bestTimeSecondsAfterRun}
              level={level}
            />

            <div className="completion-stats">
              <div className={`stat-card${isTimeRecord ? ' record' : ''}`}>
                <Timer aria-hidden="true" />
                <span>Time</span>
                <strong>{formatTime(gameState.elapsedSeconds)}</strong>
                {isTimeRecord ? <em>New Record</em> : null}
              </div>
              <div className={`stat-card${isMoveRecord ? ' record' : ''}`}>
                <Footprints aria-hidden="true" />
                <span>Moves</span>
                <strong>{gameState.moves}</strong>
                {isMoveRecord ? <em>New Record</em> : null}
              </div>
              <div className="stat-card">
                <Star aria-hidden="true" />
                <span>Stars Earned</span>
                <strong>{starsEarned}</strong>
              </div>
            </div>

            <div className="completion-actions">
              <button
                type="button"
                className="menu-button shortcut-action completion-action primary"
                ref={completionPrimaryActionRef}
                onClick={goToCompletionPrimaryAction}
              >
                <span className="action-label">
                  {isFinalLevel ? <ListOrdered aria-hidden="true" /> : <Play aria-hidden="true" />}
                  <span>{completionPrimaryLabel}</span>
                </span>
                <span className="action-shortcut">Spacebar</span>
              </button>
              <button type="button" className="menu-button shortcut-action completion-action" onClick={resetLevel}>
                <span className="action-label">
                  <RotateCcw aria-hidden="true" />
                  <span>Retry</span>
                </span>
                <span className="action-shortcut">R</span>
              </button>
              <button
                type="button"
                className="menu-button completion-action"
                onClick={toggleHintJournal}
                aria-expanded={isHintJournalOpen}
              >
                <BookOpen aria-hidden="true" />
                <span>Hint Journal</span>
              </button>
              <button
                type="button"
                className="menu-button completion-action"
                onClick={toggleHintAnalytics}
                aria-expanded={isHintAnalyticsOpen}
              >
                <BarChart3 aria-hidden="true" />
                <span>Hint Analytics</span>
              </button>
              <button type="button" className="menu-button completion-action" onClick={onLevelSelect}>
                <ListOrdered aria-hidden="true" />
                <span>Level Select</span>
              </button>
            </div>

            {isHintJournalOpen ? (
              <HintJournal level={level} unlockedHintTiers={unlockedHintTiers} onClose={closeHintJournal} />
            ) : null}

            {isHintAnalyticsOpen ? (
              <HintAnalyticsReport analytics={hintAnalytics} onClose={closeHintAnalytics} />
            ) : null}
          </section>
        ) : null}

        {gameState.isFailed ? (
          <section
            className={`failure-panel${reducedMotion ? '' : ' hazard-failure-pop'}`}
            ref={failurePanelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="failure-title"
            aria-describedby="failure-description"
          >
            <header className="failure-header">
              <TriangleAlert aria-hidden="true" />
              <div>
                <h2 id="failure-title">Hazard Hit!</h2>
                <p id="failure-description">You hit the spikes.</p>
              </div>
            </header>
            <button type="button" className="menu-button primary" ref={failureRetryRef} onClick={resetLevel}>
              <RotateCcw aria-hidden="true" />
              <span>Retry the level?</span>
            </button>
          </section>
        ) : null}

        {isConfirmingRestart ? (
          <section
            className="restart-confirm-panel"
            ref={restartConfirmPanelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restart-confirm-title"
            aria-describedby="restart-confirm-description"
          >
            <header className="failure-header">
              <AlertTriangle aria-hidden="true" />
              <div>
                <h2 id="restart-confirm-title">Restart level?</h2>
                <p id="restart-confirm-description">Your current attempt will be reset.</p>
              </div>
            </header>
            <div className="confirm-actions">
              <button type="button" className="menu-button" ref={restartCancelRef} onClick={cancelRestart}>
                <X aria-hidden="true" />
                <span>Cancel</span>
              </button>
              <button type="button" className="menu-button danger" onClick={resetLevel}>
                <RotateCcw aria-hidden="true" />
                <span>Confirm Restart</span>
              </button>
            </div>
          </section>
        ) : null}

        {feedbackMessage ? (
          <div
            className={`locked-door-message${reducedMotion ? ' no-motion' : ''}`}
            role="status"
            aria-label={feedbackMessage}
            aria-live="polite"
            aria-atomic="true"
          >
            {feedbackMessage}
          </div>
        ) : null}
      </div>

      {isPaused ? (
        <div className="dialog-backdrop pause-backdrop" role="presentation">
          <section
            className="pause-dialog"
            ref={pauseDialogRef}
            role="dialog"
            aria-hidden={isSettingsOpen ? true : undefined}
            aria-modal={isSettingsOpen ? undefined : true}
            aria-labelledby="pause-title"
          >
            <header className="dialog-header">
              <div className="dialog-title">
                <Play aria-hidden="true" />
                <h2 id="pause-title">Paused</h2>
              </div>
            </header>

            <div className="pause-actions">
              <button type="button" className="menu-button shortcut-action primary" onClick={resumeGame}>
                <span className="action-label">
                  <Play aria-hidden="true" />
                  <span>Resume</span>
                </span>
                <span className="action-shortcut">Spacebar</span>
              </button>
              <button type="button" className="menu-button shortcut-action" onClick={requestRestart}>
                <span className="action-label">
                  <RotateCcw aria-hidden="true" />
                  <span>Restart Level</span>
                </span>
                <span className="action-shortcut">R</span>
              </button>
              <button type="button" className="menu-button" onClick={onLevelSelect}>
                <ListOrdered aria-hidden="true" />
                <span>Level Select</span>
              </button>
              <button type="button" className="menu-button" onClick={onSettings}>
                <Settings aria-hidden="true" />
                <span>Settings</span>
              </button>
              <button type="button" className="menu-button" onClick={toggleHintJournal} aria-expanded={isHintJournalOpen}>
                <BookOpen aria-hidden="true" />
                <span>Hint Journal</span>
              </button>
              <button type="button" className="menu-button" onClick={toggleHintAnalytics} aria-expanded={isHintAnalyticsOpen}>
                <BarChart3 aria-hidden="true" />
                <span>Hint Analytics</span>
              </button>
            </div>

            {isHintJournalOpen ? (
              <HintJournal level={level} unlockedHintTiers={unlockedHintTiers} onClose={closeHintJournal} />
            ) : null}

            {isHintAnalyticsOpen ? (
              <HintAnalyticsReport analytics={hintAnalytics} onClose={closeHintAnalytics} />
            ) : null}

            <footer className="shortcut-help" aria-label="Keyboard shortcuts">
              <h3>Shortcuts</h3>
              <dl>
                <div>
                  <dt>Movement</dt>
                  <dd>Arrow Keys / WASD</dd>
                </div>
                <div>
                  <dt>Actions</dt>
                  <dd>Undo: U or Backspace</dd>
                  <dd>Restart: R</dd>
                  <dd>Pause: P or Esc</dd>
                  <dd>Hints: H</dd>
                </div>
                <div>
                  <dt>Completion</dt>
                  <dd>Next Level: Spacebar or Enter</dd>
                  <dd>Retry: R</dd>
                </div>
              </dl>
            </footer>
          </section>
        </div>
      ) : null}

    </section>
  );
}
