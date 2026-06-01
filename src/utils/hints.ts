export function getHintTierUnlock(tierNumber: number) {
  switch (tierNumber) {
    case 1:
      return { failedAttempts: 0, seconds: 0 };
    case 2:
      return { failedAttempts: 2, seconds: 60 };
    case 3:
      return { failedAttempts: 5, seconds: 120 };
    default:
      return { failedAttempts: 8, seconds: 180 };
  }
}

export function isHintTierUnlocked(tierNumber: number, elapsedSeconds: number, failedAttemptCount: number) {
  const unlock = getHintTierUnlock(tierNumber);

  return elapsedSeconds >= unlock.seconds || failedAttemptCount >= unlock.failedAttempts;
}

export function formatUnlockTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function getHintTierStatus(
  tierNumber: number,
  elapsedSeconds: number,
  failedAttemptCount: number,
  isPersistedUnlocked = false,
) {
  const unlock = getHintTierUnlock(tierNumber);

  if (tierNumber === 1 || isPersistedUnlocked) {
    return 'Available now';
  }

  if (isHintTierUnlocked(tierNumber, elapsedSeconds, failedAttemptCount)) {
    return 'Available now';
  }

  return `Unlocks at ${formatUnlockTime(unlock.seconds)} or ${unlock.failedAttempts} failed attempts`;
}
