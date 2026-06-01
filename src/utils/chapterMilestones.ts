const CHAPTER_MILESTONES: Record<number, { chapterTitle: string; nextMessage: string }> = {
  10: {
    chapterTitle: 'Training Grid',
    nextMessage: 'Crystal Labyrinth unlocked.',
  },
  20: {
    chapterTitle: 'Crystal Labyrinth',
    nextMessage: 'Rift Core unlocked.',
  },
  30: {
    chapterTitle: 'Rift Core',
    nextMessage: 'Campaign complete.',
  },
};

export function getChapterCompletionMilestone(levelId: number) {
  return CHAPTER_MILESTONES[levelId] ?? null;
}
