import { useEffect } from 'react';
import { getDirectionFromKey } from '../logic/movement';
import type { Direction } from '../types/game';

type UseGameShortcutsOptions = {
  isComplete: boolean;
  isFailed: boolean;
  isPaused: boolean;
  isSettingsOpen: boolean;
  onLevelSelect: () => void;
  onMove: (direction: Direction) => void;
  onNextLevel: () => void;
  onPause: () => void;
  onReset: () => void;
  onResume: () => void;
  onRetry: () => void;
  onToggleHints: () => void;
  onUndo: () => void;
};

function isFormControlTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
    : false;
}

function isButtonTarget(target: EventTarget | null) {
  return target instanceof HTMLElement ? Boolean(target.closest('button')) : false;
}

function isPrimaryActionKey(key: string) {
  return key === 'Enter' || key === ' ';
}

export function useGameShortcuts({
  isComplete,
  isFailed,
  isPaused,
  isSettingsOpen,
  onLevelSelect,
  onMove,
  onNextLevel,
  onPause,
  onReset,
  onResume,
  onRetry,
  onToggleHints,
  onUndo,
}: UseGameShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSettingsOpen || isFormControlTarget(event.target)) {
        return;
      }

      const key = event.key;
      const normalizedKey = key.toLowerCase();
      const startedOnButton = isButtonTarget(event.target);

      if (isComplete) {
        if (isPrimaryActionKey(key) && !startedOnButton) {
          event.preventDefault();
          onNextLevel();
        }

        if (normalizedKey === 'r') {
          event.preventDefault();
          onRetry();
        }

        if (normalizedKey === 'l') {
          event.preventDefault();
          onLevelSelect();
        }

        return;
      }

      if (isPaused) {
        if (isPrimaryActionKey(key) && !startedOnButton) {
          event.preventDefault();
          onResume();
        }

        if (key === 'Escape') {
          event.preventDefault();
          onResume();
        }

        if (normalizedKey === 'r') {
          event.preventDefault();
          onReset();
        }

        if (normalizedKey === 'l') {
          event.preventDefault();
          onLevelSelect();
        }

        return;
      }

      if (isFailed || startedOnButton) {
        return;
      }

      const direction = getDirectionFromKey(key);

      if (direction) {
        event.preventDefault();
        onMove(direction);

        return;
      }

      if (normalizedKey === 'r') {
        event.preventDefault();
        onReset();

        return;
      }

      if (normalizedKey === 'u' || key === 'Backspace') {
        event.preventDefault();
        onUndo();

        return;
      }

      if (normalizedKey === 'p' || key === 'Escape') {
        event.preventDefault();
        onPause();

        return;
      }

      if (normalizedKey === 'h') {
        event.preventDefault();
        onToggleHints();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isComplete,
    isFailed,
    isPaused,
    isSettingsOpen,
    onLevelSelect,
    onMove,
    onNextLevel,
    onPause,
    onReset,
    onResume,
    onRetry,
    onToggleHints,
    onUndo,
  ]);
}
