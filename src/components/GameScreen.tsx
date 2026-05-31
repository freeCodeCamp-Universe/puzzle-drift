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
  getDirectionFromKey,
  getEffectiveTileAt,
  getNextPosition,
  movePlayer,
} from '../logic/movement';
import type { Direction, GameState, Level, SaveData } from '../types/game';
import { GameBoard } from './GameBoard';

type CompletionPayload = {
  moves: number;
  stars: number;
  timeSeconds: number;
};

type GameScreenProps = {
  currentLevel: number;
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

function getUnlockedHintCount(level: (typeof LEVELS)[number], elapsedSeconds: number, failedResetCount: number) {
  return level.hints.filter((hint, hintIndex) => {
    if (hintIndex === 0) {
      return true;
    }

    const unlockedByReset =
      hint.unlockAfterFailedResets !== undefined && failedResetCount >= hint.unlockAfterFailedResets;
    const unlockedByTime = hint.unlockAfterSeconds !== undefined && elapsedSeconds >= hint.unlockAfterSeconds;

    return unlockedByReset || unlockedByTime;
  }).length;
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
  const [failedResetCount, setFailedResetCount] = useState(0);
  const [isHintPanelOpen, setIsHintPanelOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const lockedDoorTimeoutRef = useRef<number | null>(null);
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
          savedCompletionRef.current = false;

          return nextState;
        }

        if (nextState === currentState || nextState.moves === currentState.moves) {
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

        return nextState;
      });
    },
    [clearFeedbackMessage, isPaused, level, showFeedbackMessage, triggerBoardAnimation],
  );

  const pauseGame = () => {
    pauseReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBoardAnimationClass('');
    setHazardFlashCount(0);
    setIsPaused(true);
  };

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
    setFailedResetCount(0);
    setIsHintPanelOpen(false);
    setIsPaused(false);
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPaused) {
        return;
      }

      const direction = getDirectionFromKey(event.key);

      if (!direction) {
        return;
      }

      event.preventDefault();
      moveInDirection(direction);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, moveInDirection]);

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
      if (event.key === 'Escape') {
        event.preventDefault();
        resumeGame();

        return;
      }

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

  const resetLevel = () => {
    if (!gameState.isComplete && (gameState.moves > 0 || gameState.elapsedSeconds > 0)) {
      setFailedResetCount((currentCount) => currentCount + 1);
    }

    setGameState(createInitialGameState(level));
    setHistory([]);
    setHazardFlashCount(0);
    setBoardAnimationClass('');
    clearFeedbackMessage();
    setIsPaused(false);
    savedCompletionRef.current = false;
  };

  const undoMove = () => {
    setHistory((currentHistory) => {
      const previousState = currentHistory[currentHistory.length - 1];

      if (!previousState) {
        return currentHistory;
      }

      setGameState(previousState);

      return currentHistory.slice(0, -1);
    });
  };
  const starsEarned = calculateStars(level, gameState);
  const bestMoves = progress.bestMoves[level.id] ?? gameState.moves;
  const bestTimeSeconds = progress.bestTimeSeconds[level.id] ?? gameState.elapsedSeconds;
  const isMoveRecord = gameState.isComplete && gameState.moves <= bestMoves;
  const isTimeRecord = gameState.isComplete && gameState.elapsedSeconds <= bestTimeSeconds;
  const unlockedHintCount = getUnlockedHintCount(level, gameState.elapsedSeconds, failedResetCount);

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
          animationClass={boardAnimationClass}
          gameState={gameState}
          hazardFlash={hazardFlashCount > 0 && !reducedMotion}
          isHintPanelOpen={isHintPanelOpen}
          isPaused={isPaused}
          level={level}
          moves={gameState.moves}
          reducedMotion={reducedMotion}
          onLevelSelect={onLevelSelect}
          onMove={moveInDirection}
          onPause={pauseGame}
          onReset={resetLevel}
          onToggleHints={() => setIsHintPanelOpen((currentValue) => !currentValue)}
          onUndo={undoMove}
          playerPosition={gameState.playerPosition}
          unlockedHintCount={unlockedHintCount}
        />

        {gameState.isComplete ? (
          <section
            className={`completion-panel${reducedMotion ? '' : ' level-complete-pop'}`}
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
                <p>Level {Math.min(level.id + 1, LEVELS.length)} unlocked.</p>
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
              <button type="button" className="menu-button primary" onClick={onNextLevel}>
                <Play aria-hidden="true" />
                <span>Next Level</span>
              </button>
              <button type="button" className="menu-button" onClick={resetLevel}>
                <RotateCcw aria-hidden="true" />
                <span>Retry</span>
              </button>
              <button type="button" className="menu-button" onClick={onLevelSelect}>
                <ListOrdered aria-hidden="true" />
                <span>Level Select</span>
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
              <button type="button" className="menu-button primary" onClick={resumeGame}>
                <Play aria-hidden="true" />
                <span>Resume</span>
              </button>
              <button type="button" className="menu-button" onClick={resetLevel}>
                <RotateCcw aria-hidden="true" />
                <span>Restart Level</span>
              </button>
              <button type="button" className="menu-button" onClick={onLevelSelect}>
                <ListOrdered aria-hidden="true" />
                <span>Level Select</span>
              </button>
              <button type="button" className="menu-button" onClick={onSettings}>
                <Settings aria-hidden="true" />
                <span>Settings</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

    </section>
  );
}
