import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleCheck,
  Footprints,
  ListOrdered,
  Play,
  RotateCcw,
  Settings,
  Star,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { LEVELS } from '../data/levels';
import {
  calculateStars,
  createInitialGameState,
  getEffectiveTileAt,
  getNextPosition,
  movePlayer,
} from '../logic/movement';
import { useGameShortcuts } from '../hooks/useGameShortcuts';
import type { Direction, GameState, Level, SaveData } from '../types/game';
import { GameBoard } from './GameBoard';

type CompletionPayload = {
  moves: number;
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
  progress: SaveData;
  reducedMotion: boolean;
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
        <Star
          key={starNumber}
          aria-hidden="true"
          className={starNumber <= count ? 'star-earned' : 'star-empty'}
          style={{ animationDelay: `${(starNumber - 1) * 140}ms` }}
        />
      ))}
    </div>
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
  progress,
  reducedMotion,
}: GameScreenProps) {
  const level = LEVELS.find((candidate) => candidate.id === currentLevel) ?? LEVELS[0];
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(level));
  const [, setHistory] = useState<GameState[]>([]);
  const [hazardFlashCount, setHazardFlashCount] = useState(0);
  const [boardAnimationClass, setBoardAnimationClass] = useState('');
  const [failedRouteCount, setFailedRouteCount] = useState(0);
  const [failedResetCount, setFailedResetCount] = useState(0);
  const [isHintPanelOpen, setIsHintPanelOpen] = useState(false);
  const [dismissedHintNudgeKey, setDismissedHintNudgeKey] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [positionTrail, setPositionTrail] = useState<string[]>(() => [positionKey(level.playerStart)]);
  const [spikeDeathCount, setSpikeDeathCount] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const lockedDoorTimeoutRef = useRef<number | null>(null);
  const completionPanelRef = useRef<HTMLElement | null>(null);
  const completionPrimaryActionRef = useRef<HTMLButtonElement | null>(null);
  const pauseDialogRef = useRef<HTMLElement | null>(null);
  const pauseReturnFocusRef = useRef<HTMLElement | null>(null);
  const savedCompletionRef = useRef(false);

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
    setDismissedHintNudgeKey(null);
    setIsPaused(false);
    setPositionTrail([positionKey(level.playerStart)]);
    setSpikeDeathCount(0);
    savedCompletionRef.current = false;
  }, [clearFeedbackMessage, level]);

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
    if (!gameState.isComplete || savedCompletionRef.current) {
      return;
    }

    savedCompletionRef.current = true;
    onCompleteLevel({
      moves: gameState.moves,
      stars: calculateStars(level, gameState),
      timeSeconds: gameState.elapsedSeconds,
    });
  }, [gameState, level, onCompleteLevel]);

  useEffect(() => {
    if (!isPaused) {
      return undefined;
    }

    setIsHintPanelOpen(false);

    const dialog = pauseDialogRef.current;
    const focusableElements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);

    focusableElements()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();

        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, resumeGame]);

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
    setDismissedHintNudgeKey(null);
    setIsPaused(false);
    setPositionTrail([positionKey(level.playerStart)]);
    savedCompletionRef.current = false;
  }, [clearFeedbackMessage, gameState.elapsedSeconds, gameState.isComplete, gameState.moves, level]);

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
    setIsHintPanelOpen((currentValue) => !currentValue);
  }, []);

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

  useGameShortcuts({
    isComplete: gameState.isComplete,
    isFailed: gameState.isFailed,
    isPaused,
    isSettingsOpen,
    onLevelSelect,
    onMove: moveInDirection,
    onNextLevel: goToCompletionPrimaryAction,
    onPause: pauseGame,
    onReset: resetLevel,
    onResume: resumeGame,
    onRetry: resetLevel,
    onToggleHints: toggleHints,
    onUndo: undoMove,
  });

  useEffect(() => {
    if (!gameState.isComplete) {
      return undefined;
    }

    completionPrimaryActionRef.current?.focus();

    const panel = completionPanelRef.current;
    const focusableElements = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();

        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isComplete]);

  const starsEarned = calculateStars(level, gameState);
  const bestMoves = progress.bestMoves[level.id] ?? gameState.moves;
  const bestTimeSeconds = progress.bestTimeSeconds[level.id] ?? gameState.elapsedSeconds;
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
  const isFinalLevel = level.id >= LEVELS.length;
  const completionPrimaryLabel = isFinalLevel ? 'Level Select' : 'Next Level';

  return (
    <section className={`screen game-screen${isPaused ? ' paused' : ''}`} aria-labelledby="game-screen-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">current drift</p>
          <h2 id="game-screen-title">Level {level.id}</h2>
        </div>
      </header>

      <div className={`game-play-area${gameState.isComplete ? ' complete' : ''}${gameState.isFailed ? ' failed' : ''}`}>
        <GameBoard
          elapsedSeconds={gameState.elapsedSeconds}
          failedAttemptCount={failedResetCount}
          animationClass={boardAnimationClass}
          gameState={gameState}
          hazardFlash={hazardFlashCount > 0 && !reducedMotion}
          hintNudge={hintNudge}
          isHintPanelOpen={isHintPanelOpen}
          isPaused={isPaused}
          level={level}
          moves={gameState.moves}
          reducedMotion={reducedMotion}
          onLevelSelect={onLevelSelect}
          onMove={moveInDirection}
          onPause={pauseGame}
          onReset={resetLevel}
          onDismissHintNudge={dismissHintNudge}
          onToggleHints={toggleHints}
          onUndo={undoMove}
          playerPosition={gameState.playerPosition}
        />

        {gameState.isComplete ? (
          <section
            className={`completion-panel${reducedMotion ? '' : ' level-complete-pop'}`}
            ref={completionPanelRef}
            role="status"
            aria-label={`Level completed. ${starsEarned} stars earned in ${gameState.moves} moves and ${formatTime(
              gameState.elapsedSeconds,
            )}.`}
            aria-live="polite"
          >
            <p className="sr-only">
              Level completed with {starsEarned} stars, {gameState.moves} moves, and a time of{' '}
              {formatTime(gameState.elapsedSeconds)}.
            </p>
            <header className="completion-header">
              <CircleCheck aria-hidden="true" />
              <div>
                <h2>Level Complete</h2>
                <p>{isFinalLevel ? 'Campaign complete.' : `Level ${level.id + 1} unlocked.`}</p>
              </div>
            </header>

            <CompletionStars count={starsEarned} reducedMotion={reducedMotion} />

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
              <button type="button" className="menu-button shortcut-action completion-action" onClick={onLevelSelect}>
                <span className="action-label">
                  <ListOrdered aria-hidden="true" />
                  <span>Level Select</span>
                </span>
                <span className="action-shortcut">L</span>
              </button>
            </div>
          </section>
        ) : null}

        {gameState.isFailed ? (
          <section
            className={`failure-panel${reducedMotion ? '' : ' hazard-failure-pop'}`}
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
            <button type="button" className="menu-button primary" onClick={resetLevel}>
              <RotateCcw aria-hidden="true" />
              <span>Retry the level?</span>
            </button>
          </section>
        ) : null}

        {feedbackMessage ? (
          <div
            className={`locked-door-message${reducedMotion ? ' no-motion' : ''}`}
            role="status"
            aria-label={feedbackMessage}
            aria-live="polite"
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
            aria-modal="true"
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
              <button type="button" className="menu-button shortcut-action" onClick={resetLevel}>
                <span className="action-label">
                  <RotateCcw aria-hidden="true" />
                  <span>Restart Level</span>
                </span>
                <span className="action-shortcut">R</span>
              </button>
              <button type="button" className="menu-button shortcut-action" onClick={onLevelSelect}>
                <span className="action-label">
                  <ListOrdered aria-hidden="true" />
                  <span>Level Select</span>
                </span>
                <span className="action-shortcut">L</span>
              </button>
              <button type="button" className="menu-button" onClick={onSettings}>
                <Settings aria-hidden="true" />
                <span>Settings</span>
              </button>
            </div>

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
                  <dd>Level Select: L</dd>
                </div>
              </dl>
            </footer>
          </section>
        </div>
      ) : null}

    </section>
  );
}
